//go:build !windows

package platform

import (
	"os"
	"os/exec"
	"os/user"
	"strconv"
	"syscall"
)

// HideWindow does nothing outside Windows.
func HideWindow(*exec.Cmd) {}

// IsAdmin reports whether this process runs as root.
func IsAdmin() bool { return os.Geteuid() == 0 }

// OwnConsole is a Windows concept. Elsewhere a double click opens a terminal that
// stays open by itself, so there is nothing to pause for.
func OwnConsole() bool { return false }

// StdinIsConsole reports whether someone can type into stdin.
func StdinIsConsole() bool { return IsTerminal() }

// ElevationHint tells people how to run a command as admin.
const ElevationHint = "Run it again with sudo."

// desktopUser is the person who asked for admin rights (through sudo, pkexec or
// the macOS password prompt), so a browser opens in their session, not root's.
func desktopUser() *user.User {
	if os.Geteuid() != 0 {
		u, _ := user.Current()
		return u
	}
	for _, k := range []string{"SUDO_UID", "PKEXEC_UID"} {
		if v := os.Getenv(k); v != "" && v != "0" {
			if u, err := user.LookupId(v); err == nil {
				return u
			}
		}
	}
	if v := os.Getenv("SUDO_USER"); v != "" && v != "root" {
		if u, err := user.Lookup(v); err == nil {
			return u
		}
	}
	// macOS: whoever is logged in at the screen owns /dev/console.
	if st, err := os.Stat("/dev/console"); err == nil {
		if s, ok := st.Sys().(*syscall.Stat_t); ok && s.Uid != 0 {
			if u, err := user.LookupId(strconv.FormatUint(uint64(s.Uid), 10)); err == nil {
				return u
			}
		}
	}
	return nil
}
