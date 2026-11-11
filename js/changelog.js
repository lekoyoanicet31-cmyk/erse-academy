// ═══ changelog.js ═══
/* ═══════════════ JOURNAL DES MODIFICATIONS ═══════════════
   Chaque ajout fait par l'admin (matière, document, examen, épreuve de
   boutique, note manuelle) est enregistré avec sa date dans Firestore
   (meta/changelog), annoncé aux étudiants via une notification, et sert de
   « date de dernière mise à jour » partout sur le site.
   Stocké dans la collection `meta`, déjà lue par tous et écrite par l'admin. */

const CHANGELOG_KEY = 'erse_changelog_cache';
const CHANGELOG_PENDING_KEY = 'erse_changelog_pending';
const CHANGELOG_MAX = 40;

const CHANGELOG_ICONS = { matiere:'📚', document:'📄', examen:'📝', boutique:'🛍', note:'📢' };

function changelogRead(){
  try{ return JSON.parse(localStorage.getItem(CHANGELOG_KEY)||'[]'); }catch(e){ return []; }
}
function changelogWrite(entries){
  try{ localStorage.setItem(CHANGELOG_KEY, JSON.stringify(entries.slice(0, CHANGELOG_MAX))); }catch(e){}
}

function fmtChangelogDate(ts, withTime){
  const d = new Date(ts);
  const opts = { day:'numeric', month:'long', year:'numeric' };
  let s = d.toLocaleDateString('fr-FR', opts);
  if(withTime) s += ' à ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  return s;
}

// Date de la dernière modification connue, ou null si le journal est vide.
function getLastUpdateTs(){
  const entries = changelogRead();
  return entries.length ? entries[0].ts : null;
}

// Texte affiché dans les pages légales à la place de la date statique.
function getLastUpdateHtml(){
  const ts = getLastUpdateTs();
  const date = ts ? fmtChangelogDate(ts) : (typeof LEGAL_UPDATED !== 'undefined' ? LEGAL_UPDATED : '');
  return date + ` · <span onclick="showLegal('updates')" style="color:var(--b6);cursor:pointer;text-decoration:underline;">voir les modifications</span>`;
}

// Enregistre une modification. Réservé à l'admin ; sans effet pour les autres.
async function logChange(type, label){
  if(!currentUser || currentUser.role !== 'admin' || !label) return;
  const entry = { ts: Date.now(), type, label, by: currentUser.email || 'admin' };

  // Mise à jour locale immédiate (l'admin voit son ajout tout de suite)
  const local = changelogRead();
  local.unshift(entry);
  changelogWrite(local);
  updateFooterDate();

  if(!fbReady){
    // Firebase pas prêt : on garde l'entrée en attente, elle sera envoyée plus tard
    try{
      const pending = JSON.parse(localStorage.getItem(CHANGELOG_PENDING_KEY)||'[]');
      pending.push(entry);
      localStorage.setItem(CHANGELOG_PENDING_KEY, JSON.stringify(pending));
    }catch(e){}
    return;
  }
  await pushChangelogEntries([entry]);
}

async function pushChangelogEntries(newEntries){
  try{
    const ref = db.collection('meta').doc('changelog');
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const entries = Array.isArray(data.entries) ? data.entries : [];
      tx.set(ref, { entries: [...newEntries, ...entries].slice(0, CHANGELOG_MAX) });
    });
  }catch(e){ console.warn('changelog push error:', e); }
}

/* ═══ NOTIFICATIONS DES NOUVEAUTÉS ═══
   Chaque étudiant reçoit une notification par nouveauté, avec l'heure réelle de l'ajout.
   Fonctionne en direct (site ouvert) ET en rattrapage (ce qui a été ajouté pendant son absence).
   Plusieurs ajouts du même type sont regroupés en une seule notification. */
const CHANGELOG_META = {
  matiere:  { one:'Nouvelle matière disponible',  many:'nouvelles matières disponibles',  ic:'📚', bg:'#c0dd97', go:'courses'  },
  document: { one:'Nouveau document disponible',  many:'nouveaux documents disponibles',  ic:'📄', bg:'#b0d4f4', go:'courses'  },
  examen:   { one:'Nouvel examen disponible',     many:'nouveaux examens disponibles',    ic:'📝', bg:'#F0C96A', go:'exams'    },
  boutique: { one:'Nouvelle épreuve en boutique', many:'nouvelles épreuves en boutique',  ic:'🛍', bg:'#e9d5ff', go:'boutique' }
};
let changelogUnsub = null;

function startChangelogNotifs(){
  if(!fbReady || !currentUser) return;
  if(changelogUnsub){ changelogUnsub(); changelogUnsub = null; }
  changelogUnsub = db.collection('meta').doc('changelog').onSnapshot(snap => {
    if(!snap.exists || !currentUser) return;
    const entries = (snap.data().entries || []).slice().sort((a,b) => b.ts - a.ts);
    changelogWrite(entries);
    updateFooterDate();
    notifyNewChangelogEntries(entries);
  }, e => console.warn('changelog listener:', e));
}

function notifyNewChangelogEntries(entries){
  const key = 'erse_changelog_seen_' + (currentUser.email || '');
  const raw = localStorage.getItem(key);
  const newest = entries.length ? entries[0].ts : 0;
  if(raw === null){ try{ localStorage.setItem(key, String(newest)); }catch(e){} return; } // 1re fois : on part de l'existant, sans rien notifier
  const seen = parseInt(raw, 10) || 0;
  const fresh = entries.filter(e => e.ts > seen && e.by !== currentUser.email).slice(0, 8);
  if(newest > seen){ try{ localStorage.setItem(key, String(newest)); }catch(e){} }
  if(!fresh.length) return;

  const clean = l => String(l).replace(/^[^:]{3,40} : /, '');
  const groups = {};
  fresh.forEach(e => { (groups[e.type] = groups[e.type] || []).push(e); });
  Object.keys(groups).forEach(type => {
    const g = groups[type].sort((a,b) => b.ts - a.ts), meta = CHANGELOG_META[type];
    if(!meta){ g.forEach(e => pushNotif('Annonce ERSE ACADEMY', e.label, '📢', '#b0d4f4', null, e.ts)); return; }
    if(g.length === 1){
      pushNotif(meta.one, clean(g[0].label), meta.ic, meta.bg, meta.go, g[0].ts);
    } else {
      const names = g.slice(0,3).map(e => clean(e.label)).join(' · ');
      const more = g.length > 3 ? ' · et ' + (g.length - 3) + ' autre' + (g.length - 3 > 1 ? 's' : '') : '';
      pushNotif(g.length + ' ' + meta.many, names + more, meta.ic, meta.bg, meta.go, g[0].ts);
    }
  });
  if(Date.now() - fresh[0].ts < 10*60*1000) toast('🆕 ' + (fresh.length > 1 ? fresh.length + ' nouveautés sur la plateforme' : clean(fresh[0].label)), 'ok');
}

// Envoie les entrées restées en attente (Firebase indisponible au moment de l'ajout)
async function flushPendingChangelog(){
  if(!fbReady || !currentUser || currentUser.role !== 'admin') return;
  try{
    const pending = JSON.parse(localStorage.getItem(CHANGELOG_PENDING_KEY)||'[]');
    if(!pending.length) return;
    localStorage.removeItem(CHANGELOG_PENDING_KEY);
    await pushChangelogEntries(pending.sort((a,b)=>b.ts-a.ts));
  }catch(e){ console.warn('flush changelog error:', e); }
}

// Charge le journal depuis Firestore (et le met en cache pour les visiteurs).
async function loadChangelog(){
  if(!fbReady) return changelogRead();
  try{
    const snap = await db.collection('meta').doc('changelog').get();
    if(snap.exists){
      const entries = (snap.data().entries || []).sort((a,b)=>b.ts-a.ts);
      changelogWrite(entries);
      updateFooterDate();
      return entries;
    }
  }catch(e){ console.warn('changelog load error:', e); }
  return changelogRead();
}

// Date affichée dans le footer.
function updateFooterDate(){
  const el = document.getElementById('footer-updated');
  if(!el) return;
  const ts = getLastUpdateTs();
  if(!ts){ el.style.display = 'none'; return; }
  el.style.display = '';
  el.textContent = 'Mis à jour le ' + fmtChangelogDate(ts);
}

// Contenu de la page « Nouveautés & modifications »
function renderChangelogHtml(entries){
  if(!entries.length){
    return `<p style="color:#64748b;">Aucune modification enregistrée pour le moment. Les nouveaux cours, documents, examens et épreuves seront annoncés ici.</p>`;
  }
  // Regroupement par jour
  const groups = {};
  entries.forEach(e => {
    const key = fmtChangelogDate(e.ts);
    (groups[key] = groups[key] || []).push(e);
  });
  return `<p style="color:#64748b;margin-bottom:1rem;">Dernière mise à jour : <strong>${fmtChangelogDate(entries[0].ts, true)}</strong></p>` +
    Object.keys(groups).map(day => `
      <div style="margin-bottom:1.1rem;">
        <div style="font-size:12px;font-weight:700;color:#185FA5;margin-bottom:.4rem;">🗓 ${day}</div>
        ${groups[day].map(e => `
          <div style="display:flex;gap:8px;padding:.45rem .7rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:5px;font-size:13px;color:#334155;">
            <span>${CHANGELOG_ICONS[e.type] || '🆕'}</span><span>${escapeChangelog(e.label)}</span>
          </div>`).join('')}
      </div>`).join('');
}

function escapeChangelog(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Ajout manuel d'une note (pour les changements faits hors du panel admin)
async function addChangelogNote(){
  const answer=await platformDialog({title:'Annoncer une mise à jour',message:'Décris brièvement ce qui a changé.',fields:[{id:'message',label:'Message',max:300}],confirmText:'Publier'});
  const msg=(answer?.message||'').trim(); if(!msg)return;
  await logChange('note',msg);
  toast('Mise à jour enregistrée et annoncée !', 'ok');
}

document.addEventListener('DOMContentLoaded', updateFooterDate);
