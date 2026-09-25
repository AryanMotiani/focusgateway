# Chrome Web Store checklist (later)

Not published yet: registering costs a **one-time 5 USD** developer fee. Until then, Chrome, Brave and Opera users get the manual install on the Install page, and are offered Edge or Firefox if they have them. Everything below is ready for when you decide to pay it.

## One time

- [ ] Register at https://chrome.google.com/webstore/devconsole (Google account, pay the one-time 5 USD fee, verify the contact email).
- [ ] Build: `npm ci && npm run build`. Upload `extension/dist/focusgateway-chromium-<version>.zip` as a new item.
- [ ] Store listing tab:
  - [ ] Description and short description from [LISTING.md](LISTING.md). Category **Productivity**, language English.
  - [ ] Store icon 128x128: `extension/src/icons/icon-128.png`.
  - [ ] Screenshots, 1280x800, at least 1 and up to 5: `docs/store/screenshots/*.png` (not the promo tile).
  - [ ] Small promo tile 440x280: `docs/store/screenshots/promo-tile-440x280.png`.
  - [ ] Homepage https://aryanmotiani.github.io/focusgateway/ and support https://github.com/AryanMotiani/focusgateway/issues.
- [ ] Privacy practices tab:
  - [ ] Single purpose: from [LISTING.md](LISTING.md).
  - [ ] Permission justification for each permission: the table in [LISTING.md](LISTING.md).
  - [ ] Remote code: **No**.
  - [ ] Data usage: nothing collected, tick the three certifications.
  - [ ] Privacy policy URL: https://aryanmotiani.github.io/focusgateway/privacy.html
- [ ] Distribution: Public, all regions. Submit for review. Broad host permissions (`<all_urls>`) mean an in-depth review, often 1 to 3 weeks.
- [ ] After approval, copy the listing URL into `CHROME_STORE_URL` in `apps/web/src/config.js`. The Install page then shows **Add to Chrome** (and Brave, Opera).
- [ ] Automatic updates: create OAuth credentials as described in https://github.com/fregante/chrome-webstore-upload-keys and add repository secrets `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`.
- [ ] Optional: install the lock agent with `--chrome-extension-id <id>` so it force-installs the extension through policy and it can't be removed.

## Every release (automatic once the secrets exist)

- [ ] Push a version tag. The `chrome-web-store` job uploads and auto-publishes the zip (it still goes through review).
