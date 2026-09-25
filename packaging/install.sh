#!/bin/sh
# FocusGateway lock agent installer for Linux and macOS.
#
#   curl -fsSL https://github.com/AryanMotiani/focusgateway/releases/latest/download/install.sh | sh
#
# Picks the right package for this computer from the latest GitHub release
# (.deb, .rpm, the macOS .pkg, or the plain binary elsewhere), installs it with
# sudo, and the agent then opens your browser to connect to FocusGateway.
# Read it first if you like: it is short, and that is a good habit with any
# script you pipe into a shell.
set -eu

REPO="${FOCUSGATEWAY_REPO:-AryanMotiani/focusgateway}"
BASE="https://github.com/$REPO/releases/latest/download"

say() { printf '%s\n' "$*"; }
fail() {
  say "FocusGateway: $*" >&2
  exit 1
}

fetch() { # url file
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    fail "needs curl or wget"
  fi
}

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || fail "run this as root, or install sudo"
  SUDO="sudo"
fi

case "$(uname -m)" in
  x86_64 | amd64) ARCH=amd64 RPMARCH=x86_64 ;;
  aarch64 | arm64) ARCH=arm64 RPMARCH=aarch64 ;;
  *) fail "unsupported processor $(uname -m). The lock agent runs on 64-bit Intel/AMD and ARM." ;;
esac

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

say "FocusGateway lock agent: installing from github.com/$REPO"
case "$(uname -s)" in
  Darwin)
    fetch "$BASE/FocusGateway.pkg" "$TMP/FocusGateway.pkg"
    say "Installing the package (asks for your password)..."
    $SUDO installer -pkg "$TMP/FocusGateway.pkg" -target /
    ;;
  Linux)
    if command -v dpkg >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
      fetch "$BASE/focusgateway-agent_${ARCH}.deb" "$TMP/focusgateway-agent.deb"
      say "Installing the .deb package (asks for your password)..."
      $SUDO dpkg -i "$TMP/focusgateway-agent.deb"
    elif command -v rpm >/dev/null 2>&1 && { command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1 || command -v zypper >/dev/null 2>&1; }; then
      fetch "$BASE/focusgateway-agent.${RPMARCH}.rpm" "$TMP/focusgateway-agent.rpm"
      say "Installing the .rpm package (asks for your password)..."
      $SUDO rpm -Uvh --replacepkgs "$TMP/focusgateway-agent.rpm"
    else
      fetch "$BASE/focusgateway-agent-linux-${ARCH}" "$TMP/focusgateway-agent"
      chmod +x "$TMP/focusgateway-agent"
      say "Installing (asks for your password)..."
      $SUDO "$TMP/focusgateway-agent" install
    fi
    ;;
  *) fail "this script is for Linux and macOS. On Windows, download FocusGateway-Setup.exe from github.com/$REPO/releases" ;;
esac
say ""
say "Done. Check it any time with: focusgateway-agent status"
