import {test,expect} from '@playwright/test';

for(const width of [1440,390,320]) test(`promotion filters and pricing remain clear at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/');
  await expect(page.locator('.combo-card')).toHaveCount(8);
  for(const [count,total] of [[2,4],[3,3],[4,1],[0,8]]) {
    const filter=page.locator(`[data-combo-filter="${count}"]`);
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.combo-card:visible')).toHaveCount(total);
    await expect(page.locator('.combo-results')).toContainText(`${total} ${total===1?'combo':'combos'}`);
  }
  const card=page.locator('.combo-card').first();
  await expect(card.locator('.combo-offer-strip')).toContainText('Ahorras $199.00');
  await expect(card.locator('.combo-price strong')).toHaveText('$999.00');
  await expect(card.locator('.combo-price-preview')).toHaveCount(0);
  if(width<=620) expect((await card.boundingBox()).height).toBeLessThan(500);
  await page.locator('#promociones').scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`../docs/evidence/promotion-refresh-${width}.png`});
});

for(const width of [1440,390]) test(`every promotion product opens its own detail and returns focus at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  const products=page.locator('[data-combo-product]');
  await expect(products).toHaveCount(21);
  for(let i=0;i<await products.count();i++) {
    const product=products.nth(i);
    const name=await product.locator('strong').textContent();
    const id=await product.getAttribute('data-combo-product');
    await product.locator('img').click();
    const position=await page.evaluate(()=>scrollY);
    await expect(page.locator('.detail-title')).toHaveText(name);
    await expect(page.locator('.detail-add')).toHaveAttribute('data-add-product',id);
    await page.keyboard.press('Escape');
    await expect(page.locator('.detail-layer')).not.toBeVisible();
    await expect(product).toBeFocused();
    expect(await page.evaluate(()=>scrollY)).toBe(position);
  }
  await expect(page.locator('.cart-count')).toHaveText('0');
  await products.first().focus();await page.keyboard.press('Enter');
  await page.locator('.detail-add').click();
  await expect(page.locator('.cart-dialog')).toBeVisible();
  await expect(page.locator('.cart-product-name')).toHaveText('Cloud');
  await expect(page.locator('.cart-count')).toHaveText('1');
});
