package safefile

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestWriteFileReplacesAtomically(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "x.json")
	if err := WriteFile(f, []byte("one"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := WriteFile(f, []byte("two"), 0o644); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(f)
	if string(b) != "two" {
		t.Fatalf("got %q", b)
	}
	if st, _ := os.Stat(f); runtime.GOOS != "windows" && st.Mode().Perm() != 0o644 {
		t.Fatalf("mode %v", st.Mode())
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) != 1 {
		t.Fatalf("temp file left behind: %v", entries)
	}
}

func TestRefusesSymlinks(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlinks need extra rights on Windows")
	}
	dir := t.TempDir()
	victim := filepath.Join(dir, "victim")
	if err := os.WriteFile(victim, []byte("keep me"), 0o600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(dir, "policies.json")
	if err := os.Symlink(victim, link); err != nil {
		t.Fatal(err)
	}
	if err := WriteFile(link, []byte("pwned"), 0o644); !errors.Is(err, ErrNotRegular) {
		t.Fatalf("write through a link must be refused, got %v", err)
	}
	if _, err := ReadFile(link); err == nil {
		t.Fatal("read through a link must be refused")
	}
	if err := AppendFile(link, []byte("pwned"), 0o600); err == nil {
		t.Fatal("append through a link must be refused")
	}
	if err := Remove(link); err == nil {
		t.Fatal("remove of a link must be refused")
	}
	if b, _ := os.ReadFile(victim); string(b) != "keep me" {
		t.Fatalf("victim changed: %q", b)
	}
	// A planted link at the exclusive-create name fails too.
	if _, err := CreateExclusive(link, 0o600); err == nil {
		t.Fatal("exclusive create over a link must fail")
	}
}

func TestAdminOwnedDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("owner SIDs are checked on Windows by hand")
	}
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := AdminOwnedDir(dir); err != nil {
		t.Fatalf("own 0755 folder should pass: %v", err)
	}
	if err := os.Chmod(dir, 0o777); err != nil {
		t.Fatal(err)
	}
	if err := AdminOwnedDir(dir); err == nil {
		t.Fatal("world-writable folder must be refused")
	}
	link := filepath.Join(t.TempDir(), "link")
	if err := os.Symlink(dir, link); err != nil {
		t.Fatal(err)
	}
	if err := AdminOwnedDir(link); err == nil {
		t.Fatal("a link to a folder must be refused")
	}
	if err := AdminOwnedDir("/"); err != nil {
		t.Fatalf("/ is root owned: %v", err)
	}
}
