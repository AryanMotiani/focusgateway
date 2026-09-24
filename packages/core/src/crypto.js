// PIN + recovery-code hashing with PBKDF2-SHA256 via WebCrypto (works in browsers,
// extension service workers and Node 18+).
const ITERATIONS = 150_000
const subtle = () => globalThis.crypto.subtle

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)))
}

export function randomBytes(n) {
  const a = new Uint8Array(n)
  globalThis.crypto.getRandomValues(a)
  return a
}

export function randomId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID()
  return toHex(randomBytes(16))
}

async function derive(secret, salt, iterations) {
  const key = await subtle().importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return toHex(bits)
}

export async function hashSecret(secret, iterations = ITERATIONS) {
  const salt = randomBytes(16)
  return { salt: toHex(salt), hash: await derive(secret, salt, iterations), iterations }
}

export async function verifySecret(secret, record) {
  if (!record || typeof secret !== 'string') return false
  const h = await derive(secret, fromHex(record.salt), record.iterations || ITERATIONS)
  // constant-time compare
  let diff = h.length ^ record.hash.length
  for (let i = 0; i < Math.min(h.length, record.hash.length); i++) diff |= h.charCodeAt(i) ^ record.hash.charCodeAt(i)
  return diff === 0
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export function generateRecoveryCode() {
  const bytes = randomBytes(16)
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
  return chars.match(/.{4}/g).join('-')
}

export function normalizeRecoveryCode(code) {
  return (
    String(code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .match(/.{1,4}/g)
      ?.join('-') || ''
  )
}

export function randomToken() {
  return toHex(randomBytes(24))
}
