import { test, expect } from './fixtures/storefront.js';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/catalog.json', import.meta.url), 'utf8'));
const reply = route => route.fulfill({ json: { items: catalog, total: catalog.length } });

test('startup releases the page within two seconds while the API is still pending', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const requestedModels = new Set();
  page.on('request', request => { if (request.url().includes('/models/hero-')) requestedModels.add(request.url()); });
  await page.route('**/api/v1/perfumes?*', async route => { await gate; await reply(route); });
  await page.route('**/models/*.glb', async route => { await gate; await route.abort(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.startup-loader')).toBeVisible();
  const elapsed = await page.evaluate(() => new Promise(resolve => {
    window.addEventListener('startup-complete', () => resolve(performance.now()), { once: true });
  }));
  expect(elapsed).toBeGreaterThanOrEqual(1150);
  expect(elapsed).toBeLessThan(2000);
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.locator('.product-item').count()).toBe(0);
  // The photographic hero no longer downloads the old 3D scene.
  expect(requestedModels.size).toBe(0);
  release();
  await expect(page.locator('.product-item')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
});

test('smooth wheel scrolling preserves dialogs and switches off with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/v1/perfumes?*', reply);
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await page.mouse.move(100, 350);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  await page.locator('.product-detail-link').first().click();
  await expect(page.locator('.detail-layer')).toBeVisible();
  const position = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-layer')).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});

test('model failures do not leave a permanent loading screen', async ({ page }) => {
  await page.route('**/api/v1/perfumes?*', reply);
  await page.route('**/models/*.glb', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  await expect(page.locator('.product-item')).toHaveCount(12);
  await expect(page.getByRole('searchbox')).toBeVisible();
});
