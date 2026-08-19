(function(){"use strict";const $=s=>document.querySelector(s),fid=new URLSearchParams(location.search).get('id');if(!fid)return;const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));const media=u=>window.VinciMedia?.resolveUrl?window.VinciMedia.resolveUrl(u):Promise.resolve(u);let user=null,friendship=null,other=null,messages=[],reactions=[],stickers=[],replyTo=null,pendingPhoto=null,recorder=null,recordChunks=[],recordStart=0,recordTimer=null,recordStream=null,pendingAudio=null,pendingAudioUrl=null,channel=null;
const themes={vinci:{name:'Vinci',bg:'#f6f3f0',self:'#f4a261',other:'#fff',accent:'#f4a261',text:'#211c18'},midnight:{name:'Midnight',bg:'#15191d',self:'#4b81ff',other:'#252b31',accent:'#6d98ff',text:'#f7f9fb'},sakura:{name:'Sakura',bg:'#fff1f5',self:'#d86c91',other:'#fff',accent:'#d86c91',text:'#44252f'},forest:{name:'Forest',bg:'#edf5ee',self:'#50795b',other:'#fff',accent:'#50795b',text:'#1f3023'},nebula:{name:'Nebula',bg:'#181426',self:'#875bd7',other:'#29213d',accent:'#aa7cff',text:'#fbf8ff'},sunset:{name:'Sunset',bg:'#fff1e7',self:'#ee7957',other:'#fff',accent:'#ee7957',text:'#46271d'}};
function applyTheme(key='vinci',accent=null){const t={...(themes[key]||themes.vinci)};if(accent){t.self=accent;t.accent=accent}const s=$('#directShell');for(const[k,v]of Object.entries({bg:t.bg,self:t.self,other:t.other,accent:t.accent,text:t.text}))s.style.setProperty(`--direct-${k}`,v)}
async function loadSettings(){const{data}=await db.from('vinci_direct_chat_settings').select('*').eq('friendship_id',fid).eq('user_id',user.id).maybeSingle();applyTheme(data?.theme_key||'vinci',data?.accent_color||null);if(data?.accent_color)$('#directAccent').value=data.accent_color}
async function saveTheme(key,accent=null){const{error}=await db.from('vinci_direct_chat_settings').upsert({friendship_id:fid,user_id:user.id,theme_key:key,accent_color:accent,updated_at:new Date().toISOString()},{onConflict:'friendship_id,user_id'});if(error)return alert(error.message);applyTheme(key,accent)}
async function loadFriendship(){const{data,error}=await db.from('vinci_friendships').select('*').eq('id',fid).maybeSingle();if(error||!data){location.replace('friends.html');return false}friendship=data;const oid=data.user_a===user.id?data.user_b:data.user_a;const{data:p}=await db.from('profiles').select('id,username,name,avatar_url').eq('id',oid).maybeSingle();other=p||{id:oid,username:'usuario',name:'Usuário'};$('#directUsername').textContent='@'+(other.username||'usuario');$('#directName').textContent=other.name||'Vinci';$('#directAvatar').src=other.avatar_url||'assets/default-avatar.png.png';$('#directAvatar').onerror=()=>$('#directAvatar').src='assets/default-avatar.png.png';$('#friendProfileLink').href=`profile.html?id=${oid}`;$('#friendProfileLink').dataset.userId=oid;$('#directAvatar').classList.add('direct-avatar');window.dispatchEvent(new CustomEvent('vinci-cosmetics-changed'));$('#friendshipInfo').href=`friendship.html?id=${fid}`;$('#directCapsuleLink').href=`capsules.html?friendship_id=${fid}`;return true}
async function loadAll(){const [{data:m,error},{data:r},{data:s}]=await Promise.all([db.from('vinci_direct_messages').select('*').eq('friendship_id',fid).order('created_at').limit(350),db.from('vinci_direct_reactions').select('*').in('message_id',(messages||[]).map(x=>x.id).length?(messages||[]).map(x=>x.id):['00000000-0000-0000-0000-000000000000']),db.from('vinci_direct_stickers').select('*').eq('friendship_id',fid).order('created_at',{ascending:false}).limit(100)]);if(error){$('#directMessages').innerHTML='<div class="direct-empty">Instale o PATCH 10 Social Expansion no Supabase.</div>';return}messages=m||[];const ids=messages.map(x=>x.id);if(ids.length){const{data:rr}=await db.from('vinci_direct_reactions').select('*').in('message_id',ids);reactions=rr||[]}else reactions=[];stickers=s||[];await render();await renderStickers()}
function msgSnippet(m){if(!m)return'';if(m.message_type==='text')return m.content||'';if(m.message_type==='audio')return'🎙️ Áudio';if(m.message_type==='photo')return'📷 Foto';return'☺ Figurinha'}
async function render(){const box=$('#directMessages'),near=box.scrollHeight-box.scrollTop-box.clientHeight<130;if(!messages.length){box.innerHTML='<div class="direct-empty"><strong>Agora é só vocês dois.</strong><br>Comece a conversa 🧡</div>';return}let html='',day='';for(const m of messages){const d=new Date(m.created_at),ds=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});if(ds!==day){html+=`<div class="direct-day">${esc(ds)}</div>`;day=ds}const mine=m.user_id===user.id,reply=messages.find(x=>x.id===m.reply_to),time=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});let body='';if(m.message_type==='text')body=`<p>${esc(m.content||'')}</p>`;else if(m.message_type==='photo'){const u=await media(m.media_url);body=`<img class="direct-photo" src="${esc(u||'')}" alt="Foto">`}else if(m.message_type==='audio'){const u=await media(m.media_url);body=`<div class="direct-audio"><span>🎙️</span><audio controls preload="metadata" src="${esc(u||'')}"></audio></div>`}else{const u=await media(m.media_url);body=`<img class="direct-sticker-img" src="${esc(u||'')}" alt="Figurinha">`}const reacts=reactions.filter(r=>r.message_id===m.id);html+=`<div class="direct-row ${mine?'mine':''}" data-message="${m.id}" data-user-id="${m.user_id}">${mine?'':`<img class="direct-msg-avatar" src="${esc(other.avatar_url||'assets/default-avatar.png.png')}" onerror="this.src='assets/default-avatar.png.png'">`}<div class="direct-stack"><div class="direct-bubble ${m.message_type==='sticker'?'sticker':''}" data-bubble="${m.id}">${reply?`<div class="direct-reply-preview">↩ ${esc(msgSnippet(reply))}</div>`:''}${body}<span class="direct-meta"><span>${time}</span>${m.edited_at?'<span class="direct-edited">mensagem editada</span>':''}</span></div><button class="direct-menu-button" data-menu="${m.id}">•••</button><div class="direct-actions hidden" data-actions="${m.id}"><div class="quick-reactions">${['❤️','😂','😮','🔥'].map(e=>`<button data-react="${m.id}" data-emoji="${e}">${e}</button>`).join('')}</div><button data-reply="${m.id}">Responder</button>${mine&&m.message_type==='text'?`<button data-edit="${m.id}">Editar</button>`:''}${mine?`<button class="danger" data-delete="${m.id}">Excluir</button>`:''}</div>${reacts.length?`<div class="direct-reactions">${reacts.map(r=>`<span class="direct-reaction ${r.user_id===user.id?'mine':''}">${r.emoji}</span>`).join('')}</div>`:''}</div></div>`}box.innerHTML=html;bindMessageActions();if(near)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight)}
function closeActions(){document.querySelectorAll('[data-actions]').forEach(x=>x.classList.add('hidden'))}
function bindMessageActions(){document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=document.querySelector(`[data-actions="${b.dataset.menu}"]`),hidden=a.classList.contains('hidden');closeActions();a.classList.toggle('hidden',!hidden)});document.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>setReply(b.dataset.reply));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editMessage(b.dataset.edit));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteConfirm(b.dataset.delete));document.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>react(b.dataset.react,b.dataset.emoji))}
function setReply(id){replyTo=id;const m=messages.find(x=>x.id===id);$('#replyText').textContent=msgSnippet(m);$('#replyBar').classList.remove('hidden');closeActions();$('#directInput').focus()}function clearReply(){replyTo=null;$('#replyBar').classList.add('hidden')}
async function react(id,emoji){const existing=reactions.find(x=>x.message_id===id&&x.user_id===user.id);if(existing){await db.from('vinci_direct_reactions').delete().eq('message_id',id).eq('user_id',user.id);reactions=reactions.filter(x=>!(x.message_id===id&&x.user_id===user.id));if(existing.emoji===emoji){await render();return}}const{error}=await db.from('vinci_direct_reactions').insert({message_id:id,user_id:user.id,emoji});if(!error)reactions.push({message_id:id,user_id:user.id,emoji});await render()}
function editMessage(id){const m=messages.find(x=>x.id===id);if(!m)return;const b=document.querySelector(`[data-bubble="${id}"]`);b.innerHTML=`<textarea class="direct-edit" maxlength="3000">${esc(m.content||'')}</textarea><div class="direct-edit-actions"><button data-cancel-edit>Cancelar</button><button data-save-edit>Salvar</button></div>`;b.querySelector('[data-cancel-edit]').onclick=()=>render();b.querySelector('[data-save-edit]').onclick=async()=>{const val=b.querySelector('textarea').value.trim();if(!val)return;const{data,error}=await db.rpc('vinci_edit_direct_message',{p_message_id:id,p_content:val});if(error)return alert(error.message);const row=Array.isArray(data)?data[0]:data;const i=messages.findIndex(x=>x.id===id);if(i>=0)messages[i]=row||{...messages[i],content:val,edited_at:new Date().toISOString()};await render()}}
function deleteConfirm(id){const b=document.querySelector(`[data-bubble="${id}"]`),m=messages.find(x=>x.id===id);b.innerHTML='<div class="direct-delete-confirm"><strong>Excluir mensagem?</strong><div><button data-cancel>Cancelar</button><button data-confirm>Excluir</button></div></div>';b.querySelector('[data-cancel]').onclick=()=>render();b.querySelector('[data-confirm]').onclick=async()=>{const{error}=await db.rpc('vinci_delete_direct_message',{p_message_id:id});if(error)return alert(error.message);if(m?.storage_path){const bucket=m.message_type==='audio'?'vinci-audio':'vinci-images';db.storage.from(bucket).remove([m.storage_path]).catch(()=>{})};messages=messages.filter(x=>x.id!==id);await render()}}
function makePath(kind,ext){return`${user.id}/friends/${fid}/${kind}/${crypto.randomUUID()}.${ext}`}
async function upload(blob,kind,ext,mime){const path=makePath(kind,ext),bucket=kind==='audio'?'vinci-audio':'vinci-images',rawType=mime||blob.type||undefined,contentType=kind==='audio'&&rawType?String(rawType).split(';')[0].trim():rawType,{error}=await db.storage.from(bucket).upload(path,blob,{contentType});if(error)throw error;const{data}=db.storage.from(bucket).getPublicUrl(path);return{path,url:data.publicUrl,bucket}}
async function send(type,content=null,up=null,stickerId=null){const{error}=await db.rpc('vinci_send_direct_message',{p_friendship_id:fid,p_type:type,p_content:content,p_media_url:up?.url||null,p_storage_path:up?.path||null,p_sticker_id:stickerId,p_reply_to:replyTo});if(error){alert(error.message);return false}clearReply();return true}
async function sendText(){const v=$('#directInput').value.trim();if(!v)return;$('#directSend').disabled=true;if(await send('text',v)){$('#directInput').value='';$('#directInput').style.height='auto'}$('#directSend').disabled=false}
function previewPhoto(f){pendingPhoto=f;$('#mediaPreviewImage').src=URL.createObjectURL(f);$('#mediaPreview').classList.remove('hidden')}
function clearPhoto(){pendingPhoto=null;$('#mediaPreview').classList.add('hidden');$('#directPhotoFile').value=''}
async function sendPhoto(){if(!pendingPhoto)return;const f=pendingPhoto;clearPhoto();try{const ext=(f.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg',up=await upload(f,'photos',ext,f.type);await send('photo',null,up)}catch(e){alert(e.message)}}
async function renderStickers(){const g=$('#directStickerGrid');if(!g)return;let h='<button id="createDirectSticker">＋<small>Criar</small></button>';for(const s of stickers){const u=await media(s.image_url);h+=`<button data-sticker="${s.id}"><img src="${esc(u||'')}"></button>`}g.innerHTML=h;$('#createDirectSticker').onclick=()=>$('#directStickerFile').click();g.querySelectorAll('[data-sticker]').forEach(b=>b.onclick=()=>sendSticker(b.dataset.sticker))}
async function stickerBlob(file){return new Promise((res,rej)=>{const img=new Image,src=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),sc=Math.min(460/img.width,460/img.height),w=img.width*sc,h=img.height*sc;x.clearRect(0,0,512,512);x.drawImage(img,(512-w)/2,(512-h)/2,w,h);c.toBlob(b=>{URL.revokeObjectURL(src);b?res(b):rej(new Error('Falha ao criar figurinha'))},'image/webp',.9)};img.onerror=()=>rej(new Error('Imagem inválida'));img.src=src})}
async function createSticker(f){try{const blob=await stickerBlob(f),up=await upload(blob,'stickers','webp','image/webp'),{data,error}=await db.from('vinci_direct_stickers').insert({friendship_id:fid,created_by:user.id,image_url:up.url,storage_path:up.path}).select().single();if(error)throw error;stickers.unshift(data);await renderStickers()}catch(e){alert(e.message)}}
async function sendSticker(id){const s=stickers.find(x=>x.id===id);if(!s)return;await send('sticker',null,{url:s.image_url,path:s.storage_path},s.id);closePanels()}
function mimeChoice(){for(const t of['audio/mp4','audio/webm;codecs=opus','audio/webm'])if(MediaRecorder.isTypeSupported?.(t))return t;return''}

function clearPendingAudio(hideBar=true){
  if(pendingAudioUrl){
    URL.revokeObjectURL(pendingAudioUrl);
    pendingAudioUrl=null;
  }
  pendingAudio=null;
  recordChunks=[];
  const preview=$('#recordPreview');
  if(preview){
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    preview.classList.add('hidden');
  }
  $('#recordBar')?.classList.remove('is-ready');
  $('#recordDot')?.classList.remove('hidden');
  $('#stopRecord')?.classList.remove('hidden');
  $('#sendRecord')?.classList.add('hidden');
  if($('#cancelRecord'))$('#cancelRecord').textContent='Cancelar';
  if($('#recordStatus'))$('#recordStatus').textContent='Gravando áudio...';
  if($('#recordTime'))$('#recordTime').textContent='00:00';
  if(hideBar)$('#recordBar')?.classList.add('hidden');
}

async function startRecord(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    return alert('Seu navegador não liberou gravação de áudio.');
  }

  try{
    clearPendingAudio(false);

    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=mimeChoice();

    recordStream=stream;
    recordChunks=[];
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);

    recorder.ondataavailable=e=>{
      if(e.data.size)recordChunks.push(e.data);
    };

    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      recordStream=null;
      clearInterval(recordTimer);
      recordTimer=null;

      const usedRecorder=recorder;
      recorder=null;
      $('#directRecord').textContent='◉';

      if(!recordChunks.length){
        clearPendingAudio(true);
        return;
      }

      const type=usedRecorder?.mimeType||mime||'audio/webm';
      const blob=new Blob(recordChunks,{type});
      const ext=blob.type.includes('mp4')?'m4a':'webm';

      pendingAudio={blob,ext,mime:blob.type||type};
      pendingAudioUrl=URL.createObjectURL(blob);

      const preview=$('#recordPreview');
      preview.src=pendingAudioUrl;
      preview.classList.remove('hidden');

      $('#recordBar').classList.remove('hidden');
      $('#recordBar').classList.add('is-ready');
      $('#recordDot').classList.add('hidden');
      $('#stopRecord').classList.add('hidden');
      $('#sendRecord').classList.remove('hidden');
      $('#cancelRecord').textContent='Descartar';
      $('#recordStatus').textContent='Áudio pronto para enviar';
    };

    recorder.start();
    recordStart=Date.now();

    $('#recordBar').classList.remove('hidden');
    $('#recordBar').classList.remove('is-ready');
    $('#recordDot').classList.remove('hidden');
    $('#recordStatus').textContent='Gravando áudio...';
    $('#stopRecord').classList.remove('hidden');
    $('#sendRecord').classList.add('hidden');
    $('#cancelRecord').textContent='Cancelar';
    $('#directRecord').textContent='■';

    recordTimer=setInterval(()=>{
      const s=Math.floor((Date.now()-recordStart)/1000);
      $('#recordTime').textContent=
        `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    },250);

  }catch(e){
    alert('Não consegui acessar o microfone: '+e.message);
  }
}

function finishRecord(){
  if(!recorder||recorder.state==='inactive')return;
  $('#stopRecord').disabled=true;
  recorder.stop();
  setTimeout(()=>{
    if($('#stopRecord'))$('#stopRecord').disabled=false;
  },300);
}

function cancelRecord(){
  if(recorder&&recorder.state!=='inactive'){
    const active=recorder;
    const stream=recordStream;

    active.onstop=()=>{
      stream?.getTracks().forEach(t=>t.stop());
      recordStream=null;
      recorder=null;
      clearInterval(recordTimer);
      recordTimer=null;
      $('#directRecord').textContent='◉';
      clearPendingAudio(true);
    };

    active.stop();
    return;
  }

  clearPendingAudio(true);
  $('#directRecord').textContent='◉';
}

async function sendRecordedAudio(){
  if(!pendingAudio)return;

  const button=$('#sendRecord');
  button.disabled=true;
  button.textContent='Enviando...';

  try{
    const audio=pendingAudio;
    const up=await upload(audio.blob,'audio',audio.ext,audio.mime);
    const ok=await send('audio',null,up);

    if(ok){
      clearPendingAudio(true);
      $('#directRecord').textContent='◉';
    }else{
      await db.storage.from(up.bucket||'vinci-audio').remove([up.path]).catch(()=>{});
    }
  }catch(e){
    alert(e.message);
  }finally{
    button.disabled=false;
    button.textContent='Enviar áudio';
  }
}
function renderThemes(){const g=$('#directThemeGrid');g.innerHTML=Object.entries(themes).map(([k,t])=>`<button class="direct-theme-option" data-theme="${k}"><div class="theme-swatch" style="background:linear-gradient(135deg,${t.bg} 0 55%,${t.self} 55%)"></div>${t.name}</button>`).join('');g.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>saveTheme(b.dataset.theme,null))}
function closePanels(){document.querySelectorAll('.direct-panel').forEach(x=>x.classList.add('hidden'))}
function bind(){ $('#directBack').onclick=()=>history.length>1?history.back():location.assign('friends.html');$('#directSend').onclick=()=>pendingPhoto?sendPhoto():sendText();$('#directInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();pendingPhoto?sendPhoto():sendText()}};$('#directInput').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(105,e.target.scrollHeight)+'px'};$('#directMore').onclick=()=>$('#directPhotoFile').click();$('#directPhotoFile').onchange=e=>e.target.files?.[0]&&previewPhoto(e.target.files[0]);$('#cancelMedia').onclick=clearPhoto;$('#directSticker').onclick=()=>{$('#directStickerPanel').classList.toggle('hidden');$('#directThemePanel').classList.add('hidden')};$('#directStickerFile').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)createSticker(f)};$('#directThemeButton').onclick=()=>{$('#directThemePanel').classList.toggle('hidden');$('#directStickerPanel').classList.add('hidden')};document.querySelectorAll('[data-close-panel]').forEach(b=>b.onclick=closePanels);$('#directAccent').onchange=e=>saveTheme('vinci',e.target.value);$('#directRecord').onclick=()=>recorder?finishRecord():startRecord();$('#stopRecord').onclick=finishRecord;$('#cancelRecord').onclick=cancelRecord;$('#sendRecord').onclick=sendRecordedAudio;$('#cancelReply').onclick=clearReply;document.addEventListener('click',e=>{if(!e.target.closest('.direct-stack'))closeActions()})}
function subscribe(){channel=db.channel(`direct-${fid}`).on('postgres_changes',{event:'*',schema:'public',table:'vinci_direct_messages',filter:`friendship_id=eq.${fid}`},async()=>{const{data}=await db.from('vinci_direct_messages').select('*').eq('friendship_id',fid).order('created_at').limit(350);messages=data||[];await render()}).on('postgres_changes',{event:'*',schema:'public',table:'vinci_direct_reactions'},async()=>{const ids=messages.map(x=>x.id);if(ids.length){const{data}=await db.from('vinci_direct_reactions').select('*').in('message_id',ids);reactions=data||[];await render()}}).on('postgres_changes',{event:'*',schema:'public',table:'vinci_direct_stickers',filter:`friendship_id=eq.${fid}`},async()=>{const{data}=await db.from('vinci_direct_stickers').select('*').eq('friendship_id',fid).order('created_at',{ascending:false}).limit(100);stickers=data||[];await renderStickers()}).subscribe()}
async function init(){const{data:{user:u}}=await db.auth.getUser();if(!u)return;user=u;if(!await loadFriendship())return;bind();renderThemes();await Promise.all([loadSettings(),loadAll()]);subscribe()}document.addEventListener('DOMContentLoaded',init);window.addEventListener('beforeunload',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();recordStream?.getTracks().forEach(t=>t.stop());if(pendingAudioUrl)URL.revokeObjectURL(pendingAudioUrl);channel&&db.removeChannel(channel)})})();
