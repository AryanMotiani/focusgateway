#!/usr/bin/env node
// FocusGateway lock agent CLI. Zero dependencies: needs only Node.js 18+.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import readline from 'node:readline/promises'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { startDaemon, VERSION } from '../src/daemon.js'
import { applyDomains, readHosts, managedDomains, hostsPath } from '../src/hosts.js'
import { applyPolicies, removePolicies } from '../src/policies.js'
import { copyProgram, installService, uninstallService, isAdmin } from '../src/service.js'
import { lockedUntil } from '../src/lock.js'
import { PORT, dataDir, programDir, readJson, writeJson, log } from '../src/paths.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const [cmd = 'help', ...rest] = process.argv.slice(2)
const flag = (name) => rest.includes('--' + name)
const option = (name) => {
  const i = rest.indexOf('--' + name)
  return i >= 0 ? rest[i + 1] : undefined
}

const c = { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` }

function banner() {
  console.log(c.b(`
  FocusGateway lock agent ${VERSION}
  Blocks your distractions in every browser and app on this computer.
`))
}

function needAdmin() {
  if (isAdmin()) return
  console.error(c.r('This needs administrator rights.'))
  console.error(process.platform === 'win32' ? 'Open PowerShell with "Run as administrator" and try again.' : 'Run it again with sudo.')
  process.exit(1)
}

function health(timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: '/health', timeout }, (res) => {
      let b = ''
      res.on('data', (d) => (b += d))
      res.on('end', () => {
        try { resolve(JSON.parse(b)) } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

/** Data folder: admins and the service only (config holds the pairing secret hash). */
function lockDownDataDir() {
  if (process.platform === 'win32') {
    try {
      execFileSync('icacls', [dataDir(), '/inheritance:r', '/grant:r', '*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F'], { stdio: 'ignore' })
    } catch {}
  } else {
    try { fs.chmodSync(dataDir(), 0o700) } catch {}
  }
}

/** Copies the running Node.js binary somewhere only admins can write, so the
 *  service never runs a user-writable binary (nvm, Homebrew) as root/SYSTEM. */
function copyNode() {
  const dest = path.join(programDir(), 'runtime', process.platform === 'win32' ? 'node.exe' : 'node')
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(process.execPath, dest)
    fs.chmodSync(dest, 0o755)
    return dest
  } catch (e) {
    console.log(c.y('    Could not copy Node.js (' + e.message + '), using ' + process.execPath))
    return process.execPath
  }
}

function pairingCode() {
  // 5 groups of 4 from an unambiguous alphabet (~100 bits)
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return [...crypto.randomBytes(20)].map((b) => A[b % A.length]).join('').match(/.{4}/g).join('-')
}

async function install() {
  needAdmin()
  banner()
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 })
  // one-time backup of the original hosts file (never overwritten)
  const bak = path.join(dataDir(), 'hosts.original.bak')
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, readHosts())
  const existing = readJson('config.json') || {}
  const config = {
    pairCode: existing.secretHash ? existing.pairCode || null : existing.pairCode || pairingCode(),
    secretHash: existing.secretHash || null,
    strict: flag('strict'),
    chromeExtensionId: option('chrome-extension-id') || existing.chromeExtensionId || '',
    firefoxXpiUrl: option('firefox-xpi') || existing.firefoxXpiUrl || '',
    installedAt: existing.installedAt || new Date().toISOString(),
  }
  writeJson('config.json', config)
  lockDownDataDir()
  try { uninstallService() } catch {} // reinstall: stop the old copy cleanly first
  console.log('1/4 Copying program files to', programDir())
  copyProgram(repoRoot)
  const nodePath = copyNode()
  console.log('2/4 Setting browser policies (Secure DNS off, no private windows' + (config.strict ? ', extensions page locked' : '') + ')')
  const forceInstall = config.chromeExtensionId ? [`${config.chromeExtensionId};https://clients2.google.com/service/update2/crx`] : []
  const written = applyPolicies({ strict: config.strict, forceInstall, firefoxXpiUrl: config.firefoxXpiUrl })
  console.log(c.d(`    ${written.length} policy entries written`))
  console.log('3/4 Registering the background service (starts at boot, restarts on crash)')
  installService(nodePath)
  console.log('4/4 Checking it runs…')
  let h = null
  for (let i = 0; i < 10 && !h; i++) {
    await new Promise((r) => setTimeout(r, 700))
    h = await health()
  }
  console.log(h ? c.g('    Agent is running.') : c.y('    The agent did not answer yet. It may need a moment, check `focusgateway-agent status`.'))
  console.log(`
${config.pairCode ? `${c.b('Pairing code:')}  ${c.g(c.b(config.pairCode))}

Open FocusGateway, Settings, Lock agent. Paste this code and click Connect.
It works once. After pairing, only the extension holds the connection secret.` : 'Already paired with your extension. Run `focusgateway-agent pair` for a new code.'}
Restart your browsers so the new policies apply.

Emergency recovery if the agent ever breaks: ${c.b(process.platform === 'win32' ? 'Start Menu → FocusGateway Emergency Recovery' : process.platform === 'darwin' ? 'Applications → FocusGateway Emergency Recovery' : 'sudo focusgateway-agent recover')}
`)
}

async function uninstall() {
  needAdmin()
  const snapshot = readJson('snapshot.json')
  const until = lockedUntil(snapshot, Date.now())
  if (until) {
    console.error(c.r(`A no-failsafe block is running until ${new Date(until).toLocaleString()}.`))
    console.error('You chose no escape hatch for this one. Uninstall after it ends.')
    process.exit(2)
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Type "uninstall" to remove the FocusGateway agent: ')
  if (answer.trim().toLowerCase() !== 'uninstall') {
    rl.close()
    return console.log('Cancelled.')
  }
  let purge = false
  if (flag('purge')) {
    const p = await rl.question(c.r('Also permanently delete the agent data (pairing code, backups, logs)? Type "delete my data": '))
    purge = p.trim().toLowerCase() === 'delete my data'
  }
  rl.close()
  uninstallService()
  const n = removePolicies()
  applyDomains([])
  fs.rmSync(programDir(), { recursive: true, force: true })
  if (purge) fs.rmSync(dataDir(), { recursive: true, force: true })
  console.log(c.g(`Removed. ${n} policy entries reverted, hosts file cleaned.`) + (purge ? '' : c.d(`\nAgent data kept in ${dataDir()}`)))
}

async function recover() {
  needAdmin()
  const h = await health()
  if (h?.ok && !h.failOpen) {
    console.log(c.y('The agent is running normally.'))
    console.log('This tool is for when the agent is broken, not for getting around a block.')
    console.log('Use Failsafe in the app if your rule allows it.')
    process.exit(3)
  }
  const before = managedDomains(readHosts()).length
  applyDomains([])
  log(`recover: cleared ${before} managed hosts entries (agent unreachable)`)
  console.log(c.g(`Cleared ${before} blocked host entries from ${hostsPath()}.`))
  console.log('If the agent keeps failing, reinstall it or see TROUBLESHOOTING.md.')
}

async function status() {
  const h = await health()
  console.log(h ? c.g(`Agent running (v${h.version}), ${h.blocking} domain(s) blocked${h.failOpen ? ', FAIL-OPEN after crashes' : ''}`) : c.r('Agent not reachable on 127.0.0.1:' + PORT))
  const config = readJson('config.json')
  if (config) console.log(config.pairCode ? `Pairing code: ${c.b(config.pairCode)}` : `Paired with the extension${config.pairedAt ? ' on ' + new Date(config.pairedAt).toLocaleString() : ''}`, config.strict ? c.d('(strict mode)') : '')
  else if (!isAdmin()) console.log(c.d('Run with admin rights to see the pairing code.'))
  const snap = readJson('snapshot.json')
  if (snap) console.log(`Last sync: ${snap.sentAt ? new Date(snap.sentAt).toLocaleString() : 'unknown'}, ${snap.rules.length} rule(s)`)
  const d = managedDomains(readHosts())
  if (d.length) console.log('Blocked right now:', d.filter((x) => !x.startsWith('www.')).join(', '))
}

const HELP = `FocusGateway lock agent ${VERSION}

Usage: focusgateway-agent <command>

  install [--strict] [--chrome-extension-id ID] [--firefox-xpi URL]
            Install as a background service (admin). Prints the pairing code.
            --strict  also lock the extensions page, flags and developer tools
  status    Show whether the agent runs, pairing state and what is blocked
  pair      Make a new one-time pairing code (admin), e.g. after reinstalling the extension
  recover   Emergency: clear blocks if the agent is broken (refused while healthy)
  policies  Re-apply browser policies (after installing a new browser)
  uninstall [--purge]  Remove the agent (refused while a no-failsafe block runs)
  run       Run in the foreground (used by the service)
`

switch (cmd) {
  case 'install': await install(); break
  case 'uninstall': await uninstall(); break
  case 'recover': await recover(); break
  case 'status': await status(); break
  case 'policies': {
    needAdmin()
    const cfg = readJson('config.json') || {}
    const n = applyPolicies({ strict: cfg.strict, forceInstall: cfg.chromeExtensionId ? [`${cfg.chromeExtensionId};https://clients2.google.com/service/update2/crx`] : [], firefoxXpiUrl: cfg.firefoxXpiUrl }).length
    console.log(`${n} policy entries written.`)
    break
  }
  case 'pair': {
    needAdmin()
    const cfg = readJson('config.json') || {}
    cfg.pairCode = pairingCode()
    writeJson('config.json', cfg)
    console.log(`New pairing code: ${c.b(c.g(cfg.pairCode))}\nPaste it in FocusGateway, Settings, Lock agent.`)
    break
  }
  case 'run': startDaemon(); break
  default: console.log(HELP)
}
