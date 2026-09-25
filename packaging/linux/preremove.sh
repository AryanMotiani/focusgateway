#!/bin/sh
# Runs before the .deb or .rpm is removed.
#   deb: prerm remove | upgrade ...   rpm: %preun 0 (erase) or 1 (upgrade)
# On removal the agent cleans up its service, policies and hosts entries. It
# refuses (exit code 2) while a no-failsafe block is running, and then the
# package manager keeps the package installed.
BIN=/opt/focusgateway/focusgateway-agent

case "${1:-}" in
  remove | purge | 0)
    [ -x "$BIN" ] || exit 0
    "$BIN" uninstall --yes --keep-program
    rc=$?
    if [ "$rc" = 2 ]; then
      echo "FocusGateway: a no-failsafe block is running. Remove the lock agent after it ends." >&2
      exit 1
    fi
    ;;
esac
exit 0
