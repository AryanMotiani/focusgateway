//go:build darwin

package platform

import (
	"errors"
	"os"
	"os/exec"
	"strings"
)

// Elevate relaunches exe with args as root: sudo in a terminal, otherwise the
// standard macOS administrator password dialog.
func Elevate(exe string, args []string) error {
	if IsTerminal() {
		cmd := exec.Command("sudo", append([]string{exe}, args...)...)
		cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
		return cmd.Run()
	}
	parts := []string{shellQuote(exe)}
	for _, a := range args {
		parts = append(parts, shellQuote(a))
	}
	script := `do shell script "` + strings.ReplaceAll(strings.Join(parts, " "), `"`, `\"`) + `" with administrator privileges`
	out, err := exec.Command("osascript", "-e", script).CombinedOutput()
	if err != nil {
		return errors.New(strings.TrimSpace(string(out)))
	}
	return nil
}

func shellQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'" }

// OpenURL opens a link in the signed-in user's default browser, also when the
// agent runs as root (sudo or the installer package).
func OpenURL(url string) error {
	if os.Geteuid() == 0 {
		if u := desktopUser(); u != nil && u.Uid != "0" {
			return startDetached(exec.Command("launchctl", "asuser", u.Uid, "sudo", "-u", u.Username, "open", url))
		}
	}
	return startDetached(exec.Command("open", url))
}
