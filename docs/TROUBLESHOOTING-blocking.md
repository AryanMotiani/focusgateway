# Sites are not blocked: diagnosis and fixes

A tester wrote: "I'm not sure if I did something wrong, but youtube, reddit, etc. weren't blocked even after I had started the study session and had specified that I wanted to block them."

This page lists every cause we found, what we changed, and what can still go wrong. If you are a user, jump to [Quick checks](#quick-checks).

## Quick checks

1. Open the **Blocking** page (or **Settings**). The **Blocking status** checklist at the top shows each thing blocking needs, with a green check, a red cross or a grey dot, and a one-click fix next to anything red:
   - **Extension connected**: the free extension is installed and talking to this page (and not older than the site).
   - **This site approved**: the website is allowed to use the extension. The official website always is, a copy on your own computer (`localhost`) needs Allow once.
   - **Website access granted**: the extension may reach websites (Firefox can install it without).
   - **Lock agent** (optional): blocks in other browsers and apps too.
   - **Blocks running right now**: every active block and why it is on, or why a rule is not running.
2. Press **Test blocking** under the checklist. It turns on a one minute block for `example.com`, opens it in a new tab and tells you whether the extension caught it.
3. A red **Blocking is off** chip in the status bar opens the same checklist.
4. On a copy of the app on your own computer (`localhost`), a page that says **Approve this site in the extension** means one more step: click the puzzle piece in the toolbar, then FocusGateway, then **Allow**. Then press **Check again**. The official website (aryanmotiani.github.io/focusgateway) connects by itself. If it does not, reload its tab (it was open before the extension was installed).
5. Firefox: if the FocusGateway icon shows a red **!**, click it and press **Grant access**.
6. Private or incognito window? Extensions do not run there unless you allow FocusGateway in the browser's extension settings.
7. On a phone? Browser extensions run on computers. Firefox for Android runs some extensions, but FocusGateway does not support it yet. Tasks, habits and the room still work.

## What the app says in each situation

| Situation | What you see |
|---|---|
| No extension, first visit to any app page (the room included) | A one-time dialog, **Site blocking needs the free extension**, with the install button for your browser (or the Install page) and **Continue without blocking**. It is remembered in `localStorage` (`focusgateway:no-extension-seen`), the red chips stay. |
| Trial study room (public `/room`, no setup yet or no extension) | A glass pill in the room header (on phones, above the windows): **Trial room. Site blocking is off until you add the extension.** with **Add extension**. |
| Starting focus without the extension | The **Blocking is off in this browser** dialog explains that the timer runs but nothing is blocked, with **Start anyway**. |
| Saving a rule without the extension | An inline note in the rule editor: the rule is saved and starts blocking once the extension is added. The toast says the same. |
| Extension installed, site not approved | The approval screen with the two steps (puzzle piece, then Allow), a small drawing of both, and **Check again**. After **Continue without blocking**, the red chip and the room pill offer **Connect**. |
| Extension without website access | A red banner above every page with **Fix it**, and a red line in the checklist. |
| Extension older than the website | A banner: **Update your extension to use the latest features.** Blocking keeps working. The extension reports its version in its `hello` answer, the app compares it with its own version (root `package.json`, injected by Vite). |

## Causes we found

### 1. Starting a session or saving a rule on the website failed (a real bug, fixed)

**Evidence.** On the hosted website the app talks to the extension through `window.postMessage` (`apps/web/src/lib/api.js`, bridge mode). The payload of `focus.start` holds the picked sites, and `rules.create` holds the sites and days. In the app these are Vue reactive arrays, which are JavaScript Proxies. `postMessage` can not copy a Proxy and throws `DataCloneError`, so the command never reached the extension. The only sign was a red toast with a technical message ("Failed to execute 'postMessage' on 'Window'..."). The extension's own pages were not affected because `runtime.sendMessage` serializes to JSON. This was reproduced by the new end-to-end test before the fix.

**Fix.** The bridge now sends a JSON copy of every payload (`bridgeAdapter` in `apps/web/src/lib/api.js`). New end-to-end tests start a focus session and create a hard block from the hosted app through the bridge and check that YouTube and Reddit really redirect.

**This is the most likely cause of the report**: extension installed, site approved, and yet nothing started.

### 2. The website was running without the extension (Local mode)

**Evidence.** When the website can not reach the extension it runs everything in the page (`localAdapter` in `apps/web/src/lib/api.js`). Tasks, habits, the timer and the room work, but nothing can block a site from a web page. This happens when:

- the extension is not installed (stores are not live yet, so testers load a zip by hand),
- the extension was installed after the page was opened (content scripts only reach pages loaded after install, and the extension reloads a FocusGateway tab it recognizes, but not always),
- the site was never approved in the extension popup, or
- someone pressed "Use without the extension" on the approval screen.

Before, the only hints were a small line under the timer ("The timer works here. Install the extension to actually block sites.") and a toast that still said "Sites are blocked".

**Fix.**

- Starting a focus session or saving a rule in that state now opens a clear dialog: **Blocking is off in this browser**, with the reason and a one-click fix that fits the browser (download for Chrome, Edge, Brave or Firefox, Safari and phone explained). You can still start the timer on purpose.
- If the extension is installed but the site is not approved, the dialog says so and offers **Connect now**, with steps that mention the puzzle piece menu (Chrome hides new extension icons there).
- A red **Blocking is off** chip sits in the status strip on every page and in the room, and the focus card shows a red box. A running session in that state says "Timer only: nothing is blocked".
- The approval screen explains the puzzle piece, and its secondary button now reads **Continue without blocking**, with a red note.
- The start toast no longer claims sites are blocked when they are not.

### 3. Firefox without access to websites

**Evidence.** `extension/build.mjs` lists `<all_urls>` under `host_permissions`. Firefox lets people switch that off ("Access your data for all websites"), and some Firefox versions and install paths leave it off at first. Redirect rules in `declarativeNetRequest` need host access, so with it off the redirect to our blocked page silently does nothing and the site loads. The popup already had a small "Grant access" note, but only if you opened the popup.

**Fix.**

- `extension/src/background.js` checks `permissions.contains` before building rules. Without access it uses plain `block` rules, which do not need host access, so the site is still stopped (the browser shows its own error page instead of ours).
- The toolbar badge turns into a red **!** while access is missing.
- On install, if access is missing, the extension opens a small page (`grant.html`) with one button that asks for it (permission prompts need a click).
- The popup shows a red "Blocking is off" box with a Grant access button, and the web app shows the same problem through the Blocking is off dialog (from the extension's own pages the button asks for access directly).
- Rules are rebuilt as soon as access is granted or removed.

### 4. Which sites a focus session blocks

**Evidence.** `FocusCard.vue` kept its own list of picked sites in each copy of the card (Today, Blocking and the study room each had one). Picking sites on Today and pressing Start in the room used the room's list, which could differ.

**Fix.** All focus cards now share one list (`focusDraft` in `apps/web/src/lib/store.js`).

**Checked and fine:**

- Sites are turned into domains by `domainsForSites` and into one `declarativeNetRequest` rule per domain with `requestDomains`, which also matches every subdomain. YouTube covers `youtube.com`, `www`, `m.`, `music.`, `youtu.be` and more, Reddit covers `www`, `old.`, `new.`, `redd.it`, `i.redd.it` and `v.redd.it`. Custom sites are reduced to a bare host, so subdomains follow. New unit tests in `packages/core/test/blocking.test.js` pin this down, including look-alikes like `notyoutube.com` that must not match.
- The session blocks through breaks, until its last round ends.
- Tabs already open on a blocked site are sent to the blocked page when a block starts.

### 5. Rule timing

**Evidence.** Every command that can change blocking (everything not in `PASSIVE` in `background.js`) runs `scheduleApply()` before the answer goes back, so rules apply immediately, not on the next 30 second alarm. A sleeping service worker wakes up for the message. No change needed.

### 6. A rule that is not running right now

**Evidence.** A task-gated window only blocks inside its hours, and opens early once every task attached to it is done. A hard block only blocks inside its hours. The Blocking page showed a short chip ("Not running") without saying why, and a new rule's toast always said "It starts at the next window", even when it was already blocking.

**Fix.** A new `explainRule()` in `packages/core/src/engine.js` says whether a rule is blocking and why not. Each rule on the Blocking page shows a sentence like "Not blocking right now: outside its time window. Next window starts tomorrow at 4:00 PM." or "Not blocking right now: every task for this window is done". The toast after creating a rule says the same.

### 7. Other browsers and settings

| Situation | What happens | What to do |
|---|---|---|
| Private or incognito window | Extensions are off there by default | Allow FocusGateway in private windows, or install the lock agent, which disables them |
| Extension switched off, or removed | Nothing blocks in that browser | Switch it back on. The lock agent keeps blocking at system level |
| Another browser | Only browsers with the extension block | Install it there too, or use the lock agent |
| Safari | The extension does not run in Safari | Use the lock agent, which blocks in every app |
| Phones | Browser extensions run on computers. Firefox for Android runs some, but FocusGateway does not support it yet | Use a computer for blocking. Tasks, habits and the room work on phones |
| Brave | Shields do not stop the extension | Nothing to do. Brave treats it like Chrome |
| Old extension zip with a newer website | Newer commands (like Test blocking) are unknown to the old extension. The app now notices and shows "Update your extension" | Download the latest zip from the Install page |

## Remaining risks

- **Manual installs.** Until the store listings are live, testers load a zip by hand, and Firefox temporary add-ons are removed when Firefox restarts. The Test blocking button makes this easy to notice, but it still needs a person to check.
- **Version skew.** The website updates on every merge, the extension zip only on a release. The app now shows "Update your extension" when the extension is older than the site, but the Install page still has to offer a newer zip. We could not confirm from here that the latest release already carries the `focusgateway-chromium.zip` asset the Install page links to. Maintainers should check that the Install page download works after each release.
- **Approval step.** Connecting the website still needs a click in the extension popup. That is on purpose (any website could ask to connect), but it is the step people miss. The dialogs now explain it clearly.
- **Firefox fallback.** Without host access, blocked sites show the browser's plain error page instead of FocusGateway's page with your tasks.
- **Admin users.** Anyone with administrator rights can switch off extensions or edit the hosts file. FocusGateway makes giving in slow and visible, not impossible.

## Where the code is

| Piece | File |
|---|---|
| Which domains are blocked now | `packages/core/src/engine.js` (`computeBlocks`, `explainRule`) |
| Site bundles and subdomain matching | `packages/core/src/sites.js`, `packages/core/src/bundles.js` |
| Network rules, open tabs, badge, host access | `extension/src/background.js` |
| Website to extension bridge | `extension/src/bridge.js`, `apps/web/src/lib/api.js` |
| Blocking is off dialog and chips | `apps/web/src/components/help/` (`guard.js`, `BlockingOffDialog.vue`, `BlockingOffBadge.vue`) |
| Blocking status checklist | `apps/web/src/components/help/BlockingStatus.vue`, `BlockingStatusDialog.vue` |
| First visit dialog, room notice, banners | `apps/web/src/components/help/FirstVisitDialog.vue`, `RoomNotice.vue`, `ExtensionBanner.vue` |
| Approval steps with Check again | `apps/web/src/components/help/ApproveGuide.vue`, `checkApproval` in `apps/web/src/lib/store.js` |
| Version check | `extensionOutdated` in `apps/web/src/lib/store.js`, `packages/core/src/version.js` |
| Test blocking | `apps/web/src/components/help/BlockingTest.vue`, `blocking.test` and `blocking.hit` in `packages/core/src/backend.js`, `extension/src/blocked.js` |
| End-to-end tests | `tests/e2e/blocking.spec.js` |
