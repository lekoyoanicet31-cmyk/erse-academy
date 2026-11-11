// ═══ nav.js ═══
/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
let appHistoryReady=false;
function initAppHistory(){
  if(appHistoryReady||!window.history||!window.history.pushState)return;
  appHistoryReady=true;
  const active=document.querySelector('.page.on');
  const initialPage=active?active.id.replace('pg-',''):'home';
  try{
    history.replaceState({erseApp:true,page:initialPage},'',location.href);
    history.pushState({erseApp:true,page:initialPage,guard:true},'',location.href);
  }catch(e){console.warn('Navigation history unavailable:',e);}
  window.addEventListener('popstate',event=>{
    const page=event.state&&event.state.erseApp&&event.state.page;
    if(page){goPage(page,true);return;}
    const current=document.querySelector('.page.on');
    const currentPage=current?current.id.replace('pg-',''):'home';
    try{history.pushState({erseApp:true,page:currentPage,guard:true},'',location.href);}catch(e){}
    if(currentPage!=='home')goPage('home',true);
  });
}
function goPage(id,fromHistory=false){
  initAppHistory();
  if(id==='admin'){
    if(!currentUser){toast('Connectez-vous d\'abord','err');return;}
    if(currentUser.role!=='admin'){toast('Accès non autorisé','err');goPage('home');return;}
  }
  if(!currentUser && !['home','energybot','forum','leaderboard','certs'].includes(id)){return;}
  const activePageNow=document.querySelector('.page.on');
  const currentPageId=activePageNow?activePageNow.id.replace('pg-',''):'';
  if(!fromHistory&&currentPageId&&currentPageId!==id){try{history.pushState({erseApp:true,page:id},'',location.href);}catch(e){}}
  // Sync Firebase à chaque changement de page
  if(fbReady && id!=='admin') checkForUpdates().catch(e=>console.warn(e));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  document.body.classList.toggle('energybot-active', id==='energybot');
  document.querySelectorAll('.np').forEach(b=>b.classList.remove('on'));
  const idx={home:0,courses:1,exams:2,leaderboard:3,certs:4,energybot:5,boutique:6,forum:7,planning:8};
  const navLinks=document.querySelectorAll('#nav-links .np');
  if(idx[id]!==undefined && navLinks[idx[id]]) navLinks[idx[id]].classList.add('on');
  document.getElementById('notif-panel').classList.remove('open');
  // Sauvegarder la page courante
  try{ localStorage.setItem('erse_current_page', id); }catch(e){}
  // Force reflow pour les pages avec layout grid/flex hauteur fixe
  if(['energybot','admin','forum'].includes(id)){
    const pg=document.getElementById('pg-'+id);
    if(pg){void pg.offsetHeight;}
  }
  const renders={home:renderHome,planning:()=>initPlanning(),forum:()=>{loadForumData();renderForum(FORUM.posts);},courses:()=>{
    const userLvl=getUserLevel();
    const tabs=document.querySelectorAll('#lvl-tabs .tab');
    const targetTab=tabs[userLvl-1]||tabs[0];
    filterLevel(userLvl,targetTab);
    renderLevelBadge();
  },exams:()=>{ document.getElementById('quiz-wrap').style.display='none'; document.getElementById('exam-list-wrap').style.display=''; renderExamList(); renderLevelBadge(); },leaderboard:()=>refreshLeaderboard(),certs:renderCerts,profile:renderProfile,boutique:()=>loadShop(),energybot:()=>{
    // Recalcul explicite du layout EnergyBot
    const layout=document.querySelector('.eb-layout');
    const main=document.querySelector('.eb-main');
    if(layout&&main){
      layout.style.height='';
      main.style.height='';
      requestAnimationFrame(()=>{
        layout.style.height='calc(100vh - 62px)';
        main.style.height='calc(100vh - 62px)';
      });
    }
  },admin:()=>{
    // Recalcul layout admin
    const adminMain=document.querySelector('.admin-main');
    if(adminMain){void adminMain.offsetHeight;}
    adminTab('dashboard',document.querySelector('.ani'));
  }};
  if(renders[id]) renders[id]();
}

function showMoreMenu(){
  const m = document.getElementById('mobile-more-menu');
  if(m) m.style.display = m.style.display==='none'?'block':'none';
}
function hideMoreMenu(){
  const m = document.getElementById('mobile-more-menu');
  if(m) m.style.display='none';
}
function toggleMobile(){document.getElementById('mobile-menu').classList.toggle('open');}

/* ═══════════════════════════════════════════
   DARK MODE
═══════════════════════════════════════════ */
function toggleDark(){
  darkMode=!darkMode;
  document.documentElement.setAttribute('data-theme',darkMode?'dark':'light');
  try{localStorage.setItem('erse_theme',darkMode?'dark':'light');}catch(e){}
  const btn=document.getElementById('dm-btn');
  if(btn) btn.textContent=darkMode?'☀️ Clair':'🌙 Sombre';
}

/* ═══════════════════════════════════════════ */
