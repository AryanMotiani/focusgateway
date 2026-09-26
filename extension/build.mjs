// Builds the extension for Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc)
// and Firefox into dist/<target>, plus store-ready zips.
//   node build.mjs            build both targets (runs the web build first)
//   node build.mjs --skip-web reuse apps/web/dist-ext
// The extension opens the hosted app (package.json "homepage", or R_APP_URL) by default and
// trusts it for the bridge. dist/e2e-chromium is the same Chromium build with the local preview
// (R_E2E_APP_URL, default http://localhost:4173/) as the "hosted app", for the end-to-end tests
// only. It is never zipped or released.
import { build } from 'esbuild'
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const skipWeb = process.argv.includes('--skip-web')

/** The official hosted app: https://<user>.github.io/<repo>/ (lowercase, ends with /). */
function appUrlFrom(value, name) {
  let u
  try {
    u = new URL(String(value || '').toLowerCase())
  } catch {
    throw new Error(`${name} must be the hosted app's URL, like https://user.github.io/regimen/`)
  }
  if (!/^https?:$/.test(u.protocol) || u.search || u.hash) throw new Error(`${name} must be a plain http(s) URL`)
  if (!u.pathname.endsWith('/')) u.pathname += '/'
  return u
}
const APP_URL = appUrlFrom(process.env.R_APP_URL || pkg.homepage, process.env.R_APP_URL ? 'R_APP_URL' : 'package.json homepage')
const E2E_APP_URL = appUrlFrom(process.env.R_E2E_APP_URL || 'http://localhost:4173/', 'R_E2E_APP_URL')
// the bridge content script: only the hosted app's own path, plus localhost for development
// (match patterns can not hold a port, bridge.js and the background check the full URL)
const bridgeMatches = (u) => [...new Set([`${u.protocol}//${u.hostname}${u.pathname}*`, 'http://localhost/*', 'http://127.0.0.1/*'])]

const webOut = path.join(root, 'apps/web/dist-ext')
if (!skipWeb || !existsSync(webOut)) {
  console.log('> building web app for the extension')
  execSync('npx vite build --base ./ --outDir dist-ext --emptyOutDir', {
    cwd: path.join(root, 'apps/web'),
    stdio: 'inherit',
    env: { ...process.env, R_TARGET: 'extension' },
  })
}

const baseManifest = {
  manifest_version: 3,
  name: 'Regimen',
  short_name: 'Regimen',
  version: pkg.version,
  description: 'Block distracting sites until your work is done. Tasks, habits and a lofi study room. Free and open source.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: {
    default_title: 'Regimen',
    default_popup: 'popup.html',
    default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' },
  },
  permissions: ['declarativeNetRequest', 'storage', 'unlimitedStorage', 'alarms', 'tabs', 'notifications'],
  host_permissions: ['<all_urls>'],
  incognito: 'spanning',
  content_scripts: [{ matches: bridgeMatches(APP_URL), js: ['bridge.js'], run_at: 'document_start', all_frames: false }],
  web_accessible_resources: [{ resources: ['blocked.html', 'blocked.js', 'page.css', 'icons/*'], matches: ['<all_urls>'] }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
}

const chromium = { ...baseManifest, background: { service_worker: 'background.js' }, minimum_chrome_version: '120' }
const targets = {
  chromium,
  firefox: {
    ...baseManifest,
    background: { scripts: ['background.js'] },
    browser_specific_settings: {
      gecko: {
        id: 'regimen@aryanmotiani.github.io',
        strict_min_version: '128.0',
        // Firefox's built-in data consent: Regimen collects and transmits nothing.
        data_collection_permissions: { required: ['none'] },
      },
    },
  },
  'e2e-chromium': {
    ...chromium,
    content_scripts: [{ ...baseManifest.content_scripts[0], matches: bridgeMatches(E2E_APP_URL) }],
  },
}
const appUrlFor = (name) => (name === 'e2e-chromium' ? E2E_APP_URL : APP_URL)

for (const [name, manifest] of Object.entries(targets)) {
  const out = path.join(here, 'dist', name)
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
  await build({
    entryPoints: ['background', 'bridge', 'blocked', 'popup', 'grant'].map((f) => path.join(here, 'src', f + '.js')),
    outdir: out,
    bundle: true,
    format: 'iife',
    target: ['chrome120', 'firefox128'],
    minify: true,
    legalComments: 'none',
    define: { __R_APP_URL__: JSON.stringify(appUrlFor(name).href) },
  })
  for (const f of ['blocked.html', 'popup.html', 'grant.html', 'page.css']) await cp(path.join(here, 'src', f), path.join(out, f))
  await cp(path.join(here, 'src/icons'), path.join(out, 'icons'), { recursive: true })
  await cp(webOut, path.join(out, 'app'), { recursive: true })
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  if (name === 'e2e-chromium') {
    console.log('> built', path.relative(root, out), '(tests only, hosted app', appUrlFor(name).href + ')')
    continue
  }
  try {
    await rm(path.join(here, 'dist', `regimen-${name}-${pkg.version}.zip`), { force: true })
    execSync(`cd "${out}" && zip -qr "../regimen-${name}-${pkg.version}.zip" .`)
  } catch {
    console.warn('zip not available; skipping archive for', name)
  }
  console.log('> built', path.relative(root, out))
}
