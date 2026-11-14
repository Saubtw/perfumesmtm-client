import logos from './brand-logos.json';
import gsap from 'gsap';
import './brand-explorer.css';

export const brandHouse=brand=>brand==='Valentino Donna'||brand==='Valentino Uomo'?'Valentino':brand;

export function mountBrandExplorer(catalog,toolbar,onChange) {
  const counts=new Map();
  for(const item of catalog) {const brand=brandHouse(item.brand);counts.set(brand,(counts.get(brand)||0)+1);}
  const section=document.createElement('section');section.className='brand-explorer';section.setAttribute('aria-labelledby','brand-explorer-title');
  section.innerHTML='<header><h3 id="brand-explorer-title">Explora por marca</h3><div class="brand-explorer-controls"><button type="button" aria-label="Marcas anteriores"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" aria-label="Más marcas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></header><div class="brand-logo-track" role="group" aria-label="Filtrar por marca"></div><p class="brand-explorer-selection" role="status"></p>';
  toolbar.before(section);
  const track=section.querySelector('.brand-logo-track');
  const heading=document.createElement('div');heading.className='brand-explorer-heading';
  const title=section.querySelector('h3');title.before(heading);heading.append(title);
  const clear=document.createElement('button');clear.type='button';clear.className='brand-filter-clear';clear.hidden=true;heading.append(clear);
  clear.addEventListener('click',()=>{setValue('');onChange();title.tabIndex=-1;title.focus({preventScroll:true});});
  const belt=document.createElement('div');belt.className='brand-logo-belt';
  const group=document.createElement('div');group.className='brand-logo-group';belt.append(group);track.append(belt);
  let selected='';
  for(const [brand,count] of [['',catalog.length],...[...counts].sort(([a],[b])=>a.localeCompare(b,'es'))]) {
    const button=document.createElement('button');button.type='button';button.className='brand-logo-button';button.dataset.brand=brand;button.setAttribute('aria-pressed',String(!brand));
    button.setAttribute('aria-label',brand?`Ver perfumes de ${brand}`:'Ver todas las marcas');
    const art=document.createElement('span');art.className='brand-logo-art';
    const logo=logos[brand];
    if(logo) {const img=document.createElement('img');img.src=logo.src;img.alt='';img.width=140;img.height=64;img.loading='lazy';art.append(img);if(logo.dark) art.classList.add('brand-logo-dark');}
    else art.textContent=brand||'Todas';
    const name=document.createElement('span');name.className='brand-logo-name';name.textContent=brand||'Todas las marcas';
    const total=document.createElement('span');total.className='brand-logo-count';total.textContent=`${count} ${count===1?'perfume':'perfumes'}`;
    button.append(art,name,total);group.append(button);
  }
  for(const before of [true,false]) {
    const copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');
    copy.querySelectorAll('button').forEach(button=>{button.tabIndex=-1;});
    if(before) belt.prepend(copy);else belt.append(copy);
  }
  track.addEventListener('click',event=>{const button=event.target.closest('.brand-logo-button');if(button){setValue(button.dataset.brand);onChange();}});
  function setValue(value) {
    selected=value;
    for(const button of belt.querySelectorAll('.brand-logo-button')) button.setAttribute('aria-pressed',String(button.dataset.brand===selected));
    clear.hidden=!selected;clear.textContent=selected?`${selected} ×`:'';
    clear.setAttribute('aria-label',`Quitar filtro de ${selected}`);
    section.querySelector('.brand-explorer-selection').textContent=selected?`${selected} · ${counts.get(selected)} perfumes`:'Todas las marcas · Desliza para explorar';
  }
  setValue('');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width:620px), (hover:none) and (pointer:coarse)');
  const controls=[...section.querySelectorAll('.brand-explorer-controls button')];
  let hovered=false,visible=false,phase=0,cycle=0,ramp=0,nudge;
  const move=gsap.quickSetter(belt,'x','px');
  const advance=amount=>{
    if(!cycle) return;
    phase=((phase+amount)%cycle+cycle)%cycle;
    move(-phase);wrap();
  };
  controls.forEach((button,index)=>button.addEventListener('click',()=>{
    nudge?.kill();
    const column=group.querySelector('button').getBoundingClientRect().width+parseFloat(getComputedStyle(group).columnGap);
    const step=(index?1:-1)*column;
    if(reduced.matches){advance(step);return;}
    const offset={value:0};let previous=0;
    nudge=gsap.to(offset,{value:step,duration:.65,ease:'power2.inOut',onUpdate:()=>{advance(offset.value-previous);previous=offset.value;}});
  }));
  section.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse') hovered=true;});
  section.addEventListener('pointerleave',()=>{hovered=false;});
  track.addEventListener('pointerdown',()=>nudge?.kill(),{passive:true});
  track.addEventListener('wheel',()=>nudge?.kill(),{passive:true});
  // Native scrolling handles touch, trackpads and keyboard. Only the automatic
  // offset uses a fractional transform, avoiding integer scrollLeft stepping.
  const wrap=()=>{
    if(!cycle) return;
    const effective=track.scrollLeft+phase;
    if(effective>=2*cycle||effective<cycle) {
      track.scrollLeft+=effective>=2*cycle?-cycle:cycle;
    }
  };
  track.addEventListener('scroll',wrap,{passive:true});
  const resizeObserver=new ResizeObserver(()=>{
    nudge?.kill();
    cycle=group.getBoundingClientRect().width+parseFloat(getComputedStyle(belt).columnGap);
    phase=0;move(0);track.scrollLeft=cycle;
  });resizeObserver.observe(group);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.1});observer.observe(track);
  const tick=(_time,delta)=>{
    const blocked=reduced.matches||mobile.matches||hovered||!visible||document.hidden||document.querySelector('dialog[open]');
    section.dataset.motion=mobile.matches?'manual':reduced.matches?'reduced':blocked?'paused':'running';
    if(blocked){ramp=0;return;}
    if(!cycle) return;
    const dt=Math.min(delta,50);
    ramp=Math.min(1,ramp+dt/700);
    advance(18*dt/1000*ramp);
  };
  gsap.ticker.add(tick);
  window.addEventListener('pagehide',()=>{nudge?.kill();gsap.ticker.remove(tick);observer.disconnect();resizeObserver.disconnect();},{once:true});
  return {get value(){return selected;},set value(value){setValue(value);}};
}
