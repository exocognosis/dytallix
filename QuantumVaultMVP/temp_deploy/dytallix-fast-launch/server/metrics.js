import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client'
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

export const aiOracleRequestsTotal = new Counter({
  name: 'ai_oracle_requests_total',
  help: 'AI oracle proxy requests observed by the server',
  labelNames: ['result']
})

export const aiOracleFailuresTotal = new Counter({
  name: 'ai_oracle_failures_total',
  help: 'Failures when proxying to the AI oracle microservice',
  labelNames: ['reason']
})

export const aiOracleLatencySeconds = new Histogram({
  name: 'ai_oracle_latency_seconds',
  help: 'Latency for AI oracle proxy calls in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 3]
})

// Register metrics
register.registerMetric(rateLimitHitsTotal)
register.registerMetric(faucetRequestsTotal)
register.registerMetric(aiOracleRequestsTotal)
register.registerMetric(aiOracleFailuresTotal)
register.registerMetric(aiOracleLatencySeconds)

// Export registry for metrics endpoint
export { register }

logInfo('Prometheus metrics initialized')
