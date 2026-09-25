// Package service registers the agent with the OS service manager so it starts at
// boot and is restarted if it crashes (systemd Restart=always, launchd KeepAlive,
// Task Scheduler restart on failure). This replaces a separate watchdog process.
package service

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"focusgateway/agent/internal/assets"
	"focusgateway/agent/internal/paths"
	"focusgateway/agent/internal/safefile"
)

// Self is the running executable with symlinks resolved.
func Self() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	if r, err := filepath.EvalSymlinks(exe); err == nil {
		exe = r
	}
	return filepath.Abs(exe)
}

func sameFile(a, b string) bool {
	sa, err1 := os.Stat(a)
	sb, err2 := os.Stat(b)
	return err1 == nil && err2 == nil && os.SameFile(sa, sb)
}

func copyExe(from, to string) error {
	src, err := os.Open(from)
	if err != nil {
		return err
	}
	defer src.Close()
	tmp := to + ".new"
	_ = safefile.Remove(tmp) // left over from an interrupted copy
	dst, err := safefile.CreateExclusive(tmp, 0o755)
	if err != nil {
		return err
	}
	if _, err := io.Copy(dst, src); err != nil {
		dst.Close()
		os.Remove(tmp)
		return err
	}
	if err := dst.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmp, to); err != nil {
		// Windows will not replace a running executable, but it can be renamed away.
		old := to + ".old"
		_ = os.Remove(old)
		if err2 := os.Rename(to, old); err2 != nil && !errors.Is(err2, fs.ErrNotExist) {
			os.Remove(tmp)
			return err
		}
		return os.Rename(tmp, to)
	}
	return nil
}

// CopyProgram puts this binary into the program folder (only admins can write
// there), so the service never runs a file an ordinary user could replace, and
// deleting the download afterwards is harmless. It returns the installed path.
func CopyProgram() (string, error) {
	dest := paths.ProgramBinary()
	if err := safefile.MkdirTrusted(paths.ProgramDir(), 0o755); err != nil {
		return "", err
	}
	self, err := Self()
	if err != nil {
		return "", err
	}
	if !sameFile(self, dest) {
		if err := copyExe(self, dest); err != nil {
			return "", err
		}
	}
	_ = os.Chmod(dest, 0o755)
	_ = safefile.WriteFile(filepath.Join(paths.ProgramDir(), "TROUBLESHOOTING.md"), assets.Troubleshooting, 0o644)
	_ = safefile.WriteFile(filepath.Join(paths.ProgramDir(), "LICENSE"), assets.License, 0o644)
	return dest, nil
}

// CopyTo copies this binary to dest (a file in an existing, admin-only folder)
// and returns dest.
func CopyTo(dest string) (string, error) {
	self, err := Self()
	if err != nil {
		return "", err
	}
	if !sameFile(self, dest) {
		if err := copyExe(self, dest); err != nil {
			return "", err
		}
	}
	return dest, os.Chmod(dest, 0o755)
}

// RemoveProgram deletes the program folder. On Windows the running binary can't
// delete itself, so a short helper finishes the job after this process exits.
func RemoveProgram() {
	removeProgram(paths.ProgramDir())
}

// RemoveExtras deletes the helper files install wrote next to the binary, for when
// a package manager owns the binary itself (uninstall --keep-program).
func RemoveExtras() {
	for _, f := range []string{"TROUBLESHOOTING.md", "LICENSE", "recover.cmd", paths.BinaryName() + ".old", paths.BinaryName() + ".new"} {
		_ = os.Remove(filepath.Join(paths.ProgramDir(), f))
	}
}

func xmlEscape(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;").Replace(s)
}
