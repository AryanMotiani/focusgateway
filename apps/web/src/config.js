// Edit these after you publish. Everything else works without them.
export const REPO_URL = 'https://github.com/AryanMotiani/focusgateway'
export const RELEASES_URL = REPO_URL + '/releases/latest'

// Store listings. Leave '' until the listing is live: the Install page then shows
// the manual install steps for that browser instead of a store button.
export const CHROME_STORE_URL = ''
export const EDGE_STORE_URL = ''
export const FIREFOX_ADDONS_URL = ''

// Privacy policy (apps/web/public/privacy.html). Store listings link here too.
export const PRIVACY_URL = './privacy.html'

// Plain-language guide for installing the lock agent, including the
// "unknown publisher" warnings of unsigned downloads.
export const AGENT_GUIDE_URL = REPO_URL + '/blob/master/docs/INSTALL-AGENT.md'

/** Link to a file of the newest GitHub release. The release workflow uses these stable names. */
export const download = (asset) => `${REPO_URL}/releases/latest/download/${asset}`

export const ASSETS = {
  chromiumZip: 'focusgateway-chromium.zip',
  firefoxZip: 'focusgateway-firefox.zip',
  windowsSetup: 'FocusGateway-Setup.exe',
  macPkg: 'FocusGateway.pkg',
  debAmd64: 'focusgateway-agent_amd64.deb',
  debArm64: 'focusgateway-agent_arm64.deb',
  rpmX64: 'focusgateway-agent.x86_64.rpm',
  rpmArm64: 'focusgateway-agent.aarch64.rpm',
  installSh: 'install.sh',
}
