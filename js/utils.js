// ═══ utils.js ═══
/* ═══════════════ RECHERCHE GLOBALE ═══════════════ */
function openSearch(){
  openModal('modal-search');
  setTimeout(()=>{
    const inp=document.getElementById('global-search-input');
    if(inp){inp.value='';inp.focus();doGlobalSearch('');}
  },100);
}

function doGlobalSearch(q){
  const el=document.getElementById('search-results');
  if(!q.trim()){
    el.innerHTML='<div style="font-size:12px;color:var(--muted);text-align:center;padding:1rem;">Tapez pour rechercher...</div>';
    return;
  }
  const ql=q.toLowerCase();
  const results=[];

  // Matières
  DB.subjects.filter(s=>s.active&&(s.name.toLowerCase().includes(ql)||s.desc?.toLowerCase().includes(ql))).forEach(s=>{
    results.push({type:'subject',icon:s.icon,title:s.name,sub:`Licence ${s.level} · ${s.docs} documents`,action:`goPage('courses');closeModal('modal-search')`});
  });

  // Examens
  DB.exams.filter(e=>{
    const s=DB.subjects.find(x=>x.id===e.subjectId);
    return s&&s.name.toLowerCase().includes(ql);
  }).forEach(e=>{
    const s=DB.subjects.find(x=>x.id===e.subjectId);
    results.push({type:'exam',icon:'📝',title:`Examen — ${s?.name}`,sub:`${e.difficulty} · ${e.questions.length} questions`,action:`startQuiz(${e.id});closeModal('modal-search')`});
  });

  // Certificats
  const userKey=currentUser?.email||String(currentUser?.id);
  DB.certificates.filter(c=>(c.userId===userKey||c.studentName===currentUser?.name)&&c.subject.toLowerCase().includes(ql)).forEach(c=>{
    results.push({type:'cert',icon:'🎓',title:`Certificat — ${c.subject}`,sub:`Obtenu le ${c.date} · ${c.score}%`,action:`goPage('certs');closeModal('modal-search')`});
  });

  if(!results.length){
    el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:13px;">Aucun résultat pour "'+q+'"</div>';
    return;
  }

  el.innerHTML=results.map(r=>`
    <div onclick="${r.action}" style="display:flex;align-items:center;gap:10px;padding:.8rem;border-radius:10px;cursor:pointer;transition:background .15s;margin-bottom:4px;" onmouseover="this.style.background='var(--b0)'" onmouseout="this.style.background='none'">
      <div style="width:36px;height:36px;border-radius:9px;background:var(--b0);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${r.icon}</div>
      <div><div style="font-size:13px;font-weight:500;">${r.title}</div><div style="font-size:11px;color:var(--muted);">${r.sub}</div></div>
      <span style="margin-left:auto;font-size:11px;color:var(--b6);">→</span>
    </div>`).join('');
}

document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openSearch();}
  if(e.key==='Escape'){closeModal('modal-search');}
});

/* ═══════════════ MODIFICATION EXAMENS ═══════════════ */
let editExamId = null;
let editQCount = 0;

function openEditExam(id){
  editExamId = parseInt(id)||id;
  editQCount = 0;
  const ex = DB.exams.find(e=>parseInt(e.id)===parseInt(id)||e.id===id);
  if(!ex) return;
  document.getElementById('ee-subj').innerHTML = DB.subjects.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===ex.subjectId?'selected':''}>${s.icon} ${s.name} (L${s.level})</option>`).join('');
  document.getElementById('ee-diff').value = ex.difficulty;
  const qList = document.getElementById('ee-q-list');
  qList.innerHTML = '';
  ex.questions.forEach((q,i)=>{
    editQCount++;
    addEditQuestionBlock(q, editQCount);
  });
  openModal('modal-edit-exam');
}

function addEditQuestion(){
  editQCount++;
  addEditQuestionBlock(null, editQCount);
}

function addEditQuestionBlock(q, num){
  const id = `eq${num}`;
  const div = document.createElement('div');
  div.className = 'q-editor';
  div.id = `eqe-${id}`;
  div.innerHTML = `
    <div class="q-editor-hdr">
      <span>Question ${num}</span>
      <button onclick="document.getElementById('eqe-${id}').remove()" style="font-size:11px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:none;color:var(--muted);cursor:pointer;">✕</button>
    </div>
    <div class="form-row" style="margin-bottom:.5rem;">
      <input name="eqtxt" placeholder="Énoncé de la question..." value="${q?q.q.replace(/"/g,'&quot;'):''}">
    </div>
    ${['A','B','C','D'].map((l,i)=>`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
        <input type="radio" name="eans-${id}" value="${i}" ${q&&q.ans===i?'checked':i===0&&!q?'checked':''}>
        <span style="font-size:11px;font-weight:600;color:var(--b8);width:14px;">${l}</span>
        <input name="eopt" placeholder="Option ${l}..." value="${q&&q.opts[i]?q.opts[i].replace(/"/g,'&quot;'):''}" style="font-size:12px;flex:1;padding:5px 9px;border:1px solid var(--border);border-radius:7px;font-family:var(--font-body);background:var(--input-bg);color:var(--text);">
      </div>`).join('')}
  `;
  document.getElementById('ee-q-list').appendChild(div);
}

function saveEditExam(){
  if(!editExamId) return;
  const ex = DB.exams.find(e=>parseInt(e.id)===parseInt(editExamId)||e.id===editExamId);
  if(!ex) return;
  ex.subjectId = +document.getElementById('ee-subj').value;
  ex.difficulty = document.getElementById('ee-diff').value;
  const questions = [];
  document.querySelectorAll('#ee-q-list .q-editor').forEach(qe=>{
    const qtxt = qe.querySelector('[name="eqtxt"]').value.trim();
    if(!qtxt) return;
    const opts = [...qe.querySelectorAll('[name="eopt"]')].map(i=>i.value.trim()||'Option');
    const ansEl = qe.querySelector('[name^="eans"]:checked');
    questions.push({q:qtxt, opts, ans:ansEl?+ansEl.value:0});
  });
  if(!questions.length){toast('Ajoutez au moins une question','err');return;}
  ex.questions = questions;
  saveData();
  if(fbReady){ fbSaveExam(ex).catch(e=>console.warn(e)); }
  pushToRTDB();
  closeModal('modal-edit-exam');
  toast('Examen modifié avec succès !','ok');
  renderAdminExams();
}

/* ═══════════════ LÉGAL ═══════════════ */
const LEGAL = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    content: `<p><strong>Dernière mise à jour :</strong> ` + new Date().toLocaleDateString('fr-FR') + `</p>
    <br>
    <p><strong>1. Objet</strong><br>ERSE ACADEMY est une plateforme académique destinée aux étudiants en Licence 1, 2 et 3 dans le domaine des Énergies Renouvelables et Systèmes Énergétiques (ERSE), principalement au Bénin et dans la sous-région ouest-africaine. Elle propose des cours, des examens interactifs, des certificats de réussite et un assistant pédagogique IA.</p>
    <br>
    <p><strong>2. Accès à la plateforme</strong><br>L'inscription est ouverte à tout étudiant disposant d'une adresse email valide. Chaque utilisateur est seul responsable de la confidentialité de ses identifiants. Tout partage de compte est interdit.</p>
    <br>
    <p><strong>3. Contenu pédagogique</strong><br>Les documents, examens, corrections et certificats fournis sont à usage exclusivement pédagogique et personnel. Toute reproduction, diffusion ou revente sans autorisation écrite de l'administrateur est strictement interdite.</p>
    <br>
    <p><strong>4. Utilisation acceptable</strong><br>Les utilisateurs s'engagent à :<br>— Ne pas partager leurs identifiants de connexion<br>— Ne pas tenter de manipuler leurs scores ou niveaux<br>— Ne pas publier de contenu offensant ou inapproprié sur le forum<br>— Utiliser la plateforme de bonne foi et dans un cadre strictement académique</p>
    <br>
    <p><strong>5. Boutique et paiements</strong><br>L'accès à certaines épreuves corrigées est payant. Les paiements sont traités de manière sécurisée. Aucun remboursement n'est accordé après accès au contenu.</p>
    <br>
    <p><strong>6. Certificats</strong><br>Les certificats délivrés par ERSE ACADEMY attestent de la réussite aux examens internes de la plateforme avec un score minimum de 70%. Ils sont à valeur pédagogique et ne remplacent pas les diplômes officiels de l'université.</p>
    <br>
    <p><strong>7. Suspension de compte</strong><br>Tout abus, fraude, tentative de triche ou comportement contraire aux présentes conditions peut entraîner la suspension ou le bannissement définitif du compte sans préavis ni remboursement.</p>
    <br>
    <p><strong>8. Modification des CGU</strong><br>ERSE ACADEMY se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs en seront informés par notification dans l'application.</p>
    <br>
    <p><strong>9. Contact</strong><br>Pour toute question relative aux CGU : <a href="mailto:lekoyoanicet31@gmail.com" style="color:var(--b6);">lekoyoanicet31@gmail.com</a></p>`
  },
  contact: {
    title: "Nous contacter",
    content: `<p><strong>ERSE ACADEMY</strong><br>Plateforme académique en Énergies Renouvelables et Systèmes Énergétiques<br>Bénin, Afrique de l'Ouest</p>
    <br>
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">📧 Email</div>
        <a href="mailto:lekoyoanicet31@gmail.com" style="color:var(--b6);font-size:13px;">lekoyoanicet31@gmail.com</a>
      </div>
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">💬 WhatsApp</div>
        <a href="https://wa.me/0192875886" target="_blank" style="color:#25D366;font-size:13px;">+229 01 92 87 58 86</a>
      </div>
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">🕐 Disponibilité</div>
        <div style="font-size:13px;color:var(--text);">Lundi — Vendredi · 8h00 à 20h00<br>Samedi · 9h00 à 15h00</div>
      </div>
    </div>
    <br>
    <p><strong>Étudiants</strong><br>Pour tout problème de connexion, d'examen ou de certificat, écrivez-nous en précisant votre nom complet, votre email et votre niveau (L1, L2 ou L3). Délai de réponse : 24 à 48h.</p>
    <br>
    <p><strong>Partenariats & enseignants</strong><br>Pour proposer des ressources pédagogiques, signaler un contenu ou discuter d'un partenariat, contactez-nous par email.</p>`
  },
  about: {
    title: "À propos d'ERSE ACADEMY",
    content: `<p><strong>ERSE ACADEMY</strong> est une plateforme académique numérique créée pour les étudiants béninois en Licence de Sciences Physiques, spécialité Énergies Renouvelables et Systèmes Énergétiques (ERSE).</p>
    <br>
    <p><strong>Notre mission</strong><br>Démocratiser l'accès aux ressources pédagogiques de qualité pour les étudiants d'Afrique de l'Ouest — gratuitement, en ligne, à tout moment. Nous croyons que chaque étudiant mérite des outils modernes pour réussir ses examens et progresser dans son parcours.</p>
    <br>
    <p><strong>Ce que nous offrons</strong></p>
    <ul style="padding-left:1.2rem;margin-top:.5rem;line-height:2.2;color:var(--text);">
      <li>📚 Cours et documents téléchargeables par niveau (L1 / L2 / L3)</li>
      <li>📝 Examens QCM interactifs avec correction détaillée et explications</li>
      <li>🎓 Certificats officiels de réussite téléchargeables</li>
      <li>🔁 Mode révision intelligent — rejouer les questions ratées</li>
      <li>📅 Planning de révision personnalisé selon la date d'examen</li>
      <li>🏆 Leaderboard et suivi de progression</li>
      <li>⚡ EnergyBot — assistant pédagogique IA spécialisé ERSE</li>
      <li>💬 Forum étudiant pour poser vos questions</li>
    </ul>
    <br>
    <p><strong>Qui sommes-nous ?</strong><br>ERSE ACADEMY est fondée et gérée par un étudiant en Licence 2 ERSE au Bénin, avec la conviction que la technologie peut transformer l'éducation en Afrique. Le projet est en constante évolution grâce aux retours de la communauté étudiante.</p>
    <br>
    <p><strong>Technologies utilisées</strong><br>Firebase (Auth & Firestore) · Claude AI (EnergyBot) · EmailJS · GitHub Pages</p>
    <br>
    <p style="color:var(--muted);font-size:12px;">Version 2.0 · © 2026 ERSE ACADEMY · Tous droits réservés</p>`
  },
  privacy: {
    title: "Politique de Confidentialité",
    content: `<p><strong>Dernière mise à jour :</strong> ` + new Date().toLocaleDateString('fr-FR') + `</p>
    <br>
    <p>ERSE ACADEMY s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique quelles données nous collectons, comment nous les utilisons et vos droits.</p>
    <br>
    <p><strong>1. Données collectées</strong><br>Nous collectons uniquement :<br>— Nom complet<br>— Adresse email<br>— Niveau d'études (L1, L2, L3)<br>— Résultats aux examens et progression<br>— Date et heure de connexion</p>
    <br>
    <p><strong>2. Utilisation des données</strong><br>Vos données servent exclusivement à :<br>— Gérer votre compte et votre authentification<br>— Suivre votre progression académique<br>— Délivrer vos certificats de réussite<br>— Vous envoyer des notifications pédagogiques (rappels de révision, passage de niveau)</p>
    <br>
    <p><strong>3. Conservation</strong><br>Vos données sont conservées pendant toute la durée de votre utilisation de la plateforme. Elles sont supprimées définitivement sur simple demande adressée à notre email de contact.</p>
    <br>
    <p><strong>4. Partage des données</strong><br>Vos données personnelles ne sont jamais vendues, louées ni partagées avec des tiers à des fins commerciales. Elles sont hébergées sur Firebase (Google Cloud) avec chiffrement en transit et au repos.</p>
    <br>
    <p><strong>5. Sécurité</strong><br>Nous utilisons Firebase Authentication pour sécuriser les connexions, des règles Firestore pour protéger l'accès aux données, et HTTPS pour chiffrer toutes les communications.</p>
    <br>
    <p><strong>6. Vos droits</strong><br>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données à tout moment. Pour exercer ces droits, contactez-nous à : <a href="mailto:lekoyoanicet31@gmail.com" style="color:var(--b6);">lekoyoanicet31@gmail.com</a></p>
    <br>
    <p><strong>7. Cookies</strong><br>ERSE ACADEMY n'utilise pas de cookies de traçage ou publicitaires. Seules des données techniques minimales sont stockées localement dans votre navigateur (préférences d'affichage, dernière page visitée) pour améliorer votre expérience.</p>`
  }
};

function showLegal(type){
  const data=LEGAL[type];
  if(!data)return;
  document.getElementById('legal-title').textContent=data.title;
  document.getElementById('legal-content').innerHTML=data.content;
  const modal=document.getElementById('legal-modal');
  modal.style.display='flex';
}
document.addEventListener('click',e=>{
  const modal=document.getElementById('legal-modal');
  if(e.target===modal)modal.style.display='none';
});

function checkPwdStrength(pwd){
  const bar=document.getElementById('pwd-strength');
  const txt=document.getElementById('pwd-strength-txt');
  if(!bar||!txt)return;
  let score=0;
  if(pwd.length>=8)score++;
  if(/[A-Z]/.test(pwd))score++;
  if(/[0-9]/.test(pwd))score++;
  if(/[^A-Za-z0-9]/.test(pwd))score++;
  if(pwd.length>=12)score++;
  const levels=[
    {color:'#ef4444',label:'Très faible'},
    {color:'#f97316',label:'Faible'},
    {color:'#eab308',label:'Moyen'},
    {color:'#22c55e',label:'Fort'},
    {color:'#16a34a',label:'Très fort'}
  ];
  const lvl=levels[Math.min(score,4)];
  bar.style.background=lvl.color;
  bar.style.width=((score/5)*100)+'%';
  txt.textContent=pwd.length?lvl.label:'';
  txt.style.color=lvl.color;
}

function switchDashTab(tab, btn){
  document.querySelectorAll('.dashboard-tab').forEach(t=>t.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.getElementById('dash-overview').style.display=tab==='overview'?'grid':'none';
  document.getElementById('dash-progress').style.display=tab==='progress'?'block':'none';
  document.getElementById('dash-activity').style.display=tab==='activity'?'block':'none';
  document.getElementById('dash-badges').style.display=tab==='badges'?'block':'none';

  if(tab==='progress' && currentUser){
    const subjects=DB.subjects.filter(s=>s.active);
    const myCerts=DB.certificates.filter(c=>c.userId===currentUser.email||c.userId===String(currentUser.id)||c.studentName===currentUser.name);
    document.getElementById('dash-progress-content').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
        ${subjects.map(s=>{
          const cert=myCerts.find(c=>c.subject===s.name);
          const ex=DB.exams.find(e=>e.subjectId===s.id);
          const pct=cert?cert.score:0;
          const status=cert?'Réussi':'En cours';
          const statusColor=cert?'var(--gc)':'var(--muted)';
          return `<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1.1rem;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:.8rem;">
              <span style="font-size:22px;">${s.icon}</span>
              <div style="flex:1;"><div style="font-size:13px;font-weight:500;">${s.name}</div><div style="font-size:11px;color:var(--muted);">Licence ${s.level}</div></div>
              <span style="font-size:11px;font-weight:500;color:${statusColor};">${status}</span>
            </div>
            <div style="height:6px;background:var(--b0);border-radius:3px;margin-bottom:.5rem;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${cert?'linear-gradient(90deg,var(--gold),var(--b4))':'var(--b2)'};border-radius:3px;transition:width .8s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);">
              <span>${cert?'Score : '+cert.score+'%':ex?'Examen disponible':'Pas d\'examen'}</span>
              <span>${cert?'✅ Certifié':'⏳ À compléter'}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  if(tab==='activity' && currentUser){
    const activities=(currentUser.activity||[]);
    document.getElementById('dash-activity-content').innerHTML=activities.length?`
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
        ${activities.map(a=>`
          <div style="display:flex;align-items:center;gap:12px;padding:1rem 1.2rem;border-bottom:1px solid var(--border);">
            <div style="width:36px;height:36px;border-radius:10px;background:${a.bg||'var(--b0)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${a.ic}</div>
            <div style="flex:1;font-size:13px;">${a.text}</div>
            <div style="font-size:11px;color:var(--muted);">${a.time}</div>
          </div>`).join('')}
      </div>
    `:'<div style="text-align:center;padding:3rem;color:var(--muted);">Aucune activité récente</div>';
  }

  if(tab==='badges' && currentUser){
    document.getElementById('dash-badges-content').innerHTML=renderBadgesSection(currentUser);
  }
}

async function changePassword(){
  if(!currentUser) return;
  const oldPwd = prompt('Entrez votre mot de passe actuel :');
  if(!oldPwd) return;
  const newPwd = prompt('Entrez votre nouveau mot de passe (min 8 car., 1 maj., 1 chiffre) :');
  if(!newPwd) return;
  if(newPwd.length<8){toast('Trop court (min 8 caractères)','err');return;}
  if(!/[A-Z]/.test(newPwd)){toast('Doit contenir une majuscule','err');return;}
  if(!/[0-9]/.test(newPwd)){toast('Doit contenir un chiffre','err');return;}
  try{
    const firebaseUser = auth.currentUser;
    if(!firebaseUser){toast('Erreur : session expirée, reconnectez-vous','err');return;}
    // Re-authentifier avant de changer le mot de passe
    const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, oldPwd);
    await firebaseUser.reauthenticateWithCredential(credential);
    await firebaseUser.updatePassword(newPwd);
    toast('Mot de passe modifié avec succès !','ok');
  }catch(e){
    if(e.code==='auth/wrong-password') toast('Mot de passe actuel incorrect','err');
    else if(e.code==='auth/too-many-requests') toast('Trop de tentatives, réessayez plus tard','err');
    else toast('Erreur : '+e.message,'err');
  }
}

async function forgotPassword(){
  const email=prompt('Entrez votre adresse email pour réinitialiser votre mot de passe :');
  if(!email||!email.trim())return;
  try{
    await auth.sendPasswordResetEmail(email.trim());
    toast('Email de réinitialisation envoyé à '+email.trim()+' !','ok');
  }catch(e){
    if(e.code==='auth/user-not-found') toast('Aucun compte trouvé avec cet email','err');
    else toast('Erreur : '+e.message,'err');
  }
}

