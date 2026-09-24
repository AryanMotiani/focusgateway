// Hosts-file layer. FocusGateway only ever touches the lines between its markers,
// writes atomically (temp file + rename) so a crash can't leave a half-written
// file, and never edits anything else in the file.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

export const MARKER_START = '# >>> FOCUSGATEWAY-MANAGED-START (do not edit; run `focusgateway-agent recover` if stuck)'
export const MARKER_END = '# <<< FOCUSGATEWAY-MANAGED-END'

export function hostsPath(platform = process.platform) {
  if (process.env.FOCUSGATEWAY_HOSTS) return process.env.FOCUSGATEWAY_HOSTS
  if (platform === 'win32') return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
  return '/etc/hosts'
}

/** Expands blocked domains into the host names the hosts file needs (no wildcards there). */
export function expandDomains(domains) {
  const out = new Set()
  for (const d of domains) {
    out.add(d)
    if (!d.startsWith('www.')) out.add('www.' + d)
  }
  return [...out].sort()
}

/** Removes our managed block, leaving everything else intact. */
export function stripManaged(content) {
  const lines = content.split(/\r?\n/)
  const out = []
  let inside = false
  for (const line of lines) {
    if (line.startsWith('# >>> FOCUSGATEWAY-MANAGED-START')) inside = true
    else if (line.startsWith(MARKER_END)) inside = false
    else if (!inside) out.push(line)
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

/** Pure: returns the new hosts file content for this set of blocked domains. */
export function renderHosts(content, domains, eol = '\n') {
  const base = stripManaged(content)
  if (!domains.length) return base.join(eol) + eol
  const hosts = expandDomains(domains)
  const managed = [MARKER_START, ...hosts.flatMap((h) => [`0.0.0.0 ${h}`, `:: ${h}`]), MARKER_END]
  return [...base, '', ...managed].join(eol) + eol
}

export function managedDomains(content) {
  const lines = content.split(/\r?\n/)
  const out = new Set()
  let inside = false
  for (const line of lines) {
    if (line.startsWith('# >>> FOCUSGATEWAY-MANAGED-START')) inside = true
    else if (line.startsWith(MARKER_END)) inside = false
    else if (inside) {
      const host = line.trim().split(/\s+/)[1]
      if (host) out.add(host)
    }
  }
  return [...out].sort()
}

export function readHosts(file = hostsPath()) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return ''
    throw e
  }
}

export function writeHostsAtomic(content, file = hostsPath()) {
  const tmp = file + '.focusgateway-tmp'
  fs.writeFileSync(tmp, content, { mode: 0o644 })
  try {
    fs.renameSync(tmp, file)
  } catch (e) {
    // Windows can refuse to replace a file that antivirus has open; fall back to in-place write.
    fs.writeFileSync(file, content)
    fs.rmSync(tmp, { force: true })
  }
}

/** Applies the domain set. Returns true if the file changed. */
export function applyDomains(domains, file = hostsPath()) {
  const current = readHosts(file)
  const eol = process.platform === 'win32' ? '\r\n' : '\n'
  const next = renderHosts(current, domains, eol)
  if (next === current) return false
  writeHostsAtomic(next, file)
  flushDns()
  return true
}

export function flushDns() {
  const cmds = {
    win32: ['ipconfig /flushdns'],
    darwin: ['dscacheutil -flushcache', 'killall -HUP mDNSResponder'],
    linux: ['resolvectl flush-caches', 'systemd-resolve --flush-caches', 'nscd -i hosts'],
  }[process.platform] || []
  for (const c of cmds) {
    try {
      execSync(c, { stdio: 'ignore', timeout: 5000 })
    } catch {}
  }
}
