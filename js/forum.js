// ═══ forum.js ═══
/* ═══════════════ FORUM — Firebase Firestore ═══════════════ */
const FORUM = {posts:[]};
let forumListener = null;

function openNewPost(){
  document.getElementById('forum-new-post').style.display='';
  document.getElementById('post-subject').innerHTML=
    '<option value="">-- Toutes matières --</option>'+
    DB.subjects.filter(s=>s.active).map(s=>`<option value="${s.name}">${s.icon} ${s.name}</option>`).join('');
  document.getElementById('post-title').focus();
}

// Rate limiting forum
const FORUM_RATE = {};
function checkForumRateLimit(){
  const email = currentUser?.email;
  if(!email) return false;
  const now = Date.now();
  if(!FORUM_RATE[email]) FORUM_RATE[email] = [];
  // Garder uniquement les posts des dernières 60 minutes
  FORUM_RATE[email] = FORUM_RATE[email].filter(t => now - t < 3600000);
  if(FORUM_RATE[email].length >= 5){
    toast('Limite atteinte : max 5 posts par heure','err');
    return false;
  }
  FORUM_RATE[email].push(now);
  return true;
}

// Validation et nettoyage des données
function sanitize(str){
  if(!str) return '';
  return str
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;')
    .replace(/\//g,'&#x2F;')
    .trim()
    .slice(0, 2000); // max 2000 caractères
}

async function submitPost(){
  const title=document.getElementById('post-title').value.trim();
  const postContent=document.getElementById('post-content').value.trim();
  const subject=document.getElementById('post-subject').value;
  if(!title||!postContent){toast('Remplissez le titre et le contenu','err');return;}
  if(!checkForumRateLimit()) return;
  // Sanitiser les données
  const cleanTitle = sanitize(title);
  const cleanContent = sanitize(postContent);
  if(cleanTitle.length < 5){toast('Titre trop court (min 5 caractères)','err');return;}
  if(cleanContent.length < 10){toast('Message trop court (min 10 caractères)','err');return;}
  const post={
    title:cleanTitle, content:cleanContent, subject:sanitize(subject),
    author:currentUser.name,
    authorInitials:currentUser.initials,
    authorColor:currentUser.color,
    date:new Date().toLocaleDateString('fr-FR'),
    createdAt:Date.now(),
    replies:[], likes:0, likedBy:[]
  };
  document.getElementById('forum-new-post').style.display='none';
  document.getElementById('post-title').value='';
  document.getElementById('post-content').value='';
  if(fbReady){
    try{
      await db.collection('forum').add(post);
      toast('Discussion publiée !','ok');
    }catch(e){
      console.warn(e);
      // Fallback localStorage
      FORUM.posts.unshift({...post, id:DB.nextId++});
      saveForumData();
      toast('Discussion publiée (local)','ok');
      renderForum(FORUM.posts);
    }
  } else {
    FORUM.posts.unshift({...post, id:DB.nextId++});
    saveForumData();
    toast('Discussion publiée (hors ligne)','ok');
    renderForum(FORUM.posts);
  }
  pushNotif('Nouvelle discussion','Votre question a été publiée dans le forum','💬','#b0d4f4');
}

function saveForumData(){
  try{localStorage.setItem('erse_forum',JSON.stringify(FORUM.posts.slice(0,100)));}catch(e){}
}

function loadForumData(){
  if(fbReady){
    // Écouter le forum en temps réel depuis Firestore
    if(forumListener) forumListener();
    forumListener = db.collection('forum')
      .orderBy('createdAt','desc')
      .limit(50)
      .onSnapshot(snap=>{
        FORUM.posts=[];
        snap.forEach(doc=>{
          const d=doc.data();
          FORUM.posts.push({...d, id:doc.id, replies:Array.isArray(d.replies)?d.replies:[]});
        });
        renderForum(FORUM.posts);
      }, e=>{ console.warn('Forum listener error:',e); loadForumFallback(); });
  } else {
    loadForumFallback();
  }
}

function loadForumFallback(){
  try{
    const d=localStorage.getItem('erse_forum');
    if(d) FORUM.posts=JSON.parse(d);
    renderForum(FORUM.posts);
  }catch(e){}
}

function filterForum(type,btn){
  document.querySelectorAll('#forum-tabs .tab').forEach(t=>t.classList.remove('on'));
  if(btn)btn.classList.add('on');
  let posts=FORUM.posts;
  if(type==='unanswered') posts=posts.filter(p=>!p.replies.length);
  if(type==='mine') posts=posts.filter(p=>p.author===currentUser?.name);
  renderForum(posts);
}

function renderForum(posts){
  const el=document.getElementById('forum-posts');
  if(!posts.length){
    el.innerHTML=`<div style="text-align:center;padding:3rem;color:var(--muted);">
      <div style="font-size:42px;margin-bottom:.8rem;">💬</div>
      <p style="font-size:14px;font-weight:500;">Aucune discussion pour l'instant</p>
      <p style="font-size:13px;margin-top:.4rem;">Soyez le premier à poser une question !</p>
    </div>`;
    return;
  }
  el.innerHTML=posts.map(p=>`
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.3rem;margin-bottom:12px;transition:all .2s;" onmouseover="this.style.borderColor='var(--b4)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:.8rem;">
        <div class="avatar" style="background:${p.authorColor}22;color:${p.authorColor};font-size:11px;font-weight:600;flex-shrink:0;">${p.authorInitials}</div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:500;color:var(--b9);margin-bottom:3px;">${p.title}</div>
          <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);">
            <span>${p.author}</span>
            <span>·</span>
            <span>${p.date}</span>
            ${p.subject?`<span>·</span><span style="background:var(--b0);color:var(--b8);padding:1px 7px;border-radius:10px;border:1px solid var(--b2);">${p.subject}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:12px;background:${p.replies.length?'var(--g)':'var(--bg)'};color:${p.replies.length?'var(--gc)':'var(--muted)'};padding:3px 9px;border-radius:20px;border:1px solid ${p.replies.length?'#97C459':'var(--border)'};">
            💬 ${p.replies.length} réponse${p.replies.length>1?'s':''}
          </span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:.8rem;">${p.content}</div>
      ${p.replies.map(r=>`
        <div style="background:var(--bg);border-radius:9px;padding:.8rem;margin-bottom:6px;border-left:3px solid var(--b4);">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
            <div class="avatar" style="background:${r.authorColor}22;color:${r.authorColor};font-size:10px;font-weight:600;width:24px;height:24px;">${r.authorInitials}</div>
            <span style="font-size:12px;font-weight:500;">${r.author}</span>
            <span style="font-size:11px;color:var(--muted);">· ${r.date}</span>
          </div>
          <div style="font-size:13px;color:var(--text);">${r.content}</div>
        </div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:.8rem;align-items:center;">
        <input id="reply-${p.id}" placeholder="Écrire une réponse..." style="flex:1;padding:7px 11px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-family:var(--font-body);background:var(--input-bg);color:var(--text);outline:none;">
        <button onclick="submitReply('${p.id}')" style="background:var(--b9);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer;font-family:var(--font-body);">Répondre</button>
        ${(currentUser&&(currentUser.role==='admin'||p.author===currentUser.name))?`<button onclick="deletePost('${p.id}')" style="background:var(--r);color:var(--rc);border:none;border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer;" title="Supprimer">🗑</button>`:''}
      </div>
    </div>
  `).join('');
}

async function deletePost(postId){
  if(!confirm('Supprimer cette discussion ?')) return;
  if(fbReady){
    try{
      await db.collection('forum').doc(String(postId)).delete();
      toast('Discussion supprimée !','ok');
    }catch(e){
      console.warn(e);
      FORUM.posts=FORUM.posts.filter(p=>p.id!==postId);
      saveForumData();
      renderForum(FORUM.posts);
      toast('Discussion supprimée (local)','ok');
    }
  } else {
    FORUM.posts=FORUM.posts.filter(p=>p.id!==postId);
    saveForumData();
    renderForum(FORUM.posts);
    toast('Discussion supprimée !','ok');
  }
}

async function submitReply(postId){
  const input=document.getElementById('reply-'+postId);
  if(!input||!input.value.trim()){toast('Écrivez une réponse','err');return;}
  const replyText = sanitize(input.value.trim());
  if(replyText.length < 2){toast('Réponse trop courte','err');return;}
  const reply={
    content:replyText,
    author:currentUser.name,
    authorInitials:currentUser.initials,
    authorColor:currentUser.color,
    date:new Date().toLocaleDateString('fr-FR')
  };
  input.value='';
  if(fbReady){
    try{
      const post=FORUM.posts.find(p=>p.id===postId);
      if(!post) return;
      const updatedReplies=[...(post.replies||[]), reply];
      await db.collection('forum').doc(String(postId)).update({replies:updatedReplies});
      toast('Réponse publiée !','ok');
      // Le listener onSnapshot va rafraîchir automatiquement
    }catch(e){
      console.warn(e);
      const post=FORUM.posts.find(p=>p.id===postId);
      if(post){ post.replies.push(reply); saveForumData(); renderForum(FORUM.posts); }
      toast('Réponse publiée (local)','ok');
    }
  } else {
    const post=FORUM.posts.find(p=>p.id===postId);
    if(post){ post.replies.push(reply); saveForumData(); renderForum(FORUM.posts); }
    toast('Réponse publiée (hors ligne)','ok');
  }
}

/* ═══════════════ BADGES & RÉCOMPENSES ═══════════════ */
const BADGES = [
  {id:'first_login',icon:'🌟',name:'Premier pas',desc:'Première connexion sur ERSE ACADEMY',condition:u=>true},
  {id:'first_exam',icon:'📝',name:'Premier examen',desc:'Passer votre premier examen',condition:u=>(u.passed||0)>=1},
  {id:'first_cert',icon:'🎓',name:'Premier certificat',desc:'Obtenir votre premier certificat',condition:u=>(u.certs||0)>=1},
  {id:'three_certs',icon:'🏆',name:'Collectionneur',desc:'Obtenir 3 certificats',condition:u=>(u.certs||0)>=3},
  {id:'five_certs',icon:'💎',name:'Expert',desc:'Obtenir 5 certificats',condition:u=>(u.certs||0)>=5},
  {id:'all_certs',icon:'👑',name:'Champion',desc:'Obtenir 7 certificats ou plus',condition:u=>(u.certs||0)>=7},
  {id:'perfect_score',icon:'💯',name:'Perfection',desc:'Obtenir 100% à un examen',condition:u=>DB.certificates.some(c=>(c.userId===u.email||c.userId===String(u.id))&&c.score===100)},
  {id:'high_score',icon:'🔥',name:'Excellence',desc:'Score moyen supérieur à 85%',condition:u=>(u.avgScore||0)>=85},
  {id:'speed_demon',icon:'⚡',name:'Éclair',desc:'Réussir un examen en moins de 3 minutes',condition:u=>false},
  {id:'explorer',icon:'🗺️',name:'Explorateur',desc:'Visiter toutes les sections du site',condition:u=>false},
];

function getUserBadges(user){
  return BADGES.map(b=>({...b, earned:b.condition(user)}));
}

function checkAndNotifyBadges(user){
  const earned = BADGES.filter(b=>b.condition(user));
  const prev = JSON.parse(localStorage.getItem('erse_badges_'+user.email)||'[]');
  earned.forEach(b=>{
    if(!prev.includes(b.id)){
      prev.push(b.id);
      toast('🏅 Nouveau badge : '+b.name+' '+b.icon,'ok');
      pushNotif('Badge obtenu !','Vous avez débloqué : '+b.name+' '+b.icon,'🏅','#F0C96A');
    }
  });
  localStorage.setItem('erse_badges_'+user.email, JSON.stringify(prev));
}

function renderBadgesSection(user){
  const badges = getUserBadges(user);
  const earned = badges.filter(b=>b.earned).length;
  return `
    <div class="profile-card" style="margin-top:1rem;">
      <h3>🏅 Badges <span style="font-size:12px;color:var(--muted);font-weight:400;">${earned}/${badges.length} obtenus</span></h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:.8rem;">
        ${badges.map(b=>`
          <div style="background:${b.earned?'var(--gold-p)':'var(--bg)'};border:1px solid ${b.earned?'rgba(200,155,60,0.4)':'var(--border)'};border-radius:10px;padding:.8rem;text-align:center;opacity:${b.earned?1:0.45};transition:all .2s;" title="${b.desc}">
            <div style="font-size:24px;margin-bottom:4px;">${b.icon}</div>
            <div style="font-size:11px;font-weight:500;color:${b.earned?'var(--gold-d)':'var(--muted)'};">${b.name}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">${b.earned?'✅ Obtenu':'🔒 Verrouillé'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

