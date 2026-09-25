// Package daemon is the long-running agent: a tiny HTTP API on 127.0.0.1 for the
// extension to push its rules to, and a loop that writes the current block set
// into the hosts file.
package daemon

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"focusgateway/agent/internal/buildinfo"
	"focusgateway/agent/internal/core"
	"focusgateway/agent/internal/hosts"
	"focusgateway/agent/internal/lock"
	"focusgateway/agent/internal/paths"
)

const (
	tickEvery    = 15 * time.Second
	crashWindow  = 120 * time.Second
	crashLimit   = 4
	failOpenFor  = 10 * time.Minute
	maxBodyBytes = 5_000_000
)

// SHA256 is the hex sha256 of s.
func SHA256(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// SafeEqual compares in constant time (for equal lengths, like crypto.timingSafeEqual).
func SafeEqual(a, b string) bool {
	return len(a) == len(b) && subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

var (
	extensionOrigin = regexp.MustCompile(`^(chrome|moz)-extension://`)
	bearer          = regexp.MustCompile(`(?i)^Bearer\s+`)
)

// Agent holds the in-memory state. One mutex serializes requests and ticks, like
// the single-threaded JavaScript version.
type Agent struct {
	mu            sync.Mutex
	snapshot      core.Obj
	lastDomains   *string
	failOpenUntil int64
	now           func() int64
	apply         func([]string) (bool, error)
	readHosts     func() (string, error)
}

// New loads the saved snapshot and fail-open state.
func New() *Agent {
	a := &Agent{
		now:       func() int64 { return time.Now().UnixMilli() },
		apply:     hosts.Apply,
		readHosts: func() (string, error) { return hosts.Read(hosts.Path()) },
	}
	var snap core.Obj
	if paths.ReadJSON("snapshot.json", &snap) {
		a.snapshot = snap
	}
	var fo struct {
		Until int64 `json:"until"`
	}
	paths.ReadJSON("failopen.json", &fo)
	a.failOpenUntil = fo.Until
	return a
}

// Tick writes the current block set into the hosts file if it changed, and
// re-writes it when someone removed our section by hand.
func (a *Agent) Tick() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.tick()
}

func (a *Agent) tick() {
	defer func() {
		if r := recover(); r != nil {
			paths.Log("tick failed:", fmt.Sprint(r))
		}
	}()
	now := a.now()
	if now < a.failOpenUntil {
		return
	}
	domains := []string{}
	if a.snapshot != nil {
		domains = core.ComputeBlocks(a.snapshot, now)
	}
	key := strings.Join(domains, ",")
	content, err := a.readHosts()
	if err != nil {
		paths.Log("tick failed:", err.Error())
		return
	}
	onDisk := len(hosts.ManagedDomains(content))
	if a.lastDomains == nil || key != *a.lastDomains || (len(domains) > 0 && onDisk == 0) {
		changed, err := a.apply(domains)
		if err != nil {
			paths.Log("tick failed:", err.Error())
			return
		}
		if changed {
			paths.Log(fmt.Sprintf("hosts updated: %d domain(s) blocked", len(domains)))
		}
		a.lastDomains = &key
	}
}

func (a *Agent) blocking() int {
	if a.lastDomains == nil || *a.lastDomains == "" {
		return 0
	}
	return len(strings.Split(*a.lastDomains, ","))
}

func send(w http.ResponseWriter, code int, body any) {
	w.Header().Set("content-type", "application/json")
	w.Header().Set("cache-control", "no-store")
	w.WriteHeader(code)
	b, _ := json.Marshal(body)
	_, _ = w.Write(b)
}

type errBody struct {
	Error string `json:"error"`
}

// allowedHost accepts only loopback Host headers, so a web page can't reach the
// agent through DNS rebinding (a public name that resolves to 127.0.0.1).
func allowedHost(host string) bool {
	h, _, err := net.SplitHostPort(host)
	if err != nil {
		h = host
	}
	return h == "127.0.0.1" || h == "localhost" || h == "[::1]" || h == "::1"
}

func readBody(r *http.Request) ([]byte, error) {
	return io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBodyBytes))
}

func decode(b []byte) (any, error) {
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	var v any
	if err := d.Decode(&v); err != nil {
		return nil, err
	}
	if d.More() {
		return nil, errors.New("trailing data")
	}
	return v, nil
}

func (a *Agent) validLinkCode(cfg paths.Config) bool {
	return cfg.LinkCode != nil && *cfg.LinkCode != "" && a.now() < cfg.LinkExpiresAt
}

// ServeHTTP implements the agent API.
func (a *Agent) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !allowedHost(r.Host) {
		send(w, 403, errBody{"Forbidden host"})
		return
	}
	// Never answer web pages: they send an Origin that isn't an extension.
	origin := r.Header.Get("Origin")
	if origin != "" && !extensionOrigin.MatchString(origin) {
		send(w, 403, errBody{"Forbidden origin"})
		return
	}
	switch {
	case r.Method == http.MethodGet && r.RequestURI == "/health":
		send(w, 200, struct {
			OK       bool   `json:"ok"`
			Version  string `json:"version"`
			Blocking int    `json:"blocking"`
			FailOpen bool   `json:"failOpen"`
		}{true, buildinfo.Version, a.blocking(), a.now() < a.failOpenUntil})
	case r.Method == http.MethodPost && r.RequestURI == "/v1/pair":
		a.pair(w, r, origin)
	case r.Method == http.MethodPost && r.RequestURI == "/v1/sync":
		a.sync(w, r)
	default:
		send(w, 404, errBody{"Not found"})
	}
}

// pair is the one-time exchange: the code the user saw (or the one inside the
// pairing link) becomes useless, and the extension gets a secret the user never sees.
func (a *Agent) pair(w http.ResponseWriter, r *http.Request, origin string) {
	if origin == "" {
		send(w, 403, errBody{"Pair from the FocusGateway extension."})
		return
	}
	raw, err := readBody(r)
	if err != nil {
		send(w, 400, errBody{"Invalid JSON"})
		return
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		raw = []byte("{}")
	}
	body, err := decode(raw)
	if err != nil {
		send(w, 400, errBody{"Invalid JSON"})
		return
	}
	cfg, _ := paths.ReadConfig()
	linkOK := a.validLinkCode(cfg)
	if paths.Val(cfg.PairCode) == "" && !linkOK {
		send(w, 409, errBody{"Already paired. Run `focusgateway-agent pair` as admin for a new code."})
		return
	}
	code := ""
	if c := core.Get(body, "code"); core.Truthy(c) {
		code = strings.ToUpper(strings.TrimSpace(core.Str(c)))
	}
	matchPair := paths.Val(cfg.PairCode) != "" && SafeEqual(code, paths.Val(cfg.PairCode))
	matchLink := linkOK && SafeEqual(code, paths.Val(cfg.LinkCode))
	if !matchPair && !matchLink {
		send(w, 401, errBody{"Wrong pairing code"})
		return
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		send(w, 500, errBody{"No randomness available"})
		return
	}
	secret := hex.EncodeToString(buf)
	cfg.PairCode = nil
	cfg.LinkCode = nil
	cfg.LinkExpiresAt = 0
	cfg.SecretHash = paths.Str(SHA256(secret))
	cfg.PairedAt = paths.ISO(time.Now())
	if err := paths.WriteJSON("config.json", cfg); err != nil {
		send(w, 500, errBody{"Could not save the pairing: " + err.Error()})
		return
	}
	how := "code"
	if matchLink {
		how = "link"
	}
	paths.Log("paired with extension", origin, "("+how+")")
	send(w, 200, struct {
		OK     bool   `json:"ok"`
		Secret string `json:"secret"`
	}{true, secret})
}

func (a *Agent) sync(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if m := bearer.FindStringIndex(auth); m != nil {
		auth = auth[m[1]:]
	}
	cfg, _ := paths.ReadConfig()
	if paths.Val(cfg.SecretHash) == "" || !SafeEqual(SHA256(auth), paths.Val(cfg.SecretHash)) {
		send(w, 401, errBody{"Not paired. Enter the pairing code again."})
		return
	}
	raw, err := readBody(r)
	if err != nil {
		send(w, 400, errBody{"Invalid JSON"})
		return
	}
	v, err := decode(raw)
	if err != nil {
		send(w, 400, errBody{"Invalid JSON"})
		return
	}
	if problem := lock.Validate(v); problem != "" {
		send(w, 400, errBody{problem})
		return
	}
	incoming := v.(core.Obj)
	now := a.now()
	if a.snapshot != nil {
		prev, next := core.Get(a.snapshot, "sentAt"), core.Get(incoming, "sentAt")
		if core.Truthy(prev) && core.Truthy(next) && core.Lt(next, prev) {
			send(w, 200, struct {
				OK    bool `json:"ok"`
				Stale bool `json:"stale"`
			}{true, true})
			return
		}
	}
	merged, kept := lock.Merge(a.snapshot, incoming, now)
	a.snapshot = merged
	if err := paths.WriteJSON("snapshot.json", merged); err != nil {
		paths.Log("could not save snapshot:", err.Error())
	}
	a.tick()
	if len(kept) > 0 {
		paths.Log(fmt.Sprintf("kept %d locked rule(s) that the extension tried to remove or weaken", len(kept)))
	}
	var until any
	if u := lock.LockedUntil(a.snapshot, now); u != 0 {
		until = u
	}
	send(w, 200, struct {
		OK          bool  `json:"ok"`
		Kept        []any `json:"kept"`
		LockedUntil any   `json:"lockedUntil"`
	}{true, kept, until})
}

// crashGuard counts unclean exits. After crashLimit crashes within crashWindow the
// agent clears its blocks for failOpenFor (fail-open) instead of leaving the
// computer stuck with a broken block list. It never fails open while a
// no-failsafe rule is running: the user asked for no escape.
func (a *Agent) crashGuard() {
	now := a.now()
	var crashes []int64
	paths.ReadJSON("crashes.json", &crashes)
	recent := []int64{}
	for _, t := range crashes {
		if now-t < crashWindow.Milliseconds() {
			recent = append(recent, t)
		}
	}
	lastRun := struct {
		Clean bool `json:"clean"`
	}{true}
	paths.ReadJSON("run-state.json", &lastRun)
	if !lastRun.Clean {
		recent = append(recent, now)
	}
	_ = paths.WriteJSON("crashes.json", recent)
	_ = paths.WriteJSON("run-state.json", map[string]any{"clean": false, "startedAt": now})
	if len(recent) >= crashLimit && lock.LockedUntil(a.snapshot, now) == 0 {
		a.failOpenUntil = now + failOpenFor.Milliseconds()
		_ = paths.WriteJSON("failopen.json", map[string]int64{"until": a.failOpenUntil})
		paths.Log(fmt.Sprintf("Agent crashed %d times in 2 minutes. Clearing blocks for 10 minutes (fail-open). Check agent.log.", len(recent)))
		_, _ = hosts.Apply(nil)
	}
}

// Run starts the agent and blocks until it is stopped.
func Run() error {
	cfg, ok := paths.ReadConfig()
	if !ok || (paths.Val(cfg.PairCode) == "" && paths.Val(cfg.SecretHash) == "" && paths.Val(cfg.LinkCode) == "") {
		paths.Log("No config.json with a pairing token. Run `focusgateway-agent install` first.")
		return errors.New("not installed")
	}
	a := New()
	a.crashGuard()

	// Stopping or restarting the service normally is a clean exit and does not count as a crash.
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		_ = paths.WriteJSON("run-state.json", map[string]bool{"clean": true})
		os.Exit(0)
	}()

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", paths.Port))
	if err != nil {
		paths.Log("server error:", err.Error())
		return err
	}
	paths.Log(fmt.Sprintf("FocusGateway agent %s listening on 127.0.0.1:%d", buildinfo.Version, paths.Port))
	srv := &http.Server{Handler: a, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second}

	a.Tick()
	go func() {
		for range time.Tick(tickEvery) {
			a.Tick()
		}
	}()
	// Clear the crash counter once we've been healthy for a while.
	time.AfterFunc(crashWindow, func() { _ = paths.WriteJSON("crashes.json", []int64{}) })
	// Note: we intentionally do NOT clear the hosts file when stopped. Stopping the
	// service must not be a way around a block. `uninstall` and `recover` clear it.
	err = srv.Serve(ln)
	paths.Log("server error:", err.Error())
	return err
}
