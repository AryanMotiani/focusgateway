#!/bin/sh
# Runs before the .deb or .rpm is removed.
#   deb: prerm remove | upgrade ...   rpm: %preun 0 (erase) or 1 (upgrade)
# On removal the agent cleans up its service, policies and hosts entries. It
# refuses (exit code 2) while a no-failsafe block is running. This script then
# fails, and dpkg and rpm keep the package installed.
#
# --package-removal also covers a removal that goes ahead anyway (forced): the
# agent first copies itself to /var/lib/regimen/regimen-agent, which
# no package owns, and points the service there, so blocking and `recover` keep
# working until the block ends. If the package stays, dpkg calls postinst
# abort-remove and the next install or upgrade points the service back at
# /opt/regimen. Same design as the AUR package (see
# packaging/aur/regimen-agent.install).
BIN=/opt/regimen/regimen-agent

case "${1:-}" in
  remove | purge | 0)
    [ -x "$BIN" ] || exit 0
    "$BIN" uninstall --yes --keep-program --package-removal --no-pause
    rc=$?
    if [ "$rc" = 2 ]; then
      echo "Regimen: a no-failsafe block is running. Remove the lock agent after it ends." >&2
      exit 1
    fi
    ;;
esac
exit 0
