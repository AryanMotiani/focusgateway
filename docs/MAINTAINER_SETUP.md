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

Make sure `package.json` has the version you tag (it starts at 1.0.0). The Release workflow builds the Chromium and Firefox zips and a source bundle (which contains the lock agent) and attaches them to a GitHub Release. The Install page's "Download latest release" button points there.

## 7. Browser stores (optional, recommended)

- **Chrome Web Store:** register as a developer (one-time 5 USD), upload `focusgateway-chromium-<version>.zip` by hand the first time, fill in the listing and privacy form (data stays on the device, no data collected). Then add the `CWS_*` secrets from CONTRIBUTING.md so later releases upload themselves.
- **Edge Add-ons** (free) and **Opera add-ons** accept the same Chromium zip.
- **Firefox Add-ons** (free): upload `focusgateway-firefox-<version>.zip` at addons.mozilla.org. Then add the `AMO_*` secrets.
- When listed, put the store links in `apps/web/src/config.js`. The lock agent can then force-install the extension: `focusgateway-agent install --chrome-extension-id <id>`.

Store reviewers will ask why the extension needs access to all sites: it is needed to block any site the user chooses and to redirect open tabs when a block starts.
