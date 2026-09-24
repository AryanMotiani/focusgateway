// Browser policies: the officially supported, admin-level way to configure browsers.
// They close the usual escape routes around a hosts-file blocker:
//   - Secure DNS / DNS-over-HTTPS (would skip the hosts file)
//   - private / incognito / guest windows and new profiles (no extension there)
//   - (strict) the extensions page and developer tools
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readJson, writeJson, log } from './paths.js'

export function chromiumPolicy({ strict = false, forceInstall = [] } = {}) {
  const p = {
    DnsOverHttpsMode: 'off',
    IncognitoModeAvailability: 1,
    BrowserGuestModeEnabled: false,
    BrowserAddPersonEnabled: false,
  }
  if (strict) {
    p.URLBlocklist = ['chrome://extensions', 'edge://extensions', 'brave://extensions', 'chrome://flags', 'edge://flags', 'brave://flags']
    p.DeveloperToolsAvailability = 2
  }
  if (forceInstall.length) p.ExtensionInstallForcelist = forceInstall
  return p
}

export function firefoxPolicy({ strict = false, firefoxXpiUrl = '' } = {}) {
  const p = {
    DNSOverHTTPS: { Enabled: false, Locked: true },
    DisablePrivateBrowsing: true,
  }
  if (strict) {
    p.BlockAboutAddons = true
    p.BlockAboutConfig = true
    p.BlockAboutProfiles = true
    p.DisableDeveloperTools = true
  }
  if (firefoxXpiUrl)
    p.ExtensionSettings = { 'focusgateway@focusgateway.app': { installation_mode: 'force_installed', install_url: firefoxXpiUrl } }
  return p
}

const CHROMIUM = {
  win32: [
    'SOFTWARE\\Policies\\Google\\Chrome',
    'SOFTWARE\\Policies\\Microsoft\\Edge',
    'SOFTWARE\\Policies\\BraveSoftware\\Brave',
    'SOFTWARE\\Policies\\Chromium',
  ],
  darwin: ['com.google.Chrome', 'com.microsoft.Edge', 'com.brave.Browser', 'org.chromium.Chromium'],
  linux: [
    '/etc/opt/chrome/policies/managed',
    '/etc/chromium/policies/managed',
    '/etc/chromium-browser/policies/managed',
    '/etc/brave/policies/managed',
    '/etc/opt/edge/policies/managed',
  ],
}
const FIREFOX_DIRS = {
  win32: [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Mozilla Firefox', 'distribution'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Mozilla Firefox', 'distribution'),
  ],
  darwin: ['/Applications/Firefox.app/Contents/Resources/distribution'],
  linux: ['/etc/firefox/policies', '/usr/lib/firefox/distribution', '/usr/lib64/firefox/distribution'],
}

// ---- Windows registry
function reg(args) {
  execFileSync('reg', args, { stdio: 'ignore' })
}
function writeRegistry(key, policy) {
  const written = []
  for (const [name, value] of Object.entries(policy)) {
    if (Array.isArray(value)) {
      const sub = `HKLM\\${key}\\${name}`
      try {
        reg(['delete', sub, '/f'])
      } catch {}
      value.forEach((v, i) => reg(['add', sub, '/v', String(i + 1), '/t', 'REG_SZ', '/d', v, '/f']))
      written.push({ kind: 'regkey', key: sub })
    } else {
      const type = typeof value === 'string' ? 'REG_SZ' : 'REG_DWORD'
      const data = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
      reg(['add', `HKLM\\${key}`, '/v', name, '/t', type, '/d', data, '/f'])
      written.push({ kind: 'regvalue', key: `HKLM\\${key}`, name })
    }
  }
  return written
}

// ---- macOS managed preferences plist
function plistValue(v, indent) {
  const pad = '  '.repeat(indent)
  if (typeof v === 'boolean') return `${pad}<${v}/>`
  if (typeof v === 'number') return `${pad}<integer>${v}</integer>`
  if (typeof v === 'string') return `${pad}<string>${v.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</string>`
  if (Array.isArray(v)) return `${pad}<array>\n${v.map((x) => plistValue(x, indent + 1)).join('\n')}\n${pad}</array>`
  return `${pad}<dict>\n${Object.entries(v)
    .map(([k, x]) => `${pad}  <key>${k}</key>\n${plistValue(x, indent + 1)}`)
    .join('\n')}\n${pad}</dict>`
}
export function toPlist(obj) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n${plistValue(obj, 0)}\n</plist>\n`
}

function backupAndWrite(f, content, written) {
  if (fs.existsSync(f) && !fs.existsSync(f + '.focusgateway-backup')) fs.copyFileSync(f, f + '.focusgateway-backup')
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, content)
  written.push({ kind: 'file', path: f })
}

export function applyPolicies(opts) {
  const written = []
  const chrome = chromiumPolicy(opts)
  const ff = firefoxPolicy(opts)
  const plat = process.platform
  for (const target of CHROMIUM[plat] || []) {
    try {
      if (plat === 'win32') written.push(...writeRegistry(target, chrome))
      else if (plat === 'darwin') backupAndWrite(`/Library/Managed Preferences/${target}.plist`, toPlist(chrome), written)
      else backupAndWrite(path.join(target, 'focusgateway.json'), JSON.stringify(chrome, null, 2), written)
    } catch (e) {
      log('policy write failed for', target, e.message)
    }
  }
  for (const dir of FIREFOX_DIRS[plat] || []) {
    // Only where Firefox is actually installed (Linux /etc/firefox/policies always works)
    if (plat !== 'linux' && !fs.existsSync(path.dirname(dir))) continue
    if (plat === 'linux' && dir !== '/etc/firefox/policies' && !fs.existsSync(path.dirname(dir))) continue
    try {
      const f = path.join(dir, 'policies.json')
      let existing = {}
      try {
        existing = JSON.parse(fs.readFileSync(f, 'utf8'))
      } catch {}
      const merged = { ...existing, policies: { ...(existing.policies || {}), ...ff } }
      backupAndWrite(f, JSON.stringify(merged, null, 2), written)
    } catch (e) {
      log('firefox policy write failed for', dir, e.message)
    }
  }
  writeJson('policies-written.json', written)
  return written
}

export function removePolicies() {
  const written = readJson('policies-written.json', [])
  for (const w of written) {
    try {
      if (w.kind === 'regkey') reg(['delete', w.key, '/f'])
      else if (w.kind === 'regvalue') reg(['delete', w.key, '/v', w.name, '/f'])
      else if (w.kind === 'file') {
        if (fs.existsSync(w.path + '.focusgateway-backup')) fs.renameSync(w.path + '.focusgateway-backup', w.path)
        else fs.rmSync(w.path, { force: true })
      }
    } catch {}
  }
  writeJson('policies-written.json', [])
  return written.length
}
