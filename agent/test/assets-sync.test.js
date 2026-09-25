// The Go lock agent embeds copies of the site bundles, TROUBLESHOOTING.md and the
// license (agent/internal/assets) so it ships as one file. This test fails when
// an original changed without refreshing the copies.
import { describe, it, expect } from 'vitest'
import { staleAssets } from '../../scripts/sync-agent-bundles.mjs'

describe('lock agent embedded assets', () => {
  it('match packages/core bundles, TROUBLESHOOTING.md and LICENSE (run `npm run agent:bundles` if this fails)', async () => {
    expect(await staleAssets()).toEqual([])
  })
})
