import {test,expect} from '@playwright/test';
for(const width of [1440,390,320]) test(`compact offers, custom sorting and global price order at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.getByRole('heading',{name:'Tu próxima fragancia.'})).toBeVisible();
  expect(await page.locator('.hero-title-fill').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
  await expect(page.locator('.combo-card')).toHaveCount(8);
  await expect(page.locator('.combo-card').first()).toContainText('Total del combo · MXN');
  await expect(page.locator('.filters')).toContainText('Hombre');await expect(page.locator('.filters')).toContainText('Mujer');await expect(page.locator('.filters')).not.toContainText(/unisex|Él|Ella/);
  await page.locator('[data-filter="masculino"]').click();await expect(page.locator('#result-count')).toContainText('de 86 perfumes');
  await page.locator('[data-filter="femenino"]').click();await expect(page.locator('#result-count')).toContainText('de 32 perfumes');
  await page.locator('[data-filter="all"]').click();
  for(const order of ['price-asc','price-desc']) {
    await page.locator('.sort-trigger').click();await expect(page.locator('.sort-menu')).toBeVisible();await page.locator(`[data-sort-value="${order}"]`).click();
    await expect(page.locator('.sort-menu')).not.toBeVisible();await expect(page.locator('.sort-trigger')).toBeFocused();
    const prices=await page.locator('.product-item .product-price').evaluateAll(els=>els.map(el=>Number(el.textContent.replace(/[^\d.]/g,''))));
    expect(prices).toHaveLength(width<=620?4:12);expect(prices).toEqual([...prices].sort((a,b)=>(a-b)*(order==='price-asc'?1:-1)));
  }
  await page.locator('.sort-trigger').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(page.locator('.sort-trigger')).toHaveText('Selección');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(await page.evaluate(()=>CSS.supports('scrollbar-color','#91958b #f3f4ee'))) expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarColor)).toContain('145, 149, 139');
  await page.locator('.sort-trigger').click();
  const menuBounds=await page.locator('.sort-menu').boundingBox();
  expect(menuBounds.width).toBeLessThanOrEqual(272);
  expect(menuBounds.height).toBeLessThan(260);
  const iconBounds=await page.locator('.sort-menu button>svg').first().boundingBox();
  expect(iconBounds.width).toBe(16);expect(iconBounds.height).toBe(16);
  await page.keyboard.press('Escape');
});

test('adding from a direct product link closes its modal and opens the cart once',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#perfume=9');
  await page.locator('.detail-add').click();
  await expect(page.locator('#image-viewer')).toBeHidden();await expect(page.locator('.detail-layer')).not.toBeVisible();await expect(page.locator('.cart-dialog')).toBeVisible();
  await expect(page.locator('.cart-product-name')).toHaveText('Asad');await expect(page.locator('.cart-count')).toHaveText('1');
  await page.locator('.cart-close').click();await expect(page.locator('.cart-dialog')).not.toBeVisible();
});
