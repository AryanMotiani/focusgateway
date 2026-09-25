# Notes for addons.mozilla.org reviewers

Paste the "Notes to reviewer" section into the submission form. Attach the source archive `focusgateway-source-v<version>.zip` from the GitHub Release (the release workflow uploads it automatically when it signs through the API).

## Notes to reviewer

FocusGateway is a free, open-source (MIT) site blocker for students: https://github.com/AryanMotiani/focusgateway

**What it does:** blocks sites the user chooses during time windows they schedule (optionally until attached tasks are done), with a local task list, habit tracker and a study room whose music is synthesized with the Web Audio API. All data stays in `browser.storage.local`. The extension makes no network requests except to an optional helper program on the user's own computer (`http://127.0.0.1:47621`, the "lock agent"), which is not needed to review it.

**How to test:** after installing, a FocusGateway tab opens with a short setup. Choose any PIN and go through the steps. Open Blocking, add a Hard block for YouTube that covers the current time, then visit youtube.com: the tab shows the extension's blocked page.

**Why the code is minified:** the extension ships a Vue 3 web app (`app/`) built with Vite, and the background, popup and content scripts are bundled with esbuild. The source archive contains everything needed to rebuild it exactly.

**Linter warning:** `UNSAFE_VAR_ASSIGNMENT` in `app/assets/index-*.js` comes from the Vue runtime (it inserts the compiled static parts of templates with `innerHTML`). The app code has no `v-html` and never inserts user data as HTML.

**Permissions:** see the table in `docs/store/LISTING.md` in the source archive. Short version: `<all_urls>` and `declarativeNetRequest` to block any site the user picks, `tabs` to move already open tabs of a newly blocked site to the blocked page, `alarms` for schedules, `notifications` for block start and end, `storage`/`unlimitedStorage` for local data.

## Build instructions (source code submission)

Requirements: Node.js 20.19 or newer (the repo pins 22 in `.nvmrc`), npm 10, `zip`. Works on Linux, macOS and Windows (WSL).

```bash
unzip focusgateway-source-v<version>.zip
cd focusgateway
npm ci
npm run build:ext
```

The Firefox build is then in `extension/dist/firefox/`, and the uploaded package is `extension/dist/focusgateway-firefox-<version>.zip`, which is a zip of that folder. `npm run build:ext` runs `extension/build.mjs`, which:

1. builds the Vue app with Vite into `apps/web/dist-ext` (copied to `app/` in the package),
2. bundles `extension/src/{background,bridge,blocked,popup}.js` with esbuild (IIFE, minified),
3. copies the HTML, CSS and icons, and writes `manifest.json`.

Every dependency comes from the public npm registry at the versions pinned in `package-lock.json`. No other tools or network access are needed.
