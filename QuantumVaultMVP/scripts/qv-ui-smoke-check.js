const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const out = {
    url: '',
    hasPqcTab: false,
    logoNaturalWidth: 0,
    tooltipBoxVisible: false,
    tooltipTextVisible: false,
    tooltipRect: null,
  };

  await page.goto('https://dytallix.com/QuantumVaultMVP/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type=email]', 'admin@quantumvault.local');
  await page.fill('input[type=password]', 'QuantumVault2024!');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(4500);

  out.url = page.url();
  out.hasPqcTab = (await page.locator('text=PQC Asset Pipeline').count()) > 0;

  out.logoNaturalWidth = await page.evaluate(() => {
    const img = document.querySelector('img[alt="QuantumVault"]');
    return img ? img.naturalWidth : 0;
  });

  const hndl = page.locator('text=HNDL').first();
  if ((await hndl.count()) > 0) {
    await hndl.hover();
    await page.waitForTimeout(400);

    out.tooltipBoxVisible = (await page.locator('.quantum-tooltip .rounded-lg').count()) > 0;
    out.tooltipTextVisible = (await page.locator('text=Harvest Now, Decrypt Later').count()) > 0;
    out.tooltipRect = await page.evaluate(() => {
      const el = document.querySelector('.quantum-tooltip .rounded-lg');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  }

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
