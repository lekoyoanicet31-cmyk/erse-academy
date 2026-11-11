// ═══ admin.js ═══
/* ═══════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════ */
function adminTab(tab,el){
  document.querySelectorAll('.ani').forEach(i=>i.classList.remove('on'));
  if(el)el.classList.add('on');
  ['dashboard','subjects','exams-a','students','leaderboard-a','notifs-a','docs-a','boutique-a'].forEach(t=>{
    document.getElementById('at-'+t).style.display=t===tab?'':'none';
  });
  const renders={dashboard:renderAdminDash,subjects:renderAdminSubjects,'exams-a':renderAdminExams,students:renderAdminStudents,'leaderboard-a':renderAdminLB,'notifs-a':renderAdminNotifs,'docs-a':renderAdminDocs,'boutique-a':renderAdminBoutique};
  if(renders[tab])renders[tab]();
}

async function loadAdminExamResults(){
  const byStudentExam=new Map();
  (DB.examResults||[]).forEach(r=>byStudentExam.set(String(r.userId||'')+'|'+String(r.examId),r));
  if(fbReady&&currentUser?.role==='admin'){
    const students=DB.students.filter(s=>s.email);
    for(let i=0;i<students.length;i+=8){
      await Promise.all(students.slice(i,i+8).map(async student=>{
        try{
          const snap=await db.collection('examResults').doc(student.email).collection('results').get();
          snap.forEach(doc=>{
            const r=doc.data();
            const key=student.email+'|'+String(r.examId||doc.id);
            byStudentExam.set(key,{...r,examId:r.examId||doc.id,userId:student.email,studentName:student.name});
          });
        }catch(e){console.warn('Résultats indisponibles pour un étudiant:',e&&e.code);}
      }));
    }
  }
  return [...byStudentExam.values()];
}

async function renderAdminDash(){
  const totalDocs=DB.subjects.reduce((a,s)=>a+s.docs,0);
  const totalCerts=DB.students.reduce((a,s)=>a+s.certs,0)+DB.certificates.length;
  const avg=DB.students.length?Math.round(DB.students.reduce((a,s)=>a+s.avgScore,0)/DB.students.length):0;

  // Analytics
  const results = await loadAdminExamResults();
  const totalExamsTaken = results.length;

  // Taux de complétion par matière
  const subjectStats = DB.subjects.filter(s=>s.active).map(s=>{
    const examsForSubj = DB.exams.filter(e=>String(e.subjectId)===String(s.id));
    if(!examsForSubj.length) return null;
    const subjResults = results.filter(r=>examsForSubj.some(e=>String(e.id)===String(r.examId)));
    const scores = subjResults.map(r=>r.score);
    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const passRate = scores.length ? Math.round(scores.filter(sc=>sc>=70).length/scores.length*100) : 0;
    const perStudent=new Map();
    subjResults.forEach(r=>{const key=String(r.userId||r.studentName||'');if(!perStudent.has(key))perStudent.set(key,{name:r.studentName||DB.students.find(x=>x.email===r.userId)?.name||'Étudiant',scores:[]});perStudent.get(key).scores.push(Number(r.score)||0);});
    return {name:s.name, icon:s.icon, level:s.level, avgScore, passRate, total:subjResults.length, perStudent:[...perStudent.values()].map(x=>({...x,score:Math.round(x.scores.reduce((a,b)=>a+b,0)/x.scores.length)})).sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
  }).filter(Boolean).sort((a,b)=>a.avgScore-b.avgScore);

  // Examens les plus ratés
  const examFailStats = DB.exams.map(e=>{
    const er = results.filter(r=>String(r.examId)===String(e.id));
    if(!er.length) return null;
    const avgS = Math.round(er.reduce((a,r)=>a+r.score,0)/er.length);
    const subj = DB.subjects.find(s=>String(s.id)===String(e.subjectId));
    return {name:e.title||('Examen #'+e.id), subject:subj?subj.name:'', avgScore:avgS, attempts:er.length};
  }).filter(Boolean).sort((a,b)=>a.avgScore-b.avgScore).slice(0,5);

  // Répartition niveaux
  const l1=DB.students.filter(s=>s.level===1).length;
  const l2=DB.students.filter(s=>s.level===2).length;
  const l3=DB.students.filter(s=>s.level===3).length;
  const totalStu=Math.max(DB.students.length,1);

  // Étudiants récents (7 derniers jours)
  const recentStudents = DB.students.filter(s=>{
    if(!s.createdAt) return false;
    return Date.now()-new Date(s.createdAt).getTime() < 7*24*3600*1000;
  }).length;

  const lvlBars = [{lbl:'Licence 1',val:l1,col:'var(--b4)'},{lbl:'Licence 2',val:l2,col:'#534AB7'},{lbl:'Licence 3',val:l3,col:'var(--gc)'}]
    .map(function(item){
      return '<div style="margin-bottom:10px;">'
        +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">'
        +'<span style="color:var(--text);font-weight:500;">'+item.lbl+'</span>'
        +'<span style="color:var(--muted);">'+item.val+' étudiant'+(item.val>1?'s':'')+' · '+Math.round(item.val/totalStu*100)+'%</span>'
        +'</div>'
        +'<div style="background:var(--border);border-radius:99px;height:8px;">'
        +'<div style="background:'+item.col+';width:'+Math.round(item.val/totalStu*100)+'%;height:8px;border-radius:99px;transition:width .5s;"></div>'
        +'</div></div>';
    }).join('');

  const subjRows = subjectStats.length ? subjectStats.map(function(s){
    const c = s.avgScore>=70?'var(--gc)':s.avgScore>=50?'var(--ac)':'var(--rc)';
    const bc = s.avgScore>=70?'var(--gc)':s.avgScore>=50?'#f59e0b':'var(--rc)';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'
      +'<span style="font-size:18px;">'+s.icon+'</span>'
      +'<div style="flex:1;">'
      +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
      +'<span style="font-weight:500;">'+s.name+'</span>'
      +'<span style="color:'+c+';font-weight:600;">'+s.avgScore+'% moy.</span>'
      +'</div>'
      +'<div style="background:var(--border);border-radius:99px;height:6px;">'
      +'<div style="background:'+bc+';width:'+s.avgScore+'%;height:6px;border-radius:99px;"></div>'
      +'</div>'
      +'<div style="font-size:10px;color:var(--muted);margin-top:2px;">'+s.total+' résultats · '+s.passRate+'% des résultats ≥ 70%</div>'
      +(s.perStudent.length?'<details style="margin-top:7px;font-size:11px;color:var(--muted);"><summary style="cursor:pointer;">Voir les '+s.perStudent.length+' étudiants</summary>'+s.perStudent.map(st=>'<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>'+String(st.name).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</span><strong style="color:'+(st.score>=70?'var(--gc)':'var(--rc)')+';">'+st.score+'%</strong></div>').join('')+'</details>':'<div style="font-size:10px;color:var(--muted);margin-top:5px;">Aucun résultat étudiant pour cette matière</div>')
      +'</div></div>';
  }).join('') : '<div style="color:var(--muted);font-size:13px;text-align:center;padding:1rem;">Aucun résultat d\'examen encore</div>';

  const failRows = examFailStats.map(function(e,i){
    const c = e.avgScore>=50?'var(--ac)':'var(--rc)';
    return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">'
      +'<span style="font-size:11px;font-weight:700;color:var(--muted);width:16px;">#'+(i+1)+'</span>'
      +'<div style="flex:1;">'
      +'<div style="font-size:12px;font-weight:500;">'+e.name+'</div>'
      +'<div style="font-size:11px;color:var(--muted);">'+e.subject+' · '+e.attempts+' tentative'+(e.attempts>1?'s':'')+'</div>'
      +'</div>'
      +'<span style="font-size:13px;font-weight:700;color:'+c+';">'+e.avgScore+'%</span>'
      +'</div>';
  }).join('');

  document.getElementById('at-dashboard').innerHTML=''
    +'<div class="admin-ttl">\u{1F4CA} Tableau de bord</div>'
    +'<div class="kpi-grid">'
    +'<div class="kpi kpi-blue"><div class="kpi-val">'+DB.students.length+'</div><div class="kpi-lbl">\u00C9tudiants<br><span style="font-size:10px;font-weight:400;color:var(--b4);">+'+recentStudents+' cette semaine</span></div></div>'
    +'<div class="kpi kpi-gold"><div class="kpi-val">'+totalCerts+'</div><div class="kpi-lbl">Certificats d\u00E9livr\u00E9s</div></div>'
    +'<div class="kpi kpi-green"><div class="kpi-val">'+avg+'%</div><div class="kpi-lbl">Score moyen global</div></div>'
    +'<div class="kpi"><div class="kpi-val">'+totalExamsTaken+'</div><div class="kpi-lbl">Examens pass\u00E9s</div></div>'
    +'</div>'
    +'<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.2rem;margin-bottom:12px;">'
    +'<div style="font-size:13px;font-weight:600;color:var(--b8);margin-bottom:1rem;">\u{1F393} R\u00E9partition par niveau</div>'
    +lvlBars
    +'</div>'
    +'<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.2rem;margin-bottom:12px;">'
    +'<div style="font-size:13px;font-weight:600;color:var(--b8);margin-bottom:1rem;">\u{1F4DA} Performance par mati\u00E8re</div>'
    +subjRows
    +'</div>'
    +(examFailStats.length?'<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.2rem;margin-bottom:12px;">'
    +'<div style="font-size:13px;font-weight:600;color:var(--b8);margin-bottom:1rem;">\u26A0\uFE0F Examens les plus difficiles</div>'
    +failRows+'</div>':'')
    +'<div style="font-size:13px;font-weight:500;color:var(--b8);margin:1.2rem 0 .6rem;">\u26A1 Actions rapides</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
    +'<button class="btn-primary" onclick="adminTab(\'subjects\',document.querySelectorAll(\'.ani\')[1]);setTimeout(openModalSubj,50)">+ Matière</button>'
    +'<button class="btn-primary" onclick="adminTab(\'exams-a\',document.querySelectorAll(\'.ani\')[2]);setTimeout(openModalExam,50)">+ Examen</button>'
    +'<button class="btn-primary" onclick="adminTab(\'students\',document.querySelectorAll(\'.ani\')[3]);setTimeout(openModalStudent,50)">+ Étudiant</button>'
    +'<button class="btn-primary" onclick="sendPlatformNotif()">🔔 Notification</button>'
    +'<button onclick="resetAllData()" style="font-size:13px;padding:9px 18px;border-radius:9px;border:1px solid #F09595;background:var(--r);color:var(--rc);cursor:pointer;font-family:var(--font-body);">⚠️ Réinitialiser</button>'
    +'</div>';
}

function renderAdminSubjects(){
  document.getElementById('at-subjects').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;">
      <div class="admin-ttl" style="margin:0;">📚 Matières</div>
      <button class="btn-primary" onclick="openModalSubj()">+ Nouvelle matière</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Icône</th><th>Nom</th><th>Niveau</th><th>Docs</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${DB.subjects.map(s=>`<tr>
        <td style="font-size:20px;">${s.icon}</td>
        <td><div style="font-weight:500;">${s.name}</div><div style="font-size:11px;color:var(--muted);">${s.desc||''}</div></td>
        <td><span class="pill-lvl l${s.level}p">L${s.level}</span></td>
        <td>${s.docs}</td>
        <td><span class="badge" style="background:${s.active?'var(--g)':'var(--r)'};color:${s.active?'var(--gc)':'var(--rc)'};border-color:${s.active?'#97C459':'#F09595'}">${s.active?'Actif':'Inactif'}</span></td>
        <td>
          <button class="act-btn edit-btn" onclick="editSubject(${s.id})">✏ Modifier</button>
          <button class="act-btn ${s.active?'del-btn':'green-btn'}" onclick="toggleSubj(${s.id})">${s.active?'Désactiver':'Activer'}</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}

function openModalSubj(){
  editSubjectId=null;
  document.getElementById('modal-subj-ttl').textContent='Ajouter une matière';
  ['s-name','s-icon','s-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('s-level').value='1';document.getElementById('s-docs').value='5';
  openModal('modal-subj');
}
function editSubject(id){
  editSubjectId=id;const s=DB.subjects.find(x=>x.id===id);
  document.getElementById('modal-subj-ttl').textContent='Modifier';
  document.getElementById('s-name').value=s.name;document.getElementById('s-icon').value=s.icon;
  document.getElementById('s-level').value=s.level;document.getElementById('s-docs').value=s.docs;
  document.getElementById('s-desc').value=s.desc||'';
  openModal('modal-subj');
}
async function verifyAdmin(){
  if(!currentUser || currentUser.role !== 'admin'){
    toast('Accès refusé — Admin uniquement','err');
    return false;
  }
  if(!fbReady) return true;
  try{
    const doc = await db.collection('users').doc(currentUser.email).get();
    if(!doc.exists || doc.data().role !== 'admin'){
      toast('Accès refusé — Vérification Firebase échouée','err');
      doLogout();
      return false;
    }
  }catch(e){ console.warn('Admin verify error:', e); }
  return true;
}

async function saveSubject(){
  if(!await verifyAdmin()) return;
  const name=document.getElementById('s-name').value.trim();
  if(!name){toast('Nom requis','err');return;}
  if(editSubjectId){
    const s=DB.subjects.find(x=>x.id===editSubjectId);
    Object.assign(s,{name,icon:document.getElementById('s-icon').value||'📚',level:+document.getElementById('s-level').value,docs:+document.getElementById('s-docs').value||1,desc:document.getElementById('s-desc').value});
    saveData();
    if(fbReady){ try{ await fbSaveSubject(s); await pushToRTDB(); }catch(e){console.warn(e);} }
    toast('Matière modifiée et synchronisée !','ok');
  } else {
    const newSubj={id:DB.nextId++,name,icon:document.getElementById('s-icon').value||'📚',level:+document.getElementById('s-level').value,docs:+document.getElementById('s-docs').value||1,active:true,desc:document.getElementById('s-desc').value,files:[]};
    DB.subjects.push(newSubj);
    saveData();
    if(fbReady){ try{ await fbSaveSubject(newSubj); await pushToRTDB(); }catch(e){console.warn(e);} }
    toast('Matière ajoutée et synchronisée !','ok');
    if(typeof logChange==='function') logChange('matiere','Nouvelle matière : '+newSubj.icon+' '+newSubj.name+' (Licence '+newSubj.level+')');
  }
  closeModal('modal-subj');renderAdminSubjects();
}
async function toggleSubj(id){
  const s=DB.subjects.find(x=>x.id===id);
  if(!s) return;
  s.active=!s.active;
  saveData();
  // Mettre à jour Firestore immédiatement
  if(fbReady){
    try{
      await db.collection('subjects').doc(String(s.id)).update({active:s.active});
      await pushToRTDB();
    }catch(e){console.warn(e);}
  }
  toast(s.name+' '+(s.active?'activée':'désactivée')+'!','ok');
  renderAdminSubjects();
}

function renderAdminExams(){
  document.getElementById('at-exams-a').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;">
      <div class="admin-ttl" style="margin:0;">📝 Examens</div>
      <button class="btn-primary" onclick="openModalExam()">+ Nouvel examen</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Matière</th><th>Niveau</th><th>Difficulté</th><th>Questions</th><th>Actions</th></tr></thead>
      <tbody>${DB.exams.map(e=>{
        const s=DB.subjects.find(x=>x.id===e.subjectId);
        const bc=e.difficulty==='Débutant'?'bd':e.difficulty==='Intermédiaire'?'bm':'bh';
        return `<tr><td style="font-weight:500;">${s?s.icon+' '+s.name:'?'}</td><td><span class="pill-lvl l${s?s.level:1}p">L${s?s.level:'?'}</span></td><td><span class="badge ${bc}">${e.difficulty}</span></td><td>${e.questions.length}</td><td>
          <button class="act-btn edit-btn" onclick="openEditExam(${e.id})">✏ Modifier</button>
          <button class="act-btn del-btn" onclick="deleteExam(${e.id})">🗑 Supprimer</button>
        </td></tr>`;
      }).join('')}</tbody>
    </table>`;
}

function openModalExam(){
  qCount=0;
  document.getElementById('modal-exam-ttl').textContent='Créer un examen';
  document.getElementById('e-subj').innerHTML=DB.subjects.filter(s=>s.active).map(s=>`<option value="${s.id}">${s.icon} ${s.name} (L${s.level})</option>`).join('');
  document.getElementById('e-diff').value='Débutant';
  document.getElementById('q-list').innerHTML='';
  addQuestion();
  openModal('modal-exam');
}
function addQuestion(){
  qCount++;const id=`q${qCount}`;
  const div=document.createElement('div');div.className='q-editor';div.id=`qe-${id}`;
  div.innerHTML=`<div class="q-editor-hdr"><span>Question ${qCount}</span><button onclick="document.getElementById('qe-${id}').remove()" style="font-size:11px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);background:none;color:var(--muted);cursor:pointer;">✕</button></div>
    <div class="form-row" style="margin-bottom:.5rem;"><input name="qtxt" placeholder="Énoncé de la question..."></div>
    ${['A','B','C','D'].map((l,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
      <input type="radio" name="ans-${id}" value="${i}" ${i===0?'checked':''}><span style="font-size:11px;font-weight:600;color:var(--b8);width:14px;">${l}</span>
      <input name="opt" placeholder="Option ${l}..." style="font-size:12px;flex:1;padding:5px 9px;border:1px solid var(--border);border-radius:7px;font-family:var(--font-body);background:var(--input-bg);color:var(--text);"></div>`).join('')}`;
  document.getElementById('q-list').appendChild(div);
}
async function saveExam(){
  if(!await verifyAdmin()) return;
  const subjectId=+document.getElementById('e-subj').value;
  const difficulty=document.getElementById('e-diff').value;
  const questions=[];
  document.querySelectorAll('.q-editor').forEach(qe=>{
    const qtxt=qe.querySelector('[name="qtxt"]').value.trim();
    if(!qtxt)return;
    const opts=[...qe.querySelectorAll('[name="opt"]')].map(i=>i.value.trim()||'Option');
    const ansEl=qe.querySelector('[name^="ans"]:checked');
    questions.push({q:qtxt,opts,ans:ansEl?+ansEl.value:0});
  });
  if(!questions.length){toast('Ajoutez au moins une question','err');return;}
  const newExam={id:DB.nextId++,subjectId,difficulty,questions};
  DB.exams.push(newExam);
  saveData();
  if(fbReady){ try{ await fbSaveExam(newExam); await pushToRTDB(); }catch(e){console.warn(e);} }
  closeModal('modal-exam');
  toast('Examen créé ('+questions.length+' questions) — synchronisé !','ok');
  if(typeof logChange==='function'){ const sj=DB.subjects.find(x=>x.id===subjectId); logChange('examen','Nouvel examen : '+(sj?sj.name:'matière')+' — '+questions.length+' questions ('+difficulty+')'); }
  renderAdminExams();
}
async function deleteExam(id){
  if(!await verifyAdmin()) return;
  if(!await platformConfirm('Cet examen sera retiré de la plateforme.',{title:'Supprimer l’examen',danger:true})) return;
  DB.exams=DB.exams.filter(e=>e.id!==id);
  saveData();
  if(fbReady){ try{ await fbDeleteExam(id); await pushToRTDB(); }catch(e){console.warn(e);} }
  toast('Examen supprimé et synchronisé !','ok');
  renderAdminExams();
}

function renderAdminStudents(){
  document.getElementById('at-students').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;">
      <div class="admin-ttl" style="margin:0;">👥 Étudiants</div>
      <button class="btn-primary" onclick="openModal('modal-student')">+ Étudiant</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Étudiant</th><th>Niveau</th><th>Examens</th><th>Score</th><th>Certs</th><th>Action</th></tr></thead>
      <tbody>${DB.students.map(s=>`<tr>
        <td><div style="display:flex;align-items:center;gap:7px;"><div class="avatar" style="background:${s.color}22;color:${s.color};font-size:11px;font-weight:600;">${s.initials}</div><span style="font-weight:500;">${s.name}</span></div></td>
        <td><span class="pill-lvl l${s.level}p">L${s.level}</span></td>
        <td>${s.passed}</td>
        <td><span style="font-weight:500;color:${s.avgScore>=70?'var(--gc)':'var(--rc)'};">${s.avgScore}%</span></td>
        <td>${s.certs}🎓</td>
        <td style="display:flex;gap:4px;">
          <button class="act-btn del-btn" onclick="removeStudent('${s.id}')">Retirer</button>
          <button class="act-btn" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);" onclick="banStudent('${s.id}')">🚫 Bannir</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}
function saveStudent(){
  const name=document.getElementById('stu-name').value.trim();
  if(!name){toast('Nom requis','err');return;}
  const initials=name.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'??';
  const newStu={id:DB.nextId,name,initials,color:DB.COLORS[DB.students.length%DB.COLORS.length],level:+document.getElementById('stu-level').value,passed:0,avgScore:0,certs:0,email:document.getElementById('stu-email').value};DB.nextId++;
  DB.students.push(newStu);
  saveData();closeModal('modal-student');toast(name+' ajouté !','ok');renderAdminStudents();
}

async function removeStudentDataFromFirestore(student){
  if(!fbReady||!student.email)return;
  const email=student.email;
  const jobs=[db.collection('users').doc(email).delete()];
  if(student.authUid)jobs.push(db.collection('publicProfiles').doc(student.authUid).delete());
  const [resultsSnap,certsSnap]=await Promise.all([
    db.collection('examResults').doc(email).collection('results').get(),
    db.collection('certificates').where('userId','==',email).get()
  ]);
  jobs.push(...resultsSnap.docs.map(doc=>doc.ref.delete()),...certsSnap.docs.map(doc=>doc.ref.delete()));
  await Promise.all(jobs);
}
function removeStudentFromLocal(student){
  DB.students=DB.students.filter(x=>String(x.id)!==String(student.id)&&x.email!==student.email);
  DB.users=DB.users.filter(x=>x.email!==student.email&&String(x.id)!==String(student.id));
  DB.certificates=(DB.certificates||[]).filter(c=>c.userId!==student.email&&String(c.userId)!==String(student.id));
  DB.examResults=(DB.examResults||[]).filter(r=>r.userId!==student.email&&String(r.userId)!==String(student.id));
}
async function banStudent(id){
  const s=DB.students.find(x=>String(x.id)===String(id));
  if(!s){toast('Étudiant introuvable','err');return;}
  if(!await platformConfirm('Le compte de '+s.name+' sera retiré et son adresse bloquée.',{title:'Bannir cet étudiant',confirmText:'Bannir',danger:true}))return;
  try{
    if(fbReady&&s.email){
      if(typeof banEmailHash==='function')await banEmailHash(s.email);
      await removeStudentDataFromFirestore(s);
    }
    DB.bannedEmails=DB.bannedEmails||[];
    if(s.email&&!DB.bannedEmails.includes(s.email))DB.bannedEmails.push(s.email);
    removeStudentFromLocal(s);saveData();
    toast(s.name+' banni et retiré de la liste.','ok');
    renderAdminStudents();renderAdminDash();
  }catch(e){console.error('Bannissement étudiant échoué:',e);toast('Le bannissement a échoué. Aucune donnée locale n’a été retirée.','err');}
}
async function removeStudent(id){
  const s=DB.students.find(x=>String(x.id)===String(id));
  if(!s){toast('Étudiant introuvable','err');return;}
  if(!await platformConfirm('Le profil et les données de '+s.name+' seront supprimés. Son compte de connexion pourra toujours exister.',{title:'Supprimer cet étudiant',confirmText:'Supprimer',danger:true}))return;
  try{
    await removeStudentDataFromFirestore(s);
    removeStudentFromLocal(s);saveData();
    toast(s.name+' et ses données de plateforme ont été supprimés.','ok');
    renderAdminStudents();renderAdminDash();
  }catch(e){console.error('Suppression étudiant échouée:',e);toast('La suppression a échoué. Aucune donnée locale n’a été retirée.','err');}
}

function renderAdminLB(){
  const sorted=[...DB.students].sort((a,b)=>b.avgScore-a.avgScore);
  const medals=['🥇','🥈','🥉'];
  document.getElementById('at-leaderboard-a').innerHTML=`
    <div class="admin-ttl">🏆 Leaderboard — Vue admin</div>
    <table class="data-table">
      <thead><tr><th>Rang</th><th>Étudiant</th><th>Niveau</th><th>Score moy.</th><th>Examens</th><th>Certs</th><th>Ajustements</th></tr></thead>
      <tbody>${sorted.map((s,i)=>`<tr>
        <td style="font-size:16px;">${i<3?medals[i]:'#'+(i+1)}</td>
        <td style="font-weight:500;">${s.name}</td>
        <td><span class="pill-lvl l${s.level}p">L${s.level}</span></td>
        <td><input type="number" value="${s.avgScore}" min="0" max="100" style="width:58px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--input-bg);color:var(--text);" onchange="updScore(${s.id},this.value)">%</td>
        <td>${s.passed}</td>
        <td>${s.certs}</td>
        <td>
          <button class="act-btn green-btn" onclick="addCert('${s.id}')">+Cert</button>
          <button class="act-btn edit-btn" onclick="addExam('${s.id}')">+Exam</button>
          <button class="act-btn del-btn" onclick="removeStudent('${s.id}')">Retirer</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}
async function updScore(id,v){
  const s=DB.students.find(x=>x.id===id);
  if(!s) return;
  s.avgScore=Math.min(100,Math.max(0,+v||0));
  saveData();
  if(fbReady && s.email){ try{ await fbSaveUser(s); await pushToRTDB(); }catch(e){console.warn(e);} }
}
async function addCert(id){
  const s=DB.students.find(x=>x.id===id);
  if(!s) return;
  s.certs++;
  saveData();
  if(fbReady && s.email){ try{ await fbSaveUser(s); await pushToRTDB(); }catch(e){console.warn(e);} }
  toast(s.name+' : +1 cert — synchronisé !','ok');
  renderAdminLB();
}
async function addExam(id){
  const s=DB.students.find(x=>x.id===id);
  if(!s) return;
  s.passed++;
  saveData();
  if(fbReady && s.email){ try{ await fbSaveUser(s); await pushToRTDB(); }catch(e){console.warn(e);} }
  toast(s.name+' : +1 exam — synchronisé !','ok');
  renderAdminLB();
}

function renderAdminNotifs(){
  document.getElementById('at-notifs-a').innerHTML=`
    <div class="admin-ttl">🔔 Notifications</div>
    <div style="margin-bottom:1rem;display:flex;gap:8px;">
      <button class="btn-primary" onclick="sendPlatformNotif()">📣 Envoyer à tous</button>
      <button class="btn-primary" onclick="addChangelogNote()">📝 Annoncer une mise à jour</button>
      <button class="act-btn del-btn" onclick="clearNotifs();renderAdminNotifs()">🗑 Tout effacer</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Icône</th><th>Titre</th><th>Message</th><th>Statut</th><th>Heure</th></tr></thead>
      <tbody>${myNotifs().map(n=>`<tr>
        <td>${n.ic}</td><td style="font-weight:500;">${n.title}</td><td style="font-size:12px;color:var(--muted);">${n.sub}</td>
        <td><span class="badge" style="background:${n.unread?'var(--b0)':'var(--g)'};color:${n.unread?'var(--b8)':'var(--gc)'};border-color:${n.unread?'var(--b2)':'#97C459'}">${n.unread?'Non lu':'Lu'}</span></td>
        <td style="font-size:12px;color:var(--muted);">${fmtNotifTime(n.ts)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}
async function resetAllData(){
  if(!await platformConfirm('Les étudiants ajoutés, certificats et examens créés seront effacés.',{title:'Réinitialiser les données',confirmText:'Tout effacer',danger:true}))return;
  localStorage.removeItem('erse_db');
  toast('Données réinitialisées. Rechargez la page.','ok');
  setTimeout(()=>location.reload(),2000);
}
async function sendPlatformNotif(){
  const answer=await platformDialog({title:'Envoyer une notification',message:'Le message sera affiché aux étudiants dans leurs notifications.',fields:[{id:'message',label:'Message',max:300}],confirmText:'Envoyer'});
  const clean=(answer?.message||'').trim(); if(!clean) return;
  const ts=Date.now();
  pushNotif('Annonce ERSE ACADEMY',clean,'📢','#b0d4f4',null,ts);
  if(fbReady){
    try{
      await db.collection('meta').doc('platformNotif').set({
        title:'Annonce ERSE ACADEMY',sub:clean,ic:'📢',bg:'#b0d4f4',
        ts,by:currentUser?.email||'admin'
      });
    }catch(e){console.warn(e);}
  }
  toast('Annonce envoyée à tous les étudiants','ok');
  renderAdminNotifs();
}

