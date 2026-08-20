(function(){
"use strict";
const $=s=>document.querySelector(s), roomId=new URLSearchParams(location.search).get("id");
let user=null,game=null,lobby=null,members=[],lobbyMembers=[],gameParticipants=[],profiles=new Map(),submissions=[],votes=[],myStats={xp:0,games_played:0,wins:0,equipped_frame:null},unlocks=new Set(),unlockDates=new Map(),usageMap=new Map(),shopFilter='featured',timer=null,lobbyTimer=null,selectedVote=null,lobbySchemaReady=true;
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
function gameName(t){return t==='flash'?'Vinci Flash':t==='who_took'?'Quem Tirou?':'Blind Caption'}
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

function gameIsActive(){
 return !!(game&&game.status==='active'&&Date.now()<new Date(game.ends_at).getTime())
}
function lobbyIsOpen(){
 return !!(lobby&&lobby.status==='open'&&Date.now()<new Date(lobby.expires_at).getTime())
}
function isLobbyMember(uid=user?.id){
 return !!uid&&lobbyMembers.some(x=>x.user_id===uid)
}
function isGameParticipant(uid=user?.id){
 return !!uid&&gameParticipants.some(x=>x.user_id===uid)
}
function lobbyTimeLeft(){
 return lobby?Math.max(0,new Date(lobby.expires_at).getTime()-Date.now()):0
}
function playerWord(n){return n===1?'pessoa':'pessoas'}

async function loadLatestGame(){
 const{data,error}=await db.from('vinci_room_games').select('*').eq('room_id',roomId).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(error&&error.code!=='PGRST116'){showInstall(error);return}
 game=data||null;
 gameParticipants=[];
 if(game){
  await loadGameParticipants();
  await loadGameData();
  await maybeFinalize();
 }
 await renderGame();
 renderCooldown();
}

function showInstall(error){
 const message=String(error?.message||'');
 const missingLobby=message.includes('vinci_room_game_lobbies')||message.includes('vinci_room_game_lobby_members')||message.includes('vinci_room_game_participants')||message.includes('vinci_open_room_game_lobby');
 const target=$('#gameLobbyArea')||$('#activeGameArea');
 if(target)target.innerHTML=`<div class="game-toast bad">${esc(missingLobby?'Rode VINCI_1_1_FOCUS_PATCH_13_GAME_LOBBIES.sql no Supabase para ativar as salas multiplayer.':message.includes('vinci_room_games')?'Instale VINCI_1_0_ROOMS_PATCH_06_GAMES.sql no Supabase.':message||'Erro ao carregar jogos.')}</div>`;
}

async function loadGameParticipants(){
 if(!game){gameParticipants=[];return}
 const{data,error}=await db.from('vinci_room_game_participants').select('user_id,joined_at').eq('game_id',game.id).order('joined_at');
 if(error){
  const message=String(error.message||'');
  if(message.includes('vinci_room_game_participants')){
   lobbySchemaReady=false;
   gameParticipants=[];
   return;
  }
  console.warn('Vinci Play: participantes da partida',error);
  gameParticipants=[];
  return;
 }
 gameParticipants=data||[];
 await loadProfiles(gameParticipants.map(x=>x.user_id));
}

async function loadGameData(){
 if(!game)return;
 const[{data:s},{data:v}]=await Promise.all([
  db.from('vinci_room_game_submissions').select('*').eq('game_id',game.id).order('created_at'),
  db.from('vinci_room_game_votes').select('*').eq('game_id',game.id)
 ]);
 submissions=s||[];
 votes=v||[];
 await loadProfiles([...submissions.map(x=>x.user_id),game.winner_user_id].filter(Boolean));
}

async function loadLobby(){
 if(!roomId||!user)return;
 const nowISO=new Date().toISOString();
 const{data,error}=await db.from('vinci_room_game_lobbies').select('*').eq('room_id',roomId).eq('status','open').gt('expires_at',nowISO).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(error){
  const message=String(error.message||'');
  if(message.includes('vinci_room_game_lobbies')){
   lobbySchemaReady=false;
   lobby=null;
   lobbyMembers=[];
   renderLobby();
   renderRoomLobbyNotice();
   renderGameButtons();
   showInstall(error);
   return;
  }
  console.warn('Vinci Play: sala de partida',error);
  return;
 }
 lobbySchemaReady=true;
 lobby=data||null;
 lobbyMembers=[];
 if(lobby){
  const{data:lm,error:lmError}=await db.from('vinci_room_game_lobby_members').select('user_id,joined_at').eq('lobby_id',lobby.id).order('joined_at');
  if(lmError){
   showInstall(lmError);
  }else{
   lobbyMembers=lm||[];
   await loadProfiles([lobby.host_user_id,...lobbyMembers.map(x=>x.user_id)]);
  }
 }
 renderLobby();
 renderRoomLobbyNotice();
 renderGameButtons();
 renderCooldown();
 startLobbyClock();
}

function startLobbyClock(){
 clearInterval(lobbyTimer);
 if(!lobbyIsOpen())return;
 lobbyTimer=setInterval(async()=>{
  const el=$('#lobbyExpiry');
  const left=lobbyTimeLeft();
  if(el)el.textContent=fmt(left);
  if(left<=0){
   clearInterval(lobbyTimer);
   await loadLobby();
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
  area.innerHTML='<div class="game-toast bad">As salas multiplayer ainda não estão instaladas. Rode o PATCH 13 no Supabase.</div>';
  return;
 }
 if(!lobbyIsOpen()){
  area.innerHTML=`<section class="game-lobby-empty"><span>SALAS DE PARTIDA</span><h3>Primeiro junta a galera.</h3><p>Abra uma sala de um jogo. A partida só libera quando pelo menos 2 pessoas entrarem.</p></section>`;
  return;
 }
 const count=lobbyMembers.length;
 const joined=isLobbyMember();
 const host=lobby.host_user_id===user.id;
 const hostProfile=profiles.get(lobby.host_user_id)||{};
 const ready=count>=2;
 const controls=host
  ? `<div class="game-lobby-actions"><button id="startLobbyGame" class="game-action-primary" type="button" ${ready?'':'disabled'}>${ready?`Iniciar partida · ${count}`:'Esperando +1 pessoa'}</button><button id="closeLobbyGame" class="game-action-soft danger" type="button">Fechar sala</button></div>`
  : joined
   ? `<div class="game-lobby-actions"><div class="game-lobby-wait">${ready?`Tudo pronto. Esperando @${esc(hostProfile.username||'host')} iniciar.`:'Esperando mais alguém entrar...'}</div><button id="leaveLobbyGame" class="game-action-soft" type="button">Sair da sala</button></div>`
   : `<div class="game-lobby-actions"><button id="joinLobbyGame" class="game-action-primary" type="button">Entrar na sala</button></div>`;
 area.innerHTML=`<article class="game-lobby-card">
   <header class="game-lobby-head"><div><span>SALA DE PARTIDA · ABERTA</span><h3>${esc(gameName(lobby.game_type))}</h3><p>@${esc(hostProfile.username||'usuario')} abriu esta sala</p></div><div class="game-lobby-expire"><small>fecha em</small><strong id="lobbyExpiry">${fmt(lobbyTimeLeft())}</strong></div></header>
   <div class="game-lobby-status"><div class="game-lobby-avatars">${lobbyAvatars()}</div><strong>${count} ${playerWord(count)} na sala</strong><small>${ready?'✓ Mínimo atingido. A partida pode começar.':'É preciso pelo menos 2 pessoas para iniciar.'}</small></div>
   ${controls}
  </article>`;
 const join=$('#joinLobbyGame');if(join)join.onclick=()=>joinLobby();
 const leave=$('#leaveLobbyGame');if(leave)leave.onclick=()=>leaveLobby();
 const close=$('#closeLobbyGame');if(close)close.onclick=()=>closeLobby();
 const start=$('#startLobbyGame');if(start)start.onclick=()=>startLobbyGame();
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
  openGamesTab();
 };
}

function openGamesTab(){
 document.querySelector('.room-tabs [data-tab="games"]')?.click();
 setTimeout(()=>$('#gameLobbyArea')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
}

function renderGameButtons(){
 const buttons=document.querySelectorAll('[data-start-game]');
 const active=gameIsActive();
 const open=lobbyIsOpen();
 const cooldown=game?Math.max(0,new Date(game.created_at).getTime()+10*60*1000-Date.now()):0;
 buttons.forEach(button=>{
  const same=open&&button.dataset.startGame===lobby.game_type;
  button.disabled=!lobbySchemaReady||active||open||cooldown>0;
  button.textContent=same?'Sala aberta':open?'Outra sala aberta':active?'Partida em andamento':cooldown>0?'Aguarde':'Abrir sala';
 });
}

async function openLobby(type){
 if(!lobbySchemaReady){alert('Rode VINCI_1_1_FOCUS_PATCH_13_GAME_LOBBIES.sql no Supabase.');return}
 document.querySelectorAll('[data-start-game]').forEach(b=>b.disabled=true);
 const{data,error}=await db.rpc('vinci_open_room_game_lobby',{p_room_id:roomId,p_game_type:type});
 if(error){
  const msg=String(error.message||'');
  alert(msg.includes('vinci_open_room_game_lobby')?'Rode VINCI_1_1_FOCUS_PATCH_13_GAME_LOBBIES.sql no Supabase.':msg);
  await loadLobby();
  renderCooldown();
  return;
 }
 lobby=Array.isArray(data)?data[0]:data;
 await loadLobby();
 openGamesTab();
}

async function joinLobby(openTab=true){
 if(!lobby)return false;
 const{error}=await db.rpc('vinci_join_room_game_lobby',{p_lobby_id:lobby.id});
 if(error){alert(error.message);await loadLobby();return false}
 await loadLobby();
 if(openTab)openGamesTab();
 return true;
}

async function leaveLobby(){
 if(!lobby)return;
 const{error}=await db.rpc('vinci_leave_room_game_lobby',{p_lobby_id:lobby.id});
 if(error){alert(error.message);return}
 await loadLobby();
}

async function closeLobby(){
 if(!lobby)return;
 if(!confirm('Fechar esta sala de partida?'))return;
 const{error}=await db.rpc('vinci_close_room_game_lobby',{p_lobby_id:lobby.id});
 if(error){alert(error.message);return}
 await loadLobby();
}

async function startLobbyGame(){
 if(!lobby)return;
 if(lobbyMembers.length<2){alert('A partida precisa de pelo menos 2 pessoas na sala.');return}
 const button=$('#startLobbyGame');
 if(button){button.disabled=true;button.textContent='Iniciando...'}
 const{data,error}=await db.rpc('vinci_start_room_game_lobby',{p_lobby_id:lobby.id});
 if(error){alert(error.message);await loadLobby();return}
 game=Array.isArray(data)?data[0]:data;
 lobby=null;
 lobbyMembers=[];
 submissions=[];
 votes=[];
 await Promise.all([loadGameParticipants(),loadGameData()]);
 renderRoomLobbyNotice();
 renderLobby();
 renderCooldown();
 await renderGame();
 openGamesTab();
}

function allSubmitted(){
 const total=gameParticipants.length;
 return total>0&&submissions.length>=total;
}
function submissionPhase(){return game&&game.status==='active'&&Date.now()<new Date(game.submit_ends_at).getTime()&&!allSubmitted()}
function votingPhase(){return game&&game.status==='active'&&game.game_type!=='who_took'&&!submissionPhase()&&Date.now()<new Date(game.ends_at).getTime()}
function timeLeft(){if(!game)return 0;const target=submissionPhase()?game.submit_ends_at:game.ends_at;return Math.max(0,new Date(target).getTime()-Date.now())}
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),r=s%60;return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`}

function renderCooldown(){
 const box=$('#gamesCooldown');
 if(!box)return;
 const buttons=document.querySelectorAll('[data-start-game]');
 if(!game){
  box.classList.add('hidden');
  renderGameButtons();
  return;
 }
 const until=new Date(game.created_at).getTime()+10*60*1000;
 const left=until-Date.now();
 const active=gameIsActive();
 if(left>0&&!lobbyIsOpen()){
  box.classList.remove('hidden');
  box.textContent=`⏳ Próxima sala disponível em ${fmt(left)}. O limite continua sendo 1 partida a cada 10 minutos por Room.`;
 }else{
  box.classList.add('hidden');
 }
 renderGameButtons();
 if(active)buttons.forEach(b=>b.disabled=true);
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
 if(game.status==='active'&&!participant){
  body=`<div class="game-spectator"><span>👀 ESPECTADOR</span><h3>Esta rodada já começou.</h3><p>Você não entrou na sala antes do início, então pode acompanhar a partida, mas participa só da próxima.</p></div>`;
 }else if(game.game_type==='flash'){
  body=await flashBody(mine);
 }else if(game.game_type==='who_took'){
  body=await whoBody(mine);
 }else{
  body=await captionBody(mine);
 }
 const phase=game.status==='finished'?'FINALIZADO':!participant?'EM ANDAMENTO':submissionPhase()?'PARTICIPE AGORA':game.game_type==='who_took'?'RESULTADO':'VOTAÇÃO';
 const participantsLabel=gameParticipants.length?`${gameParticipants.length} ${playerWord(gameParticipants.length)}`:'';
 area.innerHTML=`<article class="active-game-card"><header class="active-game-head"><div><span>${phase}${participantsLabel?` · ${participantsLabel.toUpperCase()}`:''}</span><h3>${esc(gameName(game.game_type))}</h3></div><strong id="gameTimer" class="game-timer">${game.status==='finished'?'FIM':fmt(timeLeft())}</strong></header><div class="active-game-body">${body}${game.status==='finished'?`<div class="game-result-banner"><span>🏆 VENCEDOR</span><strong>${winner?'@'+esc(winner.username||'usuário'):'Sem vencedor'}</strong><p>${winner?'Recebeu +60 XP e progresso para novas molduras.':'A partida terminou sem uma resposta vencedora.'}</p></div>`:''}</div></article>`;
 if(participant)bindGameActions();
 if(game.status==='active')timer=setInterval(tick,1000);
}

async function flashBody(mine){
 if(submissionPhase())return `<h3 class="game-prompt">${esc(game.prompt)}</h3><p class="game-helper">Apenas quem entrou na sala participa. Você tem 90 segundos para enviar sua foto.</p>${mine?'<div class="game-toast good">✓ Sua foto foi enviada. Esperando os outros jogadores...</div>':'<div class="game-actions"><button id="sendFlashPhoto" class="game-action-primary" type="button">📷 Tirar / escolher foto</button></div>'}`;
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

function bindGameActions(){
 const fp=$('#sendFlashPhoto');if(fp)fp.onclick=()=>$('#flashPhotoInput').click();
 const cp=$('#sendCaptionGame');if(cp)cp.onclick=()=>submitCaption();
 let guess=null;
 document.querySelectorAll('[data-guess-user]').forEach(b=>b.onclick=()=>{
  guess=b.dataset.guessUser;
  document.querySelectorAll('[data-guess-user]').forEach(x=>x.classList.toggle('selected',x===b));
  $('#confirmGuess').disabled=false;
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

async function uploadFlash(file){
 if(!file||!game||!isGameParticipant())return;
 const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
 const path=`${user.id}/rooms/${roomId}/games/${game.id}/${crypto.randomUUID()}.${ext}`;
 const{error}=await db.storage.from('vinci-images').upload(path,file,{contentType:file.type||'image/jpeg'});
 if(error){alert(error.message);return}
 const{data}=db.storage.from('vinci-images').getPublicUrl(path);
 const ok=await submitGame({p_image_url:data.publicUrl,p_storage_path:path});
 if(!ok)await db.storage.from('vinci-images').remove([path]);
}

async function submitCaption(){
 const val=$('#captionGameInput')?.value.trim();
 if(!val)return;
 await submitGame({p_content:val});
}

async function submitGame(extra){
 if(!isGameParticipant()){alert('Você não entrou na sala desta partida.');return false}
 const payload={p_game_id:game.id,p_content:null,p_image_url:null,p_storage_path:null,p_guess_user_id:null,...extra};
 const{data,error}=await db.rpc('vinci_submit_room_game',payload);
 if(error){alert(error.message);return false}
 await Promise.all([loadGameData(),loadProgress()]);
 await maybeFinalize();
 await renderGame();
 return true;
}

async function voteGame(){
 if(!selectedVote)return;
 if(!isGameParticipant()){alert('Você não participa desta partida.');return}
 const{error}=await db.rpc('vinci_vote_room_game',{p_game_id:game.id,p_submission_id:selectedVote});
 if(error){alert(error.message);return}
 await loadGameData();
 await maybeFinalize();
 await renderGame();
}

async function maybeFinalize(){
 if(!game||game.status==='finished')return;
 const{data,error}=await db.rpc('vinci_finalize_room_game',{p_game_id:game.id});
 if(!error&&data){
  const g=Array.isArray(data)?data[0]:data;
  if(g?.status==='finished'){
   game=g;
   await Promise.all([loadGameData(),loadProgress()]);
  }
 }
}

async function tick(){
 if(!game)return;
 const el=$('#gameTimer');if(el)el.textContent=fmt(timeLeft());
 renderCooldown();
 if(timeLeft()<=0){
  clearInterval(timer);
  await loadGameData();
  await maybeFinalize();
  await renderGame();
 }
}

async function refreshGame(){
 if(!game){
  await loadLatestGame();
  return;
 }
 const{data}=await db.from('vinci_room_games').select('*').eq('id',game.id).maybeSingle();
 if(data)game=data;
 await loadGameParticipants();
 await loadGameData();
 await maybeFinalize();
 await renderGame();
 renderCooldown();
}

async function refreshLobby(){
 await loadLobby();
}

function bindGamesUI(){
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
 if(!roomId){
  await loadProgress();
  return;
 }
 await loadMembers();
 if(!members.some(m=>m.user_id===user.id))return;
 await loadProgress();
 await Promise.all([loadLatestGame(),loadLobby()]);
 document.querySelectorAll('[data-start-game]').forEach(b=>b.onclick=()=>openLobby(b.dataset.startGame));
 const photo=$('#flashPhotoInput');
 if(photo)photo.onchange=e=>{
  const f=e.target.files?.[0];
  e.target.value='';
  if(f)uploadFlash(f);
 };
 db.channel(`room-games-${roomId}`)
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_lobbies',filter:`room_id=eq.${roomId}`},refreshLobby)
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_lobby_members',filter:`room_id=eq.${roomId}`},refreshLobby)
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_games',filter:`room_id=eq.${roomId}`},async()=>{await loadLatestGame();await loadLobby()})
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_participants',filter:`room_id=eq.${roomId}`},refreshGame)
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_submissions',filter:`room_id=eq.${roomId}`},refreshGame)
 .on('postgres_changes',{event:'*',schema:'public',table:'vinci_room_game_votes',filter:`room_id=eq.${roomId}`},refreshGame)
 .subscribe();
}
init();
})();
