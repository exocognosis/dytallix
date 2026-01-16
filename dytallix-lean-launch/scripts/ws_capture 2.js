#!/usr/bin/env node
// WebSocket evidence capture script (ESM)
import fs from 'fs'
import path from 'path'
import { WebSocket } from 'ws'

const HOST = process.env.METRICS_WS_HOST || 'ws://localhost:4000/api/ws'
const LIMIT = Number(process.env.WS_CAPTURE_LIMIT || 5)
const __dirname = path.dirname(new URL(import.meta.url).pathname)
const outDir = path.resolve(__dirname, '../launch-evidence/metrics-dashboard')
const iso = new Date().toISOString().replace(/[:]/g, '-')
const outFile = path.join(outDir, `ws_capture_${iso}.txt`)

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const ws = new WebSocket(HOST)
let count = 0
const lines = []
const timeoutMs = Number(process.env.WS_CAPTURE_TIMEOUT_MS || 15000)
let finished = false

function finish(exitCode){
  if(finished) return
  finished = true
  try { fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8') } catch(e){ console.error('Write fail:', e) }
  console.log(`Captured ${count} overview messages -> ${outFile}`)
  try { ws.close() } catch {}
  process.exit(exitCode)
}

const timeout = setTimeout(()=> finish(count>0?0:2), timeoutMs)

ws.on('open', () => console.log('WS connected', HOST))
ws.on('message', (buf) => {
  let msg
  try { msg = JSON.parse(buf.toString()) } catch { return }
  if (msg.type === 'overview' && msg.data) {
    lines.push(JSON.stringify(msg))
    count++
    if (count >= LIMIT) {
      clearTimeout(timeout)
      finish(count>0?0:2)
    }
  }
})
ws.on('error', (e) => { console.error('WS error', e.message); finish(2) })
ws.on('close', () => { if(!finished) finish(count>0?0:2) })
