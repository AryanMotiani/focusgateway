// The tester's bug: "YouTube and Reddit were not blocked after I started a study session".
// These drive the real web app on a hosted origin (localhost:4173) through the extension's
// content-script bridge, like the GitHub Pages site, and check the sites really redirect.
import { test, expect } from './fixtures.js'
import { createBackend } from '../../packages/core/src/index.js'

const PIN = '246810'
const REASON = 'I want to break my own rule because this is only a practice run'
const APP = 'http://localhost:4173/'

/** A finished setup made "on the website", which the extension adopts on approval. */
async function websiteSetup() {
  let saved = null
  let clock = Date.now() - 60_000
  const local = createBackend({
    storage: { load: async () => saved, save: async (s) => (saved = structuredClone(s)) },
    now: () => clock,
    hashIterations: 1000,
  })
  await local.dispatch('setup.pin', { pin: PIN })
  await local.dispatch('setup.step', { step: 'recoverySaved' })
  await local.dispatch('failsafe.start', { target: { type: 'practice' } })
  await local.dispatch('failsafe.continue')
  await local.dispatch('failsafe.pin', { pin: PIN })
  clock += 11_000
  await local.dispatch('failsafe.confirm', { confirmation: REASON })
  await local.dispatch('setup.complete')
  return saved
}

/** Opens the hosted app, approves it in the popup, and waits until it is connected. */
async function connectedApp(context, extensionId, hash = '#/today') {
  const saved = await websiteSetup()
  const page = await context.newPage()
  await page.addInitScript((s) => {
    if (!localStorage.getItem('focusgateway:v1')) localStorage.setItem('focusgateway:v1', s)
    localStorage.setItem('focusgateway:tours-seen', '["*"]') // tours are tested in help.spec.js
  }, JSON.stringify(saved))
  await page.goto(APP + hash)
  await expect(page.getByText('Approve this site in the extension')).toBeVisible()
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.getByRole('button', { name: 'Allow' }).click()
  await popup.close()
  await expect(page.getByText('Your setup moved into the extension')).toBeVisible({ timeout: 10_000 })
  return page
}

const site = (fakeSite, host, path = '') => fakeSite.replace('%s', host) + path

test('a focus session started in the web app blocks YouTube and Reddit, subdomains included', async ({
  context,
  extensionId,
  fakeSite,
}) => {
  const app = await connectedApp(context, extensionId)
  await app.goto(APP + '#/blocking')
  // the default picks are YouTube, Instagram, Reddit and X
  await app.locator('[data-tour="blocking-focus"]').getByRole('button', { name: 'Start focus' }).click()
  await expect(app.getByText('Focus session started. Sites are blocked.')).toBeVisible()
  await expect(app.locator('[data-blocking-off-chip]')).toHaveCount(0)

  const tab = await context.newPage()
  for (const [host, domain] of [
    ['youtube.com', 'youtube.com'],
    ['www.youtube.com', 'youtube.com'],
    ['m.youtube.com', 'm.youtube.com'],
    ['reddit.com', 'reddit.com'],
    ['www.reddit.com', 'reddit.com'],
    ['old.reddit.com', 'old.reddit.com'],
  ]) {
    await tab.goto(site(fakeSite, host, 'watch')).catch(() => {})
    await expect(tab, host).toHaveURL(new RegExp(`blocked\\.html\\?d=${domain.replace(/\./g, '\\.')}`))
  }
  await expect(tab.getByText('Focus session').first()).toBeVisible()
  await tab.goto(site(fakeSite, 'news.ycombinator.com'))
  await expect(tab.getByText('REAL SITE')).toBeVisible()
})

test('custom sites picked for a focus session are blocked too', async ({ context, extensionId, fakeSite, send }) => {
  const app = await connectedApp(context, extensionId)
  await app.goto(APP + '#/blocking')
  const card = app.locator('[data-tour="blocking-focus"]')
  await card.getByRole('button', { name: /Blocking \d+ sites? · change/ }).click()
  await app.getByRole('button', { name: 'Any other website' }).click()
  await app.getByPlaceholder('Website addresses, e.g. chess.com lichess.org').fill('https://news.ycombinator.com/news')
  await app.getByRole('button', { name: 'Add site' }).click()
  await app.getByRole('dialog', { name: 'Sites to block while focusing' }).getByRole('button', { name: 'Done' }).click()
  await card.getByRole('button', { name: 'Start focus' }).click()
  await expect(app.getByText('Focus session started. Sites are blocked.')).toBeVisible()
  const { state } = await send('state.get')
  expect(state.focus.active.siteIds).toContain(state.customSites[0].id)
  const tab = await context.newPage()
  await tab.goto(site(fakeSite, 'news.ycombinator.com')).catch(() => {})
  await expect(tab).toHaveURL(/blocked\.html\?d=news\.ycombinator\.com/)
})

test('the blocking status checklist is all green once connected', async ({ context, extensionId }) => {
  const app = await connectedApp(context, extensionId, '#/blocking')
  await app.goto(APP + '#/blocking')
  const status = app.locator('[data-blocking-status]')
  await expect(status.locator('[data-blocking-status-summary]')).toHaveText('Ready to block')
  for (const id of ['extension', 'approved', 'access'])
    await expect(status.locator(`[data-check="${id}"]`)).toHaveAttribute('data-state', 'ok')
  await expect(status.locator('[data-check="agent"]')).toHaveAttribute('data-state', 'off')
  await expect(app.locator('[data-extension-banner]')).toHaveCount(0)
})

test('Test blocking in Settings reports that blocking works', async ({ context, extensionId }) => {
  const app = await connectedApp(context, extensionId, '#/settings')
  await app.goto(APP + '#/settings')
  const opened = context.waitForEvent('page')
  await app.getByRole('button', { name: 'Test blocking' }).click()
  const tab = await opened
  await expect(tab).toHaveURL(/blocked\.html\?d=example\.com/, { timeout: 10_000 })
  await expect(tab.getByText('Blocking works.')).toBeVisible()
  await expect(app.getByText('Blocking works in this browser.')).toBeVisible({ timeout: 12_000 })
})

test('without approving the site, starting focus says loudly that nothing is blocked', async ({ context }) => {
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('focusgateway:tours-seen', '["*"]'))
  await page.goto(APP + '#/room')
  await page.getByRole('button', { name: 'Continue without blocking' }).click()
  await page.locator('[data-window="focus"]').getByRole('button', { name: 'Start focus' }).click()
  const dialog = page.locator('[data-blocking-off]')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Nothing will be blocked yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect now' })).toBeVisible()
  // choosing to go on anyway starts only the timer, and the room says blocking is off
  await page.locator('[data-go-on]').click()
  await expect(page.getByText('Timer started. Sites are NOT blocked in this browser.')).toBeVisible()
  await expect(
    page
      .locator('[data-window="focus"]')
      .getByText(/Blocking is off|nothing is blocked/i)
      .first(),
  ).toBeVisible()
})

test('leaving the study room during a session asks first', async ({ context, extensionId }) => {
  const app = await connectedApp(context, extensionId, '#/')
  await app.goto(APP + '#/')
  await app.locator('[data-window="focus"]').getByRole('button', { name: 'Start focus' }).click()
  await expect(app.getByText('Focus session started. Sites are blocked.')).toBeVisible()
  await app.getByRole('link', { name: 'Tasks' }).first().click()
  await expect(app.getByText('Stay focused?')).toBeVisible()
  await app.getByRole('button', { name: 'Stay' }).click()
  await expect(app).toHaveURL(/#\/$/)
  await app.getByRole('link', { name: 'Tasks' }).first().click()
  await expect(app.getByText('Stay focused?')).toBeVisible()
  await app.getByRole('button', { name: 'Leave' }).click()
  await expect(app).toHaveURL(/#\/tasks/)
})

test('a hard block created in the web app blocks right away and says why', async ({ context, extensionId, fakeSite }) => {
  const app = await connectedApp(context, extensionId)
  await app.goto(APP + '#/blocking')
  await app.locator('[data-tour="blocking-new"]').click()
  const dialog = app.getByRole('dialog', { name: 'New blocking rule' })
  await dialog.getByRole('button', { name: /Hard Block/ }).click()
  await dialog.getByLabel('Name').fill('No Reddit')
  await dialog.getByRole('button', { name: 'Reddit', exact: true }).click()
  await dialog.getByRole('button', { name: 'Every day' }).click()
  const hhmm = (d) => d.toTimeString().slice(0, 5)
  const now = new Date()
  await dialog.getByLabel('Start time').fill(hhmm(new Date(now - 5 * 60_000)))
  await dialog.getByLabel('End time').fill(hhmm(new Date(+now + 60 * 60_000)))
  await dialog.getByRole('button', { name: /Create|Save/ }).click()
  await expect(app.getByText(/Rule created\. Blocking now/)).toBeVisible()
  await expect(app.locator('[data-rule-why]').first()).toContainText('Blocking now')
  const tab = await context.newPage()
  await tab.goto(site(fakeSite, 'old.reddit.com')).catch(() => {})
  await expect(tab).toHaveURL(/blocked\.html\?d=old\.reddit\.com/)
})
