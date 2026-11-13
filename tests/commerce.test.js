import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {promotions,createLine,cartTotals,restoreCart,whatsappUrl,fixedProducts,whatsappMessage} from '../src/commerce.js';

const prices=JSON.parse(readFileSync(new URL('./fixtures/pricing.json',import.meta.url),'utf8'));
const products=JSON.parse(readFileSync(new URL('./fixtures/catalog.json',import.meta.url),'utf8')).map(p=>({...p,id:String(p.id),price:prices.find(row=>row.source_id===p.id)?.price}));

test('118 unique price identities and all published promotions reconcile with real products',()=>{
  expect(prices).toHaveLength(118);expect(new Set(prices.map(p=>p.workbook_id)).size).toBe(118);
  expect(products.every(p=>Number.isInteger(p.price)&&p.price>=449&&p.price<=799)).toBe(true);
  expect(promotions).toHaveLength(8);
  expect(promotions.map(p=>fixedProducts(p,products).reduce((s,item)=>s+item.price,0)-p.price)).toEqual([199,199,199,199,448,348,547,298]);
  for(const promotion of promotions) {
    const selected=fixedProducts(promotion,products);
    expect(selected).toHaveLength(promotion.count);
    const line=createLine(selected.map(p=>p.id),products,promotion.id);
    expect(line).not.toBeNull();expect(line.price).toBe(promotion.price);expect(line.regular).toBeGreaterThan(line.price);
  }
  expect(createLine(['9','9'],products,'duo')).toBeNull();
  expect(createLine(['1'],products,'unknown')).toBeNull();
  expect(createLine(['missing'],products)).toBeNull();
  expect(whatsappUrl([])).toBeNull();
});

test('message includes actual quantities, accents, special characters and applied discounts without losing selections',()=>{
  const special={id:'special',name:'Éclat & L’Essence #1',brand:'Maison Test',price:599};
  const catalog=[...products,special];
  const single=createLine(['special'],catalog);single.quantity=2;
  const promo=promotions.find(p=>p.id==='pareja');
  const combo=createLine(fixedProducts(promo,catalog).map(p=>p.id),catalog,promo.id);combo.quantity=2;
  const lines=[single,combo];
  expect(cartTotals(lines)).toEqual({count:6,regular:3994,savings:398,total:3596});
  const url=whatsappUrl(lines,'María José');expect(url.startsWith('https://wa.me/528714750620?text=')).toBe(true);
  const message=new URL(url).searchParams.get('text');
  expect(message).toContain('Éclat & L’Essence #1');expect(message).toContain('Cantidad: 2');expect(message).toContain('NUEVO PEDIDO DE "María José"');expect(message).toContain('$3,596.00 MXN');expect(message).toContain('_Dúo en pareja · 2 combos_');expect(message).toContain('Ahorro: $398.00');
  expect(message).not.toMatch(/réplicas|envío|Hola,|Incluye:/i);expect(message).toContain('Quedo pendiente de la confirmación de mi pedido y ponernos de acuerdo con la entrega. Gracias.');
  expect(/\p{Extended_Pictographic}/u.test(message)).toBe(false);expect(lines).toHaveLength(2);
  const restored=restoreCart([{productIds:['special'],quantity:2,price:1}, {productIds:['special'],quantity:3}, {productIds:['missing'],quantity:1}, {productIds:['special'],quantity:-1}, null],catalog);
  expect(restored).toHaveLength(1);expect(restored[0].quantity).toBe(5);expect(restored[0].price).toBe(599);
});

test('only owner-configured compositions receive discounts and previous custom selections are preserved',()=>{
  const jasmine=products.find(p=>p.name==='Good Girl Jasmine Absolute');
  expect(createLine(Array(4).fill(jasmine.id),products,'cuatro')).toBeNull();
  const migrated=restoreCart([{productIds:Array(4).fill(jasmine.id),promotionId:'cuatro',quantity:1}],products);
  expect(migrated).toHaveLength(1);expect(migrated[0].quantity).toBe(4);expect(migrated[0].promotion).toBeUndefined();
  expect(cartTotals(migrated).savings).toBe(0);
  const offer=promotions.find(p=>p.id==='cuatro');
  const line=createLine(fixedProducts(offer,products).map(p=>p.id),products,'cuatro');
  expect(whatsappUrl([line],'  ')).toBeNull();
  const text=whatsappMessage([line],'Ana');
  expect(text.match(/Good Girl Eau de Parfum/g)).toHaveLength(1);expect(text).toContain('Cantidad: 1');expect(text).toContain('Ahorro: $547.00');expect(text).toContain('$1,999.00 MXN');
  expect(text).toContain('\n\n');expect(new URL(whatsappUrl([line],'Ana')).searchParams.get('text')).toBe(text);
  expect(whatsappMessage([line],'Ana\n*Prueba*')).toContain('NUEVO PEDIDO DE "Ana Prueba"');
});

for(const width of [1440,768,390,320]) test(`cart, bundles and WhatsApp work at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{window.checkoutCalls=[];window.open=(...args)=>{window.checkoutCalls.push(args);return null;};});
  await page.goto('/');await expect(page.locator('.product-item')).toHaveCount(118);
  expect(await page.locator('#promociones').evaluate(el=>el.compareDocumentPosition(document.querySelector('#coleccion'))&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
  await page.locator('#cart-open').click();
  await expect(page.locator('.checkout-button')).toBeDisabled();
  await page.keyboard.press('Escape');await expect(page.locator('.cart-dialog')).not.toBeVisible();
  await page.getByRole('searchbox').fill('Sauvage');await page.locator('.product-add[data-add-product]').click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await expect(page.locator('.cart-dialog')).toBeVisible();
  await page.getByRole('button',{name:'Aumentar cantidad'}).click();
  await expect(page.locator('.cart-grand-total dd')).toHaveText('$1,398.00');
  await page.locator('.checkout-button').click();
  await expect(page.locator('.customer-dialog')).toBeVisible();
  await page.locator('#customer-name').fill('María José');await page.getByRole('button',{name:'Continuar a WhatsApp'}).click();
  let calls=await page.evaluate(()=>window.checkoutCalls);
  expect(calls).toHaveLength(1);expect(calls[0][2]).toBe('noopener,noreferrer');expect(new URL(calls[0][0]).searchParams.get('text')).toContain('Cantidad: 2');
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await page.getByRole('button',{name:'Reducir cantidad'}).click();await expect(page.locator('.cart-grand-total dd')).toHaveText('$699.00');
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();await expect(page.locator('.checkout-button')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading',{name:'Combos',exact:true})).toBeVisible();
  await expect(page.locator('.combo-card')).toHaveCount(8);
  await expect(page.locator('.offer-builder,.perfume-choice,.perfume-menu')).toHaveCount(0);
  await page.locator('[data-fixed="duo"]').click();
  await expect(page.locator('.cart-dialog')).toBeVisible();await page.locator('.cart-close').click();
  await page.locator('[data-fixed="pareja"]').click();
  await expect(page.locator('.cart-count')).toHaveText('4');
  await expect(page.locator('.cart-grand-total dd')).toHaveText('$2,198.00');await expect(page.locator('.cart-savings dd')).toHaveText('−$398.00');
  await page.locator('.checkout-button').click();await page.getByRole('button',{name:'Continuar a WhatsApp'}).click();calls=await page.evaluate(()=>window.checkoutCalls);
  const message=new URL(calls[1][0]).searchParams.get('text');expect(message).toContain('NUEVO PEDIDO DE "María José"');expect(message).toContain('$2,198.00 MXN');expect(message).toContain('_Dúo esencial · 1 combo_');
  expect(await page.locator('.cart-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  const checkout=await page.locator('.checkout-button').boundingBox();expect(checkout.y+checkout.height).toBeLessThanOrEqual(900);
  await page.keyboard.press('Escape');await page.reload();
  await expect(page.locator('.cart-count')).toHaveText('4');await page.locator('#cart-open').click();await expect(page.locator('.cart-grand-total dd')).toHaveText('$2,198.00');
  await page.screenshot({path:`../docs/evidence/cart-${width}.png`});
  await page.keyboard.press('Escape');
  await page.locator('#promociones').scrollIntoViewIfNeeded();
  await page.screenshot({path:`../docs/evidence/promotions-${width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('cart handles corrupt storage and adds the actual product from its detail',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('mtm-cart-v1','{invalid'));
  await page.goto('/#perfume=9');
  await expect(page.locator('.detail-price')).toHaveText('$449.00 MXN');
  await page.locator('.detail-add').click();await expect(page.locator('.cart-count')).toHaveText('1');
  await expect(page.locator('#image-viewer')).toBeHidden();await expect(page.locator('.cart-dialog')).toBeVisible();
  await expect(page.locator('.cart-product-name')).toHaveText('Asad');
  await page.keyboard.press('Tab');expect(await page.locator('.cart-dialog').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#cart-open')).toBeFocused();
});

for(const width of [1440,390]) test(`cart product opens centered animated detail and returns to its row at ${width}px`,async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width,height:900});
  await page.goto('/');await page.getByRole('searchbox').fill('Sauvage');await page.locator('.product-add[data-add-product]').click();
  const row=page.locator('.cart-product');
  await expect(page.locator('.cart-dialog')).toHaveCSS('transform','none');
  const scroll=await page.evaluate(()=>scrollY);
  for(const target of ['img','.cart-product-name']) {
    await row.locator(target).click();await expect(page.locator('.detail-layer')).toBeVisible();
    await expect(page.locator('.detail-title')).toHaveText('Sauvage Eau de Toilette');await expect(page.locator('.detail-dialog')).toHaveCSS('transform','none');
    const bounds=await page.locator('.detail-dialog').boundingBox();expect(Math.abs(bounds.x+bounds.width/2-width/2)).toBeLessThan(2);
    if(target==='.cart-product-name') await page.locator('.detail-add').click();else await page.keyboard.press('Escape');
    await expect(page.locator('#image-viewer')).toBeHidden();await expect(page.locator('.cart-dialog')).toBeVisible();
    if(target==='img') await expect(row).toBeFocused();else await expect(page.locator('.cart-close')).toBeFocused();
    expect(await page.evaluate(()=>scrollY)).toBe(scroll);
  }
  await expect(page.locator('.cart-count')).toHaveText('2');
});

test('the eight fixed Excel offers have exact compositions and savings, and each adds its own package',async({page})=>{
  await page.goto('/');
  for(const offer of promotions) {
    const card=page.locator(`[data-combo="${offer.id}"]`);
    const items=fixedProducts(offer,products),regular=items.reduce((s,p)=>s+p.price,0);
    await expect(card.locator('.combo-contents li')).toHaveCount(offer.count);
    for(const p of items) await expect(card.locator('.combo-contents')).toContainText(p.name);
    await expect(card.locator('.combo-price strong')).toHaveText(`$${offer.price.toLocaleString('en-US')}.00`);
    await expect(card.locator('.combo-savings strong')).toHaveText(`$${regular-offer.price}`);
    await card.locator('[data-fixed]').click();
    if(offer!==promotions.at(-1)) await page.locator('.cart-close').click();
  }
  await expect(page.locator('.cart-line')).toHaveCount(8);
  await expect(page.locator('.cart-count')).toHaveText('21');
});

test('name step validates input, allows cancel and never opens WhatsApp before submit',async({page})=>{
  await page.addInitScript(()=>{window.checkoutCalls=[];window.open=(...args)=>window.checkoutCalls.push(args);});
  await page.goto('/');await page.locator('[data-fixed="pareja"]').click();await page.locator('.checkout-button').click();
  expect(await page.evaluate(()=>window.checkoutCalls)).toHaveLength(0);await page.locator('#customer-name').fill('   ');await page.getByRole('button',{name:'Continuar a WhatsApp'}).click();
  expect(await page.evaluate(()=>window.checkoutCalls)).toHaveLength(0);await expect(page.locator('.customer-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('.cart-dialog')).toBeVisible();await expect(page.locator('.checkout-button')).toBeFocused();await expect(page.locator('.cart-count')).toHaveText('2');
});
