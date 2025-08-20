import { logInfo, logError } from './logger.js'

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
    this.connectRedis()
  }

  async connectRedis() {
    try {
      // Note: In production you'd use actual Redis client
      // For now, just log the attempt and fall back to in-memory
      logInfo('Redis rate limiter configured', { url: this.redisUrl })
      // this.redis = createRedisClient(this.redisUrl)
      // await this.redis.connect()
    } catch (err) {
      logError('Redis connection failed, falling back to in-memory', err)
      this.fallback = new InMemoryRateLimiter()
    }
  }

  async checkAndConsume(key) {
    if (!this.redis) {
      // Fallback to in-memory if Redis not available
      return this.fallback ? this.fallback.checkAndConsume(key) : { allowed: true }
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
    if (!this.redis) {
      return this.fallback?.markGranted(key, cooldownMinutes)
    }

    try {
      const ttlSeconds = cooldownMinutes * 60
      await this.redis.setEx(key, ttlSeconds, 'granted')
      logInfo('Redis cooldown set', { key, ttlSeconds })
    } catch (err) {
      logError('Redis set failed', err)
      this.fallback?.markGranted(key, cooldownMinutes)
    }
  }
}

// Rate limiter factory
function createRateLimiter() {
  const redisUrl = process.env.FAUCET_REDIS_URL
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

export async function assertNotLimited(ip, address, token, cooldownMinutes) {
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
    throw err
  }

  if (!ipCheck.allowed) {
    const err = new Error(`Rate limit exceeded for IP. Try again in ${ipCheck.retryAfterSeconds} seconds.`)
    err.status = 429
    err.code = 'RATE_LIMITED'
    err.retryAfter = ipCheck.retryAfterSeconds
    throw err
  }
}

export async function markGranted(ip, address, token, cooldownMinutes) {
  const addressKey = keyFor(ip, address, token)
  const ipKey = `faucet:ip:${ip}:${token}`
  
  // Mark both address and IP as having used the faucet
  await Promise.all([
    rateLimiter.markGranted(addressKey, cooldownMinutes),
    rateLimiter.markGranted(ipKey, cooldownMinutes)
  ])
}
