package policies

import (
	"encoding/json"
	"strings"
	"testing"

	"focusgateway/agent/internal/paths"
)

func TestChromiumPolicy(t *testing.T) {
	b, _ := json.Marshal(Chromium(Options{}))
	if string(b) != `{"DnsOverHttpsMode":"off","IncognitoModeAvailability":1,"BrowserGuestModeEnabled":false,"BrowserAddPersonEnabled":false}` {
		t.Fatalf("got %s", b)
	}
	strict := Chromium(OptionsFromConfig(paths.Config{Strict: true, ChromeExtensionID: "abc"}))
	b, _ = json.Marshal(strict)
	for _, want := range []string{`"URLBlocklist":["chrome://extensions"`, `"DeveloperToolsAvailability":2`, `"ExtensionInstallForcelist":["abc;https://clients2.google.com/service/update2/crx"]`} {
		if !strings.Contains(string(b), want) {
			t.Errorf("missing %s in %s", want, b)
		}
	}
}

func TestFirefoxPolicyAndMerge(t *testing.T) {
	ff := Firefox(Options{Strict: true, FirefoxXpiURL: "https://example.com/x.xpi"})
	merged := MergeFirefox([]byte(`{"policies":{"Homepage":{"URL":"https://example.org"}},"other":1}`), ff)
	var doc map[string]any
	if err := json.Unmarshal(merged, &doc); err != nil {
		t.Fatal(err)
	}
	p := doc["policies"].(map[string]any)
	if p["Homepage"] == nil || p["DisablePrivateBrowsing"] != true || p["BlockAboutAddons"] != true || doc["other"] == nil {
		t.Fatalf("merge lost or missed entries: %s", merged)
	}
	if !strings.Contains(string(merged), `"focusgateway@focusgateway.app"`) || !strings.Contains(string(merged), `"force_installed"`) {
		t.Fatalf("force install missing: %s", merged)
	}
	if !strings.Contains(string(MergeFirefox([]byte("not json"), ff)), "DNSOverHTTPS") {
		t.Fatal("a broken policies.json is replaced")
	}
}

func TestPlist(t *testing.T) {
	out := ToPlist(Chromium(Options{Strict: true}))
	for _, want := range []string{"<key>DnsOverHttpsMode</key>\n  <string>off</string>", "<key>IncognitoModeAvailability</key>\n  <integer>1</integer>", "<false/>", "<array>\n    <string>chrome://extensions</string>"} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in\n%s", want, out)
		}
	}
}
