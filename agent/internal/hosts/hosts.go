// Package hosts is the hosts-file layer. FocusGateway only ever touches the lines
// between its markers, writes atomically (temp file and rename) so a crash can't
// leave a half-written file, and never edits anything else in the file.
package hosts

import (
	"errors"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"focusgateway/agent/internal/platform"
)

const (
	markerPrefix = "# >>> FOCUSGATEWAY-MANAGED-START"
	// MarkerStart opens the managed block.
	MarkerStart = "# >>> FOCUSGATEWAY-MANAGED-START (do not edit; run `focusgateway-agent recover` if stuck)"
	// MarkerEnd closes the managed block.
	MarkerEnd = "# <<< FOCUSGATEWAY-MANAGED-END"
)

// Path is the system hosts file. FOCUSGATEWAY_HOSTS overrides it (tests and development).
func Path() string {
	if v := os.Getenv("FOCUSGATEWAY_HOSTS"); v != "" {
		return v
	}
	if runtime.GOOS == "windows" {
		root := os.Getenv("SystemRoot")
		if root == "" {
			root = `C:\Windows`
		}
		return filepath.Join(root, "System32", "drivers", "etc", "hosts")
	}
	return "/etc/hosts"
}

// splitLines splits on \r?\n like the JavaScript version.
func splitLines(content string) []string {
	lines := strings.Split(content, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimSuffix(l, "\r")
	}
	return lines
}

// ExpandDomains adds the www. variant of every domain (hosts files have no wildcards).
func ExpandDomains(domains []string) []string {
	set := map[string]bool{}
	for _, d := range domains {
		set[d] = true
		if !strings.HasPrefix(d, "www.") {
			set["www."+d] = true
		}
	}
	out := make([]string, 0, len(set))
	for d := range set {
		out = append(out, d)
	}
	sort.Strings(out)
	return out
}

// StripManaged removes our managed block and trailing blank lines, leaving everything else intact.
func StripManaged(content string) []string {
	var out []string
	inside := false
	for _, line := range splitLines(content) {
		switch {
		case strings.HasPrefix(line, markerPrefix):
			inside = true
		case strings.HasPrefix(line, MarkerEnd):
			inside = false
		case !inside:
			out = append(out, line)
		}
	}
	for len(out) > 0 && out[len(out)-1] == "" {
		out = out[:len(out)-1]
	}
	return out
}

// Render returns the new hosts file content for this set of blocked domains. Pure.
func Render(content string, domains []string, eol string) string {
	base := StripManaged(content)
	if len(domains) == 0 {
		return strings.Join(base, eol) + eol
	}
	lines := append([]string{}, base...)
	lines = append(lines, "", MarkerStart)
	for _, h := range ExpandDomains(domains) {
		lines = append(lines, "0.0.0.0 "+h, ":: "+h)
	}
	lines = append(lines, MarkerEnd)
	return strings.Join(lines, eol) + eol
}

// ManagedDomains lists the host names inside our block.
func ManagedDomains(content string) []string {
	set := map[string]bool{}
	inside := false
	for _, line := range splitLines(content) {
		switch {
		case strings.HasPrefix(line, markerPrefix):
			inside = true
		case strings.HasPrefix(line, MarkerEnd):
			inside = false
		case inside:
			if f := strings.Fields(line); len(f) > 1 {
				set[f[1]] = true
			}
		}
	}
	out := make([]string, 0, len(set))
	for d := range set {
		out = append(out, d)
	}
	sort.Strings(out)
	return out
}

// Read returns the hosts file, or "" if it does not exist.
func Read(file string) (string, error) {
	b, err := os.ReadFile(file)
	if errors.Is(err, fs.ErrNotExist) {
		return "", nil
	}
	return string(b), err
}

// WriteAtomic replaces the file through a temp file and rename.
func WriteAtomic(content, file string) error {
	tmp := file + ".focusgateway-tmp"
	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, file); err != nil {
		// Windows can refuse to replace a file that antivirus has open: write in place instead.
		_ = os.Remove(tmp)
		return os.WriteFile(file, []byte(content), 0o644)
	}
	return nil
}

// EOL is the line ending the hosts file uses on this OS.
func EOL() string {
	if runtime.GOOS == "windows" {
		return "\r\n"
	}
	return "\n"
}

// Apply writes the domain set into the hosts file. It returns true if the file changed.
func Apply(domains []string) (bool, error) { return ApplyTo(Path(), domains) }

// ApplyTo is Apply for a given file.
func ApplyTo(file string, domains []string) (bool, error) {
	current, err := Read(file)
	if err != nil {
		return false, err
	}
	next := Render(current, domains, EOL())
	if next == current {
		return false, nil
	}
	if err := WriteAtomic(next, file); err != nil {
		return false, err
	}
	if os.Getenv("FOCUSGATEWAY_HOSTS") == "" {
		FlushDNS()
	}
	return true, nil
}

// FlushDNS asks the OS to forget cached lookups so the new block applies right away.
func FlushDNS() {
	var cmds [][]string
	switch runtime.GOOS {
	case "windows":
		cmds = [][]string{{"ipconfig", "/flushdns"}}
	case "darwin":
		cmds = [][]string{{"dscacheutil", "-flushcache"}, {"killall", "-HUP", "mDNSResponder"}}
	case "linux":
		cmds = [][]string{{"resolvectl", "flush-caches"}, {"systemd-resolve", "--flush-caches"}, {"nscd", "-i", "hosts"}}
	}
	for _, c := range cmds {
		cmd := exec.Command(c[0], c[1:]...)
		platform.HideWindow(cmd)
		if err := cmd.Start(); err != nil {
			continue
		}
		done := make(chan struct{})
		go func() { _ = cmd.Wait(); close(done) }()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			_ = cmd.Process.Kill()
		}
	}
}
