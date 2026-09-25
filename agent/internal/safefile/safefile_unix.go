//go:build !windows

package safefile

import (
	"fmt"
	"os"
	"syscall"
)

const noFollow = syscall.O_NOFOLLOW

func chmod(f *os.File, perm os.FileMode) error { return f.Chmod(perm) }

// AdminOwnedDir returns nil when dir is a real directory (not a symbolic link)
// owned by root (or by the user this process runs as, which is root for the
// installed agent) that neither its group nor others can write to, unless the
// sticky bit is set, like /tmp. Only then can no other user swap the files
// inside it.
func AdminOwnedDir(dir string) error {
	st, err := os.Lstat(dir)
	if err != nil {
		return err
	}
	if st.Mode()&os.ModeSymlink != 0 || !st.IsDir() {
		return fmt.Errorf("%s is not a plain folder (refusing to follow a link)", dir)
	}
	sys, ok := st.Sys().(*syscall.Stat_t)
	if !ok {
		return fmt.Errorf("%s: unknown owner", dir)
	}
	if sys.Uid != 0 && int(sys.Uid) != os.Geteuid() {
		return fmt.Errorf("%s is owned by user %d, not root", dir, sys.Uid)
	}
	if st.Mode().Perm()&0o022 != 0 && st.Mode()&os.ModeSticky == 0 {
		return fmt.Errorf("%s is writable by other users (mode %v)", dir, st.Mode().Perm())
	}
	return nil
}
