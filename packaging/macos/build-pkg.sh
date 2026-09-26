#!/bin/sh
# Builds packaging/out/Regimen.pkg (universal: Apple silicon and Intel).
# Runs on macOS (needs lipo, pkgbuild, productbuild). Needs the darwin agent
# binaries first: npm run agent:build -- --target darwin/amd64 --target darwin/arm64
#   packaging/macos/build-pkg.sh 1.2.0
set -eu
VERSION="${1:?usage: build-pkg.sh <version>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/packaging/macos"
OUT="$ROOT/packaging/out"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

APP="$WORK/root/Library/Application Support/Regimen/app"
mkdir -p "$APP"
lipo -create \
  "$ROOT/agent/dist/regimen-agent-darwin-amd64" \
  "$ROOT/agent/dist/regimen-agent-darwin-arm64" \
  -output "$APP/regimen-agent"
chmod 755 "$APP/regimen-agent"
lipo -info "$APP/regimen-agent"

mkdir -p "$WORK/scripts"
cp "$HERE/scripts/postinstall" "$WORK/scripts/postinstall"
chmod 755 "$WORK/scripts/postinstall"

pkgbuild \
  --root "$WORK/root" \
  --identifier app.regimen.agent \
  --version "$VERSION" \
  --scripts "$WORK/scripts" \
  --install-location / \
  "$WORK/regimen-agent.pkg"

mkdir -p "$WORK/resources"
cp "$HERE/resources/"*.html "$WORK/resources/"
cp "$ROOT/LICENSE" "$WORK/resources/LICENSE.txt"
sed "s/__VERSION__/$VERSION/g" "$HERE/distribution.xml" >"$WORK/distribution.xml"

productbuild \
  --distribution "$WORK/distribution.xml" \
  --resources "$WORK/resources" \
  --package-path "$WORK" \
  "$OUT/Regimen.pkg"
ls -l "$OUT/Regimen.pkg"
