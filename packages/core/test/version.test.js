import { describe, it, expect } from 'vitest'
import { compareVersions, isOlderVersion } from '../src/version.js'

describe('extension version check', () => {
  it('compares versions part by part', () => {
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0)
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1)
    expect(compareVersions('1.10.0', '1.9.3')).toBe(1)
    expect(compareVersions('1.1', '1.1.0')).toBe(0)
    expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBe(0)
  })
  it('only calls a known, lower version older', () => {
    expect(isOlderVersion('1.0.0', '1.1.0')).toBe(true)
    expect(isOlderVersion('1.1.0', '1.1.0')).toBe(false)
    expect(isOlderVersion('1.2.0', '1.1.0')).toBe(false)
    expect(isOlderVersion(null, '1.1.0')).toBe(false)
    expect(isOlderVersion('dev', '1.1.0')).toBe(false)
  })
})
