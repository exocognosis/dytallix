import { logInfo, logError } from './logger.js'
import { createClient } from 'redis'

// Token-specific cooldown periods (in minutes)
const TOKEN_COOLDOWNS = {
  DGT: 24 * 60, // 24 hours
  DRT: 6 * 60   // 6 hours
}

// Rate Limiter Interface
class IRateLimiter {
  async checkAndConsume(key) {
    throw new Error('Not implemented')
  }
}

// In-memory rate limiter implementation
class InMemoryRateLimiter extends IRateLimiter {
  constructor() {
    super()
    this.store = new Map()
    this.cleanup()
  }

  async checkAndConsume(key) {
    const now = Date.now()
    const item = this.store.get(key)
    
    if (item && item > now) {
      const msLeft = item - now
      const secondsLeft = Math.ceil(msLeft / 1000)
      return {
        allowed: false,
        retryAfterSeconds: secondsLeft
      }
    }
    
    return { allowed: true }
  }

  async markGranted(key, cooldownMinutes) {
    const until = Date.now() + (cooldownMinutes * 60 * 1000)
    this.store.set(key, until)
    logInfo('InMemory cooldown set', { key, until: new Date(until).toISOString() })
  }

  cleanup() {
    // Clean up expired entries every 10 minutes
    setInterval(() => {
      const now = Date.now()
      for (const [key, expiry] of this.store.entries()) {
        if (expiry <= now) {
          this.store.delete(key)
        }
      }
    }, 10 * 60 * 1000)
  }
}

// Redis rate limiter implementation
class RedisRateLimiter extends IRateLimiter {
  constructor(redisUrl) {
    super()
    this.redisUrl = redisUrl
    this.redis = null
    this.fallback = new InMemoryRateLimiter()
    this.connectRedis()
  }

  async connectRedis() {
    try {
      this.redis = createClient({ url: this.redisUrl })
      
      this.redis.on('error', (err) => {
        logError('Redis client error', err)
      })
      
      this.redis.on('connect', () => {
        logInfo('Redis client connected')
      })
      
      this.redis.on('ready', () => {
        logInfo('Redis client ready')
      })
      
      await this.redis.connect()
      logInfo('Redis rate limiter connected', { url: this.redisUrl.replace(/\/\/.*@/, '//***@') })
    } catch (err) {
      logError('Redis connection failed, using in-memory fallback', err)
      this.redis = null
    }
  }

  async checkAndConsume(key) {
    if (!this.redis || !this.redis.isReady) {
      // Fallback to in-memory if Redis not available
      return this.fallback.checkAndConsume(key)
    }

    try {
      const ttl = await this.redis.ttl(key)
      if (ttl > 0) {
        return {
          allowed: false,
          retryAfterSeconds: ttl
        }
      }
      return { allowed: true }
    } catch (err) {
      logError('Redis check failed, allowing request', err)
      return { allowed: true }
    }
  }

  async markGranted(key, cooldownMinutes) {
    if (!this.redis || !this.redis.isReady) {
      return this.fallback.markGranted(key, cooldownMinutes)
    }

    try {
      const ttlSeconds = cooldownMinutes * 60
      await this.redis.setEx(key, ttlSeconds, 'granted')
      logInfo('Redis cooldown set', { key, ttlSeconds })
    } catch (err) {
      logError('Redis set failed', err)
      this.fallback.markGranted(key, cooldownMinutes)
    }
  }

  async disconnect() {
    if (this.redis && this.redis.isReady) {
      await this.redis.disconnect()
    }
  }
}

// Rate limiter factory
function createRateLimiter() {
  const redisUrl = process.env.DLX_RATE_LIMIT_REDIS_URL
  if (redisUrl) {
    logInfo('Using Redis rate limiter', { redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') })
    return new RedisRateLimiter(redisUrl)
  } else {
    logInfo('Using in-memory rate limiter')
    return new InMemoryRateLimiter()
  }
}

const rateLimiter = createRateLimiter()

function keyFor(ip, address, token) {
  return `faucet:${ip}:${address.toLowerCase()}:${token}`
}

export async function assertNotLimited(ip, address, token, defaultCooldownMinutes) {
  const cooldownMinutes = TOKEN_COOLDOWNS[token] || defaultCooldownMinutes
  const addressKey = keyFor(ip, address, token)
  const ipKey = `faucet:ip:${ip}:${token}`
  
  // Check both address and IP limits
  const [addressCheck, ipCheck] = await Promise.all([
    rateLimiter.checkAndConsume(addressKey),
    rateLimiter.checkAndConsume(ipKey)
  ])

  if (!addressCheck.allowed) {
    const err = new Error(`Rate limit exceeded for address. Try again in ${addressCheck.retryAfterSeconds} seconds.`)
    err.status = 429
    err.code = 'RATE_LIMITED'
    err.retryAfter = addressCheck.retryAfterSeconds
    err.token = token
    throw err
  }

  if (!ipCheck.allowed) {
    const err = new Error(`Rate limit exceeded for IP. Try again in ${ipCheck.retryAfterSeconds} seconds.`)
    err.status = 429
    err.code = 'RATE_LIMITED'
    err.retryAfter = ipCheck.retryAfterSeconds
    err.token = token
    throw err
  }
}

export async function markGranted(ip, address, token, defaultCooldownMinutes) {
  const cooldownMinutes = TOKEN_COOLDOWNS[token] || defaultCooldownMinutes
  const addressKey = keyFor(ip, address, token)
  const ipKey = `faucet:ip:${ip}:${token}`
  
  // Mark both address and IP as having used the faucet
  await Promise.all([
    rateLimiter.markGranted(addressKey, cooldownMinutes),
    rateLimiter.markGranted(ipKey, cooldownMinutes)
  ])
}
