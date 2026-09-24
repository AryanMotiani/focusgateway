import { test as base, chromium } from '@playwright/test'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../extension/dist/chromium')

// A fake "distracting site": the browser resolves these names to our local server.
const FAKE_SITES = ['youtube.com', 'm.youtube.com', 'www.youtube.com', 'instagram.com', 'www.instagram.com', 'news.ycombinator.com']
export const SITE_PORT = 8089

export const test = base.extend({
  fakeSite: [
    async ({}, use) => {
      const server = http.createServer((req, res) => res.end(`<h1>REAL SITE ${req.headers.host}</h1>`)).listen(SITE_PORT)
      await use(`http://%s:${SITE_PORT}/`)
      server.close()
    },
    { scope: 'worker' },
  ],

  context: async ({}, use) => {
    if (!fs.existsSync(path.join(EXT, 'manifest.json'))) throw new Error('Build the extension first: npm run build')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-e2e-'))
    const context = await chromium.launchPersistentContext(dir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${EXT}`,
        `--load-extension=${EXT}`,
        `--host-resolver-rules=${FAKE_SITES.map((h) => `MAP ${h} 127.0.0.1`).join(', ')}`,
      ],
    })
    await use(context)
    await context.close()
  },

  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) sw = await context.waitForEvent('serviceworker')
    await use(sw.url().split('/')[2])
  },

  /** Sends a backend command from an extension page, like the real UI does. */
  send: async ({ context, extensionId }, use) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await use((cmd, payload) => page.evaluate(([c, p]) => chrome.runtime.sendMessage({ type: 'fg', cmd: c, payload: p }), [cmd, payload]))
  },
})

export const expect = test.expect

/** A rule window covering "now" on every day, so tests do not depend on the clock. */
export function windowAroundNow() {
  const d = new Date()
  const m = d.getHours() * 60 + d.getMinutes()
  return { days: [1, 2, 3, 4, 5, 6, 7], start: (m + 1440 - 5) % 1440, end: (m + 60) % 1440 }
}
