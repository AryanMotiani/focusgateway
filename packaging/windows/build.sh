#!/bin/sh
# Builds packaging/out/Regimen-Setup.exe with NSIS (works on Linux: apt install nsis).
# Needs the Windows agent binaries first: npm run agent:build
#   packaging/windows/build.sh 1.2.0
set -eu
VERSION="${1:?usage: build.sh <version>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/packaging/out"
mkdir -p "$OUT"
makensis -V2 \
  -DVERSION="$VERSION" \
  -DAMD64="$ROOT/agent/dist/regimen-agent-windows-amd64.exe" \
  -DARM64="$ROOT/agent/dist/regimen-agent-windows-arm64.exe" \
  -DLICENSE_FILE="$ROOT/LICENSE" \
  -DOUTFILE="$OUT/Regimen-Setup.exe" \
  "$ROOT/packaging/windows/regimen.nsi"
ls -l "$OUT/Regimen-Setup.exe"
