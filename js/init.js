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
    if(data.notifications)DB.notifications=data.notifications.filter(n=>n&&n.ts); // anciennes notifications sans horodatage : écartées
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
function platformDialog({title,message,fields=[],confirmText="Valider",danger=false}={}){return new Promise(resolve=>{const ov=document.createElement('div');ov.className='platform-dialog-backdrop';const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));ov.innerHTML=`<section class="platform-dialog" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(message)}</p>${fields.map(f=>`<label>${esc(f.label)}<textarea data-id="${esc(f.id)}" rows="3" maxlength="${f.max||300}">${esc(f.value||'')}</textarea></label>`).join('')}<div class="platform-dialog-actions"><button data-cancel>Annuler</button><button data-ok class="${danger?'danger':''}">${esc(confirmText)}</button></div></section>`;document.body.appendChild(ov);const close=v=>{ov.remove();resolve(v)};ov.querySelector('[data-cancel]').onclick=()=>close(null);ov.querySelector('[data-ok]').onclick=()=>close(Object.fromEntries(fields.map(f=>[f.id,ov.querySelector(`[data-id="${f.id}"]`).value])));ov.addEventListener('click',e=>{if(e.target===ov)close(null)});ov.addEventListener('keydown',e=>{if(e.key==='Escape')close(null)});});}
async function platformConfirm(message,opts={}){return !!(await platformDialog({title:opts.title||'Confirmer',message,confirmText:opts.confirmText||'Confirmer',danger:opts.danger}));}
async function platformPrompt(title,message,label,value=''){const r=await platformDialog({title,message,fields:[{id:'value',label,value,max:500}],confirmText:'Enregistrer'});return r?.value?.trim()||null;}
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
try{
  darkMode=localStorage.getItem('erse_theme')==='dark';
  document.documentElement.setAttribute('data-theme',darkMode?'dark':'light');
}catch(e){darkMode=false;}
const themeButton=document.getElementById('dm-btn');
if(themeButton) themeButton.textContent=darkMode?'☀️ Clair':'🌙 Sombre';
updateNotifDot();

let authResolved = false;
const loadingFallback = setTimeout(() => {
  if (!authResolved) {
    console.warn('Firebase Auth timeout — affichage forcé du login');
    hideLoadingScreen();
  }
}, 8000);

function handleGoogleRedirectError(e){
  const code=e&&e.code;
  try{ sessionStorage.removeItem('erse-google-redirect-pending'); }catch(storageError){}
  if(code==='auth/unauthorized-domain') toast('Ce domaine doit être autorisé dans Firebase pour Google.','err');
  else if(code==='auth/network-request-failed') toast('Connexion Google interrompue : vérifiez votre réseau.','err');
  else if(code==='auth/account-exists-with-different-credential'){
    const email=e.email||(e.customData&&e.customData.email)||'';
    const credential=firebase.auth.GoogleAuthProvider.credentialFromError(e);
    if(email&&credential) linkGoogleToExistingAccount(email,credential);
    else toast('Cette adresse possède déjà un compte. Connectez-vous avec votre mot de passe ERSE, puis réessayez avec Google.','err');
  }
  else if(code && code!=='auth/popup-closed-by-user') toast('La connexion Google n’a pas abouti ('+code+'). Réessayez dans Chrome ou Safari.','err');
}

async function handleFirebaseAuthState(firebaseUser){
  authResolved = true;
  clearTimeout(loadingFallback);
  hideLoadingScreen();
  if(firebaseUser){
    const email = firebaseUser.email
      || (firebaseUser.providerData && firebaseUser.providerData[0] && firebaseUser.providerData[0].email)
      || '';
    if(!email){
      console.warn('Email vide — attente redirect Google...');
      // Attendre que le redirect soit traité
      setTimeout(() => { if(!authResolved) hideLoadingScreen(); }, 3000);
      return;
    }
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
    await loginUser(user);
  } else {
    if(currentUser){
      currentUser=null;
      if(typeof planningLoaded !== 'undefined') planningLoaded = false;
      document.getElementById('auth-screen').style.display='flex';
      document.getElementById('main-app').style.display='none';
    }
  }
}

let authWorkUid='',authWorkPromise=null;
function processFirebaseAuthState(firebaseUser){
  if(firebaseUser&&currentUser&&currentUser.email===firebaseUser.email) return Promise.resolve();
  const key=firebaseUser?.uid||'signed-out';
  if(authWorkPromise&&authWorkUid===key) return authWorkPromise;
  authWorkUid=key;
  authWorkPromise=handleFirebaseAuthState(firebaseUser).finally(()=>{authWorkPromise=null;});
  return authWorkPromise;
}

auth.onAuthStateChanged(processFirebaseAuthState);
// Traiter explicitement le compte rendu Google : selon le navigateur, le résultat
// de redirection et l'événement d'état Firebase peuvent arriver dans un ordre différent.
let googleRedirectWasPending=false;
try{
  googleRedirectWasPending=sessionStorage.getItem('erse-google-redirect-pending')==='1';
}catch(e){}
auth.getRedirectResult().then(result=>{
  try{ sessionStorage.removeItem('erse-google-redirect-pending'); }catch(e){}
  if(result&&result.user) return processFirebaseAuthState(result.user);
  if(googleRedirectWasPending&&!auth.currentUser){
    toast('Google n’a pas confirmé la connexion. Vérifiez que les cookies du navigateur sont autorisés, puis réessayez.','err');
  }
}).catch(handleGoogleRedirectError);

function installPWA(){ toast('Pour installer : utilisez le menu de votre navigateur → Ajouter à l\'écran d\'accueil','ok'); }
function showInstallButton(){}
