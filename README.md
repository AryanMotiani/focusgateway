# Regimen

[![CI](https://github.com/AryanMotiani/regimen/actions/workflows/ci.yml/badge.svg)](https://github.com/AryanMotiani/regimen/actions/workflows/ci.yml)
[![Deploy website](https://github.com/AryanMotiani/regimen/actions/workflows/pages.yml/badge.svg)](https://github.com/AryanMotiani/regimen/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-6152e8.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1f9d6a.svg)](CONTRIBUTING.md)

Block distracting websites until your work is done. Tasks, a minimal habit tracker, a weekly schedule and a lofi study room, all in one free and open-source app.

It works in Chrome, Edge, Brave, Opera, Vivaldi, Arc and Firefox. With the optional lock agent it blocks in every browser and app on the computer (Safari included). There is no server and no account. Your data stays on your computer ([privacy policy](https://aryanmotiani.github.io/regimen/privacy.html)).

## Install

Open the **[Install page](https://aryanmotiani.github.io/regimen/#/install)**. It detects your browser and computer and shows two buttons:

1. **The browser extension.** One click from [Firefox Add-ons](docs/store/CHECKLIST-FIREFOX.md) and [Edge Add-ons](docs/store/CHECKLIST-EDGE.md) once the listings are live. Chrome, Brave and Opera install it by hand for now (four clicks, the page shows how) until the Chrome Web Store listing exists.
2. **The lock agent (optional, recommended).** One download: `Regimen-Setup.exe` for Windows, `Regimen.pkg` for macOS, a `.deb` or `.rpm` for Linux (or `curl -fsSL https://github.com/AryanMotiani/regimen/releases/latest/download/install.sh | sh`). Open it, and your browser connects it to the extension by itself. No Node.js or anything else to install. The downloads are not code-signed yet, so [Windows and macOS show a warning once](docs/INSTALL-AGENT.md).

## Documentation

- **[User guide](docs/USER-GUIDE.md)**: getting started, blocking, focus sessions, habits, the study room, XP and FAQ. Every page of the app also has a **?** help button and a first-visit tour.
- **[Sites not blocked?](docs/TROUBLESHOOTING-blocking.md)** Quick checks, and the **Test blocking** button in Settings.
- **[Developer guide](docs/DEVELOPER-GUIDE.md)**: architecture, how blocking is computed, adding themes, room items, tracks and badges, testing and releasing.

## What it does

**Task-Gated windows.** Pick sites and a time window, then attach tasks. The sites stay blocked during the window until every attached task is done. If the window ends with tasks still open, the block keeps going until you finish them. A window with no tasks stays blocked (no empty-window loophole).

**Hard blocks.** Blocked for the whole window, full stop. You can remove the escape hatch entirely for a rule. Hard blocks and task-gated windows can't overlap on the same site.

**Focus sessions.** Pomodoro-style rounds that start right away. Sites stay blocked through the breaks too.

**Failsafe.** The emergency exit: an "are you sure?" screen, your PIN, a forced wait (30 seconds to 5 minutes, you choose) and a typed reason with pasting disabled. It unlocks only the current window and is logged.

**Friction for going easy on yourself.** Deleting a task, pushing a deadline back, lowering priority or stopping a focus session early means typing a sentence and a real reason. Raising the bar gets a small cheer instead.

**Tasks and schedule.** Deadlines on everything, subtasks (never later or lower-priority than the parent), tags, repeats (daily, chosen weekdays, every N days), a per-task stopwatch, a list and a drag-and-drop board, and a week view where dragging a task moves its deadline.

**Forward limits.** A task in a study window can be sent to the next window a limited number of times: high priority once, medium three times, low five times. Colours go green, yellow, red as you use them up.

**Habits.** Minimal on purpose. Pick days, tick them off, keep the streak.

**Study room.** A rainy window scene with generative lofi music and rain, café, fire and brown-noise ambience, synthesized live in the browser. No audio files and no streaming, so it keeps playing when YouTube is blocked. Start a focus round from the room and it really blocks sites.

**Accountability.** Four cards (Task-Gated windows, Hard blocks, Tasks, Focus) with the good stuff on top and the slips below, charts for the last 14 days, and a full history with your typed reasons.

## How it fits together

```
apps/web        Vue 3 + Tailwind web app (landing page, dashboard, everything you see)
extension       Manifest V3 browser extension. Holds your data, runs the rules,
                blocks with declarativeNetRequest. Ships a copy of the web app inside.
agent           Optional lock agent. One small Go program (no runtime to install) that
                enforces the same rules through the hosts file and sets browser policies.
packages/core   The rules engine shared by the app and extension (pure JavaScript, fully
                tested). The agent carries a Go port that is tested against it.
packaging       Windows, macOS and Linux installers for the agent, plus winget, Homebrew
                and AUR templates
```

The **backend** in `packages/core/src/backend.js` is the single authority for every rule: PIN checks, the Failsafe cooldown, typed confirmations, conflict checks. It runs inside the extension's background worker. The web app only sends it commands.

The web app runs in three modes and picks one on its own:

| Mode | When | Blocking |
|---|---|---|
| Extension | Opened from the extension (toolbar icon) | Yes |
| Bridge | The official website (what the extension opens when online), or a localhost copy you allowed in the extension | Yes |
| Standalone | Hosted copy, no extension | No. Tasks, habits and the room work, saved in the browser. Data can be moved into the extension later |

### Why it is hard to get around

| Trick | What stops it |
|---|---|
| Open the site in another tab or window | Extension blocks every request to the site and redirects open tabs when a block starts |
| Use another browser or an app | Lock agent writes the sites into the system hosts file |
| Turn on Secure DNS (DoH) to skip the hosts file | Lock agent sets browser policies that switch Secure DNS off and lock the setting (Chrome, Edge, Brave, Chromium, Firefox) |
| Incognito, guest window or a new browser profile | Lock agent disables them by policy |
| Disable or remove the extension | Lock agent keeps blocking at system level. With `--strict` the extensions page is locked too. Publishing to the stores lets the agent force-install the extension so it can't be removed |
| Delete or weaken a running no-failsafe rule | Backend refuses. The agent also keeps its own copy until the window ends |
| Stop the agent service | Blocks stay in the hosts file. The service manager restarts it |
| Run the recovery tool | It refuses while the agent is healthy |

**Honest limits.** Anyone with administrator rights can eventually undo any software on their own computer: editing the hosts file by hand, uninstalling after a block ends, changing the system clock, using a VPN or custom DNS, editing stored data directly. Regimen is a commitment tool. Its job is to make giving in slow, deliberate and visible.

## Run it locally

Needs Node.js 20.19 or newer. The lock agent also needs Go 1.24 or newer.

```bash
npm install
npm run dev          # web app at http://localhost:5173
npm test             # unit tests for the engine and backend
npm run build        # web app + extension (extension/dist/chromium and extension/dist/firefox)
npm run agent:test   # go vet and go test for the lock agent
npm run agent:build  # lock agent for Windows, macOS and Linux (agent/dist)
npm run test:e2e     # loads the built extension into Chromium and tests real blocking (and pairing with the agent)
npm run check        # everything CI checks for the JavaScript side: lint, format, unit tests, build
```

Load the extension in Chrome: `chrome://extensions`, turn on Developer mode, **Load unpacked**, pick `extension/dist/chromium`. For Firefox use `about:debugging`, **Load Temporary Add-on**, pick `extension/dist/firefox/manifest.json`.

If you set Regimen up on the website before installing the extension, you don't redo anything: the website connects to the extension by itself and your PIN, rules, tasks, habits and what you have already seen (the room intro, tips) move into the extension.

## Deploy for free

The web app is a static site. Any of these work with no server and no database:

- **GitHub Pages.** Push to `master`. Once CI passes, `.github/workflows/pages.yml` builds and deploys. Turn on Pages with source "GitHub Actions" in the repo settings.
- **Netlify.** Import the repo. `netlify.toml` is already set up.
- **Vercel.** Import the repo. `vercel.json` is already set up.
- **Cloudflare Pages.** Build command `npm run build:web`, output directory `apps/web/dist`.

It uses hash routing and relative paths, so it works on a sub-path (like `username.github.io/regimen/`) with no extra config.

**Releases.** Push a tag like `v1.0.0`. The release workflow builds the extension zips, the lock agent for six platforms, the Windows setup, the macOS package, `.deb` and `.rpm` packages and `install.sh`, and attaches them to a GitHub Release with stable file names, so the Install page always links to the newest. With store secrets set, it also publishes to Firefox Add-ons and Edge Add-ons (and the Chrome Web Store later). See [docs/MAINTAINER_SETUP.md](docs/MAINTAINER_SETUP.md).

After you publish, edit `apps/web/src/config.js` with your repo URL and the store links.

### Publishing the extension

- **Firefox Add-ons** (free) and **Edge Add-ons** (free): checklists in [docs/store](docs/store), listing text in [docs/store/LISTING.md](docs/store/LISTING.md).
- **Chrome Web Store:** one-time 5 USD developer fee, planned for later. Everything is prepared in [docs/store/CHECKLIST-CHROME.md](docs/store/CHECKLIST-CHROME.md). Opera add-ons also take the Chromium zip.
- Once listed, install the agent with `--chrome-extension-id <id>` (and `--firefox-xpi <url>`) and it will force-install the extension so it can't be removed.

## Lock agent

Install it from the [Install page](https://aryanmotiani.github.io/regimen/#/install) (see [docs/INSTALL-AGENT.md](docs/INSTALL-AGENT.md)). It is one static Go binary of about 7 MB. Double-click it (or run `regimen-agent` with no arguments) and it asks for admin rights, copies itself to a system folder, registers a service that starts at boot and restarts on crash (Task Scheduler, launchd or systemd), writes the browser policies and opens Regimen in your browser with a one-time pairing link. The page connects the extension to the agent by itself. The link carries the code after the `#`, so it never reaches a server, and it expires after 30 minutes or first use. The agent also prints a **pairing code** you can type in the app instead.

```bash
regimen-agent install [--strict]   # admin, --strict also locks the extensions page, flags and developer tools
regimen-agent status               # is it running, is it paired, what is blocked
regimen-agent pair                 # admin, a fresh pairing link and code
regimen-agent recover              # admin, emergency: clear blocks if the agent is broken
regimen-agent policies             # admin, re-apply browser policies after installing a new browser
regimen-agent uninstall [--purge]  # admin, refused while a no-failsafe block is running
```

Safety nets: hosts-file writes are atomic and only touch lines between Regimen's markers. If the agent crashes 4 times in 2 minutes it clears its blocks for 10 minutes instead of leaving you stuck (fail-open). `recover` clears the blocks when the agent is broken and refuses when it is healthy. A one-time backup of the original hosts file is kept in the data folder. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Changes from the original PRD

The original `SPEC.md` and `TECHNICAL-PRD.md` are kept as the product source. This build follows their behaviour (modes, conflicts, empty-window rule, Failsafe flow, PIN rules, type-to-confirm, forward limits, subtask rules, streaks, accountability layout, export and import, system-clock time) with these deliberate changes:

- **Browser extension as the main blocker, hosts file as the lock layer.** A website can't block other sites, and the hosts-file-only design needed an admin install before anyone could try it. The extension installs in seconds everywhere. The agent adds the system-wide, no-bypass layer on top.
- **Secure DNS is closed in code.** The PRD documented DoH as a limitation. The agent now switches it off through browser policies.
- **No database server.** Data lives in the extension's local storage (or the browser in standalone mode). MySQL and MongoDB were dropped because hosting them costs money and every install would need a database. Export and import JSON replaces them for backups.
- **One process per piece, OS restarts instead of a custom watchdog.** systemd, launchd and Task Scheduler already restart crashed services reliably. The crash-loop fail-open rule is kept.
- **Added:** habit tracker, lofi study room, Kanban board, week view.
- **Trimmed:** the landing-page analytics globe and waitlist (these needed a server and a database), the tray icon (the extension's toolbar popup does the same job without native dependencies).

## Contributing

Contributions are welcome, from adding a distracting site to the block list to new features. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Please read the [Code of Conduct](CODE_OF_CONDUCT.md), and report security problems or ways around a block privately as described in [SECURITY.md](SECURITY.md).

Every pull request runs lint, unit tests on Windows, macOS and Linux (JavaScript and the Go agent), a cross build of the agent, the build, a Firefox add-on lint and end-to-end tests with the real extension and the real agent. Merging to `master` deploys the website. Pushing a version tag publishes a release. The locked design decisions are in `.agents/ACTIVE_SPEC.md` (the repo uses the [SkilledAgent](https://www.npmjs.com/package/skilledagent) workspace).

## License

MIT
