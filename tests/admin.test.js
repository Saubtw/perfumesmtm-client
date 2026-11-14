import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
const apiRoot=['../../api/','../../perfumesmtm-api/'].map(p=>new URL(p,import.meta.url)).find(p=>existsSync(new URL('data/catalog.json',p)));
const catalog=JSON.parse(readFileSync(new URL('data/catalog.json',apiRoot),'utf8'));
const prices=JSON.parse(readFileSync(new URL('data/pricing.json',apiRoot),'utf8'));
const active=['22','24','30','35','42','44','50','54','65','67','68','75','92','104','111','119'];
for(const width of [1440,390,320])test(`private admin tasks are usable at ${width}px`,async({page})=>{
 let loggedIn=false;const writes=[];
 const state={user:{user_id:'test',email:'owner@example.com',role:'owner'},products:catalog.map(p=>({...p,id:String(p.id),product_id:String(p.id),image_url:p.image,enabled:active.includes(String(p.id)),stock:active.includes(String(p.id))?1:0,average_cost:active.includes(String(p.id))?310:0,price:prices.find(r=>r.brand===p.brand&&r.name===p.name)?.price??599})),brands:[...new Set(catalog.map(p=>p.brand))].map(name=>({name,enabled:true})),promotions:[],batches:[],movements:[],audit:[],admins:[],costTiers:[{min:1,cost:500},{min:5,cost:400},{min:10,cost:350},{min:20,cost:310},{min:35,cost:290},{min:50,cost:270}]};
 await page.route('**/api/v1/admin/**',async route=>{
  const req=route.request();const path=new URL(req.url()).pathname;
  if(path.endsWith('/login')){loggedIn=true;return route.fulfill({json:{user:state.user}});}
  if(!loggedIn)return route.fulfill({status:401,json:{error:{message:'Inicia sesión para continuar.'}}});
  if(path.endsWith('/state'))return route.fulfill({json:state});
  if(path.endsWith('/metrics'))return route.fulfill({json:{revenue:0,cogs:0,sold:0,losses:0,purchases:4960,stock:16,inventoryValue:4960,daily:[],top:[]}});
  writes.push({path,body:req.postDataJSON()});
  if(path.endsWith('/brands')){const body=req.postDataJSON();state.brands.find(b=>b.name===body.name).enabled=body.enabled;}
  return route.fulfill({status:204});
 });
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width,height:900});await page.goto('/dashboard-admin');
 await expect(page.getByRole('heading',{name:'Administración',exact:true})).toBeVisible();
 await page.getByLabel('Correo',{exact:true}).fill('owner@example.com');await page.getByLabel('Contraseña',{exact:true}).fill('test-only-password');await page.getByRole('button',{name:'Entrar al panel'}).click();
 await expect(page.getByRole('heading',{name:'Catálogo',exact:true})).toBeVisible();await expect(page.locator('.admin-heading')).toContainText('16 perfumes visibles');
 await page.locator('#catalog-search').fill('Mademoiselle Intense');await expect(page.locator('.admin-product')).toHaveCount(1);await expect(page.locator('.admin-product img')).toHaveAttribute('src','/images/catalog/cocomademoiselleintense.png');
 await page.locator('.admin-product button').click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.enabled).toBe(true);
 await page.screenshot({path:`../docs/evidence/admin-catalog-${width}.png`,fullPage:true});
 await expect(page.locator('#admin-feedback')).toHaveText('',{timeout:10000});
 await page.getByRole('button',{name:'Stock y ventas',exact:true}).click();await expect(page.getByText('16 unidades en stock',{exact:true})).toBeVisible();
 await page.getByLabel('Cantidad total del pedido al proveedor').fill('22');await expect(page.locator('#cost-preview')).toContainText('$310.00');
 await page.getByLabel('Tipo de movimiento').selectOption('sale');await expect(page.getByLabel('Precio de venta por unidad')).toBeVisible();await expect(page.locator('#lot-field')).toBeHidden();
 await page.screenshot({path:`../docs/evidence/admin-stock-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Promociones',exact:true}).click();await page.getByRole('button',{name:'Crear combo',exact:true}).click();await expect(page.getByLabel('Precio total del combo')).toBeVisible();
 await page.getByRole('button',{name:'Marcas',exact:true}).click();await expect(page.locator('[data-brand="Chanel"]')).toBeChecked();
 await page.locator('[data-brand="Chanel"]').uncheck();await expect(page.locator('#admin-feedback')).toContainText('Visibilidad de marca guardada');
 await page.getByRole('button',{name:'Catálogo',exact:true}).click();await expect(page.locator('.admin-heading')).toContainText('15 perfumes visibles');
 await page.locator('#visibility').selectOption('visible');await expect(page.locator('.admin-product')).toHaveCount(0);
 await page.locator('#visibility').selectOption('hidden');await expect(page.locator('.admin-product')).toHaveCount(1);
 await page.getByRole('button',{name:'Marcas',exact:true}).click();await page.locator('[data-brand="Chanel"]').check();await expect(page.locator('#admin-feedback')).toContainText('Visibilidad de marca guardada');
 await expect(page.locator('#admin-feedback')).toHaveText('',{timeout:10000});
 await page.getByRole('button',{name:'Resultados',exact:true}).click();await expect(page.locator('.metrics-list')).toContainText('$4,960.00');
 await page.screenshot({path:`../docs/evidence/admin-results-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Cuentas',exact:true}).click();await expect(page.getByRole('heading',{name:'Nueva cuenta'})).toBeVisible();
 await page.getByRole('button',{name:'Mi cuenta',exact:true}).click();await expect(page.getByLabel('Nueva contraseña')).toBeVisible();expect(errors).toEqual([]);
});
test('live public catalog contains exactly the 16 commercial products, updated images and no admin link',async({page,request})=>{
 const response=await request.get('/api/v1/perfumes?limit=120');expect(response.ok()).toBe(true);const data=await response.json();expect(data.total).toBe(16);expect(data.items.map(p=>p.id).sort()).toEqual([...active].sort());
 expect(data.items.find(p=>p.id==='68').name).toBe('Invictus Victory Elixir');expect(data.items.find(p=>p.id==='119').image).toBe('/images/catalog/cocomademoiselleintense.png');
 await page.goto('/');await expect(page.locator('#result-count')).toContainText('de 16 perfumes');await expect(page.locator('a[href*="dashboard-admin"]')).toHaveCount(0);await expect(page.locator('#promociones')).toBeHidden();
});
