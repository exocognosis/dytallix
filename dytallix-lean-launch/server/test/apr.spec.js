import http from 'http'
import app from '../../server/index.js'
import request from 'supertest'

// Simple mock node server to simulate /api/stats with adjustable payload
function makeMockNode(initial) {
  let payload = { ...initial }
  const srv = http.createServer((req, res) => {
    if (req.url === '/api/stats' || req.url === '/stats') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(payload))
    } else {
      res.writeHead(404)
      res.end('not found')
    }
  })
  return {
    start: () => new Promise(resolve => srv.listen(0, () => resolve(srv.address().port))),
    stop: () => new Promise(resolve => srv.close(() => resolve())),
    set: (next) => { payload = { ...payload, ...next } }
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
  test('returns non-constant value and changes with chain params', async () => {
    const node = makeMockNode({
      height: 100,
      staking: { total_stake: '1000000' },
      emission_pools: { staking_rewards: 0 },
      latest_emission: { total_emitted: '1000' }
    })
    const port = await node.start()

    await withNodeBase(port, async () => {
      // First call: no prior delta info -> fallback to latest_emission_pct
      let r1 = await request(app).get('/api/staking/apr').expect(200)
      const apr1 = r1.body.apr
      expect(typeof apr1).toBe('number')
      expect(apr1).toBeGreaterThan(0)

      // Change mocked total_emitted to force APR change (fallback path)
      node.set({ latest_emission: { total_emitted: '2000' } })
      let r2 = await request(app).get('/api/staking/apr').expect(200)
      const apr2 = r2.body.apr
      expect(apr2).toBeGreaterThan(apr1)

      // Now drive delta-based path by increasing staking_rewards pool and height
      node.set({
        height: 101,
        emission_pools: { staking_rewards: 500 },
      })
      let r3 = await request(app).get('/api/staking/apr').expect(200)
      const apr3 = r3.body.apr
      expect(r3.body.method).toBe('delta')
      expect(apr3).toBeGreaterThan(0)
    })

    await node.stop()
  })
})
