// Shared frontend logging utility with basic redaction.
// Avoid leaking mnemonics, private keys, raw tx hex, or passwords in console.

const REDACT_PATTERNS = [
  /mnemonic/i,
  /private/i,
  /secret/i,
  /token/i,
  /password/i,
  /seed/i,
  /key/i
]

function redactValue(v: any): any {
  if (v == null) return v
  if (typeof v === 'string') {
    if (REDACT_PATTERNS.some(r => r.test(v))) return '[REDACTED]'
    // Short-circuit long base64/hex blobs
    if (/^[0-9a-fA-F]{64,}$/.test(v)) return v.slice(0, 16) + '…(hex)' // truncate
    if (/^[A-Za-z0-9+/=]{80,}$/.test(v)) return v.slice(0, 12) + '…(b64)'
    return v
  }
  if (typeof v === 'object') {
    if (Array.isArray(v)) return v.map(redactValue)
    const out: Record<string, any> = {}
    for (const k of Object.keys(v)) {
      if (REDACT_PATTERNS.some(r => r.test(k))) { out[k] = '[REDACTED]' } else out[k] = redactValue(v[k])
    }
    return out
  }
  return v
}

function mapArgs(args: any[]): any[] { return args.map(redactValue) }

export const logger = {
  info: (...a: any[]) => console.log('[INFO]', ...mapArgs(a)),
  warn: (...a: any[]) => console.warn('[WARN]', ...mapArgs(a)),
  error: (...a: any[]) => console.error('[ERROR]', ...mapArgs(a))
}

export function attachGlobalLogger() {
  // Optionally override window.console with redacting variant (opt-in later)
  return logger
}
