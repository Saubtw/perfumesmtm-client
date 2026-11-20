import {products, prices, money} from './shop-products.js';
import {whatsappContact} from './whatsapp.js';
import './shop.css';

const cartKey = 'perfumes-mtm-shop-cart';
const productById = new Map(products.map(product => [product.id, product]));
let cart = {};
try {
  const saved = JSON.parse(localStorage.getItem(cartKey));
  for (const {id} of products) {
    if (Number.isInteger(saved?.[id]) && saved[id] > 0) cart[id] = Math.min(saved[id], 99);
  }
} catch {}
let selectedPrice = 0;
const grid = document.querySelector('#shop-grid');
const search = document.querySelector('#search');
const filters = document.querySelector('#price-filters');
const drawer = document.querySelector('#cart');
const cartItems = document.querySelector('#cart-items');
const cartButton = document.querySelector('#cart-button');
const checkout = document.querySelector('#checkout');
const status = document.querySelector('#shop-status');
const searchForm = document.querySelector('#search-form');

const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const icon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>';

cartButton.insertAdjacentHTML('afterbegin', icon);
document.querySelector('#whatsapp').href = whatsappContact;
filters.innerHTML = [0, ...prices].map(price =>
  `<button type="button" data-price="${price}" aria-pressed="${!price}">${price ? money(price) : 'Todos'}</button>`
).join('');

function renderProducts() {
  const query = fold(search.value);
  const visible = products.filter(({price, brand, name}) =>
    (!selectedPrice || selectedPrice === price) && fold(brand + ' ' + name).includes(query)
  );
  document.querySelector('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'perfume' : 'perfumes'}`;
  grid.innerHTML = visible.map(({id, name, brand, price}, index) => `
    <article class="product">
      <img width="480" height="480" src="/images/shop/${id}.webp" alt="${brand} ${name}" ${index < 4 ? '' : 'loading="lazy"'} decoding="async">
      <div class="product-copy"><p class="brand">${brand}</p><h2>${name}</h2>
      <div class="product-order"><strong>${money(price)}</strong>
      <button type="button" data-add="${id}" aria-label="Agregar ${name} al carrito">+ Agregar</button></div></div>
    </article>`
  ).join('');
  document.querySelector('#no-results').hidden = visible.length > 0;
}

function renderCart() {
  const lines = Object.entries(cart).map(([id, quantity]) => ({...productById.get(id), quantity}));
  const count = lines.reduce((sum, {quantity}) => sum + quantity, 0);
  const total = lines.reduce((sum, {price, quantity}) => sum + price * quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-total').textContent = money(total) + ' MXN';
  cartItems.innerHTML = lines.map(({id, name, brand, price, quantity}) => `
    <article class="cart-line">
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
  checkout.hidden = !count;
  if (count) {
    const detail = lines.map(({brand, name, quantity, price}) => `• ${quantity} × ${brand} ${name} — ${money(price * quantity)}`).join('\n');
    checkout.href = whatsappContact + '?text=' + encodeURIComponent(
      `Hola, quiero hacer este pedido:\n\n${detail}\n\nTotal: ${money(total)} MXN\n\n¿Me confirman disponibilidad y entrega?`
    );
  } else {
    checkout.removeAttribute('href');
  }
}

function changeQuantity(id, step) {
  const quantity = Math.min(99, (cart[id] ?? 0) + step);
  if (quantity > 0) cart[id] = quantity;
  else delete cart[id];
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch {}
  renderCart();
}

searchForm.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', renderProducts);
filters.addEventListener('click', event => {
  const button = event.target.closest('[data-price]');
  if (!button) return;
  selectedPrice = Number(button.dataset.price);
  for (const filter of filters.children) filter.setAttribute('aria-pressed', filter === button);
  renderProducts();
});
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = button.dataset.add;
  changeQuantity(id, 1);
  status.textContent = `${productById.get(id).name} en tu carrito (${cart[id]})`;
  clearTimeout(button.resetLabel);
  button.textContent = '✓ Agregado';
  button.resetLabel = setTimeout(() => { button.textContent = '+ Agregar'; }, 1000);
});
cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (!button) return;
  const {id, step} = button.dataset;
  changeQuantity(id, Number(step));
  const next = cartItems.querySelector(`[data-id="${id}"][data-step="${step}"]:not(:disabled)`);
  (next ?? cartItems.querySelector('[data-step]') ?? document.querySelector('#close-cart')).focus({preventScroll: true});
});
cartButton.addEventListener('click', () => drawer.showModal());
drawer.addEventListener('click', event => { if (event.target === drawer) drawer.close(); });
renderProducts();
renderCart();
