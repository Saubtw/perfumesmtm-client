import {api,API_URL,catalogImage} from './api.js';
import './chat.css';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=s=>typeof s==='string' && (/^\/(?!\/)/.test(s)||s.startsWith('https://'))?catalogImage(s):'';
const sessionKey='mtm-catalog-session-v3';
export function mountChat({currentProduct,openProduct}) {
  const root=document.createElement('aside');root.className='advisor';
  root.innerHTML=`<button class="advisor-launch" aria-label="Asesor de perfumes" aria-expanded="false" aria-controls="advisor-panel"><span>Asesor de perfumes</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 1 1 18 0Z"/></svg></button>
    <section id="advisor-panel" class="advisor-panel" role="dialog" aria-label="Perfume AI Advisor" hidden>
      <header><div><h2>Asesor de catálogo</h2><p>Perfumes MTM</p></div><div class="advisor-header-actions"><button class="advisor-new" type="button" title="Iniciar una nueva conversación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Nuevo chat</button><button class="advisor-close" aria-label="Cerrar asesor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>
      <div class="advisor-messages" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0"></div>
      <div class="advisor-suggestions" aria-label="Consultas rápidas"><button data-prompt="Para el trabajo">Trabajo</button><button data-prompt="Para la escuela">Escuela</button><button data-prompt="Para salir de día">Día</button><button data-prompt="Para una fiesta de noche">Fiesta</button><button data-prompt="Para una cita">Cita</button><button data-prompt="Para usar desde temprano">Temprano</button></div>
      <div class="advisor-status" role="status"></div>
      <form><label for="advisor-input">¿Cuándo y dónde lo usarás?</label><textarea id="advisor-input" rows="2" maxlength="2000" placeholder="Para el trabajo por la mañana, una fiesta de noche…"></textarea><div><span>Enter para enviar · Shift+Enter para otra línea</span><button class="advisor-send" type="submit">Enviar <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-7 14-1-7-6 0Zm6 0 8-7"/></svg></button></div></form>
    </section>`;
  document.body.append(root);
  const panel=root.querySelector('.advisor-panel'),launch=root.querySelector('.advisor-launch'),input=root.querySelector('textarea'),log=root.querySelector('.advisor-messages'),status=root.querySelector('.advisor-status'),form=root.querySelector('form'),newChat=root.querySelector('.advisor-new'),send=root.querySelector('.advisor-send');
  let sessionId=null;try{sessionId=localStorage.getItem(sessionKey);}catch{/* Optional resume pointer. */}
  let busy=false,loaded=false;
  const setSession=id=>{sessionId=id;try{if(id)localStorage.setItem(sessionKey,id);else localStorage.removeItem(sessionKey);}catch{/* Cookie still identifies the visitor. */}};
  function setOpen(open){panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open){input.focus();if(!loaded)void restore();}else launch.focus();}
  launch.onclick=()=>setOpen(panel.hidden);root.querySelector('.advisor-close').onclick=()=>setOpen(false);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.stopPropagation();setOpen(false);}});
  function typing(){status.innerHTML='<span class="advisor-typing" aria-label="Escribiendo"><span></span><span></span><span></span></span>';}
  function message(role,text){const el=document.createElement('article');el.className=`advisor-message advisor-${role}`;el.textContent=text;log.append(el);log.scrollTop=log.scrollHeight;return el;}
  function welcome(){message('assistant','Hola. Te ayudo a elegir un perfume para el momento en que lo usarás. ¿Lo buscas para el trabajo, la escuela o una salida? ¿De día o de noche?');}
  function updateText(el,text){const atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<100;el.hidden=false;el.textContent=text;if(atBottom)log.scrollTop=log.scrollHeight;}
  function cards(el,products){
    const atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<100;
    for(const product of products??[]){
      const card=document.createElement('div');card.className='advisor-product';
      card.innerHTML=`<img src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy"><div><strong>${escapeHTML(product.name)}</strong><p>${escapeHTML(product.reason??'Consulta su perfil olfativo en la ficha.')}</p></div>`;
      const view=document.createElement('a');view.textContent='Ver perfume';view.href=`/#perfume=${encodeURIComponent(product.id)}`;view.onclick=event=>{event.preventDefault();setOpen(false);openProduct(product.id);};card.append(view);el.append(card);
    }
    if(atBottom)log.scrollTop=log.scrollHeight;
  }
  async function restore(){
    if(busy)return;typing();
    try{
      const messages=[];let after=null;
      if(sessionId)for(let page=0;page<20;page++){
        const result=await api(`/chat/sessions/${encodeURIComponent(sessionId)}/messages${after?`?after=${encodeURIComponent(after)}`:''}`);messages.push(...result.messages);if(!result.has_more)break;after=result.after;if(!after)break;
      }
      log.replaceChildren();for(const row of messages){const el=message(row.role,row.text);cards(el,row.recommendations);if(row.follow_up){const follow=document.createElement('p');follow.textContent=row.follow_up;el.append(follow);}}
      if(!messages.length)welcome();loaded=true;status.replaceChildren();log.scrollTop=log.scrollHeight;
    }catch(error){if(error.status===404){setSession(null);log.replaceChildren();welcome();loaded=true;status.textContent='';}else status.textContent='No se pudo cargar la conversación. Cierra y vuelve a abrir el asesor para reintentar.';}
  }
  root.querySelectorAll('.advisor-suggestions button').forEach(button=>{button.title=button.dataset.prompt;button.onclick=()=>{input.value=button.dataset.prompt;input.focus();};});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
  newChat.onclick=async()=>{
    if(busy)return;newChat.disabled=true;
    try{if(sessionId)await api(`/chat/sessions/${encodeURIComponent(sessionId)}`,{method:'DELETE'});setSession(null);loaded=false;await restore();input.focus();}catch(error){status.textContent=error.message;}finally{newChat.disabled=false;}
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();const text=input.value.trim();if(!text||busy)return;
    busy=true;send.disabled=true;newChat.disabled=true;typing();let answer;
    try{
      if(!sessionId){const session=await api('/chat/sessions',{method:'POST',body:'{}'});setSession(session.id);}
      message('user',text);input.value='';answer=message('assistant','');answer.hidden=true;
      const response=await fetch(`${API_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,{
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},
        body:JSON.stringify({message:text,context:{locale:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,current_page:location.pathname+location.hash,current_product_id:currentProduct(),weather_useful:/clima|calor|fr[ií]o|temperatura|verano/i.test(text)}})
      });
      if(!response.ok){const data=await response.json().catch(()=>({}));const error=new Error(data.error?.message||'El asesor no está disponible. Intenta de nuevo.');error.status=response.status;throw error;}
      let complete=false;
      await consumeSSE(response,({type,data})=>{
        if(type==='text')updateText(answer,data.text);
        if(type==='complete'){updateText(answer,data.text);cards(answer,data.recommendations);if(data.follow_up){const follow=document.createElement('p');follow.textContent=data.follow_up;answer.append(follow);}complete=true;status.replaceChildren();}
        if(type==='error')throw new Error(data.message);
      });
      if(!complete)throw new Error('La conexión se interrumpió. Cierra y vuelve a abrir el asesor para continuar.');
    }catch(error){status.textContent=error.message;if(error.status===404)setSession(null);loaded=false;if(!answer)input.value=text;else if(!answer.textContent)answer.remove();}
    finally{busy=false;send.disabled=false;newChat.disabled=false;status.querySelector('.advisor-typing')?.remove();input.focus();}
  });
}
export async function consumeSSE(response,handle){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  try{while(true){const{value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});buffer=buffer.replaceAll('\r\n','\n');let end;
    while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const lines=block.split('\n');const type=lines.find(l=>l.startsWith('event:'))?.slice(6).trim();const data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(type&&data)handle({type,data:JSON.parse(data)});}if(done)break;
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
