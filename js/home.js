// ═══ home.js ═══
/* ═══════════════════════════════════════════
   HOME
═══════════════════════════════════════════ */
function renderHome(){
  const total=DB.subjects.reduce((a,s)=>a+s.docs,0);
  const totalCerts=DB.students.reduce((a,s)=>a+s.certs,0)+(currentUser?DB.certificates.length:0);
  document.getElementById('stats-bar').innerHTML=[
    {n:DB.subjects.filter(s=>s.active).length,l:'Matières actives'},
    {n:DB.exams.length,l:'Examens disponibles'},
    {n:total,l:'Documents gratuits'},
    {n:totalCerts,l:'Certificats délivrés'},
  ].map(s=>`<div class="si"><div class="sn">${s.n}</div><div class="sl">${s.l}</div></div>`).join('');
  document.getElementById('home-cards').innerHTML=DB.subjects.filter(s=>s.active).slice(0,6).map(cardHtml).join('');
  // Animer les compteurs hero
  animateCounter('hero-count-1', DB.students.length);
  animateCounter('hero-count-2', DB.students.reduce((a,s)=>a+s.certs,0)+DB.certificates.length);
  animateCounter('hero-count-3', DB.subjects.reduce((a,s)=>a+s.docs,0));
  animateCounter('hero-count-4', DB.exams.length);
  const top3=[...DB.students].sort((a,b)=>b.avgScore-a.avgScore).slice(0,3);
  const medals=['🥇','🥈','🥉'];
  document.getElementById('home-top3').innerHTML=top3.map((s,i)=>`
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.1rem;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">${medals[i]}</span>
      <div class="avatar" style="background:${s.color}22;color:${s.color};font-size:11px;font-weight:600;">${s.initials}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;">${s.name}</div><div style="font-size:11px;color:var(--muted);">${s.certs} certs · L${s.level}</div></div>
      <div style="font-family:var(--font-display);font-size:17px;font-weight:600;color:var(--gold-d);">${s.avgScore}%</div>
    </div>`).join('');
  // Afficher les examens disponibles avec minuteur de session
  renderExamCountdowns();
}

let countdownInterval = null;

function renderExamCountdowns(){
  const wrap = document.getElementById('home-exam-countdowns');
  if(!wrap) return;
  if(DB.exams.length===0){ wrap.innerHTML=''; return; }

  // Afficher les 3 premiers examens avec un compteur de session
  const examsToShow = DB.exams.slice(0,3);
  wrap.innerHTML = `
    <div style="margin-top:1.5rem;">
      <div style="font-family:var(--font-display);font-size:17px;font-weight:600;color:var(--b9);margin-bottom:1rem;">⏳ Examens disponibles</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${examsToShow.map(e=>{
          const s=DB.subjects.find(x=>x.id===e.subjectId||parseInt(x.id)===parseInt(e.subjectId));
          const mins = e.questions.length * 2;
          return `
            <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1rem 1.2rem;display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-size:24px;">${s?s.icon:'📝'}</div>
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--text);">${e.title||s?.name||'Examen'}</div>
                  <div style="font-size:11px;color:var(--muted);">📋 ${e.questions.length} questions · ⏱ ${mins} min · ${e.difficulty==='Avancé'||e.difficulty==='hard'?'🔴 Avancé':e.difficulty==='Intermédiaire'||e.difficulty==='medium'?'🟡 Intermédiaire':'🟢 Débutant'}</div>
                </div>
              </div>
              <button class="btn-start" onclick="goPage('exams')" style="white-space:nowrap;font-size:12px;padding:7px 14px;">Commencer →</button>
            </div>`;
        }).join('')}
        ${DB.exams.length>3?`<div style="text-align:center;"><button onclick="goPage('exams')" style="font-size:13px;color:var(--gold-d);background:none;border:none;cursor:pointer;font-family:var(--font-body);">Voir tous les examens (${DB.exams.length}) →</button></div>`:''}
      </div>
    </div>`;
}

function cardHtml(s){
  const ex=DB.exams.find(e=>parseInt(e.subjectId)===parseInt(s.id)||String(e.subjectId)===String(s.id));
  const examCount=DB.exams.filter(e=>parseInt(e.subjectId)===parseInt(s.id)||String(e.subjectId)===String(s.id)).length;
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div class="c-ico">${s.icon}</div><span class="pill-lvl l${s.level}p">L${s.level}</span>
    </div>
    <div class="c-ttl">${s.name}</div>
    <div class="c-sub">${s.docs} documents${s.desc?' · '+s.desc:''}${examCount?' · '+examCount+' examen(s)':''}</div>
    <div class="c-acts">
      <button class="bs bs-dl" onclick="goPage('courses')">📂 Documents</button>
      ${ex?`<button class="bs bs-ex" onclick="goPage('exams')">✏ Examen</button>`:''}
    </div>
  </div>`;
}
