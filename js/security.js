// ═══ security.js ═══
/* ═══════════════ SÉCURITÉ & CONFIDENTIALITÉ ═══════════════
   - Masquage des emails et liste de comptes suspendus par HACHAGE (aucun email en clair)
   - Panneau « Sécurité du compte » : changement de mot de passe (jauge de force, vérification,
     notification par email), mot de passe oublié sans révéler si un compte existe
   - Connexion / inscription avec Google
   - Choix du niveau pour les nouveaux comptes Google                                           */

/* ───────── Emails : masquage & hachage ───────── */
function maskEmail(email){
  const e = String(email || '');
  const at = e.indexOf('@');
  if(at < 1) return e ? e[0] + '***' : '';
  const local = e.slice(0, at), domain = e.slice(at);
  return local.slice(0, Math.min(2, local.length)) + '***' + domain;
}

// SHA-256 de l'email normalisé : sert à repérer un compte suspendu sans stocker l'adresse
async function hashEmail(email){
  const data = new TextEncoder().encode('erse-academy|' + String(email || '').trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
const SEC_HEX64 = /^[0-9a-f]{64}$/;

// Publie uniquement les champs nécessaires au classement, sous l'UID Firebase.
async function syncPublicProfile(user){
  const fbUser = auth && auth.currentUser;
  const profile = user || currentUser;
  if(!fbUser || !profile || profile.role === 'admin') return;
  if(profile.email){
    await db.collection('users').doc(profile.email).set({ authUid: fbUser.uid }, { merge: true });
  }
  const name = String(profile.name || '').trim().slice(0, 60) || 'Étudiant';
  await db.collection('publicProfiles').doc(fbUser.uid).set({
    name,
    initials: String(profile.initials || '??').slice(0, 4),
    color: /^#[0-9a-f]{6}$/i.test(profile.color || '') ? profile.color : '#185FA5',
    level: [1,2,3].includes(Number(profile.level)) ? Number(profile.level) : 1,
    passed: Math.max(0, Number(profile.passed) || 0),
    avgScore: Math.max(0, Math.min(100, Number(profile.avgScore) || 0)),
    certs: Math.max(0, Number(profile.certs) || 0),
    updatedAt: Date.now()
  }, { merge: true });
}

// Vrai si le compte est suspendu. En cas d'erreur réseau/droits : on laisse passer (jamais de blocage à tort).
async function checkBanned(email){
  try{
    const snap = await db.collection('bannedEmails').doc('list').get();
    if(!snap.exists) return false;
    const list = snap.data().emails || [];
    const plain = String(email || '').toLowerCase();
    if(list.some(x => String(x).toLowerCase() === plain)) return true; // anciennes entrées en clair
    return list.includes(await hashEmail(plain));
  }catch(e){ return false; }
}

// Administrateur : ajoute un compte à la liste (en hachage) et convertit les anciennes entrées en clair
async function banEmailHash(email){
  const ref = db.collection('bannedEmails').doc('list');
  const snap = await ref.get();
  const current = snap.exists ? (snap.data().emails || []) : [];
  const out = [];
  for(const x of current){ out.push(SEC_HEX64.test(x) ? x : await hashEmail(x)); }
  const h = await hashEmail(email);
  if(!out.includes(h)) out.push(h);
  await ref.set({ emails: out, format: 'sha256-v1' });
}

/* ───────── Éléments d'interface communs ───────── */
const SEC = {
  card:'background:var(--card-bg,#fff);color:var(--text,#1e293b);',
  muted:'color:var(--muted,#64748b);',
  border:'var(--border,#e2e8f0)',
  input:'width:100%;box-sizing:border-box;padding:11px 44px 11px 12px;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--input-bg,#fff);color:var(--text,#1e293b);font-size:14px;font-family:inherit;outline:none;',
  btn:'width:100%;padding:13px;border:none;border-radius:11px;background:linear-gradient(90deg,#185FA5,#0b2b5c);color:#fff;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit;'
};
function secEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function secOverlay(id, html, opts){
  const old = document.getElementById(id); if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = id;
  ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(5,8,15,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;';
  ov.innerHTML = html;
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
  const onKey = e => { if(e.key === 'Escape' && !(opts && opts.locked && opts.locked())) close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('mousedown', e => { if(e.target === ov && !(opts && opts.locked && opts.locked())) close(); });
  document.body.appendChild(ov);
  ov._close = close;
  return ov;
}

function secDialog(icon, title, bodyHtml, buttons){
  const btns = (buttons || [{ label:'Compris', primary:true }]).map((b,i) =>
    `<button data-i="${i}" style="${b.primary ? SEC.btn : 'width:100%;padding:12px;border:1px solid '+SEC.border+';border-radius:11px;background:transparent;color:inherit;font-size:14px;cursor:pointer;font-family:inherit;'}margin-top:8px;">${secEsc(b.label)}</button>`).join('');
  const ov = secOverlay('sec-dialog', `<div style="${SEC.card}width:100%;max-width:400px;border-radius:18px;padding:1.6rem 1.4rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);">
      <div style="font-size:2.4rem;margin-bottom:.4rem;">${icon}</div>
      <div style="font-size:1.05rem;font-weight:700;margin-bottom:.5rem;">${secEsc(title)}</div>
      <div style="font-size:13.5px;line-height:1.65;${SEC.muted}margin-bottom:.8rem;">${bodyHtml}</div>${btns}</div>`);
  ov.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => {
    const b = (buttons || [{}])[+el.dataset.i]; ov._close(); if(b && b.action) b.action();
  }));
  return ov;
}

/* ═══════════════ MOT DE PASSE ═══════════════ */
const SEC_COMMON = ['password','motdepasse','12345678','123456789','azerty','qwerty','erse','azertyui','00000000','11111111','abcdefgh','iloveyou','admin'];

// Évalue un mot de passe. valid = règles de l'inscription (8 car., 1 majuscule, 1 chiffre) + pas un mot de passe courant.
function evalPassword(pwd, email){
  const p = String(pwd || '');
  const lower = p.toLowerCase();
  const local = String(email || '').split('@')[0].toLowerCase();
  const checks = {
    len8:    p.length >= 8,
    upper:   /[A-Z]/.test(p),
    digit:   /[0-9]/.test(p),
    len12:   p.length >= 12,
    symbol:  /[^A-Za-z0-9]/.test(p),
    mixed:   /[a-z]/.test(p) && /[A-Z]/.test(p),
    common:  SEC_COMMON.some(w => lower.includes(w)) || /^(.)\1+$/.test(p),
    personal: local.length >= 4 && lower.includes(local)
  };
  let score = 0;
  if(checks.len8) score++;
  if(checks.len12) score++;
  if(checks.mixed && checks.digit) score++;
  if(checks.symbol) score++;
  if(/(.)\1{3,}/.test(p)) score--;
  if(checks.common || checks.personal) score = Math.min(score, 1);
  if(!checks.len8) score = Math.min(score, 1);
  score = Math.max(0, Math.min(4, score));
  const labels = ['Très faible','Faible','Moyen','Fort','Excellent'];
  return { score, label: p ? labels[score] : '', checks, valid: checks.len8 && checks.upper && checks.digit && !checks.common };
}

// Mot de passe aléatoire de 16 caractères (sans caractères ambigus), généré dans le navigateur
function generatePassword(){
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!@#$%&*?+-=';
  const all = U + L + D + S;
  const rnd = n => { const a = new Uint32Array(1), max = Math.floor(0x100000000 / n) * n; let x; do{ crypto.getRandomValues(a); x = a[0]; }while(x >= max); return x % n; };
  const pick = set => set[rnd(set.length)];
  const out = [pick(U), pick(L), pick(D), pick(S)];
  while(out.length < 16) out.push(pick(all));
  for(let i = out.length - 1; i > 0; i--){ const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}

function secFriendlyAuthError(e){
  switch(e && e.code){
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Le mot de passe actuel est incorrect.';
    case 'auth/too-many-requests': return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
    case 'auth/requires-recent-login': return 'Pour votre sécurité, reconnectez-vous puis réessayez.';
    case 'auth/weak-password': return 'Ce mot de passe est trop faible.';
    case 'auth/network-request-failed': return 'Connexion impossible. Vérifiez votre réseau.';
    default: return 'Une erreur est survenue. Réessayez dans un instant.';
  }
}

let pwFails = 0, pwLockUntil = 0, pwBusy = false;

function changePassword(){ openPasswordPanel(); }

function openPasswordPanel(){
  const user = auth.currentUser;
  if(!user || !currentUser){ toast('Session expirée : reconnectez-vous','err'); return; }
  const hasPassword = (user.providerData || []).some(p => p.providerId === 'password');
  const masked = secEsc(maskEmail(user.email));
  const head = `<div style="background:linear-gradient(135deg,#0b2b5c,#185FA5);padding:1.3rem 1.4rem;color:#fff;position:relative;">
      <button id="pw-x" aria-label="Fermer" style="position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.18);color:#fff;font-size:15px;cursor:pointer;">✕</button>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:22px;">🛡️</div>
        <div><div id="pw-title" style="font-size:1.05rem;font-weight:700;">Sécurité du compte</div>
        <div style="font-size:12px;opacity:.8;margin-top:2px;">Compte : ${masked}</div></div>
      </div></div>`;

  if(!hasPassword){
    const ov = secOverlay('pw-overlay', `<div style="${SEC.card}width:100%;max-width:440px;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.5);">${head}
      <div style="padding:1.4rem;text-align:center;">
        <div style="font-size:2rem;margin-bottom:.4rem;">🔐</div>
        <div style="font-weight:700;margin-bottom:.4rem;">Vous vous connectez avec Google</div>
        <div style="font-size:13.5px;line-height:1.65;${SEC.muted}">Votre mot de passe est géré par votre compte Google : il n'existe pas de mot de passe ERSE ACADEMY à modifier. Pour renforcer la sécurité, activez la validation en deux étapes sur votre compte Google.</div>
        <a href="https://myaccount.google.com/security" target="_blank" rel="noopener" style="display:block;margin-top:1rem;${SEC.btn}text-decoration:none;box-sizing:border-box;">Gérer la sécurité de mon compte Google</a>
      </div></div>`);
    ov.querySelector('#pw-x').addEventListener('click', () => ov._close());
    return;
  }

  const eye = id => `<button type="button" data-eye="${id}" aria-label="Afficher ou masquer" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);border:none;background:transparent;font-size:17px;cursor:pointer;padding:6px 8px;">👁</button>`;
  const field = (id, label, auto, extra) => `<div style="margin-bottom:12px;">
      <label for="${id}" style="font-size:12px;font-weight:600;${SEC.muted}display:block;margin-bottom:5px;">${label}</label>
      <div style="position:relative;"><input id="${id}" type="password" autocomplete="${auto}" style="${SEC.input}"${extra||''}>${eye(id)}</div></div>`;
  const rule = (id, txt) => `<div id="${id}" style="display:flex;gap:7px;font-size:12px;line-height:1.5;${SEC.muted}"><span class="ic">○</span><span>${txt}</span></div>`;

  const ov = secOverlay('pw-overlay', `<div style="${SEC.card}width:100%;max-width:460px;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.5);margin:auto;">${head}
    <div id="pw-body" style="padding:1.3rem 1.4rem 1.4rem;">
      <form id="pw-form" autocomplete="off" novalidate>
        ${field('pw-cur','Mot de passe actuel','current-password')}
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <label for="pw-new" style="font-size:12px;font-weight:600;${SEC.muted}">Nouveau mot de passe</label>
            <button type="button" id="pw-gen" style="border:none;background:transparent;color:var(--b6,#185FA5);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🎲 Suggérer un mot de passe fort</button>
          </div>
          <div style="position:relative;"><input id="pw-new" type="password" autocomplete="new-password" style="${SEC.input}">${eye('pw-new')}</div>
          <div style="display:flex;gap:5px;margin-top:8px;" aria-hidden="true">${[0,1,2,3].map(i => `<div class="pw-bar" style="flex:1;height:5px;border-radius:99px;background:var(--border,#e2e8f0);transition:background .2s;"></div>`).join('')}</div>
          <div id="pw-strength" style="font-size:12px;font-weight:600;margin-top:5px;min-height:16px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;margin-top:8px;">
            ${rule('r-len','8 caractères minimum')}${rule('r-up','Une majuscule')}${rule('r-dig','Un chiffre')}${rule('r-diff','Différent de l\'actuel')}
            ${rule('r-12','12 caractères et plus (conseillé)')}${rule('r-sym','Un symbole (conseillé)')}
          </div>
          <div id="pw-warn" style="font-size:12px;color:#b45309;margin-top:8px;display:none;"></div>
        </div>
        ${field('pw-cf','Confirmer le nouveau mot de passe','new-password')}
        <div id="pw-match" style="font-size:12px;min-height:16px;margin:-6px 0 10px;"></div>
        <div id="pw-err" role="alert" style="display:none;background:#fee2e2;color:#991b1b;border-radius:10px;padding:.65rem .8rem;font-size:13px;margin-bottom:12px;"></div>
        <button id="pw-submit" type="submit" disabled style="${SEC.btn}opacity:.5;cursor:not-allowed;">Mettre à jour le mot de passe</button>
      </form>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:12px;flex-wrap:wrap;gap:6px;">
        <button id="pw-forgot" type="button" style="border:none;background:transparent;color:var(--b6,#185FA5);cursor:pointer;font-size:12px;font-family:inherit;text-decoration:underline;padding:0;">Mot de passe actuel oublié ?</button>
        <span style="${SEC.muted}">🔒 Connexion chiffrée</span>
      </div>
      <div style="margin-top:14px;padding:.75rem .85rem;border-radius:10px;background:var(--b0,#f0f7ff);font-size:12px;line-height:1.6;${SEC.muted}">
        <b style="color:var(--b8,#0b2b5c);">Conseils :</b> n'utilisez pas le même mot de passe que sur d'autres sites, évitez votre nom ou votre date de naissance, et ne le partagez jamais. Un gestionnaire de mots de passe vous aide à en avoir un différent par site.
      </div>
    </div></div>`, { locked: () => pwBusy });

  const $ = id => ov.querySelector('#' + id);
  const setRule = (id, ok) => { const el = $(id); el.querySelector('.ic').textContent = ok ? '✓' : '○'; el.style.color = ok ? '#15803d' : ''; };
  const showErr = msg => { const e = $('pw-err'); e.textContent = msg; e.style.display = msg ? 'block' : 'none'; };
  const colors = ['#ef4444','#f59e0b','#84cc16','#16a34a'];

  function refresh(){
    const cur = $('pw-cur').value, nw = $('pw-new').value, cf = $('pw-cf').value;
    const ev = evalPassword(nw, user.email);
    const diff = nw.length > 0 && cur.length > 0 && nw !== cur;
    setRule('r-len', ev.checks.len8); setRule('r-up', ev.checks.upper); setRule('r-dig', ev.checks.digit);
    setRule('r-diff', diff); setRule('r-12', ev.checks.len12); setRule('r-sym', ev.checks.symbol);
    const bars = ov.querySelectorAll('.pw-bar');
    bars.forEach((b,i) => { b.style.background = (nw && i < Math.max(1, ev.score)) ? colors[Math.max(0, ev.score - 1)] : 'var(--border,#e2e8f0)'; });
    const st = $('pw-strength'); st.textContent = nw ? 'Force : ' + ev.label : ''; st.style.color = nw ? colors[Math.max(0, ev.score - 1)] : '';
    const warn = $('pw-warn');
    if(nw && ev.checks.common){ warn.textContent = '⚠ Ce mot de passe est trop courant ou répétitif.'; warn.style.display = 'block'; }
    else if(nw && ev.checks.personal){ warn.textContent = '⚠ Évitez d\'utiliser votre adresse email dans le mot de passe.'; warn.style.display = 'block'; }
    else warn.style.display = 'none';
    const m = $('pw-match');
    if(cf){ const same = nw === cf; m.textContent = same ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'; m.style.color = same ? '#15803d' : '#b91c1c'; }
    else m.textContent = '';
    const ok = cur.length > 0 && ev.valid && diff && nw === cf && !pwBusy;
    const btn = $('pw-submit'); btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.5'; btn.style.cursor = ok ? 'pointer' : 'not-allowed';
  }

  ['pw-cur','pw-new','pw-cf'].forEach(id => $(id).addEventListener('input', () => { showErr(''); refresh(); }));
  ov.querySelectorAll('[data-eye]').forEach(b => b.addEventListener('click', () => {
    const i = $(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? '👁' : '🙈';
  }));
  $('pw-x').addEventListener('click', () => { if(!pwBusy) ov._close(); });
  $('pw-gen').addEventListener('click', () => {
    const g = generatePassword();
    $('pw-new').value = g; $('pw-cf').value = g;
    $('pw-new').type = 'text'; $('pw-cf').type = 'text';
    ov.querySelectorAll('[data-eye="pw-new"],[data-eye="pw-cf"]').forEach(b => b.textContent = '🙈');
    refresh();
    if(navigator.clipboard) navigator.clipboard.writeText(g).then(() => toast('Mot de passe copié : conservez-le dans un endroit sûr','ok')).catch(()=>{});
  });
  $('pw-forgot').addEventListener('click', async () => {
    try{ await auth.sendPasswordResetEmail(user.email); }catch(e){}
    toast('Un lien de réinitialisation a été envoyé à ' + maskEmail(user.email), 'ok');
  });
  $('pw-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if(pwBusy || $('pw-submit').disabled) return;
    const wait = Math.ceil((pwLockUntil - Date.now()) / 1000);
    if(wait > 0){ showErr('Trop de tentatives incorrectes. Réessayez dans ' + wait + ' s.'); return; }
    const cur = $('pw-cur').value, nw = $('pw-new').value;
    pwBusy = true; refresh(); showErr('');
    const btn = $('pw-submit'); const label = btn.textContent; btn.textContent = 'Vérification…';
    try{
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(nw);
      pwFails = 0;
      secPasswordChanged(ov, user);
    }catch(e){
      if(['auth/wrong-password','auth/invalid-credential','auth/invalid-login-credentials'].includes(e && e.code)){
        pwFails++;
        if(pwFails >= 5){ pwLockUntil = Date.now() + 60000; pwFails = 0; showErr('Trop de tentatives incorrectes. Réessayez dans 60 s.'); }
        else showErr(secFriendlyAuthError(e) + ' (' + (5 - pwFails) + ' essai' + (5 - pwFails > 1 ? 's' : '') + ' restant' + (5 - pwFails > 1 ? 's' : '') + ')');
      } else showErr(secFriendlyAuthError(e));
      pwBusy = false; btn.textContent = label; refresh();
    }
  });
  setTimeout(() => { const f = $('pw-cur'); if(f) f.focus(); }, 60);
  refresh();
}

function secPasswordChanged(ov, user){
  pwBusy = false;
  const when = new Date().toLocaleString('fr-FR', { dateStyle:'long', timeStyle:'short' });
  try{
    if(typeof ejsSend === 'function' && typeof EJS !== 'undefined'){
      ejsSend(EJS.tplNotif, {
        to_name: currentUser.name, to_email: user.email,
        subject: 'Votre mot de passe a été modifié',
        message: 'Le mot de passe de votre compte ERSE ACADEMY a été modifié le ' + when + '.\n\nSi vous êtes à l\'origine de cette modification, aucune action n\'est nécessaire.\n\nSi ce n\'est pas le cas, réinitialisez immédiatement votre mot de passe depuis la page de connexion (« Mot de passe oublié ») et contactez-nous.'
      });
    }
  }catch(e){}
  if(typeof pushNotif === 'function') pushNotif('Mot de passe modifié', 'Votre mot de passe a été mis à jour. Si vous n\'êtes pas à l\'origine de cette modification, réinitialisez-le immédiatement.', '🔒', '#c0dd97', 'profile');
  const body = ov.querySelector('#pw-body');
  body.innerHTML = `<div style="text-align:center;padding:.8rem .2rem 0;">
      <div style="width:64px;height:64px;border-radius:50%;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 12px;">✓</div>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:6px;">Mot de passe modifié</div>
      <div style="font-size:13.5px;line-height:1.7;${SEC.muted}">Votre nouveau mot de passe est actif. Un email de confirmation vous a été envoyé à <b>${secEsc(maskEmail(user.email))}</b>.<br>Si vous n'êtes pas à l'origine de ce changement, réinitialisez-le immédiatement.</div>
      <button id="pw-done" style="${SEC.btn}margin-top:18px;">Terminer</button></div>`;
  body.querySelector('#pw-done').addEventListener('click', () => ov._close());
  toast('Mot de passe modifié avec succès','ok');
}

/* Mot de passe oublié depuis l'écran de connexion — ne révèle JAMAIS si un compte existe */
function forgotPassword(){
  const prefill = (document.getElementById('login-email') || {}).value || '';
  const ov = secOverlay('fp-overlay', `<div style="${SEC.card}width:100%;max-width:400px;border-radius:18px;padding:1.5rem 1.4rem;box-shadow:0 20px 60px rgba(0,0,0,.45);">
      <div style="font-size:2.2rem;text-align:center;">🔑</div>
      <div style="font-size:1.05rem;font-weight:700;text-align:center;margin:.2rem 0 .4rem;">Mot de passe oublié ?</div>
      <div style="font-size:13px;line-height:1.6;${SEC.muted}text-align:center;margin-bottom:1rem;">Saisissez l'adresse email de votre compte. Si elle correspond à un compte, vous recevrez un lien pour choisir un nouveau mot de passe.</div>
      <form id="fp-form" novalidate>
        <input id="fp-email" type="email" autocomplete="email" placeholder="votre@email.com" value="${secEsc(prefill)}" style="${SEC.input}padding-right:12px;margin-bottom:12px;">
        <div id="fp-msg" role="status" style="font-size:13px;min-height:18px;margin-bottom:8px;"></div>
        <button id="fp-send" type="submit" style="${SEC.btn}">Envoyer le lien</button>
        <button id="fp-cancel" type="button" style="width:100%;margin-top:8px;padding:11px;border:1px solid ${SEC.border};border-radius:11px;background:transparent;color:inherit;cursor:pointer;font-family:inherit;">Annuler</button>
      </form></div>`);
  const $ = id => ov.querySelector('#' + id);
  $('fp-cancel').addEventListener('click', () => ov._close());
  $('fp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('fp-email').value.trim().toLowerCase();
    const msg = $('fp-msg');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.style.color = '#b91c1c'; msg.textContent = 'Adresse email invalide.'; return; }
    const btn = $('fp-send'); btn.disabled = true; btn.textContent = 'Envoi…';
    try{ await auth.sendPasswordResetEmail(email); }catch(err){
      if(err && err.code === 'auth/too-many-requests'){ msg.style.color = '#b91c1c'; msg.textContent = 'Trop de demandes. Patientez quelques minutes.'; btn.disabled = false; btn.textContent = 'Envoyer le lien'; return; }
    }
    // Même message quel que soit le résultat : on ne révèle pas si un compte existe
    msg.style.color = '#15803d';
    msg.textContent = 'Si un compte existe avec cette adresse, un email vient d\'être envoyé. Pensez à vérifier vos courriers indésirables.';
    btn.textContent = 'Email envoyé ✓';
  });
  setTimeout(() => { const f = ov.querySelector('#fp-email'); if(f) f.focus(); }, 60);
}

/* ═══════════════ CONNEXION GOOGLE ═══════════════ */
// Google refuse la connexion dans les navigateurs intégrés à certaines applications (Facebook, Instagram…)
function isEmbeddedBrowser(){
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  return /FBAN|FBAV|FB_IAB|Instagram|Snapchat|MicroMessenger|BytedanceWebview|musical_ly|TikTok|; wv\)|\bLine\//i.test(ua);
}

function secGoogleBusy(on){
  document.querySelectorAll('.btn-google').forEach(b => {
    b.disabled = on; b.style.opacity = on ? '.6' : '1';
    const t = b.querySelector('.g-label'); if(t){ if(on){ t.dataset.o = t.textContent; t.textContent = 'Connexion…'; } else if(t.dataset.o) t.textContent = t.dataset.o; }
  });
}

async function doLoginGoogle(){
  if(isEmbeddedBrowser()){
    secDialog('🌐', 'Ouvrez le site dans votre navigateur', 'Google bloque la connexion dans ce navigateur intégré. Ouvrez ce lien dans <b>Chrome</b> ou <b>Safari</b> (menu ⋮ ou ⋯ puis « Ouvrir dans le navigateur »), ou connectez-vous avec votre email.');
    return;
  }
  secGoogleBusy(true);
  try{
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await auth.signInWithPopup(googleProvider);
    // onAuthStateChanged (init.js) crée ou charge le profil
  }catch(e){
    const c = e && e.code;
    if(c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request'){ /* annulé : rien à dire */ }
    else if(c === 'auth/popup-blocked') toast('Votre navigateur a bloqué la fenêtre Google. Autorisez les pop-ups pour ce site puis réessayez.','err');
    else if(c === 'auth/unauthorized-domain') secDialog('⚙️','Domaine non autorisé','Ce site n\'est pas encore autorisé pour la connexion Google. Administrateur : dans la console Firebase, Authentication › Paramètres › Domaines autorisés, ajoutez <b>' + secEsc(location.hostname) + '</b>.');
    else if(c === 'auth/operation-not-allowed') secDialog('⚙️','Connexion Google désactivée','Administrateur : activez le fournisseur « Google » dans la console Firebase (Authentication › Méthode de connexion).');
    else if(c === 'auth/account-exists-with-different-credential'){
      const email = e.email || (e.customData && e.customData.email) || '';
      const credential = firebase.auth.GoogleAuthProvider.credentialFromError(e);
      if(email && credential) linkGoogleToExistingAccount(email, credential);
      else toast('Cet email est déjà associé à un compte. Connectez-vous avec la méthode utilisée lors de l’inscription.','err');
    }
    else if(c === 'auth/network-request-failed') toast('Connexion impossible. Vérifiez votre réseau.','err');
    else toast('Connexion Google impossible. Réessayez ou utilisez votre email.','err');
  }finally{ secGoogleBusy(false); }
}

// Associe Google à un compte ERSE existant avec confirmation du mot de passe actuel.
function linkGoogleToExistingAccount(email, googleCredential){
  const ov = secOverlay('google-link-overlay', `<div style="${SEC.card}width:100%;max-width:420px;border-radius:18px;padding:1.5rem 1.4rem;box-shadow:0 24px 70px rgba(0,0,0,.5);">
      <div style="font-size:2.2rem;text-align:center;">🔐</div>
      <div style="font-size:1.05rem;font-weight:700;text-align:center;margin:.2rem 0 .4rem;">Confirmer votre compte ERSE</div>
      <div style="font-size:13px;line-height:1.6;${SEC.muted}text-align:center;margin-bottom:1rem;">Un compte ERSE existe déjà pour <b>${secEsc(maskEmail(email))}</b>. Saisissez une fois son mot de passe pour associer Google.</div>
      <form id="google-link-form" novalidate>
        <label for="google-link-password" style="font-size:12px;font-weight:600;${SEC.muted}display:block;margin-bottom:5px;">Mot de passe ERSE actuel</label>
        <input id="google-link-password" type="password" autocomplete="current-password" style="${SEC.input}padding-right:12px;margin-bottom:10px;">
        <div id="google-link-error" role="alert" style="display:none;color:#b91c1c;font-size:13px;margin-bottom:10px;"></div>
        <button id="google-link-submit" type="submit" style="${SEC.btn}">Associer mon compte Google</button>
        <button id="google-link-cancel" type="button" style="width:100%;margin-top:8px;padding:11px;border:1px solid ${SEC.border};border-radius:11px;background:transparent;color:inherit;cursor:pointer;font-family:inherit;">Annuler</button>
      </form></div>`, { locked: () => false });
  const form = ov.querySelector('#google-link-form');
  const input = ov.querySelector('#google-link-password');
  const btn = ov.querySelector('#google-link-submit');
  const error = ov.querySelector('#google-link-error');
  ov.querySelector('#google-link-cancel').addEventListener('click', () => ov._close());
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if(!input.value){ error.textContent = 'Saisissez le mot de passe de votre compte ERSE.'; error.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Vérification…'; error.style.display = 'none';
    try{
      const signedIn = await auth.signInWithEmailAndPassword(email, input.value);
      await signedIn.user.linkWithCredential(googleCredential);
      ov._close();
      toast('Compte Google associé. Vous pourrez désormais vous connecter avec Google.','ok');
    }catch(err){
      if(err && ['auth/wrong-password','auth/invalid-credential','auth/invalid-login-credentials'].includes(err.code)) error.textContent = 'Mot de passe ERSE incorrect.';
      else if(err && err.code === 'auth/credential-already-in-use') error.textContent = 'Ce compte Google est déjà associé à un autre compte ERSE.';
      else if(err && err.code === 'auth/provider-already-linked'){
        ov._close(); toast('Google est déjà associé. Réessayez la connexion Google.','ok'); return;
      } else error.textContent = secFriendlyAuthError(err);
      error.style.display = 'block'; btn.disabled = false; btn.textContent = 'Associer mon compte Google'; input.focus();
    }
  });
  setTimeout(() => input.focus(), 60);
}

/* ═══════════════ NIVEAU DES NOUVEAUX COMPTES GOOGLE ═══════════════ */
function showLevelChooser(user){
  if(!user) return;
  let chosen = user.level || 1;
  const card = (n, t, d) => `<button type="button" data-lv="${n}" style="text-align:left;width:100%;padding:12px 14px;margin-bottom:8px;border-radius:12px;border:2px solid ${n===chosen?'#185FA5':SEC.border};background:${n===chosen?'var(--b0,#f0f7ff)':'transparent'};color:inherit;cursor:pointer;font-family:inherit;">
      <div style="font-weight:700;font-size:14px;">${t}</div><div style="font-size:12px;${SEC.muted}margin-top:2px;">${d}</div></button>`;
  const first = secEsc(String(user.name || '').split(' ')[0] || '');
  const ov = secOverlay('lv-overlay', `<div style="${SEC.card}width:100%;max-width:420px;border-radius:18px;padding:1.5rem 1.4rem;box-shadow:0 24px 70px rgba(0,0,0,.5);" >
      <div style="text-align:center;font-size:2.2rem;">🎓</div>
      <div style="text-align:center;font-size:1.1rem;font-weight:700;margin:.2rem 0 .3rem;">Bienvenue${first ? ', ' + first : ''} !</div>
      <div style="text-align:center;font-size:13px;line-height:1.6;${SEC.muted}margin-bottom:1rem;">Choisissez votre niveau d'études. Vous passerez au niveau supérieur en validant vos examens.</div>
      <div id="lv-list">${card(1,'Licence 1','Première année')}${card(2,'Licence 2','Deuxième année')}${card(3,'Licence 3','Troisième année')}</div>
      <button id="lv-ok" style="${SEC.btn}margin-top:6px;">Continuer</button>
      <div style="font-size:11px;${SEC.muted}text-align:center;margin-top:10px;line-height:1.5;">En continuant, vous acceptez les <span id="lv-cgu" style="text-decoration:underline;cursor:pointer;">Conditions d'utilisation</span> et la <span id="lv-priv" style="text-decoration:underline;cursor:pointer;">Politique de confidentialité</span>.</div></div>`,
    { locked: () => true });
  const paint = () => ov.querySelectorAll('[data-lv]').forEach(b => { const on = +b.dataset.lv === chosen; b.style.borderColor = on ? '#185FA5' : 'var(--border,#e2e8f0)'; b.style.background = on ? 'var(--b0,#f0f7ff)' : 'transparent'; });
  ov.querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => { chosen = +b.dataset.lv; paint(); }));
  ov.querySelector('#lv-cgu').addEventListener('click', () => showLegal('cgu'));
  ov.querySelector('#lv-priv').addEventListener('click', () => showLegal('privacy'));
  ov.querySelector('#lv-ok').addEventListener('click', async () => {
    const btn = ov.querySelector('#lv-ok'); btn.disabled = true; btn.textContent = 'Enregistrement…';
    user.level = chosen;
    const known = DB.users.find(u => u.email === user.email); if(known) known.level = chosen;
    try{
      if(fbReady || auth.currentUser){
        await db.collection('users').doc(user.email).set({ level: chosen }, { merge: true });
        syncPublicProfile(user);
      }
    }catch(e){ console.warn('showLevelChooser:', e); }
    try{ saveData(); }catch(e){}
    ov._close();
    if(typeof renderHome === 'function') renderHome();
    if(typeof goPage === 'function') goPage('courses');
    toast('Niveau enregistré : Licence ' + chosen, 'ok');
  });
}
