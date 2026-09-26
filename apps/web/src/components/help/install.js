// The one-click way to get the extension in this browser, shared by every "blocking is off"
// message (dialogs, the room notice, the status checklist).
import { detectBrowser } from '../../lib/api.js'
import { ASSETS, CHROME_STORE_URL, EDGE_STORE_URL, FIREFOX_ADDONS_URL, download } from '../../config.js'

export const browser = detectBrowser()
const NAMES = { chrome: 'Chrome', edge: 'Edge', brave: 'Brave', opera: 'Opera', firefox: 'Firefox', safari: 'Safari' }
export const browserName = NAMES[browser] || 'this browser'

/** Phones and Safari can not run the extension at all. */
export const canInstall = !['safari', 'phone'].includes(browser)

/**
 * { label, url, store } for this browser: a store page when its listing is live, else the zip
 * (store: false, the Install page has the steps). null on phones and Safari.
 */
export function installTarget() {
  if (browser === 'firefox')
    return FIREFOX_ADDONS_URL
      ? { label: 'Add to Firefox', url: FIREFOX_ADDONS_URL, store: true }
      : { label: 'Download for Firefox', url: download(ASSETS.firefoxZip), store: false }
  if (browser === 'edge' && EDGE_STORE_URL) return { label: 'Get it for Edge', url: EDGE_STORE_URL, store: true }
  if (CHROME_STORE_URL && ['chrome', 'brave', 'opera', 'other'].includes(browser))
    return { label: `Add to ${browserName}`, url: CHROME_STORE_URL, store: true }
  if (!canInstall) return null
  return { label: `Download for ${browserName}`, url: download(ASSETS.chromiumZip), store: false }
}

/** Short, honest words for phones, used wherever blocking is explained. */
export const PHONE_NOTE =
  'Site blocking uses a browser extension, and those run on computers. Firefox for Android runs some extensions, but Regimen does not support it yet. Tasks, habits and the room work here.'
