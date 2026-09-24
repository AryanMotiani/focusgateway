// The long-running agent: a tiny HTTP API on 127.0.0.1 for the extension to push
// its rules to, and a loop that writes the current block set into the hosts file.
import http from 'node:http'
import crypto from 'node:crypto'
import { computeBlocks } from '../../packages/core/src/index.js'
import { applyDomains, readHosts, managedDomains } from './hosts.js'
import { mergeLocked, validateSnapshot, lockedUntil } from './lock.js'
import { PORT, readJson, writeJson, log } from './paths.js'

export const VERSION = '1.0.0'
const TICK_MS = 15_000
const CRASH_WINDOW_MS = 120_000
const CRASH_LIMIT = 4
const FAIL_OPEN_MS = 10 * 60_000

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

function readBody(req, cb) {
  let body = ''
  req.on('data', (c) => {
    body += c
    if (body.length > 5_000_000) req.destroy()
  })
  req.on('end', () => {
    try {
      cb(null, JSON.parse(body || '{}'))
    } catch {
      cb('Invalid JSON')
    }
  })
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function startDaemon() {
  const config = readJson('config.json')
  if (!config?.pairCode && !config?.secretHash) {
    log('No config.json with a pairing token. Run `focusgateway-agent install` first.')
    process.exit(1)
  }

  // Crash-loop protection: if we keep dying, fail OPEN (clear blocks) instead of
  // leaving the machine stuck with a broken block list.
  // Only unclean exits count: stopping or restarting the service normally does not.
  let snapshot = readJson('snapshot.json')
  const lastRun = readJson('run-state.json', { clean: true })
  const crashes = (readJson('crashes.json', []) || []).filter((t) => Date.now() - t < CRASH_WINDOW_MS)
  if (!lastRun.clean) crashes.push(Date.now())
  writeJson('crashes.json', crashes)
  writeJson('run-state.json', { clean: false, startedAt: Date.now() })
  const markClean = () => {
    try { writeJson('run-state.json', { clean: true }) } catch {}
    process.exit(0)
  }
  process.on('SIGTERM', markClean)
  process.on('SIGINT', markClean)
  let failOpenUntil = readJson('failopen.json', { until: 0 }).until
  // Never fail open while a no-failsafe rule is running: the user asked for no escape.
  if (crashes.length >= CRASH_LIMIT && !lockedUntil(snapshot, Date.now())) {
    failOpenUntil = Date.now() + FAIL_OPEN_MS
    writeJson('failopen.json', { until: failOpenUntil })
    log(`Agent restarted ${starts.length} times in 2 minutes. Clearing blocks for 10 minutes (fail-open). Check agent.log.`)
    try { applyDomains([]) } catch {}
  }

  let lastDomains = null

  function tick() {
    try {
      if (Date.now() < failOpenUntil) return
      const domains = snapshot ? computeBlocks(snapshot, Date.now()).domains : []
      const key = domains.join(',')
      // re-check the file each tick so manual edits to our section get undone
      const onDisk = managedDomains(readHosts()).length
      if (key !== lastDomains || (domains.length && !onDisk)) {
        const changed = applyDomains(domains)
        if (changed) log(`hosts updated: ${domains.length} domain(s) blocked`)
        lastDomains = key
      }
    } catch (e) {
      log('tick failed:', e.stack || e.message)
    }
  }

  const server = http.createServer((req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    // Only loopback, and never answer browser pages (they send an Origin that isn't an extension).
    const origin = req.headers.origin || ''
    if (origin && !/^(chrome|moz)-extension:\/\//.test(origin)) return send(403, { error: 'Forbidden origin' })
    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { ok: true, version: VERSION, blocking: lastDomains ? lastDomains.split(',').filter(Boolean).length : 0, failOpen: Date.now() < failOpenUntil })
    }
    if (req.method === 'POST' && req.url === '/v1/pair') {
      // One-time exchange: the pairing code the user saw becomes useless after this.
      // The extension gets a secret the user never sees.
      if (!origin) return send(403, { error: 'Pair from the FocusGateway extension.' })
      return readBody(req, (err, body) => {
        if (err) return send(400, { error: err })
        const cfg = readJson('config.json') || {}
        if (!cfg.pairCode) return send(409, { error: 'Already paired. Run `focusgateway-agent pair` as admin for a new code.' })
        if (!safeEqual(String(body.code || '').toUpperCase().trim(), cfg.pairCode)) return send(401, { error: 'Wrong pairing code' })
        const secret = crypto.randomBytes(32).toString('hex')
        writeJson('config.json', { ...cfg, pairCode: null, secretHash: sha256(secret), pairedAt: new Date().toISOString() })
        log('paired with extension', origin)
        send(200, { ok: true, secret })
      })
    }
    if (req.method === 'POST' && req.url === '/v1/sync') {
      const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      const cfg = readJson('config.json') || {}
      if (!cfg.secretHash || !safeEqual(sha256(auth), cfg.secretHash)) return send(401, { error: 'Not paired. Enter the pairing code again.' })
      let body = ''
      req.on('data', (c) => {
        body += c
        if (body.length > 5_000_000) req.destroy()
      })
      req.on('end', () => {
        let incoming
        try {
          incoming = JSON.parse(body)
        } catch {
          return send(400, { error: 'Invalid JSON' })
        }
        const problem = validateSnapshot(incoming)
        if (problem) return send(400, { error: problem })
        if (snapshot?.sentAt && incoming.sentAt && incoming.sentAt < snapshot.sentAt) return send(200, { ok: true, stale: true })
        const { snapshot: merged, kept } = mergeLocked(snapshot, incoming, Date.now())
        snapshot = merged
        writeJson('snapshot.json', snapshot)
        tick()
        if (kept.length) log(`kept ${kept.length} locked rule(s) that the extension tried to remove or weaken`)
        send(200, { ok: true, kept, lockedUntil: lockedUntil(snapshot, Date.now()) })
      })
      return
    }
    send(404, { error: 'Not found' })
  })
  server.listen(PORT, '127.0.0.1', () => log(`FocusGateway agent ${VERSION} listening on 127.0.0.1:${PORT}`))
  server.on('error', (e) => {
    log('server error:', e.message)
    process.exit(1)
  })

  tick()
  setInterval(tick, TICK_MS)
  // Clear the crash counter once we've been healthy for a while.
  setTimeout(() => writeJson('crashes.json', []), CRASH_WINDOW_MS)
  // Note: we intentionally do NOT clear the hosts file on SIGTERM. Stopping the
  // service must not be a way around a block. `uninstall` and `recover` clear it.
}
