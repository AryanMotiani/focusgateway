package cli

import (
	"regexp"
	"strings"
	"testing"
)

func TestPairingCodeFormat(t *testing.T) {
	re := regexp.MustCompile(`^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){4}$`)
	seen := map[string]bool{}
	for i := 0; i < 200; i++ {
		c := PairingCode()
		if !re.MatchString(c) {
			t.Fatalf("bad code %q", c)
		}
		if seen[c] {
			t.Fatal("codes must not repeat")
		}
		seen[c] = true
	}
}

func TestPairingLinkKeepsTheCodeInTheHash(t *testing.T) {
	t.Setenv("FOCUSGATEWAY_APP_URL", "http://localhost:5173")
	l := PairingLink("ABCD-EFGH-JKLM-NPQR-STUV")
	if l != "http://localhost:5173/#/install?pair=ABCD-EFGH-JKLM-NPQR-STUV" {
		t.Fatalf("got %s", l)
	}
	if strings.Index(l, "pair=") < strings.Index(l, "#") {
		t.Fatal("the code must be after the #, so it never reaches a server")
	}
}

func TestArgs(t *testing.T) {
	a := args{"--strict", "--chrome-extension-id", "abc"}
	if !a.flag("strict") || a.flag("purge") || a.option("chrome-extension-id") != "abc" || a.option("firefox-xpi") != "" {
		t.Fatal("flag parsing")
	}
}
