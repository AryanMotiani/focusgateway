// Lets a hosted copy of the FocusGateway web app talk to this extension.
// The background only answers origins the user explicitly approved.
const ext = globalThis.browser ?? globalThis.chrome

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.__fg !== 'req') return
  const { id, cmd, payload } = event.data
  ext.runtime
    .sendMessage({ type: 'fg-bridge', cmd, payload })
    .catch((e) => ({ ok: false, error: { code: 'EXTENSION_ERROR', message: String(e?.message || e) } }))
    .then((res) => window.postMessage({ __fg: 'res', id, res }, window.location.origin))
})

// Announce ourselves so the app can switch from "standalone" to "connected".
document.documentElement.dataset.focusgatewayExtension = ext.runtime.getManifest().version
window.postMessage({ __fg: 'present', version: ext.runtime.getManifest().version }, window.location.origin)
