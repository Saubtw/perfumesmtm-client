import {test,expect} from '@playwright/test';

for(const width of [1440,1024,390]) test(`all brands remain reachable without a long brand index at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  const brands=page.getByRole('group',{name:'Filtrar por marca'});
  await expect(brands).toBeVisible();
  const originals=brands.locator('.brand-logo-group:not([aria-hidden])');
  await expect(originals.locator('button')).toHaveCount(30);
  await expect(originals.locator('img')).toHaveCount(29);
  const boxes=await originals.locator('.brand-logo-button').evaluateAll(buttons=>buttons.slice(0,3).map(button=>({top:button.offsetTop,left:button.offsetLeft})));
  expect(boxes[0].left).toBe(boxes[1].left);
  expect(boxes[1].top).toBeGreaterThan(boxes[0].top);
  expect(boxes[2].left).toBeGreaterThan(boxes[0].left);
  await expect(page.getByRole('combobox',{name:'Filtrar por marca'})).toHaveCount(0);
  await page.locator('.brand-explorer').scrollIntoViewIfNeeded();
  await page.screenshot({path:`../docs/evidence/brand-explorer-${width}.png`});
  for(const brand of ['Lattafa','Dior']) {
    await page.getByRole('button',{name:`Ver perfumes de ${brand}`,exact:true}).click();
    await expect(page.getByRole('button',{name:`Ver perfumes de ${brand}`,exact:true})).toHaveAttribute('aria-pressed','true');
    for(const house of await page.locator('.product-house').allTextContents()) expect(house).toBe(brand);
    await expect(page.locator('.product-item').first()).toBeVisible();
    await expect(page.getByRole('button',{name:`Quitar filtro de ${brand}`,exact:true})).toBeVisible();
  }
  await page.getByRole('button',{name:'Quitar filtro de Dior',exact:true}).click();
  await expect(page.locator('.brand-filter-clear')).toBeHidden();
  await expect(page.locator('#result-count')).toContainText('de 118 perfumes');
  await page.getByRole('searchbox').fill('Sauvage');
  await expect(page.locator('.product-item')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('desktop band pauses on hover and resumes immediately without an idle timer',async({page})=>{
  test.setTimeout(45000);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const section=page.locator('.brand-explorer'),track=page.locator('.brand-logo-track');
  await section.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
  await expect(section).toHaveAttribute('data-motion','running',{timeout:10000});
  const belt=page.locator('.brand-logo-belt');
  const offset=()=>belt.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
  const initial=await offset();
  await expect.poll(offset).toBeLessThan(initial-4);
  await track.hover();await expect(section).toHaveAttribute('data-motion','paused');
  const paused=await offset();await page.waitForTimeout(400);
  expect(await offset()).toBe(paused);
  await page.mouse.wheel(180,0);
  await expect(section).toHaveAttribute('data-motion','paused');
  await page.waitForTimeout(400);
  const manual=await track.evaluate(el=>el.scrollLeft);await page.waitForTimeout(300);
  expect(await track.evaluate(el=>el.scrollLeft)).toBe(manual);
  await page.mouse.move(0,0);await page.locator('#search-input').focus();
  await expect(section).toHaveAttribute('data-motion','running',{timeout:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(section).toHaveAttribute('data-motion','reduced');
});

test('every supplied logo loads, arrows scroll and Valentino includes both lines',async({page})=>{
  await page.goto('/');
  const track=page.locator('.brand-logo-track');
  const originals=track.locator('.brand-logo-group:not([aria-hidden])');
  await expect(originals.locator('img')).toHaveCount(29);
  for(const img of await originals.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await page.getByRole('button',{name:'Ver todas las marcas',exact:true}).focus();
  await expect(page.getByRole('button',{name:'Más marcas',exact:true})).toBeEnabled();
  const start=await track.evaluate(el=>el.scrollLeft);
  const initialOffset=await page.locator('.brand-logo-belt').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
  await page.getByRole('button',{name:'Más marcas',exact:true}).click();
  await expect.poll(()=>page.locator('.brand-logo-belt').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41)).not.toBe(initialOffset);
  expect(await track.evaluate(el=>el.scrollLeft)).toBe(start);
  await page.getByRole('button',{name:'Ver perfumes de Valentino',exact:true}).click();
  expect(new Set(await page.locator('.product-house').allTextContents())).toEqual(new Set(['Valentino Donna','Valentino Uomo']));
  await page.locator('.brand-explorer').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Ver todas las marcas',exact:true}).click();
  await page.screenshot({path:'../docs/evidence/brand-explorer-desktop.png'});
});

test('supplied botanical photograph remains the hero without video requests',async({page})=>{
  const videos=[];page.on('request',request=>{if(request.url().includes('/videos/'))videos.push(request.url());});
  await page.goto('/');await expect(page.locator('.hero video')).toHaveCount(0);
  expect(await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('hero-botanical-editorial.webp');
  expect(videos).toEqual([]);
});

test('brand belt wraps at its seam without a gap and repeated logos still filter',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  const track=page.locator('.brand-logo-track');await track.scrollIntoViewIfNeeded();
  const cycle=await page.locator('.brand-logo-group:not([aria-hidden])').evaluate(el=>el.getBoundingClientRect().width+parseFloat(getComputedStyle(el.parentElement).columnGap));
  await track.evaluate((el,width)=>{el.scrollLeft=width*2-4;},cycle);
  await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(cycle*1.9);
  await track.evaluate(el=>{el.scrollLeft+=8;});
  await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeLessThan(cycle*1.1);
  const coverage=await track.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    const row=[...el.querySelectorAll('.brand-logo-group')].flatMap(group=>[...group.querySelectorAll('.brand-logo-button')].filter((_,i)=>i%2===0)).map(button=>button.getBoundingClientRect()).filter(box=>box.right>rect.left&&box.left<rect.right).sort((a,b)=>a.left-b.left);
    return row.length>0&&row[0].left<=rect.left+13&&row.at(-1).right>=rect.right-13&&row.every((box,i)=>!i||box.left-row[i-1].right<=13);
  });
  expect(coverage).toBe(true);
  await page.locator('.brand-logo-group[aria-hidden]').last().locator('[data-brand="Dior"]').evaluate(button=>button.click());
  await expect(page.getByRole('button',{name:'Quitar filtro de Dior',exact:true})).toBeVisible();
  await page.screenshot({path:'../docs/evidence/brand-belt-selected.png'});
});

test('desktop arrow moves exactly one column with a gradual arrival',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const section=page.locator('.brand-explorer');await section.scrollIntoViewIfNeeded();
  const next=page.getByRole('button',{name:'Más marcas',exact:true});await next.hover();
  await expect(section).toHaveAttribute('data-motion','paused');
  const item=page.locator('.brand-logo-group:not([aria-hidden]) .brand-logo-button').first();
  const initial=(await item.boundingBox()).x;
  const step=await item.evaluate(el=>el.getBoundingClientRect().width+parseFloat(getComputedStyle(el.parentElement).columnGap));
  await next.click();
  expect(initial-(await item.boundingBox()).x).toBeLessThan(step*.5);
  await expect.poll(async()=>initial-(await item.boundingBox()).x).toBeGreaterThan(step-.5);
  expect(initial-(await item.boundingBox()).x).toBeLessThan(step+.5);
  expect(await page.locator('.brand-logo-track').evaluate(el=>getComputedStyle(el).scrollbarWidth)).not.toBe('none');
});

test('mobile band stays still and supports manual horizontal scrolling',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  await expect(page.locator('.startup-loader')).toHaveCount(0);
  const section=page.locator('.brand-explorer');await section.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
  await expect(section).toHaveAttribute('data-motion','manual');
  await expect(page.locator('.brand-explorer-controls')).toBeHidden();
  const belt=page.locator('.brand-logo-belt'),track=page.locator('.brand-logo-track');
  const transform=await belt.evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(700);expect(await belt.evaluate(el=>getComputedStyle(el).transform)).toBe(transform);
  const start=await track.evaluate(el=>el.scrollLeft);await track.evaluate(el=>{el.scrollLeft+=120;});
  await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(start+100);
  await expect(section).toHaveAttribute('data-motion','manual');
  await page.screenshot({path:'../docs/evidence/brand-belt-mobile-manual.png'});
});
