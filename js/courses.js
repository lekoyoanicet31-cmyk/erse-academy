// ═══ courses.js ═══
/* ═══════════════════════════════════════════
   SYSTÈME DE NIVEAUX
═══════════════════════════════════════════ */
function getUserLevel(){ return currentUser ? (currentUser.level||1) : 1; }

function getLevelProgress(){
  const lvl = getUserLevel();
  const examsForLevel = DB.exams.filter(e=>{
    const s = DB.subjects.find(x=>x.id===e.subjectId);
    return s && s.level===lvl;
  });
  if(examsForLevel.length===0) return {total:0,done:0,avg:0,canPass:false};
  const results = DB.examResults || [];
  let totalScore = 0, done = 0;
  examsForLevel.forEach(e=>{
    const r = results.find(r=>r.examId===e.id);
    if(r){ totalScore += r.score; done++; }
  });
  const avg = done>0 ? Math.round(totalScore/examsForLevel.length) : 0;
  const canPass = done>0 && avg>=80;
  return {total:examsForLevel.length, done, avg, canPass};
}

function checkLevelAccess(targetLevel){
  const userLevel = getUserLevel();
  if(currentUser && currentUser.role==='admin') return true;
  return targetLevel <= userLevel;
}

async function requestLevelUp(){
  const lvl = getUserLevel();
  const prog = getLevelProgress();
  if(!prog.canPass){
    toast(`Score insuffisant : ${prog.avg}/100. Il faut 80/100 de moyenne.`,'err');
    return;
  }
  const newLevel = lvl + 1;
  if(newLevel > 3){ toast('Vous êtes déjà au niveau maximum !','ok'); return; }
  currentUser.level = newLevel;
  const stuIdx = DB.students.findIndex(s=>s.email===currentUser.email||s.id===currentUser.id);
  if(stuIdx!==-1) DB.students[stuIdx].level = newLevel;
  const usrIdx = DB.users.findIndex(u=>u.email===currentUser.email||u.id===currentUser.id);
  if(usrIdx!==-1) DB.users[usrIdx].level = newLevel;
  if(fbReady && currentUser.email){
    await firebase.firestore().collection('users').doc(currentUser.email).update({level: newLevel});
  }
  saveData();
  toast(`🎉 Félicitations ! Vous passez en Licence ${newLevel} !`,'ok');
  sendLevelUpEmail(currentUser.name, currentUser.email, newLevel);
  showLevelUpModal(newLevel);
  renderLevelBadge();
  goPage('courses');
}

function showLevelUpModal(newLevel){
  const el = document.createElement('div');
  el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  el.innerHTML=`
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:380px;width:100%;">
      <div style="font-size:3rem;margin-bottom:1rem;">🎓</div>
      <div style="font-size:1.4rem;font-weight:800;margin-bottom:.5rem;background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Niveau validé !</div>
      <div style="color:var(--muted);font-size:.9rem;margin-bottom:1.5rem;">Vous avez obtenu la moyenne requise et pouvez maintenant accéder à la <strong style="color:var(--text);">Licence ${newLevel}</strong>.</div>
      <button onclick="this.parentElement.parentElement.remove()" style="padding:.7rem 2rem;border-radius:10px;border:none;background:linear-gradient(90deg,#3b82f6,#10b981);color:#fff;font-weight:700;cursor:pointer;font-size:.95rem;font-family:var(--font-body);">Continuer →</button>
    </div>
  `;
  document.body.appendChild(el);
}

function renderLevelBadge(){
  const lvl = getUserLevel();
  const prog = getLevelProgress();
  const badge = document.getElementById('level-progress-badge');
  if(!badge) return;
  badge.innerHTML=`
    <div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;">
      <span style="background:rgba(59,130,246,.15);color:#60a5fa;padding:.2rem .6rem;border-radius:6px;font-weight:700;">L${lvl}</span>
      <span style="color:var(--muted);">${prog.done}/${prog.total} examens · ${prog.avg}/100</span>
      ${prog.canPass?`<button onclick="requestLevelUp()" style="padding:.2rem .7rem;border-radius:6px;border:none;background:#10b981;color:#fff;cursor:pointer;font-size:.75rem;font-weight:600;font-family:var(--font-body);">Passer en L${lvl+1} →</button>`:''}
    </div>
  `;
}

function filterLevel(l,btn){
  const isAdmin = currentUser && currentUser.role==='admin';
  const userLvl = getUserLevel();

  document.querySelectorAll('#lvl-tabs .tab').forEach(t=>{
    const tlvl = parseInt(t.dataset.lvl||1);
    if(!isAdmin && tlvl > userLvl){
      t.classList.remove('on');
      t.style.opacity='.4';
      t.style.cursor='not-allowed';
    } else {
      t.style.opacity='1';
      t.style.cursor='pointer';
    }
  });

  // Bloquer accès aux niveaux SUPÉRIEURS seulement
  if(!isAdmin && l > userLvl){
    toast(`🔒 Niveau L${l} verrouillé. Validez d'abord la Licence ${l-1} avec 80/100.`,'err');
    // Afficher le message de verrouillage
    const prog = getLevelProgress();
    document.getElementById('course-list').innerHTML=`
      <div style="text-align:center;padding:3rem 1rem;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;margin-top:.5rem;">
        <div style="font-size:2.5rem;margin-bottom:1rem;">🔒</div>
        <div style="font-weight:700;font-size:1.1rem;margin-bottom:.5rem;">Niveau L${l} verrouillé</div>
        <div style="color:var(--muted);font-size:.85rem;margin-bottom:1.2rem;">Validez la Licence ${l-1} avec 80/100 de moyenne.<br>Votre progression : <strong style="color:var(--text);">${prog.avg}/100</strong> (${prog.done}/${prog.total} examens)</div>
        ${prog.canPass?`<button onclick="requestLevelUp()" style="padding:.6rem 1.5rem;border-radius:10px;border:none;background:#10b981;color:#fff;cursor:pointer;font-weight:700;font-family:var(--font-body);">🎉 Valider ma Licence ${userLvl} →</button>`:`<div style="background:rgba(255,255,255,.05);border-radius:10px;padding:.8rem 1.5rem;font-size:.82rem;color:var(--muted);display:inline-block;">Complétez tous les examens L${userLvl} avec 80/100.</div>`}
      </div>
    `;
    renderLevelBadge();
    return;
  }

  // L'étudiant a accès à ce niveau — afficher les matières
  document.querySelectorAll('#lvl-tabs .tab').forEach(t=>t.classList.remove('on'));
  if(btn) btn.classList.add('on');

  const subjects = DB.subjects.filter(s=>s.level===l && s.active);
  document.getElementById('course-list').innerHTML = subjects.length===0
    ? `<div style="text-align:center;padding:2rem;color:var(--muted);">Aucune matière disponible pour ce niveau.</div>`
    : subjects.map(s=>{
        const files = (s.files||[]);
        const filesHtml = files.length===0
          ? `<div class="pdf-placeholder"><div class="pdf-placeholder-ic">📂</div><p>Aucun document pour l'instant.</p></div>`
          : files.map((f,i)=>{
              const fileName = f && typeof f==='object' ? (f.name||'Document') : String(f||'Document');
              const driveId = f && typeof f==='object' ? (f.driveId||null) : null;
              return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:.7rem .8rem;background:var(--card-bg);border:1px solid var(--border);border-radius:9px;margin-bottom:7px;flex-wrap:wrap;gap:.5rem;">
                <div style="display:flex;align-items:center;gap:9px;">
                  <div style="width:32px;height:32px;background:#FCEBEB;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📄</div>
                  <div>
                    <div style="font-size:13px;font-weight:500;">${fileName}</div>
                    <div style="font-size:11px;color:var(--muted);">PDF</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;">
                  ${driveId?`<button class="btn-pdf btn-view" onclick="previewPdf('${driveId}',${s.id},${i})">👁 Aperçu</button>`:''}
                  ${driveId?`<button class="btn-pdf btn-dl2" onclick="downloadPdf('${driveId}','${fileName.replace(/'/g,"\\'")}')">⬇ Télécharger</button>`:''}
                </div>
              </div>
              <div id="pdf-embed-${s.id}-${i}" style="display:none;margin-bottom:7px;"></div>`;
            }).join('');

        return `
        <div class="pdf-section">
          <div class="pdf-header" onclick="togglePdfSection(${s.id})">
            <div class="pdf-header-left">
              <div style="font-size:24px;">${s.icon||'📚'}</div>
              <div>
                <div class="pdf-name">${s.name}</div>
                <div class="pdf-meta">${files.length} document${files.length>1?'s':''} · L${s.level}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="pill-lvl l${s.level}p">L${s.level}</span>
              <span style="font-size:14px;color:var(--muted);" id="pdf-arrow-${s.id}">▼</span>
            </div>
          </div>
          <div class="pdf-preview" id="pdf-section-${s.id}">
            <div class="pdf-embed-area">${filesHtml}</div>
          </div>
        </div>`;
      }).join('');

  renderLevelBadge();
}

function togglePdfSection(id){
  const sec=document.getElementById('pdf-section-'+id);
  const arrow=document.getElementById('pdf-arrow-'+id);
  sec.classList.toggle('open');
  arrow.textContent=sec.classList.contains('open')?'▲':'▼';
}


