const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
export function mountSortMenu(select) {
  const trigger=document.createElement('button');trigger.type='button';trigger.className='sort-trigger';
  trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label','Ordenar colección');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','sort-menu');
  trigger.innerHTML='<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  select.after(trigger);select.setAttribute('aria-hidden','true');select.tabIndex=-1;
  const menu=document.createElement('div');menu.id='sort-menu';menu.className='sort-menu';menu.setAttribute('popover','auto');menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Orden del catálogo');
  for(const option of select.options) {
    const button=document.createElement('button');button.type='button';button.role='option';button.dataset.sortValue=option.value;
    const label=document.createElement('span');label.textContent=option.textContent;button.append(label);button.insertAdjacentHTML('beforeend',check);menu.append(button);
  }
  document.body.append(menu);
  const buttons=[...menu.querySelectorAll('button')];
  function sync() {trigger.querySelector('span').textContent=select.selectedOptions[0].textContent;buttons.forEach(button=>button.setAttribute('aria-selected',String(button.dataset.sortValue===select.value)));}
  function close(focus=false) {if(menu.matches(':popover-open')) menu.hidePopover();trigger.setAttribute('aria-expanded','false');if(focus) trigger.focus({preventScroll:true});}
  function position() {
    const rect=trigger.getBoundingClientRect(),width=Math.min(272,innerWidth-24),height=menu.offsetHeight;
    menu.style.width=`${width}px`;menu.style.left=`${Math.max(12,Math.min(rect.right-width,innerWidth-width-12))}px`;
    menu.style.top=`${Math.max(12,rect.bottom+height+8<innerHeight?rect.bottom+8:rect.top-height-8)}px`;
  }
  function open() {menu.showPopover();trigger.setAttribute('aria-expanded','true');position();buttons.find(b=>b.dataset.sortValue===select.value)?.focus({preventScroll:true});}
  trigger.addEventListener('click',()=>{if(menu.matches(':popover-open')) close(true);else open();});
  trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
  menu.addEventListener('click',event=>{const button=event.target.closest('[data-sort-value]');if(!button) return;select.value=button.dataset.sortValue;select.dispatchEvent(new Event('change',{bubbles:true}));close(true);});
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    const index=buttons.indexOf(document.activeElement);let next;
    if(event.key==='ArrowDown') next=buttons[(index+1)%buttons.length];
    if(event.key==='ArrowUp') next=buttons[(index-1+buttons.length)%buttons.length];
    if(event.key==='Home') next=buttons[0];if(event.key==='End') next=buttons.at(-1);
    if(next){event.preventDefault();next.focus();}
    if(event.key==='Tab') close();
  });
  menu.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
  window.addEventListener('resize',()=>{if(menu.matches(':popover-open')) position();});
  document.addEventListener('scroll',event=>{if(menu.matches(':popover-open')&&!menu.contains(event.target)) position();},true);
  select.addEventListener('change',sync);sync();
}
