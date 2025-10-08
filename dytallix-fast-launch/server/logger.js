import morgan from 'morgan'

// Redaction helper: mask common secret fields in nested objects
function redactReplacer() {
  const SECRET_KEYS = new Set([
    'password', 'pass', 'secret', 'seed', 'mnemonic', 'privateKey', 'sk',
    'ciphertext', 'iv', 'salt', 'auth', 'authorization', 'bearer', 'apiKey', 'accessToken', 'refreshToken'
  ])
  return function (key, value) {
    if (!key) return value // root
    const k = key.toString().toLowerCase()
    if (SECRET_KEYS.has(k)) return '[REDACTED]'
    if (k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('private')) return '[REDACTED]'
    return value
  }
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, redactReplacer())
  } catch {
    return String(obj)
  }
}

// Minimal single-line sanitizer for log output
function oneline(str) {
  return String(str).replace(/[\r\n]+/g, ' ').slice(0, 10_000)
}

// Format: method url status response-time - remote-addr user-agent
export const requestLogger = morgan(':method :url :status :response-time ms - :remote-addr :user-agent')

export function logInfo(...args) {
  // eslint-disable-next-line no-console
  console.log('[INFO]', new Date().toISOString(), ...args.map(a => typeof a === 'object' ? oneline(safeStringify(a)) : oneline(a)))
}

export function logWarn(...args) {
  // eslint-disable-next-line no-console
  const mapped = args.map(a => (typeof a === 'object' ? oneline(safeStringify(a)) : oneline(a)))
  console.warn('[WARN]', new Date().toISOString(), ...mapped)
}

export function logError(...args) {
  // eslint-disable-next-line no-console
  const mapped = args.map(a => {
    if (a instanceof Error) {
      const { name, message, stack, code, status } = a
      return oneline(safeStringify({ name, message, code, status, stack }))
    }
    return typeof a === 'object' ? oneline(safeStringify(a)) : oneline(a)
  })
  console.error('[ERROR]', new Date().toISOString(), ...mapped)
}
