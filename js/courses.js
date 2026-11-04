// ═══ courses.js ═══
/* ═══════════════════════════════════════════
   SYSTÈME DE NIVEAUX
═══════════════════════════════════════════ */
function getUserLevel(){ return currentUser ? (currentUser.level||1) : 1; }

function getUserExamResultMap(user, results=DB.examResults||[]){
  const userKey=String(user?.email||user?.id||'');
  const bestByExam=new Map();
  if(!userKey) return bestByExam;
  results.forEach(result=>{
    if(!result||String(result.userId||'')!==userKey||result.examId==null) return;
    const key=String(result.examId), score=Math.max(0,Math.min(100,Number(result.score)||0));
    const prior=bestByExam.get(key);
    if(!prior||score>prior.score) bestByExam.set(key,{...result,score});
  });
  return bestByExam;
}

function getLevelProgressForUser(user, results=DB.examResults||[]){
  const level=Number(user?.level)||1;
  const exams=DB.exams.filter(exam=>{
    const subject=DB.subjects.find(s=>String(s.id)===String(exam.subjectId));
    return subject&&Number(subject.level)===level;
  });
  const bestByExam=getUserExamResultMap(user,results);
  if(!exams.length) return {level,total:0,done:0,passed:0,avg:0,canPass:false};
  let totalScore=0,done=0,passed=0;
  exams.forEach(exam=>{
    const result=bestByExam.get(String(exam.id));
    if(result){done++;totalScore+=result.score;if(result.score>=70)passed++;}
  });
  // La note de progression est la moyenne sur tous les examens de la Licence.
  // Les examens non commencés valent zéro; les reprises gardent le meilleur score.
  const avg=Math.round(totalScore/exams.length);
  return {level,total:exams.length,done,passed,avg,canPass:done>0&&avg>=80};
}

function calculateUserProgressStats(user, results=DB.examResults||[]){
  const exams=DB.exams||[];
  const bestByExam=getUserExamResultMap(user,results);
  let done=0,passed=0;
  exams.forEach(exam=>{
    const result=bestByExam.get(String(exam.id));
    if(result){done++;if(result.score>=70)passed++;}
  });
  // Le classement mesure les examens validés sur tout le cursus, pas les notes obtenues.
  const progress=exams.length?Math.round(passed/exams.length*100):0;
  return {levelProgress:progress,levelDone:done,levelPassed:passed,levelTotal:exams.length,statsVersion:2};
}

function syncUserProgressStats(user=currentUser){
  if(!user) return null;
  const stats=calculateUserProgressStats(user);
  Object.assign(user,stats);
  const account=DB.users.find(u=>(user.email&&u.email===user.email)||String(u.id)===String(user.id));
  if(account) Object.assign(account,stats,{level:user.level});
  const student=DB.students.find(s=>(user.email&&s.email===user.email)||String(s.id)===String(user.id));
  if(student) Object.assign(student,stats,{level:user.level});
  return stats;
}

function getLevelProgress(){return getLevelProgressForUser(currentUser||{level:1});}

function checkLevelAccess(targetLevel){
  if(currentUser && currentUser.role==='admin') return true;
  return targetLevel <= getUserLevel();
}

// Grise/verrouille les boutons de niveau inaccessibles. levelOf(btn) doit
// renvoyer le niveau (1/2/3) représenté par ce bouton, ou null/undefined
// pour un bouton qui n'est pas lié à un niveau précis (ex: "Toutes", "Mon niveau").
function applyLevelLockUI(selector, levelOf){
  document.querySelectorAll(selector).forEach(btn=>{
    const lvl = levelOf(btn);
    if(lvl===null || lvl===undefined || isNaN(lvl)) return;
    const locked = !checkLevelAccess(lvl);
    btn.style.opacity = locked ? '.45' : '';
    btn.style.cursor = locked ? 'not-allowed' : 'pointer';
    if(locked && !btn.dataset.lockApplied){
      btn.innerHTML = '🔒 ' + btn.innerHTML;
      btn.dataset.lockApplied = '1';
    } else if(!locked && btn.dataset.lockApplied){
      btn.innerHTML = btn.innerHTML.replace('🔒 ', '');
      btn.dataset.lockApplied = '';
    }
  });
}

async function requestLevelUp(){
  const prog = getLevelProgress();
  if(!prog.canPass){
    toast('Il faut au moins 80% de moyenne aux examens de ce niveau pour débloquer le suivant','err');
    return;
  }
  const lvl = getUserLevel();
  const newLevel = lvl + 1;
  if(newLevel > 3){ toast('Vous êtes déjà au niveau maximum !','ok'); return; }
  currentUser.level = newLevel;
  syncUserProgressStats(currentUser);
  const stuIdx = DB.students.findIndex(s=>s.email===currentUser.email||s.id===currentUser.id);
  if(stuIdx!==-1) DB.students[stuIdx].level = newLevel;
  const usrIdx = DB.users.findIndex(u=>u.email===currentUser.email||u.id===currentUser.id);
  if(usrIdx!==-1) DB.users[usrIdx].level = newLevel;
  if(fbReady && currentUser.email){
    await firebase.firestore().collection('users').doc(currentUser.email).update({level:newLevel,levelProgress:currentUser.levelProgress,levelDone:currentUser.levelDone,levelPassed:currentUser.levelPassed,levelTotal:currentUser.levelTotal,statsVersion:currentUser.statsVersion});
  }
  if(typeof syncPublicProfile==='function') syncPublicProfile(currentUser).catch(e=>console.warn('Profil public non synchronisé:',e));
  saveData();
  toast(`🎉 Félicitations ! Vous passez en Licence ${newLevel} !`,'ok');
  sendLevelUpEmail(currentUser.name, currentUser.email, newLevel);
  pushNotif('Niveau supérieur débloqué','Vous passez en Licence '+newLevel+'. Les cours, examens et épreuves de ce niveau sont désormais accessibles.','🚀','#c0dd97','courses');
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
      <div style="color:var(--muted);font-size:.9rem;margin-bottom:1.5rem;">Vous pouvez maintenant accéder à la <strong style="color:var(--text);">Licence ${newLevel}</strong>.</div>
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
    </div>
  `;
}

function filterLevel(l,btn){
  if(!checkLevelAccess(l)){
    toast('🔒 Valide ta Licence actuelle avec 80% de moyenne pour débloquer ce niveau','err');
    applyLevelLockUI('#lvl-tabs .tab', b=>parseInt(b.dataset.lvl));
    return;
  }

  document.querySelectorAll('#lvl-tabs .tab').forEach(t=>t.classList.remove('on'));
  if(btn) btn.classList.add('on');
  applyLevelLockUI('#lvl-tabs .tab', b=>parseInt(b.dataset.lvl));

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
