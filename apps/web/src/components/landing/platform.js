// Which browser and computer is the visitor on, and which button gets them the extension
// and the lock agent. Same detection as views/Install.vue, trimmed to what the landing needs.
import { CHROME_STORE_URL, EDGE_STORE_URL, FIREFOX_ADDONS_URL } from '../../config.js'

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent

function detectBrowser() {
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Edg\//.test(ua)) return 'edge'
  if (/OPR\/|Opera/.test(ua)) return 'opera'
  if (typeof navigator !== 'undefined' && navigator.brave) return 'brave'
  if (/Vivaldi/.test(ua)) return 'vivaldi'
  if (/Chrome\/|Chromium\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua)) return 'safari'
  return 'other'
}
function detectOs() {
  const p = (typeof navigator === 'undefined' ? '' : navigator.userAgentData?.platform || navigator.platform || '') + ' ' + ua
  if (/Android|iPhone|iPad|iPod/i.test(p)) return 'mobile'
  if (/CrOS/i.test(p)) return 'chromeos'
  if (/Win/i.test(p)) return 'win'
  if (/Mac/i.test(p)) return 'mac'
  if (/Linux|X11/i.test(p)) return 'linux'
  return 'other'
}

export const browser = detectBrowser()
export const os = detectOs()

const NAMES = {
  firefox: 'Firefox',
  edge: 'Edge',
  opera: 'Opera',
  brave: 'Brave',
  vivaldi: 'Vivaldi',
  chrome: 'Chrome',
  safari: 'Safari',
  other: 'your browser',
}
export const browserName = NAMES[browser]
export const osName = { win: 'Windows', mac: 'macOS', linux: 'Linux' }[os] || ''

/**
 * The extension button for this browser: the store listing when it is live, otherwise the
 * Install page, which walks through the manual steps. `external` tells the template to open a new tab.
 */
export function extensionLink() {
  if (browser === 'firefox' && FIREFOX_ADDONS_URL) return { label: 'Add to Firefox', href: FIREFOX_ADDONS_URL, external: true }
  if (browser === 'edge' && EDGE_STORE_URL) return { label: 'Get it for Edge', href: EDGE_STORE_URL, external: true }
  if (['chrome', 'brave', 'opera', 'vivaldi', 'other'].includes(browser) && CHROME_STORE_URL)
    return { label: `Add to ${browserName}`, href: CHROME_STORE_URL, external: true }
  if (browser === 'safari') return { label: 'Safari? Use the lock agent', to: '/install', external: false }
  return { label: `Add to ${browserName}`, to: '/install', external: false }
}

export function agentLink() {
  if (osName) return { label: `Lock agent for ${osName}`, to: '/install' }
  return { label: 'Lock agent for computers', to: '/install' }
}
