(function(){
  "use strict";
  const $=s=>document.querySelector(s);
  const roomId=new URLSearchParams(location.search).get("id");
  if(!roomId)return;

  let user=null,messages=[],stickers=[],channel=null,pendingPhoto=null;
  const profiles=new Map();
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const media=url=>window.VinciMedia?.resolveUrl?window.VinciMedia.resolveUrl(url):Promise.resolve(url);

  const themes={
    vinci:{name:"Vinci",bg:"#f7f4f1",self:"#f4a261",other:"#ffffff",accent:"#f4a261",text:"#211c18"},
    noite:{name:"Noite",bg:"#171513",self:"#e47d32",other:"#292521",accent:"#f4a261",text:"#f7f3ef"},
    oceano:{name:"Oceano",bg:"#eef7fb",self:"#3d91b8",other:"#ffffff",accent:"#3d91b8",text:"#173342"},
    uva:{name:"Uva",bg:"#f6f0fa",self:"#8b5aa8",other:"#ffffff",accent:"#8b5aa8",text:"#33243c"},
    floresta:{name:"Floresta",bg:"#eef5ee",self:"#547a58",other:"#ffffff",accent:"#547a58",text:"#213023"},
    rosa:{name:"Rosa",bg:"#fff1f5",self:"#d86c91",other:"#ffffff",accent:"#d86c91",text:"#482936"}
  };

  function themeKey(){return `vinci-room-chat-theme:${user?.id||'guest'}:${roomId}`}
  function customKey(){return `vinci-room-chat-custom:${user?.id||'guest'}:${roomId}`}
  function applyTheme(name="vinci",custom=null){
    const t={...(themes[name]||themes.vinci)};
    if(custom){t.self=custom;t.accent=custom}
    const shell=$("#roomChatShell");if(!shell)return;
    shell.style.setProperty("--chat-bg",t.bg);shell.style.setProperty("--chat-self",t.self);shell.style.setProperty("--chat-other",t.other);shell.style.setProperty("--chat-accent",t.accent);shell.style.setProperty("--chat-text",t.text);
    document.querySelectorAll(".chat-theme-option").forEach(b=>b.classList.toggle("active",b.dataset.theme===name));
  }
  function loadTheme(){const name=localStorage.getItem(themeKey())||"vinci",custom=localStorage.getItem(customKey());applyTheme(name,custom)}

  async function loadProfiles(ids){
    const missing=[...new Set(ids.filter(Boolean))].filter(id=>!profiles.has(id));if(!missing.length)return;
    const{data}=await db.from("profiles").select("id,username,name,avatar_url").in("id",missing);
    for(const p of data||[])profiles.set(p.id,p);
  }

  async function loadMessages(){
    const{data,error}=await db.from("vinci_room_messages").select("*").eq("room_id",roomId).order("created_at",{ascending:true}).limit(250);
    if(error){$("#roomChatMessages").innerHTML=`<div class="chat-empty">${esc(error.message.includes('does not exist')?'Instale o PATCH 04 do Chat no Supabase.':error.message)}</div>`;return}
    messages=data||[];await loadProfiles(messages.map(m=>m.user_id));await renderMessages(false);
  }

  function messageMeta(m,time){
    return `<span class="chat-message-meta"><span class="chat-time">${esc(time)}</span>${m.edited_at?'<span class="chat-edited">mensagem editada</span>':''}</span>`;
  }

  async function renderMessages(preserve=true){
    const box=$("#roomChatMessages");if(!box)return;
    const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<130;
    if(!messages.length){box.innerHTML='<div class="chat-empty"><strong>👋 O chat começou.</strong><br><small>Mande a primeira mensagem da Room.</small></div>';return}

    let html="",lastDay="";
    for(const m of messages){
      const d=new Date(m.created_at),day=d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"});
      if(day!==lastDay){html+=`<div class="chat-day">${esc(day)}</div>`;lastDay=day}
      const p=profiles.get(m.user_id)||{},mine=m.user_id===user.id,time=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),avatar=p.avatar_url||"assets/default-avatar.png.png";
      const actions=mine?`<button class="chat-message-menu" data-message-menu="${m.id}" type="button" aria-label="Opções da mensagem">•••</button>`:"";
      let body="";
      if(m.message_type==='text'){
        body=`<div class="chat-bubble" data-bubble="${m.id}"><div class="chat-message-text">${esc(m.content).replace(/\n/g,"<br>")}</div>${messageMeta(m,time)}</div>`;
      }else if(m.message_type==='photo'){
        const u=await media(m.image_url);
        body=`<div class="chat-bubble chat-photo-bubble" data-bubble="${m.id}"><img class="chat-photo" src="${esc(u||'')}" alt="Foto enviada no chat">${messageMeta(m,time)}</div>`;
      }else{
        const u=await media(m.image_url);
        body=`<div class="chat-bubble chat-sticker-bubble" data-bubble="${m.id}"><img class="chat-sticker" src="${esc(u||'')}" alt="Figurinha">${messageMeta(m,time)}</div>`;
      }
      html+=`<div class="chat-row ${mine?'mine':''}" data-message-row="${m.id}" data-user-id="${m.user_id}"><img class="chat-avatar" src="${esc(avatar)}" onerror="this.src='assets/default-avatar.png.png'"><div class="chat-stack"><span class="chat-name">@${esc(p.username||'usuario')}</span><div class="chat-message-wrap">${body}${actions}<div class="chat-message-actions hidden" data-actions="${m.id}">${m.message_type==='text'?`<button type="button" data-edit-message="${m.id}">Editar</button>`:''}<button class="danger" type="button" data-delete-message="${m.id}">Excluir</button></div></div></div></div>`;
    }
    box.innerHTML=html;
    bindMessageActions();
    if(!preserve||nearBottom)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
  }

  function closeMessageMenus(exceptId=null){
    document.querySelectorAll("[data-actions]").forEach(el=>{if(el.dataset.actions!==exceptId)el.classList.add("hidden")});
  }

  function bindMessageActions(){
    document.querySelectorAll("[data-message-menu]").forEach(btn=>btn.onclick=e=>{
      e.stopPropagation();const id=btn.dataset.messageMenu,panel=document.querySelector(`[data-actions="${CSS.escape(id)}"]`);if(!panel)return;
      const opening=panel.classList.contains("hidden");closeMessageMenus();if(opening)panel.classList.remove("hidden");
    });
    document.querySelectorAll("[data-edit-message]").forEach(btn=>btn.onclick=()=>beginEditMessage(btn.dataset.editMessage));
    document.querySelectorAll("[data-delete-message]").forEach(btn=>btn.onclick=()=>beginDeleteMessage(btn.dataset.deleteMessage));
  }

  function beginEditMessage(id){
    const m=messages.find(x=>x.id===id);if(!m||m.user_id!==user.id||m.message_type!=="text")return;
    closeMessageMenus();const bubble=document.querySelector(`[data-bubble="${CSS.escape(id)}"]`);if(!bubble)return;
    bubble.innerHTML=`<div class="chat-inline-editor"><textarea maxlength="2000" rows="2">${esc(m.content)}</textarea><div class="chat-inline-actions"><button type="button" data-cancel-edit>Cancelar</button><button class="primary" type="button" data-save-edit>Salvar</button></div><span class="chat-inline-error" aria-live="polite"></span></div>`;
    const area=bubble.querySelector("textarea");area.focus();area.setSelectionRange(area.value.length,area.value.length);
    bubble.querySelector("[data-cancel-edit]").onclick=()=>renderMessages(true);
    bubble.querySelector("[data-save-edit]").onclick=()=>saveEditedMessage(id,area.value,bubble);
  }

  async function saveEditedMessage(id,value,bubble){
    const content=value.trim(),errorEl=bubble.querySelector(".chat-inline-error"),save=bubble.querySelector("[data-save-edit]");
    if(!content){errorEl.textContent="A mensagem não pode ficar vazia.";return}
    if(content.length>2000){errorEl.textContent="Máximo de 2000 caracteres.";return}
    save.disabled=true;errorEl.textContent="";
    const{data,error}=await db.rpc("vinci_edit_room_message",{p_message_id:id,p_content:content});
    save.disabled=false;
    if(error){errorEl.textContent=error.message.includes("vinci_edit_room_message")?"Rode o PATCH 05 do Chat no Supabase.":error.message;return}
    const idx=messages.findIndex(m=>m.id===id);
    if(idx>=0){messages[idx]={...messages[idx],content,edited_at:data?.edited_at||new Date().toISOString()}}
    await renderMessages(true);
  }

  function beginDeleteMessage(id){
    const m=messages.find(x=>x.id===id);if(!m||m.user_id!==user.id)return;
    closeMessageMenus();const bubble=document.querySelector(`[data-bubble="${CSS.escape(id)}"]`);if(!bubble)return;
    const previous=bubble.innerHTML;
    bubble.innerHTML=`<div class="chat-delete-confirm"><strong>Excluir mensagem?</strong><span>Essa ação não pode ser desfeita.</span><div class="chat-inline-actions"><button type="button" data-cancel-delete>Cancelar</button><button class="danger" type="button" data-confirm-delete>Excluir</button></div><span class="chat-inline-error" aria-live="polite"></span></div>`;
    bubble.querySelector("[data-cancel-delete]").onclick=()=>{bubble.innerHTML=previous;renderMessages(true)};
    bubble.querySelector("[data-confirm-delete]").onclick=()=>deleteMessage(id,bubble);
  }

  async function deleteMessage(id,bubble){
    const m=messages.find(x=>x.id===id);if(!m||m.user_id!==user.id)return;
    const errorEl=bubble.querySelector(".chat-inline-error"),button=bubble.querySelector("[data-confirm-delete]");button.disabled=true;
    const{error}=await db.from("vinci_room_messages").delete().eq("id",id).eq("user_id",user.id);
    button.disabled=false;
    if(error){errorEl.textContent=error.message;return}
    if(m.message_type==='photo'&&m.storage_path){db.storage.from("vinci-images").remove([m.storage_path]).catch(()=>{})}
    messages=messages.filter(x=>x.id!==id);await renderMessages(true);
  }

  async function loadStickers(){const{data}=await db.from("vinci_room_stickers").select("*").eq("room_id",roomId).order("created_at",{ascending:false}).limit(80);stickers=data||[];await renderStickers()}
  async function renderStickers(){const grid=$("#stickerGrid");if(!grid)return;let html='<button class="sticker-option create-sticker" id="createStickerButton">＋<br>Criar</button>';for(const s of stickers){const u=await media(s.image_url);html+=`<button class="sticker-option" data-sticker="${s.id}"><img src="${esc(u||'')}" alt="Figurinha"></button>`}grid.innerHTML=html;$("#createStickerButton").onclick=()=>$("#stickerFile").click();grid.querySelectorAll("[data-sticker]").forEach(b=>b.onclick=()=>sendSticker(b.dataset.sticker))}
  function makePath(kind,ext="webp"){return `${user.id}/rooms/${roomId}/chat/${kind}/${crypto.randomUUID()}.${ext}`}
  async function uploadFile(file,kind){const ext=(file.name?.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=makePath(kind,ext);const{error}=await db.storage.from("vinci-images").upload(path,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;const{data}=db.storage.from("vinci-images").getPublicUrl(path);return{path,url:data.publicUrl}}
  async function stickerBlob(file){return new Promise((resolve,reject)=>{const img=new Image,src=URL.createObjectURL(file);img.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.clearRect(0,0,512,512);const scale=Math.min(460/img.width,460/img.height),w=img.width*scale,h=img.height*scale;x.drawImage(img,(512-w)/2,(512-h)/2,w,h);c.toBlob(b=>{URL.revokeObjectURL(src);b?resolve(b):reject(new Error('Não consegui criar a figurinha.'))},'image/webp',.9)}catch(e){reject(e)}};img.onerror=()=>reject(new Error('Imagem inválida.'));img.src=src})}
  async function sendText(){const input=$("#chatInput"),content=input.value.trim();if(!content)return;$("#chatSend").disabled=true;const{error}=await db.from("vinci_room_messages").insert({room_id:roomId,user_id:user.id,message_type:'text',content});$("#chatSend").disabled=false;if(error){alert(error.message);return}input.value="";input.style.height="auto"}
  async function sendPhoto(){if(!pendingPhoto)return;const file=pendingPhoto;clearPhoto();$("#chatSend").disabled=true;try{const up=await uploadFile(file,'photos');const{error}=await db.from("vinci_room_messages").insert({room_id:roomId,user_id:user.id,message_type:'photo',image_url:up.url,storage_path:up.path});if(error)throw error}catch(e){alert('Não consegui enviar a foto: '+e.message)}finally{$("#chatSend").disabled=false}}
  async function sendSticker(id){const s=stickers.find(x=>x.id===id);if(!s)return;closePanels();const{error}=await db.from("vinci_room_messages").insert({room_id:roomId,user_id:user.id,message_type:'sticker',image_url:s.image_url,storage_path:s.storage_path,sticker_id:s.id});if(error)alert(error.message)}
  async function createSticker(file){if(!file)return;try{const blob=await stickerBlob(file),path=makePath('stickers','webp'),{error:upErr}=await db.storage.from('vinci-images').upload(path,blob,{contentType:'image/webp'});if(upErr)throw upErr;const{data}=db.storage.from('vinci-images').getPublicUrl(path);const{error}=await db.from('vinci_room_stickers').insert({room_id:roomId,created_by:user.id,image_url:data.publicUrl,storage_path:path});if(error)throw error}catch(e){alert('Não consegui criar a figurinha: '+e.message)}}
  function previewPhoto(file){pendingPhoto=file;const url=URL.createObjectURL(file);$("#chatPhotoPreviewImage").src=url;$("#chatPhotoPreview").classList.remove('hidden');$("#chatSend").textContent='Enviar foto'}
  function clearPhoto(){pendingPhoto=null;$("#chatPhotoPreview").classList.add('hidden');$("#chatPhotoPreviewImage").removeAttribute('src');$("#chatPhotoFile").value='';$("#chatSend").textContent='Enviar'}
  function closePanels(){$("#stickerPanel").classList.add('hidden');$("#chatThemePanel").classList.add('hidden');closeMessageMenus()}
  function renderThemes(){const grid=$("#chatThemeGrid");grid.innerHTML=Object.entries(themes).map(([key,t])=>`<button class="chat-theme-option" data-theme="${key}"><div class="chat-theme-swatch" style="background:linear-gradient(135deg,${t.bg} 0 55%,${t.self} 55%)"></div>${esc(t.name)}</button>`).join('');grid.querySelectorAll('.chat-theme-option').forEach(b=>b.onclick=()=>{localStorage.setItem(themeKey(),b.dataset.theme);localStorage.removeItem(customKey());applyTheme(b.dataset.theme,null)});loadTheme()}

  function subscribe(){
    if(channel)db.removeChannel(channel);
    channel=db.channel(`vinci-room-chat-${roomId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'vinci_room_messages',filter:`room_id=eq.${roomId}`},async payload=>{if(messages.some(m=>m.id===payload.new.id))return;messages.push(payload.new);await loadProfiles([payload.new.user_id]);await renderMessages()})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'vinci_room_messages',filter:`room_id=eq.${roomId}`},async payload=>{const i=messages.findIndex(m=>m.id===payload.new.id);if(i>=0)messages[i]=payload.new;else messages.push(payload.new);await loadProfiles([payload.new.user_id]);await renderMessages(true)})
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'vinci_room_messages'},async payload=>{const before=messages.length;messages=messages.filter(m=>m.id!==payload.old.id);if(messages.length!==before)await renderMessages(true)})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'vinci_room_stickers',filter:`room_id=eq.${roomId}`},async payload=>{stickers.unshift(payload.new);await renderStickers()})
      .subscribe();
  }

  function bind(){
    $("#chatSend").onclick=()=>pendingPhoto?sendPhoto():sendText();
    $("#chatInput").addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();pendingPhoto?sendPhoto():sendText()}});
    $("#chatInput").addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'});
    $("#chatPhotoButton").onclick=()=>$("#chatPhotoFile").click();$("#chatPhotoFile").onchange=e=>e.target.files[0]&&previewPhoto(e.target.files[0]);$("#cancelChatPhoto").onclick=clearPhoto;
    $("#chatStickerButton").onclick=()=>{$("#chatThemePanel").classList.add('hidden');$("#stickerPanel").classList.toggle('hidden')};$("#closeStickerPanel").onclick=()=>$("#stickerPanel").classList.add('hidden');
    $("#chatThemeButton").onclick=()=>{$("#stickerPanel").classList.add('hidden');$("#chatThemePanel").classList.toggle('hidden')};$("#closeChatTheme").onclick=()=>$("#chatThemePanel").classList.add('hidden');
    $("#stickerFile").onchange=e=>{const f=e.target.files[0];if(f)createSticker(f);e.target.value=''};
    $("#chatCustomColor").oninput=e=>{const name=localStorage.getItem(themeKey())||'vinci';localStorage.setItem(customKey(),e.target.value);applyTheme(name,e.target.value)};
    document.addEventListener('click',e=>{if(!e.target.closest('.chat-message-wrap'))closeMessageMenus()});
  }

  async function init(){
    const{data:{user:u}}=await db.auth.getUser();if(!u)return;user=u;
    const{data:membership}=await db.from('vinci_room_members').select('user_id').eq('room_id',roomId).eq('user_id',user.id).maybeSingle();if(!membership)return;
    bind();renderThemes();loadTheme();await Promise.all([loadMessages(),loadStickers()]);subscribe();
  }

  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('beforeunload',()=>{if(channel)db.removeChannel(channel)});
})();
