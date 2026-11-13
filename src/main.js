import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadCatalog } from './api.js';
import { mountChat } from './chat.js';
import { mountDetailMotion } from './detail-motion.js';
import { mountCommerce } from './cart.js';
import { money, isPriced } from './commerce.js';
import {mountSortMenu} from './sort-menu.js';
import './style.css';
import './refinements.css';

let catalog=[];
try { catalog=await loadCatalog(); }
catch {
  const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='No se pudo cargar la colección. ';
  const retry=document.createElement('button');retry.textContent='Volver a intentar';retry.onclick=()=>location.reload();alert.append(retry);document.querySelector('#catalog-grid').before(alert);
}
const perfumeDetails=Object.fromEntries(catalog.map(item=>[item.id,item.olfactory ?? {}]));
mountCommerce(catalog,{
  openProduct:(id,trigger)=>{const index=catalog.findIndex(p=>p.id===id);if(index>=0) openViewer(index,trigger);},
  onAdded:openCart=>{if(!viewer.hidden) closeViewer({afterClose:openCart,restoreFocus:false,returnToCard:false});else openCart();}
});

gsap.registerPlugin(ScrollTrigger);
const grid = document.querySelector('#catalog-grid');
const resultCount = document.querySelector('#result-count');
const search = document.querySelector('#search-input');
const sort = document.querySelector('#sort-select');
mountSortMenu(sort);
const emptyState = document.querySelector('#empty-state');
const viewer = document.querySelector('#image-viewer');
let activeFilter = 'all';
let activeViewerIndex = 0;
let lastFocused = null;
let viewerOrigin=null;
const detailLayer=document.createElement('dialog');detailLayer.className='detail-layer';detailLayer.setAttribute('aria-labelledby','detail-title');
viewer.before(detailLayer);detailLayer.append(viewer);viewer.removeAttribute('role');viewer.removeAttribute('aria-modal');
detailLayer.addEventListener('cancel',event=>{event.preventDefault();closeViewer();});
const detailMotion = mountDetailMotion(viewer, () => {
  const origin=viewerOrigin?.closest('.cart-product');
  if(origin) return [...document.querySelectorAll('.cart-product')].find(row=>row.dataset.cartProduct===origin.dataset.cartProduct)??null;
  return [...grid.querySelectorAll('.product-item')].find(card => card.dataset.id === catalog[activeViewerIndex]?.id)?.querySelector('.product-visual');
},()=>detailLayer.close());
const counts = { all: catalog.length, masculino: catalog.filter(x => x.gender === 'masculino').length, femenino: catalog.filter(x => x.gender === 'femenino').length };
document.querySelectorAll('.filter-button').forEach((button) => { button.querySelector('span').textContent = counts[button.dataset.filter]; });

const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const plainText = (s) => String(s || '').replace(/&#x20;|&nbsp;/g, ' ').replace(/\*\*/g, '').replace(/\*/g, '').trim();
const splitTags = (s) => plainText(s).replace(/[.]+$/, '').split(/,\s*|\s+y\s+/).map(tag => tag.trim()).filter(Boolean);
const tagMarkup = (tags) => tags.map(tag => `<span class="detail-tag">${escapeHTML(tag)}</span>`).join('');
const svgArrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M7 5h12v12"/></svg>';

function renderCatalog() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  const query = search.value.trim().toLocaleLowerCase('es');
  let items = catalog.filter((item) => (activeFilter === 'all' || item.gender === activeFilter) && `${item.name} ${item.house}`.toLocaleLowerCase('es').includes(query));
  if (sort.value === 'az') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (sort.value === 'za') items = [...items].sort((a, b) => b.name.localeCompare(a.name, 'es'));
  const byPrice=sort.value==='price-asc'||sort.value==='price-desc';
  if(byPrice) items=[...items].sort((a,b)=>Number(!isPriced(a))-Number(!isPriced(b))||(isPriced(a)&&isPriced(b)?(a.price-b.price)*(sort.value==='price-asc'?1:-1):0)||a.name.localeCompare(b.name,'es'));
  const brands = new Map();
  for (const item of items) { if (!brands.has(item.brand)) brands.set(item.brand, []); brands.get(item.brand).push(item); }
  const groups=byPrice?[[sort.value==='price-asc'?'Precio: menor a mayor':'Precio: mayor a menor',items]]:[...brands.entries()];
  const sections = groups.map(([brand, products]) => `
    <section class="brand-section" aria-label="${escapeHTML(brand)}">
      <header class="brand-heading"><div><span class="brand-kicker">${byPrice?'ORDEN POR PRECIO':'MARCA'} · ${escapeHTML(products.length)} ${products.length === 1 ? 'PIEZA' : 'PIEZAS'}</span><h3>${escapeHTML(brand)}</h3></div><span class="brand-rule"></span><span class="brand-total">${String(products.length).padStart(2,'0')}</span></header>
      <div class="brand-grid">${products.map((item) => `
        <article class="product-item" data-id="${escapeHTML(item.id)}">
          <button class="product-visual" data-view="${catalog.indexOf(item)}" aria-label="Ver detalles de ${escapeHTML(item.name)}">
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)} de ${escapeHTML(item.brand)}" loading="lazy" width="1000" height="1000" />
            <span class="visual-wash"></span><span class="visual-border"></span><span class="visual-index">${String(item.display_index).padStart(3,'0')} <i>—</i> 118</span>
            <span class="visual-tag">${item.gender === 'masculino' ? 'HOMBRE' : 'MUJER'}</span><span class="visual-open" aria-hidden="true">${svgArrow}</span>
          </button>
          <div class="product-meta"><div><p class="product-house">${escapeHTML(item.brand)}</p><h4>${escapeHTML(item.name)}</h4><button class="product-detail-link" data-view="${catalog.indexOf(item)}">Ver ficha <span aria-hidden="true">↗</span></button></div><span class="product-number">${String(item.display_index).padStart(3,'0')}</span></div>
          <div class="product-commerce"><span class="product-price">${isPriced(item)?money(item.price):'Precio por confirmar'}</span><button class="product-add" data-add-product="${escapeHTML(item.id)}" aria-label="Agregar ${escapeHTML(item.name)} al carrito" ${isPriced(item)?'':'disabled'}>Agregar <span aria-hidden="true">+</span></button></div>
        </article>`).join('')}</div></section>`).join('');
  grid.innerHTML = sections;
  resultCount.textContent = `${items.length} ${items.length === 1 ? 'perfume' : 'perfumes'}`;
  document.querySelector('.results-caption').textContent=byPrice?'PERFUMES POR PRECIO':'PERFUMES POR MARCA';
  emptyState.hidden = items.length > 0;
  grid.hidden = false;
  gsap.utils.toArray('.product-item').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.fromTo(el, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }) }));
}

function showViewer(index) {
  if(!catalog.length) return;
  activeViewerIndex = (index + catalog.length) % catalog.length;
  const item = catalog[activeViewerIndex];
  viewer.querySelector('.detail-price').textContent=isPriced(item)?`${money(item.price)} MXN`:'Precio por confirmar';
  const addButton=viewer.querySelector('.detail-add');addButton.dataset.addProduct=item.id;addButton.disabled=!isPriced(item);
  const detail = perfumeDetails[item.id] || {};
  const image = viewer.querySelector('.viewer-image');
  image.src = item.image; image.alt = `${item.name} de ${item.brand}`;
  viewer.querySelector('.detail-brand').textContent = item.brand;
  viewer.querySelector('.detail-title').textContent = item.name;
  viewer.querySelector('.detail-index').textContent = `${String(item.display_index).padStart(3,'0')} / 118`;
  viewer.querySelector('.detail-family').innerHTML = tagMarkup(splitTags(detail.family));
  viewer.querySelector('.detail-smell').textContent = plainText(detail.summary || detail.smell).split(/(?<=[.!?])\s/)[0] || 'Descripción olfativa pendiente de verificación.';
  viewer.querySelector('.detail-occasion').innerHTML = tagMarkup(splitTags(plainText(detail.occasion).split(/[.!?]/)[0]).slice(0, 4));
  viewer.querySelector('.detail-occasion-section').hidden = !detail.occasion;
  detailMotion.resetNotes();

  const profileTags = plainText(detail.profile).split(/[,;]+/).map(tag => tag.trim().replace(/[.]+$/, '')).filter(Boolean).slice(0, 3);
  viewer.querySelector('.detail-profile').innerHTML = profileTags.map(tag => {
    const match = tag.match(/^(frescura|dulzor|dulce|intensidad)\s+(.+)$/i);
    return match ? `<div><dt>${escapeHTML(match[1] === 'dulce' ? 'Dulzor' : match[1])}</dt><dd>${escapeHTML(match[2])}</dd></div>` : `<div><dt>Carácter</dt><dd>${escapeHTML(tag)}</dd></div>`;
  }).join('');

  const phases = [
    ['Salida', detail.opening],
    ['Corazón', detail.heart],
    ['Fondo', detail.base],
  ].filter(([, value]) => value);
  const notes = viewer.querySelector('.detail-notes');
  if (phases.length) {
    notes.innerHTML = phases.map(([label, value]) => `<div class="detail-phase"><span>${label}</span><p>${escapeHTML(plainText(value))}</p></div>`).join('');
  } else if (detail.notes) {
    notes.innerHTML = `<div class="detail-phase detail-phase-wide"><span>Notas reportadas</span><p>${escapeHTML(plainText(detail.notes))}</p></div>`;
  } else {
    notes.innerHTML = '<div class="detail-phase detail-phase-wide"><span>Notas</span><p>No hay una pirámide olfativa confirmada para esta referencia.</p></div>';
  }
  const caution = viewer.querySelector('.detail-caution');
  caution.textContent = plainText(detail.note);
  caution.hidden = !detail.note;
  viewer.querySelector('.detail-copy').scrollTop = 0;
  viewer.querySelector('.detail-dialog').scrollTop = 0;
}
function openViewer(index, trigger) {
  if(!catalog.length) return;
  lastFocused = document.activeElement;viewerOrigin=trigger??null;
  if(!detailLayer.open) detailLayer.showModal();
  showViewer(index); detailMotion.open(trigger);
}
function closeViewer(options={}) {
  detailMotion.close(lastFocused,options);
}
grid.addEventListener('click', (event) => { const trigger = event.target.closest('[data-view]'); if (trigger) openViewer(Number(trigger.dataset.view), trigger); });
search.addEventListener('input', renderCatalog); sort.addEventListener('change', renderCatalog);
document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  renderCatalog();
}));
document.querySelector('#reset-search').addEventListener('click', () => { search.value = ''; activeFilter = 'all'; document.querySelector('[data-filter="all"]').click(); search.focus(); });
viewer.querySelector('#viewer-close').addEventListener('click', closeViewer);
viewer.querySelector('.viewer-prev').addEventListener('click', () => showViewer(activeViewerIndex - 1));
viewer.querySelector('.viewer-next').addEventListener('click', () => showViewer(activeViewerIndex + 1));
viewer.addEventListener('click', (event) => { if (event.target === viewer) closeViewer(); });
document.addEventListener('keydown', (event) => {
  if(document.querySelector('.cart-dialog[open]')&&viewer.hidden) return;
  if (event.key === '/' && !document.activeElement.matches('input,textarea,[contenteditable="true"]') && viewer.hidden) { event.preventDefault(); search.focus(); }
  if (!viewer.hidden) {
    if (event.key === 'Escape') {event.preventDefault();closeViewer();}
    if (event.key === 'ArrowLeft') showViewer(activeViewerIndex - 1);
    if (event.key === 'ArrowRight') showViewer(activeViewerIndex + 1);
    if (event.key === 'Tab') { const focusable = [...viewer.querySelectorAll('button, summary')]; const first = focusable[0]; const last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  }
});
renderCatalog();
const header=document.querySelector('.site-header');
new IntersectionObserver(([entry])=>header.classList.toggle('is-scrolled',!entry.isIntersecting),{rootMargin:'-76px 0px 0px 0px'}).observe(document.querySelector('.hero'));
const currentProduct=()=>!viewer.hidden ? catalog[activeViewerIndex]?.id ?? null : null;
function openProduct(id) {const index=catalog.findIndex(p=>p.id===id);if(index>=0) openViewer(index);}
function openHashProduct() {if(location.hash.startsWith('#perfume=')) {try {openProduct(decodeURIComponent(location.hash.slice(9)));} catch { /* Invalid links do not break browsing. */ }}}
window.addEventListener('hashchange',openHashProduct);openHashProduct();
mountChat({currentProduct,openProduct});
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.from('.site-header', { y: -18, autoAlpha: 0, duration: 0.7 }).from('.hero-note, .hero h1, .hero-description, .hero-cta', { y: 28, autoAlpha: 0, duration: 0.85, stagger: 0.11 }, '-=0.28').from('.hero-index, .hero-bottom', { autoAlpha: 0, duration: 0.6 }, '-=0.35');
  gsap.to('.hero-copy', { yPercent: -13, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.65 } });
  gsap.from('.closing h2', { y: 35, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.closing', start: 'top 76%', once: true } });
} else gsap.set('.site-header, .hero-note, .hero h1, .hero-description, .hero-cta, .hero-index, .hero-bottom, .closing h2', { clearProps: 'all' });
const canvas = document.querySelector('#scene-canvas');
if (canvas) import('./scene.js').then(({ mountPerfumeScene }) => mountPerfumeScene(canvas, { reducedMotion: prefersReducedMotion })).catch(() => document.documentElement.classList.add('webgl-fallback'));
else document.documentElement.classList.add('webgl-fallback');
