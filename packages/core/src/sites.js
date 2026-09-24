import bundlesData from './bundles.js'

export const BUNDLES = bundlesData.bundles
export const BUNDLES_VERSION = bundlesData.version

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/

/**
 * Turns anything a user might paste ("https://www.YouTube.com/watch?v=1",
 * "m.reddit.com:443", "reddit.com/r/foo") into a bare registrable host, or null.
 */
export function normalizeDomain(input) {
  if (typeof input !== 'string') return null
  let s = input.trim().toLowerCase()
  if (!s) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'http://' + s
  let host
  try {
    host = new URL(s).hostname
  } catch {
    return null
  }
  host = host.replace(/\.$/, '').replace(/^www\./, '')
  if (host.startsWith('[') || /^\d+(\.\d+){3}$/.test(host)) return null // IPs are not supported
  const labels = host.split('.')
  if (labels.length < 2) return null
  if (!labels.every((l) => LABEL.test(l))) return null
  if (/^\d+$/.test(labels[labels.length - 1])) return null
  return host
}

export function parseDomainList(text) {
  const parts = String(text)
    .split(/[\s,;]+/)
    .filter(Boolean)
  const good = []
  const bad = []
  for (const p of parts) {
    const d = normalizeDomain(p)
    if (d) {
      if (!good.includes(d)) good.push(d)
    } else bad.push(p)
  }
  return { good, bad }
}

/** All sites visible to the user: curated bundles plus custom sites. */
export function allSites(state) {
  const curated = BUNDLES.map((b) => ({ ...b, curated: true }))
  return [...curated, ...(state.customSites || []).map((s) => ({ ...s, curated: false }))]
}

export function findSite(state, id) {
  return allSites(state).find((s) => s.id === id) || null
}

export function domainsForSites(state, siteIds) {
  const out = new Set()
  for (const id of siteIds || []) {
    const site = findSite(state, id)
    if (site) site.domains.forEach((d) => out.add(d))
  }
  return [...out]
}

/** Is `host` (e.g. "m.youtube.com") covered by blocked domain `domain` ("youtube.com")? */
export function hostMatches(host, domain) {
  host = String(host).toLowerCase().replace(/\.$/, '')
  return host === domain || host.endsWith('.' + domain)
}
