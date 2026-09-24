import path from 'node:path'
import fs from 'node:fs'

export const PORT = 47621
export const SERVICE_NAME = 'FocusGatewayAgent'

/** Where the agent's program files are copied to on install. */
export function programDir() {
  if (process.platform === 'win32') return path.join(process.env.ProgramFiles || 'C:\\Program Files', 'FocusGateway')
  if (process.platform === 'darwin') return '/Library/Application Support/FocusGateway/app'
  return '/opt/focusgateway'
}

/** Root-owned data: config (pairing token), last snapshot, hosts backup. Survives uninstall. */
export function dataDir() {
  if (process.env.FOCUSGATEWAY_DATA) return process.env.FOCUSGATEWAY_DATA
  if (process.platform === 'win32') return path.join(process.env.ProgramData || 'C:\\ProgramData', 'FocusGateway', 'data')
  if (process.platform === 'darwin') return '/Library/Application Support/FocusGateway/data'
  return '/var/lib/focusgateway'
}

export const file = (name) => path.join(dataDir(), name)

export function readJson(name, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(name, value) {
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 })
  const f = file(name)
  fs.writeFileSync(f + '.tmp', JSON.stringify(value, null, 2), { mode: 0o600 })
  fs.renameSync(f + '.tmp', f)
}

export function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`
  console.log(line)
  try {
    fs.mkdirSync(dataDir(), { recursive: true })
    const f = file('agent.log')
    if (fs.existsSync(f) && fs.statSync(f).size > 1_000_000) fs.renameSync(f, f + '.1')
    fs.appendFileSync(f, line + '\n')
  } catch {}
}
