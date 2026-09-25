//go:build !windows && !darwin

package platform

import (
	"errors"
	"os"
	"os/exec"
)

// Elevate relaunches exe with args as root: sudo in a terminal, pkexec (the
// desktop password dialog) otherwise.
func Elevate(exe string, args []string) error {
	name := "sudo"
	if !IsTerminal() {
		if _, err := exec.LookPath("pkexec"); err != nil {
			return errors.New("no terminal and no pkexec: open a terminal and run it with sudo")
		}
		name = "pkexec"
	}
	cmd := exec.Command(name, append([]string{exe}, args...)...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	return cmd.Run()
}

// OpenURL opens a link with xdg-open in the desktop user's session, also when
// the agent runs as root (sudo, pkexec or a package install).
func OpenURL(url string) error {
	if os.Geteuid() != 0 {
		return startDetached(exec.Command("xdg-open", url))
	}
	u := desktopUser()
	if u == nil || u.Uid == "0" {
		return errors.New("no desktop user to open the browser for")
	}
	run := "/run/user/" + u.Uid
	display := os.Getenv("DISPLAY")
	if display == "" {
		display = ":0"
	}
	env := []string{"env", "DISPLAY=" + display, "XDG_RUNTIME_DIR=" + run, "DBUS_SESSION_BUS_ADDRESS=unix:path=" + run + "/bus"}
	if w := os.Getenv("WAYLAND_DISPLAY"); w != "" {
		env = append(env, "WAYLAND_DISPLAY="+w)
	} else if _, err := os.Stat(run + "/wayland-0"); err == nil {
		env = append(env, "WAYLAND_DISPLAY=wayland-0")
	}
	env = append(env, "xdg-open", url)
	if _, err := exec.LookPath("sudo"); err == nil {
		return startDetached(exec.Command("sudo", append([]string{"-u", u.Username, "--"}, env...)...))
	}
	return startDetached(exec.Command("runuser", append([]string{"-u", u.Username, "--"}, env...)...))
}
