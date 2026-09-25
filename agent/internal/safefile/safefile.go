// Package safefile writes files as root (or an elevated administrator) without
// letting an ordinary user redirect the write. The agent writes into system
// folders (hosts, browser policies, service definitions, its data folder). If a
// user could put a symbolic link, junction or hard-to-see replacement at one of
// those paths, a naive write would follow it and overwrite a file of their
// choosing with admin rights. Every write here:
//   - refuses a destination that exists and is not a regular file (links included)
//   - creates its temp file with O_EXCL, plus O_NOFOLLOW where the OS has it
//   - replaces the destination with a rename, which never follows a link
package safefile

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// ErrNotRegular is returned for a path that exists but is a link, a directory
// or a device instead of a plain file.
var ErrNotRegular = errors.New("not a regular file (refusing to follow a link)")

// RefuseLink returns nil when path does not exist or is a regular file.
func RefuseLink(path string) error {
	st, err := os.Lstat(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if !st.Mode().IsRegular() {
		return fmt.Errorf("%s: %w", path, ErrNotRegular)
	}
	return nil
}

// ReadFile reads a regular file without following a link at its final component.
func ReadFile(path string) ([]byte, error) {
	if err := RefuseLink(path); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_RDONLY|noFollow, 0)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

// CreateExclusive creates a new file that must not exist yet (not even as a
// dangling link) and does not follow links.
func CreateExclusive(path string, perm os.FileMode) (*os.File, error) {
	return os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL|noFollow, perm)
}

func tempName(path string) string {
	return path + ".fg-" + strconv.FormatInt(time.Now().UnixNano(), 36) + ".tmp"
}

// WriteFile atomically replaces path with data and gives it perm (on Unix).
func WriteFile(path string, data []byte, perm os.FileMode) error {
	if err := RefuseLink(path); err != nil {
		return err
	}
	return Replace(path, data, perm)
}

// Replace is WriteFile for a path that may legitimately be a link placed by
// root, like /etc/hosts on some distributions: the rename swaps the link itself
// for a regular file and never writes to where it pointed. Use it only in
// folders that only root can write to.
func Replace(path string, data []byte, perm os.FileMode) error {
	tmp := tempName(path)
	f, err := CreateExclusive(tmp, perm)
	if err != nil {
		return err
	}
	_, werr := f.Write(data)
	if werr == nil {
		werr = chmod(f, perm)
	}
	if cerr := f.Close(); werr == nil {
		werr = cerr
	}
	if werr != nil {
		_ = os.Remove(tmp)
		return werr
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// AppendFile appends to a regular file, creating it with perm, without following a link.
func AppendFile(path string, data []byte, perm os.FileMode) error {
	if err := RefuseLink(path); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY|noFollow, perm)
	if err != nil {
		return err
	}
	_, err = f.Write(data)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	return err
}

// Remove deletes a regular file (or nothing, when it is already gone). It
// refuses links, so it never deletes something else by accident.
func Remove(path string) error {
	if err := RefuseLink(path); err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	return nil
}

// MkdirTrusted creates dir (and missing parents with mode 0755) and then checks
// with AdminOwnedDir that only an administrator can change it.
func MkdirTrusted(dir string, perm os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(dir), 0o755); err != nil {
		return err
	}
	if err := os.Mkdir(dir, perm); err != nil && !errors.Is(err, fs.ErrExist) {
		return err
	}
	return AdminOwnedDir(dir)
}
