import {test,expect} from '@playwright/test';
for (const width of [1440,390]) test(`notes preserve modal bounds and card motion reverses at ${width}px`,async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await page.getByRole('searchbox').fill('Sillage');
  const card=page.locator('.product-visual');
  await card.click();
  const dialog=page.locator('.detail-dialog');
  await expect(dialog).toHaveCSS('transform','none');
  const bounds=await dialog.boundingBox();
  const summary=page.locator('.detail-disclosure summary');
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.detail-disclosure-body')).toHaveCSS('opacity','1');
  expect(await dialog.boundingBox()).toEqual(bounds);
  await summary.click();
  await expect(page.locator('.detail-disclosure')).not.toHaveAttribute('open');
  expect(await dialog.boundingBox()).toEqual(bounds);
  await page.locator('#viewer-close').click();
  await expect(page.locator('#image-viewer')).toBeHidden();
  await expect(card).toBeFocused();
  await card.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#image-viewer')).toBeHidden();
});
test('118 references, botanical storefront, search, filters, ordering and modal',async({page})=>{
  await page.goto('/');await expect(page.locator('.product-item')).toHaveCount(12);
  await expect(page.locator('h1')).toContainText('Tu próxima');
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(250, 250, 247)');
  await page.getByRole('searchbox').fill('Sauvage');await expect(page.locator('.product-item')).toHaveCount(1);
  await page.locator('.product-detail-link').click();await expect(page.locator('.detail-title')).toHaveText('Sauvage Eau de Toilette');await expect(page.locator('.detail-smell')).not.toBeEmpty();
  await expect(page.locator('.viewer-image')).toHaveAttribute('src','/images/catalog/sauvage-eau-de-toilette.jpg');
  await expect(page.locator('.detail-notes')).toBeHidden();
  await page.getByText('Ver notas olfativas',{exact:true}).click();await expect(page.locator('.detail-notes')).toBeVisible();
  await page.keyboard.press('ArrowLeft');await expect(page.locator('.detail-notes')).toBeHidden();
  await page.keyboard.press('Escape');await expect(page.locator('#image-viewer')).toBeHidden();
  await page.getByRole('searchbox').fill('');await page.locator('[data-filter="femenino"]').click();await expect(page.locator('.product-item')).toHaveCount(12);
  await page.locator('[data-filter="all"]').click();await page.locator('.sort-trigger').click();await page.locator('[data-sort-value="az"]').click();await expect(page.locator('.product-item')).toHaveCount(12);
  const broken=await page.locator('.product-item img').evaluateAll(images=>images.filter(img=>img.complete&&img.naturalWidth===0).map(img=>img.src));expect(broken).toEqual([]);
});

test('compact Sillage detail remains readable on mobile with complete notes available',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#perfume=2');
  await expect(page.locator('.detail-smell')).toHaveText('Cítricos fríos y metálicos, almizcle limpio y maderas claras.');
  await expect(page.locator('.detail-family .detail-tag')).toHaveCount(4);
  await expect(page.locator('.detail-profile dd')).toHaveText(['muy alta','bajo','alta']);
  await expect(page.locator('.detail-occasion .detail-tag')).toHaveCount(4);
  await expect(page.locator('.detail-notes')).toBeHidden();
  await page.getByText('Ver notas olfativas',{exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('.detail-notes')).toBeVisible();await expect(page.locator('.detail-notes')).toContainText('bergamota, limón, lima');
  expect(await page.locator('.detail-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#image-viewer')).toBeHidden();
});
test('stable detail URL and mobile layout, keyboard chat and recoverable error',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#perfume=9');await expect(page.locator('.detail-title')).toHaveText('Asad');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Asesor de perfumes'}).click();await expect(page.locator('#advisor-panel')).toBeVisible();
  const input=page.locator('#advisor-input');await input.fill('Hola');await page.keyboard.press('Shift+Enter');await expect(input).toHaveValue('Hola\n');
  await input.fill('/');await expect(input).toBeFocused();
  await page.route('**/api/v1/chat/sessions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Asesor temporalmente no disponible.'}})}));
  await input.fill('Una recomendación');await page.keyboard.press('Enter');await expect(page.locator('.advisor-status')).toHaveText('Asesor temporalmente no disponible.');await expect(input).toHaveValue('Una recomendación');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#advisor-panel')).toBeHidden();
});
test('catalog API failure leaves page and retry usable',async({page})=>{
  await page.route('**/api/v1/perfumes?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar');await expect(page.getByRole('button',{name:'Volver a intentar'})).toBeVisible();await expect(page.locator('h1')).toBeVisible();
});
test('catalog advisor has reasoned cards, typing dots and no commerce controls',async({page})=>{
  await page.route('**/api/v1/chat/sessions',route=>route.fulfill({status:201,contentType:'application/json',body:'{"id":"browser-test"}'}));
  await page.route('**/api/v1/chat/sessions/browser-test/messages',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({contentType:'text/event-stream',body:'event: text\ndata: {"text":"Una opción fresca"}\n\nevent: complete\ndata: {"text":"Una opción fresca","recommendations":[{"id":"2","name":"Club de Nuit Sillage","image":"/images/catalog/clubdenuitsillage.webp","detail_url":"/#perfume=2","reason":"Sus notas cítricas encajan con un aroma fresco para el día."}],"follow_up":null}\n\n'});});
  await page.goto('/');await page.getByRole('button',{name:'Asesor de perfumes'}).click();await expect(page.locator('.advisor-suggestions button')).toHaveCount(6);await expect(page.locator('.advisor-panel header').getByRole('button',{name:'Nuevo chat'})).toBeVisible();
  await page.locator('#advisor-input').fill('Algo fresco');await page.keyboard.press('Enter');await expect(page.locator('.advisor-typing>span')).toHaveCount(3);
  await expect(page.locator('.advisor-product strong')).toHaveText('Club de Nuit Sillage');await expect(page.locator('.advisor-product p')).toContainText('cítricas');
  await expect(page.locator('.advisor-panel')).not.toContainText(/disponibilidad|stock|carrito|comprar/i);await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Recuperar historial'})).toHaveCount(0);
  await page.getByRole('link',{name:'Ver perfume',exact:true}).click();await expect(page.locator('.detail-title')).toHaveText('Club de Nuit Sillage');
});
test('detail body is legible and shares the exact supplied image with its catalog card',async({page})=>{
  await page.goto('/');await page.getByRole('searchbox').fill('Stronger With You Absolutely');const image=await page.locator('.product-item img').getAttribute('src');await page.locator('.product-detail-link').click();await expect(page.locator('.viewer-image')).toHaveAttribute('src',image);
  expect(await page.locator('.detail-phase p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
});
