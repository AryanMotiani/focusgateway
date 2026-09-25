// Package paths knows where the agent keeps its program and data, and reads and
// writes the small JSON files in the data folder.
package paths

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Port is the loopback port the extension talks to.
const Port = 47621

// ServiceName is the Task Scheduler task name on Windows.
const ServiceName = "FocusGatewayAgent"

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// ProgramDir is where the agent binary lives after install. Only admins can write there.
func ProgramDir() string {
	if v := os.Getenv("FOCUSGATEWAY_PROGRAM_DIR"); v != "" {
		return v
	}
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(ProgramFiles(), "FocusGateway")
	case "darwin":
		return "/Library/Application Support/FocusGateway/app"
	default:
		return "/opt/focusgateway"
	}
}

// ProgramFiles is the 64-bit Program Files folder on Windows. ProgramW6432 comes
// first because a 32-bit parent (like the setup program) can pass on
// ProgramFiles pointing at "Program Files (x86)".
func ProgramFiles() string {
	return env("ProgramW6432", env("ProgramFiles", `C:\Program Files`))
}

// BinaryName is the executable's file name on this OS.
func BinaryName() string {
	if runtime.GOOS == "windows" {
		return "focusgateway-agent.exe"
	}
	return "focusgateway-agent"
}

// ProgramBinary is the installed executable.
func ProgramBinary() string { return filepath.Join(ProgramDir(), BinaryName()) }

// DataDir holds root-owned data: config (pairing), last snapshot, hosts backup, log.
// It survives uninstall unless --purge is used.
func DataDir() string {
	if v := os.Getenv("FOCUSGATEWAY_DATA"); v != "" {
		return v
	}
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(env("ProgramData", `C:\ProgramData`), "FocusGateway", "data")
	case "darwin":
		return "/Library/Application Support/FocusGateway/data"
	default:
		return "/var/lib/focusgateway"
	}
}

// File is a path inside the data folder.
func File(name string) string { return filepath.Join(DataDir(), name) }

// ReadJSON decodes a data file into v. It returns false when the file is missing or unreadable.
func ReadJSON(name string, v any) bool {
	b, err := os.ReadFile(File(name))
	if err != nil {
		return false
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	return d.Decode(v) == nil
}

// WriteJSON writes a data file atomically (temp file and rename) with owner-only permissions.
func WriteJSON(name string, v any) error {
	if err := os.MkdirAll(DataDir(), 0o700); err != nil {
		return err
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return err
	}
	f := File(name)
	tmp := f + ".tmp"
	if err := os.WriteFile(tmp, bytes.TrimRight(buf.Bytes(), "\n"), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, f)
}

// ISO formats a time like JavaScript's Date.prototype.toISOString.
func ISO(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05.000Z") }

// Log prints a line and appends it to agent.log (rotated at about 1 MB).
func Log(args ...any) {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = fmt.Sprint(a)
	}
	line := fmt.Sprintf("[%s] %s", ISO(time.Now()), strings.Join(parts, " "))
	fmt.Println(line)
	if err := os.MkdirAll(DataDir(), 0o700); err != nil {
		return
	}
	f := File("agent.log")
	if st, err := os.Stat(f); err == nil && st.Size() > 1_000_000 {
		_ = os.Rename(f, f+".1")
	}
	fh, err := os.OpenFile(f, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return
	}
	defer fh.Close()
	_, _ = fh.WriteString(line + "\n")
}
