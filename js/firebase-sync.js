// ═══ firebase-sync.js ═══
/* ═══════════════ REALTIME DATABASE ═══════════════ */
const rtdb = firebase.database();
const adminDataRef = rtdb.ref('adminData');
let rtdbListenerActive = false;

async function pushToRTDB(){
  try{
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
    console.log('✅ RTDB mis à jour');
  }catch(e){console.warn('RTDB push error:',e);}
}

function startRTDBListener(){
  if(rtdbListenerActive) return;
  rtdbListenerActive = true;
  adminDataRef.on('value', snap=>{
    const data = snap.val();
    if(!data) return;
    if(data.updatedBy === currentUser?.email) return;
    if(!data.updatedAt || data.updatedAt <= 0) return;

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

    const examsArr = Array.isArray(data.exams) ? data.exams : Object.values(data.exams||{});
    if(examsArr.length){
      examsArr.forEach(e=>{
        if(!e||!e.id) return;
        e.questions = Array.isArray(e.questions) ? e.questions : Object.values(e.questions||{});
        const idx=DB.exams.findIndex(x=>parseInt(x.id)===parseInt(e.id));
        if(idx!==-1) DB.exams[idx]={...DB.exams[idx],...e};
        else DB.exams.push({...e,id:parseInt(e.id)||e.id});
      });
    }

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
    console.log('🔄 Données reçues depuis RTDB en temps réel');
  });
}

function stopRTDBListener(){
  if(rtdbListenerActive){
    adminDataRef.off();
    rtdbListenerActive=false;
  }
}

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

    // Sync résultats d'examens + certificats + profil utilisateur
    if(currentUser?.email){
      try{
        // Résultats d'examens
        const snapResults = await db.collection('examResults').doc(currentUser.email).collection('results').get();
        if(!snapResults.empty){
          if(!DB.examResults) DB.examResults = [];
          snapResults.forEach(doc=>{
            const r = doc.data();
            const idx = DB.examResults.findIndex(x=>String(x.examId)===String(r.examId)&&x.userId===r.userId);
            if(idx!==-1) DB.examResults[idx] = r;
            else DB.examResults.push(r);
          });
        }

        // Certificats
        const snapCerts = await db.collection('certificates').where('userId','==',currentUser.email).get();
        if(!snapCerts.empty){
          snapCerts.forEach(doc=>{
            const c = doc.data();
            const exists = DB.certificates.find(x=>x.subject===c.subject&&x.userId===c.userId);
            if(!exists) DB.certificates.push(c);
          });
        }

        // Profil utilisateur (passed, avgScore, certs, level)
        const userDoc = await db.collection('users').doc(currentUser.email).get();
        if(userDoc.exists){
          const d = userDoc.data();
          currentUser.passed = d.passed || currentUser.passed || 0;
          currentUser.avgScore = d.avgScore || currentUser.avgScore || 0;
          currentUser.certs = d.certs || currentUser.certs || 0;
          currentUser.level = d.level || currentUser.level || 1;
        }
      }catch(e){ console.warn('Sync user data error:', e); }
    }

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

  }catch(e){ console.warn('Auto-sync error:', e); }
}

let lastKnownUpdate = 0;

async function checkForUpdates(){
  if(!fbReady) return;
  try{
    const metaDoc = await db.collection('meta').doc('lastUpdate').get();
    if(metaDoc.exists){
      const serverTs = metaDoc.data().ts || 0;
      const updatedBy = metaDoc.data().by || '';
      if(serverTs > lastKnownUpdate && updatedBy !== currentUser?.email){
        lastKnownUpdate = serverTs;
        console.log('🔄 Changement détecté depuis Firebase, sync...');
        await syncFromFirebase();
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
  autoRefreshTimer=setInterval(checkForUpdates, 10000);
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
