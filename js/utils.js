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
const LEGAL_UPDATED = '8 octobre 2026';
const LEGAL_EMAIL = 'academyerse@gmail.com';
const LEGAL_WA_CHANNEL = 'https://whatsapp.com/channel/0029VbCWEMk4Crfd6srHg01q';
const LEGAL_MAIL_LINK = `<a href="mailto:${LEGAL_EMAIL}" style="color:var(--b6);">${LEGAL_EMAIL}</a>`;

const LEGAL = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    content: `<p><strong>Dernière mise à jour :</strong> ${LEGAL_UPDATED}</p>
    <br>
    <p><strong>1. Objet</strong><br>ERSE ACADEMY est une plateforme académique destinée aux étudiants en Licence 1, 2 et 3 dans le domaine des Énergies Renouvelables et Systèmes Énergétiques (ERSE), principalement au Bénin et dans la sous-région ouest-africaine. Elle propose des cours, des examens interactifs, des certificats de réussite, une boutique d'épreuves corrigées, un forum, un planning de révision et un assistant pédagogique IA (EnergyBot). En utilisant la plateforme, vous acceptez les présentes conditions.</p>
    <br>
    <p><strong>2. Compte et accès</strong><br>L'inscription est ouverte à tout étudiant disposant d'une adresse email valide. Un compte correspond à une seule personne. Chaque utilisateur est seul responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte ; tout partage de compte est interdit. Les utilisateurs mineurs doivent utiliser la plateforme avec l'accord de leur représentant légal.</p>
    <br>
    <p><strong>3. Niveaux et progression</strong><br>Les contenus sont organisés par niveau (Licence 1, 2 et 3). Un étudiant accède à son niveau actuel et aux niveaux inférieurs ; les niveaux supérieurs restent verrouillés. Le passage au niveau suivant se débloque lorsque la moyenne de l'étudiant atteint au moins 80 % sur l'ensemble des examens de son niveau (un examen non encore passé compte pour 0). Toute tentative de contourner ces restrictions est interdite.</p>
    <br>
    <p><strong>4. Examens, anti-triche et certificats</strong><br>Les examens sont chronométrés et un score minimum de 70 % est requis pour les réussir et obtenir un certificat. Pour garantir l'équité, la plateforme applique des mesures anti-triche (mode plein écran, détection des changements d'onglet ou de fenêtre). Un examen peut être annulé en cas de sorties répétées de la page d'examen. Les certificats attestent de la réussite aux examens internes de la plateforme ; ils ont une valeur pédagogique et ne remplacent pas les diplômes officiels de l'université.</p>
    <br>
    <p><strong>5. Contenu pédagogique et propriété intellectuelle</strong><br>Les documents, examens, corrections, certificats et l'interface de la plateforme sont destinés à un usage pédagogique et personnel. Toute reproduction, diffusion, revente ou extraction automatisée sans autorisation écrite de l'administrateur est interdite. Si vous estimez qu'un contenu porte atteinte à vos droits, signalez-le à ${LEGAL_MAIL_LINK} : il sera examiné et retiré si nécessaire.</p>
    <br>
    <p><strong>6. Boutique d'épreuves</strong><br>La boutique propose des épreuves et corrigés, gratuits ou premium. L'accès à la boutique est conditionné au suivi de la chaîne WhatsApp ERSE ACADEMY. Le paiement en ligne automatisé n'est pas encore disponible : les modalités de règlement des contenus premium (notamment par Mobile Money) sont précisées au moment de l'achat. Un contenu premium, une fois débloqué, n'est ni repris ni remboursé, sauf erreur imputable à ERSE ACADEMY.</p>
    <br>
    <p><strong>7. EnergyBot (assistant IA)</strong><br>EnergyBot est un assistant pédagogique basé sur l'intelligence artificielle. Ses réponses peuvent contenir des erreurs ou des approximations : vérifiez toujours les informations importantes avec vos cours et vos enseignants. EnergyBot ne remplace pas un enseignant et ne doit pas servir à tricher lors d'un examen. Vos messages et les photos que vous envoyez sont transmis à des prestataires tiers pour générer la réponse (voir la Politique de confidentialité). N'envoyez pas d'informations personnelles ou sensibles.</p>
    <br>
    <p><strong>8. Forum et comportement</strong><br>Le forum est un espace d'entraide académique soumis à la <span onclick="showLegal('rules')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">Charte de la communauté</span>. Les publications sont limitées à 5 par heure et par utilisateur. Vous êtes responsable de ce que vous publiez.</p>
    <br>
    <p><strong>9. Utilisation acceptable</strong><br>Les utilisateurs s'engagent à :<br>— Ne pas partager leurs identifiants de connexion<br>— Ne pas manipuler leurs scores, niveaux ou résultats<br>— Ne pas tenter d'accéder sans autorisation aux systèmes, comptes ou données de la plateforme<br>— Ne pas publier de contenu offensant, illégal ou inapproprié<br>— Utiliser la plateforme de bonne foi et dans un cadre strictement académique</p>
    <br>
    <p><strong>10. Disponibilité et responsabilité</strong><br>ERSE ACADEMY est un projet étudiant fourni « en l'état », sans garantie de disponibilité continue : des interruptions, maintenances ou pertes de données ponctuelles sont possibles. ERSE ACADEMY ne peut être tenue responsable des résultats obtenus aux examens officiels, ni des dommages indirects liés à l'utilisation de la plateforme, dans la limite permise par la loi.</p>
    <br>
    <p><strong>11. Suspension de compte</strong><br>Tout abus, fraude, tentative de triche ou comportement contraire aux présentes conditions peut entraîner la suspension ou la suppression du compte, sans préavis ni remboursement. Vous pouvez aussi demander la suppression de votre compte à tout moment.</p>
    <br>
    <p><strong>12. Données personnelles</strong><br>Le traitement de vos données est décrit dans la <span onclick="showLegal('privacy')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">Politique de confidentialité</span>.</p>
    <br>
    <p><strong>13. Modification des CGU</strong><br>ERSE ACADEMY peut modifier les présentes conditions à tout moment. La date de dernière mise à jour figure en haut de cette page ; la poursuite de l'utilisation de la plateforme vaut acceptation des conditions modifiées.</p>
    <br>
    <p><strong>14. Droit applicable</strong><br>Les présentes conditions sont régies par le droit béninois. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les juridictions compétentes du Bénin seront saisies.</p>
    <br>
    <p><strong>15. Contact</strong><br>Pour toute question relative aux CGU : ${LEGAL_MAIL_LINK}</p>`
  },

  privacy: {
    title: "Politique de Confidentialité",
    content: `<p><strong>Dernière mise à jour :</strong> ${LEGAL_UPDATED}</p>
    <br>
    <p>ERSE ACADEMY s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique quelles données sont collectées, pourquoi, avec qui elles sont partagées et quels sont vos droits.</p>
    <br>
    <p><strong>1. Responsable du traitement</strong><br>ERSE ACADEMY (projet académique indépendant, Bénin). Contact : ${LEGAL_MAIL_LINK}</p>
    <br>
    <p><strong>2. Données collectées</strong><br>— <em>Compte :</em> nom, adresse email, niveau d'études (L1, L2, L3), spécialité (facultative), initiales et couleur d'avatar<br>— <em>Progression :</em> résultats et scores aux examens, certificats, badges, statistiques<br>— <em>Planning :</em> votre planning de révision et votre préférence de rappels par email<br>— <em>Contributions :</em> messages publiés sur le forum<br>— <em>EnergyBot :</em> vos questions et les photos que vous envoyez à l'assistant (voir section 6)<br>— <em>Technique :</em> informations de connexion gérées par Firebase Authentication</p>
    <br>
    <p><strong>3. Finalités</strong><br>Vos données servent à : gérer votre compte et votre authentification ; suivre votre progression et débloquer les niveaux ; délivrer vos certificats ; afficher le classement ; faire fonctionner le forum et EnergyBot ; vous envoyer des emails (bienvenue, passage de niveau, certificats et, si vous les activez, rappels de planning). Nous n'utilisons pas vos données à des fins publicitaires.</p>
    <br>
    <p><strong>4. Ce qui est visible par les autres utilisateurs</strong><br>— <em>Classement :</em> votre nom, vos initiales, votre niveau, votre score moyen et votre nombre de certificats<br>— <em>Forum :</em> votre nom et le contenu de vos publications et réponses<br>Votre email, votre planning et votre historique détaillé ne sont pas affichés aux autres étudiants.</p>
    <br>
    <p><strong>5. Prestataires et transferts</strong><br>Pour fonctionner, la plateforme s'appuie sur des services tiers, dont certains sont situés hors du Bénin (notamment aux États-Unis) :<br>— <em>Google Firebase</em> (authentification, base de données) — stockage de vos données de compte et de progression<br>— <em>Cloudflare</em> (proxy technique) et <em>Groq</em> (modèle d'IA) — traitement des demandes envoyées à EnergyBot<br>— <em>EmailJS</em> — envoi des emails<br>— <em>GitHub Pages</em> — hébergement du site<br>— <em>Google Fonts</em> — chargement des polices d'écriture (votre adresse IP est transmise à Google)<br>— <em>WhatsApp (Meta)</em> — uniquement si vous suivez la chaîne ; cela se fait en dehors de la plateforme et relève de leurs propres règles</p>
    <br>
    <p><strong>6. EnergyBot et vos photos</strong><br>Lorsque vous écrivez à EnergyBot ou envoyez une photo (par exemple une épreuve), le contenu est transmis via Cloudflare à Groq pour générer la réponse. Nous ne conservons pas ces photos sur nos serveurs. L'historique de votre conversation est enregistré localement dans votre navigateur. Évitez d'envoyer des photos contenant des visages, des documents d'identité ou toute information personnelle.</p>
    <br>
    <p><strong>7. Stockage dans votre navigateur</strong><br>ERSE ACADEMY n'utilise pas de cookies publicitaires ni de traçage. Des données techniques sont enregistrées localement dans votre navigateur : session de connexion, dernière page visitée, thème d'affichage, copie locale de votre planning, historique d'EnergyBot, badges obtenus et mention du suivi de la chaîne WhatsApp. Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur.</p>
    <br>
    <p><strong>8. Conservation</strong><br>Vos données sont conservées tant que votre compte est actif. Elles sont supprimées sur simple demande à ${LEGAL_MAIL_LINK}.</p>
    <br>
    <p><strong>9. Sécurité</strong><br>Nous utilisons Firebase Authentication, des règles de sécurité Firestore et HTTPS pour protéger vos données. Aucun système n'étant infaillible, nous vous invitons à choisir un mot de passe solide et à ne pas le partager.</p>
    <br>
    <p><strong>10. Vos droits</strong><br>Vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition, ainsi que du droit de retirer votre consentement (par exemple pour les rappels par email). Pour les exercer, écrivez à ${LEGAL_MAIL_LINK}. Vous pouvez également saisir l'Autorité de Protection des Données Personnelles (APDP) du Bénin, conformément à la loi n° 2017-20 portant Code du numérique.</p>
    <br>
    <p><strong>11. Mineurs</strong><br>Les utilisateurs mineurs doivent utiliser la plateforme avec l'accord de leur représentant légal, qui peut à tout moment demander l'accès ou la suppression des données concernées.</p>
    <br>
    <p><strong>12. Modifications</strong><br>Cette politique peut évoluer. La date de dernière mise à jour figure en haut de cette page.</p>`
  },

  contact: {
    title: "Nous contacter",
    content: `<p><strong>ERSE ACADEMY</strong><br>Plateforme académique en Énergies Renouvelables et Systèmes Énergétiques<br>Bénin, Afrique de l'Ouest</p>
    <br>
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">📧 Email</div>
        ${LEGAL_MAIL_LINK}
      </div>
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">💬 WhatsApp</div>
        <a href="https://wa.me/2290192875886" target="_blank" rel="noopener" style="color:#25D366;font-size:13px;">+229 01 92 87 58 86</a>
      </div>
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">📢 Chaîne WhatsApp</div>
        <a href="${LEGAL_WA_CHANNEL}" target="_blank" rel="noopener" style="color:#25D366;font-size:13px;">Suivre la chaîne ERSE ACADEMY</a>
        <div style="font-size:12px;color:var(--muted);margin-top:.3rem;">Nouvelles épreuves, annonces et mises à jour de la plateforme.</div>
      </div>
      <div style="background:var(--b0);border-radius:10px;padding:1rem;">
        <div style="font-size:12px;font-weight:600;color:var(--b8);margin-bottom:.4rem;">🕐 Disponibilité</div>
        <div style="font-size:13px;color:var(--text);">Lundi — Vendredi · 8h00 à 20h00<br>Samedi · 9h00 à 15h00</div>
      </div>
    </div>
    <br>
    <p><strong>Étudiants</strong><br>Pour tout problème de connexion, d'examen ou de certificat, écrivez-nous en précisant votre nom complet, votre email et votre niveau (L1, L2 ou L3). Délai de réponse : 24 à 48h. Pensez aussi à consulter la <span onclick="showLegal('faq')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">FAQ</span>.</p>
    <br>
    <p><strong>Signaler un bug ou un contenu</strong><br>Une erreur dans une question, un contenu inapproprié, un problème technique ? Écrivez-nous avec une capture d'écran si possible.</p>
    <br>
    <p><strong>Partenariats & enseignants</strong><br>Pour proposer des ressources pédagogiques ou discuter d'un partenariat, contactez-nous par email.</p>`
  },

  about: {
    title: "À propos d'ERSE ACADEMY",
    content: `<p><strong>ERSE ACADEMY</strong> est une plateforme académique numérique créée pour les étudiants béninois en Licence de Sciences Physiques, spécialité Énergies Renouvelables et Systèmes Énergétiques (ERSE).</p>
    <br>
    <p><strong>Notre mission</strong><br>Démocratiser l'accès aux ressources pédagogiques de qualité pour les étudiants d'Afrique de l'Ouest — en ligne, à tout moment, avec de nombreux contenus gratuits. Chaque étudiant mérite des outils modernes pour réussir ses examens et progresser dans son parcours.</p>
    <br>
    <p><strong>Ce que nous offrons</strong></p>
    <ul style="padding-left:1.2rem;margin-top:.5rem;line-height:2.2;color:var(--text);">
      <li>📚 Cours et documents téléchargeables par niveau (L1 / L2 / L3)</li>
      <li>📝 Examens QCM chronométrés avec correction détaillée et explications</li>
      <li>🎓 Certificats de réussite téléchargeables (score minimum de 70 %)</li>
      <li>🔓 Progression par niveaux : passez en Licence supérieure avec 80 % de moyenne</li>
      <li>🛒 Boutique d'épreuves corrigées, gratuites et premium</li>
      <li>🔁 Mode révision — rejouer les questions ratées</li>
      <li>📅 Planning de révision hebdomadaire « Journée complète », de 08h00 à 22h30</li>
      <li>🏆 Classement et suivi de progression, avec badges</li>
      <li>⚡ EnergyBot — assistant pédagogique IA, avec envoi de photo d'exercice</li>
      <li>💬 Forum étudiant pour poser vos questions</li>
    </ul>
    <br>
    <p><strong>Qui sommes-nous ?</strong><br>ERSE ACADEMY est fondée et gérée par un étudiant en ERSE au Bénin, avec la conviction que la technologie peut transformer l'éducation en Afrique. Le projet évolue en continu grâce aux retours de la communauté étudiante.</p>
    <br>
    <p><strong>Technologies utilisées</strong><br>Firebase (authentification, Firestore) · Groq (modèle d'IA d'EnergyBot) · Cloudflare Workers · EmailJS · GitHub Pages</p>
    <br>
    <p><strong>Nous rejoindre</strong><br>Suivez la <a href="${LEGAL_WA_CHANNEL}" target="_blank" rel="noopener" style="color:#25D366;">chaîne WhatsApp</a> pour ne rien manquer, ou écrivez-nous via la page <span onclick="showLegal('contact')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">Contact</span>.</p>
    <br>
    <p style="color:var(--muted);font-size:12px;">© 2026 ERSE ACADEMY · Tous droits réservés</p>`
  },

  faq: {
    title: "Questions fréquentes",
    content: (() => {
      const q = (question, answer) => `<details style="border:1px solid #e2e8f0;border-radius:10px;padding:.7rem 1rem;margin-bottom:8px;background:#f8fafc;">
        <summary style="cursor:pointer;font-weight:600;color:var(--b8);">${question}</summary>
        <div style="margin-top:.6rem;color:#334155;">${answer}</div></details>`;
      return [
        q("L'inscription est-elle payante ?", "Non. Créer un compte est gratuit. Certains contenus de la boutique sont premium (voir plus bas)."),
        q("J'ai oublié mon mot de passe, que faire ?", "Sur l'écran de connexion, cliquez sur « Mot de passe oublié ? », saisissez votre email, et suivez le lien reçu. Pensez à vérifier vos spams."),
        q("Pourquoi je ne vois pas les Licences 2 et 3 ?", "Chaque étudiant accède à son niveau actuel et aux niveaux inférieurs. Les niveaux supérieurs se débloquent en progressant."),
        q("Comment passer en Licence supérieure ?", "Il faut atteindre au moins 80 % de moyenne sur l'ensemble des examens de votre niveau. Un examen non encore passé compte pour 0 : il faut donc passer la quasi-totalité des examens du niveau avec de bons scores. Quand c'est atteint, un bouton de validation apparaît sur la page Examens."),
        q("Quel score faut-il pour réussir un examen et obtenir un certificat ?", "Au minimum 70 %. Le certificat est ensuite téléchargeable depuis la page Certificats."),
        q("Pourquoi mon examen a été annulé ?", "Les examens sont chronométrés et surveillés par un système anti-triche : quitter la page, changer d'onglet ou de fenêtre à plusieurs reprises annule l'examen. Restez en plein écran jusqu'à la fin."),
        q("Pourquoi dois-je suivre la chaîne WhatsApp pour accéder à la boutique ?", `C'est la condition d'accès à la boutique : la chaîne permet d'annoncer les nouvelles épreuves et les mises à jour. <a href="${LEGAL_WA_CHANNEL}" target="_blank" rel="noopener" style="color:#25D366;">Suivre la chaîne</a>, puis confirmez dans la fenêtre qui s'affiche.`),
        q("Comment payer une épreuve premium ?", "Le paiement automatisé n'est pas encore disponible. Contactez-nous (page Contact) pour connaître les modalités de règlement par Mobile Money."),
        q("EnergyBot me donne une mauvaise réponse ou ne répond pas.", "EnergyBot est une IA : elle peut se tromper, vérifiez toujours avec vos cours. S'il ne répond pas, réessayez dans un instant, puis signalez-le-nous via la page Contact."),
        q("Puis-je envoyer une photo d'exercice à EnergyBot ?", "Oui, via l'icône appareil photo. Choisissez une image nette, bien cadrée, et évitez d'y montrer des visages ou des informations personnelles."),
        q("Comment fonctionne le planning de révision ?", "Choisissez votre date d'examen et votre niveau : un planning hebdomadaire « Journée complète » (08h00 à 22h30) est généré, avec plus de temps sur vos matières les plus faibles. Les rappels par email sont une option en cours de mise en place."),
        q("Comment modifier mon profil ou supprimer mon compte ?", `Modifiez votre profil depuis la page Profil. Pour supprimer votre compte et vos données, écrivez à ${LEGAL_MAIL_LINK}.`),
        q("Comment signaler une erreur dans une question ?", "Écrivez-nous via la page Contact en indiquant l'examen et la question concernés.")
      ].join('');
    })()
  },

  rules: {
    title: "Charte de la communauté",
    content: `<p>Le forum d'ERSE ACADEMY est un espace d'entraide entre étudiants. Pour qu'il reste utile et agréable pour tous :</p>
    <br>
    <p><strong>✅ À faire</strong><br>— Poser des questions claires, avec le contexte (matière, niveau, chapitre)<br>— Répondre avec bienveillance et expliquer votre raisonnement<br>— Choisir la bonne matière pour classer votre discussion<br>— Chercher d'abord si la question n'a pas déjà été posée</p>
    <br>
    <p><strong>🚫 À ne pas faire</strong><br>— Insultes, moqueries, harcèlement, discrimination ou propos haineux<br>— Spam, publicité, liens suspects<br>— Partager des documents protégés, des corrigés piratés ou du contenu dont vous n'avez pas les droits<br>— Demander ou donner les réponses d'un examen en cours<br>— Publier des informations personnelles (téléphone, adresse, identifiants) — les vôtres comme celles des autres<br>— Usurper l'identité d'une autre personne</p>
    <br>
    <p><strong>⏱ Limites</strong><br>Chaque utilisateur peut publier au maximum 5 discussions par heure.</p>
    <br>
    <p><strong>🛡 Modération</strong><br>Les administrateurs peuvent supprimer toute publication contraire à cette charte et suspendre le compte en cas d'abus répétés. Pour signaler un message : ${LEGAL_MAIL_LINK}.</p>`
  },

  mentions: {
    title: "Mentions légales",
    content: `<p><strong>Dernière mise à jour :</strong> ${LEGAL_UPDATED}</p>
    <br>
    <p><strong>Éditeur du site</strong><br>ERSE ACADEMY — projet académique indépendant, Bénin.<br>Responsable de la publication : l'administrateur de la plateforme.<br>Contact : ${LEGAL_MAIL_LINK}</p>
    <br>
    <p><strong>Hébergement et services techniques</strong><br>— Site : GitHub Pages (GitHub, Inc., États-Unis)<br>— Base de données et authentification : Google Firebase (Google LLC / Google Cloud)<br>— Proxy IA : Cloudflare, Inc.<br>— Modèle d'IA : Groq, Inc.<br>— Envoi d'emails : EmailJS</p>
    <br>
    <p><strong>Propriété intellectuelle</strong><br>L'ensemble des contenus et de l'interface d'ERSE ACADEMY (textes, questions, documents, design, logo) est protégé. Toute reproduction ou réutilisation sans autorisation écrite est interdite, hors usage personnel et pédagogique. Les marques et logos de tiers appartiennent à leurs propriétaires respectifs.</p>
    <br>
    <p><strong>Contenus et signalement</strong><br>Pour signaler un contenu litigieux ou exercer un droit (retrait, rectification), écrivez à ${LEGAL_MAIL_LINK} en précisant la page concernée.</p>
    <br>
    <p><strong>Données personnelles</strong><br>Voir la <span onclick="showLegal('privacy')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">Politique de confidentialité</span>.</p>
    <br>
    <p><strong>Droit applicable</strong><br>Le site est soumis au droit béninois.</p>`
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

