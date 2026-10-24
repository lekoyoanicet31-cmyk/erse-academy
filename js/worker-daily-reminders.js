/* ═══════════════════════════════════════════════════════════
   ERSE ACADEMY — rappel de planning quotidien par email
   À COLLER dans ton worker groq-proxy existant sur Cloudflare.
   Gratuit : utilise un Cron Trigger Cloudflare (inclus dans le
   plan gratuit) au lieu de Firebase Cloud Functions (payant).

   Ce fichier contient :
   1. Des fonctions utilitaires (à coller EN HAUT du fichier,
      avant "var index_default = {" ou équivalent)
   2. Un handler scheduled() (à coller DANS le même objet que
      ton fetch() existant, comme une méthode sœur)

   Secrets à ajouter sur le worker (Cloudflare dashboard →
   ton worker → Settings → Variables → Add secret) :
   - FIREBASE_CLIENT_EMAIL  (depuis le JSON de compte de service)
   - FIREBASE_PRIVATE_KEY   (idem — colle la clé telle quelle,
                             avec les -----BEGIN/END-----)
═══════════════════════════════════════════════════════════ */

// ── 1. UTILITAIRES — à coller en haut du fichier ──

const FIREBASE_PROJECT_ID = 'erse-academy';
const EMAILJS_SERVICE_ID = 'service_y5ua3k2';
const EMAILJS_TEMPLATE_ID = 'template_na4ncag';
const EMAILJS_PUBLIC_KEY = 'ctEzadHY3pbYSkI9K';
const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function base64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlFromString(str) {
  return base64url(new TextEncoder().encode(str));
}
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Échange le compte de service Firebase contre un token d'accès Google
// (scope Firestore en lecture/écriture), via un JWT signé RS256.
async function getFirestoreAccessToken(env) {
  const header = base64urlFromString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64urlFromString(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const unsigned = header + '.' + claims;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(env.FIREBASE_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + base64url(new Uint8Array(signature));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt)
  });
  if (!res.ok) throw new Error('OAuth Google échoué: ' + await res.text());
  const data = await res.json();
  return data.access_token;
}

// Convertit le JSON typé de Firestore (REST) en objet JS normal.
function fsValue(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(fsValue);
  if (v.mapValue !== undefined) return fsFields(v.mapValue.fields || {});
  return null;
}
function fsFields(fields) {
  const out = {};
  for (const k in fields) out[k] = fsValue(fields[k]);
  return out;
}

async function listPlannings(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/plannings?pageSize=300`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Firestore list échoué: ' + await res.text());
  const data = await res.json();
  return (data.documents || []).map(doc => fsFields(doc.fields || {}));
}

async function sendReminderEmail({ toName, toEmail, subject, message }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: { to_name: toName, to_email: toEmail, subject, message }
    })
  });
  if (!res.ok) throw new Error('EmailJS ' + res.status + ': ' + await res.text());
}

async function runDailyReminders(env) {
  const token = await getFirestoreAccessToken(env);
  const plannings = await listPlannings(token);

  const beninNow = new Date(Date.now() + 60 * 60 * 1000); // Bénin = UTC+1 toute l'année
  const dayName = DAYS_FR[(beninNow.getUTCDay() + 6) % 7];

  let sent = 0;
  for (const data of plannings) {
    if (!data.remindersEnabled || !data.email || !Array.isArray(data.weekTemplate)) continue;
    const dayPlan = data.weekTemplate.find(d => d.day === dayName);
    if (!dayPlan) continue;
    const matieres = (dayPlan.slots || []).filter(s => s.type === 'matiere');
    if (!matieres.length) continue;

    const lignes = matieres.map(s => `• ${s.time} — ${s.subject}${s.note ? ' (' + s.note + ')' : ''}`).join('\n');
    try {
      await sendReminderEmail({
        toName: data.name || 'Étudiant',
        toEmail: data.email,
        subject: `📅 Ton programme du jour (${dayName})`,
        message: `Voici ton planning de révision pour aujourd'hui :\n\n${lignes}\n\nBon courage !`
      });
      sent++;
    } catch (e) {
      console.error('Échec envoi à', data.email, e.message);
    }
  }
  console.log(`Rappels envoyés : ${sent}/${plannings.length}`);
}

// ── 2. HANDLER — à coller DANS le même objet que fetch(), comme ceci :
//
// var index_default = {
//   async fetch(request, env) { ... ton code existant, inchangé ... },
//   async scheduled(event, env, ctx) {
//     ctx.waitUntil(runDailyReminders(env));
//   }
// };
