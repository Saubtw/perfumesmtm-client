import {test as base,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {combos} from '../../src/combos.js';
const prices=JSON.parse(readFileSync(new URL('./pricing.json',import.meta.url),'utf8'));
const detailsPath=['../../../api/data/olfactory.json','../../../perfumesmtm-api/data/olfactory.json'].map(p=>new URL(p,import.meta.url)).find(p=>existsSync(p));
const details=JSON.parse(readFileSync(detailsPath,'utf8'));
const catalog=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url),'utf8')).map(p=>({...p,id:String(p.id),display_index:p.id,price:prices.find(r=>r.source_id===p.id)?.price,olfactory:details[p.id],detail_url:'/#perfume='+p.id}));
// Historical UI regressions run against their original complete catalog; live publication has separate coverage.
export const test=base.extend({page:async({page},use)=>{
 await page.route('**/api/v1/perfumes?*',route=>route.fulfill({json:{items:catalog,total:catalog.length,page:1,limit:120}}));
 await page.route('**/api/v1/storefront',route=>route.fulfill({json:{promotions:combos.filter(p=>p.enabled)}}));
 await use(page);
}});
export {expect};
