# Firefox Add-ons (addons.mozilla.org) checklist

Free. Review usually takes a few days. After the first listing, releases upload themselves.

## One time

- [ ] Create a Firefox account and sign in at https://addons.mozilla.org/developers/
- [ ] Build: `npm ci && npm run build`. Check: `npm run lint:firefox` and `npx web-ext lint --source-dir extension/dist/firefox` (listed rules) show 0 errors.
- [ ] Submit a New Add-on, "On this site" (listed). Upload `extension/dist/regimen-firefox-<version>.zip`.
- [ ] Answer "Do you need to submit source code?" **Yes**. Upload the source zip (`git archive --format=zip --prefix=regimen/ -o regimen-source.zip HEAD` or the release's `regimen-source-v<version>.zip`).
- [ ] Paste "Notes to reviewer" from [AMO_REVIEWER_NOTES.md](AMO_REVIEWER_NOTES.md).
- [ ] Listing: name, summary, description, categories and tags from [LISTING.md](LISTING.md). License: MIT. Privacy policy: paste the text of `apps/web/public/privacy.html` or link https://aryanmotiani.github.io/regimen/privacy.html. Homepage and support links.
- [ ] Images: icon (128px, `extension/src/icons/icon-128.png`), screenshots from `docs/store/screenshots/` (AMO accepts 1280x800).
- [ ] After approval, copy the listing URL (like `https://addons.mozilla.org/firefox/addon/regimen/`) into `FIREFOX_ADDONS_URL` in `apps/web/src/config.js`. The Install page then shows **Add to Firefox**.
- [ ] Developer Hub, Tools, **Manage API Keys**: create keys, add repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.

## Every release (automatic once the secrets exist)

- [ ] Push a version tag. The `firefox-addons` job in `release.yml` runs `web-ext sign --channel listed` with the source zip.
- [ ] Watch the email from AMO. If a reviewer asks something, answer in the Developer Hub.

## Things that trip reviews

- The manifest's `browser_specific_settings.gecko.id` (`regimen@aryanmotiani.github.io`) must never change, or AMO treats it as a new add-on.
- `data_collection_permissions` is set to `none`. If the extension ever sends data anywhere, this and the privacy policy must change first.
- Keep `strict_min_version` in `extension/build.mjs` in sync with the APIs used (currently Firefox 128).
