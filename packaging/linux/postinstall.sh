#!/bin/sh
# Runs after the .deb or .rpm put the binary in place.
#   deb: postinst configure [<old version>] | abort-remove | abort-upgrade ...
#   rpm: %post 1 (install) or 2 (upgrade)
# Registers the systemd service and opens the pairing link for the person who ran
# sudo. On upgrade it keeps the existing settings (strict mode, extension ids).
BIN=/opt/focusgateway/focusgateway-agent

mode=install
case "${1:-}" in
  configure) [ -n "${2:-}" ] && mode=upgrade ;;
  2) mode=upgrade ;;
  # dpkg undoes a removal that preremove refused (a no-failsafe block runs):
  # the package stays, so the service goes back to the packaged binary.
  abort-remove) mode=upgrade ;;
  abort-*) exit 0 ;;
esac

if [ "$mode" = upgrade ]; then
  "$BIN" install --keep-settings --no-browser --no-pause || echo "FocusGateway: could not restart the lock agent. Run: sudo focusgateway-agent install" >&2
else
  "$BIN" install --keep-settings --no-pause || echo "FocusGateway: could not start the lock agent. Run: sudo focusgateway-agent install" >&2
fi
exit 0
