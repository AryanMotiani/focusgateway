# Packaging the lock agent

Everything here turns the Go lock agent (`agent/`) into something people can install without a terminal. The release workflow (`.github/workflows/release.yml`) runs all of it on every version tag and attaches the results to the GitHub Release with **stable file names**, so `https://github.com/AryanMotiani/regimen/releases/latest/download/<name>` always points at the newest one. The Install page links to those names.

| File in the release | Built by | For |
|---|---|---|
| `Regimen-Setup.exe` | `windows/build.sh` (NSIS, runs on Linux) | Windows 10 and 11, x64 and ARM64 in one file |
| `Regimen.pkg` | `macos/build-pkg.sh` (macOS runner) | macOS 11+, universal (Apple silicon and Intel) |
| `regimen-agent_amd64.deb`, `regimen-agent_arm64.deb` | `linux/build.sh` (nfpm) | Debian, Ubuntu, Mint |
| `regimen-agent.x86_64.rpm`, `regimen-agent.aarch64.rpm` | `linux/build.sh` (nfpm) | Fedora, openSUSE, RHEL |
| `install.sh` | copied from `install.sh` | `curl -fsSL .../install.sh \| sh` on Linux and macOS |
| `regimen-agent-<os>-<arch>[.exe]` | `npm run agent:build` | The plain binary. Double-click or run it: it installs itself |
| `SHA256SUMS.txt` | release workflow | Checksums for everything above |

Every installer does the same thing underneath: it puts the binary in place and runs `regimen-agent install`, which registers the service, writes the browser policies and opens the pairing link in the browser. Uninstalling runs `regimen-agent uninstall --yes`, which is refused while a no-failsafe block is running (the Windows uninstaller and the Linux package managers then stop).

None of it is code-signed yet, so Windows SmartScreen and macOS Gatekeeper show a warning the first time. [docs/INSTALL-AGENT.md](../docs/INSTALL-AGENT.md) walks people through it. Signing is a drop-in step later (Authenticode for the `.exe`, `productsign` plus notarization for the `.pkg`).

## Build locally

```bash
npm run agent:build                       # agent/dist/regimen-agent-*
sh packaging/windows/build.sh 1.0.0       # needs makensis (apt install nsis / brew install makensis)
sh packaging/linux/build.sh 1.0.0         # needs nfpm (https://nfpm.goreleaser.com/install/)
sh packaging/macos/build-pkg.sh 1.0.0     # macOS only
```

Output goes to `packaging/out/` (ignored by git).

## Package managers (templates, submitted by hand)

These are not published automatically. Each needs the version and the SHA-256 checksums from the release's `SHA256SUMS.txt`.

### winget (Windows Package Manager)

1. Copy `winget/*.yaml` into a fork of [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) at `manifests/a/AryanMotiani/Regimen/<version>/`.
2. Replace `1.0.0` with the version (also inside the installer URLs) and both `InstallerSha256` values with the checksum of `Regimen-Setup.exe` (it is the same file for x64 and ARM64).
3. Check with `winget validate --manifest <folder>` and `winget install --manifest <folder>` on a Windows machine, then open a pull request. Or let [wingetcreate](https://github.com/microsoft/winget-create) do it: `wingetcreate update AryanMotiani.Regimen --version <v> --urls <url> --submit`.

Users then run `winget install AryanMotiani.Regimen`.

### Homebrew (macOS)

1. Create a public repo named `homebrew-regimen` with `Casks/regimen-agent.rb` from `homebrew/`.
2. On each release update `version` and `sha256` (checksum of `Regimen.pkg`).
3. Test with `brew install --cask --verbose ./Casks/regimen-agent.rb`.

Users then run `brew install --cask aryanmotiani/regimen/regimen-agent`. The main homebrew/cask repository only takes signed and notarized apps, so the tap is the way until the package is notarized.

### AUR (Arch Linux)

1. `git clone ssh://aur@aur.archlinux.org/regimen-agent-bin.git`
2. Copy `aur/PKGBUILD` and `aur/regimen-agent.install` into it, update `pkgver` and the two `sha256sums_*` (checksums of `regimen-agent-linux-amd64` and `-arm64`).
3. `makepkg -si` to test, `makepkg --printsrcinfo > .SRCINFO`, commit and push.

Arch packages do not start services by themselves, so after installing people run `sudo regimen-agent install` once (the package prints this).
