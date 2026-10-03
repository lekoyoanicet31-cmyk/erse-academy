// ═══ planning.js ═══
/* ═══════════════ PLANNING DE RÉVISION — tableau hebdomadaire coloré ═══════════════ */

const PLAN_DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

// Palette stable : un même nom de matière garde toujours la même couleur
// d'une génération à l'autre (basé sur un hash simple du nom).
const PLAN_PALETTE = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#6366f1'];
function subjColor(name){
  let h = 0;
  for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return PLAN_PALETTE[h % PLAN_PALETTE.length];
}

function planningLocalKey(){
  return 'erse_planning_' + (currentUser?.email || 'guest');
}

async function savePlanningToFirestore(weekTemplate, meta, remindersEnabled){
  const payload = {
    weekTemplate,
    meta,
    remindersEnabled: !!remindersEnabled,
    email: currentUser?.email || null,
    name: currentUser?.name || '',
    savedAt: new Date().toISOString()
  };
  // Toujours garder une copie locale d'abord : si Firestore n'est pas
  // encore prêt (fbReady peut rester false plusieurs secondes après la
  // connexion) ou si la requête échoue, le plan n'est pas perdu.
  try{ localStorage.setItem(planningLocalKey(), JSON.stringify(payload)); }catch(e){}
  if (!fbReady || !currentUser?.email) return false;
  try {
    await firebase.firestore().collection('plannings').doc(currentUser.email).set(payload);
    return true;
  } catch(e) { console.warn('savePlanning error:', e); return false; }
}

async function loadPlanningFromFirestore() {
  if (fbReady && currentUser?.email) {
    try {
      const snap = await firebase.firestore().collection('plannings').doc(currentUser.email).get();
      if (snap.exists) return snap.data();
    } catch(e) { console.warn('loadPlanning error:', e); }
  }
  try{
    const raw = localStorage.getItem(planningLocalKey());
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}

async function deletePlanning() {
  if (!confirm('Supprimer ton planning définitivement ?')) return;
  if (fbReady && currentUser?.email) {
    try { await firebase.firestore().collection('plannings').doc(currentUser.email).delete(); }
    catch(e) { console.warn('deletePlanning error:', e); }
  }
  try{ localStorage.removeItem(planningLocalKey()); }catch(e){}
  document.getElementById('plan-result').innerHTML = '';
  toast('Planning supprimé', 'ok');
}

async function toggleReminders(enabled){
  const saved = await loadPlanningFromFirestore();
  if(!saved || !saved.weekTemplate){ toast('Génère d\'abord un planning','err'); return; }
  await savePlanningToFirestore(saved.weekTemplate, saved.meta, enabled);
  toast(enabled ? '🔔 Rappels par email activés' : '🔕 Rappels par email désactivés', 'ok');
  renderPlanningResult(saved.weekTemplate, saved.meta, enabled);
}

/* ── Gabarit horaire selon le nombre d'heures/jour choisi ──
   Chaque entrée : {time, type, label}. type: 'matiere' | 'pause' | 'dejeuner' | 'relecture' | 'soiree'
   Les créneaux 'matiere' sont remplis dynamiquement avec une matière + une note. ── */
function buildDayTemplate(hours, isWeekend){
  if(hours <= 1){
    return [
      {time:'08:00-09:00', type:'matiere', note:'Cours + exercices'},
      {time:'Soirée', type:'soiree'}
    ];
  }
  if(hours === 2){
    return [
      {time:'08:00-10:00', type:'matiere', note:'Cours + exercices'},
      {time:'Soirée', type:'soiree'}
    ];
  }
  if(hours === 3){
    return [
      {time:'08:00-10:00', type:'matiere', note:'Cours + exercices'},
      {time:'10:00-10:15', type:'pause'},
      {time:'10:15-11:00', type:'matiere', note:'Révisions ciblées'},
      {time:'Soirée', type:'soiree'}
    ];
  }
  // 4h et plus : gabarit complet façon planning hebdomadaire classique
  return [
    {time:'08:00-10:00', type:'matiere', note:'Cours'},
    {time:'10:00-10:15', type:'pause'},
    {time:'10:15-12:00', type:'matiere-suite', note:'Exercices / QCM'},
    {time:'12:00-14:00', type:'dejeuner'},
    {time:'14:00-16:00', type:'matiere', note:'Révisions ciblées'},
    {time:'16:00-16:15', type:'pause'},
    {time:'16:15-18:00', type:'relecture'},
    {time:'Soirée', type:'soiree'}
  ];
}

function generateWeekPlan(hours, level){
  const subjects = DB.subjects.filter(s => s.active && s.level === level);
  if (!subjects.length) return null;

  const results = DB.examResults || [];
  const subjectScores = subjects.map(s => {
    const examsForSubj = DB.exams.filter(e => e.subjectId === s.id || parseInt(e.subjectId) === parseInt(s.id));
    const subjResults = results.filter(r => examsForSubj.some(e => e.id === r.examId || parseInt(e.id) === parseInt(r.examId)));
    const avg = subjResults.length ? Math.round(subjResults.reduce((a, r) => a + r.score, 0) / subjResults.length) : 0;
    return { ...s, avg, priority: avg === 0 ? 999 : (100 - avg) };
  }).sort((a, b) => b.priority - a.priority);

  // Pool pondéré : les matières faibles (ou jamais passées) reviennent plus souvent.
  const pool = [];
  subjectScores.forEach(s => {
    const weight = s.avg === 0 ? 3 : (s.avg < 50 ? 3 : s.avg < 70 ? 2 : 1);
    for (let i = 0; i < weight; i++) pool.push(s);
  });

  let poolIdx = 0;
  const nextSubject = () => { const s = pool[poolIdx % pool.length]; poolIdx++; return s; };

  const weekTemplate = PLAN_DAYS.map((dayName, i) => {
    const isWeekend = i >= 5; // Samedi, Dimanche
    const template = buildDayTemplate(hours, isWeekend);
    let lastSubject = null;
    const slots = template.map(slot => {
      if (slot.type === 'matiere') {
        const subj = nextSubject();
        lastSubject = subj;
        return { time: slot.time, type: 'matiere', subject: subj.name, icon: subj.icon || '📘', color: subjColor(subj.name), note: slot.note, avg: subj.avg };
      }
      if (slot.type === 'matiere-suite') {
        // Même matière que le créneau précédent (exercices de suite du cours)
        return { time: slot.time, type: 'matiere', subject: lastSubject ? lastSubject.name : '—', icon: lastSubject ? (lastSubject.icon || '📘') : '📘', color: lastSubject ? subjColor(lastSubject.name) : '#999', note: slot.note, avg: lastSubject ? lastSubject.avg : 0 };
      }
      if (slot.type === 'pause') return { time: slot.time, type: 'pause', label: 'Pause active' };
      if (slot.type === 'dejeuner') return { time: slot.time, type: 'dejeuner', label: 'Pause déjeuner & déconnexion' };
      if (slot.type === 'relecture') return { time: slot.time, type: 'relecture', label: 'Relecture flash' };
      if (slot.type === 'soiree') return { time: slot.time, type: 'soiree', label: isWeekend ? 'Détente' : (i % 2 === 1 ? 'Sport / Loisir' : 'Détente') };
      return slot;
    });
    return { day: dayName, slots };
  });

  return weekTemplate;
}

function renderPlanningResult(weekTemplate, meta, remindersEnabled){
  const examDate = meta?.dateVal ? new Date(meta.dateVal) : null;
  let weeksLeft = null;
  if(examDate){
    const today = new Date(); today.setHours(0,0,0,0);
    weeksLeft = Math.max(1, Math.ceil((examDate - today) / (7*86400000)));
  }

  // Lignes = créneaux du gabarit (identiques tous les jours pour un même nombre d'heures)
  const rows = weekTemplate[0].slots.map(s => s.time);

  const typeStyle = {
    matiere:   bg => `background:${bg}22;border-left:3px solid ${bg};color:var(--text);`,
    pause:     ()=> `background:var(--b0);color:var(--muted);font-style:italic;`,
    dejeuner:  ()=> `background:#fef3c7;color:#92400e;`,
    relecture: ()=> `background:#e0f2fe;color:#075985;`,
    soiree:    ()=> `background:#f3e8ff;color:#6b21a8;font-weight:600;`
  };
  const cellContent = (slot) => {
    if(slot.type==='matiere') return `<div style="font-weight:600;font-size:12px;">${slot.icon} ${slot.subject}</div><div style="font-size:10.5px;opacity:.85;margin-top:2px;">${slot.note}</div>`;
    return `<div style="font-size:11.5px;">${slot.label}</div>`;
  };
  const cellStyle = (slot) => {
    const fn = typeStyle[slot.type] || typeStyle.pause;
    return slot.type==='matiere' ? fn(slot.color) : fn();
  };

  const tableHtml = `
    <div style="overflow-x:auto;border-radius:14px;border:1px solid var(--border);">
      <table style="border-collapse:collapse;width:100%;min-width:680px;background:var(--card-bg);">
        <thead>
          <tr>
            <th style="padding:.6rem .8rem;text-align:left;font-size:11px;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;">Heure / Créneau</th>
            ${PLAN_DAYS.map(d=>`<th style="padding:.6rem .8rem;text-align:left;font-size:12px;font-weight:700;color:var(--b8);border-bottom:1px solid var(--border);white-space:nowrap;">${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((time, rowIdx) => `
            <tr>
              <td style="padding:.6rem .8rem;font-size:11.5px;color:var(--muted);white-space:nowrap;border-bottom:1px solid var(--border);">${time}</td>
              ${weekTemplate.map(day => {
                const slot = day.slots[rowIdx];
                return `<td style="padding:.6rem .7rem;font-size:12px;border-bottom:1px solid var(--border);min-width:140px;${cellStyle(slot)}">${cellContent(slot)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('plan-result').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">'
    + '<div style="font-size:13px;font-weight:600;color:var(--b8);">📋 Ton planning hebdomadaire'
    + (weeksLeft ? ' — ' + weeksLeft + ' semaine' + (weeksLeft>1?'s':'') + ' avant l\'examen' : '') + '</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="toggleReminders(' + (!remindersEnabled) + ')" style="padding:.35rem .9rem;border-radius:8px;border:1px solid var(--border);background:' + (remindersEnabled?'var(--g)':'transparent') + ';color:' + (remindersEnabled?'var(--gc)':'var(--muted)') + ';cursor:pointer;font-size:.78rem;font-weight:600;font-family:var(--font-body);">' + (remindersEnabled?'🔔 Rappels activés':'🔕 Activer les rappels email') + '</button>'
    + '<button onclick="deletePlanning()" style="padding:.35rem .9rem;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:.78rem;font-weight:600;font-family:var(--font-body);">🗑 Supprimer</button>'
    + '</div></div>'
    + tableHtml
    + '<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:.7rem;">Les matières avec les scores les plus bas reviennent plus souvent dans la semaine. Ce planning se répète chaque semaine jusqu\'à ton examen.</div>';
}

let planningLoaded = false;

async function initPlanning() {
  if (currentUser) {
    const sel = document.getElementById('plan-level');
    if (sel) sel.value = currentUser.level || 1;
  }
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  const inp = document.getElementById('plan-date');
  if (inp) inp.min = minDate.toISOString().split('T')[0];

  if (!planningLoaded) {
    const saved = await loadPlanningFromFirestore();
    if (saved && saved.weekTemplate && saved.weekTemplate.length) {
      planningLoaded = true;
      renderPlanningResult(saved.weekTemplate, saved.meta, saved.remindersEnabled);
    }
  }
}

async function generatePlanning() {
  const dateVal = document.getElementById('plan-date').value;
  const hours = parseInt(document.getElementById('plan-hours').value);
  const level = parseInt(document.getElementById('plan-level').value);

  if (!dateVal) { toast('Choisis une date d\'examen', 'err'); return; }
  const examDate = new Date(dateVal);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((examDate - today) / 86400000);
  if (daysLeft < 2) { toast('Choisis une date dans au moins 2 jours', 'err'); return; }

  const weekTemplate = generateWeekPlan(hours, level);
  if (!weekTemplate) { toast('Aucune matière trouvée pour ce niveau', 'err'); return; }

  const meta = { dateVal, hours, level, generatedAt: new Date().toISOString() };
  renderPlanningResult(weekTemplate, meta, false);
  const synced = await savePlanningToFirestore(weekTemplate, meta, false);
  toast(synced ? 'Planning généré et synchronisé ✅' : 'Planning généré (sauvegardé localement, sync en attente)', synced ? 'ok' : 'info');
}

/* ═══════════════ SYSTÈME XP & NIVEAUX ═══════════════ */
const XP_LEVELS = [
  { level: 1, name: 'Novice', xpRequired: 0, icon: '🌱' },
  { level: 2, name: 'Apprenti', xpRequired: 100, icon: '📖' },
  { level: 3, name: 'Étudiant', xpRequired: 300, icon: '🎯' },
  { level: 4, name: 'Avancé', xpRequired: 600, icon: '⭐' },
  { level: 5, name: 'Expert', xpRequired: 1000, icon: '🔥' },
  { level: 6, name: 'Maître', xpRequired: 1500, icon: '💎' },
  { level: 7, name: 'Champion', xpRequired: 2000, icon: '👑' },
];

function getUserXP(user) {
  return (user.passed || 0) * 50 + (user.certs || 0) * 100 + Math.max(0, ((user.avgScore || 0) - 50) * 2);
}

function getXPLevel(xp) {
  let lvl = XP_LEVELS[0];
  for (const l of XP_LEVELS) {
    if (xp >= l.xpRequired) lvl = l;
    else break;
  }
  return lvl;
}

function getNextLevel(xp) {
  for (const l of XP_LEVELS) {
    if (xp < l.xpRequired) return l;
  }
  return null;
}

function renderXPBar(user) {
  const xp = getUserXP(user);
  const lvl = getXPLevel(xp);
  const next = getNextLevel(xp);
  const pct = next ? Math.round(((xp - lvl.xpRequired) / (next.xpRequired - lvl.xpRequired)) * 100) : 100;
  return `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:.8rem;">
        <span style="font-size:24px;">${lvl.icon}</span>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:500;color:var(--b9);">Niveau ${lvl.level} — ${lvl.name}</div>
          <div style="font-size:11px;color:var(--muted);">${xp} XP total${next ? ' · ' + next.xpRequired + ' XP pour ' + next.name : ' · Niveau maximum !'}</div>
        </div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:600;color:var(--gold-d);">${xp} XP</div>
      </div>
      <div style="height:8px;background:var(--b0);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--b4));border-radius:4px;transition:width 1s;"></div>
      </div>
      ${next ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:right;">${pct}% vers ${next.name} ${next.icon}</div>` : ''}
    </div>
  `;
}
