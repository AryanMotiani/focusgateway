'use strict';

const sitesData = require('./sites.json');

/**
 * Hostname validation regex.
 * Disallows http://, https://, paths, ports, or space characters.
 */
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * Returns all curated domain bundles.
 * @returns {Array<{key: string, display_name: string, category: string, domains: string[]}>}
 */
function getAllBundles() {
  return sitesData.bundles;
}

/**
 * Find bundle by key.
 * @param {string} key
 * @returns {Object|null}
 */
function getBundleByKey(key) {
  return sitesData.bundles.find(b => b.key === key) || null;
}

/**
 * Validates a custom domain input string.
 * @param {string} domain
 * @returns {boolean}
 */
function isValidCustomDomain(domain) {
  if (typeof domain !== 'string') return false;
  const clean = domain.trim().toLowerCase();
  return DOMAIN_REGEX.test(clean);
}

/**
 * Resolves a list of bundle keys and custom domains into a flat list of hostnames to block.
 * Automatically adds 'www.' prefix for custom domains if not already present.
 * @param {Array<{bundle_key?: string, custom_domain?: string}>} siteSelections
 * @returns {string[]} De-duplicated list of domain strings
 */
function resolveDomains(siteSelections = []) {
  const domainSet = new Set();

  for (const item of siteSelections) {
    if (item.bundle_key) {
      const bundle = getBundleByKey(item.bundle_key);
      if (bundle) {
        bundle.domains.forEach(d => domainSet.add(d.toLowerCase()));
      }
    } else if (item.custom_domain && isValidCustomDomain(item.custom_domain)) {
      const clean = item.custom_domain.trim().toLowerCase();
      domainSet.add(clean);
      if (!clean.startsWith('www.')) {
        domainSet.add(`www.${clean}`);
      }
    }
  }

  return Array.from(domainSet);
}

module.exports = {
  sitesData,
  getAllBundles,
  getBundleByKey,
  isValidCustomDomain,
  resolveDomains,
};
