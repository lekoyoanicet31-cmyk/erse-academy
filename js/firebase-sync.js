// ═══ firebase-sync.js ═══
/* ═══════════════ REALTIME DATABASE ═══════════════ */
const rtdb = firebase.database();
const adminDataRef = rtdb.ref('adminData');
let rtdbListenerActive = false;

// Écrire dans RTDB quand admin modifie
async function pushToRTDB(){
  try{
    // JSON.parse(JSON.stringify(...)) élimine les undefined/fonctions non sérialisables
    const safeSubjects = JSON.parse(JSON.stringify(DB.subjects));
    await adminDataRef.set({
      subjects: safeSubjects,
      exams: DB.exams.map(e=>({
        id:e.id, subjectId:e.subjectId,
        difficulty:e.difficulty, questions:e.questions||[]
      })),
      updatedAt: Date.now(),
      updatedBy: currentUser?.email||'admin'
    });
    // Clignoter le point sync
    const dot=document.getElementById('sync-dot');
    if(dot){dot.style.background='#22c55e';setTimeout(()=>{if(dot)dot.style.background='rgba(255,255,255,0.3)';},1500);}
    console.log('✅ RTDB mis à jour');
  }catch(e){console.warn('RTDB push error:',e);}
}

// Écouter les changements en temps réel
function startRTDBListener(){
  if(rtdbListenerActive) return;
  rtdbListenerActive = true;
  adminDataRef.on('value', snap=>{
    const data = snap.val();
    if(!data) return;
    // Ne pas appliquer si c'est nous qui avons modifié
    if(data.updatedBy === currentUser?.email) return;
    if(!data.updatedAt || data.updatedAt <= 0) return;

    // Mettre à jour les matières
    const subjArr=Array.isArray(data.subjects)?data.subjects:Object.values(data.subjects||{});
    if(subjArr.length){
      subjArr.forEach(s=>{
        if(!s||!s.id) return;
        s.files=Array.isArray(s.files)?s.files:[];
        const idx=DB.subjects.findIndex(x=>parseInt(x.id)===parseInt(s.id));
        if(idx!==-1) DB.subjects[idx]={...DB.subjects[idx],...s};
        else DB.subjects.push({...s,id:parseInt(s.id)||s.id});
      });
    }

    // Mettre à jour les examens
    const examsArr = Array.isArray(data.exams) ? data.exams : Object.values(data.exams||{});
    if(examsArr.length){
      examsArr.forEach(e=>{
        if(!e||!e.id) return;
        // S'assurer que questions est un array
        e.questions = Array.isArray(e.questions) ? e.questions : Object.values(e.questions||{});
        const idx=DB.exams.findIndex(x=>parseInt(x.id)===parseInt(e.id));
        if(idx!==-1) DB.exams[idx]={...DB.exams[idx],...e};
        else DB.exams.push({...e,id:parseInt(e.id)||e.id});
      });
    }

    // Rafraîchir la page active automatiquement
    const activePage=document.querySelector('.page.on');
    if(activePage){
      if(activePage.id==='pg-home') renderHome();
      if(activePage.id==='pg-courses'){
        const tab=document.querySelector('#lvl-tabs .tab.on');
        const lvl=tab?[...document.querySelectorAll('#lvl-tabs .tab')].indexOf(tab)+1:1;
        filterLevel(lvl,tab);
      }
      if(activePage.id==='pg-exams' && document.getElementById('exam-list-wrap').style.display!=='none') renderExamList();
    }

    // Notification visuelle
    const dot=document.getElementById('sync-dot');
    if(dot){dot.style.background='#22c55e';setTimeout(()=>{if(dot)dot.style.background='rgba(255,255,255,0.3)';},2000);}
    console.log('🔄 Données reçues depuis RTDB en temps réel');
  });
}

function stopRTDBListener(){
  if(rtdbListenerActive){
    adminDataRef.off();
    rtdbListenerActive=false;
  }
}

/* ═══════════════ SYNC CENTRALISÉ VIA FIREBASE ═══════════════
   JSONBin supprimé (clé API retirée pour sécurité GitHub).
   La synchronisation passe uniquement par Firebase RTDB + Firestore.
═══════════════════════════════════════════════════════════════ */
// pushToRTDB est défini plus haut (Firebase RTDB)
// startJsonBinSync et stopJsonBinSync remplacées par des no-ops
function startJsonBinSync(){ console.log('Sync Firebase RTDB actif (JSONBin désactivé)'); }
function stopJsonBinSync(){ }


/* ═══════════════ AUTO-REFRESH FIREBASE ═══════════════ */
let autoRefreshTimer = null;

async function syncFromFirebase(){
  if(!fbReady) return;
  try{
    // Sync matières
    const snapSubj = await db.collection('subjects').get();
    if(!snapSubj.empty){
      snapSubj.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id);
        const idx=DB.subjects.findIndex(s=>s.id===id);
        if(idx!==-1) DB.subjects[idx]={...DB.subjects[idx],...d,id};
        else DB.subjects.push({...d,id});
      });
    }

    // Sync examens
    const snapExam = await db.collection('exams').get();
    if(!snapExam.empty){
      snapExam.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id);
        // S'assurer que questions est un array
        const questions=Array.isArray(d.questions)?d.questions:Object.values(d.questions||{});
        const idx=DB.exams.findIndex(e=>parseInt(e.id)===id);
        if(idx!==-1) DB.exams[idx]={...DB.exams[idx],...d,id,questions};
        else DB.exams.push({...d,id,questions});
      });
    }

    // Sync étudiants
    const fbStudents = await fbLoadAllStudents();
    fbStudents.forEach(fs=>{
      const idx=DB.students.findIndex(s=>s.email===fs.email);
      if(idx!==-1) DB.students[idx]={...DB.students[idx],...fs};
      else DB.students.push(fs);
    });

    // Rafraîchir la page active
    const activePage=document.querySelector('.page.on');
    if(activePage){
      if(activePage.id==='pg-home') renderHome();
      if(activePage.id==='pg-courses'){
        const activeTab=document.querySelector('#lvl-tabs .tab.on');
        const level=activeTab?[...document.querySelectorAll('#lvl-tabs .tab')].indexOf(activeTab)+1:1;
        filterLevel(level, activeTab);
      }
      if(activePage.id==='pg-exams' && document.getElementById('exam-list-wrap').style.display!=='none') renderExamList();
      if(activePage.id==='pg-leaderboard') renderLB(DB.students);
    }

    // Indicateur sync discret
    const dot=document.getElementById('sync-dot');
    if(dot){
      dot.style.background='#22c55e';
      setTimeout(()=>{ if(dot) dot.style.background='rgba(255,255,255,0.3)'; },1000);
    }

  }catch(e){ console.warn('Auto-sync error:', e); }
}

let lastKnownUpdate = 0;

async function checkForUpdates(){
  if(!fbReady) return;
  try{
    // Vérifier si l'admin a fait des modifications
    const metaDoc = await db.collection('meta').doc('lastUpdate').get();
    if(metaDoc.exists){
      const serverTs = metaDoc.data().ts || 0;
      const updatedBy = metaDoc.data().by || '';
      // Si la mise à jour vient d'un autre appareil
      if(serverTs > lastKnownUpdate && updatedBy !== currentUser?.email){
        lastKnownUpdate = serverTs;
        console.log('🔄 Changement détecté depuis Firebase, sync...');
        await syncFromFirebase();
        // Afficher indicateur
        const dot=document.getElementById('sync-dot');
        if(dot){
          dot.style.background='#22c55e';
          setTimeout(()=>{ if(dot) dot.style.background='rgba(255,255,255,0.3)'; },2000);
        }
        showSyncStatus('✓ Contenu mis à jour', 'ok');
        setTimeout(hideSyncStatus, 2500);
      } else if(serverTs > lastKnownUpdate) {
        lastKnownUpdate = serverTs;
      }
    }
  }catch(e){ console.warn('checkForUpdates error:', e); }
}

function startAutoRefresh(){
  if(autoRefreshTimer) clearInterval(autoRefreshTimer);
  // Vérifier les mises à jour toutes les 10 secondes
  autoRefreshTimer=setInterval(checkForUpdates, 10000);
  // Initialiser le timestamp connu
  db.collection('meta').doc('lastUpdate').get().then(doc=>{
    if(doc.exists) lastKnownUpdate = doc.data().ts || 0;
  }).catch(()=>{});
  console.log('✅ Auto-refresh Firebase activé (10s)');
}

function stopAutoRefresh(){
  if(autoRefreshTimer){ clearInterval(autoRefreshTimer); autoRefreshTimer=null; }
}

function animateCounter(id, target){
  const el=document.getElementById(id);
  if(!el) return;
  let current=0;
  const step=Math.max(1,Math.floor(target/30));
  const timer=setInterval(()=>{
    current=Math.min(current+step, target);
    el.textContent=current;
    if(current>=target) clearInterval(timer);
  },40);
}

function updateBottomNav(id){
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('on'));
  const map={home:0,courses:1,exams:2,energybot:3,forum:4,profile:5};
  const items=document.querySelectorAll('.bn-item');
  if(map[id]!==undefined && items[map[id]]) items[map[id]].classList.add('on');
}

function updateNotifDot(){
  const hasUnread=DB.notifications.some(n=>n.unread);
  document.getElementById('notif-dot').style.display=hasUnread?'block':'none';
}

