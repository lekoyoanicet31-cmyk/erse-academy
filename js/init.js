// ═══ init.js ═══
/* ═══════════════ PERSISTANCE LOCALE ═══════════════ */
function saveData(){
  try{
    const toSave={
      users:DB.users.map(u=>{const {pwd,...rest}=u;return rest;}),
      students:DB.students,
      certificates:DB.certificates,
      exams:DB.exams.filter(e=>e.id>=200),
      subjects:DB.subjects,
      notifications:DB.notifications.slice(0,20),
      nextId:DB.nextId,
      examResults:DB.examResults||[]
    };
    localStorage.setItem('erse_db',JSON.stringify(toSave));
  }catch(e){console.warn('Sauvegarde impossible:',e);}
}

function loadData(){
  try{
    const saved=localStorage.getItem('erse_db');
    if(!saved)return;
    const data=JSON.parse(saved);
    if(data.users&&data.users.length)DB.users=data.users;
    if(data.students&&data.students.length)DB.students=data.students;
    if(data.certificates)DB.certificates=data.certificates;
    if(data.subjects&&data.subjects.length)DB.subjects=data.subjects;
    if(data.notifications)DB.notifications=data.notifications;
    if(data.nextId)DB.nextId=data.nextId;
    if(data.examResults&&data.examResults.length)DB.examResults=data.examResults;
    if(data.exams&&data.exams.length){
      data.exams.forEach(e=>{if(!DB.exams.find(x=>x.id===e.id))DB.exams.push(e);});
    }
    console.log('✅ Données restaurées depuis le stockage local');
  }catch(e){console.warn('Chargement données impossible:',e);}
}

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.remove('open');});
document.addEventListener('click',e=>{
  const panel=document.getElementById('notif-panel');
  const btn=document.getElementById('notif-btn');
  if(panel.classList.contains('open')&&!panel.contains(e.target)&&!btn.contains(e.target))panel.classList.remove('open');
});
let toastTimer;
function toast(msg,type){
  clearTimeout(toastTimer);
  const el=document.getElementById('toast');
  el.textContent=msg;el.className='toast '+type+' show';
  toastTimer=setTimeout(()=>el.className='toast',3200);
}
function openModalStudent(){
  document.getElementById('stu-name').value='';document.getElementById('stu-email').value='';document.getElementById('stu-level').value='1';
  openModal('modal-student');
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
loadData();
updateNotifDot();

let authResolved = false;
const loadingFallback = setTimeout(() => {
  if (!authResolved) {
    console.warn('Firebase Auth timeout — affichage forcé du login');
    hideLoadingScreen();
  }
}, 8000);

auth.onAuthStateChanged(async (firebaseUser) => {
  authResolved = true;
  clearTimeout(loadingFallback);
  hideLoadingScreen();
  if(firebaseUser){
    const email = firebaseUser.email;
    let user = DB.users.find(u=>u.email===email);
    if(!user){
      try{
        const doc = await db.collection('users').doc(email).get();
        if(doc.exists){
          const d = doc.data();
          user = {
            id:DB.nextId++, name:d.name||firebaseUser.displayName||email.split('@')[0],
            email, level:d.level||1, spec:d.spec||'',
            initials:d.initials||email[0].toUpperCase(),
            color:d.color||DB.COLORS[0], role:d.role||'student',
            passed:d.passed||0, avgScore:d.avgScore||0, certs:d.certs||0, activity:[]
          };
          DB.users.push(user);
          if(user.role!=='admin') DB.students.push({...user});
        } else {
          const name = firebaseUser.displayName || email.split('@')[0];
          const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
          const color = DB.COLORS[DB.users.length%DB.COLORS.length];
          user = {
            id:DB.nextId++, name, email, level:1, spec:'', initials, color,
            role: 'student',
            passed:0, avgScore:0, certs:0, activity:[]
          };
          DB.users.push(user);
          if(user.role==='student') DB.students.push({...user});
          await db.collection('users').doc(email).set({
            name, email, level:1, initials, color, role:user.role,
            passed:0, avgScore:0, certs:0
          });
        }
      }catch(e){
        console.warn('Erreur chargement profil:', e);
        const name = firebaseUser.displayName || email.split('@')[0];
        user = {
          id:DB.nextId++, name, email, level:1, spec:'',
          initials:name[0].toUpperCase(), color:DB.COLORS[0],
          role: 'student',
          passed:0, avgScore:0, certs:0, activity:[]
        };
        DB.users.push(user);
      }
    } else {
      // Utilisateur trouvé en local — recharger quand même depuis Firestore
      try{
        const doc = await db.collection('users').doc(email).get();
        if(doc.exists){
          const d = doc.data();
          user.passed = d.passed||user.passed||0;
          user.avgScore = d.avgScore||user.avgScore||0;
          user.certs = d.certs||user.certs||0;
          user.level = d.level||user.level||1;
          user.role = d.role||user.role||'student';
        }
        // Recharger examResults depuis Firestore
        const resultsSnap = await db.collection('examResults').doc(email).collection('results').get();
        if(!resultsSnap.empty){
          if(!DB.examResults) DB.examResults = [];
          resultsSnap.forEach(doc=>{
            const r = doc.data();
            const existing = DB.examResults.findIndex(x=>String(x.examId)===String(r.examId)&&x.userId===r.userId);
            if(existing!==-1) DB.examResults[existing] = r;
            else DB.examResults.push(r);
          });
        }
      }catch(e){ console.warn('Erreur rechargement Firestore:', e); }
    }
    saveData();
    loginUser(user);
  } else {
    if(currentUser){
      currentUser=null;
      document.getElementById('auth-screen').style.display='flex';
      document.getElementById('main-app').style.display='none';
    }
  }
});

function installPWA(){ toast('Pour installer : utilisez le menu de votre navigateur → Ajouter à l\'écran d\'accueil','ok'); }
function showInstallButton(){}
