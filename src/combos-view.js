import {promotions,fixedProducts,isPriced,money} from './commerce.js';
import './combos.css';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortMoney=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(value);

export function mountPromotions(catalog,add) {
  const section=document.querySelector('#promociones');
  const offers=promotions.flatMap(p=>{
    const products=fixedProducts(p,catalog);
    const regular=products.reduce((sum,item)=>sum+(item.price??0),0);
    return products.length===p.count&&products.every(isPriced)&&p.price<regular?[{...p,products,regular,savings:regular-p.price}]:[];
  });
  if(!offers.length) {section.hidden=true;return;}
  section.setAttribute('aria-labelledby','combos-title');
  section.removeAttribute('aria-label');
  section.innerHTML=`<header class="combos-heading"><h2 id="combos-title">Combos</h2><p>Fragancias que combinan. Paquetes elegidos para ti, con un precio para llevarlos juntos.</p></header><div class="combos-grid">${offers.map(p=>`<article class="combo-card combo-tone-${escape(p.tone??'sage')}" data-combo="${escape(p.id)}" aria-labelledby="combo-title-${escape(p.id)}"><div class="combo-artwork"><span class="combo-piece-count">${p.count} perfumes</span><span class="combo-savings">Ahorras <strong>${shortMoney(p.savings)}</strong></span><div class="combo-photographs" style="--pieces:${p.count}">${p.products.map((item,i)=>`<img src="${escape(item.image)}" alt="${escape(item.name)}" width="144" height="176" loading="lazy" style="--angle:${(i-(p.count-1)/2)*7}deg"/>`).join('')}</div></div><div class="combo-content"><div class="combo-title-row"><h3 id="combo-title-${escape(p.id)}">${escape(p.name)}</h3>${p.onRequest?'<span class="combo-on-request">Bajo pedido</span>':''}</div><ul class="combo-contents">${p.products.map(item=>`<li><span>${escape(item.name)}</span><small>${escape(item.brand)}</small></li>`).join('')}</ul><div class="combo-purchase"><div class="combo-price"><div><strong>${money(p.price)}</strong><s>${money(p.regular)}</s></div></div><button class="combo-add" data-fixed="${escape(p.id)}" aria-label="Agregar ${escape(p.name)} al carrito">Agregar <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div></article>`).join('')}</div><p class="promotion-terms">Precios en MXN · Paquetes con las fragancias indicadas · No acumulables con otros descuentos. Entrega por acordar en WhatsApp.</p>`;
  section.addEventListener('click',event=>{
    const button=event.target.closest('[data-fixed]');if(!button) return;
    const offer=offers.find(p=>p.id===button.dataset.fixed);
    if(offer) add(offer.products.map(p=>p.id),offer.id);
  });
}
