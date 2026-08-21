(function(){
"use strict";
const $=s=>document.querySelector(s), roomId=new URLSearchParams(location.search).get("id");
let user=null,game=null,lobby=null,members=[],lobbyMembers=[],gameParticipants=[],profiles=new Map(),submissions=[],votes=[],vangoState=null,myStats={xp:0,games_played:0,wins:0,equipped_frame:null},unlocks=new Set(),unlockDates=new Map(),usageMap=new Map(),shopFilter='featured',timer=null,lobbyTimer=null,selectedVote=null,lobbySchemaReady=true,serverOffsetMs=0;
let closeLobbyArmedUntil=0,closeLobbyBusy=false,lastLobbyPointerActionAt=0;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const media=url=>window.VinciMedia?.resolveUrl?window.VinciMedia.resolveUrl(url):Promise.resolve(url);
const FRAME_VISUAL_ALIAS={
  inferno_dragon:'vector_nova',
  seraph_prism:'event_horizon'
};
const FRAME_DB_ALIAS={
  vector_nova:'inferno_dragon',
  event_horizon:'seraph_prism'
};
function visualFrameKey(key){return FRAME_VISUAL_ALIAS[key]||key}
function dbFrameKey(key){return FRAME_DB_ALIAS[key]||key}

const COSMETICS=[
 {key:'aurora',name:'Aurora',req:'Jogue 1 partida',desc:'Luzes suaves em movimento.',category:'classic',rarity:'Comum',release:1},
 {key:'orbit',name:'Neon Orbit',req:'Jogue 3 partidas',desc:'Órbita azul e violeta.',category:'classic',rarity:'Comum',release:2},
 {key:'solar',name:'Solar Flare',req:'Jogue 5 partidas',desc:'Chamas douradas da Vinci.',category:'classic',rarity:'Incomum',release:3},
 {key:'champion',name:'Champion Halo',req:'Vença 1 partida',desc:'Halo reservado a vencedores.',category:'classic',rarity:'Incomum',release:4},
 {key:'prism',name:'Prism',req:'Jogue 10 partidas',desc:'Espectro vivo multicolorido.',category:'classic',rarity:'Rara',release:5},
 {key:'constellation',name:'Constellation',req:'Jogue 25 partidas',desc:'Céu estrelado ao redor do avatar.',category:'rare',rarity:'Rara',release:6},
 {key:'legend',name:'Vinci Legend',req:'Vença 10 partidas',desc:'Arco lendário multicolorido.',category:'rare',rarity:'Épica',release:7},
 {key:'celestial_wings',name:'Celestial Wings',req:'40 partidas + 5 vitórias',desc:'Asas de luz celestial que respiram ao redor do avatar.',category:'rare',rarity:'Épica',release:8},
 {key:'sakura_spirit',name:'Sakura Spirit',req:'60 partidas + 8 vitórias',desc:'Pétalas vivas flutuando em volta do perfil.',category:'rare',rarity:'Épica',release:9},
 {key:'vector_nova',name:'Vector Nova',req:'80 partidas + 15 vitórias',desc:'Geometria cinética, quatro vetores orbitais e um scanner de energia que corta o espaço ao redor do avatar.',category:'rare',rarity:'Épica',release:10},
 {key:'lunar_crown',name:'Lunar Crown',req:'100 partidas + 20 vitórias',desc:'Coroa lunar com luas e estrelas em órbita.',category:'mythic',rarity:'Mítica',release:11},
 {key:'event_horizon',name:'Event Horizon',req:'150 partidas + 30 vitórias',desc:'Um horizonte gravitacional com disco de acreção, luas em órbita e estrelas distorcidas pela gravidade.',category:'mythic',rarity:'Mítica',release:12},
 {key:'eternal_vinci',name:'Eternal Vinci',req:'250 partidas + 50 vitórias',desc:'Coroa, órbitas e partículas Vinci.',category:'mythic',rarity:'Lendária',release:13},
 {key:'crystal_garden',name:'Crystal Garden',req:'70 partidas + 12 vitórias',desc:'Cristais florescem em volta do avatar com reflexos vivos.',category:'rare',rarity:'Épica',release:14},
 {key:'midnight_butterfly',name:'Midnight Butterfly',req:'120 partidas + 22 vitórias',desc:'Borboletas vivas percorrem a moldura sob estrelas e um amuleto de lua crescente.',category:'mythic',rarity:'Mítica',release:15},
 {key:'ocean_guardian',name:'Ocean Guardian',req:'180 partidas + 35 vitórias',desc:'Peixes nadando ao redor do avatar, bolhas e um amuleto marítimo encantado.',category:'mythic',rarity:'Mítica',release:16},
 {key:'cyber_koi',name:'Cyber Koi',req:'220 partidas + 45 vitórias',desc:'Koi cibernéticos nadam por circuitos neon ao redor de um núcleo digital.',category:'mythic',rarity:'Lendária',release:17},
 {key:'royal_phoenix',name:'Royal Phoenix',req:'300 partidas + 70 vitórias',desc:'Asas de fênix, coroa e brasas douradas.',category:'mythic',rarity:'Lendária',release:18},
 {key:'galaxy_crown',name:'Galaxy Crown',req:'400 partidas + 100 vitórias',desc:'Uma pequena galáxia inteira coroando seu perfil.',category:'mythic',rarity:'Relíquia',release:19},
 {key:'court_king',name:'Court King',req:'90 partidas + 18 vitórias',desc:'Basquete em movimento: bola em órbita, aro luminoso, linhas de quadra e pulso de placar.',category:'rare',rarity:'Épica',release:20},
 {key:'neon_symphony',name:'Neon Symphony',req:'130 partidas + 25 vitórias',desc:'Uma partitura orbital viva: pentagrama circular, notas em movimento, pulsos de compasso e ondas sonoras neon.',category:'mythic',rarity:'Mítica',release:21},
 {key:'shutter_bloom',name:'Shutter Bloom',req:'160 partidas + 32 vitórias',desc:'Uma homenagem à fotografia: obturador mecânico, foco vivo e reflexos de lente em movimento.',category:'mythic',rarity:'Mítica',release:22},
 {key:'storm_circuit',name:'Storm Circuit',req:'200 partidas + 40 vitórias',desc:'Circuito elétrico de alta tensão com arcos de energia, nós neon e descargas sincronizadas.',category:'mythic',rarity:'Lendária',release:23},
 {key:'yakodev_core',name:'DEV//CORE',req:'EXCLUSIVA • @yakodevofc',desc:'Terminal vivo, código em órbita e halo verde de desenvolvedor.',category:'exclusive',rarity:'Fundador',release:100,exclusiveTo:'yakodevofc'}
];
function gameName(t){return t==='flash'?'Vinci Flash':t==='who_took'?'Quem Tirou?':t==='vango'?'VanGo':'Blind Caption'}
async function loadProfiles(ids){const list=[...new Set(ids.filter(Boolean))];if(!list.length)return;const{data}=await db.from('profiles').select('id,username,name,avatar_url').in('id',list);for(const p of data||[])profiles.set(p.id,p)}
async function loadMembers(){const{data}=await db.from('vinci_room_members').select('user_id,role').eq('room_id',roomId);members=data||[];await loadProfiles(members.map(x=>x.user_id))}
function xpLevel(xp){const level=Math.floor((xp||0)/200)+1,start=(level-1)*200,within=(xp||0)-start;return{level,within,need:200,pct:Math.min(100,within/2)}}
async function loadProgress(){
 const [{data:s},{data:u},{data:all}]=await Promise.all([
  db.from('vinci_game_profiles').select('*').eq('user_id',user.id).maybeSingle(),
  db.from('vinci_game_unlocks').select('cosmetic_key,unlocked_at').eq('user_id',user.id),
  db.from('vinci_game_profiles').select('equipped_frame')
 ]);
 myStats=s||{xp:0,games_played:0,wins:0,equipped_frame:null};
 myStats.equipped_frame=visualFrameKey(myStats.equipped_frame);
 unlocks=new Set((u||[]).map(x=>visualFrameKey(x.cosmetic_key)));unlockDates=new Map((u||[]).map(x=>[visualFrameKey(x.cosmetic_key),x.unlocked_at]));usageMap=new Map();
 for(const row of all||[]){if(row.equipped_frame){const key=visualFrameKey(row.equipped_frame);usageMap.set(key,(usageMap.get(key)||0)+1)}}
 renderProgress();renderCosmetics();window.dispatchEvent(new CustomEvent('vinci-cosmetics-changed'))
}
function renderProgress(){const p=profiles.get(user.id)||{},lv=xpLevel(myStats.xp||0),box=$('#gamesProgress');if(!box)return;box.innerHTML=`<div class="game-profile-line" data-user-id="${user.id}"><img src="${esc(p.avatar_url||'assets/default-avatar.png.png')}" onerror="this.src='assets/default-avatar.png.png'"><div class="game-profile-main"><strong>@${esc(p.username||'você')}</strong><small>${myStats.xp||0} XP total</small></div><span class="game-level">NÍVEL ${lv.level}</span></div><div class="xp-track"><span style="width:${lv.pct}%"></span></div><div class="game-stats"><div class="game-stat"><strong>${myStats.games_played||0}</strong><small>PARTIDAS</small></div><div class="game-stat"><strong>${myStats.wins||0}</strong><small>VITÓRIAS</small></div><div class="game-stat"><strong>${unlocks.size}</strong><small>COSMÉTICOS</small></div></div>`}
function previewFrame(key){const art=['celestial_wings','sakura_spirit','vector_nova','lunar_crown','event_horizon','eternal_vinci','crystal_garden','midnight_butterfly','ocean_guardian','cyber_koi','royal_phoenix','galaxy_crown','court_king','neon_symphony','shutter_bloom','storm_circuit','yakodev_core'].includes(key)?'<i class="vinci-frame-art" aria-hidden="true"><b></b><b></b><b></b><b></b></i>':'';return `<span class="vinci-frame-wrap vinci-frame-${key}">${art}<img src="${esc((profiles.get(user.id)||{}).avatar_url||'assets/default-avatar.png.png')}" onerror="this.src='assets/default-avatar.png.png'"></span>`}
function shopItems(){const username=String((profiles.get(user.id)||{}).username||'').toLowerCase();let list=COSMETICS.filter(c=>!c.exclusiveTo||c.exclusiveTo===username);if(shopFilter==='recent')list=[...list].sort((a,b)=>b.release-a.release);else if(shopFilter==='popular')list=[...list].sort((a,b)=>(usageMap.get(b.key)||0)-(usageMap.get(a.key)||0));else if(['classic','rare','mythic','exclusive'].includes(shopFilter))list=list.filter(c=>c.category===shopFilter);else list=[...list].sort((a,b)=>{const ae=unlocks.has(a.key)?1:0,be=unlocks.has(b.key)?1:0;return be-ae||b.release-a.release});return list}
function renderCosmetics(){const grid=$('#cosmeticsGrid');if(!grid)return;const list=shopItems();document.querySelectorAll('[data-shop-filter]').forEach(b=>b.classList.toggle('active',b.dataset.shopFilter===shopFilter));const title=$('#cosmeticsSectionTitle');if(title)title.textContent=({featured:'Destaques',recent:'Novidades',popular:'Mais usadas',classic:'Clássicas',rare:'Raras',mythic:'Míticas',exclusive:'Exclusivas'})[shopFilter]||'Coleção';grid.innerHTML=list.map(c=>{const open=unlocks.has(c.key),eq=myStats.equipped_frame===c.key,pop=usageMap.get(c.key)||0,date=unlockDates.get(c.key);return `<article class="cosmetic-card ${open?'':'locked'} ${eq?'equipped':''}"><div class="cosmetic-rarity">${esc(c.rarity)}</div><div class="cosmetic-preview">${previewFrame(c.key)}</div><h4>${esc(c.name)}</h4><p>${esc(c.desc)}</p><div class="cosmetic-meta"><span>${esc(c.req)}</span>${shopFilter==='popular'?`<b>${pop} usando</b>`:''}${date?`<b>✓ conquistada</b>`:''}</div><button type="button" data-equip-frame="${c.key}" ${open?'':'disabled'}>${open?(eq?'✓ Equipada':'Equipar'):'🔒 Bloqueada'}</button></article>`}).join('')+`<article class="cosmetic-card ${myStats.equipped_frame?'':'equipped'}"><div class="cosmetic-rarity">CLÁSSICO</div><div class="cosmetic-preview"><img src="${esc((profiles.get(user.id)||{}).avatar_url||'assets/default-avatar.png.png')}" style="width:55px;height:55px;border-radius:50%;object-fit:cover"></div><h4>Sem moldura</h4><p>Visual original do Vinci.</p><button type="button" data-equip-frame="">${myStats.equipped_frame?'Usar':'✓ Equipada'}</button></article>`;grid.querySelectorAll('[data-equip-frame]').forEach(b=>b.onclick=()=>equipFrame(b.dataset.equipFrame))}
async function equipFrame(key){const dbKey=dbFrameKey(key);const{error}=await db.rpc('vinci_equip_game_frame',{p_frame:dbKey});if(error){alert(error.message);return}myStats.equipped_frame=key||null;renderCosmetics();renderProgress();window.dispatchEvent(new CustomEvent('vinci-cosmetics-changed'))}


/* ============================================================
   VINCI PLAY — GAME ENGINE V2
   Snapshot atômico + Realtime + polling de segurança.
   ============================================================ */

let syncBusy=false;
let syncQueued=false;
let syncTimer=null;
let syncDebounce=null;
let realtimeChannel=null;
let realtimeReconnectTimer=null;
let lastStateFingerprint='';
let appliedGameId=null;
let phaseTransitionBusy=false;
let vangoCanvasSession=null;
let lastSyncAt=0;

function serverNow(){
 return Date.now()+serverOffsetMs;
}

function gameIsActive(){
 return !!(game&&game.status==='active'&&serverNow()<new Date(game.ends_at).getTime());
}
function lobbyIsOpen(){
 return !!(lobby&&lobby.status==='open'&&serverNow()<new Date(lobby.expires_at).getTime());
}
function isLobbyMember(uid=user?.id){
 return !!uid&&lobbyMembers.some(x=>x.user_id===uid);
}
function isGameParticipant(uid=user?.id){
 return !!uid&&gameParticipants.some(x=>x.user_id===uid);
}
function lobbyTimeLeft(){
 return lobby?Math.max(0,new Date(lobby.expires_at).getTime()-serverNow()):0;
}
function playerWord(n){return n===1?'pessoa':'pessoas'}
function fmt(ms){
 const s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),r=s%60;
 return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

function setSyncStatus(state,message=''){
 const el=$('#gameSyncStatus');
 if(!el)return;
 el.dataset.state=state;
 if(state==='live')el.textContent='● AO VIVO';
 else if(state==='syncing')el.textContent='↻ sincronizando';
 else if(state==='offline')el.textContent='○ sem conexão';
 else if(state==='error')el.textContent=message||'↻ reconectando';
 else el.textContent=message||'';
}

function stateFingerprint(){
 const data={
  lobby:lobby?{id:lobby.id,status:lobby.status,game_type:lobby.game_type,expires_at:lobby.expires_at}:null,
  lobbyMembers:lobbyMembers.map(x=>`${x.user_id}:${x.joined_at}`),
  game:game?{id:game.id,status:game.status,game_type:game.game_type,submit_ends_at:game.submit_ends_at,ends_at:game.ends_at,winner_user_id:game.winner_user_id}:null,
  participants:gameParticipants.map(x=>x.user_id),
  submissions:submissions.map(x=>`${x.id}:${x.user_id}:${x.is_correct}`),
  votes:votes.map(x=>`${x.id}:${x.voter_id}:${x.submission_id}`),
  vango:vangoState?{
   game_id:vangoState.game_id,
   phase:vangoState.phase,
   deadline:vangoState.deadline,
   drawing_url:vangoState.drawing_url,
   photo_url:vangoState.photo_url,
   target_word:vangoState.target_word,
   guesses:(vangoState.guesses||[]).map(x=>`${x.id}:${x.is_correct}`)
  }:null
 };
 return JSON.stringify(data);
}

function snapshotProfileIds(){
 return [
  ...members.map(x=>x.user_id),
  ...lobbyMembers.map(x=>x.user_id),
  ...gameParticipants.map(x=>x.user_id),
  ...submissions.map(x=>x.user_id),
  game?.winner_user_id,
  lobby?.host_user_id,
  vangoState?.drawer_user_id,
  ...(vangoState?.guesses||[]).map(x=>x.user_id)
 ].filter(Boolean);
}

function showEngineInstall(error){
 const message=String(error?.message||'');
 const missing=message.includes('vinci_room_game_state')||message.includes('vinci_vango_state')||message.includes('Could not find the function');
 lobbySchemaReady=!missing;
 setSyncStatus('error',missing?'PATCH 15 necessário':'↻ reconectando');
 const target=$('#gameLobbyArea')||$('#activeGameArea');
 if(missing&&target){
  target.innerHTML='<div class="game-toast bad"><strong>Game Engine v2 ainda não está no Supabase.</strong><br>Rode <b>VINCI_1_1_FOCUS_PATCH_15_GAME_ENGINE_V2_VANGO.sql</b> uma vez.</div>';
 }
}

async function syncGameState(reason='manual',forceRender=false){
 if(!roomId||!user)return false;
 if(syncBusy){syncQueued=true;return false}
 syncBusy=true;
 setSyncStatus(navigator.onLine===false?'offline':'syncing');
 const previousGameId=game?.id||null;
 const previousParticipant=previousGameId?isGameParticipant():false;
 const preservedGuess=$('#vangoGuessInput')?.value||'';
 try{
  const{data,error}=await db.rpc('vinci_room_game_state',{p_room_id:roomId});
  if(error)throw error;
  if(!data)throw new Error('O Supabase não retornou o estado da partida.');

  if(data.server_now){
   serverOffsetMs=new Date(data.server_now).getTime()-Date.now();
  }

  lobby=data.lobby||null;
  lobbyMembers=Array.isArray(data.lobby_members)?data.lobby_members:[];
  game=data.game||null;
  gameParticipants=Array.isArray(data.participants)?data.participants:[];
  submissions=Array.isArray(data.submissions)?data.submissions:[];
  votes=Array.isArray(data.votes)?data.votes:[];
  vangoState=data.vango||null;
  lobbySchemaReady=true;

  await loadProfiles(snapshotProfileIds());

  const fingerprint=stateFingerprint();
  const changed=forceRender||fingerprint!==lastStateFingerprint;

  if(changed){
   lastStateFingerprint=fingerprint;
   renderLobby();
   renderRoomLobbyNotice();
   renderGameButtons();
   renderCooldown();
   await renderGame();

   if(preservedGuess&&$('#vangoGuessInput')&&!$('#vangoGuessInput').value){
    $('#vangoGuessInput').value=preservedGuess;
   }
  }

  const newGameStarted=!!(
   game?.id&&
   game.status==='active'&&
   game.id!==previousGameId&&
   isGameParticipant()
  );

  const participantRecovered=!!(
   game?.id&&
   game.status==='active'&&
   !previousParticipant&&
   isGameParticipant()
  );

  if(newGameStarted||participantRecovered){
   appliedGameId=game.id;
   openGamesTab('game');
  }

  lastSyncAt=Date.now();
  setSyncStatus('live');
  return true;
 }catch(error){
  console.warn(`Vinci Play sync (${reason})`,error);
  if(navigator.onLine===false)setSyncStatus('offline');
  else showEngineInstall(error);
  return false;
 }finally{
  syncBusy=false;
  if(syncQueued){
   syncQueued=false;
   queueMicrotask(()=>syncGameState('queued'));
  }
  schedulePoll();
 }
}

function requestSync(reason='realtime',delay=90){
 clearTimeout(syncDebounce);
 syncDebounce=setTimeout(()=>syncGameState(reason),delay);
}

function schedulePoll(){
 clearTimeout(syncTimer);
 if(!roomId||!user)return;
 const active=lobbyIsOpen()||gameIsActive();
 const delay=document.hidden?(active?5000:10000):(active?1400:4500);
 syncTimer=setTimeout(async()=>{
  await syncGameState('poll');
 },delay);
}

async function syncUntil(predicate,attempts=10,delay=240){
 for(let i=0;i<attempts;i++){
  await syncGameState(`confirm-${i}`,true);
  if(predicate())return true;
  await sleep(delay+(i*45));
 }
 return false;
}

async function connectRealtime(){
 clearTimeout(realtimeReconnectTimer);
 if(!roomId||!user)return;

 if(realtimeChannel){
  try{await db.removeChannel(realtimeChannel)}catch(_){ }
  realtimeChannel=null;
 }

 const channel=db.channel(`room-games-v2-${roomId}-${user.id.slice(0,8)}`);
 const event=()=>requestSync('realtime');

 channel
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_lobbies',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_lobby_members',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_games',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_participants',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_submissions',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_votes',filter:`room_id=eq.${roomId}`},event)
  .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_vango_guesses',filter:`room_id=eq.${roomId}`},event);

 realtimeChannel=channel;
 channel.subscribe(status=>{
  if(status==='SUBSCRIBED'){
   setSyncStatus('live');
   requestSync('realtime-subscribed',0);
   return;
  }
  if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
   setSyncStatus('error');
   clearTimeout(realtimeReconnectTimer);
   realtimeReconnectTimer=setTimeout(connectRealtime,1600);
  }
 });
}

function startLifecycleSync(){
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
   requestSync('visible',0);
   connectRealtime();
  }
 });
 window.addEventListener('pageshow',()=>requestSync('pageshow',0));
 window.addEventListener('focus',()=>requestSync('focus',0));
 window.addEventListener('online',()=>{setSyncStatus('syncing');requestSync('online',0);connectRealtime()});
 window.addEventListener('offline',()=>setSyncStatus('offline'));
}

function startLobbyClock(){
 clearInterval(lobbyTimer);
 if(!lobbyIsOpen())return;
 lobbyTimer=setInterval(()=>{
  const el=$('#lobbyExpiry');
  const left=lobbyTimeLeft();
  if(el)el.textContent=fmt(left);
  if(left<=0){
   clearInterval(lobbyTimer);
   requestSync('lobby-expired',0);
  }
 },1000);
}

function lobbyAvatars(){
 if(!lobbyMembers.length)return '';
 return lobbyMembers.map(row=>{
  const p=profiles.get(row.user_id)||{};
  const host=row.user_id===lobby?.host_user_id;
  return `<span class="game-lobby-avatar ${host?'host':''}" title="@${esc(p.username||'usuario')}"><img src="${esc(p.avatar_url||'assets/default-avatar.png.png')}" onerror="this.src='assets/default-avatar.png.png'">${host?'<b>★</b>':''}</span>`;
 }).join('');
}

function renderLobby(){
 const area=$('#gameLobbyArea');
 if(!area)return;
 if(!lobbySchemaReady){
  area.innerHTML='<div class="game-toast bad">Rode o PATCH 15 do Game Engine v2 no Supabase.</div>';
  return;
 }
 if(!lobbyIsOpen()){
  area.innerHTML='<section class="game-lobby-empty"><span>SALAS DE PARTIDA</span><h3>Primeiro junta a galera.</h3><p>Abra uma sala. Com 2 pessoas ou mais, o host pode iniciar e o Vinci sincroniza todo mundo automaticamente.</p></section>';
  return;
 }
 const count=lobbyMembers.length;
 const joined=isLobbyMember();
 const host=lobby.host_user_id===user.id;
 const hostProfile=profiles.get(lobby.host_user_id)||{};
 const ready=count>=2;
 const closeArmed=host&&Date.now()<closeLobbyArmedUntil;
 const controls=host
  ? `<div class="game-lobby-actions"><button id="startLobbyGame" data-lobby-action="start" class="game-action-primary" type="button" ${ready?'':'disabled'}>${ready?`Iniciar partida · ${count}`:'Esperando +1 pessoa'}</button><button id="closeLobbyGame" data-lobby-action="close" class="game-action-soft danger ${closeArmed?'confirming':''}" type="button">${closeArmed?'Confirmar fechamento':'Fechar sala'}</button></div>`
  : joined
   ? `<div class="game-lobby-actions"><div class="game-lobby-wait">${ready?`Tudo pronto. Esperando @${esc(hostProfile.username||'host')} iniciar.`:'Esperando mais alguém entrar...'}</div><button id="leaveLobbyGame" data-lobby-action="leave" class="game-action-soft" type="button">Sair da sala</button></div>`
   : `<div class="game-lobby-actions"><button id="joinLobbyGame" data-lobby-action="join" class="game-action-primary" type="button">Entrar na sala</button></div>`;

 area.innerHTML=`<article class="game-lobby-card">
   <header class="game-lobby-head"><div><span>SALA DE PARTIDA · ABERTA</span><h3>${esc(gameName(lobby.game_type))}</h3><p>@${esc(hostProfile.username||'usuario')} abriu esta sala</p></div><div class="game-lobby-expire"><small>fecha em</small><strong id="lobbyExpiry">${fmt(lobbyTimeLeft())}</strong></div></header>
   <div class="game-lobby-status"><div class="game-lobby-avatars">${lobbyAvatars()}</div><strong>${count} ${playerWord(count)} na sala</strong><small>${ready?'✓ Mínimo atingido. A partida pode começar.':'É preciso pelo menos 2 pessoas para iniciar.'}</small></div>
   ${controls}
  </article>`;

 /*
    Os controles do lobby usam delegação em #gameLobbyArea.
    Isso evita perder toques no mobile quando uma sincronização
    substitui o conteúdo do lobby durante pointerdown/click.
 */
 startLobbyClock();
}

function renderRoomLobbyNotice(){
 const notice=$('#roomGameLobbyNotice');
 if(!notice)return;
 if(!lobbyIsOpen()){
  notice.classList.add('hidden');
  notice.innerHTML='';
  return;
 }
 const count=lobbyMembers.length;
 const joined=isLobbyMember();
 const host=profiles.get(lobby.host_user_id)||{};
 notice.classList.remove('hidden');
 notice.innerHTML=`<div class="room-game-notice-icon">🎮</div><div class="room-game-notice-copy"><span>PARTIDA ABERTA</span><strong>${esc(gameName(lobby.game_type))}</strong><small>@${esc(host.username||'usuario')} abriu uma sala · ${count} ${playerWord(count)}</small></div><button id="roomGameNoticeAction" type="button">${joined?'Ver sala':'Entrar'}</button>`;
 const action=$('#roomGameNoticeAction');
 if(action)action.onclick=async()=>{
  if(!joined)await joinLobby(false);
  openGamesTab('lobby');
 };
}

function openGamesTab(target='lobby'){
 document.querySelector('.room-tabs [data-tab="games"]')?.click();
 setTimeout(()=>{
  const el=target==='game'?$('#activeGameArea'):$('#gameLobbyArea');
  el?.scrollIntoView({behavior:'smooth',block:'center'});
 },90);
}

function renderGameButtons(){
 const buttons=document.querySelectorAll('[data-start-game]');
 const active=gameIsActive();
 const open=lobbyIsOpen();
 buttons.forEach(button=>{
  const same=open&&button.dataset.startGame===lobby.game_type;
  button.disabled=!lobbySchemaReady||active||open;
  button.textContent=same?'Sala aberta':open?'Outra sala aberta':active?'Partida em andamento':'Abrir sala';
 });
}

function renderCooldown(){
 const box=$('#gamesCooldown');
 if(box){box.classList.add('hidden');box.textContent=''}
 renderGameButtons();
}

async function openLobby(type){
 if(!lobbySchemaReady){alert('Rode VINCI_1_1_FOCUS_PATCH_15_GAME_ENGINE_V2_VANGO.sql no Supabase.');return}
 document.querySelectorAll('[data-start-game]').forEach(b=>b.disabled=true);
 const{data,error}=await db.rpc('vinci_open_room_game_lobby',{p_room_id:roomId,p_game_type:type});
 if(error){
  alert(error.message);
  await syncGameState('open-lobby-error',true);
  return;
 }
 const opened=Array.isArray(data)?data[0]:data;
 await syncUntil(()=>lobby?.id===opened?.id&&isLobbyMember(),8,180);
 openGamesTab('lobby');
}

async function joinLobby(openTab=true){
 if(!lobby)return false;
 const targetId=lobby.id;
 const{error}=await db.rpc('vinci_join_room_game_lobby',{p_lobby_id:targetId});
 if(error){
  await syncGameState('join-lobby-error',true);
  if(gameIsActive()){
   alert(isGameParticipant()?'A partida já começou e você entrou nela.':'A partida começou antes da sua entrada. Você acompanha esta rodada e entra na próxima.');
   if(openTab)openGamesTab('game');
   return isGameParticipant();
  }
  alert(error.message);
  return false;
 }
 const confirmed=await syncUntil(()=>isLobbyMember()||(gameIsActive()&&isGameParticipant()),10,160);
 if(!confirmed){
  setSyncStatus('error','confirmando entrada…');
  requestSync('join-confirm-late',500);
 }
 if(openTab)openGamesTab(gameIsActive()?'game':'lobby');
 return true;
}

async function leaveLobby(){
 if(!lobby)return;
 const target=lobby.id;
 const{error}=await db.rpc('vinci_leave_room_game_lobby',{p_lobby_id:target});
 if(error){alert(error.message);return}
 await syncUntil(()=>!lobby||lobby.id!==target||!isLobbyMember(),7,170);
}

function armCloseLobby(button){
 closeLobbyArmedUntil=Date.now()+4500;

 if(button){
  button.classList.add('confirming');
  button.textContent='Confirmar fechamento';
  button.setAttribute('aria-label','Toque novamente para fechar a sala');
 }

 setTimeout(()=>{
  if(Date.now()<closeLobbyArmedUntil)return;

  const current=$('#closeLobbyGame');

  if(current){
   current.classList.remove('confirming');
   current.textContent='Fechar sala';
   current.setAttribute('aria-label','Fechar sala');
  }
 },4600);
}

async function closeLobby(){
 if(!lobby||closeLobbyBusy)return false;

 if(Date.now()>=closeLobbyArmedUntil){
  armCloseLobby($('#closeLobbyGame'));
  return false;
 }

 closeLobbyBusy=true;
 closeLobbyArmedUntil=0;

 const target=lobby.id;
 const button=$('#closeLobbyGame');

 if(button){
  button.disabled=true;
  button.textContent='Fechando sala...';
 }

 try{
  const{error}=await db.rpc('vinci_close_room_game_lobby',{p_lobby_id:target});

  if(error)throw error;

  const confirmed=await syncUntil(
   ()=>!lobby||lobby.id!==target,
   9,
   150
  );

  if(!confirmed){
   setSyncStatus('error','confirmando fechamento…');
   requestSync('close-lobby-confirm-late',250);
  }

  return true;
 }catch(error){
  alert(error.message||error);
  await syncGameState('close-lobby-error',true);
  return false;
 }finally{
  closeLobbyBusy=false;
 }
}

async function startLobbyGame(){
 if(!lobby)return;
 if(lobbyMembers.length<2){alert('A partida precisa de pelo menos 2 pessoas na sala.');return}
 const targetLobby=lobby.id;
 const button=$('#startLobbyGame');
 if(button){button.disabled=true;button.textContent='Sincronizando jogadores...'}
 const{data,error}=await db.rpc('vinci_start_room_game_lobby',{p_lobby_id:targetLobby});
 if(error){
  alert(error.message);
  await syncGameState('start-error',true);
  return;
 }
 const started=Array.isArray(data)?data[0]:data;
 const confirmed=await syncUntil(()=>game?.id===started?.id&&isGameParticipant(),12,170);
 if(!confirmed){
  setSyncStatus('error','recuperando partida…');
  requestSync('start-confirm-late',350);
 }
 openGamesTab('game');
}

function allSubmitted(){
 const total=gameParticipants.length;
 return total>0&&submissions.length>=total;
}
function submissionPhase(){
 return game&&game.status==='active'&&serverNow()<new Date(game.submit_ends_at).getTime()&&!allSubmitted();
}
function votingPhase(){
 return game&&game.status==='active'&&game.game_type!=='who_took'&&game.game_type!=='vango'&&!submissionPhase()&&serverNow()<new Date(game.ends_at).getTime();
}
function timeLeft(){
 if(!game)return 0;
 if(game.game_type==='vango'&&vangoState?.deadline){
  return Math.max(0,new Date(vangoState.deadline).getTime()-serverNow());
 }
 const target=submissionPhase()?game.submit_ends_at:game.ends_at;
 return Math.max(0,new Date(target).getTime()-serverNow());
}

function gamePhaseLabel(participant){
 if(game?.status==='finished')return 'FINALIZADO';
 if(game?.game_type==='vango'){
  const map={
   photo:'MISSÃO SECRETA',
   waiting_photo:'FOTO EM ANDAMENTO',
   memorize:'MEMORIZE · 10 SEGUNDOS',
   waiting_draw:'DESENHO EM ANDAMENTO',
   draw:'DESENHE DE MEMÓRIA',
   guess:'ADIVINHE AGORA',
   watch_guesses:'A ROOM ESTÁ TENTANDO',
   spectator:'ESPECTADOR',
   draw_expired:'TEMPO ESGOTADO',
   guess_expired:'TEMPO ESGOTADO'
  };
  return map[vangoState?.phase]||'VANGO';
 }
 if(!participant)return 'EM ANDAMENTO';
 if(submissionPhase())return 'PARTICIPE AGORA';
 return game.game_type==='who_took'?'RESULTADO':'VOTAÇÃO';
}

async function renderGame(){
 clearInterval(timer);
 const area=$('#activeGameArea');
 if(!area)return;
 if(!game){
  area.innerHTML='<div class="game-toast">Nenhuma partida começou ainda. Abra ou entre numa sala acima.</div>';
  return;
 }
 const mine=submissions.find(x=>x.user_id===user.id);
 const winner=game.winner_user_id?profiles.get(game.winner_user_id):null;
 const participant=isGameParticipant();
 let body='';

 if(game.game_type==='vango'){
  body=await vangoBody();
 }else if(game.status==='active'&&!participant){
  body='<div class="game-spectator"><span>👀 ESPECTADOR</span><h3>Esta rodada já começou.</h3><p>Você não entrou na sala antes do início, então acompanha esta partida e joga na próxima.</p></div>';
 }else if(game.game_type==='flash'){
  body=await flashBody(mine);
 }else if(game.game_type==='who_took'){
  body=await whoBody(mine);
 }else{
  body=await captionBody(mine);
 }

 const phase=gamePhaseLabel(participant);
 const participantsLabel=gameParticipants.length?`${gameParticipants.length} ${playerWord(gameParticipants.length)}`:'';
 const vangoAnswer=game.game_type==='vango'&&game.status==='finished'&&vangoState?.target_word?`<p class="vango-answer-reveal">O objeto era <strong>${esc(vangoState.target_word)}</strong>.</p>`:'';
 const winnerText=winner
  ? `<div class="game-result-banner"><span>🏆 VENCEDOR</span><strong>@${esc(winner.username||'usuário')}</strong><p>${game.game_type==='vango'?'Foi a primeira pessoa a adivinhar o desenho.':'Recebeu +60 XP e progresso para novas molduras.'}</p>${vangoAnswer}</div>`
  : game.status==='finished'
   ? `<div class="game-result-banner"><span>FIM DA RODADA</span><strong>Sem vencedor</strong><p>Ninguém levou esta.</p>${vangoAnswer}</div>`
   : '';

 area.innerHTML=`<article class="active-game-card ${game.game_type==='vango'?'vango-active':''}"><header class="active-game-head"><div><span>${phase}${participantsLabel?` · ${participantsLabel.toUpperCase()}`:''}</span><h3>${esc(gameName(game.game_type))}</h3></div><strong id="gameTimer" class="game-timer">${game.status==='finished'?'FIM':fmt(timeLeft())}</strong></header><div class="active-game-body">${body}${winnerText}</div></article>`;

 if(game.game_type==='vango')bindVangoActions();
 else if(participant)bindGameActions();

 if(game.status==='active')timer=setInterval(tick,500);
}

async function flashBody(mine){
 if(submissionPhase())return `<h3 class="game-prompt">${esc(game.prompt)}</h3><p class="game-helper">Apenas quem entrou na sala participa. Você tem 90 segundos para tirar e enviar sua foto.</p>${mine?'<div class="game-toast good">✓ Sua foto foi enviada. Esperando os outros jogadores...</div>':'<div class="game-actions"><button id="sendFlashPhoto" class="game-action-primary" type="button">📷 Tirar foto agora</button></div>'}`;
 if(!submissions.length)return '<div class="game-toast">Ninguém enviou foto nesta rodada.</div>';
 let cards='';
 for(const s of submissions){
  const u=await media(s.image_url);
  cards+=`<button class="game-submission" data-game-vote="${s.id}" ${s.user_id===user.id?'disabled':''}><img src="${esc(u||'')}" alt="Foto do Vinci Flash"></button>`;
 }
 const myVote=votes.find(v=>v.voter_id===user.id);
 return `<h3 class="game-prompt">Qual foto venceu o Flash?</h3><p class="game-helper">Você não pode votar na própria foto.</p><div class="game-submissions">${cards}</div>${myVote?'<div class="game-toast good">✓ Voto registrado.</div>':'<button id="confirmGameVote" class="game-action-primary" type="button" disabled style="margin-top:10px">Confirmar voto</button>'}`;
}

async function whoBody(mine){
 const img=await media(game.image_url);
 let options=members.map(m=>{
  const p=profiles.get(m.user_id)||{};
  return `<button class="game-player" data-guess-user="${m.user_id}" type="button"><img src="${esc(p.avatar_url||'assets/default-avatar.png.png')}" onerror="this.src='assets/default-avatar.png.png'"><strong>@${esc(p.username||'usuario')}</strong></button>`;
 }).join('');
 return `<div class="game-image-stage mystery"><img src="${esc(img||'')}" alt="Foto misteriosa"></div><h3 class="game-prompt">Quem tirou essa foto?</h3><p class="game-helper">A foto pode ser de qualquer membro da Room. Só quem entrou na sala pode responder.</p>${mine?`<div class="game-toast ${mine.is_correct?'good':'bad'}">${mine.is_correct?'✓ Você acertou!':'✕ Seu palpite foi registrado.'}</div>`:`<div class="game-player-grid">${options}</div><button id="confirmGuess" class="game-action-primary" type="button" disabled style="margin-top:10px">Confirmar palpite</button>`}`;
}

async function captionBody(mine){
 const img=await media(game.image_url);
 if(submissionPhase())return `<div class="game-image-stage"><img src="${esc(img||'')}" alt="Foto para legenda"></div><h3 class="game-prompt">${esc(game.prompt)}</h3><p class="game-helper">O nome de quem escreveu fica escondido durante a votação.</p>${mine?'<div class="game-toast good">✓ Legenda enviada. Esperando os outros jogadores.</div>':'<input id="captionGameInput" class="game-input" maxlength="180" placeholder="Escreva sua legenda..."><button id="sendCaptionGame" class="game-action-primary" type="button">Enviar legenda</button>'}`;
 if(!submissions.length)return '<div class="game-toast">Ninguém escreveu uma legenda nesta rodada.</div>';
 const myVote=votes.find(v=>v.voter_id===user.id);
 const cards=submissions.map(s=>`<button class="game-submission" data-game-vote="${s.id}" ${s.user_id===user.id?'disabled':''}><div class="caption-choice">${esc(s.content||'')}</div></button>`).join('');
 return `<div class="game-image-stage"><img src="${esc(img||'')}" alt="Foto do Blind Caption"></div><h3 class="game-prompt">Qual é a melhor legenda?</h3><div class="game-submissions">${cards}</div>${myVote?'<div class="game-toast good">✓ Voto registrado.</div>':'<button id="confirmGameVote" class="game-action-primary" type="button" disabled style="margin-top:10px">Confirmar voto</button>'}`;
}

function vangoGuessesHTML(){
 const list=vangoState?.guesses||[];
 if(!list.length)return '<div class="vango-guess-empty">Nenhum palpite ainda.</div>';
 return `<div class="vango-guess-feed">${list.slice(-10).map(g=>{
  const p=profiles.get(g.user_id)||{};
  return `<div class="vango-guess-row ${g.is_correct?'correct':''}"><strong>@${esc(p.username||'usuario')}</strong><span>${esc(g.guess_text)}</span>${g.is_correct?'<b>✓</b>':''}</div>`;
 }).join('')}</div>`;
}

async function vangoDrawingImage(){
 if(!vangoState?.drawing_url)return '';
 const url=await media(vangoState.drawing_url);
 return `<div class="vango-drawing-preview"><img src="${esc(url||'')}" alt="Desenho do VanGo"></div>`;
}

async function vangoBody(){
 if(!vangoState)return '<div class="game-toast">Sincronizando a rodada do VanGo...</div>';
 const drawer=profiles.get(vangoState.drawer_user_id)||{};
 const phase=vangoState.phase;

 if(phase==='spectator'){
  const drawing=await vangoDrawingImage();
  return `<div class="game-spectator"><span>👀 ESPECTADOR</span><h3>O VanGo já começou.</h3><p>@${esc(drawer.username||'alguém')} é o desenhista desta rodada. Você joga na próxima.</p></div>${drawing}`;
 }

 if(phase==='finished'){
  const drawing=await vangoDrawingImage();
  return `${drawing}<div class="vango-finished-copy"><span>VANGO</span><h3>Fim da rodada.</h3><p>O objeto era <strong>${esc(vangoState.target_word||'???')}</strong>.</p></div>${vangoGuessesHTML()}`;
 }

 if(phase==='photo'){
  return `<section class="vango-role-card secret"><span>VOCÊ É O DESENHISTA</span><h3>Fotografe: <strong>${esc(vangoState.target_word||'objeto')}</strong></h3><p>Essa foto é só sua referência. Depois você terá exatamente <b>10 segundos</b> para olhar e então desenhar de memória.</p><button id="vangoTakePhoto" class="game-action-primary" type="button">📷 Tirar foto do objeto</button></section>`;
 }

 if(phase==='waiting_photo'){
  return `<section class="vango-role-card waiting"><span>AGUARDE</span><h3>@${esc(drawer.username||'o desenhista')} está procurando o objeto.</h3><p>Quando a foto for feita, começa a fase de memória e desenho.</p><div class="vango-pulse"><i></i><i></i><i></i></div></section>`;
 }

 if(phase==='memorize'){
  const photo=await media(vangoState.photo_url);
  return `<section class="vango-memorize"><span>OLHE BEM · 10 SEGUNDOS</span><h3>${esc(vangoState.target_word||'Memorize o objeto')}</h3><div class="vango-photo-memory"><img src="${esc(photo||'')}" alt="Sua referência"></div><p>Quando o relógio zerar, a foto desaparece e você desenha sem olhar de novo.</p></section>`;
 }

 if(phase==='waiting_draw'){
  return `<section class="vango-role-card waiting"><span>DESENHO EM ANDAMENTO</span><h3>@${esc(drawer.username||'o desenhista')} está desenhando de memória.</h3><p>Assim que o desenho for enviado, todo mundo tenta descobrir o objeto.</p><div class="vango-pulse"><i></i><i></i><i></i></div></section>`;
 }

 if(phase==='draw'){
  return `<section class="vango-draw-wrap"><span class="vango-kicker">SEM OLHAR A FOTO</span><h3>Desenhe de memória.</h3><p class="game-helper">Você tem 60 segundos. O objeto não aparece mais na tela.</p><div class="vango-canvas-shell"><canvas id="vangoCanvas" width="900" height="900"></canvas></div><div class="vango-tools"><button type="button" data-vango-color="#1f1b18" class="active" aria-label="Preto"></button><button type="button" data-vango-color="#ef8b3d" aria-label="Laranja"></button><button type="button" data-vango-color="#367bd6" aria-label="Azul"></button><button type="button" data-vango-color="#d94a4a" aria-label="Vermelho"></button><button type="button" id="vangoEraser">Borracha</button><button type="button" id="vangoClear">Limpar</button></div><button id="vangoSubmitDrawing" class="game-action-primary vango-send-drawing" type="button">Enviar desenho</button></section>`;
 }

 if(phase==='draw_expired'){
  return '<div class="game-toast bad">O tempo do desenho terminou. Finalizando a rodada...</div>';
 }

 const drawing=await vangoDrawingImage();

 if(phase==='watch_guesses'){
  return `${drawing}<section class="vango-role-card"><span>AGORA É COM ELES</span><h3>A Room está tentando adivinhar.</h3><p>Você desenhou <strong>${esc(vangoState.target_word||'o objeto')}</strong>. Não entrega a resposta KKKK.</p></section>${vangoGuessesHTML()}`;
 }

 if(phase==='guess'){
  return `${drawing}<section class="vango-guess-box"><span>O QUE FOI FOTOGRAFADO?</span><h3>Adivinhe pelo desenho.</h3><div class="vango-guess-form"><input id="vangoGuessInput" class="game-input" maxlength="80" autocomplete="off" placeholder="Seu palpite..."><button id="vangoSendGuess" class="game-action-primary" type="button">Adivinhar</button></div></section>${vangoGuessesHTML()}`;
 }

 return `${drawing}<div class="game-toast">Tempo encerrado. Sincronizando resultado...</div>${vangoGuessesHTML()}`;
}

function bindGameActions(){
 const fp=$('#sendFlashPhoto');
 if(fp)fp.onclick=()=>{
  const input=$('#flashPhotoInput');
  if(!input)return;
  input.setAttribute('accept','image/*');
  input.setAttribute('capture','environment');
  input.click();
 };
 const cp=$('#sendCaptionGame');if(cp)cp.onclick=()=>submitCaption();
 let guess=null;
 document.querySelectorAll('[data-guess-user]').forEach(b=>b.onclick=()=>{
  guess=b.dataset.guessUser;
  document.querySelectorAll('[data-guess-user]').forEach(x=>x.classList.toggle('selected',x===b));
  if($('#confirmGuess'))$('#confirmGuess').disabled=false;
 });
 if($('#confirmGuess'))$('#confirmGuess').onclick=()=>guess&&submitGame({p_guess_user_id:guess});
 selectedVote=null;
 document.querySelectorAll('[data-game-vote]').forEach(b=>b.onclick=()=>{
  if(b.disabled)return;
  selectedVote=b.dataset.gameVote;
  document.querySelectorAll('[data-game-vote]').forEach(x=>x.classList.toggle('selected',x===b));
  if($('#confirmGameVote'))$('#confirmGameVote').disabled=false;
 });
 if($('#confirmGameVote'))$('#confirmGameVote').onclick=()=>voteGame();
}

function bindVangoActions(){
 if(vangoState?.phase==='draw')setupVangoCanvas();
 const photo=$('#vangoTakePhoto');
 if(photo)photo.onclick=()=>{
  const input=$('#vangoPhotoInput');
  if(!input)return;
  input.setAttribute('accept','image/*');
  input.setAttribute('capture','environment');
  input.click();
 };
 const drawing=$('#vangoSubmitDrawing');
 if(drawing)drawing.onclick=()=>submitVangoDrawing(false);
 const guess=$('#vangoSendGuess');
 if(guess)guess.onclick=()=>submitVangoGuess();
 const input=$('#vangoGuessInput');
 if(input)input.addEventListener('keydown',event=>{
  if(event.key==='Enter')submitVangoGuess();
 });
}

function setupVangoCanvas(){
 const canvas=$('#vangoCanvas');
 if(!canvas)return;
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.fillStyle='#ffffff';
 ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.lineCap='round';
 ctx.lineJoin='round';
 let drawing=false;
 let color='#1f1b18';
 let width=14;

 function point(event){
  const rect=canvas.getBoundingClientRect();
  return {
   x:(event.clientX-rect.left)*(canvas.width/rect.width),
   y:(event.clientY-rect.top)*(canvas.height/rect.height)
  };
 }
 function start(event){
  event.preventDefault();
  drawing=true;
  const p=point(event);
  ctx.beginPath();ctx.moveTo(p.x,p.y);
  canvas.setPointerCapture?.(event.pointerId);
 }
 function move(event){
  if(!drawing)return;
  event.preventDefault();
  const p=point(event);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineTo(p.x,p.y);ctx.stroke();
 }
 function end(){drawing=false;ctx.closePath()}

 canvas.addEventListener('pointerdown',start);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',end);
 canvas.addEventListener('pointercancel',end);

 document.querySelectorAll('[data-vango-color]').forEach(button=>button.onclick=()=>{
  color=button.dataset.vangoColor;
  width=14;
  document.querySelectorAll('[data-vango-color]').forEach(x=>x.classList.toggle('active',x===button));
  $('#vangoEraser')?.classList.remove('active');
 });
 const eraser=$('#vangoEraser');
 if(eraser)eraser.onclick=()=>{
  color='#ffffff';width=34;eraser.classList.add('active');
  document.querySelectorAll('[data-vango-color]').forEach(x=>x.classList.remove('active'));
 };
 const clear=$('#vangoClear');
 if(clear)clear.onclick=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)};

 vangoCanvasSession={gameId:game.id,canvas,ctx,submitting:false};
}

async function uploadGameImage(file,prefixName){
 const ext=(file.name?.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
 const path=`${user.id}/rooms/${roomId}/games/${game.id}/${prefixName}-${crypto.randomUUID()}.${ext}`;
 const{error}=await db.storage.from('vinci-images').upload(path,file,{contentType:file.type||'image/jpeg'});
 if(error)throw error;
 const{data}=db.storage.from('vinci-images').getPublicUrl(path);
 return {path,url:data.publicUrl};
}

async function uploadFlash(file){
 if(!file||!game||!isGameParticipant())return;
 let uploaded=null;
 try{
  uploaded=await uploadGameImage(file,'flash');
  const ok=await submitGame({p_image_url:uploaded.url,p_storage_path:uploaded.path});
  if(!ok)throw new Error('A foto não foi registrada.');
 }catch(error){
  if(uploaded?.path)await db.storage.from('vinci-images').remove([uploaded.path]);
  alert(error.message||error);
 }
}

async function submitVangoPhoto(file){
 if(!file||game?.game_type!=='vango'||!vangoState?.is_drawer)return;
 let uploaded=null;
 try{
  setSyncStatus('syncing');
  uploaded=await uploadGameImage(file,'vango-photo');
  const{error}=await db.rpc('vinci_vango_submit_photo',{p_game_id:game.id,p_image_url:uploaded.url,p_storage_path:uploaded.path});
  if(error)throw error;
  await syncUntil(()=>['memorize','draw','waiting_draw'].includes(vangoState?.phase),10,150);
  openGamesTab('game');
 }catch(error){
  if(uploaded?.path)await db.storage.from('vinci-images').remove([uploaded.path]);
  alert(error.message||error);
  await syncGameState('vango-photo-error',true);
 }
}

function canvasBlob(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não consegui preparar o desenho.')),'image/webp',.9));
}

async function submitVangoDrawing(auto=false){
 if(!vangoCanvasSession||vangoCanvasSession.gameId!==game?.id||vangoCanvasSession.submitting)return;
 vangoCanvasSession.submitting=true;
 const button=$('#vangoSubmitDrawing');
 if(button){button.disabled=true;button.textContent=auto?'Tempo! Enviando...':'Enviando desenho...'}
 let uploaded=null;
 try{
  const blob=await canvasBlob(vangoCanvasSession.canvas);
  const file=new File([blob],'vango-drawing.webp',{type:'image/webp',lastModified:Date.now()});
  uploaded=await uploadGameImage(file,'vango-drawing');
  const{error}=await db.rpc('vinci_vango_submit_drawing',{p_game_id:game.id,p_image_url:uploaded.url,p_storage_path:uploaded.path});
  if(error)throw error;
  vangoCanvasSession=null;
  await syncUntil(()=>['guess','watch_guesses','finished'].includes(vangoState?.phase),10,150);
 }catch(error){
  if(uploaded?.path)await db.storage.from('vinci-images').remove([uploaded.path]);
  if(vangoCanvasSession)vangoCanvasSession.submitting=false;
  if(button){button.disabled=false;button.textContent='Enviar desenho'}
  if(!auto)alert(error.message||error);
  requestSync('vango-drawing-error',120);
 }
}

async function submitVangoGuess(){
 const input=$('#vangoGuessInput');
 const value=input?.value.trim();
 if(!value||game?.game_type!=='vango')return;
 const button=$('#vangoSendGuess');
 if(button){button.disabled=true;button.textContent='Enviando...'}
 const{data,error}=await db.rpc('vinci_vango_guess',{p_game_id:game.id,p_guess:value});
 if(error){
  if(button){button.disabled=false;button.textContent='Adivinhar'}
  alert(error.message);
  return;
 }
 if(input)input.value='';
 await syncGameState(data?.correct?'vango-correct':'vango-guess',true);
}

async function submitCaption(){
 const val=$('#captionGameInput')?.value.trim();
 if(!val)return;
 await submitGame({p_content:val});
}

async function submitGame(extra){
 if(!isGameParticipant()){alert('Você não entrou na sala desta partida.');return false}
 const payload={p_game_id:game.id,p_content:null,p_image_url:null,p_storage_path:null,p_guess_user_id:null,...extra};
 const{error}=await db.rpc('vinci_submit_room_game',payload);
 if(error){alert(error.message);await syncGameState('submit-error',true);return false}
 await Promise.all([loadProgress(),syncGameState('submit',true)]);
 return true;
}

async function voteGame(){
 if(!selectedVote)return;
 if(!isGameParticipant()){alert('Você não participa desta partida.');return}
 const{error}=await db.rpc('vinci_vote_room_game',{p_game_id:game.id,p_submission_id:selectedVote});
 if(error){alert(error.message);await syncGameState('vote-error',true);return}
 await syncGameState('vote',true);
}

async function maybeFinalize(){
 if(!game||game.status==='finished')return;
 const{error}=await db.rpc('vinci_finalize_room_game',{p_game_id:game.id});
 if(error)console.warn('Vinci Play finalize',error);
 await syncGameState('finalize',true);
}

async function tick(){
 if(!game)return;
 const el=$('#gameTimer');
 if(el)el.textContent=fmt(timeLeft());
 if(timeLeft()>0)return;
 if(phaseTransitionBusy)return;
 phaseTransitionBusy=true;
 try{
  if(game.game_type==='vango'&&vangoState?.phase==='draw'&&vangoState?.is_drawer&&vangoCanvasSession){
   await submitVangoDrawing(true);
  }else{
   await sleep(120);
   await syncGameState('phase-deadline',true);
   if(game?.status==='active'&&timeLeft()<=0)await maybeFinalize();
  }
 }finally{
  phaseTransitionBusy=false;
 }
}

async function runLobbyAction(action,button){
 if(!action)return;

 if(action==='join'){
  await joinLobby();
  return;
 }

 if(action==='leave'){
  await leaveLobby();
  return;
 }

 if(action==='start'){
  await startLobbyGame();
  return;
 }

 if(action==='close'){
  await closeLobby();
 }
}

function bindLobbyActions(){
 const area=$('#gameLobbyArea');

 if(!area||area.dataset.lobbyActionsBound==='1')return;

 area.dataset.lobbyActionsBound='1';

 const resolveAction=event=>{
  const button=event.target.closest?.('[data-lobby-action]');

  if(!button||!area.contains(button)||button.disabled)return null;

  return {
   button,
   action:button.dataset.lobbyAction
  };
 };

 /*
    Touch/Pen:
    executa em pointerup, sem esperar o click sintético do navegador.
    Isso evita o botão desaparecer se o Game Engine renderizar o
    lobby de novo entre o toque e o evento click.
 */
 area.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse')return;

  const target=resolveAction(event);
  if(!target)return;

  event.preventDefault();
  event.stopPropagation();

  lastLobbyPointerActionAt=Date.now();

  runLobbyAction(
   target.action,
   target.button
  );
 },{passive:false});

 /*
    Mouse/Desktop e fallback de navegadores sem Pointer Events.
    Ignora o click sintético que costuma vir logo depois do pointerup.
 */
 area.addEventListener('click',event=>{
  const target=resolveAction(event);
  if(!target)return;

  if(Date.now()-lastLobbyPointerActionAt<700){
   event.preventDefault();
   return;
  }

  event.preventDefault();

  runLobbyAction(
   target.action,
   target.button
  );
 });
}

function bindGamesUI(){
 bindLobbyActions();
 document.querySelectorAll('[data-shop-filter]').forEach(b=>b.onclick=()=>{shopFilter=b.dataset.shopFilter;renderCosmetics()});
 const open=$('#openCosmeticsButton'),panel=$('#cosmeticsPanel'),close=$('#closeCosmeticsButton');
 if(open&&panel)open.onclick=()=>{panel.classList.remove('hidden');document.body.classList.add('cosmetics-open')};
 if(close&&panel)close.onclick=()=>{panel.classList.add('hidden');document.body.classList.remove('cosmetics-open')};
 if(panel)panel.addEventListener('click',e=>{if(e.target===panel){panel.classList.add('hidden');document.body.classList.remove('cosmetics-open')}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel&&!panel.classList.contains('hidden')){panel.classList.add('hidden');document.body.classList.remove('cosmetics-open')}});
}

async function init(){
 bindGamesUI();
 const{data}=await db.auth.getUser();
 user=data?.user;
 if(!user)return;
 await loadProfiles([user.id]);
 if(!roomId){await loadProgress();return}
 await loadMembers();
 if(!members.some(m=>m.user_id===user.id))return;
 await loadProgress();

 document.querySelectorAll('[data-start-game]').forEach(b=>b.onclick=()=>openLobby(b.dataset.startGame));

 const flash=$('#flashPhotoInput');
 if(flash){flash.setAttribute('accept','image/*');flash.setAttribute('capture','environment')}
 if(flash)flash.onchange=e=>{
  const f=e.target.files?.[0];e.target.value='';if(f)uploadFlash(f);
 };

 const vangoPhoto=$('#vangoPhotoInput');
 if(vangoPhoto){vangoPhoto.setAttribute('accept','image/*');vangoPhoto.setAttribute('capture','environment')}
 if(vangoPhoto)vangoPhoto.onchange=e=>{
  const f=e.target.files?.[0];e.target.value='';if(f)submitVangoPhoto(f);
 };

 startLifecycleSync();
 await syncGameState('init',true);
 await connectRealtime();
 schedulePoll();
}

init();
})();
