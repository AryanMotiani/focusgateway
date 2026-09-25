package hosts

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// Ported from the Node.js agent's test/agent.test.js ("hosts file rendering").

const original = "127.0.0.1 localhost\n::1 localhost\n# my own entry\n10.0.0.5 nas.local\n"

func TestAddsManagedBlockWithWwwAndIPv6(t *testing.T) {
	out := Render(original, []string{"youtube.com", "www.reddit.com"}, "\n")
	if !strings.HasPrefix(out, strings.TrimRight(original, "\n")) {
		t.Fatal("original lines must stay first and untouched")
	}
	for _, want := range []string{"0.0.0.0 youtube.com", "0.0.0.0 www.youtube.com", ":: youtube.com"} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q", want)
		}
	}
	if strings.Contains(out, "www.www.reddit.com") {
		t.Error("www. must not be doubled")
	}
	if got := ManagedDomains(out); !reflect.DeepEqual(got, []string{"www.reddit.com", "www.youtube.com", "youtube.com"}) {
		t.Errorf("managed domains %v", got)
	}
}

func TestReplacesTheBlockAndRemovesItCleanly(t *testing.T) {
	once := Render(original, []string{"a.com"}, "\n")
	twice := Render(once, []string{"b.com"}, "\n")
	if strings.Count(twice, MarkerStart) != 1 {
		t.Fatal("block must be replaced, not stacked")
	}
	if strings.Contains(twice, "a.com") {
		t.Fatal("old domains must go")
	}
	if Render(twice, nil, "\n") != original {
		t.Fatal("removing the block must restore the original file")
	}
}

func TestPreservesCRLF(t *testing.T) {
	win := strings.ReplaceAll(original, "\n", "\r\n")
	out := Render(win, []string{"x.com"}, "\r\n")
	if !strings.Contains(out, "\r\n0.0.0.0 x.com\r\n") {
		t.Fatal("CRLF lines expected")
	}
	if strings.Join(StripManaged(out), "\r\n")+"\r\n" != win {
		t.Fatal("stripping must give back the original CRLF file")
	}
}

func TestApplyWritesOnlyOnChange(t *testing.T) {
	f := filepath.Join(t.TempDir(), "hosts")
	if err := os.WriteFile(f, []byte(original), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("FOCUSGATEWAY_HOSTS", f)
	changed, err := Apply([]string{"x.com"})
	if err != nil || !changed {
		t.Fatalf("first apply: changed=%v err=%v", changed, err)
	}
	changed, err = Apply([]string{"x.com"})
	if err != nil || changed {
		t.Fatalf("second apply should be a no-op: changed=%v err=%v", changed, err)
	}
	if _, err := os.Stat(f + ".focusgateway-tmp"); !os.IsNotExist(err) {
		t.Fatal("temp file left behind")
	}
	if _, err := Apply(nil); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(f)
	if string(b) != strings.ReplaceAll(original, "\n", EOL()) && string(b) != original {
		t.Fatalf("clean file expected, got %q", b)
	}
}

func TestMissingHostsFileReadsEmpty(t *testing.T) {
	s, err := Read(filepath.Join(t.TempDir(), "nope"))
	if err != nil || s != "" {
		t.Fatalf("got %q, %v", s, err)
	}
}
