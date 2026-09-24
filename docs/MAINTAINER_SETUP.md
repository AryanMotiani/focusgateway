# Maintainer setup (one time)

Everything in the repo is ready. These steps need your GitHub account, so they happen on github.com or your own computer. Roughly 15 minutes.

## 1. Put your username in the placeholders

```bash
npm install
npm run set-repo -- <your-github-username>
```

This fills in `YOUR-USERNAME` in the README badges, CONTRIBUTING, SECURITY, CODEOWNERS, issue template links, `package.json` and the app's `apps/web/src/config.js`.

## 2. Create the repository and push

1. On GitHub: **New repository**, name `focusgateway`, Public, and do **not** add a README, license or .gitignore (the project has them).
2. On your computer, in the project folder:

```bash
git add -A
git commit -m "chore: open source setup"
git branch -M main
git remote add origin https://github.com/<your-username>/focusgateway.git
git push -u origin main
```

The CI workflow starts on this first push. Check the **Actions** tab.

## 3. Turn on the website (GitHub Pages)

Settings, **Pages**, Source: **GitHub Actions**. After the next green CI run on `main`, the "Deploy website" workflow publishes it at `https://<your-username>.github.io/focusgateway/`. You can also start it by hand from Actions, Deploy website, Run workflow.

## 4. Protect `main`

Settings, **Rules**, Rulesets, **New branch ruleset**:

- Target: default branch
- Turn on: Restrict deletions, Block force pushes, **Require a pull request before merging** (1 approval, dismiss stale approvals), **Require status checks to pass** and add: `Lint and format`, `Build web app and extension`, `End-to-end (extension in Chromium)`, and the `Unit tests` jobs
- Leave yourself in the bypass list if you want to push small fixes directly

## 5. Security and community features

- Settings, **Security** (Code security): enable Dependabot alerts, Dependabot security updates, **Private vulnerability reporting** (SECURITY.md points to it) and secret scanning with push protection.
- Settings, General, Features: enable **Discussions** (the issue template links to it).
- Settings, General, Pull Requests: allow squash merging, turn on "Automatically delete head branches".
- Repository home page, the gear next to About: add a description, the website URL and topics such as `focus`, `productivity`, `site-blocker`, `browser-extension`, `pomodoro`, `students`, `vue`.
- Issues, Labels: create `good first issue`, `help wanted`, `site-bundle`, `triage` (bug and enhancement exist by default).

## 6. First release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The Release workflow builds the Chromium and Firefox zips and a source bundle (which contains the lock agent) and attaches them to a GitHub Release. The Install page's "Download latest release" button points there.

## 7. Browser stores (optional, recommended)

- **Chrome Web Store:** register as a developer (one-time 5 USD), upload `focusgateway-chromium-<version>.zip` by hand the first time, fill in the listing and privacy form (data stays on the device, no data collected). Then add the `CWS_*` secrets from CONTRIBUTING.md so later releases upload themselves.
- **Edge Add-ons** (free) and **Opera add-ons** accept the same Chromium zip.
- **Firefox Add-ons** (free): upload `focusgateway-firefox-<version>.zip` at addons.mozilla.org. Then add the `AMO_*` secrets.
- When listed, put the store links in `apps/web/src/config.js`. The lock agent can then force-install the extension: `focusgateway-agent install --chrome-extension-id <id>`.

Store reviewers will ask why the extension needs access to all sites: it is needed to block any site the user chooses and to redirect open tabs when a block starts.
