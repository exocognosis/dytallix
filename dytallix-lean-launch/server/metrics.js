import { register, Counter, collectDefaultMetrics } from 'prom-client'
import { logInfo } from './logger.js'

// Enable default Node.js metrics
collectDefaultMetrics()

// Faucet-specific metrics
export const rateLimitHitsTotal = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits (429 responses)',
  labelNames: ['token']
})

export const faucetRequestsTotal = new Counter({
  name: 'faucet_requests_total', 
  help: 'Total number of faucet requests',
  labelNames: ['token', 'outcome']
})

// Register metrics
register.registerMetric(rateLimitHitsTotal)
register.registerMetric(faucetRequestsTotal)

// Export registry for metrics endpoint
export { register }

logInfo('Prometheus metrics initialized')