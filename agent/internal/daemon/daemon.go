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

	"regimen/agent/internal/buildinfo"
	"regimen/agent/internal/core"
	"regimen/agent/internal/hosts"
	"regimen/agent/internal/lock"
	"regimen/agent/internal/paths"
)

const (
	tickEvery   = 15 * time.Second
	crashWindow = 120 * time.Second
	crashLimit  = 4
	failOpenFor = 10 * time.Minute
	// maxBodyBytes caps a sync body. A snapshot with hundreds of rules and custom
	// sites is well under 1 MB.
	maxBodyBytes = 5_000_000
	// maxPairBytes caps a pair body, which is only {"code":"XXXX-XXXX-XXXX-XXXX-XXXX"}.
	maxPairBytes = 1024
)

// bodyReadTimeout is how long a client gets to send its request body. A
// variable so tests can shorten it.
var bodyReadTimeout = 5 * time.Second

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

// Agent holds the in-memory state. mu serializes state changes and ticks. It is
// never held while reading from or writing to a network connection.
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
	var dropped []string
	if a.snapshot != nil {
		// Only well-formed host names reach the hosts file (defence in depth: the
		// extension validates them too).
		domains, dropped = hosts.Sanitize(core.ComputeBlocks(a.snapshot, now))
	}
	key := strings.Join(domains, ",")
	content, err := a.readHosts()
	if err != nil {
		paths.Log("tick failed:", err.Error())
		return
	}
	onDisk := len(hosts.ManagedDomains(content))
	if a.lastDomains == nil || key != *a.lastDomains || (len(domains) > 0 && onDisk == 0) {
		hosts.LogDropped(dropped)
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

// readBody reads at most limit bytes of the request body within bodyReadTimeout.
// It never runs while a.mu is held, so a client that announces a body and then
// sends nothing can only tie up its own connection, never the enforcement tick.
func readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	// Not every ResponseWriter supports deadlines (httptest does not). The
	// server-wide ReadTimeout still bounds those.
	_ = http.NewResponseController(w).SetReadDeadline(time.Now().Add(bodyReadTimeout))
	return io.ReadAll(http.MaxBytesReader(w, r.Body, limit))
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

// validPairCode: the typed code expires like the link does, so a code printed
// weeks ago and never used can't be found and used later. A code from before
// codes had an expiry (PairExpiresAt 0) counts as expired.
func (a *Agent) validPairCode(cfg paths.Config) bool {
	return paths.Val(cfg.PairCode) != "" && a.now() < cfg.PairExpiresAt
}

type reply struct {
	code int
	body any
}

// ServeHTTP implements the agent API. It checks headers, reads the request
// body without any lock, and only then takes a.mu for the short in-memory and
// on-disk state change. Network I/O never happens while a.mu is held, so a slow
// or stalled client can't delay Tick.
func (a *Agent) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	var out reply
	switch {
	case r.Method == http.MethodGet && r.RequestURI == "/health":
		out = a.health()
	case r.Method == http.MethodPost && r.RequestURI == "/v1/pair":
		out = a.pair(w, r, origin)
	case r.Method == http.MethodPost && r.RequestURI == "/v1/sync":
		out = a.sync(w, r)
	default:
		out = reply{404, errBody{"Not found"}}
	}
	if r.Method == http.MethodPost && out.code >= 300 {
		// The body may be unread. Without this, net/http would first try to read
		// and discard it (for keep-alive) and a stalled client would get no answer.
		w.Header().Set("Connection", "close")
	}
	send(w, out.code, out.body)
}

func (a *Agent) health() reply {
	a.mu.Lock()
	defer a.mu.Unlock()
	return reply{200, struct {
		OK       bool   `json:"ok"`
		Version  string `json:"version"`
		Blocking int    `json:"blocking"`
		FailOpen bool   `json:"failOpen"`
	}{true, buildinfo.Version, a.blocking(), a.now() < a.failOpenUntil}}
}

// pairState says whether pairing is possible right now, and the refusal if not.
func (a *Agent) pairState() (paths.Config, *reply) {
	cfg, _ := paths.ReadConfig()
	if a.validPairCode(cfg) || a.validLinkCode(cfg) {
		return cfg, nil
	}
	msg := "Already paired. Run `regimen-agent pair` as admin for a new code."
	if paths.Val(cfg.SecretHash) == "" {
		msg = "The pairing code expired. Run `regimen-agent pair` as admin for a new one."
	}
	return cfg, &reply{409, errBody{msg}}
}

// pair is the one-time exchange: the code the user saw (or the one inside the
// pairing link) becomes useless, and the extension gets a secret the user never sees.
func (a *Agent) pair(w http.ResponseWriter, r *http.Request, origin string) reply {
	if origin == "" {
		return reply{403, errBody{"Pair from the Regimen extension."}}
	}
	// Refuse before reading anything when there is no live code.
	if _, refused := a.pairState(); refused != nil {
		return *refused
	}
	raw, err := readBody(w, r, maxPairBytes)
	if err != nil {
		return reply{400, errBody{"Invalid JSON"}}
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		raw = []byte("{}")
	}
	body, err := decode(raw)
	if err != nil {
		return reply{400, errBody{"Invalid JSON"}}
	}
	code := ""
	if c := core.Get(body, "code"); core.Truthy(c) {
		code = strings.ToUpper(strings.TrimSpace(core.Str(c)))
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	// Check again under the lock: two requests with the same code must not both win.
	cfg, refused := a.pairState()
	if refused != nil {
		return *refused
	}
	matchPair := a.validPairCode(cfg) && SafeEqual(code, paths.Val(cfg.PairCode))
	matchLink := a.validLinkCode(cfg) && SafeEqual(code, paths.Val(cfg.LinkCode))
	if !matchPair && !matchLink {
		return reply{401, errBody{"Wrong pairing code"}}
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return reply{500, errBody{"No randomness available"}}
	}
	secret := hex.EncodeToString(buf)
	cfg.PairCode = nil
	cfg.PairExpiresAt = 0
	cfg.LinkCode = nil
	cfg.LinkExpiresAt = 0
	cfg.SecretHash = paths.Str(SHA256(secret))
	cfg.PairedAt = paths.ISO(time.Now())
	if err := paths.WriteJSON("config.json", cfg); err != nil {
		return reply{500, errBody{"Could not save the pairing: " + err.Error()}}
	}
	how := "code"
	if matchLink {
		how = "link"
	}
	paths.Log("paired with extension", origin, "("+how+")")
	return reply{200, struct {
		OK     bool   `json:"ok"`
		Secret string `json:"secret"`
	}{true, secret}}
}

func (a *Agent) sync(w http.ResponseWriter, r *http.Request) reply {
	auth := r.Header.Get("Authorization")
	if m := bearer.FindStringIndex(auth); m != nil {
		auth = auth[m[1]:]
	}
	cfg, _ := paths.ReadConfig()
	if paths.Val(cfg.SecretHash) == "" || !SafeEqual(SHA256(auth), paths.Val(cfg.SecretHash)) {
		return reply{401, errBody{"Not paired. Enter the pairing code again."}}
	}
	raw, err := readBody(w, r, maxBodyBytes)
	if err != nil {
		return reply{400, errBody{"Invalid JSON"}}
	}
	v, err := decode(raw)
	if err != nil {
		return reply{400, errBody{"Invalid JSON"}}
	}
	if problem := lock.Validate(v); problem != "" {
		return reply{400, errBody{problem}}
	}
	incoming := v.(core.Obj)

	a.mu.Lock()
	defer a.mu.Unlock()
	now := a.now()
	if a.snapshot != nil {
		prev, next := core.Get(a.snapshot, "sentAt"), core.Get(incoming, "sentAt")
		if core.Truthy(prev) && core.Truthy(next) && core.Lt(next, prev) {
			return reply{200, struct {
				OK    bool `json:"ok"`
				Stale bool `json:"stale"`
			}{true, true}}
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
	return reply{200, struct {
		OK          bool  `json:"ok"`
		Kept        []any `json:"kept"`
		LockedUntil any   `json:"lockedUntil"`
	}{true, kept, until}}
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
		paths.Log("No config.json with a pairing token. Run `regimen-agent install` first.")
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
	paths.Log(fmt.Sprintf("Regimen agent %s listening on 127.0.0.1:%d", buildinfo.Version, paths.Port))
	srv := &http.Server{Handler: a, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}

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
