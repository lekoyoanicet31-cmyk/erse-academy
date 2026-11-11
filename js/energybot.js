// ═══ energybot.js ═══
/* ═══════════════════════════════════════════
   ENERGYBOT — VERSION AMÉLIORÉE
   • KaTeX pour formules mathématiques
   • Photo/caméra pour analyser les épreuves
   • Mémoire persistante (localStorage)
   • Suggestions de questions après chaque réponse
   • Mode quiz intégré
   • Bouton résumé
═══════════════════════════════════════════ */

// KaTeX chargé dans index.html <head>

// ── Rendu KaTeX ──
function renderKaTeX(el){
  if(typeof renderMathInElement === 'function'){
    try{
      renderMathInElement(el, {
        delimiters: [
          {left:'$$', right:'$$', display:true},
          {left:'$', right:'$', display:false},
          {left:'\\[', right:'\\]', display:true},
          {left:'\\(', right:'\\)', display:false}
        ],
        throwOnError: false
      });
    }catch(e){ console.warn('KaTeX error:', e); }
  }
}

// ── Mémoire persistante ──
const EB_MEMORY_KEY = 'erse_eb_history';

function saveEbHistory(){
  try{
    const key = currentUser?.email || 'guest';
    const data = JSON.parse(localStorage.getItem(EB_MEMORY_KEY) || '{}');
    data[key] = { ctx: ebCtx, history: ebHistory.slice(-20), savedAt: Date.now() };
    localStorage.setItem(EB_MEMORY_KEY, JSON.stringify(data));
  }catch(e){}
}

function loadEbHistory(){
  try{
    const key = currentUser?.email || 'guest';
    const data = JSON.parse(localStorage.getItem(EB_MEMORY_KEY) || '{}');
    return data[key] || null;
  }catch(e){ return null; }
}

function clearEbHistory(){
  try{
    const key = currentUser?.email || 'guest';
    const data = JSON.parse(localStorage.getItem(EB_MEMORY_KEY) || '{}');
    delete data[key];
    localStorage.setItem(EB_MEMORY_KEY, JSON.stringify(data));
  }catch(e){}
}

// ── Prompts système ──
function getEbPrompts(){
  const studentInfo = currentUser ? `
L'étudiant connecté : ${currentUser.name}, Licence ${currentUser.level}.
Examens réussis : ${currentUser.passed||0}, Score moyen : ${currentUser.avgScore||0}%.` : '';

  const prompts = {
    general: `Tu es EnergyBot, assistant pédagogique IA de ERSE ACADEMY.
Tu aides les étudiants dans les matières suivantes : ${DB.subjects.filter(s=>s.active).map(s=>s.name).join(', ')}.
${studentInfo}
RÈGLES IMPORTANTES :
- Réponds toujours en français, avec un ton humain, chaleureux, simple et encourageant, sans familiarité forcée.
- Pour les formules mathématiques, utilise TOUJOURS la notation LaTeX : $formule$ pour inline, $$formule$$ pour display.
- Exemple : La formule quadratique est $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$
- Structure tes réponses avec des titres clairs.
- Si un étudiant envoie une photo d'épreuve, fournis une correction concise et structurée.
- Reste concis : réponse courte et directe (environ 5 à 8 lignes), sauf si l'étudiant demande plus de détails.
- Commence naturellement par une courte phrase utile, sans formule froide ni longue introduction.
- Si cela aide vraiment l'apprentissage, termine par une seule question simple ou propose une prochaine étape. N'en ajoute pas systématiquement.`
  };

  DB.subjects.filter(s=>s.active).forEach(s=>{
    prompts[String(s.id)] = `Tu es EnergyBot, expert en "${s.name}" (Licence ${s.level}) pour ERSE ACADEMY.
${s.desc ? 'Description : '+s.desc+'.' : ''}
${studentInfo}
RÈGLES IMPORTANTES :
- Réponds toujours en français, avec un ton humain, chaleureux, simple et encourageant, et des exemples concrets.
- Pour les formules mathématiques, utilise TOUJOURS LaTeX : $formule$ pour inline, $$formule$$ pour display.
- Exemple : $F = ma$, $$E = mc^2$$, $\\int_0^\\infty e^{-x} dx = 1$
- Si tu reçois une photo d'épreuve, fournis une correction concise étape par étape.
- Reste concis (environ 5 à 8 lignes), sauf si l'étudiant demande plus de détails.
- Commence naturellement, sans formule froide ni longue introduction.
- Si cela aide vraiment l'apprentissage, termine par une seule question simple ou propose une prochaine étape. N'en ajoute pas systématiquement.`;
  });
  return prompts;
}

// ── Rendu des chips de matières ──
function renderEbChips(){
  const wrap = document.getElementById('eb-subject-chips');
  if(!wrap) return;
  const subjects = DB.subjects.filter(s=>s.active);
  if(!subjects.length){ wrap.innerHTML=''; return; }

  const byLevel = {1:[], 2:[], 3:[]};
  subjects.forEach(s=>{ if(byLevel[s.level]) byLevel[s.level].push(s); });

  let html = '';
  [1,2,3].forEach(l=>{
    if(!byLevel[l].length) return;
    html += `<div class="eb-section-lbl">Licence ${l}</div>`;
    byLevel[l].forEach(s=>{
      html += `<button class="eb-chip" onclick="setEbCtx('${s.id}','${s.icon}','${s.name} L${s.level}','${(s.desc||s.name).replace(/'/g,"\\'")}',this)">
        <span class="eb-chip-ic">${s.icon}</span>${s.name}
      </button>`;
    });
  });

  wrap.innerHTML = html;

  // Restaurer le contexte sauvegardé
  const saved = loadEbHistory();
  if(saved && saved.ctx && saved.history && saved.history.length){
    ebCtx = saved.ctx;
    ebHistory = saved.history;
    const chip = wrap.querySelector(`[onclick*="'${saved.ctx.id}'"]`);
    if(chip){ chip.classList.add('on'); }
    restoreEbMessages();
  }
}

function restoreEbMessages(){
  const msgs = document.getElementById('eb-messages');
  if(!msgs) return;
  msgs.innerHTML = '';
  // Afficher l'entête
  msgs.innerHTML = `<div style="text-align:center;padding:.5rem;margin-bottom:.5rem;background:rgba(99,102,241,0.1);border-radius:8px;font-size:12px;color:var(--b8);">
    Conversation restaurée · <button onclick="clearEbChat()" style="background:none;border:none;color:var(--b6);cursor:pointer;font-size:12px;text-decoration:underline;">Effacer</button>
  </div>`;
  ebHistory.forEach(m=>{
    if(m.role === 'user'){
      // Vérifier si c'est un message avec image
      if(Array.isArray(m.content)){
        const text = m.content.find(c=>c.type==='text')?.text || '';
        addEbMsg('user', text + ' [Photo jointe]');
      } else {
        addEbMsg('user', m.content);
      }
    } else if(m.role === 'assistant'){
      addEbMsg('bot', m.content);
    }
  });
}

function setEbCtx(id, icon, name, desc, el){
  ebCtx={id, icon, name, desc};
  ebHistory=[];
  clearEbHistory();
  document.getElementById('eb-ctx-ic').innerHTML = ebIcon('book',16);
  document.getElementById('eb-ctx-name').textContent = name;
  document.getElementById('eb-ctx-sub').textContent = desc;
  document.querySelectorAll('.eb-chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  const chatArea = document.getElementById('eb-chat-area');
  if(chatArea) chatArea.classList.add('is-empty');
  const msgs = document.getElementById('eb-messages');
  msgs.innerHTML = `<div class="eb-welcome" id="eb-welcome">
    <div class="eb-welcome-avatar">${ebIcon('bolt',26)}</div>
    <h2>EnergyBot — ${name}</h2>
    <p>Prêt à vous aider sur <strong>${name}</strong>. Posez vos questions ou envoyez une photo d'épreuve !</p>
    <div class="eb-starter-grid">
      <button class="eb-starter" onclick="sendStarter('Explique un concept clé de ${name} avec des formules')"><span class="eb-starter-ic">${ebIcon('book',19)}</span><span class="eb-starter-txt">Expliquer</span><span class="eb-starter-sub">Avec formules</span></button>
      <button class="eb-starter" onclick="sendStarter('Génère 5 exercices sur ${name} avec solutions détaillées')"><span class="eb-starter-ic">${ebIcon('pencil',19)}</span><span class="eb-starter-txt">Exercices</span><span class="eb-starter-sub">Avec solutions</span></button>
      <button class="eb-starter" onclick="startQuizMode('${name}')"><span class="eb-starter-ic">${ebIcon('target',19)}</span><span class="eb-starter-txt">Quiz</span><span class="eb-starter-sub">Mode interactif</span></button>
      <button class="eb-starter" onclick="sendStarter('Quels sont les sujets d\\'examen les plus fréquents en ${name} ?')"><span class="eb-starter-ic">${ebIcon('file',19)}</span><span class="eb-starter-txt">Examen</span><span class="eb-starter-sub">Sujets fréquents</span></button>
    </div>
  </div>`;
}

function clearEbChat(){
  ebHistory=[];
  clearEbHistory();
  document.getElementById('eb-messages').innerHTML='';
  setEbCtx(ebCtx.id, ebCtx.icon, ebCtx.name, ebCtx.desc);
}

// ── Mode Quiz ──
function startQuizMode(subjectName){
  sendStarter(`Lance un quiz interactif sur ${subjectName}. Pose-moi une question à la fois, attends ma réponse, puis corrige-moi et passe à la suivante. Commence par me demander le niveau de difficulté souhaité (facile, moyen, difficile).`);
}

// ── Résumé de la conversation ──
async function summarizeEbChat(){
  if(!ebHistory.length){ toast('Pas de conversation à résumer','err'); return; }
  const summaryPrompt = 'Fais un résumé structuré et concis de notre conversation en points clés. Inclus les formules importantes vues.';
  document.getElementById('eb-input').value = summaryPrompt;
  await sendEbMessage();
}

// ── Gestion photo/caméra ──
let ebPendingImage = null;

function triggerEbImage(){
  // Réutiliser un input existant ou en créer un attaché au DOM
  let input = document.getElementById('eb-file-input');
  if(!input){
    input = document.createElement('input');
    input.id = 'eb-file-input';
    input.type = 'file';
    input.accept = 'image/*';
    input.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;width:1px;height:1px;';
    document.body.appendChild(input);
  }
  input.value = ''; // Reset pour permettre re-sélection du même fichier
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024){ toast('Image trop lourde (max 5MB)','err'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      ebPendingImage = ev.target.result;
      showEbImagePreview(ebPendingImage);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function showEbImagePreview(base64){
  let preview = document.getElementById('eb-image-preview');
  if(!preview){
    preview = document.createElement('div');
    preview.id = 'eb-image-preview';
    preview.style.cssText = 'padding:.5rem;background:var(--b0);border-radius:8px;margin:.5rem;display:flex;align-items:center;gap:.5rem;';
    const inputArea = document.querySelector('.eb-input-area') || document.getElementById('eb-input').parentElement;
    inputArea.insertBefore(preview, inputArea.firstChild);
  }
  preview.innerHTML = `
    <img src="${base64}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
    <div style="flex:1;font-size:12px;color:var(--muted);">Image prête à envoyer</div>
    <button onclick="cancelEbImage()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;">✕</button>
  `;
}

function cancelEbImage(){
  ebPendingImage = null;
  const preview = document.getElementById('eb-image-preview');
  if(preview) preview.remove();
}

// ── Formatage des messages ──
function fmtEb(t){
  return t
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code style="background:var(--b0);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:.85em;">$1</code>')
    .replace(/^### (.*)/gm,'<div style="font-size:13px;font-weight:700;color:var(--b8);margin:.5rem 0 .2rem;">$1</div>')
    .replace(/^## (.*)/gm,'<div style="font-size:14px;font-weight:700;color:var(--b9);margin:.6rem 0 .3rem;">$1</div>')
    .replace(/^# (.*)/gm,'<div style="font-size:15px;font-weight:800;color:var(--b9);margin:.7rem 0 .3rem;">$1</div>')
    .replace(/^- (.*)/gm,'<li style="margin:.2rem 0;">$1</li>')
    .replace(/^(\d+)\. (.*)/gm,'<li style="margin:.2rem 0;list-style-type:decimal;">$2</li>')
    .replace(/💡?\s*\*\*Questions de suivi :\*\*/g,'<div class="eb-followup-title">Questions de suivi</div>')
    .replace(/\n/g,'<br>');
}

function ebIcon(name,size=17){
  const paths={
    mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
    speaker:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    bolt:'<path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8M8 10h6"/>',
    pencil:'<path d="m16 4 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>'
  };
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.mic}</svg>`;
}

function addEbMsg(role, content){
  const welcome = document.getElementById('eb-welcome');
  if(welcome){
    welcome.remove();
    const chatArea = document.getElementById('eb-chat-area');
    if(chatArea) chatArea.classList.remove('is-empty');
  }
  const msgs = document.getElementById('eb-messages');
  const div = document.createElement('div');
  div.className = 'eb-msg ' + role;

  if(role === 'bot'){
    // Détecter les questions de suivi et les rendre cliquables
    const formattedContent = fmtEb(content);
    div.innerHTML = `<div class="eb-msg-avatar">E</div><div class="eb-bubble">${formattedContent}<button class="eb-speak-btn" type="button" onclick="speakEbReply(this)" title="Écouter la réponse" aria-label="Écouter la réponse">${ebIcon('speaker')}</button></div>`;
    msgs.appendChild(div);

    // Rendu KaTeX après insertion dans le DOM
    const bubble = div.querySelector('.eb-bubble'); setTimeout(() => { if(typeof renderMathInElement === 'function' && typeof katex !== 'undefined') renderKaTeX(bubble); }, 1500);
  } else {
    div.innerHTML = `<div class="eb-msg-avatar">${currentUser ? currentUser.initials : 'Moi'}</div><div class="eb-bubble">${fmtEb(content)}</div>`;
    msgs.appendChild(div);
  }

  const distFromBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
  if(distFromBottom < 200) msgs.scrollTop = msgs.scrollHeight;
}

function makeFollowupsClickable(bubble, content){
  // Extraire les questions de suivi numérotées
  const lines = content.split('\n');
  const questions = [];
  let inFollowup = false;
  lines.forEach(line => {
    if(line.includes('Questions de suivi')) { inFollowup = true; return; }
    if(inFollowup && /^\d+\./.test(line.trim())){
      questions.push(line.replace(/^\d+\.\s*/, '').trim());
    }
  });

  if(!questions.length) return;

  const followupDiv = document.createElement('div');
  followupDiv.style.cssText = 'margin-top:.8rem;display:flex;flex-wrap:wrap;gap:.4rem;';
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.textContent = q;
    btn.style.cssText = 'padding:.3rem .7rem;border-radius:20px;border:1px solid var(--b4);background:rgba(99,102,241,0.08);color:var(--b8);cursor:pointer;font-size:.75rem;font-family:var(--font-body);text-align:left;';
    btn.onclick = () => { document.getElementById('eb-input').value = q; sendEbMessage(); };
    followupDiv.appendChild(btn);
  });
  bubble.appendChild(followupDiv);
}

function showEbTyping(){
  const welcome = document.getElementById('eb-welcome');
  if(welcome){
    welcome.remove();
    const chatArea = document.getElementById('eb-chat-area');
    if(chatArea) chatArea.classList.remove('is-empty');
  }
  const msgs = document.getElementById('eb-messages');
  const div = document.createElement('div');
  div.className = 'eb-msg bot';
  div.id = 'eb-typing-ind';
  div.innerHTML = `<div class="eb-msg-avatar">E</div><div class="eb-bubble"><div class="eb-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeEbTyping(){
  const t = document.getElementById('eb-typing-ind');
  if(t) t.remove();
}

// La dictée est reconnue par le navigateur, puis envoyée comme un message texte.
let ebSpeechRecognition = null;
function toggleEbVoiceInput(){
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('eb-voice-btn');
  if(!Rec){ toast('La dictée vocale nécessite Chrome ou Edge à jour.','err'); return; }
  if(!window.isSecureContext){ toast('Le micro nécessite une connexion HTTPS. Ouvrez EnergyBot depuis son adresse sécurisée.','err'); return; }
  if(ebSpeechRecognition){ ebSpeechRecognition.__stoppedByUser=true; ebSpeechRecognition.stop(); return; }
  const recognition = new Rec();
  ebSpeechRecognition = recognition;
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let heardSpeech=false,hadError=false;
  if(btn){ btn.innerHTML=ebIcon('stop'); btn.classList.add('is-listening'); btn.title='Arrêter la dictée'; btn.setAttribute('aria-label','Arrêter la dictée'); btn.setAttribute('aria-pressed','true'); }
  recognition.onstart = () => toast('Je vous écoute. Parlez maintenant.','ok');
  recognition.onresult = event => {
    const said = event.results?.[0]?.[0]?.transcript?.trim();
    if(!said) return;
    heardSpeech=true;
    const input = document.getElementById('eb-input');
    input.value = [input.value.trim(), said].filter(Boolean).join(' ');
    autoEbResize(input);
    sendEbMessage();
  };
  recognition.onerror = event => {
    hadError=true;
    const messages={
      'not-allowed':'Accès au micro refusé. Autorisez le micro pour ce site dans les réglages du navigateur, puis réessayez.',
      'service-not-allowed':'La reconnaissance vocale est bloquée par le navigateur. Essayez Chrome ou Edge à jour.',
      'audio-capture':'Aucun micro utilisable détecté. Vérifiez le micro choisi dans Windows et dans le navigateur.',
      'network':'Le service de reconnaissance vocale est inaccessible. Vérifiez la connexion Internet puis réessayez.',
      'no-speech':'Aucune voix détectée. Parlez après l’apparition de l’indicateur d’écoute.',
      'language-not-supported':'La reconnaissance vocale en français n’est pas disponible dans ce navigateur.'
    };
    if(event.error !== 'aborted') toast(messages[event.error]||'La reconnaissance vocale a échoué ('+event.error+'). Réessayez dans Chrome ou Edge.','err');
  };
  recognition.onend = () => {
    ebSpeechRecognition = null;
    if(btn){ btn.innerHTML=ebIcon('mic'); btn.classList.remove('is-listening'); btn.title='Dicter une question'; btn.setAttribute('aria-label','Dicter une question'); btn.setAttribute('aria-pressed','false'); }
    if(!heardSpeech&&!hadError&&!recognition.__stoppedByUser) toast('Je n’ai pas entendu de voix. Réessayez en parlant distinctement près du micro.','err');
  };
  try{
    recognition.start();
  }catch(e){
    ebSpeechRecognition=null;
    if(btn){btn.innerHTML=ebIcon('mic');btn.classList.remove('is-listening');btn.setAttribute('aria-label','Dicter une question');btn.setAttribute('aria-pressed','false');}
    toast(e.name==='InvalidStateError'?'La dictée est déjà en cours.':'Impossible de démarrer la dictée. Vérifiez les réglages du micro et réessayez.','err');
  }
}

function speakEbReply(button){
  if(!('speechSynthesis' in window)){ toast('La lecture vocale n’est pas disponible sur cet appareil.','err'); return; }
  if(window.speechSynthesis.speaking){ window.speechSynthesis.cancel(); button.innerHTML=ebIcon('speaker'); return; }
  const bubbleCopy = button.closest('.eb-bubble')?.cloneNode(true);
  bubbleCopy?.querySelectorAll('button').forEach(el=>el.remove());
  const utterance = new SpeechSynthesisUtterance(bubbleCopy?.innerText || '');
  utterance.lang = 'fr-FR';
  utterance.onend = () => button.innerHTML=ebIcon('speaker');
  utterance.onerror = () => button.innerHTML=ebIcon('speaker');
  button.innerHTML=ebIcon('stop');
  window.speechSynthesis.speak(utterance);
}

// ── Envoi de message (texte + image) ──
async function sendEbMessage(){
  const input = document.getElementById('eb-input');
  const msg = input.value.trim();
  if((!msg && !ebPendingImage) || ebTyping) return;
  input.value = '';
  input.style.height = 'auto';
  ebTyping = true;
  document.getElementById('eb-send').disabled = true;

  const EB_PROMPTS = getEbPrompts();
  const sysPrompt = EB_PROMPTS[ebCtx.id] || EB_PROMPTS.general;

  // Construire le contenu du message utilisateur
  let userContent;
  let displayMsg = msg;

  if(ebPendingImage){
    const base64Data = ebPendingImage.split(',')[1];
    const mimeType = ebPendingImage.split(';')[0].split(':')[1];
    userContent = [
      { type: 'text', text: msg || 'Analyse cette épreuve et fournis une correction complète et détaillée.' },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
    ];
    displayMsg = (msg || 'Analyse cette épreuve') + ' [Photo jointe]';
    cancelEbImage();
  } else {
    userContent = msg;
  }

  addEbMsg('user', displayMsg);
  ebHistory.push({ role: 'user', content: userContent });
  showEbTyping();

  const messages = [{ role: 'system', content: sysPrompt }, ...ebHistory];

  try{
    const res = await fetch(GROQ_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error?.message || 'Erreur proxy');
    const reply = data.choices?.[0]?.message?.content || 'Désolé, pas de réponse.';
    removeEbTyping();
    addEbMsg('bot', reply);
    ebHistory.push({ role: 'assistant', content: reply });
    if(ebHistory.length > 30) ebHistory = ebHistory.slice(-30);
    saveEbHistory();
  }catch(err){
    removeEbTyping();
    let errMsg = 'Erreur de connexion.';
    if(err.message.includes('429')) errMsg = 'Limite atteinte. Attendez quelques secondes.';
    else errMsg = 'Erreur : ' + err.message;
    addEbMsg('bot', '⚠️ ' + errMsg);
    toast(errMsg, 'err');
  }

  ebTyping = false;
  document.getElementById('eb-send').disabled = false;
  document.getElementById('eb-input').focus();
}

function autoEbResize(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,110)+'px'; }
function sendStarter(text){ document.getElementById('eb-input').value=text; sendEbMessage(); }

// ── Gestion des documents (admin) ──
function renderAdminDocs(){
  const el = document.getElementById('at-docs-a');
  if(!el) return;
  el.innerHTML = '<div class="admin-ttl">📄 Gestion des documents</div><div id="docs-add-form" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1.3rem;margin-bottom:1.2rem;"><div style="font-size:13px;font-weight:500;color:var(--b8);margin-bottom:1rem;">➕ Ajouter un document</div><div style="margin-bottom:.8rem;"><label class="form-lbl">Matière</label><select id="doc-subj" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);">'
    + DB.subjects.filter(s=>s.active).map(s=>'<option value="'+s.id+'">'+s.icon+' '+s.name+' (L'+s.level+')</option>').join('')
    + '</select></div><div style="margin-bottom:.8rem;"><label class="form-lbl">Nom du document</label><input id="doc-name" placeholder="Ex: Cours 1 — Fonctions.pdf" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);outline:none;"></div><div style="margin-bottom:1rem;"><label class="form-lbl">Lien PDF (optionnel)</label><input id="doc-url" placeholder="https://drive.google.com/..." style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);outline:none;"></div><button onclick="addDoc()" style="background:var(--b9);color:#fff;font-family:var(--font-body);font-size:13px;font-weight:500;padding:9px 22px;border-radius:9px;border:none;cursor:pointer;">+ Ajouter le document</button></div><div id="docs-list"></div>';
  refreshDocsList();
}

function refreshDocsList(){
  const el = document.getElementById('docs-list');
  if(!el) return;
  if(!DB.subjects.filter(s=>s.active).length){ el.innerHTML='<div style="color:var(--muted);font-size:13px;">Aucune matière active.</div>'; return; }
  el.innerHTML = DB.subjects.filter(s=>s.active).map(s=>{
    const files = s.files || [];
    return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;background:var(--b0);border-bottom:1px solid var(--border);">'
      + '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">'+s.icon+'</span><span style="font-size:14px;font-weight:500;color:var(--b9);">'+s.name+'</span><span class="pill-lvl l'+s.level+'p">L'+s.level+'</span></div>'
      + '<span style="font-size:12px;color:var(--muted);">'+files.length+' document(s)</span>'
      + '</div><div style="padding:.8rem 1rem;">'
      + (files.length === 0
        ? '<div style="font-size:12px;color:var(--muted);padding:.3rem 0;">Aucun document.</div>'
        : files.map((f,i)=>{
            const fileName = typeof f==='object' ? f.name : f.replace(/<[^>]+>/g,'');
            const hasDrive = typeof f==='object' && f.driveId;
            return '<div style="display:flex;align-items:center;gap:8px;padding:.6rem 0;border-bottom:1px solid var(--border);">'
              + '<span style="font-size:15px;">📄</span>'
              + '<span style="flex:1;font-size:13px;">'+fileName+(hasDrive?' <span style="font-size:10px;background:var(--g);color:var(--gc);padding:1px 6px;border-radius:10px;">🔗 Drive</span>':'')+'</span>'
              + '<button class="act-btn edit-btn" onclick="editDoc('+s.id+','+i+')">✏ Renommer</button>'
              + '<button class="act-btn edit-btn" onclick="editDocUrl('+s.id+','+i+')">🔗 Lien</button>'
              + '<button class="act-btn del-btn" onclick="deleteDoc('+s.id+','+i+')">🗑</button>'
              + '</div>';
          }).join('')
      )
      + '</div></div>';
  }).join('');
}

function addDoc(){
  const subjId = +document.getElementById('doc-subj').value;
  const name = document.getElementById('doc-name').value.trim();
  const url = document.getElementById('doc-url').value.trim();
  if(!name){ toast('Nom du document requis','err'); return; }
  const s = DB.subjects.find(x=>x.id===subjId);
  if(!s.files) s.files = [];
  let fileObj;
  if(url && url.includes('drive.google.com')){
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveId = match ? match[1] : null;
    fileObj = driveId ? {name, driveId} : {name};
  } else if(url){
    fileObj = {name, url};
  } else {
    fileObj = {name};
  }
  s.files.push(fileObj);
  s.docs = s.files.length;
  document.getElementById('doc-name').value = '';
  document.getElementById('doc-url').value = '';
  if(fbReady) fbSaveSubject(s).catch(e=>console.warn(e));
  saveData(); pushToRTDB();
  toast('Document ajouté à '+s.name+' !','ok');
  refreshDocsList();
}

function deleteDoc(subjId, idx){
  const s = DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files) return;
  if(!confirm('Supprimer ce document ?')) return;
  s.files.splice(idx, 1);
  s.docs = s.files.length;
  if(fbReady) fbSaveSubject(s).catch(e=>console.warn(e));
  saveData(); pushToRTDB();
  toast('Document supprimé','ok');
  refreshDocsList();
}

function editDoc(subjId, idx){
  const s = DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files) return;
  const current = typeof s.files[idx]==='object' ? s.files[idx].name : s.files[idx];
  const newName = prompt('Nouveau nom :', current);
  if(!newName||!newName.trim()) return;
  if(typeof s.files[idx]==='object') s.files[idx].name = newName.trim();
  else s.files[idx] = newName.trim();
  if(fbReady) fbSaveSubject(s).catch(e=>console.warn(e));
  saveData(); pushToRTDB();
  toast('Renommé !','ok');
  refreshDocsList();
}

function editDocUrl(subjId, idx){
  const s = DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files) return;
  const current = typeof s.files[idx]==='object' ? (s.files[idx].driveId||'') : '';
  const newUrl = prompt('Lien Google Drive :', current);
  if(newUrl===null) return;
  if(typeof s.files[idx]==='object'){
    if(newUrl.trim()){
      const match = newUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      s.files[idx].driveId = match ? match[1] : newUrl.trim();
    } else {
      delete s.files[idx].driveId;
    }
  }
  toast('Lien mis à jour !','ok');
  refreshDocsList();
}
