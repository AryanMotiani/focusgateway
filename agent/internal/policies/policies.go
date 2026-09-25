// Package policies writes browser policies: the officially supported, admin-level
// way to configure browsers. They close the usual escape routes around a
// hosts-file blocker:
//   - Secure DNS / DNS over HTTPS (would skip the hosts file)
//   - private, incognito and guest windows and new profiles (no extension there)
//   - (strict) the extensions page and developer tools
package policies

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"focusgateway/agent/internal/paths"
	"focusgateway/agent/internal/platform"
)

// KV is one policy entry. Policies keep their order so files and plists are stable.
type KV struct {
	Key   string
	Value any
}

// Policy is an ordered set of policy entries.
type Policy []KV

// MarshalJSON writes the entries in order.
func (p Policy) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	for i, kv := range p {
		if i > 0 {
			b.WriteByte(',')
		}
		k, _ := json.Marshal(kv.Key)
		v, err := json.Marshal(kv.Value)
		if err != nil {
			return nil, err
		}
		b.Write(k)
		b.WriteByte(':')
		b.Write(v)
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

// Options select what gets written.
type Options struct {
	Strict        bool
	ForceInstall  []string
	FirefoxXpiURL string
}

// FirefoxExtensionID is the add-on id from extension/build.mjs.
const FirefoxExtensionID = "focusgateway@focusgateway.app"

// OptionsFromConfig builds Options from config.json.
func OptionsFromConfig(c paths.Config) Options {
	o := Options{Strict: c.Strict, FirefoxXpiURL: c.FirefoxXpiURL}
	if c.ChromeExtensionID != "" {
		o.ForceInstall = []string{c.ChromeExtensionID + ";https://clients2.google.com/service/update2/crx"}
	}
	return o
}

// Chromium is the policy for Chrome, Edge, Brave and Chromium.
func Chromium(o Options) Policy {
	p := Policy{
		{"DnsOverHttpsMode", "off"},
		{"IncognitoModeAvailability", 1},
		{"BrowserGuestModeEnabled", false},
		{"BrowserAddPersonEnabled", false},
	}
	if o.Strict {
		p = append(p,
			KV{"URLBlocklist", []string{"chrome://extensions", "edge://extensions", "brave://extensions", "chrome://flags", "edge://flags", "brave://flags"}},
			KV{"DeveloperToolsAvailability", 2},
		)
	}
	if len(o.ForceInstall) > 0 {
		p = append(p, KV{"ExtensionInstallForcelist", o.ForceInstall})
	}
	return p
}

// Firefox is the policy for Firefox (policies.json).
func Firefox(o Options) Policy {
	p := Policy{
		{"DNSOverHTTPS", Policy{{"Enabled", false}, {"Locked", true}}},
		{"DisablePrivateBrowsing", true},
	}
	if o.Strict {
		p = append(p,
			KV{"BlockAboutAddons", true},
			KV{"BlockAboutConfig", true},
			KV{"BlockAboutProfiles", true},
			KV{"DisableDeveloperTools", true},
		)
	}
	if o.FirefoxXpiURL != "" {
		p = append(p, KV{"ExtensionSettings", Policy{{FirefoxExtensionID, Policy{{"installation_mode", "force_installed"}, {"install_url", o.FirefoxXpiURL}}}}})
	}
	return p
}

// Written records one thing we changed, so uninstall can undo exactly that.
type Written struct {
	Kind string `json:"kind"` // regkey, regvalue or file
	Key  string `json:"key,omitempty"`
	Name string `json:"name,omitempty"`
	Path string `json:"path,omitempty"`
}

func chromiumTargets() []string {
	switch runtime.GOOS {
	case "windows":
		return []string{`SOFTWARE\Policies\Google\Chrome`, `SOFTWARE\Policies\Microsoft\Edge`, `SOFTWARE\Policies\BraveSoftware\Brave`, `SOFTWARE\Policies\Chromium`}
	case "darwin":
		return []string{"com.google.Chrome", "com.microsoft.Edge", "com.brave.Browser", "org.chromium.Chromium"}
	default:
		return []string{
			"/etc/opt/chrome/policies/managed",
			"/etc/chromium/policies/managed",
			"/etc/chromium-browser/policies/managed",
			"/etc/brave/policies/managed",
			"/etc/opt/edge/policies/managed",
		}
	}
}

func firefoxDirs() []string {
	switch runtime.GOOS {
	case "windows":
		pf := paths.ProgramFiles()
		pf86 := os.Getenv("ProgramFiles(x86)")
		if pf86 == "" {
			pf86 = `C:\Program Files (x86)`
		}
		return []string{filepath.Join(pf, "Mozilla Firefox", "distribution"), filepath.Join(pf86, "Mozilla Firefox", "distribution")}
	case "darwin":
		return []string{"/Applications/Firefox.app/Contents/Resources/distribution"}
	default:
		return []string{"/etc/firefox/policies", "/usr/lib/firefox/distribution", "/usr/lib64/firefox/distribution"}
	}
}

// ---- Windows registry (through reg.exe, so no extra dependencies)

func reg(args ...string) error { return platform.Run("reg", args...) }

func writeRegistry(key string, p Policy) ([]Written, error) {
	var written []Written
	for _, kv := range p {
		switch v := kv.Value.(type) {
		case []string:
			sub := `HKLM\` + key + `\` + kv.Key
			_ = reg("delete", sub, "/f")
			for i, s := range v {
				if err := reg("add", sub, "/v", strconv.Itoa(i+1), "/t", "REG_SZ", "/d", s, "/f"); err != nil {
					return written, err
				}
			}
			written = append(written, Written{Kind: "regkey", Key: sub})
		default:
			typ, data := "REG_DWORD", ""
			switch x := v.(type) {
			case string:
				typ, data = "REG_SZ", x
			case bool:
				data = "0"
				if x {
					data = "1"
				}
			default:
				data = fmt.Sprint(x)
			}
			if err := reg("add", `HKLM\`+key, "/v", kv.Key, "/t", typ, "/d", data, "/f"); err != nil {
				return written, err
			}
			written = append(written, Written{Kind: "regvalue", Key: `HKLM\` + key, Name: kv.Key})
		}
	}
	return written, nil
}

// ---- macOS managed preferences plist

func xmlText(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;").Replace(s)
}

func plistValue(v any, indent int) string {
	pad := strings.Repeat("  ", indent)
	switch x := v.(type) {
	case bool:
		return fmt.Sprintf("%s<%t/>", pad, x)
	case int:
		return fmt.Sprintf("%s<integer>%d</integer>", pad, x)
	case string:
		return pad + "<string>" + xmlText(x) + "</string>"
	case []string:
		items := make([]string, len(x))
		for i, s := range x {
			items[i] = plistValue(s, indent+1)
		}
		return pad + "<array>\n" + strings.Join(items, "\n") + "\n" + pad + "</array>"
	case Policy:
		items := make([]string, len(x))
		for i, kv := range x {
			items[i] = pad + "  <key>" + kv.Key + "</key>\n" + plistValue(kv.Value, indent+1)
		}
		return pad + "<dict>\n" + strings.Join(items, "\n") + "\n" + pad + "</dict>"
	}
	return pad + "<string>" + xmlText(fmt.Sprint(v)) + "</string>"
}

// ToPlist renders a policy as a property list.
func ToPlist(p Policy) string {
	return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n" +
		plistValue(p, 0) + "\n</plist>\n"
}

func exists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func copyFile(from, to string) error {
	b, err := os.ReadFile(from)
	if err != nil {
		return err
	}
	return os.WriteFile(to, b, 0o644)
}

func backupAndWrite(f string, content []byte) (Written, error) {
	if exists(f) && !exists(f+".focusgateway-backup") {
		if err := copyFile(f, f+".focusgateway-backup"); err != nil {
			return Written{}, err
		}
	}
	if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
		return Written{}, err
	}
	if err := os.WriteFile(f, content, 0o644); err != nil {
		return Written{}, err
	}
	return Written{Kind: "file", Path: f}, nil
}

func indentJSON(v any) []byte {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
	return bytes.TrimRight(buf.Bytes(), "\n")
}

// MergeFirefox adds our policies to an existing policies.json, keeping everything else.
func MergeFirefox(existing []byte, ff Policy) []byte {
	var doc map[string]any
	d := json.NewDecoder(bytes.NewReader(existing))
	d.UseNumber()
	if d.Decode(&doc) != nil || doc == nil {
		doc = map[string]any{}
	}
	pol, _ := doc["policies"].(map[string]any)
	if pol == nil {
		pol = map[string]any{}
	}
	for _, kv := range ff {
		pol[kv.Key] = kv.Value
	}
	doc["policies"] = pol
	return indentJSON(doc)
}

// Apply writes the policies for every supported browser and records what it wrote.
func Apply(o Options) []Written {
	var written []Written
	chrome := Chromium(o)
	ff := Firefox(o)
	for _, target := range chromiumTargets() {
		var (
			w   []Written
			err error
		)
		switch runtime.GOOS {
		case "windows":
			w, err = writeRegistry(target, chrome)
		case "darwin":
			var one Written
			if one, err = backupAndWrite("/Library/Managed Preferences/"+target+".plist", []byte(ToPlist(chrome))); err == nil {
				w = []Written{one}
			}
		default:
			var one Written
			if one, err = backupAndWrite(filepath.Join(target, "focusgateway.json"), indentJSON(chrome)); err == nil {
				w = []Written{one}
			}
		}
		written = append(written, w...)
		if err != nil {
			paths.Log("policy write failed for", target, err.Error())
		}
	}
	for _, dir := range firefoxDirs() {
		// Only where Firefox is actually installed (Linux /etc/firefox/policies always works).
		if !(runtime.GOOS == "linux" && dir == "/etc/firefox/policies") && !exists(filepath.Dir(dir)) {
			continue
		}
		f := filepath.Join(dir, "policies.json")
		existing, _ := os.ReadFile(f)
		one, err := backupAndWrite(f, MergeFirefox(existing, ff))
		if err != nil {
			paths.Log("firefox policy write failed for", dir, err.Error())
			continue
		}
		written = append(written, one)
	}
	if written == nil {
		written = []Written{}
	}
	_ = paths.WriteJSON("policies-written.json", written)
	return written
}

// Remove undoes what Apply recorded: deletes our registry values and restores or removes our files.
func Remove() int {
	var written []Written
	paths.ReadJSON("policies-written.json", &written)
	for _, w := range written {
		switch w.Kind {
		case "regkey":
			_ = reg("delete", w.Key, "/f")
		case "regvalue":
			_ = reg("delete", w.Key, "/v", w.Name, "/f")
		case "file":
			if exists(w.Path + ".focusgateway-backup") {
				_ = os.Rename(w.Path+".focusgateway-backup", w.Path)
			} else if err := os.Remove(w.Path); err != nil && !errors.Is(err, fs.ErrNotExist) {
				paths.Log("could not remove", w.Path, err.Error())
			}
		}
	}
	_ = paths.WriteJSON("policies-written.json", []Written{})
	return len(written)
}
