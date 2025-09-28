import http from 'http'
import app from '../../server/index.js'
import request from 'supertest'

function deepMerge(target, update) {
  const base = (target && typeof target === 'object' && !Array.isArray(target)) ? target : {}
  const result = { ...base }
  for (const [key, value] of Object.entries(update || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(base[key], value)
    } else {
      result[key] = value
    }
  }
  return result
}

// Simple mock node server to simulate /api/stats and /api/rewards/:height with adjustable payloads
function makeMockNode(initial = {}) {
  const initialStats = initial.stats ? initial.stats : initial
  const initialRewards = initial.rewards || {}
  let stats = deepMerge({}, initialStats)
  const rewards = new Map()
  for (const [height, event] of Object.entries(initialRewards)) {
    if (event != null) rewards.set(String(height), event)
  }

  const srv = http.createServer((req, res) => {
    if (req.url === '/api/stats' || req.url === '/stats') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(stats))
      return
    }
    const match = req.url?.match(/^\/api\/rewards\/(\d+)/)
    if (match) {
      const event = rewards.get(match[1])
      if (!event) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'not found' }))
      } else {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(event))
      }
      return
    }
    res.writeHead(404)
    res.end('not found')
  })

  return {
    start: () => new Promise(resolve => srv.listen(0, () => resolve(srv.address().port))),
    stop: () => new Promise(resolve => srv.close(() => resolve())),
    set: (update = {}) => {
      const { stats: nextStats, rewards: nextRewards, ...legacy } = update
      const statsUpdate = nextStats || (Object.keys(legacy).length > 0 ? legacy : undefined)
      if (statsUpdate) {
        stats = deepMerge(stats, statsUpdate)
      }
      if (nextRewards) {
        for (const [height, event] of Object.entries(nextRewards)) {
          const key = String(height)
          if (event == null) {
            rewards.delete(key)
          } else {
            rewards.set(key, event)
          }
        }
      }
    }
  }
}

// Helper to point API server to the mock node
function withNodeBase(port, fn) {
  const prev = process.env.RPC_HTTP_URL
  process.env.RPC_HTTP_URL = `http://127.0.0.1:${port}`
  return Promise.resolve()
    .then(fn)
    .finally(() => { process.env.RPC_HTTP_URL = prev })
}

describe('staking APR endpoint', () => {
  test('derives APR from node state and responds to parameter changes', async () => {
    const node = makeMockNode({
      stats: {
        height: 100,
        staking: { total_stake: '1000000000' },
        emission_pools: { staking_rewards: '100' },
        latest_emission: { height: 100, total_emitted: '400' }
      },
      rewards: {
        100: {
          height: 100,
          total_emitted: '400',
          pools: { staking_rewards: '150' }
        }
      }
    })
    const port = await node.start()

    try {
      await withNodeBase(port, async () => {
        const r1 = await request(app).get('/api/staking/apr').expect(200)
        const apr1 = r1.body.apr
        expect(r1.body.method).toBe('emission_event')
        expect(typeof apr1).toBe('number')
        expect(apr1).toBeGreaterThan(0)

        node.set({
          rewards: {
            100: { height: 100, total_emitted: '400', pools: { staking_rewards: '300' } }
          }
        })
        const r2 = await request(app).get('/api/staking/apr').expect(200)
        const apr2 = r2.body.apr
        expect(apr2).toBeGreaterThan(apr1)

        node.set({
          stats: {
            height: 101,
            emission_pools: { staking_rewards: '800' },
            latest_emission: { height: 101, total_emitted: '400' }
          },
          rewards: { 100: null, 101: null }
        })
        const r3 = await request(app).get('/api/staking/apr').expect(200)
        expect(r3.body.method).toBe('delta')
        expect(r3.body.apr).toBeGreaterThan(0)
        expect(r3.body.apr).not.toBe(apr2)
      })
    } finally {
      await node.stop()
    }
  })
})
