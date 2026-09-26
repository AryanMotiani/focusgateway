# Distribution Improvement Plan

Two independent tracks, both reduce friction to zero for the end user.

---

## Track 1 — Self-Contained Agent (no Node.js required)

### The problem
The current agent is a Node.js script (`bin/regimen-agent.js`).  
Users must have Node ≥ 18.17 already installed, **and** run an admin terminal to install the service.  
That's a multi-step setup most non-developers won't complete.

### What it needs to do (small surface area)
Looking at the code, the agent only does four things:
1. Write/erase lines in the OS hosts file
2. Flush DNS (`ipconfig /flushdns`, `dscacheutil`, `resolvectl`)
3. Expose a tiny HTTP server on `127.0.0.1:47621` (health, pair, sync)
4. Register itself as an OS service (Task Scheduler / launchd / systemd)

This is a tiny workload — perfect for a compiled binary.

---

### Option A — **Bun `--compile` (Recommended for fastest path)**

Bun can bundle a Node-compatible JS app into a single self-contained executable with one command:

```bash
bun build ./agent/bin/regimen-agent.js --compile --outfile regimen-agent
# → produces a ~50 MB standalone binary, zero dependencies
```

**Pros**
- Near-zero code changes (same JS source)
- Works on Windows, macOS, Linux
- Binary is ~40–60 MB (acceptable; can be compressed to ~15 MB with UPX)
- Ships today; no rewrite

**Cons**
- Bun is a build-time dep (only for you, not the user)
- ~50 MB is larger than a true native binary

---

### Option B — **Go rewrite**

Rewrite the ~500 lines of agent logic in Go. `go build` produces a true native binary with no runtime, typically **3–8 MB**.

**Pros**
- Tiny binary, instant startup
- Easiest to code-sign and notarize (important for macOS Gatekeeper)
- Best long-term choice if the agent gains more OS-level features

**Cons**
- ~1–2 weeks of rewrite effort
- Separate codebase to maintain

---

### Option C — **pkg / nexe (Node bundlers)**

Tools like `pkg` (Vercel) or `nexe` embed Node into the binary.  
Result is ~80–120 MB. Works but is large and pkg is EOL.  
**Not recommended.**

---

### Recommendation
Start with **Bun compile** now (hours of work) → ship a working downloadable binary immediately.  
Plan a **Go rewrite** as a v2 milestone for a leaner, more professional binary.

---

### Installer UX (both options)

Instead of asking users to open a terminal, ship a proper installer:

| Platform | Installer format | Tool |
|---|---|---|
| Windows | `.exe` (NSIS or WiX) or `.msi` | [NSIS](https://nsis.sourceforge.io) / [WiX Toolset](https://wixtoolset.org) |
| macOS | `.pkg` or `.dmg` | `pkgbuild` + `productbuild` (built into Xcode CLT) |
| Linux | `.deb` / `.rpm` / AppImage | `fpm` or GitHub Actions matrix |

The installer just needs to:
1. Copy the binary to a permanent location
2. Run `regimen-agent install` (which already handles service registration)
3. Show "Done — pair with your extension" and exit

GitHub Releases can host the platform-specific installers, and the landing page links to the right one based on detected OS.

---

## Track 2 — Extension Store Distribution

### The problem
Currently users must manually download a ZIP and load it as an unpacked extension.  
This requires enabling Developer Mode, which most browsers warn against.  
**~80% of non-technical users drop off here.**

### Chrome Web Store

- Submit to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- One-time $5 developer fee
- Review takes 1–3 business days for new submissions, ~hours for updates
- The extension is already MV3, which is the required format — no changes needed
- Auto-updates are handled by the store; users never need to reinstall

**What's needed before submission:**
- [ ] 1280×800 or 640×400 screenshots (2–5 of them)
- [ ] A 128×128 icon (already exists in `extension/src/icons/`)
- [ ] Privacy policy URL (can be a page on your site)
- [ ] Store listing description

---

### Firefox Add-ons (AMO)

- Submit to [addons.mozilla.org](https://addons.mozilla.org/developers/)
- Free
- The current extension uses `chrome.*` APIs with `browser ?? chrome` fallback — already compatible
- Firefox requires a slightly different manifest key (`browser_specific_settings`) but this is a 3-line addition

**What's needed:**
- [ ] Same assets as Chrome
- [ ] Add `browser_specific_settings` to `manifest.json`
- [ ] Source code submission (AMO requires it for review; it stays private)

---

### Edge Add-ons

- Microsoft's store, free
- Accepts Chrome extensions directly — just re-upload the same ZIP
- [Partner Center submission](https://partner.microsoft.com/dashboard/microsoftedge)

---

### Safari (optional, stretch goal)

- Requires Xcode + an Apple Developer account ($99/year)
- Apple provides `safari-web-extension-converter` to wrap Chrome extensions
- Significant overhead; only worth it if you see demand

---

### CI/CD for store publishing

Once you have store accounts, automate publishing with:

```yaml
# .github/workflows/publish-extension.yml
- name: Build extension
  run: cd extension && npm run build

- name: Publish to Chrome Web Store
  uses: mnao305/chrome-extension-upload@v4
  with:
    file-path: extension/dist/regimen.zip
    extension-id: ${{ secrets.CWS_EXTENSION_ID }}
    client-id: ${{ secrets.CWS_CLIENT_ID }}
    client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
```

This makes every tagged release automatically push to all stores.

---

## Priority Order

```
Week 1  → Bun compile → test binary on all 3 OS → GitHub Release with download links
Week 2  → Chrome Web Store submission (assets + listing)
Week 3  → Firefox AMO submission  
Week 3  → Edge Add-ons (copy/paste from Chrome)
Later   → Windows .msi / macOS .pkg installer GUI
Later   → Go rewrite for smaller binary
```

---

## What stays the same

- All app logic stays in the Vue web app — no changes there
- The extension–agent protocol (HTTP on 127.0.0.1, pairing code) stays exactly the same
- The extension source code needs zero changes for Chrome/Edge; ~3 lines for Firefox
