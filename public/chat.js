(() => {
  const panel=document.getElementById('chatPanel');
  const toggle=document.getElementById('chatToggle');
  const close=document.getElementById('chatClose');
  const form=document.getElementById('chatForm');
  const input=document.getElementById('chatInput');
  const messages=document.getElementById('chatMessages');
  const send=document.getElementById('chatSend');
  const history=[];
  fetch('/api/store-status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.checkoutEnabled===true){const greeting=messages.querySelector('.chat-assistant');if(greeting)greeting.textContent='¡Hola! Pregúntame por camisetas, tallas, envíos o devoluciones.'}}).catch(()=>{});
  function open(show){panel.hidden=!show;toggle.setAttribute('aria-expanded',String(show));toggle.setAttribute('aria-label',show?'Cerrar asistente de la tienda':'Abrir asistente de la tienda');if(show)input.focus();else toggle.focus()}
  function append(role,content){const item=document.createElement('p');item.className='chat-bubble '+(role==='user'?'chat-user':'chat-assistant');item.textContent=content;messages.appendChild(item);messages.scrollTop=messages.scrollHeight;return item}
  toggle.addEventListener('click',()=>open(panel.hidden));
  close.addEventListener('click',()=>open(false));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
  form.addEventListener('submit',async e=>{
    e.preventDefault();const question=input.value.trim();if(!question||send.disabled)return;
    append('user',question);input.value='';send.disabled=true;input.disabled=true;
    const pending=append('assistant','Escribiendo…');
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:question,history:history.slice(-6)})});
      const data=await response.json();if(!response.ok||!data.reply)throw Error(data.error||'No puedo responder ahora. Vuelve a intentarlo en unos minutos.');
      pending.textContent=data.reply;history.push({role:'user',content:question},{role:'assistant',content:data.reply});
      if(history.length>8)history.splice(0,history.length-8);
    }catch(error){pending.textContent=error.message||'No puedo responder ahora. Vuelve a intentarlo.'}
    finally{send.disabled=false;input.disabled=false;input.focus();messages.scrollTop=messages.scrollHeight}
  });
})();
