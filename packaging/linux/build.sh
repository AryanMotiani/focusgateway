#!/bin/sh
# Builds the lock agent's .deb and .rpm (x64 and ARM64) into packaging/out with
# stable file names. Needs nfpm (https://nfpm.goreleaser.com) and the Linux agent
# binaries (npm run agent:build).
#   packaging/linux/build.sh 1.2.0
set -eu
VERSION="${1:?usage: build.sh <version>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/packaging/out"
NFPM="${NFPM:-nfpm}"
mkdir -p "$OUT"
CFG="$(mktemp)"
trap 'rm -f "$CFG"' EXIT
for GOARCH in amd64 arm64; do
  sed -e "s|\${VERSION}|$VERSION|g" -e "s|\${GOARCH}|$GOARCH|g" -e "s|\${ROOT}|$ROOT|g" "$ROOT/packaging/linux/nfpm.yaml" >"$CFG"
  "$NFPM" package --config "$CFG" --packager deb --target "$OUT/focusgateway-agent_${GOARCH}.deb"
  rpmarch=x86_64
  [ "$GOARCH" = arm64 ] && rpmarch=aarch64
  "$NFPM" package --config "$CFG" --packager rpm --target "$OUT/focusgateway-agent.${rpmarch}.rpm"
done
cp "$ROOT/packaging/install.sh" "$OUT/install.sh"
ls -l "$OUT"
