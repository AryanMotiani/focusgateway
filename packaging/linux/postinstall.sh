#!/bin/sh
# Runs after the .deb or .rpm put the binary in place.
#   deb: postinst configure [<old version>]   rpm: %post 1 (install) or 2 (upgrade)
# Registers the systemd service and opens the pairing link for the person who ran
# sudo. On upgrade it keeps the existing settings (strict mode, extension ids).
BIN=/opt/focusgateway/focusgateway-agent

upgrade=no
case "${1:-}" in
  configure) [ -n "${2:-}" ] && upgrade=yes ;;
  2) upgrade=yes ;;
esac

if [ "$upgrade" = yes ]; then
  "$BIN" install --keep-settings --no-browser || echo "FocusGateway: could not restart the lock agent. Run: sudo focusgateway-agent install" >&2
else
  "$BIN" install --keep-settings || echo "FocusGateway: could not start the lock agent. Run: sudo focusgateway-agent install" >&2
fi
exit 0
