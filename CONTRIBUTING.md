# Contributing to FocusGateway

Thanks for helping! FocusGateway is built by and for students who want their focus back. Every kind of help counts: code, adding sites to the block list, testing on your browser or OS, design, docs and translations.

## Ground rules

- Be kind. We follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Found a way around a block?** That is a security issue for us. Report it privately (see [SECURITY.md](SECURITY.md)), not in a public issue.
- Small, focused pull requests get reviewed fastest. For anything big, open an issue first so we can agree on the approach.

## Good first contributions

- **Add a site to the block list.** Edit `packages/core/src/bundles.js`, add the site's domains (main site, CDN, video, API), and open a PR. Look for issues labelled `site-bundle` or `good first issue`.
- Try FocusGateway on a browser or OS we have not tested (Firefox, Safari with the agent, macOS, Windows) and report what breaks.
- Improve wording in the app. Keep it short, plain and friendly.

## Set up

You need Node.js 20.19 or newer (`.nvmrc` pins the version we use) and Git.

```bash
git clone https://github.com/AryanMotiani/focusgateway.git
cd focusgateway
npm install
npm run dev          # web app at http://localhost:5173 (standalone mode, no blocking)
```

To work on blocking, build and load the extension:

```bash
npm run build        # builds apps/web and extension/dist/{chromium,firefox}
```

Then in Chrome open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `extension/dist/chromium`. After a change, run `npm run build` again and press the reload icon on the extension card. In Firefox use `about:debugging`, **Load Temporary Add-on**, and pick `extension/dist/firefox/manifest.json`.

The lock agent can be tried without touching your real hosts file:

```bash
FOCUSGATEWAY_DATA=/tmp/fg FOCUSGATEWAY_HOSTS=/tmp/hosts node agent/bin/focusgateway-agent.js run
```

## Project map

| Folder | What lives there |
|---|---|
| `packages/core` | The rules engine and backend. Pure JavaScript, no browser APIs. **All rules live here** (PIN, Failsafe, conflicts, forward limits). |
| `apps/web` | Vue 3 + Tailwind app (landing page, dashboard, study room) |
| `extension` | Manifest V3 extension. Runs the backend, applies `declarativeNetRequest` rules |
| `agent` | Zero-dependency Node.js lock agent (hosts file, browser policies, OS service) |
| `tests/e2e` | Playwright tests that load the real extension into Chromium |

The UI never enforces a rule by itself. If you add a rule, put it in `packages/core/src/backend.js` and test it there. See the "How it fits together" section of the README for more.

## Before you open a pull request

```bash
npm run check        # lint + format check + unit tests + build
npm run test:e2e     # end-to-end tests (needs `npm run build` first)
```

`npm run format` and `npm run lint:fix` fix most style problems automatically.

- **Tests:** new behaviour in `packages/core` or `agent` needs a unit test (Vitest). Test through the public seams: `computeBlocks(state, now)`, `createBackend(...).dispatch(command, payload)`, and the agent's `renderHosts` and `mergeLocked`. Pass a fixed `now` so tests never depend on the real clock.
- **Bypass check:** if your change touches blocking, the PIN, Failsafe, task rules or the agent, write down in the PR how someone might misuse it and why they can't.
- **Commits:** we like [Conventional Commits](https://www.conventionalcommits.org/) (`feat: add Letterboxd bundle`, `fix(agent): retry launchctl bootstrap`). Not required, but it keeps the history readable.
- **Changelog:** add a line under "Unreleased" in `CHANGELOG.md` for anything users will notice.
- **Writing style:** UI text and docs use plain language and avoid em dashes.

CI runs lint, unit tests on Windows, macOS and Linux, the build, a Firefox add-on lint and the end-to-end tests on every pull request. A maintainer reviews once CI is green.

## Releasing (maintainers)

1. Move the "Unreleased" notes in `CHANGELOG.md` under a new version heading.
2. Bump the version: `npm version 1.2.0 --no-git-tag-version` (this updates `package.json`, the extension manifest version comes from it).
3. Commit, then tag and push: `git tag v1.2.0 && git push origin master --tags`.
4. The Release workflow checks the tag matches `package.json`, runs everything, builds the extension zips and a source bundle with the agent, and publishes a GitHub Release. If store secrets are configured it also uploads to the Chrome Web Store and addons.mozilla.org.

### Store publishing (optional)

Add these repository secrets (Settings, Secrets and variables, Actions) to turn on automatic store uploads:

| Store | Secrets |
|---|---|
| Chrome Web Store | `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` ([how to get them](https://github.com/fregante/chrome-webstore-upload-keys)) |
| Firefox Add-ons | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` (addons.mozilla.org, Developer Hub, Manage API Keys) |

The first upload to each store has to be done by hand so the listing exists.
