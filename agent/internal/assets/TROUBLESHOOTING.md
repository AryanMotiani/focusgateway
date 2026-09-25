# FocusGateway troubleshooting

This file works offline. It is also copied into the lock agent's install folder.

## A site is still blocked after its window ended

1. Open the FocusGateway dashboard. If the rule is **Task-Gated**, unfinished tasks keep the block going after the window ends. Finish them, or send them to the next window if they still have forwards left.
2. Reload the tab. Browsers cache DNS for up to a minute.
3. If you use the lock agent, check it: `focusgateway-agent status` (Windows: Start menu, **FocusGateway Lock Agent**, or `"C:\Program Files\FocusGateway\focusgateway-agent.exe" status`).

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

If it crashes 4 times in 2 minutes it clears its blocks for 10 minutes on its own (fail-open) so you are never stuck. It never does this while a no-failsafe block is running. Look at `agent.log` in the data folder, then reinstall: open a fresh download of the installer (your settings and pairing are kept).

## Lock agent: installing and connecting

- **Windows says "Windows protected your PC".** The installer is not code-signed yet. Click **More info**, then **Run anyway**. Step by step: `docs/INSTALL-AGENT.md` in the project.
- **macOS says it can't verify the package.** Click **Done**, then System Settings, Privacy & Security, **Open Anyway** (macOS 14 and older: right-click the file, **Open**). Or install from Terminal with `curl -fsSL https://github.com/AryanMotiani/focusgateway/releases/latest/download/install.sh | sh`.
- **The browser did not open after installing, or the link was opened in a browser without the extension.** Make a fresh pairing link: Windows Start menu, **FocusGateway Lock Agent** (or run the agent again), macOS and Linux `sudo focusgateway-agent pair`. Open the link in the browser that has the extension, or type the code it prints on the Install page ("Have a pairing code?") or in Settings, Lock agent.
- **"Could not pair: Wrong pairing code".** Pairing links and codes work once, and links expire after 30 minutes. Make a fresh one as above.
- **"Already paired".** The agent is paired with another extension install (for example after reinstalling the browser). Run `focusgateway-agent pair` as admin and use the new link or code.
- **"Agent not reachable".** The service is not running. Check `focusgateway-agent status`. Windows: Task Scheduler, `FocusGatewayAgent`. macOS: `sudo launchctl print system/app.focusgateway.agent`. Linux: `systemctl status focusgateway-agent`. Reinstalling fixes a missing service.
- **Upgrading from the old Node.js agent.** Just install the new one. It uses the same data folder, so it stays paired. The old `runtime` and `agent` folders in the program folder can be deleted.

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
- Agent: Windows, Settings, Apps, **FocusGateway lock agent**, Uninstall. Linux: your package manager (`sudo apt remove focusgateway-agent`). Anywhere: `focusgateway-agent uninstall` as admin (add `--purge` to also delete its data). It refuses while a no-failsafe block is running. Your tasks and habits live in the extension, not the agent.

## Known limits

Someone with administrator rights can always undo software on their own computer: editing the hosts file by hand, stopping or uninstalling the agent after a block, changing the system clock, a VPN or custom DNS server, or editing stored data directly. FocusGateway makes these slow and deliberate. It does not make them impossible.
