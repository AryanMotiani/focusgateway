// Copies the files the Go lock agent embeds from the rest of the repo into
// agent/internal/assets, so the agent binary is a single file:
//   - bundles.json       from packages/core/src/bundles.js (the curated site list)
//   - TROUBLESHOOTING.md written next to the installed agent for offline help
//   - LICENSE
//
//   npm run agent:bundles            write the files
//   node scripts/sync-agent-bundles.mjs --check   exit 1 if they are out of date
//
// A unit test (agent/test/assets-sync.test.js) runs the same check in CI, so a
// pull request that edits bundles.js without running this fails with a clear message.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'agent/internal/assets')

export async function expectedAssets() {
  const { default: data } = await import(pathToFileURL(path.join(root, 'packages/core/src/bundles.js')).href)
  return {
    'bundles.json': JSON.stringify({ version: data.version, bundles: data.bundles }, null, 2) + '\n',
    'TROUBLESHOOTING.md': fs.readFileSync(path.join(root, 'TROUBLESHOOTING.md'), 'utf8'),
    LICENSE: fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'),
  }
}

export async function staleAssets() {
  const stale = []
  for (const [name, content] of Object.entries(await expectedAssets())) {
    const f = path.join(out, name)
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== content) stale.push(name)
  }
  return stale
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const stale = await staleAssets()
    if (stale.length) {
      console.error(`agent/internal/assets is out of date (${stale.join(', ')}). Run: npm run agent:bundles`)
      process.exit(1)
    }
    console.log('agent assets are up to date')
  } else {
    fs.mkdirSync(out, { recursive: true })
    for (const [name, content] of Object.entries(await expectedAssets())) {
      fs.writeFileSync(path.join(out, name), content)
      console.log('wrote', path.relative(root, path.join(out, name)))
    }
  }
}
