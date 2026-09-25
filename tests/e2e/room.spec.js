import { test, expect } from '@playwright/test'

// The study room windows: drag, resize, minimize, maximize and a layout that survives a
// reload, with real pointer events. Runs on the public room (/room), no setup needed.
test.use({ viewport: { width: 1440, height: 900 } })
// the one-time "Site blocking needs the free extension" dialog is tested in clarity.spec.js
test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem('focusgateway:no-extension-seen', '1')))

const rect = (page, id) =>
  page.locator(`[data-window="${id}"]`).evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })

async function pointerDrag(page, locator, dx, dy) {
  const b = await locator.boundingBox()
  const x = b.x + Math.min(20, b.width / 2)
  const y = b.y + b.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 })
  await page.mouse.move(x + dx, y + dy, { steps: 4 })
  await page.mouse.up()
}

test('room windows move, resize, minimize, maximize and remember their layout', async ({ page }) => {
  await page.goto('http://localhost:4173/#/room')
  const focus = page.locator('[data-window="focus"]')
  await expect(focus).toBeVisible()
  const start = await rect(page, 'focus')

  // drag by the title bar (no snapping target near the middle of the room)
  await pointerDrag(page, focus.locator('.rw-title'), 300, -100)
  await page.waitForTimeout(250)
  const moved = await rect(page, 'focus')
  expect(moved.x).toBe(start.x + 300)
  expect(moved.y).toBe(start.y - 100)

  // resize from the bottom right corner, the size stays within the window's limits
  await pointerDrag(page, focus.locator('[data-resize="se"]'), 120, 60)
  await page.waitForTimeout(250)
  const grown = await rect(page, 'focus')
  expect(grown.w).toBe(moved.w + 120)
  expect(grown.h).toBe(moved.h + 60)
  await pointerDrag(page, focus.locator('[data-resize="se"]'), -2000, -2000)
  await page.waitForTimeout(250)
  const tiny = await rect(page, 'focus')
  expect(tiny.w).toBe(250)
  expect(tiny.h).toBe(150)
  await pointerDrag(page, focus.locator('[data-resize="se"]'), 200, 200)
  await page.waitForTimeout(250)
  const final = await rect(page, 'focus')

  // maximize (double click the title bar), Escape restores
  await focus.locator('.rw-title').dblclick()
  await page.waitForTimeout(300)
  const max = await rect(page, 'focus')
  expect(max.w).toBeGreaterThan(1400)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  expect(await rect(page, 'focus')).toEqual(final)

  // minimize to the dock, restore from it
  await focus.getByRole('button', { name: 'Minimize Focus' }).click()
  await expect(focus).toBeHidden()
  await page.locator('[data-dock="focus"]').click()
  await expect(focus).toBeVisible()

  // the music window shows the track name and lists the tracks
  await expect(page.locator('[data-now-playing]')).toHaveText('Rain on the Window')
  await page.locator('[data-track-list-button]').click()
  await expect(page.locator('[data-track-pop] [data-track="jazz-corner-booth"]')).toBeDisabled()
  await page.locator('[data-track-pop] [data-track="classic-late-library"]').click()
  await expect(page.locator('[data-now-playing]')).toHaveText('Late Library')
  await page.keyboard.press('Escape')

  // the layout survives a reload
  await page.waitForTimeout(400)
  await page.reload()
  await expect(focus).toBeVisible()
  expect(await rect(page, 'focus')).toEqual(final)

  // reset layout brings back the default
  await page.locator('[data-dock-reset]').click()
  await page.waitForTimeout(300)
  expect(await rect(page, 'focus')).toEqual(start)
})

test('on phones the room windows stack and open full screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:4173/#/room')
  const player = page.locator('[data-window="player"]')
  await expect(player).toBeVisible()
  await expect(player.locator('[data-resize]')).toHaveCount(0)
  await player.getByRole('button', { name: 'Maximize Music' }).click()
  const r = await rect(page, 'player')
  expect(r).toMatchObject({ x: 0, y: 0, w: 390, h: 844 })
  await expect(player.locator('[data-track="classic-tram-stop"]')).toBeVisible()
  await player.getByRole('button', { name: 'Restore Music' }).click()
  await player.getByRole('button', { name: 'Minimize Music' }).click()
  await expect(player).toBeHidden()
  await page.locator('[data-dock="player"]').click()
  await expect(player).toBeVisible()
})
