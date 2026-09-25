import { describe, it, expect } from 'vitest'
import { createBackend } from '../src/backend.js'
import { migrate, defaultState } from '../src/state.js'
import { APPEARANCE, DEFAULT_APPEARANCE, appearanceFor, mergeAppearance } from '../src/appearance.js'

function backend() {
  let saved = null
  const storage = {
    load: async () => (saved ? structuredClone(saved) : null),
    save: async (s) => {
      saved = structuredClone(s)
    },
  }
  return createBackend({ storage, now: () => new Date(2026, 8, 21, 9).getTime(), hashIterations: 1000 })
}

describe('appearance catalog', () => {
  it('has unique ids, defaults that exist, and combos that point at real ids', () => {
    for (const mode of ['game', 'minimal']) {
      const cat = APPEARANCE[mode]
      for (const list of ['palettes', 'headings', 'bodies', 'combos']) {
        const ids = cat[list].map((x) => x.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
      expect(cat.palettes.length).toBeGreaterThanOrEqual(5)
      const d = DEFAULT_APPEARANCE[mode]
      expect(cat.palettes.map((p) => p.id)).toContain(d.palette)
      expect(cat.headings.map((p) => p.id)).toContain(d.heading)
      expect(cat.bodies.map((p) => p.id)).toContain(d.body)
      for (const c of cat.combos) {
        expect(cat.palettes.map((p) => p.id)).toContain(c.palette)
        expect(cat.headings.map((p) => p.id)).toContain(c.heading)
        expect(cat.bodies.map((p) => p.id)).toContain(c.body)
      }
      for (const p of cat.palettes) {
        expect(p.swatch.light).toHaveLength(3)
        expect(p.swatch.dark).toHaveLength(3)
      }
    }
  })

  it('falls back to defaults for missing or unknown ids', () => {
    expect(appearanceFor({}, 'game')).toEqual(DEFAULT_APPEARANCE.game)
    expect(appearanceFor({ appearance: { minimal: { palette: 'sage', heading: 'nope' } } }, 'minimal')).toEqual({
      ...DEFAULT_APPEARANCE.minimal,
      palette: 'sage',
    })
  })

  it('merges per mode and names the bad id', () => {
    const r = mergeAppearance(DEFAULT_APPEARANCE, { game: { palette: 'arcade' } })
    expect(r.value.game).toEqual({ ...DEFAULT_APPEARANCE.game, palette: 'arcade' })
    expect(r.value.minimal).toEqual(DEFAULT_APPEARANCE.minimal)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { palette: 'sage' } }).error).toMatch(/sage/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { retro: {} }).error).toMatch(/retro/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, { game: { size: 'big' } }).error).toMatch(/size/)
    expect(mergeAppearance(DEFAULT_APPEARANCE, 'arcade').error).toBeTruthy()
  })
})

describe('settings.update appearance', () => {
  it('starts with defaults and keeps the other mode when one mode changes', async () => {
    const be = backend()
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    await be.dispatch('settings.update', {
      patch: { appearance: { minimal: { palette: 'sand', heading: 'newsreader', body: 'source-serif' } } },
    })
    await be.dispatch('settings.update', { patch: { appearance: { game: { heading: 'lilita' } } } })
    const after = (await be.dispatch('state.get')).state.settings.appearance
    expect(after.minimal).toEqual({ palette: 'sand', heading: 'newsreader', body: 'source-serif' })
    expect(after.game).toEqual({ ...DEFAULT_APPEARANCE.game, heading: 'lilita' })
  })

  it('rejects unknown ids with VALIDATION and changes nothing', async () => {
    const be = backend()
    await expect(
      be.dispatch('settings.update', { patch: { theme: 'dark', appearance: { game: { body: 'comic-sans' } } } }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    const { state } = await be.dispatch('state.get')
    expect(state.settings.appearance).toEqual(DEFAULT_APPEARANCE)
    expect(state.settings.theme).toBe('system')
  })

  it('migrates old saves without appearance', () => {
    const old = defaultState()
    delete old.settings.appearance
    expect(migrate(old).settings.appearance).toEqual(DEFAULT_APPEARANCE)
    const partial = defaultState()
    partial.settings.appearance = { game: { palette: 'ocean' } }
    expect(migrate(partial).settings.appearance.game).toEqual({ ...DEFAULT_APPEARANCE.game, palette: 'ocean' })
    expect(migrate(partial).settings.appearance.minimal).toEqual(DEFAULT_APPEARANCE.minimal)
  })
})
