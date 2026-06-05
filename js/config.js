// ═══ config.js ═══
/* ═══════════════ FIREBASE CONFIG ═══════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyAgTCRLa9XXxIxG574GH2YUPuDRPFJR00A",
  authDomain: "erse-academy.firebaseapp.com",
  projectId: "erse-academy",
  storageBucket: "erse-academy.firebasestorage.app",
  messagingSenderId: "568603995101",
  appId: "1:568603995101:web:17376a67e5310f0647e434",
  databaseURL: "https://erse-academy-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
let fbReady = false;

/* ═══════════════ FIREBASE HELPERS ═══════════════ */
async function fbSaveUser(user){
  try{
    await db.collection('users').doc(user.email).set({
      name:user.name, email:user.email,
      level:user.level, spec:user.spec||'', initials:user.initials,
      color:user.color, role:user.role||'student',
      passed:user.passed||0, avgScore:user.avgScore||0, certs:user.certs||0
    },{merge:true});
  }catch(e){console.warn('fbSaveUser error:',e);}
}

async function fbLoadUsers(){
  try{
    const snap = await db.collection('users').get();
    const users = [];
    snap.forEach(doc => users.push({id:doc.id, ...doc.data()}));
    return users;
  }catch(e){console.warn('fbLoadUsers error:',e);return [];}
}

async function fbSaveCert(cert){
  try{
    await db.collection('certificates').add({
      userId:cert.userId, studentName:cert.studentName,
      subject:cert.subject, score:cert.score, date:cert.date,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(e){console.warn('fbSaveCert error:',e);}
}

async function fbLoadCerts(userId){
  try{
    const snap = await db.collection('certificates').where('userId','==',userId).get();
    const certs = [];
    snap.forEach(doc => certs.push({id:doc.id, ...doc.data()}));
    return certs;
  }catch(e){console.warn('fbLoadCerts error:',e);return [];}
}

async function fbLoadAllStudents(){
  try{
    // Charger TOUS les utilisateurs sauf l'admin
    const snap = await db.collection('users').get();
    const students = [];
    snap.forEach(doc => {
      const d = doc.data();
      const email = doc.id;
      if(d.role === 'admin') return;
      students.push({
        id:doc.id, name:d.name||email.split('@')[0],
        initials:d.initials||'??',
        color:d.color||'#185FA5', level:d.level||1,
        passed:d.passed||0, avgScore:d.avgScore||0,
        certs:d.certs||0, email:email
      });
    });
    return students;
  }catch(e){console.warn('fbLoadAllStudents error:',e);return [];}
}

async function fbSaveSubject(subject){
  try{
    await db.collection('subjects').doc(String(subject.id)).set({
      name:subject.name, icon:subject.icon, level:subject.level,
      docs:subject.docs, active:subject.active, desc:subject.desc||'',
      files:subject.files||[]
    },{merge:true});
    // Notifier tous les appareils qu'une modification a eu lieu
    await db.collection('meta').doc('lastUpdate').set({
      ts:Date.now(), by:currentUser?.email||'admin', type:'subject'
    });
  }catch(e){console.warn('fbSaveSubject error:',e);}
}

async function fbSaveExam(exam){
  try{
    await db.collection('exams').doc(String(exam.id)).set({
      subjectId:exam.subjectId, difficulty:exam.difficulty,
      questions:exam.questions
    },{merge:true});
    await db.collection('meta').doc('lastUpdate').set({
      ts:Date.now(), by:currentUser?.email||'admin', type:'exam'
    });
  }catch(e){console.warn('fbSaveExam error:',e);}
}

async function fbDeleteExam(examId){
  try{
    await db.collection('exams').doc(String(examId)).delete();
  }catch(e){console.warn('fbDeleteExam error:',e);}
}

function hideLoadingScreen(){
  const el = document.getElementById('loading-screen');
  if(el){ el.classList.add('hide'); setTimeout(()=>{ if(el.parentNode) el.remove(); }, 400); }
  // Si personne n'est connecté, afficher l'écran de login
  if(!currentUser){
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('main-app').style.display='none';
  }
}

async function initFirebase(){
  try{
    showSyncStatus('Connexion à Firebase...', 'loading');

    // ── Charger étudiants ──
    const fbStudents = await fbLoadAllStudents();
    fbStudents.forEach(fs=>{
      const idx=DB.students.findIndex(s=>s.email===fs.email);
      if(idx!==-1) DB.students[idx]={...DB.students[idx],...fs};
      else DB.students.push(fs);
    });

    // ── Matières : chargement complet depuis Firestore ──
    const snapSubj = await db.collection('subjects').get();
    if(!snapSubj.empty){
      // Vider et recharger complètement depuis Firebase
      DB.subjects = [];
      snapSubj.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id)||doc.id;
        DB.subjects.push({...d, id, files:Array.isArray(d.files)?d.files:[]});
      });
    } else {
      for(const s of DB.subjects) await fbSaveSubject(s);
    }

    // Listener temps réel matières
    db.collection('subjects').onSnapshot(snap=>{
      DB.subjects = [];
      snap.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id)||doc.id;
        DB.subjects.push({...d, id, files:Array.isArray(d.files)?d.files:[]});
      });
      // Rafraîchir la page courante si on est sur courses ou home
      const activePage=document.querySelector('.page.on');
      if(activePage){
        if(activePage.id==='pg-courses') filterLevel(1,document.querySelector('#lvl-tabs .tab'));
        if(activePage.id==='pg-home') renderHome();
      }
    });

    // ── Examens : chargement complet depuis Firestore ──
    const snapExam = await db.collection('exams').get();
    if(!snapExam.empty){
      // Vider et recharger complètement depuis Firebase
      DB.exams = [];
      snapExam.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id)||doc.id;
        DB.exams.push({...d, id, questions:Array.isArray(d.questions)?d.questions:[]});
      });
    } else {
      // Firebase vide — uploader le contenu local
      for(const e of DB.exams) await fbSaveExam(e);
    }

    // Listener temps réel examens
    db.collection('exams').onSnapshot(snap=>{
      DB.exams = [];
      snap.forEach(doc=>{
        const d=doc.data();
        const id=parseInt(doc.id)||doc.id;
        DB.exams.push({...d, id, questions:Array.isArray(d.questions)?d.questions:[]});
      });
      // Rafraîchir examens si on est sur la page
      const activePage=document.querySelector('.page.on');
      if(activePage && activePage.id==='pg-exams') renderExamList();
    });

    // ── Étudiants : écoute temps réel ──
    db.collection('users').where('role','==','student').onSnapshot(snap=>{
      snap.docChanges().forEach(change=>{
        const d=change.doc.data();
        const idx=DB.students.findIndex(s=>s.email===d.email);
        if(change.type==='removed'){
          DB.students=DB.students.filter(s=>s.email!==d.email);
        } else {
          const student={id:change.doc.id,name:d.name,initials:d.initials||'??',color:d.color||'#185FA5',level:d.level||1,passed:d.passed||0,avgScore:d.avgScore||0,certs:d.certs||0,email:d.email};
          if(idx!==-1) DB.students[idx]={...DB.students[idx],...student};
          else DB.students.push(student);
        }
      });
    });


    // ── Écoute notifications admin en temps réel ──
    let lastNotifTs = 0;
    db.collection('meta').doc('platformNotif').onSnapshot(doc=>{
      if(!doc.exists) return;
      const data = doc.data();
      if(!data || !data.ts) return;
      if(data.by === currentUser?.email) return;
      if(data.ts <= lastNotifTs) return;
      lastNotifTs = data.ts;
      DB.notifications.unshift({id:DB.nextId++,title:data.title,sub:data.sub,ic:data.ic,bg:data.bg,unread:true,time:'Maintenant'});
      updateNotifDot();
      toast('📣 '+data.sub,'ok');
    });

    fbReady = true;
    startAutoRefresh();
    lastKnownUpdate = Date.now();
    showSyncStatus('✓ Synchronisé en temps réel', 'ok');
    setTimeout(()=>hideSyncStatus(), 3000);
    console.log('✅ Firebase temps réel actif');
  }catch(e){
    console.warn('Firebase init error:', e);
    showSyncStatus('Mode hors ligne (données locales)', 'warn');
    setTimeout(()=>hideSyncStatus(), 4000);
  }
}

function showSyncStatus(msg, type){
  let el = document.getElementById('sync-status');
  if(!el){
    el = document.createElement('div');
    el.id = 'sync-status';
    el.style.cssText = 'position:fixed;bottom:1.5rem;left:1.5rem;z-index:999;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:500;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(el);
  }
  const styles = {
    loading:{bg:'#1e40af',color:'#fff',txt:'⏳ '+msg},
    ok:{bg:'#15803d',color:'#fff',txt:'✅ '+msg},
    warn:{bg:'#b45309',color:'#fff',txt:'⚠️ '+msg},
    err:{bg:'#dc2626',color:'#fff',txt:'❌ '+msg}
  };
  const s = styles[type]||styles.ok;
  el.style.background = s.bg;
  el.style.color = s.color;
  el.textContent = s.txt;
  el.style.opacity = '1';
}
function hideSyncStatus(){
  const el=document.getElementById('sync-status');
  if(el){el.style.opacity='0';setTimeout(()=>el.remove(),300);}
}

