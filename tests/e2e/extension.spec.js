import { test, expect, windowAroundNow, SITE_PORT } from './fixtures.js'
import { createBackend } from '../../packages/core/src/index.js'

const PIN = '246810'
const REASON = 'I want to break my own rule because this is only a practice run'

test('hard block redirects the site, other sites load normally', async ({ context, send, fakeSite }) => {
  expect((await send('setup.pin', { pin: PIN })).ok).toBe(true)
  const r = await send('rules.create', { name: 'No YouTube', mode: 'hard', siteIds: ['youtube'], ...windowAroundNow() })
  expect(r.ok).toBe(true)
  const page = await context.newPage()
  await page.goto(fakeSite.replace('%s', 'youtube.com') + 'watch').catch(() => {})
  await expect(page).toHaveURL(/blocked\.html\?d=youtube\.com/)
  await expect(page.getByText('This one can wait.')).toBeVisible()
  await page.goto(fakeSite.replace('%s', 'news.ycombinator.com'))
  await expect(page.getByText('REAL SITE')).toBeVisible()
})

test('task-gated window opens once its tasks are done', async ({ context, send, fakeSite }) => {
  await send('setup.pin', { pin: PIN })
  await send('rules.create', {
    name: 'Study',
    mode: 'gated',
    siteIds: ['hacker-news'],
    ...windowAroundNow(),
    newTasks: [{ title: 'Essay', deadline: Date.now() + 3600e3 }],
  })
  const page = await context.newPage()
  await page.goto(fakeSite.replace('%s', 'news.ycombinator.com')).catch(() => {})
  await expect(page).toHaveURL(/blocked\.html/)
  await expect(page.getByText('Essay')).toBeVisible()
  const { state } = await send('state.get')
  await send('tasks.complete', { id: state.tasks[0].id })
  await page.goto(fakeSite.replace('%s', 'news.ycombinator.com'))
  await expect(page.getByText('REAL SITE')).toBeVisible()
})

test('focus session redirects tabs that are already open', async ({ context, send, fakeSite }) => {
  await send('setup.pin', { pin: PIN })
  const page = await context.newPage()
  await page.goto(fakeSite.replace('%s', 'news.ycombinator.com'))
  await send('focus.start', { workMin: 25, breakMin: 5, iterations: 1, siteIds: ['hacker-news'] })
  await expect(page).toHaveURL(/blocked\.html\?d=news\.ycombinator\.com/)
})

test('failsafe enforces the cooldown', async ({ send }) => {
  await send('setup.pin', { pin: PIN })
  const { data: rule } = await send('rules.create', { name: 'YT', mode: 'hard', siteIds: ['youtube'], ...windowAroundNow() })
  await send('failsafe.start', { target: { type: 'rule', id: rule.id } })
  await send('failsafe.continue')
  expect((await send('failsafe.pin', { pin: PIN })).ok).toBe(true)
  const early = await send('failsafe.confirm', { confirmation: REASON })
  expect(early.error.code).toBe('COOLDOWN')
})

test('a setup finished on the website moves into a newly installed extension (no second tutorial)', async ({
  context,
  extensionId,
  send,
}) => {
  // 1. Simulate someone who did the whole tutorial on the website before installing.
  let saved = null
  let clock = Date.now()
  const local = createBackend({
    storage: {
      load: async () => saved,
      save: async (s) => {
        saved = structuredClone(s)
      },
    },
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
  await local.dispatch('tasks.create', { title: 'Made on the website', deadline: Date.now() + 86400e3 })
  await local.dispatch('setup.complete')

  const page = await context.newPage()
  await page.addInitScript((s) => {
    if (!localStorage.getItem('focusgateway:v1')) localStorage.setItem('focusgateway:v1', s)
  }, JSON.stringify(saved))

  // 2. Open the website: the extension asks for approval once.
  await page.goto('http://localhost:4173/#/')
  await expect(page.getByText('Approve this site in the extension')).toBeVisible()
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.getByRole('button', { name: 'Allow' }).click()

  // 3. The dashboard appears straight away, with the website's data and PIN.
  await expect(page.getByText('Your setup moved into the extension')).toBeVisible({ timeout: 10_000 })
  await expect(page).not.toHaveURL(/welcome/)
  await page.goto('http://localhost:4173/#/tasks')
  await expect(page.getByText('Made on the website')).toBeVisible()
  const { state } = await send('state.get')
  expect(state.onboarding.completed).toBe(true)
  expect((await send('security.changePin', { oldPin: PIN, newPin: '135791' })).ok).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('focusgateway:v1'))).toBeNull()
  expect(SITE_PORT).toBeGreaterThan(0)
})
