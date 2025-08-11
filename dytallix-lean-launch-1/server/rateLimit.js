import { logInfo } from './logger.js'

const store = new Map()

function keyFor(ip, address, token) {
  return `${ip}:${address.toLowerCase()}:${token}`
}

export function assertNotLimited(ip, address, token, cooldownMinutes) {
  const key = keyFor(ip, address, token)
  const now = Date.now()
  const item = store.get(key)
  if (item && item > now) {
    const msLeft = item - now
    const minutesLeft = Math.ceil(msLeft / 60000)
    const err = new Error(`Rate limit exceeded. Try again in ${minutesLeft} minutes.`)
    err.status = 429
    err.code = 'RATE_LIMITED'
    err.retryAfter = minutesLeft
    throw err
  }
}

export function markGranted(ip, address, token, cooldownMinutes) {
  const key = keyFor(ip, address, token)
  const until = Date.now() + (cooldownMinutes * 60 * 1000)
  store.set(key, until)
  logInfo('Cooldown set', { key, until })
}
