// ═══ auth.js ═══
/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
function switchAuthTab(tab,btn){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('login-form').style.display=tab==='login'?'':'none';
  document.getElementById('register-form').style.display=tab==='register'?'':'none';
}

let loginAttempts=0;let loginBlocked=false;let loginBlockTimer=null;

async function doLogin(){
  if(loginBlocked){toast('Trop de tentatives. Attendez 30 secondes.','err');return;}
  const email=document.getElementById('login-email').value.trim();
  const pwd=document.getElementById('login-pwd').value.trim();
  if(!email||!pwd){toast('Veuillez remplir tous les champs','err');return;}
  const btn=document.getElementById('login-btn');
  if(btn){btn.disabled=true;btn.textContent='Connexion...';}
  try{
    await auth.signInWithEmailAndPassword(email, pwd);
    loginAttempts=0;
    // onAuthStateChanged va s'occuper du reste
  }catch(e){
    loginAttempts++;
    const rest=5-loginAttempts;
    if(loginAttempts>=5){
      loginBlocked=true;
      if(btn){btn.textContent='Bloqué 30s...';}
      loginBlockTimer=setTimeout(()=>{
        loginBlocked=false;loginAttempts=0;
        if(btn){btn.disabled=false;btn.textContent='Se connecter';}
      },30000);
      toast('Compte bloqué 30 secondes','err');
    } else {
      if(btn){btn.disabled=false;btn.textContent='Se connecter';}
      toast('Email ou mot de passe incorrect ('+rest+' essai(s) restant(s))','err');
    }
  }
}

async function doLoginGoogle(){
  try{
    await auth.signInWithPopup(googleProvider);
    // onAuthStateChanged va s'occuper du reste
  }catch(e){
    toast('Connexion Google annulée','err');
  }
}


// ── EmailJS ──
const EJS = {
  serviceId: 'service_y5ua3k2',
  tplWelcome: 'template_wvy5yrv',
  tplNotif:   'template_na4ncag',
  pubKey:     'ctEzadHY3pbYSkI9K'
};
(function(){ emailjs.init({publicKey: EJS.pubKey}); })();

function ejsSend(templateId, params){
  return emailjs.send(EJS.serviceId, templateId, params)
    .catch(e=>console.warn('EmailJS error:', e));
}

function sendWelcomeEmail(name, email){
  ejsSend(EJS.tplWelcome, {to_name: name, to_email: email});
}

function sendLevelUpEmail(name, email, newLevel){
  ejsSend(EJS.tplNotif, {
    to_name: name,
    to_email: email,
    subject: 'Félicitations ! Vous passez en Licence ' + newLevel,
    message: 'Vous venez de valider votre niveau et passez en Licence ' + newLevel + ' sur ERSE ACADEMY.\n\nContinuez sur cette lancée !'
  });
}

function sendCertEmail(name, email, subject, score){
  ejsSend(EJS.tplNotif, {
    to_name: name,
    to_email: email,
    subject: 'Certificat obtenu — ' + subject + ' 🎓',
    message: 'Félicitations ! Vous avez obtenu votre certificat en ' + subject + ' avec un score de ' + score + '%.'
  });
}

async function doRegister(){
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const pwd=document.getElementById('reg-pwd').value.trim();
  const level=+document.getElementById('reg-level').value;
  if(!name||!email||!pwd){toast('Tous les champs sont requis','err');return;}
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email)){toast('Adresse email invalide','err');return;}
  if(pwd.length<8){toast('Mot de passe trop court (minimum 8 caractères)','err');return;}
  if(!/[A-Z]/.test(pwd)){toast('Le mot de passe doit contenir au moins une majuscule','err');return;}
  if(!/[0-9]/.test(pwd)){toast('Le mot de passe doit contenir au moins un chiffre','err');return;}
  const btn=document.querySelector('#register-form .btn-auth');
  if(btn){btn.disabled=true;btn.textContent='Création...';}
  try{
    const cred = await auth.createUserWithEmailAndPassword(email, pwd);
    // Sauvegarder les infos supplémentaires dans Firestore
    const initials=name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
    const color=DB.COLORS[DB.users.length%DB.COLORS.length];
    const newUser={id:DB.nextId++,name,email,level,spec:'',initials,color,role:'student',passed:0,avgScore:0,certs:0,activity:[]};
    DB.users.push(newUser);
    DB.students.push({id:newUser.id,name,initials,color,level,passed:0,avgScore:0,certs:0,email});
    await db.collection('users').doc(email).set({name,email,level,initials,color,role:'student',passed:0,avgScore:0,certs:0});
    saveData();
    toast('Compte créé ! Bienvenue '+name+' 🎉','ok');
    sendWelcomeEmail(name, email);
    // onAuthStateChanged va connecter automatiquement
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='Créer mon compte';}
    if(e.code==='auth/email-already-in-use') toast('Email déjà utilisé','err');
    else if(e.code==='auth/weak-password') toast('Mot de passe trop faible','err');
    else toast('Erreur : '+e.message,'err');
  }
}


let sessionTimer=null;
function resetSessionTimer(){
  if(sessionTimer)clearTimeout(sessionTimer);
  sessionTimer=setTimeout(()=>{
    if(currentUser){
      toast('Session expirée. Veuillez vous reconnecter.','info');
      setTimeout(doLogout,2000);
    }
  },7200000);
}
document.addEventListener('click',()=>{if(currentUser)resetSessionTimer();});
document.addEventListener('keypress',()=>{if(currentUser)resetSessionTimer();});

async function loginUser(user){
  // Vérifier si l'email est banni
  if((DB.bannedEmails||[]).includes(user.email)){
    auth.signOut();
    toast('Votre compte a été suspendu. Contactez l\'administrateur.','err');
    return;
  }
  currentUser=user;
  resetSessionTimer();
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('main-app').style.cssText='display:block;min-height:100vh;';
  // Restaurer la dernière page visitée
  const lastPage = localStorage.getItem('erse_current_page') || 'home';
  setTimeout(()=>goPage(lastPage), 300);
  // Mettre à jour les chips EnergyBot avec les vraies matières
  setTimeout(renderEbChips, 500);
  const avatar=document.getElementById('user-avatar-nav');
  avatar.textContent=user.initials;
  avatar.style.background=user.color;
  document.querySelectorAll('.admin-nav-btn').forEach(b=>b.style.setProperty('display', user.role==='admin' ? 'inline-block' : 'none', 'important'));
  // Bouton admin dans le menu mobile "Plus"
  const bnAdmin = document.getElementById('bn-admin-btn');
  if(bnAdmin) bnAdmin.style.display = user.role==='admin' ? 'block' : 'none';
  pushNotif('Connexion réussie','Bienvenue '+user.name+' !','👋','#b0d4f4');
  setTimeout(checkRevisionReminders, 5000);
  // Lancer Firebase sync maintenant que l'utilisateur est authentifié
  if(!fbReady) initFirebase();
  // Charger certificats depuis Firebase
  if(fbReady){
    try{
      const fbCerts = await fbLoadCerts(user.email);
      if(fbCerts.length > 0){
        fbCerts.forEach(c=>{
          if(!DB.certificates.find(x=>x.subject===c.subject&&x.userId===user.email)){
            DB.certificates.push({...c, userId:user.email});
          }
        });
      }
      // Charger score depuis Firebase
      const userDoc = await db.collection('users').doc(user.email).get();
      if(userDoc.exists){
        const d = userDoc.data();
        currentUser.passed = d.passed||0;
        currentUser.avgScore = d.avgScore||0;
        currentUser.certs = d.certs||0;
      }
      // Charger la liste des emails bannis
      try{
        const banDoc = await db.collection('bannedEmails').doc('list').get();
        if(banDoc.exists) DB.bannedEmails = banDoc.data().emails||[];
      }catch(e){}
      // Charger les résultats d'examens depuis Firestore
      const resultsSnap = await db.collection('examResults').doc(user.email).collection('results').get();
      if(!resultsSnap.empty){
        if(!DB.examResults) DB.examResults = [];
        resultsSnap.forEach(doc=>{
          const r = doc.data();
          const existing = DB.examResults.findIndex(x=>x.examId===r.examId&&x.userId===r.userId);
          if(existing!==-1) DB.examResults[existing] = r;
          else DB.examResults.push(r);
        });
        saveData();
      }
      // Charger le planning depuis Firestore
      try{
        const planSnap = await firebase.firestore().collection('plannings').doc(user.email).get();
        if(planSnap.exists){
          const saved = planSnap.data();
          if(saved && saved.plan && saved.plan.length){
            setTimeout(()=>{ if(typeof renderPlanningResult==='function') renderPlanningResult(saved.plan, saved.meta); }, 800);
          }
        }
      }catch(e){ console.warn('Erreur chargement planning:', e); }
    }catch(e){console.warn('Erreur chargement Firebase:',e);}
  }
  renderHome();
  goPage('home');
  startJsonBinSync();
  startRTDBListener();
}

async function doLogout(){
  stopAutoRefresh();
  stopRTDBListener();
  try{ await auth.signOut(); }catch(e){console.warn(e);}
  currentUser=null;
  document.querySelectorAll('.admin-nav-btn').forEach(b=>b.style.setProperty('display','none','important'));
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-email').value='';
  document.getElementById('login-pwd').value='';
}

async function saveProfile(){
  if(!currentUser)return;
  currentUser.name=document.getElementById('ep-name').value.trim()||currentUser.name;
  if(currentUser.role==='admin') currentUser.level=+document.getElementById('ep-level').value;
  currentUser.spec=document.getElementById('ep-spec').value.trim();
  currentUser.initials=currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
  document.getElementById('user-avatar-nav').textContent=currentUser.initials;
  saveData();
  // Sauvegarder dans Firestore
  if(fbReady && currentUser.email){
    try{
      await db.collection('users').doc(currentUser.email).set({
        name: currentUser.name,
        level: currentUser.level,
        spec: currentUser.spec,
        initials: currentUser.initials
      },{merge:true});
      toast('Profil mis à jour et synchronisé !','ok');
    }catch(e){
      console.warn(e);
      toast('Profil mis à jour localement','ok');
    }
  } else {
    toast('Profil mis à jour !','ok');
  }
  closeModal('modal-edit-profile');
  renderProfile();
}

function openEditProfile(){
  document.getElementById('ep-name').value=currentUser.name;
  document.getElementById('ep-level').value=currentUser.level;
  document.getElementById('ep-spec').value=currentUser.spec||'';
  const lvlRow=document.getElementById('ep-level-row');
  if(lvlRow) lvlRow.style.display=(currentUser.role==='admin')?'flex':'none';
  openModal('modal-edit-profile');
}

