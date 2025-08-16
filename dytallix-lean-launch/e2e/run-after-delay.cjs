// Wait for dev server then run Playwright tests once
const { spawn } = require('child_process')

async function delay(ms){ return new Promise(r=>setTimeout(r, ms)) }

(async () => {
  const waitMs = Number(process.env.E2E_WAIT_MS || 8000)
  console.log('[dev:test] Waiting', waitMs, 'ms before running E2E tests...')
  await delay(waitMs)
  console.log('[dev:test] Starting Playwright tests...')
  const pw = spawn('npx', ['playwright', 'test', '--config=e2e/playwright.config.ts'], { stdio: 'inherit' })
  pw.on('exit', (code) => {
    console.log('[dev:test] Playwright exited with code', code)
    process.exit(code)
  })
})()
