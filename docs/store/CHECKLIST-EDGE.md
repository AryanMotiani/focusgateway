# Microsoft Edge Add-ons checklist

Free. Review usually takes up to 7 business days. It takes the same Chromium zip as Chrome.

## One time

- [ ] Register at Partner Center (https://partner.microsoft.com/dashboard/microsoftedge/overview) with a Microsoft account. Individual developer accounts are free.
- [ ] Build: `npm ci && npm run build`.
- [ ] Create new extension, upload `extension/dist/regimen-chromium-<version>.zip`.
- [ ] Availability: Public, all markets.
- [ ] Properties: category **Productivity**, privacy policy URL https://aryanmotiani.github.io/regimen/privacy.html, website and support URLs. "Does this extension access personal information?" **No** (see the data disclosures in [LISTING.md](LISTING.md)).
- [ ] Store listing (English): description from [LISTING.md](LISTING.md) (at least 250 characters), logo 300x300 (scale `apps/web/public/icon-512.png`), small promo tile 440x280 (`docs/store/screenshots/promo-tile-440x280.png`), screenshots 1280x800 from `docs/store/screenshots/`.
- [ ] Notes for certification: paste "Reviewer notes" from [LISTING.md](LISTING.md).
- [ ] Publish. After approval copy the listing URL (like `https://microsoftedge.microsoft.com/addons/detail/<id>`) into `EDGE_STORE_URL` in `apps/web/src/config.js`. The Install page then shows **Get it for Edge** to Edge users.
- [ ] Automatic updates: Partner Center, the extension, **Publish API**, create API credentials. Add repository secrets `EDGE_PRODUCT_ID` (the product ID shown there), `EDGE_CLIENT_ID` and `EDGE_API_KEY`. Use the v1.1 API key (the page shows which version it made).

## Every release (automatic once the secrets exist)

- [ ] Push a version tag. The `edge-addons` job uploads the zip to the draft, waits for processing and submits it for review.
- [ ] API keys expire (the page shows when). Renew them before that date and update `EDGE_API_KEY`.

Opera add-ons (https://addons.opera.com/developer/) accept the same zip for free if you want a native Opera listing too. Opera users can also install from the Chrome Web Store once it exists.
