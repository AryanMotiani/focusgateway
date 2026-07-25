'use strict';

const {
  sitesData,
  getAllBundles,
  getBundleByKey,
  isValidCustomDomain,
  resolveDomains,
} = require('../src/data/sites');

describe('Ticket 5 — Sites/Domain-Bundle Data Model Unit Tests', () => {
  test('sites.json contains valid version and >=30 bundles', () => {
    expect(sitesData.version).toBe('1.0.0');
    expect(Array.isArray(sitesData.bundles)).toBe(true);
    expect(sitesData.bundles.length).toBeGreaterThanOrEqual(30);
  });

  test('getBundleByKey returns correct bundle details', () => {
    const youtube = getBundleByKey('youtube');
    expect(youtube).not.toBeNull();
    expect(youtube.display_name).toBe('YouTube');
    expect(youtube.category).toBe('video');
    expect(youtube.domains).toContain('youtube.com');
    expect(youtube.domains).toContain('googlevideo.com');
  });

  test('isValidCustomDomain validates hostnames strictly', () => {
    expect(isValidCustomDomain('example.com')).toBe(true);
    expect(isValidCustomDomain('news.ycombinator.com')).toBe(true);
    expect(isValidCustomDomain('http://example.com')).toBe(false);
    expect(isValidCustomDomain('example.com/path')).toBe(false);
    expect(isValidCustomDomain('invalid_domain')).toBe(false);
  });

  test('resolveDomains flattens bundle keys and custom domains into deduplicated list', () => {
    const result = resolveDomains([
      { bundle_key: 'youtube' },
      { custom_domain: 'github.com' },
    ]);

    expect(result).toContain('youtube.com');
    expect(result).toContain('googlevideo.com');
    expect(result).toContain('github.com');
    expect(result).toContain('www.github.com');
  });
});
