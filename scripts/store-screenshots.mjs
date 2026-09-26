// Store screenshots: builds a believable demo setup (a few months of tasks,
// habits and focus sessions), loads the built extension into Chromium, hands it
// the demo setup and saves 1280x800 screenshots of the app inside the extension,
// plus a 440x280 promo tile, to docs/store/screenshots.
// Run it again whenever the UI changes:
//
//   npm run store:screenshots            (builds the extension first if needed)
//   npm run store:screenshots -- --build (always rebuild)
//
// Needs Playwright's Chromium: npx playwright install chromium
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createBackend } from '../packages/core/src/index.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXT = path.join(root, 'extension/dist/chromium')
const out = path.join(root, 'docs/store/screenshots')

// ------------------------------------------------------------ demo state
async function seed({ mode = 'game', theme = 'light' } = {}) {
  let saved = null
  const backend = createBackend({
    storage: { load: async () => saved, save: async (s) => (saved = structuredClone(s)) },
    hashIterations: 1000,
  })
  const run = async (cmd, payload) => (await backend.dispatch(cmd, payload)).data
  await run('setup.pin', { pin: 'demo-pin-2468' })
  for (const step of ['recoverySaved', 'emergencyHelp', 'dohReviewed']) await run('setup.step', { step }).catch(() => {})

  const DAY = 864e5
  const HOUR = 36e5
  const now = Date.now()
  const minutes = new Date().getHours() * 60 + new Date().getMinutes()
  const everyDay = [1, 2, 3, 4, 5, 6, 7]
  await run('rules.create', {
    name: 'Study hours',
    mode: 'hard',
    siteIds: ['youtube', 'instagram', 'tiktok'],
    days: everyDay,
    start: (minutes + 1440 - 30) % 1440,
    end: (minutes + 90) % 1440,
  }).catch(async () =>
    run('rules.create', { name: 'Study hours', mode: 'hard', siteIds: ['youtube'], days: everyDay, start: 540, end: 1020 }),
  )
  const homework = await run('tasks.create', { title: 'Chemistry homework', priority: 'high', deadline: now + 5 * HOUR })
  await run('rules.create', {
    name: 'Evening homework',
    mode: 'gated',
    siteIds: ['reddit', 'netflix', 'x-twitter'],
    days: [1, 2, 3, 4, 5],
    start: 1140,
    end: 1260,
    taskIds: [homework.id],
  })

  const s = saved
  s.onboarding.completed = true
  for (const k of Object.keys(s.onboarding.steps || {})) s.onboarding.steps[k] = true
  s.settings.uiMode = mode
  s.settings.theme = theme

  // Deterministic "random" history so every run looks the same.
  let r = 7
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647
  const sod = (t) => new Date(t).setHours(0, 0, 0, 0)
  const titles = [
    'Read chapter 4',
    'Problem set 3',
    'Essay outline',
    'Flashcards',
    'Lab report',
    'Revise notes',
    'Email professor',
    'Past paper',
  ]
  const priorities = ['low', 'medium', 'high']
  const task = (fields) => ({
    notes: '',
    startAt: null,
    tags: [],
    ruleId: null,
    parentId: null,
    forwardCount: 0,
    forwardedUntil: null,
    recurrence: null,
    timeSpentSec: 0,
    ...fields,
  })
  let id = 0
  for (let d = 150; d >= 1; d--) {
    const n = rnd() < 0.15 ? 0 : 1 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) {
      const deadline = sod(now - d * DAY) + 20 * HOUR
      // older work is finished, a few recent tasks are still open
      const done = d > 9 || rnd() < 0.75
      const late = done && rnd() < 0.12
      s.tasks.push(
        task({
          id: 'demo' + id++,
          title: titles[Math.floor(rnd() * titles.length)],
          priority: priorities[Math.floor(rnd() * 3)],
          deadline,
          status: done ? 'done' : 'todo',
          completedAt: done ? deadline + (late ? 5 : -3) * HOUR : null,
          createdAt: deadline - 2 * DAY,
        }),
      )
    }
  }
  for (const [title, priority, h] of [
    ['Finish calculus worksheet', 'high', 3],
    ['Read 20 pages of Dune', 'low', 6],
    ['Outline history essay', 'medium', 5],
    ['Physics flashcards', 'medium', 30],
  ])
    s.tasks.push(task({ id: 'demo' + id++, title, priority, deadline: now + h * HOUR, status: 'todo', completedAt: null, createdAt: now }))

  s.habits = [
    { id: 'h1', name: 'Gym', emoji: '🏃', color: 'green', days: [1, 3, 5, 6], createdAt: now - 160 * DAY, archived: false },
    { id: 'h2', name: 'Read 10 pages', emoji: '📚', color: 'violet', days: everyDay, createdAt: now - 160 * DAY, archived: false },
    { id: 'h3', name: 'Sleep by midnight', emoji: '🛏️', color: 'sky', days: everyDay, createdAt: now - 100 * DAY, archived: false },
  ]
  s.habitLogs = { h1: {}, h2: {}, h3: {} }
  const key = (t) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  for (let d = 160; d >= 1; d--) for (const h of ['h1', 'h2', 'h3']) if (rnd() < 0.65) s.habitLogs[h][key(now - d * DAY)] = true
  s.focus.history = Array.from({ length: 70 }, (_, i) => ({
    id: 'f' + i,
    startedAt: now - i * 2 * DAY,
    endedAt: now - i * 2 * DAY + 50 * 6e4,
    focusedMin: 50,
    completed: true,
  }))
  s.log.push(
    ...Array.from({ length: 24 }, (_, i) => ({
      id: 'l' + i,
      type: i % 3 ? 'window_unlocked' : 'failsafe_resisted',
      at: now - i * 3 * DAY,
    })),
  )
  return s
}

// ------------------------------------------------------------ promo tile
function promoHtml() {
  const logo = fs.readFileSync(path.join(root, 'apps/web/public/logo.svg'), 'utf8')
  return `<!doctype html><html><body style="margin:0">
  <div style="width:440px;height:280px;box-sizing:border-box;padding:34px 36px;display:flex;flex-direction:column;justify-content:space-between;
    background:linear-gradient(135deg,#1b1640 0%,#3b2f8f 60%,#6152e8 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:56px;height:56px;border-radius:16px;background:#fff;display:grid;place-items:center">${logo.replace('<svg', '<svg width="40" height="40"')}</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-0.5px">Regimen</div>
    </div>
    <div>
      <div style="font-size:24px;font-weight:700;line-height:1.2">Sites stay blocked until<br/>your work is done.</div>
      <div style="margin-top:10px;font-size:15px;opacity:.85">Tasks, habits and a lofi study room. Free, open source, private.</div>
    </div>
  </div></body></html>`
}

// ------------------------------------------------------------ main
if (process.argv.includes('--build') || !fs.existsSync(path.join(EXT, 'manifest.json'))) {
  console.log('> building the extension (web app included)')
  execSync('npm run build', { cwd: root, stdio: 'inherit' })
}
fs.mkdirSync(out, { recursive: true })
const problems = []
const shots = [
  { file: '1-study-room.png', route: '/', mode: 'game' },
  { file: '2-today.png', route: '/today', mode: 'game' },
  { file: '3-blocking.png', route: '/blocking', mode: 'game' },
  { file: '4-accountability.png', route: '/stats', mode: 'game' },
  { file: '5-tasks-calm-mode.png', route: '/tasks', mode: 'minimal' },
]

/** A fresh browser with the extension, already holding the demo setup in the given UI mode. */
async function extensionWithDemo(mode) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-shots-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  })
  await context.addInitScript(() => localStorage.setItem('regimen:seen-level', '999'))
  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker')
  const id = worker.url().split('/')[2]
  const page = await context.newPage()
  page.on('pageerror', (e) => problems.push(`${mode}: ${e.message}`))
  await page.goto(`chrome-extension://${id}/popup.html`)
  const state = await seed({ mode })
  const res = await page.evaluate((st) => chrome.runtime.sendMessage({ type: 'fg', cmd: 'setup.adopt', payload: { state: st } }), state)
  if (!res?.ok) throw new Error('The extension did not take the demo setup: ' + JSON.stringify(res?.error))
  return { context, page, id }
}

try {
  for (const mode of ['game', 'minimal']) {
    const { context, page, id } = await extensionWithDemo(mode)
    // First load records the earned badges, so later loads show no "badge earned" toast.
    await page.goto(`chrome-extension://${id}/app/index.html#/`)
    await page.waitForTimeout(1500)
    for (const shot of shots.filter((x) => x.mode === mode)) {
      await page.goto(`chrome-extension://${id}/app/index.html#${shot.route}`)
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(out, shot.file) })
      console.log('saved', path.relative(root, path.join(out, shot.file)))
    }
    await context.close()
  }
  const browser = await chromium.launch()
  const tile = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 })
  await tile.setContent(promoHtml())
  await tile.screenshot({ path: path.join(out, 'promo-tile-440x280.png') })
  console.log('saved', path.relative(root, path.join(out, 'promo-tile-440x280.png')))
  await browser.close()
} catch (e) {
  problems.push(e.message)
}
if (problems.length) {
  console.error('Problems:\n' + problems.join('\n'))
  process.exitCode = 1
}
