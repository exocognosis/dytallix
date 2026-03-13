import fetch from 'node-fetch'
import { spawn } from 'child_process'
import path from 'path'

const proxyPath = path.resolve(process.cwd(), 'api-proxy.js')
let child

beforeAll(async () => {
  child = spawn('node', [proxyPath], { stdio: 'inherit', env: { ...process.env, PORT:'8899' } })
  // wait for server
  await new Promise(r => setTimeout(r, 1500))
})

afterAll(()=> { if(child) child.kill() })

test('overview endpoint returns required keys', async () => {
  const r = await fetch('http://localhost:8899/api/overview')
  expect(r.status).toBe(200)
  const j = await r.json()
  for(const k of ['height','tps','blockTime','peers']){ expect(j).toHaveProperty(k) }
})

test('timeseries endpoint rejects invalid metric', async () => {
  const r = await fetch('http://localhost:8899/api/timeseries?metric=foo')
  expect(r.status).toBe(400)
})
