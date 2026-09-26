// The owner's report: the Firefox add-on opened an old study room (ten tutorials, every window
// open) because the extension shipped a stale copy of the app. Now the extension opens the
// hosted app, trusts only that exact path, and what was already seen (the room intro, tips,
// notices) lives in the saved state, so the website and the extension agree.
// These use the e2e build (build.mjs): the local preview at localhost:4173 plays the hosted app.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect, E2E_BUILD } from './fixtures.js'
import { createBackend } from '../../packages/core/src/index.js'

const HOSTED = 'http://localhost:4173/'
const PIN = '246810'
const REASON = 'I want to break my own rule because this is only a practice run'
// R_SHOTS=<folder> saves screenshots of the new screens
const SHOTS = process.env.R_SHOTS
const shot = async (page, name) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const { width } = page.viewportSize()
  await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`) })
}

test.use({ extensionPath: E2E_BUILD, viewport: { width: 1440, height: 900 } })

/** A finished setup done on the website (the trial), which the extension adopts. */
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
  const s = structuredClone(saved)
  delete s.ui // like a trial made with an older version: only localStorage knows what was seen
  return s
}

/** The install welcome tab runs the hosted app too: close it, so it does not take the website's setup first. */
async function closeWelcome(context) {
  let tab
  await expect.poll(() => (tab = context.pages().find((p) => p.url().startsWith(HOSTED))), { timeout: 10_000 }).toBeTruthy()
  await expect(tab.getByText("Let's protect your focus.")).toBeVisible()
  await tab.close()
}

test('install opens the hosted app, trusted without Allow, and the popup opens it too', async ({ context, extensionId }) => {
  // the install welcome (background onInstalled) opens the hosted app, not the bundled copy
  let welcome
  await expect.poll(() => (welcome = context.pages().find((p) => p.url().startsWith(HOSTED))), { timeout: 10_000 }).toBeTruthy()
  await expect(welcome).toHaveURL(HOSTED + '#/welcome')
  await expect(welcome.getByText("Let's protect your focus.")).toBeVisible()
  await expect(welcome.getByText('Approve this site in the extension')).toHaveCount(0)
  await shot(welcome, 'hosted-welcome')
  if (SHOTS) {
    await welcome.setViewportSize({ width: 390, height: 844 })
    await shot(welcome, 'hosted-welcome')
  }

  // the popup's links open the hosted app too
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await expect(popup.getByText('Finish setting up Regimen')).toBeVisible()
  let opened = context.waitForEvent('page')
  await popup.getByRole('link', { name: 'Study room' }).click()
  let room = await opened
  await expect(room).toHaveURL(HOSTED + '#/room')

  // "Use the offline copy": the copy inside the extension
  const popup2 = await context.newPage()
  await popup2.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup2.getByLabel('Use the offline copy').check()
  opened = context.waitForEvent('page')
  await popup2.getByRole('link', { name: 'Tasks' }).click()
  room = await opened
  await expect(room).toHaveURL(`chrome-extension://${extensionId}/app/index.html#/tasks`)

  // another origin (not the hosted app) still needs Allow in the popup
  const other = await context.newPage()
  await other.goto('http://127.0.0.1:4173/#/')
  await expect(other.getByText('Approve this site in the extension')).toBeVisible()
})

test('what was seen on the website carries into the extension and back, no stale tours', async ({ context, extensionId, send }) => {
  await closeWelcome(context)
  const saved = await websiteSetup()
  // 1. the trial on the website: room intro done, the focus tip seen
  const site = await context.newPage()
  await site.addInitScript((s) => {
    if (sessionStorage.getItem('fg-seeded')) return
    sessionStorage.setItem('fg-seeded', '1')
    localStorage.setItem('regimen:v1', s)
    localStorage.setItem('regimen:tours-seen', '["room"]')
    localStorage.setItem('regimen:room-tips-seen', '["focus"]')
  }, JSON.stringify(saved))
  // 2. the extension is installed: the website hands its setup over, no Allow needed
  await site.goto(HOSTED + '#/today')
  await expect(site.getByText('Your setup moved into the extension')).toBeVisible({ timeout: 10_000 })
  await expect.poll(async () => (await send('state.get')).state.ui.tours, { timeout: 10_000 }).toContain('room')
  expect((await send('state.get')).state.ui.tips).toContain('focus')

  // 3. the copy inside the extension (another origin, empty localStorage) knows the intro was seen
  const app = await context.newPage()
  await app.goto(`chrome-extension://${extensionId}/app/index.html#/room`)
  const dock = app.locator('nav[aria-label="Room windows"]')
  await expect(dock).toBeVisible()
  await expect(app.locator('[data-window]:visible')).toHaveCount(0) // the clean room
  // the start card comes instead of the intro: no rules yet
  const start = app.locator('[data-blocking-ways="card"]')
  await expect(start).toBeVisible({ timeout: 5000 })
  await expect(app.locator('[data-tour-card]')).toHaveCount(0)
  await expect(app.locator('[data-welcome-gift]')).toHaveCount(0) // one card at a time
  await shot(app, 'room-start-card')
  await start.locator('[data-ways-dismiss]').last().click()
  await expect(start).toHaveCount(0)
  await expect(app.locator('[data-welcome-gift]')).toBeVisible() // the gift comes next
  await app.locator('[data-welcome-gift]').getByRole('button', { name: 'Close' }).click()

  // the focus tip was seen on the website, the music tip was not
  await app.locator('[data-dock="focus"]').click()
  await expect(app.locator('[data-window="focus"]')).toBeVisible()
  await expect(app.locator('[data-window="focus"] [data-room-tip]')).toHaveCount(0)
  await app.locator('[data-dock="player"]').click()
  const tip = app.locator('[data-window="player"] [data-room-tip]')
  await expect(tip).toContainText('lofi radio')
  await tip.getByRole('button', { name: 'Got it' }).click()
  await expect.poll(async () => (await send('state.get')).state.ui.tips).toContain('player')
  expect((await send('state.get')).state.ui.flags).toContain('blocking-start-seen')

  // no page starts a tour by itself (the welcome step is covered by the room intro)
  for (const route of ['/today', '/tasks', '/schedule', '/blocking', '/habits', '/stats', '/settings']) {
    await app.goto(`chrome-extension://${extensionId}/app/index.html#${route}`)
    await app.waitForTimeout(1200)
    await expect(app.locator('[data-tour-card]'), route).toHaveCount(0)
  }

  // 4. and back: the website forgets its own copy, the saved state still knows
  await site.evaluate(() => {
    localStorage.removeItem('regimen:tours-seen')
    localStorage.removeItem('regimen:room-tips-seen')
  })
  await site.goto(HOSTED + '#/room')
  await site.reload()
  await expect(site.locator('nav[aria-label="Room windows"]')).toBeVisible()
  await site.waitForTimeout(1800)
  await expect(site.locator('[data-tour-card]')).toHaveCount(0)
  await expect(site.locator('[data-blocking-ways="card"]')).toHaveCount(0)
  await site.locator('[data-dock="player"]').click()
  await expect(site.locator('[data-window="player"]')).toBeVisible()
  await expect(site.locator('[data-room-tip]')).toHaveCount(0)
})

test('the room start card leads to the right editor', async ({ context, extensionId, send }) => {
  await closeWelcome(context)
  const saved = await websiteSetup()
  const site = await context.newPage()
  await site.addInitScript((s) => {
    if (!localStorage.getItem('regimen:v1')) localStorage.setItem('regimen:v1', s)
    localStorage.setItem('regimen:tours-seen', '["room"]')
  }, JSON.stringify(saved))
  await site.goto(HOSTED + '#/room')
  const start = site.locator('[data-blocking-ways="card"]')
  await expect(start).toBeVisible({ timeout: 10_000 })
  if (SHOTS) {
    await shot(site, 'room-start-card')
    await site.setViewportSize({ width: 390, height: 844 })
    await site.reload()
    await expect(start).toBeVisible({ timeout: 10_000 })
    await site.waitForTimeout(400)
    await shot(site, 'room-start-card')
  }
  await start.locator('[data-way="hard"]').click()
  await expect(site).toHaveURL(HOSTED + '#/blocking')
  const editor = site.getByRole('dialog', { name: 'New blocking rule' })
  await expect(editor).toBeVisible()
  await expect(editor.getByPlaceholder('e.g. No phone-brain after 11')).toBeVisible() // the hard block form
  expect((await send('state.get')).state.ui.flags).toContain('blocking-start-seen')
  expect(extensionId).toBeTruthy()
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`the Blocking page explains the three ways to block when there are no rules (${viewport.width}px)`, async ({
    context,
    extensionId,
    send,
  }) => {
    expect((await send('setup.adopt', { state: await websiteSetup() })).ok).toBe(true)
    await send('ui.mark', { tours: ['*'] })

    const app = await context.newPage()
    await app.setViewportSize(viewport)
    await app.goto(`chrome-extension://${extensionId}/app/index.html#/blocking`)
    const ways = app.locator('[data-blocking-ways="page"]')
    await expect(ways).toContainText('You have not blocked any sites yet')
    for (const name of ['Task-gated window', 'Hard block', 'Focus session']) await expect(ways).toContainText(name)
    await expect(app.locator('[data-tour="blocking-gated"]')).toHaveCount(0)
    await expect(app.locator('[data-tour="blocking-focus"]')).toBeVisible()
    await shot(app, 'blocking-empty')

    // Set one up opens the right editor
    await ways.locator('[data-way="gated"]').getByRole('button', { name: 'Set one up' }).click()
    const editor = app.getByRole('dialog', { name: 'New blocking rule' })
    await expect(editor).toBeVisible()
    await expect(editor.getByPlaceholder('e.g. Evening study')).toBeVisible()
    await app.keyboard.press('Escape')
    await expect(editor).toBeHidden()

    // Learn more opens the help at the three ways, with an example each
    await ways.locator('[data-way="focus"]').getByRole('button', { name: 'Learn more' }).click()
    const section = app.locator('[data-help-section="ways"]')
    await expect(section).toBeVisible()
    await expect(section).toContainText('Example: every night 11 pm to 7 am')
    await app.waitForTimeout(500) // the drawer slides in
    await shot(app, 'blocking-help-ways')
    await app.getByRole('button', { name: 'Close help' }).click()

    // Not now: the cards go, the rule sections and a small link stay
    await ways.locator('[data-ways-dismiss]').click()
    await expect(ways).toHaveCount(0)
    await expect(app.locator('[data-tour="blocking-gated"]')).toBeVisible()
    await expect(app.locator('[data-how-blocking]')).toBeVisible()
    await expect.poll(async () => (await send('state.get')).state.ui.flags).toContain('blocking-intro-hidden')
    await app.reload()
    await expect(app.locator('[data-how-blocking]')).toBeVisible()
    await expect(app.locator('[data-blocking-ways]')).toHaveCount(0)
    await shot(app, 'blocking-dismissed')
  })
}
