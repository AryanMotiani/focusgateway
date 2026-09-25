// Cross-builds the Go lock agent into agent/dist as small static binaries with
// stable file names (the release workflow and the Install page rely on them).
//
//   npm run agent:build                          all six targets
//   npm run agent:build -- --target linux/amd64  just one (repeatable)
//
// Environment:
//   FG_VERSION  version to embed (default: package.json version)
//   FG_APP_URL  hosted web app for one-click pairing (default: package.json homepage)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const agentDir = path.join(root, 'agent')
const outDir = path.join(agentDir, 'dist')

export const TARGETS = ['windows/amd64', 'windows/arm64', 'darwin/amd64', 'darwin/arm64', 'linux/amd64', 'linux/arm64']
export const binaryName = (os, arch) => `focusgateway-agent-${os}-${arch}${os === 'windows' ? '.exe' : ''}`

const args = process.argv.slice(2)
const wanted = args.flatMap((a, i) => (a === '--target' ? [args[i + 1]] : []))
const targets = wanted.length ? wanted : TARGETS
for (const t of targets) if (!TARGETS.includes(t)) throw new Error(`Unknown target ${t}. Use one of ${TARGETS.join(', ')}`)

const version = process.env.FG_VERSION || pkg.version
const appUrl = (process.env.FG_APP_URL || pkg.homepage || '').toLowerCase()
if (!/^https?:\/\/.+\/$/.test(appUrl)) throw new Error(`FG_APP_URL must be a URL ending with "/", got "${appUrl}"`)

const go = process.env.GO || 'go'
const bi = 'focusgateway/agent/internal/buildinfo'
const ldflags = `-s -w -X ${bi}.Version=${version} -X ${bi}.AppURL=${appUrl}`

fs.mkdirSync(outDir, { recursive: true })
console.log(`lock agent ${version}, pairing opens ${appUrl}`)
for (const t of targets) {
  const [goos, goarch] = t.split('/')
  const out = path.join(outDir, binaryName(goos, goarch))
  execFileSync(go, ['build', '-trimpath', '-ldflags', ldflags, '-o', out, './cmd/focusgateway-agent'], {
    cwd: agentDir,
    stdio: 'inherit',
    env: { ...process.env, CGO_ENABLED: '0', GOOS: goos, GOARCH: goarch },
  })
  const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(2)
  console.log(`  ${t.padEnd(14)} ${mb} MB  ${path.relative(root, out)}`)
}
