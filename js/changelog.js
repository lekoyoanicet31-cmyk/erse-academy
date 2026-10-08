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
const CHANGELOG_NOTIF_GAP = 10 * 60 * 1000; // 1 annonce max toutes les 10 min (évite le spam)

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
    let notifyNow = false;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const merged = [...newEntries, ...entries].slice(0, CHANGELOG_MAX);
      const lastNotifTs = data.lastNotifTs || 0;
      notifyNow = (newEntries[0].ts - lastNotifTs) > CHANGELOG_NOTIF_GAP;
      tx.set(ref, { entries: merged, lastNotifTs: notifyNow ? newEntries[0].ts : lastNotifTs });
    });
    if(notifyNow){
      const first = newEntries[0];
      await db.collection('meta').doc('platformNotif').set({
        title: 'Mise à jour de la plateforme',
        sub: first.label,
        ic: '🆕', bg: '#b0d4f4',
        ts: Date.now(), by: currentUser?.email || 'admin'
      });
    }
  }catch(e){ console.warn('changelog push error:', e); }
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
  const msg = prompt('Décris la mise à jour (ex : « Nouveaux documents de Thermodynamique L2 ») :');
  if(!msg || !msg.trim()) return;
  await logChange('note', msg.trim());
  toast('Mise à jour enregistrée et annoncée !', 'ok');
}

document.addEventListener('DOMContentLoaded', updateFooterDate);
