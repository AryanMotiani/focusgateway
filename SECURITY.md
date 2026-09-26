# Security policy

FocusGateway runs with broad browser permissions, and the optional lock agent runs as administrator. We take reports seriously.

## What counts as a security issue here

Besides the usual (code execution, data leaks, privilege escalation through the agent), we treat **ways to get around a block through FocusGateway itself** as security issues. Examples:

- unlocking a Task-Gated window without finishing its tasks or using Failsafe
- skipping the Failsafe PIN, wait or typed reason
- editing or deleting a running no-failsafe rule
- a website other than the official FocusGateway app (or a local copy you allowed) reading or changing your FocusGateway data
- talking to the lock agent without the pairing secret

Things that need administrator rights on your own computer (editing the hosts file by hand, uninstalling the agent after a block ends, changing the system clock) are known limits, listed in the README. Reports that make these easier than they should be are still welcome.

## How the website talks to the extension

The hosted app at https://aryanmotiani.github.io/focusgateway/ uses a small content script (`extension/src/bridge.js`) to reach the extension. It is trusted on three checks:

1. The manifest injects the script only on `https://aryanmotiani.github.io/focusgateway/*`, plus `http://localhost/*` and `http://127.0.0.1/*` for development. No other site gets it.
2. `bridge.js` checks `location` again (origin and the `/focusgateway/` path) before it relays a message, and only relays messages the page posted to itself.
3. The background checks the sender's URL once more. The official path is trusted without a prompt. A localhost copy still needs **Allow** in the toolbar popup.

Commands that need the PIN (Failsafe, editing a live rule, deleting a rule, changing the PIN, resetting data) still need it, whoever sends them.

Known limit: `aryanmotiani.github.io` is one origin for every GitHub Pages repo of that account, and pages on one origin can script each other. So anything published under that account is trusted as much as the app itself. Only publish trusted content there, or move the app to its own domain (then change `homepage` in `package.json` and rebuild the extension).

## How to report

Please **do not open a public issue**. Use GitHub's private reporting: go to the repository's **Security** tab and click **Report a vulnerability** (https://github.com/AryanMotiani/focusgateway/security/advisories/new).

Include the version, browser or OS, and steps to reproduce. We aim to reply within 7 days and to ship a fix for confirmed issues as fast as we can. We are happy to credit you in the release notes.

## Supported versions

Only the latest release gets security fixes.
