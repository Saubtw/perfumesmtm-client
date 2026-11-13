import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/catalog.json', import.meta.url), 'utf8'));
test.beforeEach(async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/api/v1/perfumes?*', route => route.fulfill({json:{items:catalog,total:catalog.length}}));
  await page.route('**/models/*.glb', route => route.abort());
});

for (const width of [1440,390]) test(`brand links navigate, track selection and survive filtering at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  await page.locator('#marca-armaf').scrollIntoViewIfNeeded();
  const link = page.getByRole('link',{name:'Ir a Lattafa',exact:true});
  await expect(link).toHaveCount(1);
  if (width >= 1200) await link.click();
  else await page.getByRole('combobox',{name:'Ir a una marca'}).selectOption({label:'Lattafa'});
  await expect.poll(() => page.locator('#marca-lattafa').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThan(width >= 1200 ? 40 : 100);
  await expect.poll(() => page.locator('#marca-lattafa').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeGreaterThan(width >= 1200 ? 8 : 64);
  await expect(link).toHaveAttribute('aria-current','location');
  if (width >= 1200) {
    await expect.poll(() => link.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(.98);
    const distant = page.getByRole('link',{name:'Ir a Dior',exact:true});
    await expect.poll(() => distant.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBeLessThan(.4);
    expect(await distant.evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
    await expect(page.locator('.brand-rail')).toHaveCount(1);
    await expect(page.locator('.brand-rail-right')).toHaveCount(0);
    const heading=page.locator('#marca-lattafa .brand-heading');
    const headingBounds=await heading.boundingBox();
    expect(headingBounds.width).toBeLessThan(400);
    expect(await heading.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await page.locator('.site-header').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(0);
  }
  await page.getByRole('searchbox').fill('Sauvage');
  await expect(page.locator('.product-item')).toHaveCount(1);
  await expect(page.locator('.catalog-shell')).not.toHaveClass(/has-brand-index/);
  await page.getByRole('searchbox').fill('');
  await expect(page.locator('.catalog-shell')).toHaveClass(/has-brand-index/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('soft focus entrances replay without fragments or spatial transforms', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  const card = page.locator('.product-item').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-entry-count','1');
  await page.waitForTimeout(800);
  expect(await card.evaluate(el => el.style.filter.includes('blur'))).toBe(true);
  expect(await card.evaluate(el => !el.style.transform)).toBe(true);
  await page.waitForTimeout(500);
  expect(await card.evaluate(el => !el.style.filter && !el.style.opacity)).toBe(true);
  await expect(page.locator('.entry-fragments')).toHaveCount(0);
  await page.locator('#marca-lattafa .product-item').last().scrollIntoViewIfNeeded();
  await expect(card).not.toHaveAttribute('data-entered');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-entry-count','2');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await card.evaluate(el => !el.style.transform && !el.style.opacity)).toBe(true);
  await page.getByRole('link',{name:'Ir a Lattafa',exact:true}).click();
  await expect(page.locator('.brand-title-link[aria-current]')).toHaveText('Lattafa');
});

test('original botanical hero is restored without video requests', async ({page}) => {
  const videos=[];
  page.on('request',request=>{if(request.url().includes('/videos/'))videos.push(request.url());});
  await page.goto('/');
  await expect(page.locator('.hero video')).toHaveCount(0);
  expect(await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('hero-botanical.png');
  expect(videos).toEqual([]);
});

test('wheel advances at the gentler pace without row locks or lost input', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  const group=page.locator('#marca-jean-paul-gaultier');
  await group.evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));
  await page.waitForTimeout(600);
  const initial=await page.evaluate(()=>scrollY);
  const card=group.locator('.product-visual').first();
  await card.hover();
  for(let i=0;i<5;i++){await page.mouse.wheel(0,120);await page.waitForTimeout(30);}
  await page.waitForTimeout(1300);
  const first=await page.evaluate(()=>scrollY);
  expect(first-initial).toBeGreaterThan(430);
  expect(first-initial).toBeLessThan(470);
  const title=group.locator('.brand-title-link');
  await expect(title).toHaveAttribute('aria-current','location');
  expect(await title.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(.98);
  const heading=await group.locator('.brand-heading').boundingBox();
  expect(heading.y).toBeGreaterThanOrEqual(15);
  expect(heading.y).toBeLessThan(30);
  await page.mouse.move(720,450);
  await page.mouse.wheel(0,120);
  await page.waitForTimeout(220);
  const further=await page.evaluate(()=>scrollY);
  expect(further-first).toBeGreaterThan(68);
  await page.mouse.wheel(0,-120);
  await page.waitForTimeout(600);
  expect(further-await page.evaluate(()=>scrollY)).toBeGreaterThan(68);
});

test('magnet adjusts only the last few pixels at a brand and leaves small wheel input free', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  const group=page.locator('#marca-jean-paul-gaultier');
  await group.evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+100,behavior:'instant'}));
  await page.waitForTimeout(400);
  const initial=await page.evaluate(()=>scrollY);
  await page.mouse.move(720,450);
  await page.mouse.wheel(0,12);
  await page.waitForTimeout(900);
  const moved=await page.evaluate(()=>scrollY);
  expect(moved-initial).toBeGreaterThanOrEqual(7);
  expect(moved-initial).toBeLessThanOrEqual(11);
  const target=await page.locator('#marca-lattafa').evaluate(el=>scrollY+el.getBoundingClientRect().top-24);
  await page.evaluate(top=>window.scrollTo({top:top-38,behavior:'instant'}),target);
  await page.waitForTimeout(400);
  await page.mouse.wheel(0,20);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(target-3);
  expect(Math.abs(await page.evaluate(()=>scrollY)-target)).toBeLessThanOrEqual(3);
});
