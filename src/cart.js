import gsap from 'gsap';
import {money,createLine,restoreCart,cartTotals,whatsappUrl,customerName} from './commerce.js';
import {mountPromotions} from './combos-view.js';
import './commerce.css';

const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>';
const whatsapp='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.4-1.7c1.7 1 3.6 1.5 5.5 1.5h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.2-3.5-8.5ZM12.2 21.8a10 10 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-1.7-.8-2.8-1.6-3.9-3.4-.3-.4.3-.4.9-1.6.1-.2 0-.5 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.1.2 2.2 3.5 5.4 4.8 2 .9 2.8 1 3.8.8.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>';
const storageKey='mtm-cart-v1';

export function mountCommerce(catalog,{openProduct,onAdded}={}) {
  let lines=[],migrated=false;
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));lines=restoreCart(saved,catalog);
    migrated=Array.isArray(saved)&&saved.some(line=>line&&['duo','trio','cuatro'].includes(line.promotionId)&&!createLine(line.productIds,catalog,line.promotionId));
  } catch { /* A corrupt or unavailable store must never block shopping. */ }
  const headerButton=document.querySelector('#cart-open');
  headerButton.innerHTML=`${bag}<span>Carrito</span><span class="cart-count">0</span>`;
  document.body.insertAdjacentHTML('beforeend',`<dialog class="cart-dialog" aria-labelledby="cart-title"><header class="cart-heading"><div><h2 id="cart-title">Tu selección</h2><p class="cart-caption">Perfumes elegidos por ti.</p></div><button class="cart-close icon-button" aria-label="Cerrar carrito"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="cart-lines"></div><footer class="cart-footer"><dl class="cart-summary"></dl><button class="checkout-button" disabled>${whatsapp}<span>Finalizar pedido por WhatsApp</span></button><p class="cart-footnote">Precios en MXN. Envío, si corresponde, por confirmar en WhatsApp. Tu selección se conserva.</p></footer></dialog><div class="commerce-toast" role="status" aria-live="polite"></div>`);
  const dialog=document.querySelector('.cart-dialog');
  const list=dialog.querySelector('.cart-lines');
  const checkout=dialog.querySelector('.checkout-button');
  const nameDialog=document.createElement('dialog');
  nameDialog.className='customer-dialog';nameDialog.setAttribute('aria-labelledby','customer-title');
  nameDialog.innerHTML=`<form class="customer-form"><div class="customer-heading"><h2 id="customer-title">¿A nombre de quién?</h2><button type="button" class="customer-close icon-button" aria-label="Volver al carrito"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><p>Tu nombre aparecerá al inicio del pedido.</p><label for="customer-name">Tu nombre</label><input id="customer-name" name="customer-name" autocomplete="name" placeholder="Escribe tu nombre" required maxlength="80"/><p class="customer-error" role="alert" hidden></p><button type="submit" class="commerce-button">${whatsapp}<span>Continuar a WhatsApp</span></button></form>`;
  document.body.append(nameDialog);
  const nameInput=nameDialog.querySelector('input');
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  nameDialog.querySelector('.customer-close').addEventListener('click',()=>nameDialog.close());
  nameDialog.addEventListener('close',()=>checkout.focus({preventScroll:true}));
  nameDialog.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=customerName(nameInput.value);
    if(!name) {nameInput.setCustomValidity('Escribe tu nombre para continuar.');nameInput.reportValidity();return;}
    const url=whatsappUrl(lines,name);
    if(!url) {nameDialog.close();return;}
    window.open(url,'_blank','noopener,noreferrer');nameDialog.close();
  });
  nameInput.addEventListener('input',()=>nameInput.setCustomValidity(''));
  let toastTimer,transition,returnFocus;
  function notify(message) {
    const toast=document.querySelector('.commerce-toast');toast.textContent=message;toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3200);
  }
  dialog.querySelector('.cart-summary').setAttribute('aria-live','polite');
  function render() {
    const totals=cartTotals(lines);
    headerButton.querySelector('.cart-count').textContent=totals.count;
    headerButton.setAttribute('aria-label',`Abrir carrito, ${totals.count} productos`);
    list.innerHTML=lines.length?lines.map((line,index)=>{
      const products=new Map();
      line.products.forEach(p=>products.set(p.id,{...p,units:(products.get(p.id)?.units??0)+1}));
      return `<article class="cart-line" data-line="${index}">${line.promotion?`<div class="cart-offer-name">${escape(line.promotion.name)} <span>${line.products.length} perfumes por combo</span></div>`:''}<div class="cart-products">${[...products.values()].map(p=>`<button type="button" class="cart-product" data-cart-product="${escape(p.id)}" aria-label="Ver detalles de ${escape(p.name)}"><img src="${escape(p.image)}" alt="${escape(p.name)}" width="100" height="110"/><span class="cart-product-copy"><span class="cart-product-brand">${escape(p.brand)}</span><span class="cart-product-name">${escape(p.name)}</span><span class="cart-product-price">${money(p.price)} / pieza${line.promotion?` · ${p.units*line.quantity} ${p.units*line.quantity===1?'pieza':'piezas'}`:''}</span><span class="cart-view-detail">Ver ficha <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M7 5h12v12"/></svg></span></span></button>`).join('')}</div><div class="cart-line-controls"><div class="quantity-control" role="group" aria-label="Cantidad de ${escape(line.promotion?.name??line.products[0].name)}"><button data-change="-1" aria-label="Reducir cantidad" ${line.quantity===1?'disabled':''}>−</button><output aria-label="Cantidad">${line.quantity}</output><button data-change="1" aria-label="Aumentar cantidad" ${line.quantity===99?'disabled':''}>+</button></div><button class="cart-remove" data-remove>Eliminar${line.promotion?' combo':''}</button><div class="cart-line-price">${line.promotion?`<s>${money(line.regular*line.quantity)}</s>`:''}<strong>${money(line.price*line.quantity)}</strong></div></div></article>`;
    }).join(''):`<div class="cart-empty">${bag}<h3>Tu próxima fragancia<br>empieza aquí.</h3><p>Explora el catálogo o descubre nuestros combos.</p><button class="commerce-button" data-browse>Explorar perfumes</button></div>`;
    dialog.querySelector('.cart-summary').innerHTML=`<div><dt>Subtotal · ${totals.count} ${totals.count===1?'perfume':'perfumes'}</dt><dd>${money(totals.regular)}</dd></div>${totals.savings?`<div class="cart-savings"><dt>Ahorro en combos</dt><dd>−${money(totals.savings)}</dd></div>`:''}<div class="cart-grand-total"><dt>Total <small>MXN</small></dt><dd>${money(totals.total)}</dd></div>`;
    checkout.disabled=!lines.length;
  }
  function persist() {
    try {localStorage.setItem(storageKey,JSON.stringify(lines.map(({productIds,promotionId,quantity})=>({productIds,promotionId,quantity}))));}
    catch {notify('Tu selección se conserva mientras esta página esté abierta.');}
    render();
  }
  function add(ids,promotionId=null) {
    const line=createLine(ids,catalog,promotionId);if(!line) {notify('Esta selección no cumple las condiciones del combo.');return;}
    const existing=lines.find(l=>l.key===line.key);
    if(existing?.quantity===99) {notify('Puedes agregar hasta 99 unidades de esta selección.');return;}
    if(existing) existing.quantity++;else lines.push(line);
    persist();notify(`${line.promotion?.name??line.products[0].name} agregado al carrito.`);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(headerButton.querySelector('.cart-count'),{scale:1.35},{scale:1,duration:.4,ease:'expo.out'});
    if(onAdded) onAdded(open);else open();
  }
  function open() {
    if(dialog.open) {dialog.querySelector('.cart-close').focus({preventScroll:true});return;}
    const focused=document.activeElement;
    returnFocus=focused instanceof HTMLElement&&!focused.matches('body,html')&&!focused.closest('#image-viewer')?focused:headerButton;
    dialog.showModal();document.body.classList.add('cart-open');
    transition?.kill();transition=gsap.fromTo(dialog,{xPercent:100,opacity:.4},{xPercent:0,opacity:1,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.5,ease:'expo.out',clearProps:'transform,opacity'});
    dialog.querySelector('.cart-close').focus();
  }
  function close() {
    transition?.kill();
    transition=gsap.to(dialog,{xPercent:100,opacity:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.25,ease:'power2.in',onComplete:()=>{dialog.close();document.body.classList.remove('cart-open');gsap.set(dialog,{clearProps:'transform,opacity'});if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});}});
  }
  headerButton.addEventListener('click',open);
  dialog.querySelector('.cart-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog) {const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom) close();}});
  list.addEventListener('click',event=>{
    if(event.target.closest('[data-browse]')) {close();document.querySelector('#coleccion').scrollIntoView();return;}
    const product=event.target.closest('[data-cart-product]');
    if(product) {openProduct?.(product.dataset.cartProduct,product);return;}
    const button=event.target.closest('button');const row=button?.closest('[data-line]');if(!row) return;
    const index=Number(row.dataset.line);
    if(button.hasAttribute('data-remove')) lines.splice(index,1);
    else if(button.dataset.change) lines[index].quantity=Math.min(99,Math.max(1,lines[index].quantity+Number(button.dataset.change)));
    persist();
    const next=list.querySelectorAll('[data-line]')[Math.min(index,lines.length-1)];
    const action=button.hasAttribute('data-remove')?'[data-remove]':`[data-change="${button.dataset.change}"]:not(:disabled)`;
    (next?.querySelector(action)??next?.querySelector('button:not(:disabled)')??list.querySelector('[data-browse]'))?.focus();
  });
  checkout.addEventListener('click',()=>{
    if(!lines.length) return;
    nameDialog.showModal();
    gsap.fromTo(nameDialog,{y:16,opacity:0},{y:0,opacity:1,duration:reduced()?0:.3,ease:'expo.out',clearProps:'transform,opacity'});
    nameInput.focus({preventScroll:true});
  });
  window.addEventListener('storage',event=>{if(event.key!==storageKey&&event.key!==null) return;try {lines=restoreCart(JSON.parse(event.newValue),catalog);render();} catch { /* Ignore malformed cross-tab updates. */ }});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-add-product]');
    if(button&&!button.disabled) {add([button.dataset.addProduct]);if(button.closest('#image-viewer')) button.disabled=true;}
  });
  render();
  mountPromotions(catalog,add,openProduct);
  if(migrated) {persist();notify('Los combos cambiaron. Conservamos tus perfumes a precio individual; revisa tu carrito.');}
  return {add};
}
