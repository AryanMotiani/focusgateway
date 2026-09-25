//go:build windows

package safefile

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

// Windows has no O_NOFOLLOW. RefuseLink (Lstat) runs before every open, and
// the temp files are created with O_EXCL (CREATE_NEW), which fails on any
// existing name, links included.
const noFollow = 0

func chmod(*os.File, os.FileMode) error { return nil }

var (
	advapi32                   = syscall.NewLazyDLL("advapi32.dll")
	kernel32                   = syscall.NewLazyDLL("kernel32.dll")
	procGetNamedSecurityInfoW  = advapi32.NewProc("GetNamedSecurityInfoW")
	procConvertSidToStringSidW = advapi32.NewProc("ConvertSidToStringSidW")
	procLocalFree              = kernel32.NewProc("LocalFree")
)

const (
	seFileObject             = 1
	ownerSecurityInformation = 1
	sidAdministrators        = "S-1-5-32-544"
	sidSystem                = "S-1-5-18"
	sidTrustedInstaller      = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"
)

// OwnerSID returns the owner of a file or folder as a string SID.
func OwnerSID(path string) (string, error) {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return "", err
	}
	var owner, sd uintptr
	r, _, _ := procGetNamedSecurityInfoW.Call(uintptr(unsafe.Pointer(p)), seFileObject, ownerSecurityInformation,
		uintptr(unsafe.Pointer(&owner)), 0, 0, 0, uintptr(unsafe.Pointer(&sd)))
	if r != 0 {
		return "", fmt.Errorf("GetNamedSecurityInfo %s: %w", path, syscall.Errno(r))
	}
	defer procLocalFree.Call(sd)
	var str *uint16
	if ok, _, e := procConvertSidToStringSidW.Call(owner, uintptr(unsafe.Pointer(&str))); ok == 0 {
		return "", fmt.Errorf("ConvertSidToStringSid: %w", e)
	}
	defer procLocalFree.Call(uintptr(unsafe.Pointer(str)))
	n := 0
	for p := unsafe.Pointer(str); *(*uint16)(unsafe.Add(p, n*2)) != 0; n++ {
	}
	return syscall.UTF16ToString(unsafe.Slice(str, n)), nil
}

func currentUserSID() string {
	t, err := syscall.OpenCurrentProcessToken()
	if err != nil {
		return ""
	}
	defer t.Close()
	u, err := t.GetTokenUser()
	if err != nil {
		return ""
	}
	s, err := u.User.Sid.String()
	if err != nil {
		return ""
	}
	return s
}

// AdminOwnedDir returns nil when dir is a real folder (not a symbolic link or
// junction) owned by Administrators, SYSTEM or TrustedInstaller. A folder a
// standard user created is owned by that user, who can always change its
// permissions again.
func AdminOwnedDir(dir string) error {
	st, err := os.Lstat(dir)
	if err != nil {
		return err
	}
	if st.Mode()&(os.ModeSymlink|os.ModeIrregular) != 0 || !st.IsDir() {
		return fmt.Errorf("%s is not a plain folder (refusing to follow a link or junction)", dir)
	}
	sid, err := OwnerSID(dir)
	if err != nil {
		return err
	}
	switch sid {
	case sidAdministrators, sidSystem, sidTrustedInstaller:
		return nil
	}
	// Where "Default owner for objects created by administrators" is set to the
	// creator, an elevated admin's own folders are owned by that admin account.
	if sid == currentUserSID() {
		return nil
	}
	return fmt.Errorf("%s is owned by %s, not by Administrators or SYSTEM", dir, sid)
}
