// ═══ planning.js ═══
/* ═══════════════ PLANNING DE RÉVISION ═══════════════ */

async function savePlanningToFirestore(plan, meta) {
  if (!fbReady || !currentUser?.email) return;
  try {
    await firebase.firestore().collection('plannings').doc(currentUser.email).set({
      plan,
      meta,
      savedAt: new Date().toISOString()
    });
  } catch(e) { console.warn('savePlanning error:', e); }
}

async function loadPlanningFromFirestore() {
  if (!fbReady || !currentUser?.email) return null;
  try {
    const snap = await firebase.firestore().collection('plannings').doc(currentUser.email).get();
    if (snap.exists) return snap.data();
  } catch(e) { console.warn('loadPlanning error:', e); }
  return null;
}

async function deletePlanning() {
  if (!confirm('Supprimer ton planning définitivement ?')) return;
  if (fbReady && currentUser?.email) {
    try {
      await firebase.firestore().collection('plannings').doc(currentUser.email).delete();
    } catch(e) { console.warn('deletePlanning error:', e); }
  }
  document.getElementById('plan-result').innerHTML = '';
  toast('Planning supprimé', 'ok');
}

function renderPlanningResult(plan, meta) {
  const colors = ['var(--b4)', '#8b5cf6', 'var(--gc)', '#f59e0b', '#ec4899'];
  const daysLeft = plan.length;
  document.getElementById('plan-result').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">'
    + '<div style="font-size:13px;font-weight:600;color:var(--b8);">📋 Ton planning — ' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + ' de révision</div>'
    + '<button onclick="deletePlanning()" style="padding:.35rem .9rem;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:.78rem;font-weight:600;font-family:var(--font-body);">🗑 Supprimer</button>'
    + '</div>'
    + plan.map((day, i) => {
        const col = day.special ? '#ef4444' : colors[i % colors.length];
        return '<div style="background:var(--card-bg);border:1px solid var(--border);border-left:4px solid ' + col + ';border-radius:12px;padding:1rem;margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;">'
          + '<div style="font-size:12px;font-weight:600;color:' + col + ';">' + day.date + '</div>'
          + (day.score > 0 ? '<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:' + (day.score >= 70 ? 'var(--g)' : day.score >= 50 ? 'var(--a)' : 'var(--r)') + ';color:' + (day.score >= 70 ? 'var(--gc)' : day.score >= 50 ? 'var(--ac)' : 'var(--rc)') + ';">' + day.score + '% moy.</span>' : '')
          + '</div>'
          + day.tasks.map(t => '<div style="font-size:12px;color:var(--text);padding:3px 0;display:flex;gap:6px;align-items:flex-start;"><span>' + t + '</span></div>').join('')
          + '</div>';
      }).join('')
    + '<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:.5rem;">Les matières avec les scores les plus bas sont placées en priorité</div>';
}

async function initPlanning() {
  if (currentUser) {
    const sel = document.getElementById('plan-level');
    if (sel) sel.value = currentUser.level || 1;
  }
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  const inp = document.getElementById('plan-date');
  if (inp) inp.min = minDate.toISOString().split('T')[0];

  // Charger le planning sauvegardé
  const saved = await loadPlanningFromFirestore();
  if (saved && saved.plan && saved.plan.length) {
    renderPlanningResult(saved.plan, saved.meta);
    toast('Planning chargé ✅', 'ok');
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

  const subjects = DB.subjects.filter(s => s.active && s.level === level);
  if (!subjects.length) { toast('Aucune matière trouvée pour ce niveau', 'err'); return; }

  const results = DB.examResults || [];
  const subjectScores = subjects.map(s => {
    const examsForSubj = DB.exams.filter(e => e.subjectId === s.id || parseInt(e.subjectId) === parseInt(s.id));
    const subjResults = results.filter(r => examsForSubj.some(e => e.id === r.examId || parseInt(e.id) === parseInt(r.examId)));
    const avg = subjResults.length ? Math.round(subjResults.reduce((a, r) => a + r.score, 0) / subjResults.length) : 0;
    return { ...s, avg, priority: avg === 0 ? 999 : (100 - avg) };
  }).sort((a, b) => b.priority - a.priority);

  const plan = [];
  let subIdx = 0;
  for (let d = 0; d < daysLeft; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const isLastDay = d === daysLeft - 1;
    if (isLastDay) {
      plan.push({ date: dayName, tasks: ['🔁 Révision générale — revoir toutes les notions difficiles', '📝 Simulation d\'examen chronométré'], special: true });
    } else {
      const subj = subjectScores[subIdx % subjectScores.length];
      const tasks = [
        subj.icon + ' ' + subj.name + (subj.avg > 0 ? ' (dernière note : ' + subj.avg + '%)' : ' (pas encore révisé)'),
        hours >= 2 ? '📝 Faire 1 examen QCM sur ' + subj.name : '📖 Lire le cours de ' + subj.name,
        hours >= 3 ? '🔁 Réviser les questions ratées' : null
      ].filter(Boolean);
      plan.push({ date: dayName, subj: subj.name, tasks, score: subj.avg, special: false });
      subIdx++;
    }
  }

  const meta = { dateVal, hours, level, generatedAt: new Date().toISOString() };
  renderPlanningResult(plan, meta);
  await savePlanningToFirestore(plan, meta);
  toast('Planning généré et sauvegardé ✅', 'ok');
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
