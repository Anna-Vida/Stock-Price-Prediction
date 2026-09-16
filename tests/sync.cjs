const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.addInitScript(() => {
    window.testCloud = { fail: true, delay: 0, writes: [] };
    const client = {
      from(table) {
        return {
          select() { return { eq: async (_key, user) => ({ data: table === 'favorites' ? [{ symbol: 'AAPL' }] : [{ symbol: 'NVDA', note: `Server note for ${user}`, target: null, alert: null }] }) }; },
          async upsert(row) {
            await new Promise(resolve => setTimeout(resolve, window.testCloud.delay));
            if (window.testCloud.fail) return { error: { message: 'Offline (test)' } };
            window.testCloud.writes.push({ table, row });
            return { error: null };
          },
          delete() { return { eq: () => ({ eq: async () => ({ error: window.testCloud.fail ? { message: 'Offline (test)' } : null }) }) }; }
        };
      },
      auth: {
        onAuthStateChange(callback) { callback('INITIAL_SESSION', { user: { id: 'test-user-1' } }); },
        async signOut() { return { error: null }; }
      }
    };
    window.supabase = { createClient: () => client };
  });
  await page.route('**/api/quote?*', async route => {
    const url = new URL(route.request().url());
    url.searchParams.set('demo', '1');
    await route.continue({ url: url.href });
  });
  await page.goto('http://127.0.0.1:5500');
  await page.locator('#research').waitFor({ state: 'visible' });
  await page.waitForFunction(() => state.user?.id === 'test-user-1' && hydratingUserId === null);
  await page.click('#favoriteButton');
  await page.fill('#noteText', 'Keep this offline edit');
  await page.click('#notesForm button[type="submit"]');
  await page.waitForFunction(() => !syncFlights.size);
  assert.equal(await page.evaluate(() => state.pending.notes.NVDA.note), 'Keep this offline edit');
  await page.reload();
  await page.locator('#research').waitFor({ state: 'visible' });
  await page.waitForFunction(() => state.user?.id === 'test-user-1' && hydratingUserId === null && !syncFlights.size);
  assert.equal(await page.inputValue('#noteText'), 'Keep this offline edit');
  assert.equal(await page.evaluate(() => state.favorites.includes('NVDA')), true);
  await page.evaluate(async () => { window.testCloud.fail = false; await syncPending(); });
  assert.equal(await page.evaluate(() => Object.keys(state.pending.notes).length), 0);
  assert.equal(await page.evaluate(() => window.testCloud.writes.some(w => w.row.note === 'Keep this offline edit')), true);

  // Newer edits must survive an acknowledgement for an older in-flight write.
  await page.evaluate(() => { window.testCloud.delay = 250; });
  await page.fill('#noteText', 'First version');
  await page.click('#notesForm button[type="submit"]');
  await page.fill('#noteText', 'Latest version');
  await page.click('#notesForm button[type="submit"]');
  await page.waitForFunction(() => !syncFlights.size);
  assert.equal(await page.evaluate(() => state.pending.notes.NVDA.note), 'Latest version');
  await page.evaluate(async () => { window.testCloud.delay = 0; await syncPending(); });
  assert.equal(await page.evaluate(() => window.testCloud.writes.at(-1).row.note), 'Latest version');

  // Failed removals are preserved as tombstones across remote hydration.
  await page.evaluate(() => { window.testCloud.fail = true; });
  await page.fill('#tickerInput', 'AAPL');
  await page.click('#searchForm button');
  await page.locator('#research').waitFor({ state: 'visible' });
  await page.click('#favoriteButton');
  await page.waitForFunction(() => !syncFlights.size);
  await page.evaluate(async () => { await applySession(null); await applySession({ user: { id: 'test-user-1' } }); });
  assert.equal(await page.evaluate(() => state.favorites.includes('AAPL')), false);
  assert.equal(await page.evaluate(() => state.pending.favorites.AAPL), false);

  // Pending changes belong to their original account only.
  await page.evaluate(async () => { await applySession({ user: { id: 'test-user-2' } }); });
  assert.equal(await page.evaluate(() => Object.keys(state.pending.favorites).length), 0);
  assert.equal(await page.evaluate(() => state.notes.NVDA.note), 'Server note for test-user-2');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: offline edits survive reload, retry succeeds, older writes preserve newer edits, removal tombstones and account isolation.');
})().catch(error => { console.error(error); process.exit(1); });
