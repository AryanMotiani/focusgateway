// Builds the extension for Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc)
// and Firefox into dist/<target>, plus store-ready zips.
//   node build.mjs            build both targets (runs the web build first)
//   node build.mjs --skip-web reuse apps/web/dist-ext
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

const webOut = path.join(root, 'apps/web/dist-ext')
if (!skipWeb || !existsSync(webOut)) {
  console.log('> building web app for the extension')
  execSync('npx vite build --base ./ --outDir dist-ext --emptyOutDir', { cwd: path.join(root, 'apps/web'), stdio: 'inherit', env: { ...process.env, FG_TARGET: 'extension' } })
}

const baseManifest = {
  manifest_version: 3,
  name: 'FocusGateway',
  short_name: 'FocusGateway',
  version: pkg.version,
  description: 'Block distracting sites until your work is done. Tasks, habits and a lofi study room. Free and open source.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_title: 'FocusGateway', default_popup: 'popup.html', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  permissions: ['declarativeNetRequest', 'storage', 'unlimitedStorage', 'alarms', 'tabs', 'notifications'],
  host_permissions: ['<all_urls>'],
  incognito: 'spanning',
  content_scripts: [{ matches: ['http://*/*', 'https://*/*'], js: ['bridge.js'], run_at: 'document_start', all_frames: false }],
  web_accessible_resources: [{ resources: ['blocked.html', 'blocked.js', 'page.css', 'icons/*'], matches: ['<all_urls>'] }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
}

const targets = {
  chromium: { ...baseManifest, background: { service_worker: 'background.js' }, minimum_chrome_version: '120' },
  firefox: {
    ...baseManifest,
    background: { scripts: ['background.js'] },
    browser_specific_settings: { gecko: { id: 'focusgateway@focusgateway.app', strict_min_version: '128.0' } },
  },
}

for (const [name, manifest] of Object.entries(targets)) {
  const out = path.join(here, 'dist', name)
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
  await build({
    entryPoints: ['background', 'bridge', 'blocked', 'popup'].map((f) => path.join(here, 'src', f + '.js')),
    outdir: out,
    bundle: true,
    format: 'iife',
    target: ['chrome120', 'firefox128'],
    minify: true,
    legalComments: 'none',
  })
  for (const f of ['blocked.html', 'popup.html', 'page.css']) await cp(path.join(here, 'src', f), path.join(out, f))
  await cp(path.join(here, 'src/icons'), path.join(out, 'icons'), { recursive: true })
  await cp(webOut, path.join(out, 'app'), { recursive: true })
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  try {
    await rm(path.join(here, "dist", `focusgateway-${name}-${pkg.version}.zip`), { force: true })
    execSync(`cd "${out}" && zip -qr "../focusgateway-${name}-${pkg.version}.zip" .`)
  } catch {
    console.warn('zip not available; skipping archive for', name)
  }
  console.log('> built', path.relative(root, out))
}
