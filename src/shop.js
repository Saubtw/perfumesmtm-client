import {products, money} from './shop-products.js';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {mountCatalogMotion} from './catalog-motion.js';
import {mountSmoothScroll} from './smooth-scroll.js';
import olfactory from './shop-olfactory.json';
import './shop.css';

const cartKey = 'perfumes-mtm-shop-cart';
const campaignImage = (id, large = false) => `/images/campana/${id}${large ? '-1000' : ''}.webp`;
const productById = new Map(products.map(product => [product.id, product]));
let cart = {};
try {
  const saved = JSON.parse(localStorage.getItem(cartKey));
  for (const {id} of products) {
    if (Number.isInteger(saved?.[id]) && saved[id] > 0) cart[id] = Math.min(saved[id], 99);
  }
} catch {
  // The catalog can use a session-only cart if storage is unavailable.
}
const grid = document.querySelector('#shop-grid');
const search = document.querySelector('#search');
const drawer = document.querySelector('#cart');
const cartItems = document.querySelector('#cart-items');
const cartButton = document.querySelector('#cart-button');
const checkout = document.querySelector('#checkout');
const cartContact = document.querySelector('.cart-contact');
const copyOrder = document.querySelector('#copy-order');
const copyStatus = document.querySelector('#copy-status');
const orderSummary = document.querySelector('#order-summary');
const instagramChat = document.querySelector('#instagram').href;
const status = document.querySelector('#shop-status');
const searchForm = document.querySelector('#search-form');
const detailDialog = document.querySelector('#perfume-detail');
const detailContent = document.querySelector('#perfume-content');
const detailOrder = document.querySelector('#perfume-order');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const catalogMotion = mountCatalogMotion(grid);
let visible = [];
let detailIndex = 0;
let cartFlight;

gsap.registerPlugin(ScrollTrigger);
mountSmoothScroll(gsap, ScrollTrigger);

const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const icon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>';
const instagramIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17.2 6.8h.01" stroke-width="2.2"/></svg>';
const escapeHTML = value => String(value ?? '').replaceAll('*', '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function productActions({id, name}) {
  return `<div class="product-actions">
    <button type="button" data-add="${id}" aria-label="Agregar ${name} al carrito">${icon}<span>Agregar</span></button>
    <a class="product-instagram" href="${instagramChat}" target="_blank" rel="noopener noreferrer" aria-label="Consultar ${name} por mensaje directo de Instagram" title="Mensaje directo de Instagram">${instagramIcon}</a>
  </div>`;
}

cartButton.insertAdjacentHTML('afterbegin', icon);
checkout.href = instagramChat;

function renderProducts() {
  const query = fold(search.value);
  visible = products.filter(({brand, name}) => fold(`${brand} ${name}`).includes(query));
  document.querySelector('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'perfume' : 'perfumes'}`;
  grid.innerHTML = visible.map(({id, name, brand, price}, index) => `
    <article class="product product-item">
      <button class="product-visual" type="button" data-detail="${index}" aria-haspopup="dialog" aria-label="Ver ficha de ${name}">
        <img width="640" height="640" src="${campaignImage(id)}" alt="" ${index < 3 ? '' : 'loading="lazy"'} decoding="async">
        <span>Ver ficha</span>
      </button>
      <div class="product-copy"><p class="brand">${brand}</p><h3>${name}</h3>
      <div class="product-order">
        <p class="product-price"><strong>${money(price)}</strong> <span>MXN</span></p>
        ${productActions({id, name})}
      </div></div>
    </article>`
  ).join('');
  document.querySelector('#no-results').hidden = visible.length > 0;
  catalogMotion.refresh();
}

function renderDetail(direction = 0) {
  const product = visible[detailIndex];
  const {id, brand, name, price, catalogId} = product;
  const detail = olfactory[catalogId];
  const phases = [['Salida', detail.opening], ['Corazón', detail.heart], ['Fondo', detail.base]];
  const notes = phases.some(([, value]) => value) ? phases : [['Notas', detail.notes]];
  const families = (detail.family ?? '').replace(/\.$/, '').split(/,\s*|\s+y\s+/).filter(Boolean);
  const section = (label, content) => content ? `<div><dt>${label}</dt><dd>${escapeHTML(content)}</dd></div>` : '';
  const position = document.querySelector('#perfume-position');
  position.innerHTML = `<span aria-hidden="true"><strong>${detailIndex + 1}</strong> / ${visible.length}</span><span class="sr-only">Perfume ${detailIndex + 1} de ${visible.length}: ${escapeHTML(name)}</span>`;
  for (const button of detailDialog.querySelectorAll('[data-perfume-step]')) button.disabled = visible.length < 2;
  detailContent.innerHTML = `
    <div class="perfume-stage"><img class="perfume-photo" width="640" height="640"
      src="${campaignImage(id)}" srcset="${campaignImage(id)} 640w, ${campaignImage(id, true)} 1000w"
      sizes="(max-width: 640px) 82vw, 440px" alt="${escapeHTML(`${brand} ${name}`)}"></div>
    <div class="perfume-copy">
      <p class="brand">${brand}</p>
      <h2 id="perfume-title">${name}</h2>
      ${families.length ? `<ul class="perfume-families" aria-label="Familia olfativa">${families.map(family => `<li>${escapeHTML(family)}</li>`).join('')}</ul>` : ''}
      <p class="perfume-smell">${escapeHTML(detail.summary ?? detail.smell)}</p>
      <dl class="perfume-facts">${section('Perfil', detail.profile)}${section('Cuándo usarlo', detail.occasion)}</dl>
      <details class="perfume-notes">
        <summary>Notas olfativas<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></summary>
        <dl class="perfume-facts perfume-phases">${notes.map(([label, value]) => section(label, value)).join('')}</dl>
      </details>
      ${detail.note ? `<p class="perfume-caution">${escapeHTML(detail.note)}</p>` : ''}
    </div>`;
  detailOrder.innerHTML = `<p class="product-price"><strong>${money(price)}</strong> <span>MXN</span></p>${productActions(product)}`;
  detailContent.scrollTop = 0;
  if (direction && !reducedMotion.matches) {
    for (const element of detailContent.querySelectorAll('.perfume-photo, .perfume-copy')) {
      element.animate([{opacity: .35, transform: `translateX(${direction * 12}px)`}, {opacity: 1, transform: 'none'}], {
        duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)',
      });
    }
  }
  if (visible.length > 1) {
    const neighbor = visible[(detailIndex + (direction || 1) + visible.length) % visible.length];
    new Image().src = campaignImage(neighbor.id);
  }
}

function renderCart() {
  const lines = Object.entries(cart).map(([id, quantity]) => ({...productById.get(id), quantity}));
  const count = lines.reduce((sum, {quantity}) => sum + quantity, 0);
  const total = lines.reduce((sum, {price, quantity}) => sum + price * quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-total').textContent = money(total) + ' MXN';
  cartItems.innerHTML = lines.map(({id, name, brand, price, quantity}) => `
    <article class="cart-line" data-cart-line="${id}">
      <img width="64" height="64" src="/images/shop/${id}.webp" alt="">
      <div><p class="brand">${brand}</p><h3>${name}</h3>
        <div class="quantity" aria-label="Cantidad de ${name}">
          <button type="button" data-step="-1" data-id="${id}" aria-label="${quantity === 1 ? 'Quitar' : 'Restar una unidad de'} ${name}">−</button>
          <span>${quantity}</span>
          <button type="button" data-step="1" data-id="${id}" aria-label="Sumar una unidad de ${name}" ${quantity >= 99 ? 'disabled' : ''}>+</button>
        </div>
      </div><strong>${money(price * quantity)}</strong>
    </article>`
  ).join('') || '<p class="empty">Tu carrito está vacío.</p>';
  cartContact.hidden = !count;
  copyStatus.textContent = '';
  orderSummary.hidden = true;
  const detail = lines.map(({brand, name, quantity, price}) => `• ${quantity} × ${brand} ${name} — ${money(price * quantity)}`).join('\n');
  orderSummary.value = count
    ? `Hola, quiero consultar este pedido:\n\n${detail}\n\nTotal: ${money(total)} MXN\n\n¿Me confirman disponibilidad?`
    : '';
}

copyOrder.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(orderSummary.value);
    copyStatus.textContent = 'Pedido copiado. Pégalo en el chat de Instagram.';
    orderSummary.hidden = true;
  } catch {
    copyStatus.textContent = 'Copia este resumen y pégalo en el chat de Instagram.';
    orderSummary.hidden = false;
    orderSummary.focus();
    orderSummary.select();
  }
});

function changeQuantity(id, step) {
  const quantity = Math.min(99, (cart[id] ?? 0) + step);
  if (quantity > 0) cart[id] = quantity;
  else delete cart[id];
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch {
    // Keep the cart usable in memory when persistence fails.
  }
  renderCart();
}

searchForm.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', renderProducts);
function openCart(addedId) {
  cartFlight?.cancel();
  cartFlight = undefined;
  drawer.classList.remove('cart-closing');
  if (!drawer.open) drawer.showModal();
  const line = addedId && cartItems.querySelector(`[data-cart-line="${addedId}"]`);
  if (!line) return;
  cartItems.querySelector('.cart-line-added')?.classList.remove('cart-line-added');
  line.classList.add('cart-line-added');
  line.scrollIntoView({block: 'nearest'});
}

async function closeCart() {
  if (!drawer.open || drawer.classList.contains('cart-closing')) return;
  drawer.classList.add('cart-closing');
  const exit = drawer.getAnimations().find(animation => animation.animationName === 'cart-exit');
  await exit?.finished.catch(() => {});
  if (!drawer.classList.contains('cart-closing')) return;
  drawer.close();
  drawer.classList.remove('cart-closing');
}

async function addFromButton(event) {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = button.dataset.add;
  const origin = button.getBoundingClientRect();
  changeQuantity(id, 1);
  if (detailDialog.open) detailDialog.close();
  status.textContent = `${productById.get(id).name} en tu carrito (${cart[id]})`;
  if (reducedMotion.matches) {
    openCart(id);
    return;
  }

  cartFlight?.cancel();
  const destination = cartButton.getBoundingClientRect();
  const x = destination.left + destination.width / 2 - (origin.left + origin.width / 2);
  const y = destination.top + destination.height / 2 - (origin.top + origin.height / 2);
  const thumbnail = new Image();
  thumbnail.src = `/images/shop/${id}.webp`;
  thumbnail.alt = '';
  thumbnail.className = 'cart-flight';
  thumbnail.style.left = `${origin.left + origin.width / 2 - 24}px`;
  thumbnail.style.top = `${origin.top + origin.height / 2 - 24}px`;
  document.body.append(thumbnail);
  const flight = thumbnail.animate([
    {transform: 'scale(.8)', opacity: .7},
    {transform: `translate(${x * .4}px, ${y * .38 - 22}px)`, opacity: 1, offset: .42},
    {transform: `translate(${x}px, ${y}px) scale(.28)`, opacity: .2},
  ], {duration: 380, easing: 'cubic-bezier(.3,.02,.45,1)', fill: 'forwards'});
  cartFlight = flight;
  await flight.finished.catch(() => {});
  thumbnail.remove();
  if (cartFlight === flight) openCart(id);
}
grid.addEventListener('click', addFromButton);
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-detail]');
  if (!button) return;
  detailIndex = Number(button.dataset.detail);
  renderDetail();
  detailDialog.showModal();
});
detailDialog.addEventListener('click', event => {
  if (event.target === detailDialog) detailDialog.close();
  addFromButton(event);
  const button = event.target.closest('[data-perfume-step]');
  if (button) stepDetail(Number(button.dataset.perfumeStep));
});
detailDialog.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  stepDetail(event.key === 'ArrowRight' ? 1 : -1);
});

function stepDetail(direction) {
  if (visible.length < 2) return;
  detailIndex = (detailIndex + direction + visible.length) % visible.length;
  renderDetail(direction);
}
cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (!button) return;
  const {id, step} = button.dataset;
  changeQuantity(id, Number(step));
  const next = cartItems.querySelector(`[data-id="${id}"][data-step="${step}"]:not(:disabled)`);
  (next ?? cartItems.querySelector('[data-step]') ?? document.querySelector('#close-cart')).focus({preventScroll: true});
});
cartButton.addEventListener('click', () => openCart());
drawer.addEventListener('click', event => { if (event.target === drawer) closeCart(); });
drawer.addEventListener('cancel', event => {
  event.preventDefault();
  closeCart();
});
drawer.querySelector('form[method="dialog"]').addEventListener('submit', event => {
  event.preventDefault();
  closeCart();
});
renderProducts();
renderCart();
