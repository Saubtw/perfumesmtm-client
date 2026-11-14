import {promotions,fixedProducts,isPriced,money} from './commerce.js';
import './combos.css';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountPromotions(catalog,add,openProduct) {
  const section=document.querySelector('#promociones');
  const offers=promotions.flatMap(p=>{
    const products=fixedProducts(p,catalog);
    const regular=products.reduce((sum,item)=>sum+(item.price??0),0);
    return products.length===p.count&&products.every(isPriced)&&p.price<regular?[{...p,products,regular,savings:regular-p.price}]:[];
  });
  if(!offers.length) {section.hidden=true;return;}
  section.setAttribute('aria-labelledby','combos-title');
  section.removeAttribute('aria-label');
  section.innerHTML=`<header class="combos-heading"><div><h2 id="combos-title">Combos</h2><p class="combos-subtitle">Tus perfumes favoritos. Un mejor precio juntos.</p></div><p>Compara, elige y ahorra.<br>Consulta cada fragancia antes de agregar.</p></header><div class="combo-toolbar"><div class="combo-filters" role="group" aria-label="Filtrar combos por cantidad">${[0,2,3,4].map(n=>`<button type="button" data-combo-filter="${n}" aria-pressed="${n===0}">${n===0?'Todos':n+' perfumes'}</button>`).join('')}</div><p class="combo-results" role="status">${offers.length} combos para elegir</p></div><div class="combos-grid">${offers.map(p=>`
    <article class="combo-card" data-combo="${escape(p.id)}" aria-labelledby="combo-title-${escape(p.id)}">
      <div class="combo-offer-strip"><span>Ahorras ${money(p.savings)}</span><span>${Math.floor(p.savings/p.regular*100)}% de descuento</span></div>
      <header class="combo-title-row"><div><h3 id="combo-title-${escape(p.id)}">${escape(p.name)}</h3><p class="combo-piece-count">${p.count} perfumes incluidos</p></div>${p.onRequest?'<span class="combo-on-request">Bajo pedido</span>':''}</header>
      <ul class="combo-contents" aria-label="Perfumes del combo: toca una imagen o un nombre para ver su ficha">${p.products.map((item,index)=>`<li style="--fan-x:${(index-(p.count-1)/2)*62}px;--fan-angle:${(index-(p.count-1)/2)*6}deg"><button type="button" class="combo-product" data-combo-product="${escape(item.id)}" aria-label="Ver detalles de ${escape(item.name)}"><img src="${escape(item.image)}" alt="" width="92" height="104" loading="lazy"/><span class="combo-product-copy"><span class="combo-product-brand">${escape(item.brand)}</span><strong>${escape(item.name)}</strong><span class="combo-individual-price">${money(item.price)} individual</span><span class="combo-product-link">Ver ficha <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span></span></button></li>`).join('')}</ul>
      <footer class="combo-purchase"><div class="combo-price"><span>Total del combo · MXN</span><div><strong>${money(p.price)}</strong><s aria-label="Precio por separado ${money(p.regular)}">${money(p.regular)}</s></div><span class="combo-savings">Ahorras ${money(p.savings)} al llevarlos juntos</span></div><button type="button" class="combo-add" data-fixed="${escape(p.id)}" aria-label="Agregar ${escape(p.name)} al carrito">Agregar combo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></footer>
    </article>`).join('')}</div><p class="promotion-terms">Precios en MXN · Cada combo incluye únicamente los perfumes indicados · No acumulable con otros descuentos. Entrega por acordar en WhatsApp.</p>`;
  section.addEventListener('click',event=>{
    const filter=event.target.closest('[data-combo-filter]');
    if(filter) {
      const count=Number(filter.dataset.comboFilter);
      section.querySelectorAll('[data-combo-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button===filter)));
      section.querySelectorAll('[data-combo]').forEach(card=>{card.hidden=Boolean(count&&offers.find(p=>p.id===card.dataset.combo).count!==count);});
      section.querySelector('.combos-grid').scrollLeft=0;
      const total=offers.filter(p=>!count||p.count===count).length;
      section.querySelector('.combo-results').textContent=`${total} ${total===1?'combo':'combos'} para elegir`;
      return;
    }
    const product=event.target.closest('[data-combo-product]');
    if(product) {openProduct?.(product.dataset.comboProduct,product);return;}
    const button=event.target.closest('[data-fixed]');if(!button) return;
    const offer=offers.find(p=>p.id===button.dataset.fixed);
    if(offer) add(offer.products.map(p=>p.id),offer.id);
  });
}
