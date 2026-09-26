# Store listing copy

One source for the Firefox Add-ons, Edge Add-ons and (later) Chrome Web Store listings. Paste from here so all stores say the same thing.

- **Privacy policy URL:** https://aryanmotiani.github.io/focusgateway/privacy.html (file: `apps/web/public/privacy.html`)
- **Homepage / support:** https://aryanmotiani.github.io/focusgateway/ and https://github.com/AryanMotiani/focusgateway/issues
- **Screenshots:** `docs/store/screenshots/` (1280x800), promo tile `promo-tile-440x280.png`. Regenerate with `npm run store:screenshots`.
- **Icon:** `extension/src/icons/icon-128.png` (128x128)

## Name

FocusGateway

## Short description (132 characters max)

The same text is the manifest `description` (107 characters):

> Block distracting sites until your work is done. Tasks, habits and a lofi study room. Free and open source.

## Category

- Firefox Add-ons: **Other** (AMO has no productivity category). Add **Tabs** as a second category if the form offers one.
- Edge Add-ons: **Productivity**
- Chrome Web Store: **Productivity** (subcategory: Tools / Workflow & Planning)

Tags (AMO): productivity, focus, site blocker, pomodoro, students

## Full description

> FocusGateway blocks the sites that pull you away, and keeps them blocked until your work is actually done.
>
> **Task-Gated windows.** Pick sites and a time window, then attach tasks. The sites stay blocked until every attached task is ticked off. Finish early and they open early. Run late and the block keeps going until you finish.
>
> **Hard blocks.** Blocked for the whole window. For the times you need no way out, remove the escape hatch entirely.
>
> **Focus rounds.** Pomodoro-style sessions that block your chosen sites right away, breaks included.
>
> **Failsafe, not a loophole.** Need out in an emergency? There is a deliberate exit: your PIN, a short wait and a typed reason. It unlocks only the current window and shows up in your history.
>
> **Tasks, habits and a study room.** Deadlines, subtasks, repeats and a week view. A minimal habit tracker with streaks. A cozy rainy-window study room with lofi music generated live in your browser, so it keeps playing when YouTube is blocked.
>
> **Accountability you can see.** Levels, streaks and a year of kept promises, plus an honest list of the times you gave in.
>
> **Private by design.** No account, no ads, no analytics, no servers. Everything stays in your browser. Open source (MIT), so you can check.
>
> Want blocks in every browser and app, and no way around them with private windows or Secure DNS? Add the free FocusGateway lock agent for Windows, macOS or Linux from the website.

## Single purpose (Chrome Web Store)

> FocusGateway helps students focus by blocking the websites they choose during the times they choose, until their tasks are done.

## Permission justifications

Every permission in `extension/build.mjs` (the manifest), with the reason to paste into each store's form.

| Permission | Justification |
|---|---|
| `declarativeNetRequest` | Blocks requests to the sites the user put on their block list, during the windows they scheduled. Rules are generated from the user's own settings and updated when a block starts or ends. |
| `storage` | Saves the user's tasks, habits, schedule, block list and settings locally in the browser. Nothing is sent anywhere. |
| `unlimitedStorage` | The accountability history (months of tasks, focus sessions and a log of Failsafe use) can outgrow the default local storage quota. Still stored only on the device. |
| `alarms` | Starts and ends blocks on schedule and checks task-gated windows every 30 seconds, even when no FocusGateway page is open. |
| `tabs` | When a block starts, finds tabs already open on a newly blocked site and sends them to the extension's "blocked" page. After installing, finds the FocusGateway tab the user came from to carry their setup over. Tab contents are never read. |
| `notifications` | Tells the user when a block starts or ends. |
| Host permission `<all_urls>` | The user can block any site of their choice, so the extension needs to act on any site: block its requests and redirect its open tabs. It is also needed to talk to the optional lock agent on the user's own computer (`http://127.0.0.1:47621`). No page content is read or collected. |
| Content script on `https://aryanmotiani.github.io/focusgateway/*`, `http://localhost/*` and `http://127.0.0.1/*` (`bridge.js`) | A few lines that let the official FocusGateway web app talk to the extension. It runs on no other site. It checks the page's origin and path before relaying, the official app is trusted by that exact path, and a local development copy needs the user's approval in the extension popup. It does not read the page. |
| `incognito: "spanning"` | Blocks also apply in private windows when the user allows the extension there. |
| `web_accessible_resources` (`blocked.html` and its assets) | The page shown in place of a blocked site. |

**Remote code:** none. All code ships in the package. No `eval`, no remote scripts (CSP `script-src 'self'`). The popup and the blocked page open the FocusGateway website in a normal tab when it is reachable (a single `HEAD` request checks that first), and the copy of the app inside the package when it is not. The website never runs inside the extension.

## Data usage disclosures

For the Chrome Web Store "Privacy practices" tab and the Edge equivalent.

- Collects user data: **No**. Every category (personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity, website content): **not collected**.
- Data is stored only on the user's device (`chrome.storage.local`) and is never transmitted to the developer or third parties.
- Certify: not sold to third parties, not used or transferred for purposes unrelated to the single purpose, not used for creditworthiness or lending.
- Firefox: the manifest declares `data_collection_permissions: { required: ["none"] }`, so Firefox shows "no data collected" at install.

## Reviewer notes (Edge and Chrome "notes for certification")

> FocusGateway is a free, open-source site blocker for students (https://github.com/AryanMotiani/focusgateway). To test: after installing, a FocusGateway tab opens with a short setup (choose any PIN and skip through the steps). Then open Blocking and add a Hard block for YouTube that covers the current time. Visiting youtube.com now shows the blocked page. The extension makes no network requests except a reachability check of its own website (https://aryanmotiani.github.io/focusgateway/, before opening it in a tab) and an optional local helper program on 127.0.0.1:47621, which reviewers do not need. No account or login exists.
