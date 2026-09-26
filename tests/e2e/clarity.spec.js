// Without the extension the app must say clearly that nothing is blocked: a one-time dialog,
// the room's blocking pill, and the dialog before a focus session starts. Plus the palette
// button and the light default theme. Runs on the hosted build (localhost:4173), no extension.
import { test, expect } from '@playwright/test'

const APP = 'http://localhost:4173/'
test.use({ viewport: { width: 1440, height: 900 } })
const seen = (page) =>
  page.addInitScript(() => {
    localStorage.setItem('regimen:no-extension-seen', '1')
    localStorage.setItem('regimen:tours-seen', '["*"]') // the room intro is tested in room.spec.js
  })

test('the first visit without the extension explains blocking once', async ({ page }) => {
  await page.goto(APP + '#/room')
  const dialog = page.getByRole('dialog', { name: 'Site blocking needs the free extension' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Nothing is blocked in this browser')
  await expect(dialog.getByRole('button', { name: 'Add the extension' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Continue without blocking' }).click()
  await expect(dialog).toBeHidden()
  // the persistent sign stays
  await expect(page.locator('header [data-blocking-pill="off"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-dock="focus"]')).toBeVisible()
  await page.waitForTimeout(800)
  await expect(page.locator('[data-first-visit]')).toHaveCount(0)
})

test('the trial room says site blocking is off until the extension is added', async ({ page }) => {
  await seen(page)
  await page.goto(APP + '#/room')
  const pill = page.locator('header [data-blocking-pill="off"]')
  await expect(pill).toContainText('Blocking off')
  await expect(pill).toContainText('add the extension')
  await pill.click()
  const status = page.getByRole('dialog', { name: 'Blocking status' })
  await expect(status.locator('[data-check="extension"]')).toContainText('Not installed')
})

test('starting focus without the extension asks first, then runs only the timer', async ({ page }) => {
  await seen(page)
  await page.goto(APP + '#/room')
  await page.locator('[data-dock="focus"]').click()
  await page.locator('[data-window="focus"]').getByRole('button', { name: 'Start focus' }).click()
  const dialog = page.locator('[data-blocking-off]')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('The timer still runs')
  await dialog.getByRole('button', { name: 'Start anyway' }).click()
  await expect(page.getByText('Timer started. Sites are NOT blocked in this browser.')).toBeVisible()
})

test('the red chip opens the blocking status checklist', async ({ page }) => {
  await seen(page)
  await page.goto(APP + '#/room')
  await page.locator('[data-dock="focus"]').click()
  await page.locator('[data-window="focus"]').getByRole('button', { name: 'Start focus' }).click()
  await page.locator('[data-go-on]').click()
  await page.locator('[data-blocking-off-chip]').first().click()
  const status = page.getByRole('dialog', { name: 'Blocking status' })
  await expect(status.locator('[data-check="extension"]')).toHaveAttribute('data-state', /bad|off/)
  await expect(status.locator('[data-check="agent"]')).toContainText('optional')
  await expect(status.getByRole('button', { name: 'Test blocking' })).toBeVisible()
})

test('new users get the light default, and the palette button changes the theme anywhere', async ({ page }) => {
  await seen(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(APP + '#/room')
  const html = page.locator('html')
  // light by default, even on a dark device: dark is one click away, never automatic
  await expect(html).toHaveAttribute('data-theme-id', 'sunny')
  await expect(html).not.toHaveClass(/dark/)

  await page.locator('[data-theme-button]').first().click()
  const pop = page.locator('[data-theme-popover]')
  await expect(pop).toContainText('Change it any time from the palette button.')
  await pop.locator('[data-theme-swatch="storybook"]').click()
  await expect(html).toHaveAttribute('data-theme-id', 'storybook')
  await pop.getByRole('radio', { name: 'Calm' }).click()
  await expect(html).toHaveAttribute('data-mode', 'minimal')
  await expect(html).toHaveAttribute('data-theme-id', 'paper')
  // the same theme in its dark variant, from the switch at the top of the popover
  await pop.getByRole('radio', { name: 'Dark' }).click()
  await expect(html).toHaveClass(/dark/)
  await expect(html).toHaveAttribute('data-theme-id', 'paper')
  await page.keyboard.press('Escape')
  await expect(pop).toBeHidden()
  await page.reload()
  await expect(html).toHaveAttribute('data-mode', 'minimal')
  await expect(html).toHaveClass(/dark/)
  // and back to light with the one click sun and moon button next to the palette
  await page.locator('[data-color-mode-button]').first().click()
  await expect(html).not.toHaveClass(/dark/)
})
