#!/usr/bin/env node
// Simple headless screenshot helper using Puppeteer
const url = process.argv[2]
const out = process.argv[3] || 'screenshot.png'
if (!url) { console.error('usage: node screenshot.js <url> <out.png>'); process.exit(1) }

async function main() {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    page.setViewport({ width: 1280, height: 800 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{})
    // Hint: try to ensure JSON blob and badge render
    await page.waitForTimeout(1500)
    await page.screenshot({ path: out, fullPage: true })
    console.log('Saved screenshot:', out)
  } finally {
    await browser.close()
  }
}

main().catch((e)=>{ console.error(e); process.exit(1) })

