//go:build windows

package platform

import (
	"errors"
	"os/exec"
	"strings"
	"syscall"
	"unsafe"
)

const createNoWindow = 0x08000000

var (
	shell32              = syscall.NewLazyDLL("shell32.dll")
	kernel32             = syscall.NewLazyDLL("kernel32.dll")
	procIsUserAnAdmin    = shell32.NewProc("IsUserAnAdmin")
	procShellExecuteW    = shell32.NewProc("ShellExecuteW")
	procGetConsoleProcs  = kernel32.NewProc("GetConsoleProcessList")
	errElevationDeclined = errors.New("administrator permission was not given")
)

// HideWindow keeps helper commands (reg, schtasks, ipconfig) from flashing a console.
func HideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
}

// IsAdmin reports whether this process runs elevated.
func IsAdmin() bool {
	r, _, _ := procIsUserAnAdmin.Call()
	return r != 0
}

func quoteArg(a string) string {
	if a != "" && !strings.ContainsAny(a, " \t\"") {
		return a
	}
	return `"` + strings.ReplaceAll(a, `"`, `\"`) + `"`
}

// Elevate relaunches exe with args through the UAC prompt ("Run as administrator").
func Elevate(exe string, args []string) error {
	quoted := make([]string, len(args))
	for i, a := range args {
		quoted[i] = quoteArg(a)
	}
	verb, _ := syscall.UTF16PtrFromString("runas")
	file, _ := syscall.UTF16PtrFromString(exe)
	params, _ := syscall.UTF16PtrFromString(strings.Join(quoted, " "))
	r, _, _ := procShellExecuteW.Call(0, uintptr(unsafe.Pointer(verb)), uintptr(unsafe.Pointer(file)), uintptr(unsafe.Pointer(params)), 0, 1)
	if r <= 32 {
		return errElevationDeclined
	}
	return nil
}

// OwnConsole reports whether this process got its own console window, which
// means it was started by a double click rather than from a terminal.
func OwnConsole() bool {
	var ids [4]uint32
	n, _, _ := procGetConsoleProcs.Call(uintptr(unsafe.Pointer(&ids[0])), 4)
	return n == 1
}

// StdinIsConsole reports whether stdin is a console someone can type into.
// Installers (NSIS nsExec) give the program a hidden console with a pipe as
// stdin: GetConsoleMode fails on a pipe, so we never wait for an Enter there.
func StdinIsConsole() bool {
	h, err := syscall.GetStdHandle(syscall.STD_INPUT_HANDLE)
	if err != nil || h == syscall.InvalidHandle || h == 0 {
		return false
	}
	var mode uint32
	return syscall.GetConsoleMode(h, &mode) == nil
}

// OpenURL opens a link in the default browser. explorer.exe hands the link to the
// already running, non-elevated shell, so the browser does not start as admin.
func OpenURL(url string) error {
	if err := startDetached(exec.Command("explorer.exe", url)); err == nil {
		return nil
	}
	return startDetached(exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url))
}

// ElevationHint tells people how to run a command as admin.
const ElevationHint = `Open PowerShell with "Run as administrator" and try again.`
