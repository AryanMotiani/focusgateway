# Maintainer setup (one time)

Everything in the repo is ready. These steps need your GitHub account, so they happen on github.com or your own computer. Roughly 15 minutes.

## 1. Merge this branch

Your repo is `AryanMotiani/focusgateway` with `master` as the default branch. The fix and the open source setup are on the local branch `fix/setup-adoption-and-oss` (placeholders already filled in with `AryanMotiani`). Push it and open a pull request, which also shows the new CI in action:

```bash
git push -u origin fix/setup-adoption-and-oss
```

Then on GitHub: **Compare & pull request**, wait for the checks to go green, and merge. (Or merge locally with `git checkout master && git merge fix/setup-adoption-and-oss && git push`.)

If you ever fork or rename the repo, `npm run set-repo -- <username> [repo-name]` updates the links again.

## 2. Check the Actions tab

Settings, **Actions**, General: allow all actions, and under "Workflow permissions" keep "Read repository contents" (the workflows ask for more only where they need it). The CI run for your pull request appears under **Actions**.

## 3. Turn on the website (GitHub Pages)

Settings, **Pages**, Source: **GitHub Actions**. After the next green CI run on `master`, the "Deploy website" workflow publishes it at `https://aryanmotiani.github.io/focusgateway/`. You can also start it by hand from Actions, Deploy website, Run workflow.

## 4. Protect `master`

Settings, **Rules**, Rulesets, **New branch ruleset**:

- Target: default branch
- Turn on: Restrict deletions, Block force pushes, **Require a pull request before merging** (1 approval, dismiss stale approvals), **Require status checks to pass** and add: `Lint and format`, `Build web app and extension`, `End-to-end (extension in Chromium)`, `Lock agent cross build`, and the `Unit tests` and `Lock agent (Go, ...)` jobs
- Leave yourself in the bypass list if you want to push small fixes directly

## 5. Security and community features

- Settings, **Security** (Code security): enable Dependabot alerts, Dependabot security updates, **Private vulnerability reporting** (SECURITY.md points to it) and secret scanning with push protection.
- Settings, General, Features: enable **Discussions** (the issue template links to it).
- Settings, General, Pull Requests: allow squash merging, turn on "Automatically delete head branches".
- Repository home page, the gear next to About: add a description, the website URL and topics such as `focus`, `productivity`, `site-blocker`, `browser-extension`, `pomodoro`, `students`, `vue`.
- Issues, Labels: create `good first issue`, `help wanted`, `site-bundle`, `triage` (bug and enhancement exist by default).

## 6. Release flow

```bash
npm version 1.1.0 --no-git-tag-version   # updates package.json (the extension and agent versions come from it)
# move the "Unreleased" notes in CHANGELOG.md under the new version, commit
git tag v1.1.0
git push origin master v1.1.0
```

The Release workflow (`.github/workflows/release.yml`) then:

1. checks the tag matches `package.json`, runs `npm run check`, the Firefox lint and the Go tests,
2. builds the lock agent for Windows, macOS and Linux (x64 and ARM64) with the version and the Pages URL (`homepage` in `package.json`) embedded,
3. builds `FocusGateway-Setup.exe` (NSIS) and the `.deb` and `.rpm` packages (nfpm) on Ubuntu, and the universal `FocusGateway.pkg` on a macOS runner,
4. publishes a GitHub Release with every file under a **stable name** plus `SHA256SUMS.txt`. The Install page links to `releases/latest/download/<name>`, so it always serves the newest,
5. publishes to the browser stores whose secrets exist (next section).

Nothing is code-signed yet, which is fine: [INSTALL-AGENT.md](INSTALL-AGENT.md) explains the one extra click on Windows and macOS. To sign later, add a signing step for the `.exe` (Authenticode) and the `.pkg` (`productsign` and notarization, which needs the 99 USD per year Apple Developer Program) before the publish job.

Package managers (winget, a Homebrew tap, AUR) are templates in [packaging/](../packaging/README.md), submitted by hand after a release.

## 7. Browser stores

| Store | Cost | Status | Checklist |
|---|---|---|---|
| Firefox Add-ons | free | publish now | [store/CHECKLIST-FIREFOX.md](store/CHECKLIST-FIREFOX.md) |
| Edge Add-ons | free | publish now | [store/CHECKLIST-EDGE.md](store/CHECKLIST-EDGE.md) |
| Chrome Web Store | one-time 5 USD | later | [store/CHECKLIST-CHROME.md](store/CHECKLIST-CHROME.md) |

Listing text, permission justifications and data disclosures: [store/LISTING.md](store/LISTING.md). Screenshots: `docs/store/screenshots/` (regenerate with `npm run store:screenshots` after UI changes). Privacy policy: `apps/web/public/privacy.html`, live at https://aryanmotiani.github.io/focusgateway/privacy.html once Pages is on.

The first upload to each store is by hand, so the listing exists. After approval:

1. Put the listing URL in `apps/web/src/config.js` (`FIREFOX_ADDONS_URL`, `EDGE_STORE_URL`, later `CHROME_STORE_URL`). The Install page then shows a one-click store button to people on that browser, and the manual steps only where no listing exists.
2. Add the API secrets below so every release uploads itself.

### Repository secrets

Settings, Secrets and variables, **Actions**, New repository secret. Each store job in `release.yml` skips itself while its first secret is missing, so add them once the listing exists.

| Store | Secret | Where to get it |
|---|---|---|
| Firefox Add-ons | `AMO_JWT_ISSUER` | addons.mozilla.org, Developer Hub, Tools, Manage API Keys: "JWT issuer" |
| | `AMO_JWT_SECRET` | same page: "JWT secret" |
| Edge Add-ons | `EDGE_PRODUCT_ID` | Partner Center, your extension, Overview: Product ID |
| | `EDGE_CLIENT_ID` | Partner Center, Microsoft Edge, **Publish API**: Client ID (v1.1 API) |
| | `EDGE_API_KEY` | same page: API key. It expires, so renew it before the date shown |
| Chrome Web Store (later) | `CWS_EXTENSION_ID` | the item ID in the developer dashboard |
| | `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` | a Google Cloud OAuth client, steps at https://github.com/fregante/chrome-webstore-upload-keys |

The Firefox job signs with `web-ext sign --channel listed` and attaches the source archive (the extension bundles minified code, so AMO asks for it). The Edge job uses the Edge Add-ons API v1.1: it uploads the Chromium zip to the draft, waits for processing and submits it for review.

Once the Chrome listing exists, the lock agent can force-install the extension so it can't be removed: `focusgateway-agent install --chrome-extension-id <id>` (and `--firefox-xpi <url>` for Firefox).

Store reviewers will ask why the extension needs access to all sites: it is needed to block any site the user chooses and to redirect open tabs when a block starts. The full answers are in [store/LISTING.md](store/LISTING.md).
