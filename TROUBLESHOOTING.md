# FocusGateway troubleshooting

This file works offline. It is also copied into the lock agent's install folder.

## A site is still blocked after its window ended

1. Open the FocusGateway dashboard. If the rule is **Task-Gated**, unfinished tasks keep the block going after the window ends. Finish them, or send them to the next window if they still have forwards left.
2. Reload the tab. Browsers cache DNS for up to a minute.
3. If you use the lock agent, check it: `focusgateway-agent status` (Windows: `node "C:\Program Files\FocusGateway\agent\bin\focusgateway-agent.js" status`).

## The lock agent is broken and sites stay blocked everywhere

Use the recovery tool. It only runs when the agent is not answering, so it can't be used to skip a block.

- **Windows:** Start Menu, FocusGateway, **FocusGateway Emergency Recovery**
- **macOS:** Applications, **FocusGateway Emergency Recovery**
- **Linux:** `sudo focusgateway-agent recover`, or "FocusGateway Emergency Recovery" in your app menu

It removes only the lines between the `FOCUSGATEWAY-MANAGED` markers in your hosts file. A copy of your original hosts file is kept in the data folder (`hosts.original.bak`):

- Windows: `C:\ProgramData\FocusGateway\data`
- macOS: `/Library/Application Support/FocusGateway/data`
- Linux: `/var/lib/focusgateway`

Last resort by hand, as admin: open the hosts file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`) and delete everything between the two FocusGateway marker lines.

## The agent keeps crashing

If it crashes 4 times in 2 minutes it clears its blocks for 10 minutes on its own (fail-open) so you are never stuck. Look at `agent.log` in the data folder, then reinstall: run `install` again from a fresh download.

## I forgot my PIN

Settings, **Forgot PIN**, enter your recovery code. You get a new code afterwards. Without the PIN and the code you can't use Failsafe, but blocks still end on schedule and task-gated windows still open when you finish your tasks.

## Blocking does not work in one browser

- Is the extension installed and enabled there? Check its toolbar popup.
- Firefox: after install, allow the extension to "Access your data for all websites" if it asks.
- Private windows: allow the extension in private/incognito windows, or install the lock agent (it disables them).
- Safari and other browsers: only the lock agent covers them.

## Browser policies (Secure DNS, private windows)

The agent writes them on install. Restart the browser afterwards. You can check them at `chrome://policy`, `edge://policy`, `brave://policy` or `about:policies` in Firefox. After installing a new browser, run `focusgateway-agent policies` as admin.

## Uninstalling

- Extension: remove it from the browser's extensions page (not possible while `--strict` lock is on, uninstall the agent first).
- Agent: `focusgateway-agent uninstall` as admin. It refuses while a no-failsafe block is running. Add `--purge` to also delete its data. Your tasks and habits live in the extension, not the agent.

## Known limits

Someone with administrator rights can always undo software on their own computer: editing the hosts file by hand, stopping or uninstalling the agent after a block, changing the system clock, a VPN or custom DNS server, or editing stored data directly. FocusGateway makes these slow and deliberate. It does not make them impossible.
