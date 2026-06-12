// ═══ exams.js ═══
/* ═══════════════════════════════════════════
   BOUTIQUE D'ÉPREUVES
═══════════════════════════════════════════ */
let shopFilter = 'all';
let shopPayMode = false;

function filterShop(f, btn){
  shopFilter = f;
  document.querySelectorAll('.shop-filter-btn').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderShop();
}

function renderShop(){
  shopPayMode = DB.shopPayMode || false;
  const items = DB.shop || [];
  const grid = document.getElementById('shop-grid');
  if(!grid) return;

  // Stats
  const statTotal = document.getElementById('stat-total');
  const statFree = document.getElementById('stat-free');
  if(statTotal) statTotal.textContent = items.length;
  if(statFree) statFree.textContent = items.filter(i=>i.isFree).length;

  // Masquer filtres free/paid si mode gratuit (ne pas révéler existence du premium)
  const freeBtn = document.getElementById('shop-filter-free');
  const paidBtn = document.getElementById('shop-filter-paid');
  if(freeBtn) freeBtn.style.display = shopPayMode ? 'inline-block' : 'none';
  if(paidBtn) paidBtn.style.display = shopPayMode ? 'inline-block' : 'none';

  // Filtrer par niveau utilisateur (on garde tout, on marquera les verrouillés)
  const userLvl = getUserLevel();
  let filtered = items.filter(i=>i.active!==false); // Exclure les épreuves désactivées
  if(shopFilter==='L1') filtered = filtered.filter(i=>i.licence==='L1');
  else if(shopFilter==='L2') filtered = filtered.filter(i=>i.licence==='L2');
  else if(shopFilter==='L3') filtered = filtered.filter(i=>i.licence==='L3');
  else if(shopFilter==='free') filtered = filtered.filter(i=>i.isFree);
  else if(shopFilter==='paid') filtered = filtered.filter(i=>!i.isFree);
  if(filtered.length===0){
    grid.innerHTML=`<div class="shop-empty"><div class="shop-empty-ic">📦</div><div class="shop-empty-txt">Aucune épreuve disponible pour le moment.</div><div class="shop-empty-sub">L'administrateur ajoutera bientôt des épreuves.</div></div>`;
    return;
  }

  const lCol={L1:['#3b82f6','rgba(59,130,246,.12)'],L2:['#10b981','rgba(16,185,129,.12)'],L3:['#f59e0b','rgba(245,158,11,.12)']};
  const lLbl={L1:'Licence 1',L2:'Licence 2',L3:'Licence 3'};

  grid.innerHTML=filtered.map(item=>{
    const showAsFree=!shopPayMode||item.isFree;
    const price=item.price||0;
    const hasCorrige=item.corrigeUrl&&item.corrigeUrl.length>0;
    const [col,bg]=lCol[item.licence]||['#6366f1','rgba(99,102,241,.12)'];
    const clickHandler = `openEpreuve('${item.id}')`;
    return `<div onclick="${clickHandler}" style="background:var(--card-bg);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .25s;position:relative;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,.3)';this.style.borderColor='${col}50'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--border)'">
      <div style="height:3px;background:${col};"></div>
      <div style="padding:1.2rem 1.2rem .8rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem;">
          <span style="background:${bg};color:${col};font-size:.68rem;font-weight:700;padding:.25rem .7rem;border-radius:6px;">${lLbl[item.licence]||item.licence}</span>
          ${item.isNew?`<span style="background:rgba(245,158,11,.15);color:#fbbf24;font-size:.65rem;font-weight:700;padding:.2rem .6rem;border-radius:6px;">✨ NOUVEAU</span>`:''}
        </div>
        <div style="font-size:.95rem;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:.6rem;">${item.title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.6rem;">
          ${item.matiere?`<span style="font-size:.7rem;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--border);padding:.18rem .5rem;border-radius:5px;">📐 ${item.matiere}</span>`:''}
          ${item.year?`<span style="font-size:.7rem;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--border);padding:.18rem .5rem;border-radius:5px;">📅 ${item.year}</span>`:''}
          ${item.session?`<span style="font-size:.7rem;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--border);padding:.18rem .5rem;border-radius:5px;">${item.session}</span>`:''}
          ${item.duree?`<span style="font-size:.7rem;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--border);padding:.18rem .5rem;border-radius:5px;">⏱ ${item.duree}</span>`:''}
        </div>
        ${item.description?`<div style="font-size:.8rem;color:var(--muted);line-height:1.5;margin-bottom:.6rem;">${item.description}</div>`:''}
        ${hasCorrige?`<div style="font-size:.73rem;color:#34d399;">✅ Corrigé inclus</div>`:''}
      </div>
      <div style="padding:.8rem 1.2rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.02);">
        ${showAsFree
          ?`<span style="background:rgba(16,185,129,.15);color:#34d399;font-size:.72rem;font-weight:700;padding:.25rem .6rem;border-radius:6px;">🆓 GRATUIT</span>`
          :`<span style="font-size:.95rem;font-weight:800;color:#60a5fa;">${price>0?price+' FCFA':'—'}</span>`
        }
        <button onclick="event.stopPropagation();openEpreuve('${item.id}')" style="padding:.45rem 1rem;border-radius:8px;border:none;background:${showAsFree?'rgba(16,185,129,.15)':'var(--b5)'};color:${showAsFree?'#34d399':'#fff'};cursor:pointer;font-weight:700;font-size:.78rem;font-family:var(--font-body);">${showAsFree?'Accéder →':'💳 Acheter'}</button>
      </div>
    </div>`;
  }).join('');
}

function openEpreuve(id){
  const item=(DB.shop||[]).find(i=>i.id==id);
  if(!item) return;
  shopPayMode=DB.shopPayMode||false;
  const showAsFree=!shopPayMode||item.isFree;
  const price=item.price||0;
  const hasCorrige=item.corrigeUrl&&item.corrigeUrl.length>0;
  const hasSujet=item.sujetUrl&&item.sujetUrl.length>0;
  const lLbl={L1:'📘 Licence 1',L2:'📗 Licence 2',L3:'📕 Licence 3'};

  document.getElementById('epreuve-modal-content').innerHTML=`
    <div style="margin-bottom:1rem;">
      <div class="shop-card-licence ${item.licence}" style="margin-bottom:.6rem;">${lLbl[item.licence]||item.licence}</div>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem;">${item.title}</div>
      <div style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:.8rem;color:var(--muted);">
        ${item.year?`<span>📅 ${item.year}</span>`:''}
        ${item.matiere?`<span>📐 ${item.matiere}</span>`:''}
        ${item.session?`<span>🗓 ${item.session}</span>`:''}
        ${item.duree?`<span>⏱ ${item.duree}</span>`:''}
      </div>
      ${item.description?`<p style="font-size:.85rem;color:var(--muted);margin-top:.7rem;line-height:1.6;">${item.description}</p>`:''}
    </div>

    <div style="border-top:1px solid var(--border);padding-top:1rem;margin-bottom:.8rem;">
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.7rem;">📄 Sujet de l'épreuve</div>
      ${hasSujet
        ?`<a href="${item.sujetUrl}" target="_blank" style="display:flex;align-items:center;gap:.8rem;padding:.8rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;text-decoration:none;color:var(--text);">
            <div style="width:36px;height:36px;background:rgba(59,130,246,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📄</div>
            <div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">${item.title} — Sujet</div><div style="font-size:.75rem;color:var(--muted);">Cliquer pour ouvrir</div></div>
            <span style="color:#60a5fa;font-size:1.1rem;">↗</span>
          </a>`
        :`<div style="font-size:.85rem;color:var(--muted);">Aucun sujet disponible.</div>`
      }
    </div>

    <div style="border-top:1px solid var(--border);padding-top:1rem;">
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.7rem;">✅ Corrigé détaillé</div>
      ${showAsFree&&hasCorrige
        ?`<a href="${item.corrigeUrl}" target="_blank" style="display:flex;align-items:center;gap:.8rem;padding:.8rem 1rem;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:10px;text-decoration:none;color:var(--text);">
            <div style="width:36px;height:36px;background:rgba(16,185,129,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">✅</div>
            <div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">${item.title} — Corrigé</div><div style="font-size:.75rem;color:#34d399;">Accès gratuit · Cliquer pour ouvrir</div></div>
            <span style="color:#34d399;font-size:1.1rem;">↗</span>
          </a>`
        :!showAsFree&&hasCorrige
        ?`<div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:12px;padding:1.3rem;text-align:center;">
            <div style="font-size:1.8rem;margin-bottom:.5rem;">🔒</div>
            <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">Corrigé disponible</div>
            <div style="font-size:.82rem;color:var(--muted);margin-bottom:1rem;">Payez ${price>0?price+' FCFA':'—'} pour accéder au corrigé complet.</div>
            <div style="font-size:1.3rem;font-weight:800;color:#60a5fa;margin-bottom:.8rem;">${price>0?price+' FCFA':'—'}</div>
            <button onclick="requestPayment(${item.id})" style="padding:.6rem 1.6rem;border-radius:8px;border:none;background:var(--b5);color:#fff;cursor:pointer;font-weight:600;font-size:.88rem;font-family:var(--font-body);">💳 Payer via Mobile Money</button>
          </div>`
        :`<div style="font-size:.85rem;color:var(--muted);">Aucun corrigé disponible.</div>`
      }
    </div>
  `;
  document.getElementById('modal-epreuve').style.display='flex';
}

function closeEpreuve(e){
  if(!e||e.target===document.getElementById('modal-epreuve'))
    document.getElementById('modal-epreuve').style.display='none';
}

function requestPayment(id){
  const item=(DB.shop||[]).find(i=>i.id==id);
  if(!item) return;
  toast('Paiement Mobile Money bientôt disponible. Contactez l\'admin.','ok');
}
// Sauvegarde Firebase boutique
async function fbSaveShopItem(item){
  if(!fbReady) return;
  try{ await firebase.firestore().collection('shop').doc(String(item.id)).set(item); }catch(e){ console.warn(e); }
}
async function fbDeleteShopItem(id){
  if(!fbReady) return;
  try{ await firebase.firestore().collection('shop').doc(String(id)).delete(); }catch(e){ console.warn(e); }
}
async function loadShop(){
  if(!fbReady){ renderShop(); return; }
  try{
    const snap = await firebase.firestore().collection('shop').get();
    DB.shop = snap.docs.map(d=>({...d.data(),id:parseInt(d.id)||d.id}));
    // Charger le mode payant
    const settingSnap = await firebase.firestore().collection('settings').doc('shop').get();
    if(settingSnap.exists){
      DB.shopPayMode = settingSnap.data().payMode || false;
      shopPayMode = DB.shopPayMode;
    }
    renderShop();
  }catch(e){ console.warn(e); renderShop(); }
}

/* ═══════════════════════════════════════════
   ADMIN BOUTIQUE
═══════════════════════════════════════════ */
function renderAdminBoutique(){
  shopPayMode = DB.shopPayMode || false;
  const items = DB.shop || [];

  document.getElementById('at-boutique-a').innerHTML = `
    <div style="padding:.5rem 0 1.5rem;">

      <!-- MODE PAYANT -->
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1.4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">💳 Mode de paiement</div>
          <div style="font-size:.82rem;color:var(--muted);">En mode gratuit, aucune mention de prix n'est visible par les étudiants. En mode payant, les prix s'affichent et le paiement est requis pour les corrigés non gratuits.</div>
        </div>
        <div style="display:flex;align-items:center;gap:.8rem;">
          <span style="font-size:.82rem;color:${shopPayMode?'#34d399':'var(--muted)'};">${shopPayMode?'✅ Payant activé':'🆓 Tout gratuit'}</span>
          <button onclick="toggleShopPayMode()" style="padding:.5rem 1.2rem;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:.83rem;font-family:var(--font-body);background:${shopPayMode?'#ef4444':'#10b981'};color:#fff;">
            ${shopPayMode?'Désactiver':'Activer le mode payant'}
          </button>
        </div>
      </div>

      <!-- FORMULAIRE AJOUT -->
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1.4rem;margin-bottom:1.4rem;">
        <div style="font-weight:700;font-size:.95rem;margin-bottom:1rem;">➕ Ajouter une épreuve</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
          <div style="grid-column:1/-1;"><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Titre *</label>
            <input id="sh-title" placeholder="Ex: Chimie Générale — Session Normale 2024" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Matière *</label>
            <input id="sh-matiere" placeholder="Ex: Chimie Générale" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Licence *</label>
            <select id="sh-licence" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="L1">Licence 1</option><option value="L2">Licence 2</option><option value="L3">Licence 3</option>
            </select></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Année académique</label>
            <input id="sh-year" placeholder="2024-2025" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Session</label>
            <select id="sh-session" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="Normale">Session Normale</option><option value="Rattrapage">Rattrapage</option>
            </select></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Durée</label>
            <input id="sh-duree" placeholder="2 heures" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">💰 Prix (FCFA) — laisser 0 si gratuit</label>
            <input id="sh-price" type="number" min="0" placeholder="500" value="0" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Statut</label>
            <select id="sh-isfree" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="1">🆓 Gratuit (accès libre)</option>
              <option value="0">🔒 Payant (corrigé verrouillé)</option>
            </select></div>
          <div style="grid-column:1/-1;"><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Description</label>
            <input id="sh-desc" placeholder="Description courte de l'épreuve..." style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">🔗 Lien PDF Sujet (Google Drive)</label>
            <input id="sh-sujet" placeholder="https://drive.google.com/..." style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">🔗 Lien PDF Corrigé (Google Drive)</label>
            <input id="sh-corrige" placeholder="https://drive.google.com/..." style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);"></div>
          <div style="display:flex;align-items:center;gap:.6rem;padding-top:.5rem;">
            <input type="checkbox" id="sh-isnew" style="width:16px;height:16px;cursor:pointer;">
            <label for="sh-isnew" style="font-size:.85rem;cursor:pointer;">✨ Marquer comme nouveau</label>
          </div>
        </div>
        <button onclick="addShopItem()" style="margin-top:1rem;padding:.65rem 1.6rem;border-radius:8px;background:var(--b5);color:#fff;border:none;cursor:pointer;font-weight:600;font-size:.88rem;font-family:var(--font-body);">
          ➕ Ajouter l'épreuve
        </button>
      </div>

      <!-- LISTE ÉPREUVES -->
      <div style="font-weight:700;font-size:.95rem;margin-bottom:.8rem;">📋 Épreuves en ligne (${items.length})</div>
      ${items.length === 0
        ? `<div style="text-align:center;padding:2rem;color:var(--muted);background:var(--card-bg);border:1px solid var(--border);border-radius:12px;">Aucune épreuve ajoutée.</div>`
        : items.map(item=>`
        <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin-bottom:.7rem;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.8rem;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:.9rem;margin-bottom:.3rem;">${item.title}</div>
              <div style="font-size:.78rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:.4rem;">
                <span style="background:rgba(255,255,255,.06);padding:.15rem .5rem;border-radius:5px;">${item.licence}</span>
                <span>${item.matiere||'—'}</span>
                <span>${item.year||'—'}</span>
                <span>${item.session||'—'}</span>
                ${item.isFree
                  ?'<span style="color:#10b981;">🆓 Gratuit</span>'
                  :`<span style="color:#60a5fa;">🔒 Payant${item.price>0?' · '+item.price+' FCFA':''}</span>`}
                ${item.corrigeUrl?'<span style="color:#34d399;">✅ Corrigé</span>':''}
                ${item.active===false?'<span style="color:#f59e0b;">⏸ Désactivée</span>':''}
              </div>
            </div>
            <div style="display:flex;gap:.4rem;flex-wrap:wrap;flex-shrink:0;">
              <button onclick="editShopItem('${item.id}')" style="padding:.35rem .8rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:#60a5fa;cursor:pointer;font-size:.75rem;font-family:var(--font-body);">✏ Modifier</button>
              <button onclick="toggleShopItemFree('${item.id}')" style="padding:.35rem .8rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:.75rem;font-family:var(--font-body);">${item.isFree?'→ Payant':'→ Gratuit'}</button>
              <button onclick="toggleShopItemActive('${item.id}')" style="padding:.35rem .8rem;border-radius:6px;border:1px solid var(--border);background:${item.active===false?'rgba(245,158,11,0.15)':'transparent'};color:${item.active===false?'#fbbf24':'var(--muted)'};cursor:pointer;font-size:.75rem;font-family:var(--font-body);">${item.active===false?'✅ Activer':'⏸ Désactiver'}</button>
              <button onclick="deleteShopItem('${item.id}')" style="padding:.35rem .8rem;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:.75rem;font-family:var(--font-body);">🗑 Supprimer</button>
            </div>
          </div>
        </div>`).join('')
      }
    </div>
  `;
}

function extractDriveId(url){
  if(!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}

function addShopItem(){
  const title = document.getElementById('sh-title').value.trim();
  const matiere = document.getElementById('sh-matiere').value.trim();
  const licence = document.getElementById('sh-licence').value;
  const year = document.getElementById('sh-year').value.trim();
  const session = document.getElementById('sh-session').value;
  const duree = document.getElementById('sh-duree').value.trim();
  const price = parseInt(document.getElementById('sh-price').value) || 0;
  const isFree = document.getElementById('sh-isfree').value === '1';
  const desc = document.getElementById('sh-desc').value.trim();
  const sujetRaw = document.getElementById('sh-sujet').value.trim();
  const corrigeRaw = document.getElementById('sh-corrige').value.trim();
  const isNew = document.getElementById('sh-isnew').checked;

  if(!title||!matiere||!licence){ toast('Titre, matière et licence requis','err'); return; }

  if(!DB.shop) DB.shop=[];
  const id = 'shop_'+Date.now();
  const item = {id, title, matiere, licence, year, session, duree, price, description:desc,
    sujetUrl:extractDriveId(sujetRaw), corrigeUrl:extractDriveId(corrigeRaw),
    isFree, isNew, createdAt:new Date().toISOString()};
  DB.shop.push(item);
  fbSaveShopItem(item);
  saveData();
  toast('Épreuve ajoutée !','ok');
  renderAdminBoutique();
  renderShop();
}

function deleteShopItem(id){
  if(!confirm('Supprimer cette épreuve définitivement ?')) return;
  DB.shop = (DB.shop||[]).filter(i=>String(i.id)!==String(id));
  fbDeleteShopItem(id);
  saveData();
  toast('Épreuve supprimée','ok');
  renderAdminBoutique();
  renderShop();
}

function toggleShopItemActive(id){
  const item = (DB.shop||[]).find(i=>String(i.id)===String(id));
  if(!item) return;
  item.active = item.active === false ? true : false;
  fbSaveShopItem(item);
  saveData();
  toast(item.active===false ? 'Épreuve désactivée ⏸' : 'Épreuve activée ✅','ok');
  renderAdminBoutique();
  renderShop();
}

function toggleShopItemFree(id){
  const item = (DB.shop||[]).find(i=>String(i.id)===String(id));
  if(!item) return;
  item.isFree = !item.isFree;
  fbSaveShopItem(item);
  saveData();
  toast(item.isFree?'Épreuve passée en gratuit 🆓':'Épreuve passée en payant 🔒','ok');
  renderAdminBoutique();
  renderShop();
}
function editShopItem(id){
  const item = (DB.shop||[]).find(i=>String(i.id)===String(id));
  if(!item) return;

  // Créer modal d'édition
  const existing = document.getElementById('edit-shop-modal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-shop-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:1.5rem;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;">
        <div style="font-weight:700;font-size:1rem;">✏ Modifier l'épreuve</div>
        <button onclick="document.getElementById('edit-shop-modal').remove()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:.8rem;">
        <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Titre *</label>
          <input id="es-title" value="${item.title||''}" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
        <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Matière</label>
          <input id="es-matiere" value="${item.matiere||''}" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Licence</label>
            <select id="es-licence" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="L1" ${item.licence==='L1'?'selected':''}>Licence 1</option>
              <option value="L2" ${item.licence==='L2'?'selected':''}>Licence 2</option>
              <option value="L3" ${item.licence==='L3'?'selected':''}>Licence 3</option>
            </select></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Session</label>
            <select id="es-session" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="Normale" ${item.session==='Normale'?'selected':''}>Normale</option>
              <option value="Rattrapage" ${item.session==='Rattrapage'?'selected':''}>Rattrapage</option>
            </select></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Année</label>
            <input id="es-year" value="${item.year||''}" placeholder="2024-2025" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Durée</label>
            <input id="es-duree" value="${item.duree||''}" placeholder="2 heures" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Prix (FCFA)</label>
            <input id="es-price" type="number" min="0" value="${item.price||0}" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
          <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Statut</label>
            <select id="es-isfree" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);">
              <option value="1" ${item.isFree?'selected':''}>🆓 Gratuit</option>
              <option value="0" ${!item.isFree?'selected':''}>🔒 Payant</option>
            </select></div>
        </div>
        <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">Description</label>
          <input id="es-desc" value="${item.description||''}" style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
        <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">🔗 Lien PDF Sujet</label>
          <input id="es-sujet" value="${item.sujetUrl||''}" placeholder="https://drive.google.com/..." style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
        <div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:.3rem;">🔗 Lien PDF Corrigé</label>
          <input id="es-corrige" value="${item.corrigeUrl||''}" placeholder="https://drive.google.com/..." style="width:100%;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.85rem;font-family:var(--font-body);box-sizing:border-box;"></div>
      </div>
      <div style="display:flex;gap:.6rem;margin-top:1.2rem;justify-content:flex-end;">
        <button onclick="document.getElementById('edit-shop-modal').remove()" style="padding:.55rem 1.2rem;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-family:var(--font-body);font-size:.85rem;">Annuler</button>
        <button onclick="saveEditShopItem('${id}')" style="padding:.55rem 1.4rem;border-radius:8px;border:none;background:var(--b5);color:#fff;cursor:pointer;font-weight:600;font-family:var(--font-body);font-size:.85rem;">💾 Enregistrer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  document.getElementById('es-title').focus();
}

function saveEditShopItem(id){
  const item = (DB.shop||[]).find(i=>String(i.id)===String(id));
  if(!item) return;
  const title = document.getElementById('es-title').value.trim();
  if(!title){ toast('Le titre est obligatoire','err'); return; }
  item.title = title;
  item.matiere = document.getElementById('es-matiere').value.trim();
  item.licence = document.getElementById('es-licence').value;
  item.session = document.getElementById('es-session').value;
  item.year = document.getElementById('es-year').value.trim();
  item.duree = document.getElementById('es-duree').value.trim();
  item.price = parseInt(document.getElementById('es-price').value)||0;
  item.isFree = document.getElementById('es-isfree').value === '1';
  item.description = document.getElementById('es-desc').value.trim();
  const sujet = document.getElementById('es-sujet').value.trim();
  const corrige = document.getElementById('es-corrige').value.trim();
  if(sujet) item.sujetUrl = extractDriveId(sujet);
  if(corrige) item.corrigeUrl = extractDriveId(corrige);
  fbSaveShopItem(item);
  saveData();
  document.getElementById('edit-shop-modal').remove();
  toast('Épreuve modifiée ✅','ok');
  renderAdminBoutique();
  renderShop();
}


function toggleShopPayMode(){
  DB.shopPayMode = shopPayMode;
  saveData();
  if(fbReady){
    firebase.firestore().collection('settings').doc('shop').set({payMode:shopPayMode}).catch(e=>console.warn(e));
  }
  toast(shopPayMode?'Mode payant activé — les prix sont visibles ✅':'Mode gratuit activé — aucun prix visible 🆓','ok');
  renderAdminBoutique();
  renderShop();
}

let activeExamLevel = 0;
function filterExamLevel(level, btn){
  activeExamLevel = level;
  document.querySelectorAll('.exam-lvl-btn').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderExamList();
}

function renderExamList(){
  document.getElementById('exam-list-wrap').style.display='';
  document.getElementById('quiz-wrap').style.display='none';

  const userLvl = getUserLevel();
  const prog = getLevelProgress();
  const levels = activeExamLevel === 0 ? [1,2,3] : [activeExamLevel];
  const licenceLabels = {1:'📘 Licence 1', 2:'📗 Licence 2', 3:'📕 Licence 3'};
  const licenceClass = {1:'l1', 2:'l2', 3:'l3'};

  // Barre de progression niveau
  let progressHtml = '';
  if(currentUser && currentUser.role !== 'admin'){
    progressHtml = `
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.2rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.6rem;">
          <div style="font-weight:600;font-size:.88rem;">📊 Progression Licence ${userLvl}</div>
          <div style="font-size:.8rem;color:${prog.avg>=80?'#34d399':'var(--muted)'};">${prog.avg}/100 · ${prog.done}/${prog.total} examens</div>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(prog.avg,100)}%;background:${prog.avg>=80?'#10b981':'#3b82f6'};border-radius:3px;transition:width .5s;"></div>
        </div>
        ${prog.canPass?`<div style="margin-top:.8rem;"><button onclick="requestLevelUp()" style="padding:.5rem 1.2rem;border-radius:8px;border:none;background:#10b981;color:#fff;cursor:pointer;font-weight:600;font-size:.82rem;font-family:var(--font-body);">🎉 Valider et passer en Licence ${userLvl+1} →</button></div>`:''}
      </div>
    `;
  }

  let html = progressHtml;
  levels.forEach(lvl => {
    const locked = !checkLevelAccess(lvl);
    const examsForLevel = DB.exams.filter(e => {
      const s = DB.subjects.find(x=>x.id===e.subjectId);
      return s && s.level===lvl;
    });
    if(examsForLevel.length===0) return;

    html += `<div class="exam-licence-title ${licenceClass[lvl]}">${licenceLabels[lvl]}<span style="font-size:.75rem;font-weight:400;opacity:.7;">(${examsForLevel.length} examen${examsForLevel.length>1?'s':''})</span></div>`;

    examsForLevel.forEach(e => {
      const s = DB.subjects.find(x=>x.id===e.subjectId);
      const results = DB.examResults||[];
      const result = results.find(r=>String(r.examId)===String(e.id) && (!r.userId || r.userId===(currentUser?.email||currentUser?.id)));
      const scoreStr = result ? `${result.score}/100` : 'Non passé';
      const scoreColor = result ? (result.score>=80?'#34d399':result.score>=50?'#fbbf24':'#f87171') : 'var(--muted)';
      const mins = e.questions.length * 2;
      html += `<div class="exam-item">
        <div style="flex:1;min-width:0;">
          <div class="ei-name">${s?s.icon:''} ${e.title||s?.name||'Examen'}</div>
          <div class="ei-info"><span>📋 ${e.questions.length} questions</span><span>⏱ ~${mins} min</span><span style="color:${scoreColor};">🎯 ${scoreStr}</span></div>
        </div>
        <button class="btn-start" onclick="startQuiz(${e.id})">${result?'🔄 Réessayer':'Commencer →'}</button>
      </div>`;
    });
  });

  document.getElementById('exam-list').innerHTML = html || '<div style="text-align:center;padding:2rem;color:var(--muted);">Aucun examen disponible.</div>';
}

let examTimerInterval = null;
let examTimeLeft = 0;
let examSeconds = 0; // temps écoulé pour showScore

function startExamTimer(){
  if(examTimerInterval) clearInterval(examTimerInterval);
  const ex = DB.exams.find(e=>e.id===curExamId||parseInt(e.id)===parseInt(curExamId));
  if(!ex) return;
  examTimeLeft = ex.questions.length * 120; // 2 min par question
  examSeconds = 0;
  updateTimerDisplay();
  examTimerInterval = setInterval(()=>{
    examTimeLeft--;
    examSeconds++;
    updateTimerDisplay();
    if(examTimeLeft<=0){
      clearInterval(examTimerInterval); examTimerInterval=null;
      toast('Temps écoulé !','err');
      showScore(ex.questions.length);
    }
  }, 1000);
}

function updateTimerDisplay(){
  const el = document.getElementById('exam-timer');
  if(!el) return;
  const m = Math.floor(examTimeLeft/60);
  const s = examTimeLeft%60;
  el.textContent = `⏱ ${m}:${s.toString().padStart(2,'0')}`;
  if(examTimeLeft < 30){
    el.style.color = '#ef4444';
    el.style.background = 'rgba(239,68,68,0.12)';
    el.style.animation = 'pulse 1s infinite';
  } else if(examTimeLeft < 60){
    el.style.color = '#f59e0b';
    el.style.background = 'rgba(245,158,11,0.12)';
    el.style.animation = '';
  } else {
    el.style.color = 'var(--b8)';
    el.style.background = 'var(--b0)';
    el.style.animation = '';
  }
}

function stopExamTimer(){
  if(examTimerInterval){ clearInterval(examTimerInterval); examTimerInterval=null; }
}

// Anti-triche
let cheatWarnings = 0;
let shuffledQuestions = [];
let examActive = false;

function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function startAntiCheat(){
  examActive = true;
  cheatWarnings = 0;

  // Plein écran
  const qw = document.getElementById('quiz-wrap');
  qw.classList.add('exam-active');
  if(qw.requestFullscreen) qw.requestFullscreen().catch(()=>{});

  // Bloquer copier-coller
  document.addEventListener('copy', blockCopy);
  document.addEventListener('paste', blockCopy);
  document.addEventListener('cut', blockCopy);

  // Bloquer clic droit
  document.addEventListener('contextmenu', blockCopy);

  // Détecter changement d'onglet
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Bloquer touches dangereuses
  document.addEventListener('keydown', blockKeys);

  // Détecter quand la souris quitte la fenêtre
  document.addEventListener('mouseleave', handleMouseLeave);

  // Bloquer impression
  window.addEventListener('beforeprint', blockPrint);
}

function blockCopy(e){
  if(!examActive) return;
  e.preventDefault();
  showCheatWarning("⚠️ Action non autorisée pendant l'examen !");
}

function blockKeys(e){
  if(!examActive) return;
  // Bloquer F12, F5, F11 et raccourcis dangereux
  if(['F12','F11','F5'].includes(e.key)){
    e.preventDefault();
    showCheatWarning('⚠️ Touche non autorisée pendant l\'examen !');
    return;
  }
  // Bloquer Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+F, Alt+Tab
  if(e.ctrlKey && ['u','s','p','a','c','v','f','i','j'].includes(e.key.toLowerCase())){
    e.preventDefault();
    showCheatWarning('⚠️ Raccourci clavier non autorisé !');
    return;
  }
  // Bloquer Alt+F4 et Alt+Tab
  if(e.altKey && ['F4','Tab'].includes(e.key)){
    e.preventDefault();
    showCheatWarning('⚠️ Raccourci clavier non autorisé !');
  }
}

function handleVisibilityChange(){
  if(!examActive) return;
  if(document.hidden){
    cheatWarnings++;
    showCheatWarning("⚠️ Changement d'onglet détecté ! Avertissement "+cheatWarnings+"/3");
    if(cheatWarnings>=3){
      stopAntiCheat();
      stopExamTimer();
      toast('Examen annulé — trop de tentatives de triche !','err');
      const ex=DB.exams.find(e=>parseInt(e.id)===parseInt(curExamId)||e.id===curExamId);
      showScore(ex?shuffledQuestions.length:0);
    }
  }
}

function showCheatWarning(msg){
  const existing = document.querySelector('.cheat-warning');
  if(existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'cheat-warning';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(()=>div.remove(), 3000);
}

let mouseLeaveWarnings = 0;

function handleMouseLeave(){
  if(!examActive) return;
  mouseLeaveWarnings++;
  if(mouseLeaveWarnings <= 2){
    showCheatWarning('⚠️ Ne quittez pas la fenêtre d\'examen ! ('+mouseLeaveWarnings+'/3)');
  } else {
    stopAntiCheat();
    toast('Examen soumis — trop de sorties de fenêtre !','err');
    const ex=DB.exams.find(e=>e.id===curExamId||parseInt(e.id)===parseInt(curExamId));
    showScore(ex?shuffledQuestions.length:0);
  }
}

function blockPrint(e){
  if(!examActive) return;
  e.preventDefault ? e.preventDefault() : (e.returnValue=false);
  showCheatWarning('⚠️ Impression non autorisée pendant l\'examen !');
}

function stopAntiCheat(){
  examActive = false;
  mouseLeaveWarnings = 0;
  const qw = document.getElementById('quiz-wrap');
  qw.classList.remove('exam-active');
  if(document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  document.removeEventListener('copy', blockCopy);
  document.removeEventListener('paste', blockCopy);
  document.removeEventListener('cut', blockCopy);
  document.removeEventListener('contextmenu', blockCopy);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('keydown', blockKeys);
  document.removeEventListener('mouseleave', handleMouseLeave);
  window.removeEventListener('beforeprint', blockPrint);
}


function startRevision(examId){
  examId=parseInt(examId)||examId;
  const wrongQ = userAnswers.filter(a=>a.chosen!==a.correct);
  if(!wrongQ.length){ toast('Aucune question à réviser — tout est correct !','ok'); return; }
  curExamId=examId; curQ=0; score=0; userAnswers=[];
  shuffledQuestions = wrongQ.map(a=>{
    const shuffledOpts = shuffleArray(a.opts.map((o,i)=>({text:o,isCorrect:i===a.correct})));
    return {
      q: a.q,
      opts: shuffledOpts.map(o=>o.text),
      ans: shuffledOpts.findIndex(o=>o.isCorrect),
      exp: a.exp||''
    };
  });
  examActive=true;
  goPage('exams');
  startExamTimer();
  setTimeout(()=>{
    const ex=DB.exams.find(e=>e.id===examId||parseInt(e.id)===parseInt(examId));
    const s=ex?DB.subjects.find(x=>x.id===ex.subjectId||parseInt(x.id)===parseInt(ex.subjectId)):null;
    document.getElementById('quiz-inner').innerHTML='';
    const qbox=document.querySelector('.qbox');
    if(qbox) qbox.insertAdjacentHTML('beforebegin',
      '<div style="text-align:center;padding:.5rem;margin-bottom:.5rem;background:rgba(239,68,68,0.1);border-radius:8px;font-size:12px;color:var(--rc);font-weight:600;">🔁 Mode révision — '+wrongQ.length+' question'+(wrongQ.length>1?'s':'')+' ratée'+(wrongQ.length>1?'s':'')+' à retravailler</div>'
    );
    renderQ();
  },300);
  toast('Révision de '+wrongQ.length+' question'+(wrongQ.length>1?'s':'')+' ratée'+(wrongQ.length>1?'s':'')+'...','info');
}

function startQuiz(examId){
  examId=parseInt(examId)||examId;
  curExamId=examId;curQ=0;score=0;userAnswers=[];
  const ex=DB.exams.find(e=>e.id===examId||e.id===String(examId)||parseInt(e.id)===parseInt(examId));
  if(!ex){toast('Examen introuvable. Rechargez la page.','err');return;}
  const s=DB.subjects.find(x=>x.id===ex.subjectId||parseInt(x.id)===parseInt(ex.subjectId));

  // Mélanger les questions et les réponses
  shuffledQuestions = shuffleArray(ex.questions).map(q=>{
    const shuffledOpts = shuffleArray(q.opts.map((o,i)=>({text:o,isCorrect:i===q.ans})));
    return {
      q: q.q,
      opts: shuffledOpts.map(o=>o.text),
      ans: shuffledOpts.findIndex(o=>o.isCorrect),
      exp: q.exp||''
    };
  });

  document.getElementById('exam-list-wrap').style.display='none';
  document.getElementById('quiz-wrap').style.display='';
  startAntiCheat();
  startExamTimer();
  document.getElementById('quiz-subj-ttl').textContent='📝 Examen — '+(s?s.name:'?');
  renderQ();
}

function renderQ(){
  const ex=DB.exams.find(e=>e.id===curExamId||parseInt(e.id)===parseInt(curExamId));
  if(!ex){toast('Erreur : examen introuvable','err');backExams();return;}
  if(!shuffledQuestions||!shuffledQuestions.length){
    toast('Cet examen n\'a pas encore de questions','err');
    backExams();return;
  }
  if(curQ>=shuffledQuestions.length){showScore(shuffledQuestions.length);return;}
  const q=shuffledQuestions[curQ];
  const pct=Math.round((curQ/shuffledQuestions.length)*100);
  answered=false;
  const L=['A','B','C','D'];
  document.getElementById('quiz-inner').innerHTML=`
    <div class="q-meta">
      <span>Question ${curQ+1}/${ex.questions.length}</span>
      <span id="exam-timer" style="font-weight:600;font-size:13px;padding:4px 10px;border-radius:8px;background:var(--b0);color:var(--b8);transition:color .3s,background .3s;">⏱ --:--</span>
      <span>Score: ${score}</span>
    </div>
    <div class="q-prog"><div class="q-bar" style="width:${pct}%"></div></div>
    <div class="q-txt">${q.q}</div>
    ${q.opts.map((o,i)=>`<div class="q-opt" id="qo${i}" onclick="selOpt(${i})"><div class="opt-letter">${L[i]}</div>${o}</div>`).join('')}
    <div id="q-exp" style="display:none;margin:.8rem 0;padding:.7rem 1rem;border-radius:8px;font-size:.85rem;line-height:1.5;"></div>
    <button class="btn-nxt" id="btn-nxt" disabled onclick="nextQ()">Suivant →</button>
  `;
}

function selOpt(i){
  if(answered)return;answered=true;
  if(!shuffledQuestions||!shuffledQuestions[curQ]) return;
  const q=shuffledQuestions[curQ];
  const ex=DB.exams.find(e=>e.id===curExamId||parseInt(e.id)===parseInt(curExamId));
  document.querySelectorAll('.q-opt').forEach((el,idx)=>{
    if(idx===q.ans)el.classList.add('ok');
    else if(idx===i&&i!==q.ans)el.classList.add('ko');
  });
  const correct = i===q.ans;
  if(correct)score++;
  userAnswers.push({q:q.q, opts:q.opts, chosen:i, correct:q.ans, exp:q.exp||''});
  // Afficher l'explication si disponible
  const expEl = document.getElementById('q-exp');
  if(expEl && q.exp){
    expEl.style.display='block';
    expEl.style.background = correct ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    expEl.style.border = correct ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    expEl.style.color = correct ? '#34d399' : '#f87171';
    expEl.innerHTML = (correct ? '✅ ' : '❌ ') + q.exp;
  }
  document.getElementById('btn-nxt').disabled=false;
}
function nextQ(){
  if(shuffledQuestions && curQ+1>=shuffledQuestions.length){
    clearInterval(examTimerInterval); examTimerInterval=null;
    showScore(shuffledQuestions.length);
    return;
  }
  curQ++;renderQ();
}

function showScore(total){
  stopAntiCheat();
  examActive=false;
  const pct=total>0?Math.round((score/total)*100):0;
  const passed=pct>=70;
  const mins=Math.floor(examSeconds/60).toString().padStart(2,'0');
  const secs=(examSeconds%60).toString().padStart(2,'0');
  clearInterval(examTimerInterval); examTimerInterval=null;
  document.getElementById('quiz-inner').innerHTML=`
    <div class="score-box">
      <div class="score-ring ${passed?'pass':'fail'}">
        <div class="score-num ${passed?'pass':'fail'}">${pct}%</div>
      </div>
      <div style="font-size:13px;color:var(--muted);margin:.5rem 0 .5rem;">${score}/${total} bonnes réponses</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:1rem;">⏱ Temps : ${mins}:${secs}</div>
      <div style="padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;margin-bottom:1.2rem;${passed?'background:var(--g);color:var(--gc)':'background:var(--r);color:var(--rc)'}">
        ${passed?'🎉 Félicitations ! Examen réussi !':'😞 Score insuffisant. Il faut 70% minimum.'}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.2rem;">
        <div style="background:var(--b0);border-radius:9px;padding:.6rem;text-align:center;">
          <div style="font-size:18px;font-weight:500;color:var(--b8);">${score}</div>
          <div style="font-size:11px;color:var(--muted);">Correctes</div>
        </div>
        <div style="background:var(--r);border-radius:9px;padding:.6rem;text-align:center;">
          <div style="font-size:18px;font-weight:500;color:var(--rc);">${total-score}</div>
          <div style="font-size:11px;color:var(--muted);">Incorrectes</div>
        </div>
        <div style="background:var(--g);border-radius:9px;padding:.6rem;text-align:center;">
          <div style="font-size:18px;font-weight:500;color:var(--gc);">${pct}%</div>
          <div style="font-size:11px;color:var(--muted);">Score final</div>
        </div>
      </div>
      ${passed?`<button class="btn-primary" style="margin-bottom:.6rem;width:100%;" onclick="getCert()">🎓 Obtenir mon certificat</button>`:''}
      <button onclick="startQuiz(${curExamId})" style="font-size:13px;padding:8px 18px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--muted);cursor:pointer;font-family:var(--font-body);margin-top:.4rem;width:100%;">↺ Réessayer l'examen</button>
      ${userAnswers.filter(a=>a.chosen!==a.correct).length>0?`<button onclick="startRevision(${curExamId})" style="font-size:13px;padding:8px 18px;border-radius:8px;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.08);color:var(--rc);cursor:pointer;font-family:var(--font-body);margin-top:.4rem;width:100%;font-weight:500;">🔁 Réviser les ${userAnswers.filter(a=>a.chosen!==a.correct).length} question(s) ratée(s)</button>`:''}
      <div style="margin-top:1.5rem;text-align:left;">
        <div style="font-size:13px;font-weight:600;color:var(--b8);margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border);">📋 Correction détaillée</div>
        ${userAnswers.map((a,i)=>{
          const ok = a.chosen===a.correct;
          return '<div style="margin-bottom:1rem;padding:.9rem;border-radius:10px;border:1px solid '+(ok?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)')+';background:'+(ok?'rgba(16,185,129,0.05)':'rgba(239,68,68,0.05)')+';">'
            +'<div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:.4rem;">Question '+(i+1)+'</div>'
            +'<div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:.6rem;">'+a.q+'</div>'
            +'<div style="font-size:12px;margin-bottom:.3rem;color:'+(ok?'var(--gc)':'var(--rc)')+';">'
            +(ok?'✅':'❌')+' Votre réponse : <strong>'+a.opts[a.chosen]+'</strong>'
            +'</div>'
            +(!ok?'<div style="font-size:12px;margin-bottom:.3rem;color:var(--gc);">✔ Bonne réponse : <strong>'+a.opts[a.correct]+'</strong></div>':'')
            +(a.exp?'<div style="font-size:12px;color:var(--muted);margin-top:.4rem;padding:.5rem;background:var(--b0);border-radius:6px;">💡 '+a.exp+'</div>':'')
            +'</div>';
        }).join('')}
      </div>
    </div>
  `;
  if(passed&&currentUser){
    const ex=DB.exams.find(e=>parseInt(e.id)===parseInt(curExamId)||e.id===curExamId);
    const s=DB.subjects.find(x=>parseInt(x.id)===parseInt(ex?.subjectId)||x.id===ex?.subjectId);
    pushNotif('Examen réussi !','Vous avez obtenu '+pct+'% en '+(s?s.name:''),'🎓','#c0dd97');
    const st=DB.students.find(x=>x.id===currentUser.id);
    if(st){
      st.passed++;
      st.avgScore=Math.round((st.avgScore*(st.passed-1)+pct)/st.passed);
    }
    // Mettre à jour currentUser aussi
    currentUser.passed=(currentUser.passed||0)+1;
    currentUser.avgScore=Math.round(((currentUser.avgScore||0)*(currentUser.passed-1)+pct)/currentUser.passed);
    if(currentUser.activity)currentUser.activity.unshift({text:'Examen réussi : '+(s?s.name:''),ic:'📝',bg:var_g(),time:new Date().toLocaleDateString('fr-FR')});
    saveData();
    // Sauvegarder dans Firestore
    if(fbReady && currentUser.email){
      db.collection('users').doc(currentUser.email).set({
        passed: currentUser.passed,
        avgScore: currentUser.avgScore
      },{merge:true}).catch(e=>console.warn(e));
    }
  }
  // Toujours sauvegarder le résultat pour le suivi de progression
  if(currentUser){
    if(!DB.examResults) DB.examResults = [];
    const existing = DB.examResults.findIndex(r=>r.examId===curExamId&&r.userId===(currentUser.email||currentUser.id));
    const ex_=DB.exams.find(e=>e.id===curExamId||parseInt(e.id)===parseInt(curExamId));
    const subj_=ex_?DB.subjects.find(s=>s.id===ex_.subjectId||parseInt(s.id)===parseInt(ex_.subjectId)):null;
    const result = {examId:curExamId, userId:currentUser.email||currentUser.id, score:pct, date:new Date().toISOString(), subjectId:ex_?ex_.subjectId:null, subjectName:subj_?subj_.name:null};
    if(existing!==-1) DB.examResults[existing] = result;
    else DB.examResults.push(result);
    saveData();
    // Sauvegarder dans Firestore (source de vérité principale)
    if(fbReady && currentUser.email){
      db.collection('examResults').doc(currentUser.email)
        .collection('results').doc(String(curExamId))
        .set(result, {merge:true})
        .catch(e=>console.warn('fbSaveResult error:',e));
    }
    // Vérifier si l'étudiant peut passer au niveau supérieur
    const prog = getLevelProgress();
    if(prog.canPass){
      setTimeout(()=>toast(`🎯 Vous avez la moyenne requise ! Vous pouvez passer en Licence ${getUserLevel()+1}.`,'ok'), 2000);
    }
    // Rafraîchir la liste des examens seulement si on n'est plus en examen
    if(typeof renderExamList === 'function') setTimeout(()=>{ if(!examActive) renderExamList(); }, 500);
  }
}

function getCert(){
  if(!currentUser)return;
  const ex=DB.exams.find(e=>parseInt(e.id)===parseInt(curExamId)||e.id===curExamId);
  const s=DB.subjects.find(x=>parseInt(x.id)===parseInt(ex?.subjectId)||x.id===ex?.subjectId);
  const subj=s?s.name:'Examen';
  const pct=Math.round((score/(ex.questions.length||1))*100);
  const userKey=currentUser.email||String(currentUser.id);
  if(!DB.certificates.find(c=>c.subject===subj&&(c.userId===userKey||c.userId===currentUser.id))){
    const newCert={subject:subj,date:new Date().toLocaleDateString('fr-FR'),score:pct,userId:userKey,studentName:currentUser.name};
    DB.certificates.push(newCert);
    currentUser.certs=(currentUser.certs||0)+1;
    // Note: currentUser.passed déjà incrémenté dans showScore, on ne le reincrémente pas ici
    // Sauvegarder dans Firebase
    if(fbReady){
      fbSaveCert({...newCert,userId:currentUser.email}).catch(e=>console.warn(e));
      db.collection('users').doc(currentUser.email).set({
        certs:currentUser.certs, passed:currentUser.passed
      },{merge:true}).catch(e=>console.warn(e));
    }
    pushNotif('Certificat obtenu !','Certificat de réussite en '+subj+' délivré.','🎓','#F0C96A');
    sendCertEmail(currentUser.name, currentUser.email, subj, pct);
  }
  saveData();checkAndNotifyBadges(currentUser);toast('Certificat obtenu pour '+subj+' !','ok');
  goPage('certs');
}

function downloadCertBySubject(subject){
  const userKey = currentUser?.email || String(currentUser?.id);
  const cert = DB.certificates.find(c=>c.subject===subject&&(c.userId===userKey||c.studentName===currentUser?.name));
  if(cert) downloadCert(cert);
  else toast('Certificat introuvable','err');
}

async function downloadCert(cert){
  // Créer un canvas pour le certificat
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, 1200, 800);

  // Bordure dorée
  ctx.strokeStyle = '#c89b3c';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1160, 760);
  ctx.lineWidth = 2;
  ctx.strokeRect(35, 35, 1130, 730);

  // Titre
  ctx.fillStyle = '#c89b3c';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ERSE ACADEMY', 600, 120);

  // Sous-titre
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('Certificat Officiel de Réussite', 600, 165);

  // Ligne
  ctx.strokeStyle = '#c89b3c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 190);
  ctx.lineTo(1000, 190);
  ctx.stroke();

  // Emoji
  ctx.font = '80px serif';
  ctx.fillText('🎓', 600, 290);

  // Texte décerné à
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Ce certificat est décerné à', 600, 360);

  // Nom étudiant
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(cert.studentName || currentUser.name, 600, 420);

  // Matière
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '20px Georgia, serif';
  ctx.fillText("pour avoir réussi l'examen de :", 600, 470);

  ctx.fillStyle = '#c89b3c';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(cert.subject, 600, 520);

  // Score
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('Score : ' + cert.score + '%', 600, 570);

  // Date
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Délivré le ' + cert.date, 600, 620);

  // Watermark
  ctx.fillStyle = 'rgba(200,155,60,0.05)';
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillText('ERSE', 600, 720);

  // Télécharger
  const link = document.createElement('a');
  link.download = 'Certificat_' + cert.subject.replace(/ /g,'_') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('Certificat téléchargé !', 'ok');
}

function backExams(){
  document.getElementById('exam-list-wrap').style.display='';
  document.getElementById('quiz-wrap').style.display='none';
}
function var_g(){return '#eaf3de';}

/* fin */
