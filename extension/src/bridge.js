// Lets the hosted Regimen web app talk to this extension.
// The manifest only injects this on the official app (package.json "homepage", path included)
// and on localhost for development. aryanmotiani.github.io hosts every repo of that GitHub user,
// so the path is checked again here before anything is relayed. The background checks the
// sender's URL a third time: the official app is trusted, localhost needs "Allow" in the popup.
import { isOfficialApp, isDevApp } from './app-url.js'

const ext = globalThis.browser ?? globalThis.chrome
const allowed = () => isOfficialApp(location.href) || isDevApp(location.href)

if (allowed()) {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.__fg !== 'req' || !allowed()) return
    const { id, cmd, payload } = event.data
    ext.runtime
      .sendMessage({ type: 'fg-bridge', cmd, payload })
      .catch((e) => ({ ok: false, error: { code: 'EXTENSION_ERROR', message: String(e?.message || e) } }))
      .then((res) => window.postMessage({ __fg: 'res', id, res }, window.location.origin))
  })

  // Announce ourselves so the app can switch from "standalone" to "connected".
  document.documentElement.dataset.regimenExtension = ext.runtime.getManifest().version
  window.postMessage({ __fg: 'present', version: ext.runtime.getManifest().version }, window.location.origin)
}
