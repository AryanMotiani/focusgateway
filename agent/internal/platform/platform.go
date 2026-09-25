// Package platform wraps the few OS-specific calls the agent needs: admin checks,
// asking for elevation, and opening a link in the signed-in user's browser.
package platform

import (
	"os"
	"os/exec"
)

// Run runs a command quietly (no console window on Windows) and returns its error.
func Run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	HideWindow(cmd)
	return cmd.Run()
}

// Output runs a command quietly and returns its combined output.
func Output(name string, args ...string) ([]byte, error) {
	cmd := exec.Command(name, args...)
	HideWindow(cmd)
	return cmd.CombinedOutput()
}

// IsTerminal reports whether stdin is an interactive terminal.
func IsTerminal() bool {
	st, err := os.Stdin.Stat()
	return err == nil && st.Mode()&os.ModeCharDevice != 0
}

// startDetached starts a command and does not wait for it.
func startDetached(cmd *exec.Cmd) error {
	HideWindow(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { _ = cmd.Wait() }()
	return nil
}
