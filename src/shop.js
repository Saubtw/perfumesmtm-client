import {products, money} from './shop-products.js';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {mountCatalogMotion} from './catalog-motion.js';
import {mountSmoothScroll} from './smooth-scroll.js';
import olfactory from './shop-olfactory.json';
import './shop.css';

const campaignImage = (id, large = false) => `/images/campana/${id}${large ? '-1000' : ''}.webp`;

const grid = document.querySelector('#shop-grid');
const search = document.querySelector('#search');
const clearSearch = document.querySelector('#clear-search');
const searchForm = document.querySelector('#search-form');
const familyFilters = document.querySelector('#family-filters');
const sortSelect = document.querySelector('#sort-select');
const resultCount = document.querySelector('#result-count');
const noResults = document.querySelector('#no-results');
const resetFilters = document.querySelector('#reset-filters');
const instagramChat = document.querySelector('#instagram').href;
const status = document.querySelector('#shop-status');
const detailDialog = document.querySelector('#perfume-detail');
const detailContent = document.querySelector('#perfume-content');
const detailOrder = document.querySelector('#perfume-order');
const heroCount = document.querySelector('#hero-count');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const catalogMotion = mountCatalogMotion(grid);

let activeFamily = 'all';
let activeSort = 'featured';
let visible = [];
let modalProducts = [];
let detailIndex = 0;
let copyResetTimer;

gsap.registerPlugin(ScrollTrigger);
mountSmoothScroll(gsap, ScrollTrigger);

if (heroCount) heroCount.textContent = String(products.length);

const fold = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const escapeHTML = value => String(value ?? '').replaceAll('*', '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const capitalize = value => {
  const clean = String(value ?? '').replaceAll('*', '').trim();
  if (!clean) return '';
  return clean.charAt(0).toLocaleUpperCase('es-MX') + clean.slice(1);
};

const instagramIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17.2 6.8h.01" stroke-width="2.2"/></svg>';
const copyIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg>';
const checkIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

const FAMILY_FILTERS = [
  {id: 'all', label: 'Todos', test: () => true},
  {id: 'sweet', label: 'Dulces y vainilla', test: family => /dulce|vainill|gourmand|oriental/.test(family)},
  {id: 'fresh', label: 'Frescas y cítricas', test: family => /citric|acuatic|marin/.test(family)},
  {id: 'fruity', label: 'Frutales', test: family => /frutal/.test(family)},
  {id: 'woody', label: 'Amaderadas', test: family => /amaderad/.test(family)},
  {id: 'spicy', label: 'Especiadas', test: family => /especiad/.test(family)},
];

const enrichedProducts = products.map((product, order) => {
  const detail = olfactory[product.catalogId] ?? {};
  const families = (detail.family ?? '').replace(/\.$/, '').split(/,\s*|\s+y\s+/).filter(Boolean);
  const foldedFamily = fold(detail.family);
  const searchIndex = fold([
    product.brand,
    product.name,
    detail.family,
    detail.summary,
    detail.smell,
    detail.notes,
    detail.opening,
    detail.heart,
    detail.base,
    detail.occasion,
  ].filter(Boolean).join(' '));
  return {...product, order, detail, families, foldedFamily, searchIndex};
});

function renderFilterPills() {
  familyFilters.innerHTML = FAMILY_FILTERS.map(({id, label, test}) => {
    const count = enrichedProducts.filter(item => test(item.foldedFamily)).length;
    const pressed = activeFamily === id;
    return `<button type="button" class="filter-pill" data-family="${id}" aria-pressed="${pressed}">
      <span>${label}</span><span class="filter-count">${count}</span>
    </button>`;
  }).join('');
}

function sortProducts(list) {
  const sorted = [...list];
  if (activeSort === 'price-asc') {
    sorted.sort((a, b) => a.price - b.price || a.order - b.order);
  } else if (activeSort === 'price-desc') {
    sorted.sort((a, b) => b.price - a.price || a.order - b.order);
  } else if (activeSort === 'brand') {
    sorted.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'es'));
  } else {
    sorted.sort((a, b) => a.order - b.order);
  }
  return sorted;
}

function renderProducts() {
  const query = fold(search.value);
  clearSearch.hidden = !search.value.length;
  const familyDef = FAMILY_FILTERS.find(item => item.id === activeFamily) ?? FAMILY_FILTERS[0];
  const filtered = enrichedProducts.filter(item => familyDef.test(item.foldedFamily) && (!query || item.searchIndex.includes(query)));
  visible = sortProducts(filtered);

  const countLabel = visible.length === products.length
    ? `${visible.length} perfumes disponibles`
    : `Mostrando ${visible.length} de ${products.length} ${visible.length === 1 ? 'perfume' : 'perfumes'}`;
  resultCount.textContent = countLabel;

  grid.innerHTML = visible.map(({id, name, brand, price, detail, families}, index) => {
    const shortFamilies = families.slice(0, 2).map(capitalize).join(' · ');
    const teaser = capitalize(detail.summary ?? detail.smell ?? '');
    return `
      <article class="product product-item">
        <button class="product-visual" type="button" data-detail="${index}" aria-haspopup="dialog" aria-label="Ver ficha olfativa de ${escapeHTML(brand)} ${escapeHTML(name)}">
          <img width="640" height="640" src="${campaignImage(id)}" alt="${escapeHTML(`${brand} ${name}`)}" ${index < 3 ? '' : 'loading="lazy"'} decoding="async">
        </button>
        <div class="product-copy">
          <div class="product-meta">
            <p class="brand">${escapeHTML(brand)}</p>
            ${shortFamilies ? `<span class="product-family-tag">${escapeHTML(shortFamilies)}</span>` : ''}
          </div>
          <h3><button type="button" class="product-title-link" data-detail="${index}" aria-haspopup="dialog">${escapeHTML(name)}</button></h3>
          ${teaser ? `<p class="product-teaser">${escapeHTML(teaser)}</p>` : ''}
          <div class="product-order">
            <p class="product-price"><strong>${money(price)}</strong> <span>MXN</span></p>
            <div class="product-actions">
              <button type="button" class="btn-detail" data-detail="${index}" aria-haspopup="dialog">Ver ficha</button>
              <a class="btn-instagram" href="${instagramChat}" target="_blank" rel="noopener noreferrer" aria-label="Pedir ${escapeHTML(brand)} ${escapeHTML(name)} por mensaje directo de Instagram">
                ${instagramIcon}<span>Pedir</span>
              </a>
            </div>
          </div>
        </div>
      </article>`;
  }).join('');

  noResults.hidden = visible.length > 0;
  catalogMotion.refresh();
}

function buildInquiryMessage({brand, name, price}) {
  return `Hola, me interesa ${brand} ${name} (${money(price)} MXN). ¿Tienen disponibilidad?`;
}

function openDetailList(list, index) {
  modalProducts = list;
  detailIndex = index;
  renderDetail();
  if (!detailDialog.open) detailDialog.showModal();
}

function renderDetail(direction = 0) {
  clearTimeout(copyResetTimer);
  const product = modalProducts[detailIndex];
  if (!product) return;
  const {id, brand, name, price, detail, families} = product;
  const phases = [
    ['Salida', detail.opening],
    ['Corazón', detail.heart],
    ['Fondo', detail.base],
  ].filter(([, value]) => Boolean(value));
  const hasPyramid = phases.length > 0;
  const notesList = hasPyramid ? phases : (detail.notes ? [['Notas principales', detail.notes]] : []);

  const position = document.querySelector('#perfume-position');
  const current = String(detailIndex + 1).padStart(2, '0');
  const total = String(modalProducts.length).padStart(2, '0');
  position.innerHTML = `<span aria-hidden="true"><strong>${current}</strong> / ${total}</span><span class="sr-only">Perfume ${detailIndex + 1} de ${modalProducts.length}: ${escapeHTML(name)}</span>`;
  for (const button of detailDialog.querySelectorAll('[data-perfume-step]')) {
    button.disabled = modalProducts.length < 2;
  }

  const infoCard = (label, content) => content
    ? `<div class="perfume-fact-card"><dt>${label}</dt><dd>${escapeHTML(capitalize(content))}</dd></div>`
    : '';

  detailContent.innerHTML = `
    <div class="perfume-stage">
      <img class="perfume-photo" width="640" height="640"
        src="${campaignImage(id)}" srcset="${campaignImage(id)} 640w, ${campaignImage(id, true)} 1000w"
        sizes="(max-width: 640px) 84vw, 440px" alt="${escapeHTML(`${brand} ${name}`)}">
    </div>
    <div class="perfume-copy">
      <p class="brand">${escapeHTML(brand)}</p>
      <h2 id="perfume-title">${escapeHTML(name)}</h2>
      ${families.length ? `<ul class="perfume-families" aria-label="Familia olfativa">${families.map(family => `<li>${escapeHTML(capitalize(family))}</li>`).join('')}</ul>` : ''}
      <p class="perfume-smell">${escapeHTML(capitalize(detail.summary ?? detail.smell))}</p>
      <dl class="perfume-facts">
        ${infoCard('Perfil olfativo', detail.profile)}
        ${infoCard('Cuándo usarlo', detail.occasion)}
      </dl>
      ${notesList.length ? `
        <details class="perfume-notes" open>
          <summary>
            <span>${hasPyramid ? 'Pirámide olfativa' : 'Notas olfativas'}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>
          </summary>
          <dl class="perfume-phases ${hasPyramid ? 'is-pyramid' : ''}">
            ${notesList.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHTML(capitalize(value))}</dd></div>`).join('')}
          </dl>
        </details>
      ` : ''}
      ${detail.note ? `<p class="perfume-caution">${escapeHTML(capitalize(detail.note))}</p>` : ''}
    </div>`;

  detailOrder.innerHTML = `
    <div class="detail-price-block">
      <span class="detail-price-label">Precio</span>
      <p class="product-price"><strong>${money(price)}</strong> <span>MXN</span></p>
    </div>
    <div class="detail-actions">
      <button type="button" class="btn-copy-inquiry" data-copy-inquiry aria-label="Copiar mensaje de consulta para ${escapeHTML(brand)} ${escapeHTML(name)}">
        ${copyIcon}<span>Copiar consulta</span>
      </button>
      <a class="btn-instagram btn-instagram-lg" href="${instagramChat}" target="_blank" rel="noopener noreferrer" aria-label="Pedir ${escapeHTML(brand)} ${escapeHTML(name)} por mensaje directo de Instagram">
        ${instagramIcon}<span>Pedir por Instagram</span>
      </a>
    </div>`;

  detailContent.scrollTop = 0;
  if (direction && !reducedMotion.matches) {
    for (const element of detailContent.querySelectorAll('.perfume-photo, .perfume-copy')) {
      element.animate([{opacity: .35, transform: `translateX(${direction * 14}px)`}, {opacity: 1, transform: 'none'}], {
        duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)',
      });
    }
  }
  if (modalProducts.length > 1) {
    const neighbor = modalProducts[(detailIndex + (direction || 1) + modalProducts.length) % modalProducts.length];
    new Image().src = campaignImage(neighbor.id);
  }
}

function stepDetail(direction) {
  if (modalProducts.length < 2) return;
  detailIndex = (detailIndex + direction + modalProducts.length) % modalProducts.length;
  renderDetail(direction);
}

async function copyInquiry(button) {
  const product = modalProducts[detailIndex];
  if (!product) return;
  const text = buildInquiryMessage(product);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
  button.dataset.copied = 'true';
  button.innerHTML = `${checkIcon}<span>Copiado</span>`;
  status.textContent = `Consulta de ${product.name} copiada. Pégala en Instagram.`;
  clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    if (!button.isConnected) return;
    delete button.dataset.copied;
    button.innerHTML = `${copyIcon}<span>Copiar consulta</span>`;
  }, 2400);
}

searchForm.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', renderProducts);
clearSearch.addEventListener('click', () => {
  search.value = '';
  renderProducts();
  search.focus();
});

familyFilters.addEventListener('click', event => {
  const button = event.target.closest('[data-family]');
  if (!button) return;
  activeFamily = button.dataset.family;
  renderFilterPills();
  renderProducts();
});

sortSelect.addEventListener('change', () => {
  activeSort = sortSelect.value;
  renderProducts();
});

resetFilters.addEventListener('click', () => {
  activeFamily = 'all';
  activeSort = 'featured';
  search.value = '';
  sortSelect.value = 'featured';
  renderFilterPills();
  renderProducts();
  search.focus();
});

document.addEventListener('click', event => {
  const heroTrigger = event.target.closest('[data-open-id]');
  if (!heroTrigger) return;
  const targetId = heroTrigger.dataset.openId;
  const visibleIdx = visible.findIndex(item => item.id === targetId);
  if (visibleIdx >= 0) {
    openDetailList(visible, visibleIdx);
  } else {
    const allIdx = enrichedProducts.findIndex(item => item.id === targetId);
    if (allIdx >= 0) openDetailList(enrichedProducts, allIdx);
  }
});

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-detail]');
  if (!button) return;
  openDetailList(visible, Number(button.dataset.detail));
});

detailDialog.addEventListener('click', event => {
  if (event.target === detailDialog) {
    detailDialog.close();
    return;
  }
  const stepButton = event.target.closest('[data-perfume-step]');
  if (stepButton) {
    stepDetail(Number(stepButton.dataset.perfumeStep));
    return;
  }
  const copyButton = event.target.closest('[data-copy-inquiry]');
  if (copyButton) {
    copyInquiry(copyButton);
  }
});

detailDialog.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  stepDetail(event.key === 'ArrowRight' ? 1 : -1);
});

renderFilterPills();
renderProducts();
