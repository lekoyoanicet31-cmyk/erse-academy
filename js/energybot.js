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

// ── Charger KaTeX dynamiquement ──
(function loadKaTeX(){
  if(document.getElementById('katex-css')) return;
  const link = document.createElement('link');
  link.id = 'katex-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  document.head.appendChild(link);
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  script.defer = true;
  document.head.appendChild(script);
  const autorender = document.createElement('script');
  autorender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  autorender.defer = true;
  document.head.appendChild(autorender);
})();

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
- Réponds toujours en français, de façon claire, précise et encourageante.
- Pour les formules mathématiques, utilise TOUJOURS la notation LaTeX : $formule$ pour inline, $$formule$$ pour display.
- Exemple : La formule quadratique est $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$
- Structure tes réponses avec des titres clairs.
- Si un étudiant envoie une photo d'épreuve, fournis une correction concise et structurée.
- Réponds de façon COURTE et DIRECTE, maximum 5-6 lignes sauf si l'étudiant demande plus.
- Pas d'introduction, pas de blabla, va droit au but.
- NE propose JAMAIS de questions de suivi.`
  };

  DB.subjects.filter(s=>s.active).forEach(s=>{
    prompts[String(s.id)] = `Tu es EnergyBot, expert en "${s.name}" (Licence ${s.level}) pour ERSE ACADEMY.
${s.desc ? 'Description : '+s.desc+'.' : ''}
${studentInfo}
RÈGLES IMPORTANTES :
- Réponds toujours en français avec des explications claires et des exemples concrets.
- Pour les formules mathématiques, utilise TOUJOURS LaTeX : $formule$ pour inline, $$formule$$ pour display.
- Exemple : $F = ma$, $$E = mc^2$$, $\\int_0^\\infty e^{-x} dx = 1$
- Si tu reçois une photo d'épreuve, fournis une correction concise étape par étape.
- Réponds de façon COURTE et DIRECTE, maximum 5-6 lignes sauf demande explicite.
- Pas d'introduction inutile, va droit au but.
- NE propose JAMAIS de questions de suivi.`;
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
    🔄 Conversation restaurée · <button onclick="clearEbChat()" style="background:none;border:none;color:var(--b6);cursor:pointer;font-size:12px;text-decoration:underline;">Effacer</button>
  </div>`;
  ebHistory.forEach(m=>{
    if(m.role === 'user'){
      // Vérifier si c'est un message avec image
      if(Array.isArray(m.content)){
        const text = m.content.find(c=>c.type==='text')?.text || '';
        addEbMsg('user', text + ' 📷');
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
  document.getElementById('eb-ctx-ic').textContent = icon;
  document.getElementById('eb-ctx-name').textContent = name;
  document.getElementById('eb-ctx-sub').textContent = desc;
  document.querySelectorAll('.eb-chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  const msgs = document.getElementById('eb-messages');
  msgs.innerHTML = `<div class="eb-welcome" id="eb-welcome">
    <div class="eb-welcome-avatar">⚡</div>
    <h2>EnergyBot — ${name}</h2>
    <p>Prêt à vous aider sur <strong>${name}</strong>. Posez vos questions ou envoyez une photo d'épreuve !</p>
    <div class="eb-starter-grid">
      <button class="eb-starter" onclick="sendStarter('Explique un concept clé de ${name} avec des formules')"><span class="eb-starter-ic">💡</span><span class="eb-starter-txt">Expliquer</span><span class="eb-starter-sub">Avec formules</span></button>
      <button class="eb-starter" onclick="sendStarter('Génère 5 exercices sur ${name} avec solutions détaillées')"><span class="eb-starter-ic">✏️</span><span class="eb-starter-txt">Exercices</span><span class="eb-starter-sub">Avec solutions</span></button>
      <button class="eb-starter" onclick="startQuizMode('${name}')"><span class="eb-starter-ic">🎯</span><span class="eb-starter-txt">Quiz</span><span class="eb-starter-sub">Mode interactif</span></button>
      <button class="eb-starter" onclick="sendStarter('Quels sont les sujets d\\'examen les plus fréquents en ${name} ?')"><span class="eb-starter-ic">📋</span><span class="eb-starter-txt">Examen</span><span class="eb-starter-sub">Sujets fréquents</span></button>
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
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  // Pas de capture forcé — laisse le choix entre caméra et galerie
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024){ toast('Image trop lourde (max 5MB)','err'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      ebPendingImage = ev.target.result; // base64
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
    <div style="flex:1;font-size:12px;color:var(--muted);">📷 Image prête à envoyer</div>
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
    .replace(/💡 \*\*Questions de suivi :\*\*/g,'<div class="eb-followup-title">💡 Questions de suivi</div>')
    .replace(/\n/g,'<br>');
}

function addEbMsg(role, content){
  const welcome = document.getElementById('eb-welcome');
  if(welcome) welcome.remove();
  const msgs = document.getElementById('eb-messages');
  const div = document.createElement('div');
  div.className = 'eb-msg ' + role;

  if(role === 'bot'){
    // Détecter les questions de suivi et les rendre cliquables
    const formattedContent = fmtEb(content);
    div.innerHTML = `<div class="eb-msg-avatar">⚡</div><div class="eb-bubble">${formattedContent}</div>`;
    msgs.appendChild(div);

    // Rendu KaTeX après insertion dans le DOM
    setTimeout(() => renderKaTeX(bubble), 100);
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
  if(welcome) welcome.remove();
  const msgs = document.getElementById('eb-messages');
  const div = document.createElement('div');
  div.className = 'eb-msg bot';
  div.id = 'eb-typing-ind';
  div.innerHTML = `<div class="eb-msg-avatar">⚡</div><div class="eb-bubble"><div class="eb-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeEbTyping(){
  const t = document.getElementById('eb-typing-ind');
  if(t) t.remove();
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
    displayMsg = (msg || 'Analyse cette épreuve') + ' 📷';
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

function promptApiKey(){
  const key = prompt('Entrez votre clé API Groq (gsk_...) :\n\n1. Allez sur console.groq.com\n2. Créez un compte GRATUIT\n3. API Keys → Create API Key\n4. Copiez et collez ici', ebApiKey);
  if(key !== null){ ebApiKey = key.trim() || GROQ_DEFAULT_KEY; localStorage.setItem('erse_api_key', ebApiKey); toast('Clé API mise à jour !', 'ok'); }
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
