// Comparing "1.2.3" style versions, for the web app to tell when the extension is older.

/** -1, 0 or 1. Missing parts count as 0, anything after a dash or plus is ignored. */
export function compareVersions(a, b) {
  const parts = (v) =>
    String(v ?? '')
      .split(/[-+]/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0)
    if (d) return d < 0 ? -1 : 1
  }
  return 0
}

/** True when `have` is a real version older than `want`. Unknown versions are never "older". */
export function isOlderVersion(have, want) {
  if (!have || !want || !/^\d/.test(String(have))) return false
  return compareVersions(have, want) < 0
}
