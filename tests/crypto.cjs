const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/crypto/markets?*', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('demo') !== '1') {
      return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Provider unavailable (test)' }) });
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5500/crypto');
  await page.getByRole('alert').waitFor();
  await page.getByLabel('Crypto data source').selectOption('demo');
  await page.getByText('Synthetic crypto prices').waitFor();
  await page.getByText('Coin holdings').waitFor();
  assert.equal(await page.getByText('Bitcoin price chart').count(), 1);
  await page.getByRole('button', { name: 'Paper trading' }).click();
  await page.getByText('Place a paper order').waitFor();
  await page.getByLabel('Order quantity').fill('0.01');
  await page.getByRole('button', { name: 'Review paper buy' }).click();
  await page.getByRole('button', { name: 'Confirm paper buy' }).click();
  await page.getByText(/Paper buy completed/).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('link', { name: 'Back to stock workspace' }).click();
  await page.locator('#tickerInput').waitFor();
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: crypto provider error, demo dashboard, paper trade, responsive layout, and stock navigation.');
})().catch(error => { console.error(error); process.exit(1); });
