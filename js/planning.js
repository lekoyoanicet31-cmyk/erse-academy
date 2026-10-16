// ═══ planning.js ═══
/* ═══════════════ PLANNING DE RÉVISION ═══════════════
   Planning daté, construit à partir de :
   - tes matières et leur date d'examen (une date par matière)
   - ta journée (début, fin, heures d'étude, durée d'une session, jour de repos)
   - tes cours à la fac (créneaux bloqués)
   - tes résultats aux examens (les matières faibles reviennent plus souvent)
   Phases par matière, révision espacée, méthodes de travail, export calendrier. */

const PLAN_DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const PLAN_DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const PLAN_MONTHS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const PLAN_MAX_DAYS = 84; // 12 semaines maximum par génération
const PLAN_PALETTE = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#6366f1'];

function subjColor(name){
  let h = 0;
  for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return PLAN_PALETTE[h % PLAN_PALETTE.length];
}
function planEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Dates locales (sans fuseau horaire) ── */
function pad2(n){ return String(n).padStart(2,'0'); }
function dateKey(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function parseKey(k){ const p=k.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function dayDiff(aKey,bKey){ // nombre de jours de a vers b
  const a=aKey.split('-').map(Number), b=bKey.split('-').map(Number);
  return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000);
}
function addDays(key,n){ const d=parseKey(key); d.setDate(d.getDate()+n); return dateKey(d); }
function dowIndex(key){ return (parseKey(key).getDay()+6)%7; } // 0 = lundi
function toMin(hhmm){ const p=String(hhmm).split(':').map(Number); return p[0]*60+(p[1]||0); }
function fmtMin(m){ return pad2(Math.floor(m/60))+':'+pad2(m%60); }
function fmtDayLong(key){ const d=parseKey(key); return PLAN_DAYS[dowIndex(key)]+' '+d.getDate()+' '+PLAN_MONTHS[d.getMonth()]; }

/* ── Sauvegarde : copie locale d'abord, puis Firestore ── */
function planningLocalKey(){ return 'erse_planning_' + (currentUser?.email || 'guest'); }

async function savePlanning(days, meta){
  const payload = { days, meta, email: currentUser?.email || null, name: currentUser?.name || '', savedAt: new Date().toISOString() };
  try{ localStorage.setItem(planningLocalKey(), JSON.stringify(payload)); }catch(e){}
  if (!fbReady || !currentUser?.email) return false;
  try {
    await firebase.firestore().collection('plannings').doc(currentUser.email).set(payload);
    return true;
  } catch(e) { console.warn('savePlanning error:', e); return false; }
}

async function loadPlanning(){
  if (fbReady && currentUser?.email) {
    try {
      const snap = await firebase.firestore().collection('plannings').doc(currentUser.email).get();
      if (snap.exists) return snap.data();
    } catch(e) { console.warn('loadPlanning error:', e); }
  }
  try{ const raw = localStorage.getItem(planningLocalKey()); if(raw) return JSON.parse(raw); }catch(e){}
  return null;
}

async function deletePlanning(){
  if (!confirm('Supprimer ton planning définitivement ?')) return;
  if (fbReady && currentUser?.email) {
    try { await firebase.firestore().collection('plannings').doc(currentUser.email).delete(); }
    catch(e) { console.warn('deletePlanning error:', e); }
  }
  try{ localStorage.removeItem(planningLocalKey()); }catch(e){}
  PLAN_STATE = { days:null, meta:null, weekIdx:0 };
  const r = document.getElementById('plan-result'); if(r) r.innerHTML = '';
  toast('Planning supprimé', 'ok');
}

// Compatibilité : auth.js appelait renderPlanningResult(). L'affichage est géré par initPlanning().
function renderPlanningResult(){}

/* ── Résultats de l'étudiant → force de chaque matière ── */
function userResults(){
  const uid = currentUser?.email;
  return (DB.examResults || []).filter(r => !r.userId || !uid || r.userId === uid);
}
function resultsSignature(){
  const rs = userResults();
  return rs.length + ':' + rs.reduce((a,r)=>a+(Number(r.score)||0),0);
}
function subjectStats(level){
  const subjects = DB.subjects.filter(s => s.active && s.level === level);
  const results = userResults();
  return subjects.map(s => {
    const exams = DB.exams.filter(e => String(e.subjectId) === String(s.id));
    const rs = results.filter(r => exams.some(e => String(e.id) === String(r.examId)));
    const avg = rs.length ? Math.round(rs.reduce((a,r)=>a+r.score,0) / rs.length) : null;
    return { id: s.id, name: s.name, icon: s.icon || '📘', avg };
  });
}

/* ═══════════════ FORMULAIRE ═══════════════ */
let PLAN_STATE = { days:null, meta:null, weekIdx:0 };
let planFormState = null;

function defaultFormState(){
  return { level: (currentUser && currentUser.level) || 1, defaultDate:'', subjects:{},
    startTime:'08:00', endTime:'22:00', studyHours:6, sessionLen:60, restDow:6, reading:true, classes:[] };
}
function formStateFromSettings(st){
  const f = defaultFormState();
  f.level = st.level; f.defaultDate = st.defaultDate || '';
  f.startTime = fmtMin(st.startMin); f.endTime = fmtMin(st.endMin);
  f.studyHours = st.studyHours; f.sessionLen = st.sessionLen; f.restDow = st.restDow; f.reading = !!st.reading;
  (st.subjects||[]).forEach(s => { f.subjects[String(s.id)] = { on:true, date:s.examKey }; });
  (DB.subjects||[]).filter(s=>s.level===st.level).forEach(s => { if(!f.subjects[String(s.id)]) f.subjects[String(s.id)] = { on:false, date:'' }; });
  f.classes = (st.classes||[]).map(c => ({ dow:c.dow, start:fmtMin(c.start), end:fmtMin(c.end), label:c.label }));
  return f;
}

const PF_INPUT = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg);color:var(--text);font-family:var(--font-body);font-size:13px;box-sizing:border-box;';
const PF_LABEL = 'font-size:12px;color:var(--muted);display:block;margin-bottom:4px;';
const PF_CARD  = 'background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:1.2rem;margin-bottom:1rem;';
const PF_TITLE = 'font-size:13px;font-weight:600;color:var(--b8);margin-bottom:.9rem;';

function renderPlanForm(){
  const el = document.getElementById('plan-form'); if(!el) return;
  if(!planFormState) planFormState = defaultFormState();
  const f = planFormState;
  const stats = subjectStats(f.level);
  const minDate = addDays(dateKey(new Date()), 2);
  const opt = (v, label, sel) => `<option value="${v}"${String(sel)===String(v)?' selected':''}>${label}</option>`;

  const subjRows = stats.length ? stats.map(s => {
    const st = f.subjects[String(s.id)] || { on:true, date:'' };
    return `<div style="display:flex;align-items:center;gap:8px;padding:.5rem .6rem;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;flex-wrap:wrap;">
      <input type="checkbox" ${st.on!==false?'checked':''} onchange="pfSubj('${planEsc(s.id)}','on',this.checked)">
      <span style="flex:1;min-width:150px;font-size:13px;">${s.icon} ${planEsc(s.name)}
        <span style="font-size:11px;color:var(--muted);display:block;">${s.avg==null?'aucun examen passé':'moyenne '+s.avg+' %'}</span></span>
      <input type="date" value="${planEsc(st.date||'')}" min="${minDate}" oninput="pfSubj('${planEsc(s.id)}','date',this.value)" onchange="pfSubj('${planEsc(s.id)}','date',this.value)" style="${PF_INPUT}width:auto;">
    </div>`;
  }).join('') : `<div style="font-size:13px;color:var(--muted);padding:.6rem;">Aucune matière active pour ce niveau.</div>`;

  const classRows = f.classes.map((c,i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
      <select onchange="pfClass(${i},'dow',this.value)" style="${PF_INPUT}width:110px;">${PLAN_DAYS.map((d,k)=>opt(k,d,c.dow)).join('')}</select>
      <input type="time" value="${c.start}" oninput="pfClass(${i},'start',this.value)" onchange="pfClass(${i},'start',this.value)" style="${PF_INPUT}width:105px;">
      <span style="color:var(--muted);">→</span>
      <input type="time" value="${c.end}" oninput="pfClass(${i},'end',this.value)" onchange="pfClass(${i},'end',this.value)" style="${PF_INPUT}width:105px;">
      <input type="text" value="${planEsc(c.label)}" placeholder="Nom du cours" maxlength="40" oninput="pfClass(${i},'label',this.value)" style="${PF_INPUT}flex:1;min-width:130px;width:auto;">
      <button onclick="pfClassDel(${i})" title="Supprimer" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:8px 10px;cursor:pointer;">✕</button>
    </div>`).join('');

  el.innerHTML = `
    <div style="${PF_CARD}">
      <div style="${PF_TITLE}">1. Niveau, matières et dates d'examen</div>
      <label style="${PF_LABEL}">Niveau à réviser</label>
      <select id="plan-level" onchange="pfLevel(this.value)" style="${PF_INPUT}margin-bottom:12px;">
        ${opt(1,'Licence 1',f.level)}${opt(2,'Licence 2',f.level)}${opt(3,'Licence 3',f.level)}
      </select>
      <label style="${PF_LABEL}">Date d'examen par défaut (pour les matières sans date propre)</label>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="date" id="plan-date" value="${planEsc(f.defaultDate)}" min="${minDate}" oninput="pfDefaultDate(this.value)" onchange="pfDefaultDate(this.value)" style="${PF_INPUT}flex:1;min-width:150px;width:auto;">
        <button onclick="pfApplyDate()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--b0);color:var(--b8);font-size:12px;cursor:pointer;font-family:var(--font-body);">Appliquer à toutes</button>
      </div>
      <label style="${PF_LABEL}">Matières à réviser — coche celles qui sont à ton programme, et indique la date de chacune</label>
      ${subjRows}
    </div>

    <div style="${PF_CARD}">
      <div style="${PF_TITLE}">2. Ma journée</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
        <div><label style="${PF_LABEL}">Je commence à</label><input type="time" value="${f.startTime}" oninput="pfSet('startTime',this.value)" onchange="pfSet('startTime',this.value)" style="${PF_INPUT}"></div>
        <div><label style="${PF_LABEL}">Je termine à</label><input type="time" value="${f.endTime}" oninput="pfSet('endTime',this.value)" onchange="pfSet('endTime',this.value)" style="${PF_INPUT}"></div>
        <div><label style="${PF_LABEL}">Heures d'étude par jour</label>
          <select onchange="pfSet('studyHours',+this.value)" style="${PF_INPUT}">${[2,3,4,5,6,7,8,9,10].map(h=>opt(h,h+' h',f.studyHours)).join('')}</select></div>
        <div><label style="${PF_LABEL}">Durée d'une session</label>
          <select onchange="pfSet('sessionLen',+this.value)" style="${PF_INPUT}">${[45,60,90].map(m=>opt(m,m+' min',f.sessionLen)).join('')}</select></div>
        <div><label style="${PF_LABEL}">Jour de repos</label>
          <select onchange="pfSet('restDow',+this.value)" style="${PF_INPUT}">${opt(-1,'Aucun',f.restDow)}${PLAN_DAYS.map((d,k)=>opt(k,d,f.restDow)).join('')}</select></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:12px;cursor:pointer;">
        <input type="checkbox" ${f.reading?'checked':''} onchange="pfSet('reading',this.checked)"> 📖 Ajouter une lecture libre d'1 h en fin de journée
      </label>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;">Les repas (12h30 et 19h00) et les pauses sont ajoutés automatiquement.</div>
    </div>

    <div style="${PF_CARD}">
      <div style="${PF_TITLE}">3. Mes cours à la fac <span style="font-weight:400;color:var(--muted);">(facultatif — ces créneaux seront bloqués)</span></div>
      ${classRows || '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Aucun cours ajouté.</div>'}
      <button onclick="pfClassAdd()" style="padding:8px 12px;border-radius:8px;border:1px dashed var(--border);background:transparent;color:var(--b8);font-size:12px;cursor:pointer;font-family:var(--font-body);">＋ Ajouter un cours</button>
    </div>

    <button onclick="generatePlanning()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--b6);color:#fff;font-family:var(--font-body);font-size:14px;font-weight:600;cursor:pointer;">🚀 Générer mon planning</button>`;
}

function pfSet(k,v){ planFormState[k] = v; }
function pfLevel(v){ planFormState.level = +v; planFormState.subjects = {}; renderPlanForm(); }
function pfDefaultDate(v){ planFormState.defaultDate = v; }
function pfSubj(id,field,val){
  const k = String(id);
  const cur = planFormState.subjects[k] || { on:true, date:'' };
  cur[field] = val; planFormState.subjects[k] = cur;
}
function pfApplyDate(){
  const f = planFormState;
  if(!f.defaultDate){ toast("Choisis d'abord la date par défaut",'err'); return; }
  subjectStats(f.level).forEach(s => {
    const cur = f.subjects[String(s.id)] || { on:true, date:'' };
    cur.date = f.defaultDate; f.subjects[String(s.id)] = cur;
  });
  renderPlanForm();
}
function pfClassAdd(){ planFormState.classes.push({ dow:0, start:'08:00', end:'10:00', label:'' }); renderPlanForm(); }
function pfClassDel(i){ planFormState.classes.splice(i,1); renderPlanForm(); }
function pfClass(i,field,val){ planFormState.classes[i][field] = (field==='dow') ? +val : val; }

/* ═══════════════ MOTEUR DE PLANNING ═══════════════ */
const PLAN_BREAK = 15; // minutes de pause entre deux sessions

const PLAN_PHASES = { decouverte:'Découverte', approfondissement:'Approfondissement', revision:'Révisions', final:'Dernière ligne droite' };

// Méthodes de travail conseillées, affichées sur chaque créneau
const PLAN_KINDS = {
  cours:        { label:'Lecture active',        tip:"🍅 Pomodoro 25/5 : 25 minutes de lecture concentrée, puis 5 minutes de pause. Surligne peu, reformule beaucoup." },
  exos:         { label:'Exercices / QCM',       tip:"🧠 Rappel actif : cache le cours et essaie d'abord seul. Corrige ensuite, et note ce qui t'a bloqué." },
  recherche:    { label:'Approfondissement',     tip:"🗣 Explique le chapitre à voix haute, comme à un camarade. Ce que tu ne sais pas expliquer, tu ne le maîtrises pas encore." },
  fiches:       { label:'Fiche de synthèse',     tip:"🗂 Une page maximum : formules, définitions et pièges classiques. Relis-la le jour de l'examen." },
  revision:     { label:'Révision générale',     tip:"🔁 Reprends chaque chapitre en 5 minutes : écris de mémoire ce que tu retiens, puis vérifie avec ton cours." },
  examen_blanc: { label:"Simulation d'examen",   tip:"⏱ Conditions réelles : chronomètre, sans cours. Corrige à la fin et classe tes erreurs par chapitre." },
  rappel:       { label:'Révision espacée',      tip:"✍️ Rappel espacé : écris de mémoire ce que tu as vu il y a quelques jours, puis vérifie. C'est ce qui fixe vraiment la mémoire." }
};

// Chaque matière a sa propre phase, selon le temps restant avant SON examen
function phaseOf(d){
  if(d <= 2) return 'final';
  if(d <= 7) return 'revision';
  if(d <= 21) return 'approfondissement';
  return 'decouverte';
}
const PLAN_PATTERN = {
  decouverte:        ['cours','cours','exos','cours','exos','recherche'],
  approfondissement: ['exos','cours','exos','recherche','fiches','exos'],
  revision:          ['exos','revision','fiches','exos','revision','cours'],
  final:             ['examen_blanc','fiches','revision']
};

// [début, fin] moins une liste d'intervalles occupés → liste d'intervalles libres
function subtractIntervals(base, busy){
  let free = [[base[0], base[1]]];
  busy.slice().sort((a,b)=>a[0]-b[0]).forEach(b => {
    const next = [];
    free.forEach(f => {
      if(b[1] <= f[0] || b[0] >= f[1]){ next.push(f); return; }
      if(b[0] > f[0]) next.push([f[0], b[0]]);
      if(b[1] < f[1]) next.push([b[1], f[1]]);
    });
    free = next;
  });
  return free.filter(f => f[1]-f[0] > 0);
}

// Choix pondéré de la matière : plus l'examen est proche et plus la matière est faible,
// plus elle revient souvent. Répartition équitable "à crédit" (pas d'aléatoire → résultat stable).
function pickSubject(active, dayKey){
  const ws = active.map(s => {
    const d = dayDiff(dayKey, s.examKey);
    const urgency = 1 + 8/(d+1);
    const weak = s.avg == null ? 1.6 : 1 + (100 - s.avg)/35; // matière faible (ou jamais passée) = beaucoup plus de temps
    return { s, w: urgency * weak };
  });
  const total = ws.reduce((a,x)=>a+x.w, 0);
  ws.forEach(x => { x.s.credit += x.w; });
  const chosen = ws.slice().sort((a,b)=>b.s.credit - a.s.credit)[0];
  chosen.s.credit -= total;
  return chosen.s;
}

// Réordonne les matières de la journée pour éviter deux sessions identiques d'affilée,
// SANS changer combien de sessions chaque matière reçoit.
function interleaveSubjects(picks, last){
  const counts = new Map();
  picks.forEach(s => counts.set(s, (counts.get(s)||0) + 1));
  const out = [];
  let prev = last;
  while(out.length < picks.length){
    const cands = Array.from(counts.entries()).filter(e => e[1] > 0).sort((a,b) => b[1]-a[1]);
    const pick = cands.find(e => e[0] !== prev) || cands[0];
    out.push(pick[0]);
    counts.set(pick[0], pick[1]-1);
    prev = pick[0];
  }
  return out;
}

/* st : réglages  |  stats : [{id,avg}]  |  startKey : premier jour du planning */
function buildPlan(st, stats, startKey){
  const subs = st.subjects.map(s => {
    const x = stats.find(y => String(y.id) === String(s.id));
    return { id:s.id, name:s.name, icon:s.icon, examKey:s.examKey, avg: x ? x.avg : null,
             color: subjColor(s.name), counter:0, credit:0 };
  });
  const lastExam = subs.reduce((m,s) => s.examKey > m ? s.examKey : m, subs[0].examKey);
  let total = dayDiff(startKey, lastExam) + 1;
  let truncated = false;
  if(total > PLAN_MAX_DAYS){ total = PLAN_MAX_DAYS; truncated = true; }

  const reviewQ = {};   // date → [{sid, tags}]
  let carry = [];       // révisions pas encore placées
  const days = [];
  let shortDays = 0, sessions = 0, studyMin = 0;

  const nextStudyDay = key => {
    let k = key;
    for(let i=0;i<8;i++){ if(dowIndex(k) !== st.restDow) return k; k = addDays(k,1); }
    return k;
  };
  const scheduleReviews = (s, key) => {
    [1,3,7,14].forEach(off => {
      const t = nextStudyDay(addDays(key, off));
      if(dayDiff(startKey, t) >= total) return;
      if(dayDiff(t, s.examKey) < 1) return;
      const q = (reviewQ[t] = reviewQ[t] || []);
      const ex = q.find(r => String(r.sid) === String(s.id));
      if(ex){ if(!ex.tags.includes('J+'+off)) ex.tags.push('J+'+off); }
      else q.push({ sid:s.id, tags:['J+'+off] });
    });
  };

  for(let i=0; i<total; i++){
    const key = addDays(startKey, i), dow = dowIndex(key);
    const day = { date:key, dow, rest:false, exams:[], blocks:[] };
    subs.forEach(s => { if(s.examKey === key) day.exams.push({ sid:s.id, name:s.name, icon:s.icon }); });

    const classBlocks = st.classes.filter(c => c.dow === dow)
      .map(c => ({ type:'class', start:c.start, end:c.end, label:c.label }));
    day.blocks.push(...classBlocks);

    if(dow === st.restDow){ day.rest = true; days.push(day); continue; }
    const active = subs.filter(s => dayDiff(key, s.examKey) >= 1);
    if(!active.length){ days.push(day); continue; }

    // Créneaux occupés : cours à la fac, repas, fin de journée
    const busy = classBlocks.map(c => [c.start, c.end]);
    const fixed = [];
    const overlaps = (a,b) => busy.some(x => a < x[1] && b > x[0]);
    const addMeal = (iv, label) => {
      if(!(st.startMin <= iv[0] && st.endMin >= iv[1])) return;
      const free = subtractIntervals(iv, busy).filter(f => f[1]-f[0] >= 30).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
      if(!free.length) return;
      fixed.push({ type:'meal', start:free[0][0], end:free[0][1], label });
      busy.push([free[0][0], free[0][1]]);
    };
    addMeal([750,840], 'Déjeuner & déconnexion');
    addMeal([1140,1185], 'Repas du soir');
    const win = st.endMin - st.startMin;
    if(win >= 360 && !overlaps(st.endMin-20, st.endMin)){
      fixed.push({ type:'bilan', start:st.endMin-20, end:st.endMin, label:'Bilan du jour & préparation de demain' });
      busy.push([st.endMin-20, st.endMin]);
    }
    if(st.reading && win >= 480 && !overlaps(st.endMin-80, st.endMin-20)){
      fixed.push({ type:'reading', start:st.endMin-80, end:st.endMin-20, label:'Lecture libre' });
      busy.push([st.endMin-80, st.endMin-20]);
    }

    // Révisions espacées dues aujourd'hui (au plus ~35 % du temps d'étude, le reste est reporté)
    const due = carry.concat(reviewQ[key] || []);
    const merged = {};
    due.forEach(r => {
      const s = subs.find(x => String(x.id) === String(r.sid));
      if(!s || dayDiff(key, s.examKey) < 1) return;
      const m = (merged[r.sid] = merged[r.sid] || { sid:r.sid, tags:[] });
      r.tags.forEach(t => { if(!m.tags.includes(t)) m.tags.push(t); });
    });
    const reviewList = Object.values(merged);
    const maxReviews = Math.max(1, Math.floor(0.35 * st.studyMin / 30));
    carry = reviewList.slice(maxReviews).slice(0, 12);

    const list = [];
    reviewList.slice(0, maxReviews).forEach(r => {
      list.push({ len:30, kind:'rappel', s: subs.find(x => String(x.id) === String(r.sid)), tags:r.tags });
    });
    let remaining = st.studyMin - list.reduce((a,x)=>a+x.len, 0);
    const mains = [];
    while(remaining >= st.sessionLen){ mains.push(st.sessionLen); remaining -= st.sessionLen; }
    const tail = Math.floor(remaining/15)*15;
    if(tail >= 30) mains.push(tail);

    const last = list.length ? list[list.length-1].s : null;
    const hadCours = {};
    const picks = mains.map(() => pickSubject(active, key));
    const ordered = interleaveSubjects(picks, last);
    mains.forEach((len, k) => {
      const s = ordered[k];
      const ph = phaseOf(dayDiff(key, s.examKey));
      const pat = PLAN_PATTERN[ph];
      const kind = pat[s.counter % pat.length];
      s.counter++;
      list.push({ len, kind, s, phase:ph, tags:null });
      if(kind === 'cours' && !hadCours[s.id]){ hadCours[s.id] = true; scheduleReviews(s, key); }
    });

    // Placement dans les créneaux libres, avec une pause entre deux sessions
    const free = subtractIntervals([st.startMin, st.endMin], busy).filter(f => f[1]-f[0] >= 30);
    const placed = [];
    let placedMin = 0, idx = 0, placedSessions = 0;
    for(const f of free){
      let cur = f[0];
      while(idx < list.length){
        const it = list[idx];
        let len = it.len;
        const space = f[1] - cur;
        if(len > space){
          if(space >= 30) len = Math.floor(space/15)*15; else break;
        }
        placed.push({ type:'study', start:cur, end:cur+len, kind:it.kind, sid:it.s.id, subj:it.s.name,
                      icon:it.s.icon, color:it.s.color,
                      phase: it.phase || phaseOf(dayDiff(key, it.s.examKey)), tags: it.tags || null });
        placedMin += len; placedSessions++; cur += len; idx++;
        const nxt = list[idx];
        if(nxt && cur + PLAN_BREAK + Math.min(nxt.len,30) <= f[1]){
          placed.push({ type:'pause', start:cur, end:cur+PLAN_BREAK }); cur += PLAN_BREAK;
        } else break;
      }
      if(idx >= list.length) break;
    }
    if(st.studyMin - placedMin >= 45) shortDays++;
    sessions += placedSessions; studyMin += placedMin;

    day.blocks = day.blocks.concat(fixed, placed).sort((a,b) => a.start - b.start);
    days.push(day);
  }

  return { days, info:{ truncated, shortDays, sessions, studyMin, total } };
}

/* ═══════════════ AFFICHAGE : CALENDRIER HEBDOMADAIRE ═══════════════ */
function planWeeks(days){
  const set = {};
  days.forEach(d => { set[addDays(d.date, -d.dow)] = true; });
  return Object.keys(set).sort();
}
function currentWeekIdx(days){
  const weeks = planWeeks(days), today = dateKey(new Date());
  const i = weeks.findIndex(w => w <= today && today < addDays(w,7));
  return i >= 0 ? i : 0;
}

function planBlockHtml(b, idx, key, gs){
  const ppm = 1;
  const top = (b.start - gs) * ppm, h = Math.max((b.end - b.start) * ppm - 2, 12);
  const time = fmtMin(b.start) + '–' + fmtMin(b.end);
  let style = `position:absolute;left:2px;right:2px;top:${top}px;height:${h}px;box-sizing:border-box;overflow:hidden;border-radius:6px;padding:3px 5px;font-size:11px;line-height:1.25;cursor:pointer;`;
  const line = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  let inner = '', title = time;
  if(b.type === 'study'){
    const dashed = b.kind === 'rappel';
    style += `background:${b.color}${dashed?'14':'26'};border-left:3px ${dashed?'dashed':'solid'} ${b.color};color:var(--text);`;
    const k = PLAN_KINDS[b.kind];
    inner = `<div style="font-weight:600;${line}">${b.icon} ${planEsc(b.subj)}</div>` +
      (h >= 34 ? `<div style="font-size:10px;opacity:.8;${line}">${k.label}${b.tags ? ' · ' + planEsc(b.tags.join(', ')) : ''}</div>` : '');
    title = `${time} · ${b.subj} — ${k.label}`;
  } else if(b.type === 'pause'){
    style += 'background:var(--b0);border:1px dashed var(--border);';
    title = time + ' · Pause';
  } else if(b.type === 'meal'){
    style += 'background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b;';
    inner = h >= 22 ? `<div style="${line}">🍽 ${planEsc(b.label)}</div>` : '';
    title = time + ' · ' + b.label;
  } else if(b.type === 'class'){
    style += 'background:#e2e8f0;color:#334155;border-left:3px solid #64748b;';
    inner = `<div style="font-weight:600;${line}">🏫 ${planEsc(b.label)}</div>`;
    title = time + ' · ' + b.label;
  } else if(b.type === 'reading'){
    style += 'background:#dcfce7;color:#166534;border-left:3px solid #22c55e;';
    inner = `<div style="${line}">📖 ${planEsc(b.label)}</div>`;
    title = time + ' · ' + b.label;
  } else { // bilan
    style += 'background:#e5e7eb;color:#374151;border-left:3px solid #9ca3af;';
    inner = h >= 18 ? `<div style="${line}">✅ Bilan du jour</div>` : '';
    title = time + ' · ' + b.label;
  }
  return `<div onclick="showPlanBlock('${key}',${idx})" title="${planEsc(title)}" style="${style}">${inner}</div>`;
}

function renderPlan(){
  const box = document.getElementById('plan-result'); if(!box) return;
  const S = PLAN_STATE;
  if(!S.days){
    box.innerHTML = S.legacy
      ? `<div style="background:#fef3c7;color:#92400e;border-radius:12px;padding:1rem;font-size:13px;line-height:1.6;">Ton ancien planning utilisait un format qui n'existe plus. Remplis le formulaire ci-dessus pour en créer un nouveau : il est maintenant daté, avec une date par matière, tes cours à la fac et une révision espacée.</div>`
      : '';
    return;
  }
  const meta = S.meta, st = meta.settings;
  const todayKey = dateKey(new Date());
  const weeks = planWeeks(S.days);
  S.weekIdx = Math.max(0, Math.min(S.weekIdx, weeks.length - 1));
  const wk = weeks[S.weekIdx];
  const byDate = {}; S.days.forEach(d => { byDate[d.date] = d; });
  const cols = [0,1,2,3,4,5,6].map(i => { const k = addDays(wk,i); return { key:k, day:byDate[k] || null }; });

  // Plage horaire affichée
  let minS = st.startMin, maxE = st.endMin;
  cols.forEach(c => c.day && c.day.blocks.forEach(b => { if(b.start < minS) minS = b.start; if(b.end > maxE) maxE = b.end; }));
  const gs = Math.floor(minS/60)*60, ge = Math.ceil(maxE/60)*60, H = ge - gs;

  const hourLines = `repeating-linear-gradient(to bottom,transparent 0,transparent 59px,var(--border) 59px,var(--border) 60px)`;
  const gridCols = 'grid-template-columns:46px repeat(7,minmax(104px,1fr));';
  const stick = 'position:sticky;left:0;z-index:3;background:var(--card-bg);';
  const head = cols.map(c => {
    const d = parseKey(c.key), isToday = c.key === todayKey;
    return `<div style="padding:.5rem .2rem;text-align:center;font-size:11px;border-left:1px solid var(--border);${isToday?'background:var(--b0);color:var(--b8);font-weight:700;':'color:var(--muted);'}">${PLAN_DAYS_SHORT[dowIndex(c.key)]}<div style="font-size:15px;font-weight:700;color:${isToday?'var(--b8)':'var(--text)'};">${d.getDate()}</div></div>`;
  }).join('');
  const allday = cols.map(c => {
    let s = '';
    if(c.day){
      c.day.exams.forEach(e => { s += `<div style="background:#fee2e2;color:#991b1b;border-radius:6px;padding:2px 5px;font-size:10.5px;font-weight:600;margin:2px 0;${'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'}">📝 Examen : ${planEsc(e.name)}</div>`; });
      if(c.day.rest) s += `<div style="color:var(--muted);font-size:10.5px;padding:2px 5px;">😴 Repos</div>`;
    }
    return `<div style="border-left:1px solid var(--border);padding:2px 3px;min-height:26px;">${s}</div>`;
  }).join('');
  const hours = []; for(let m = gs; m < ge; m += 60) hours.push(m);
  const timeCol = hours.map(m => `<div style="position:absolute;top:${m-gs}px;right:6px;font-size:10px;color:var(--muted);transform:translateY(-6px);">${fmtMin(m)}</div>`).join('');
  const dayCols = cols.map(c => {
    const d = c.day;
    const dim = !d ? 'opacity:.45;' : (d.rest ? 'background-color:var(--b0);' : '');
    const blocks = d ? d.blocks.map((b,i) => planBlockHtml(b, i, c.key, gs)).join('') : '';
    return `<div style="position:relative;height:${H}px;border-left:1px solid var(--border);background-image:${hourLines};${dim}">${blocks}</div>`;
  }).join('');

  // Focus de la semaine : matières qui reçoivent le plus de temps cette semaine
  const stats = subjectStats(st.level), avgOf = id => { const x = stats.find(y => String(y.id) === String(id)); return x ? x.avg : null; };
  const mins = {};
  cols.forEach(c => c.day && c.day.blocks.filter(b => b.type === 'study').forEach(b => {
    const m = (mins[b.sid] = mins[b.sid] || { m:0, name:b.subj, icon:b.icon, sid:b.sid }); m.m += b.end - b.start;
  }));
  const top = Object.keys(mins).map(k => mins[k]).sort((a,b) => b.m - a.m).slice(0,2);
  const focus = top.length ? top.map(x => { const a = avgOf(x.sid); return `${x.icon} <b>${planEsc(x.name)}</b> (${a == null ? 'pas encore d\'examen' : 'moyenne ' + a + ' %'})`; }).join(' et ') : '';

  // Compte à rebours + phase de chaque matière
  const chips = st.subjects.slice().sort((a,b) => a.examKey < b.examKey ? -1 : 1).map(s => {
    const d = dayDiff(todayKey, s.examKey);
    const label = d < 0 ? 'terminé' : d === 0 ? 'aujourd\'hui' : 'J-' + d;
    const ph = d >= 1 ? PLAN_PHASES[phaseOf(d)] : '—';
    const a = avgOf(s.id);
    return `<div style="border:1px solid var(--border);background:var(--card-bg);border-radius:10px;padding:6px 10px;font-size:12px;">
      ${s.icon} <b>${planEsc(s.name)}</b> · <span style="color:#b91c1c;font-weight:700;">${label}</span><br>
      <span style="color:var(--muted);font-size:11px;">${ph}${a == null ? '' : ' · moyenne ' + a + ' %'}</span></div>`;
  }).join('');

  const first = S.days[0].date, lastD = S.days[S.days.length-1].date;
  const info = meta.info || {};
  const notes = [];
  if(info.truncated) notes.push('Planning limité à 12 semaines : régénère-le plus tard pour couvrir la suite.');
  if(info.shortDays > 0) notes.push(`⚠ ${info.shortDays} jour${info.shortDays>1?'s':''} n'ont pas assez de temps libre pour tes ${st.studyHours} h d'étude (cours à la fac, repas…). Élargis ta journée ou baisse les heures d'étude.`);
  const outdated = meta.resultsSig !== resultsSignature();
  const wEnd = addDays(wk,6), wd1 = parseKey(wk), wd2 = parseKey(wEnd);
  const wLabel = wd1.getDate() + (wd1.getMonth() !== wd2.getMonth() ? ' ' + PLAN_MONTHS[wd1.getMonth()] : '') + ' – ' + wd2.getDate() + ' ' + PLAN_MONTHS[wd2.getMonth()];
  const btn = 'padding:.4rem .9rem;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);cursor:pointer;font-size:.78rem;font-weight:600;font-family:var(--font-body);';
  const navBtn = (dis) => `padding:.4rem .8rem;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:.85rem;cursor:${dis?'default':'pointer'};opacity:${dis?.4:1};font-family:var(--font-body);`;

  box.innerHTML = `
    ${outdated ? `<div style="background:#fef3c7;color:#92400e;border-radius:12px;padding:.8rem 1rem;font-size:13px;margin-bottom:1rem;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="flex:1;min-width:200px;">📈 Tes résultats ont changé depuis la création de ce planning.</span>
      <button onclick="refreshPlanning()" style="${btn}">🔄 Actualiser avec mes résultats</button></div>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--b8);">📋 Ton planning</div>
        <div style="font-size:12px;color:var(--muted);">${weeks.length} semaine${weeks.length>1?'s':''} · du ${fmtDayLong(first)} au ${fmtDayLong(lastD)} · ${info.sessions||0} sessions · ${Math.round((info.studyMin||0)/60)} h d'étude</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="downloadPlanICS()" style="${btn}">📅 Ajouter à mon calendrier</button>
        <button onclick="editPlanSettings()" style="${btn}">✏️ Modifier mes réglages</button>
        <button onclick="deletePlanning()" style="${btn}color:#b91c1c;">🗑 Supprimer</button>
      </div>
    </div>
    ${notes.length ? `<div style="background:var(--b0);border-radius:10px;padding:.6rem .8rem;font-size:12px;color:var(--muted);margin-bottom:.8rem;line-height:1.6;">${notes.map(planEsc).join('<br>')}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem;">${chips}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.6rem;flex-wrap:wrap;">
      <button onclick="planWeek(-1)" ${S.weekIdx===0?'disabled':''} style="${navBtn(S.weekIdx===0)}">◀ Précédente</button>
      <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:var(--b8);">Semaine ${S.weekIdx+1} sur ${weeks.length}</div><div style="font-size:11px;color:var(--muted);">${wLabel}</div></div>
      <button onclick="planWeek(1)" ${S.weekIdx===weeks.length-1?'disabled':''} style="${navBtn(S.weekIdx===weeks.length-1)}">Suivante ▶</button>
    </div>
    ${focus ? `<div style="font-size:12.5px;margin-bottom:.6rem;">🎯 <b>Focus de la semaine :</b> ${focus}</div>` : ''}
    <div id="plan-cal" style="overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--card-bg);">
      <div style="min-width:790px;">
        <div style="display:grid;${gridCols}border-bottom:1px solid var(--border);"><div style="${stick}"></div>${head}</div>
        <div style="display:grid;${gridCols}border-bottom:1px solid var(--border);"><div style="${stick}"></div>${allday}</div>
        <div style="display:grid;${gridCols}"><div style="${stick}height:${H}px;">${timeCol}</div>${dayCols}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin:.5rem 0;display:flex;gap:12px;flex-wrap:wrap;">
      <span>↔ Fais glisser le tableau pour voir toute la semaine</span><span>Touche un créneau pour voir la méthode conseillée</span>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-bottom:.8rem;">
      <span>▮ Session (couleur = matière)</span><span>┆ Révision espacée (J+1, J+3, J+7, J+14)</span><span>🏫 Cours à la fac</span><span>🍽 Repas</span><span>📖 Lecture libre</span>
    </div>
    <div id="plan-detail" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:.9rem 1rem;font-size:13px;color:var(--muted);">Touche un créneau du tableau pour voir son détail et la méthode de travail conseillée.</div>
    <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:.8rem;line-height:1.6;">Les matières faibles et les examens proches reviennent plus souvent. Chaque matière passe par ses propres phases : Découverte, Approfondissement, Révisions, Dernière ligne droite.</div>`;
  planScrollToFirstDay(cols);
}

function planScrollToFirstDay(cols){
  const sc = document.getElementById('plan-cal');
  const first = cols.findIndex(c => c.day);
  if(!sc || first <= 0 || sc.scrollWidth <= sc.clientWidth) return;
  sc.scrollLeft = first * ((sc.scrollWidth - 46) / 7);
}
function planWeek(delta){ PLAN_STATE.weekIdx += delta; renderPlan(); }
function editPlanSettings(){
  const el = document.getElementById('plan-form');
  if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}

function showPlanBlock(key, idx){
  const day = PLAN_STATE.days && PLAN_STATE.days.find(d => d.date === key);
  const b = day && day.blocks[idx];
  const el = document.getElementById('plan-detail');
  if(!b || !el) return;
  const time = fmtMin(b.start) + ' – ' + fmtMin(b.end) + ' (' + (b.end - b.start) + ' min)';
  const head = (t) => `<div style="font-weight:600;font-size:14px;color:var(--b8);">${t}</div><div style="font-size:12px;color:var(--muted);margin:3px 0 8px;">${fmtDayLong(key)} · ${time}</div>`;
  const tipBox = (t) => `<div style="font-size:13px;color:var(--text);background:var(--b0);border-radius:8px;padding:.7rem .8rem;line-height:1.55;">${t}</div>`;
  let html = '';
  if(b.type === 'study'){
    const k = PLAN_KINDS[b.kind];
    const subj = PLAN_STATE.meta.settings.subjects.find(s => String(s.id) === String(b.sid));
    const d = subj ? dayDiff(key, subj.examKey) : null;
    html = head(`${b.icon} ${planEsc(b.subj)} — ${k.label}`) +
      `<div style="font-size:12px;color:var(--text);margin-bottom:8px;"><b>Phase :</b> ${PLAN_PHASES[b.phase] || '—'}${d != null ? ' · examen dans ' + d + ' jour' + (d>1?'s':'') : ''}</div>` +
      (b.tags ? `<div style="font-size:12px;color:var(--text);margin-bottom:8px;"><b>Révision espacée :</b> ${planEsc(b.tags.join(', '))} après ta première lecture de cette matière.</div>` : '') +
      tipBox(k.tip);
  } else if(b.type === 'pause'){
    html = head('☕ Pause') + tipBox("Lève-toi, bois de l'eau, étire-toi. Pas d'écran : ton cerveau consolide pendant les pauses.");
  } else if(b.type === 'meal'){
    html = head('🍽 ' + planEsc(b.label)) + tipBox("Déconnecte vraiment : mange tranquillement, sans cours ni téléphone.");
  } else if(b.type === 'class'){
    html = head('🏫 ' + planEsc(b.label)) + tipBox("Créneau bloqué : ton cours à la fac. Aucune session n'est placée ici.");
  } else if(b.type === 'reading'){
    html = head('📖 Lecture libre') + tipBox("Une heure de lecture pour décompresser : roman, culture générale, article scientifique. Ça compte aussi.");
  } else {
    html = head('✅ Bilan du jour') + tipBox("Note trois choses apprises aujourd'hui et ce que tu dois reprendre demain. Prépare tes affaires pour demain.");
  }
  el.innerHTML = html;
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ═══════════════ GÉNÉRATION ═══════════════ */
async function generatePlanning(){
  const f = planFormState; if(!f) return;
  const stats = subjectStats(f.level);
  if(!stats.length){ toast('Aucune matière active pour ce niveau','err'); return; }
  const todayKey = dateKey(new Date()), startKey = addDays(todayKey,1);

  const subjects = [];
  for(const s of stats){
    const cur = f.subjects[String(s.id)];
    if(cur && cur.on === false) continue;
    const date = (cur && cur.date) || f.defaultDate;
    if(!date){ toast("Indique une date d'examen pour « " + s.name + " » (ou une date par défaut)",'err'); return; }
    if(dayDiff(todayKey, date) < 2){ toast('La date de « ' + s.name + ' » doit être au moins après-demain','err'); return; }
    subjects.push({ id:s.id, name:s.name, icon:s.icon, examKey:date });
  }
  if(!subjects.length){ toast('Coche au moins une matière','err'); return; }

  const startMin = toMin(f.startTime), endMin = toMin(f.endTime);
  if(isNaN(startMin) || isNaN(endMin) || endMin - startMin < 240){ toast('Ta journée doit durer au moins 4 heures','err'); return; }
  const classes = [];
  for(let i=0;i<f.classes.length;i++){
    const c = f.classes[i], a = toMin(c.start), b = toMin(c.end);
    if(isNaN(a) || isNaN(b) || b <= a){ toast('Cours n°' + (i+1) + " : l'heure de fin doit être après l'heure de début",'err'); return; }
    classes.push({ dow:c.dow, start:a, end:b, label:(c.label || '').trim() || 'Cours' });
  }

  const settings = { level:f.level, startMin, endMin, studyHours:f.studyHours, studyMin:f.studyHours*60,
    sessionLen:f.sessionLen, restDow:f.restDow, reading:!!f.reading, defaultDate:f.defaultDate, subjects, classes };
  const built = buildPlan(settings, stats, startKey);
  const meta = { settings, generatedAt:new Date().toISOString(), resultsSig:resultsSignature(), info:built.info, startKey };
  PLAN_STATE = { days:built.days, meta, weekIdx:0, owner:(currentUser?.email || 'guest') };
  renderPlan();
  const r = document.getElementById('plan-result'); if(r) r.scrollIntoView({ behavior:'smooth', block:'start' });
  const synced = await savePlanning(built.days, meta);
  toast(synced ? 'Planning généré et synchronisé ✅' : 'Planning généré (sauvegardé localement, sync en attente)', synced ? 'ok' : 'info');
}

// Régénère à partir de demain avec les mêmes réglages et les résultats à jour
async function refreshPlanning(){
  const S = PLAN_STATE; if(!S.meta) return;
  const old = S.meta.settings, todayKey = dateKey(new Date());
  const subjects = old.subjects.filter(s => dayDiff(todayKey, s.examKey) >= 2);
  if(!subjects.length){ toast('Tous tes examens sont passés ou trop proches : crée un nouveau planning','err'); return; }
  const settings = Object.assign({}, old, { subjects });
  const stats = subjectStats(old.level);
  const built = buildPlan(settings, stats, addDays(todayKey,1));
  const meta = { settings, generatedAt:new Date().toISOString(), resultsSig:resultsSignature(), info:built.info, startKey:addDays(todayKey,1) };
  PLAN_STATE = { days:built.days, meta, weekIdx:0, owner:S.owner };
  renderPlan();
  const synced = await savePlanning(built.days, meta);
  toast(synced ? 'Planning actualisé avec tes résultats ✅' : 'Planning actualisé (sauvegardé localement)', synced ? 'ok' : 'info');
}

/* ═══════════════ EXPORT CALENDRIER (.ics) ═══════════════
   Fichier lu par Google Agenda, Apple Calendrier, Outlook… Les alarmes sonnent même
   quand le site est fermé : aucun serveur nécessaire. */
function icsEscape(t){ return String(t).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }
function icsFold(line){
  const enc = new TextEncoder();
  if(enc.encode(line).length <= 75) return line;
  let out = '', cur = '', bytes = 0;
  for(const ch of line){
    const n = enc.encode(ch).length;
    if(bytes + n > 75){ out += cur + '\r\n '; cur = ''; bytes = 1; }
    cur += ch; bytes += n;
  }
  return out + cur;
}
function icsStamp(d){
  return d.getUTCFullYear() + pad2(d.getUTCMonth()+1) + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}
function icsLocal(key, min){ return key.replace(/-/g,'') + 'T' + pad2(Math.floor(min/60)) + pad2(min%60) + '00'; }

function buildICS(days){
  const L = [], push = l => L.push(icsFold(l));
  const stamp = icsStamp(new Date());
  push('BEGIN:VCALENDAR'); push('VERSION:2.0'); push('PRODID:-//ERSE ACADEMY//Planning de revision//FR');
  push('CALSCALE:GREGORIAN'); push('METHOD:PUBLISH'); push('X-WR-CALNAME:' + icsEscape('ERSE ACADEMY — Planning'));
  days.forEach(d => {
    d.exams.forEach(e => {
      const label = '📝 EXAMEN — ' + e.name;
      push('BEGIN:VEVENT');
      push('UID:erse-exam-' + d.date + '-' + e.sid + '@erse-academy');
      push('DTSTAMP:' + stamp);
      push('DTSTART;VALUE=DATE:' + d.date.replace(/-/g,''));
      push('DTEND;VALUE=DATE:' + addDays(d.date,1).replace(/-/g,''));
      push('SUMMARY:' + icsEscape(label));
      push('BEGIN:VALARM'); push('TRIGGER:-P6DT15H'); push('ACTION:DISPLAY'); push('DESCRIPTION:' + icsEscape('Examen dans 7 jours : ' + e.name)); push('END:VALARM');
      push('BEGIN:VALARM'); push('TRIGGER:-PT15H'); push('ACTION:DISPLAY'); push('DESCRIPTION:' + icsEscape('Examen demain : ' + e.name)); push('END:VALARM');
      push('END:VEVENT');
    });
    d.blocks.forEach((b,i) => {
      if(b.type !== 'study') return;
      const k = PLAN_KINDS[b.kind];
      const summary = b.icon + ' ' + b.subj + ' — ' + k.label + (b.tags ? ' (' + b.tags.join(', ') + ')' : '');
      push('BEGIN:VEVENT');
      push('UID:erse-' + d.date + '-' + b.start + '-' + b.sid + '-' + i + '@erse-academy');
      push('DTSTAMP:' + stamp);
      push('DTSTART:' + icsLocal(d.date, b.start));
      push('DTEND:' + icsLocal(d.date, b.end));
      push('SUMMARY:' + icsEscape(summary));
      push('DESCRIPTION:' + icsEscape('Phase : ' + (PLAN_PHASES[b.phase] || '') + '\n' + k.tip + '\nERSE ACADEMY'));
      push('BEGIN:VALARM'); push('TRIGGER:-PT10M'); push('ACTION:DISPLAY'); push('DESCRIPTION:' + icsEscape('Dans 10 min : ' + b.subj + ' — ' + k.label)); push('END:VALARM');
      push('END:VEVENT');
    });
  });
  push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}

function downloadPlanICS(){
  if(!PLAN_STATE.days){ toast("Génère d'abord un planning",'err'); return; }
  const ics = buildICS(PLAN_STATE.days);
  const blob = new Blob([ics], { type:'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'planning-erse-academy.ics';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Ouvre le fichier téléchargé pour l\'ajouter à ton calendrier (rappel 10 min avant chaque session)', 'ok');
}

/* ═══════════════ INITIALISATION ═══════════════ */
let planningLoaded = false;

async function initPlanning(){
  const me = currentUser?.email || 'guest';
  if(PLAN_STATE.owner !== me){ // autre utilisateur connecté : on repart de zéro
    PLAN_STATE = { days:null, meta:null, weekIdx:0, owner:me };
    planFormState = null; planningLoaded = false;
  }
  if(!planningLoaded){
    const saved = await loadPlanning();
    planningLoaded = true;
    if(saved && Array.isArray(saved.days) && saved.days.length && saved.meta && saved.meta.settings){
      PLAN_STATE = { days:saved.days, meta:saved.meta, weekIdx:currentWeekIdx(saved.days), owner:me };
      planFormState = formStateFromSettings(saved.meta.settings);
    } else if(saved && (saved.weekTemplate || saved.plan)){
      PLAN_STATE.legacy = true; // ancien format : on invite à en créer un nouveau
    }
  }
  if(!planFormState) planFormState = defaultFormState();
  renderPlanForm();
  renderPlan();
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
