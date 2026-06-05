// ═══ energybot.js ═══
/* ═══════════════════════════════════════════
   ENERGYBOT
═══════════════════════════════════════════ */
// Générer les prompts dynamiquement depuis les matières réelles
function getEbPrompts(){
  const prompts = {
    general: `Tu es EnergyBot, assistant pédagogique IA de ERSE ACADEMY. 
Tu aides les étudiants dans les matières suivantes : ${DB.subjects.filter(s=>s.active).map(s=>s.name).join(', ')}.
Réponds toujours en français, de façon claire, précise et encourageante.
Si un étudiant pose une question hors sujet, redirige-le poliment vers ses cours.`
  };
  // Générer un prompt pour chaque matière active
  DB.subjects.filter(s=>s.active).forEach(s=>{
    prompts[String(s.id)] = `Tu es EnergyBot, expert en "${s.name}" (Licence ${s.level}) pour ERSE ACADEMY.
${s.desc ? 'Description du cours : '+s.desc+'.' : ''}
Tu aides les étudiants à comprendre cette matière, à résoudre des exercices et à préparer leurs examens.
Réponds toujours en français, avec des exemples concrets et des explications claires.
Si on te pose des questions hors de cette matière, tu peux aider brièvement mais rappelle que tu es spécialisé en ${s.name}.`;
  });
  return prompts;
}

function renderEbChips(){
  const wrap = document.getElementById('eb-subject-chips');
  if(!wrap) return;
  const subjects = DB.subjects.filter(s=>s.active);
  if(!subjects.length){ wrap.innerHTML=''; return; }

  // Grouper par niveau
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
}

function setEbCtx(id,icon,name,desc,el){
  ebCtx={id,icon,name,desc};ebHistory=[];
  document.getElementById('eb-ctx-ic').textContent=icon;
  document.getElementById('eb-ctx-name').textContent=name;
  document.getElementById('eb-ctx-sub').textContent=desc;
  document.querySelectorAll('.eb-chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  const msgs=document.getElementById('eb-messages');
  msgs.innerHTML=`<div class="eb-welcome" id="eb-welcome">
    <div class="eb-welcome-avatar">⚡</div>
    <h2>EnergyBot — ${name}</h2>
    <p>Prêt à vous aider sur <strong>${name}</strong>. Posez vos questions !</p>
    <div class="eb-starter-grid">
      <button class="eb-starter" onclick="sendStarter('Explique un concept clé de ${name}')"><span class="eb-starter-ic">💡</span><span class="eb-starter-txt">Expliquer</span><span class="eb-starter-sub">Explication claire</span></button>
      <button class="eb-starter" onclick="sendStarter('Génère 5 exercices sur ${name}')"><span class="eb-starter-ic">✏️</span><span class="eb-starter-txt">Exercices</span><span class="eb-starter-sub">S\'entraîner</span></button>
      <button class="eb-starter" onclick="sendStarter('Résumé des points clés de ${name}')"><span class="eb-starter-ic">📋</span><span class="eb-starter-txt">Résumé</span><span class="eb-starter-sub">Points essentiels</span></button>
      <button class="eb-starter" onclick="sendStarter('Conseils pour l\'examen de ${name}')"><span class="eb-starter-ic">🎯</span><span class="eb-starter-txt">Examen</span><span class="eb-starter-sub">Sujets fréquents</span></button>
    </div>
  </div>`;
}
function clearEbChat(){ebHistory=[];document.getElementById('eb-messages').innerHTML='';setEbCtx(ebCtx.id,ebCtx.icon,ebCtx.name,ebCtx.desc);}
function promptApiKey(){
  const key=prompt('Entrez votre clé API Groq (gsk_...) :\n\n1. Allez sur console.groq.com\n2. Créez un compte GRATUIT (pas de CB)\n3. API Keys → Create API Key\n4. Copiez et collez ici',ebApiKey);
  if(key!==null){ebApiKey=key.trim()||GROQ_DEFAULT_KEY;localStorage.setItem('erse_api_key',ebApiKey);toast('Clé API mise à jour !','ok');}
}
function autoEbResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,110)+'px';}
function sendStarter(text){document.getElementById('eb-input').value=text;sendEbMessage();}
function addEbMsg(role,content){
  const welcome=document.getElementById('eb-welcome');if(welcome)welcome.remove();
  const msgs=document.getElementById('eb-messages');
  const div=document.createElement('div');div.className='eb-msg '+role;
  div.innerHTML=`<div class="eb-msg-avatar">${role==='bot'?'⚡':(currentUser?currentUser.initials:'Moi')}</div><div class="eb-bubble">${fmtEb(content)}</div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}
function fmtEb(t){return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^### (.*)/gm,'<strong style="font-size:13px;color:var(--b8);">$1</strong>').replace(/^## (.*)/gm,'<strong style="font-size:14px;color:var(--b9);">$1</strong>').replace(/^- (.*)/gm,'<li>$1</li>').replace(/\n/g,'<br>');}
function showEbTyping(){
  const welcome=document.getElementById('eb-welcome');if(welcome)welcome.remove();
  const msgs=document.getElementById('eb-messages');
  const div=document.createElement('div');div.className='eb-msg bot';div.id='eb-typing-ind';
  div.innerHTML=`<div class="eb-msg-avatar">⚡</div><div class="eb-bubble"><div class="eb-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}
function removeEbTyping(){const t=document.getElementById('eb-typing-ind');if(t)t.remove();}
async function sendEbMessage(){
  const input=document.getElementById('eb-input');
  const msg=input.value.trim();
  if(!msg||ebTyping)return;
  input.value='';input.style.height='auto';
  ebTyping=true;document.getElementById('eb-send').disabled=true;
  addEbMsg('user',msg);
  ebHistory.push({role:'user',content:msg});
  showEbTyping();
  const EB_PROMPTS=getEbPrompts(); const sysPrompt=EB_PROMPTS[ebCtx.id]||EB_PROMPTS.general;
  const messages=[{role:'system',content:sysPrompt},...ebHistory];
  try{
    const res=await fetch(GROQ_PROXY_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:messages})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error?.message||'Erreur proxy');
    const reply=data.choices?.[0]?.message?.content||'Désolé, pas de réponse.';
    removeEbTyping();addEbMsg('bot',reply);
    ebHistory.push({role:'assistant',content:reply});
    if(ebHistory.length>20)ebHistory=ebHistory.slice(-20);
  }catch(err){
    removeEbTyping();
    let errMsg='Erreur de connexion.';
    if(err.message.includes('429'))errMsg='Limite atteinte. Attendez quelques secondes.';
    else errMsg='Erreur : '+err.message;
    addEbMsg('bot','⚠️ '+errMsg);toast(errMsg,'err');
  }
  ebTyping=false;document.getElementById('eb-send').disabled=false;document.getElementById('eb-input').focus();
}

function renderAdminDocs(){
  const el=document.getElementById('at-docs-a');
  if(!el){return;}
  el.innerHTML='<div class="admin-ttl">📄 Gestion des documents</div><div id="docs-add-form" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1.3rem;margin-bottom:1.2rem;"><div style="font-size:13px;font-weight:500;color:var(--b8);margin-bottom:1rem;">➕ Ajouter un document</div><div style="margin-bottom:.8rem;"><label class="form-lbl">Matière</label><select id="doc-subj" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);">'+DB.subjects.filter(s=>s.active).map(s=>'<option value="'+s.id+'">'+s.icon+' '+s.name+' (L'+s.level+')</option>').join('')+'</select></div><div style="margin-bottom:.8rem;"><label class="form-lbl">Nom du document</label><input id="doc-name" placeholder="Ex: Cours 1 — Fonctions.pdf" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);outline:none;"></div><div style="margin-bottom:1rem;"><label class="form-lbl">Lien PDF (optionnel)</label><input id="doc-url" placeholder="https://drive.google.com/... ou laisser vide" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);outline:none;"></div><button onclick="addDoc()" style="background:var(--b9);color:#fff;font-family:var(--font-body);font-size:13px;font-weight:500;padding:9px 22px;border-radius:9px;border:none;cursor:pointer;">+ Ajouter le document</button></div><div id="docs-list"></div>';
  refreshDocsList();
}

function refreshDocsList(){
  const el=document.getElementById('docs-list');
  if(!el)return;
  if(!DB.subjects.filter(s=>s.active).length){el.innerHTML='<div style="color:var(--muted);font-size:13px;">Aucune matière active.</div>';return;}
  el.innerHTML=DB.subjects.filter(s=>s.active).map(s=>{
    const files=s.files||[];
    return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;background:var(--b0);border-bottom:1px solid var(--border);">'
      +'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">'+s.icon+'</span><span style="font-size:14px;font-weight:500;color:var(--b9);">'+s.name+'</span><span class="pill-lvl l'+s.level+'p">L'+s.level+'</span></div>'
      +'<span style="font-size:12px;color:var(--muted);">'+files.length+' document(s)</span>'
      +'</div>'
      +'<div style="padding:.8rem 1rem;">'
      +(files.length===0
        ? '<div style="font-size:12px;color:var(--muted);padding:.3rem 0;">Aucun document — ajoutez-en via le formulaire ci-dessus.</div>'
        : files.map((f,i)=>{
            const fileName = typeof f==='object' ? f.name : (f.includes('__NAME__') ? f.split('__NAME__')[1] : f.replace(/<[^>]+>/g,''));
            const hasDrive = typeof f==='object' && f.driveId;
            return '<div style="display:flex;align-items:center;gap:8px;padding:.6rem 0;border-bottom:1px solid var(--border);">'
              +'<span style="font-size:15px;">📄</span>'
              +'<span style="flex:1;font-size:13px;">'+fileName+(hasDrive?' <span style="font-size:10px;background:var(--g);color:var(--gc);padding:1px 6px;border-radius:10px;border:1px solid #97C459;">🔗 Drive</span>':'')+'</span>'
              +'<button class="act-btn edit-btn" onclick="editDoc('+s.id+','+i+')">✏ Renommer</button>'
              +'<button class="act-btn edit-btn" onclick="editDocUrl('+s.id+','+i+')">🔗 Lien</button>'
              +'<button class="act-btn del-btn" onclick="deleteDoc('+s.id+','+i+')">🗑</button>'
              +'</div>';
          }).join('')
      )
      +'</div></div>';
  }).join('');
}

function addDoc(){
  const subjId=+document.getElementById('doc-subj').value;
  const name=document.getElementById('doc-name').value.trim();
  const url=document.getElementById('doc-url').value.trim();
  if(!name){toast('Nom du document requis','err');return;}
  const s=DB.subjects.find(x=>x.id===subjId);
  if(!s.files)s.files=[];
  // Extraire l'ID Google Drive si c'est un lien Drive
  let fileObj;
  if(url && url.includes('drive.google.com')){
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveId = match ? match[1] : null;
    fileObj = driveId ? {name, driveId} : {name};
  } else if(url) {
    fileObj = {name, url};
  } else {
    fileObj = {name};
  }
  s.files.push(fileObj);
  s.docs=s.files.length;
  document.getElementById('doc-name').value='';
  document.getElementById('doc-url').value='';
  if(fbReady)fbSaveSubject(s).catch(e=>console.warn(e));saveData();pushToRTDB();toast('Document ajouté à '+s.name+' !','ok');
  refreshDocsList();
}

function deleteDoc(subjId,idx){
  const s=DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files)return;
  if(!confirm('Supprimer ce document ?'))return;
  s.files.splice(idx,1);
  s.docs=s.files.length;
  if(fbReady)fbSaveSubject(s).catch(e=>console.warn(e));saveData();pushToRTDB();toast('Document supprimé','ok');
  refreshDocsList();
}

function editDoc(subjId,idx){
  const s=DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files)return;
  const current=s.files[idx].includes('__NAME__')?s.files[idx].split('__NAME__')[1]:s.files[idx].replace(/<[^>]+>/g,'');
  const newName=prompt('Nouveau nom du document :',current);
  if(!newName||!newName.trim())return;
  const url=s.files[idx].includes('__LINK__')?s.files[idx].split('__LINK__')[1].split('__NAME__')[0]:'';
  s.files[idx]=url?'__LINK__'+url+'__NAME__'+newName.trim():newName.trim();
  if(fbReady)fbSaveSubject(s).catch(e=>console.warn(e));saveData();pushToRTDB();toast('Renommé !','ok');
  refreshDocsList();
}

function editDocUrl(subjId,idx){
  const s=DB.subjects.find(x=>x.id===subjId);
  if(!s||!s.files)return;
  const current=s.files[idx].includes('__LINK__')?s.files[idx].split('__LINK__')[1].split('__NAME__')[0]:'';
  const newUrl=prompt('Lien vers le PDF (laisser vide pour supprimer le lien) :',current);
  if(newUrl===null)return;
  const name=s.files[idx].includes('__NAME__')?s.files[idx].split('__NAME__')[1]:s.files[idx].replace(/<[^>]+>/g,'');
  s.files[idx]=newUrl.trim()?'__LINK__'+newUrl.trim()+'__NAME__'+name:name;
  toast('Lien mis à jour !','ok');
  refreshDocsList();
}

