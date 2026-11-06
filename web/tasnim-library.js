/* SM SCHOOL AI — Tasnim library INSIDE the app (v2.0.1).
   Browse the papers listed in data/tasnim-index.json, download them (single or the whole filtered list)
   with progress, keep them on the device (IndexedDB, survives app updates) and read them in an in-app viewer.
   The papers themselves are produced by tools/fetch_tasnim.py. Nothing opens the browser or another site.
   Files are read from the app's own origin, or from SM_SCHOOL_CONFIG.examsBase when the papers are hosted
   separately (keeps the APK small; that host must send Access-Control-Allow-Origin).
   v2.1.6: the owner can START the fetch script from the app (GitHub Actions workflow_dispatch) and follow its progress. */
(function(){
 'use strict';
 const L=()=>{try{return typeof lang!=='undefined'?lang:'ar'}catch(e){return 'ar'}};
 const tr=(ar,fr,en)=>{const l=L();return l==='fr'?fr:l==='en'?en:ar};
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const say=m=>{try{if(typeof toast==='function')toast(m)}catch(e){}};
 const SRC_KEY='smContentBase';
 const savedBase=()=>{try{return String(localStorage.getItem(SRC_KEY)||'')}catch(e){return ''}};
 const contentBase=()=>String(savedBase()||(window.SM_SCHOOL_CONFIG||{}).publicContentBase||'').replace(/\/$/,'');
 const base=()=>{const c=window.SM_SCHOOL_CONFIG||{};const raw=String(c.examsBase||((contentBase())?contentBase()+'/':''));return raw?raw.replace(/\/?$/,'/'):''};
 const indexUrl=()=>{const c=window.SM_SCHOOL_CONFIG||{};return c.tasnimIndexUrl||(contentBase()?contentBase()+'/data/tasnim-index.json':'./data/tasnim-index.json')};
 const INDEX_CACHE='smTasnimIndexCacheV2';
 const MIME={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
 const ext=f=>((String(f).match(/\.(\w+)$/)||[])[1]||'pdf').toLowerCase();
 const kb=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
 const PAGE=30;

 /* ---------- on-device storage: IndexedDB, with an in-memory fallback ---------- */
 const mem=new Map();let dbp=null;
 function db(){
  if(dbp)return dbp;
  dbp=new Promise((res,rej)=>{
   try{
    if(typeof indexedDB==='undefined')return rej(new Error('no indexedDB'));
    const r=indexedDB.open('sm-tasnim-docs',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('files');
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
   }catch(e){rej(e)}
  });
  dbp.catch(()=>{});
  return dbp;
 }
 const req=(r)=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const store={
  async get(k){try{return (await req((await db()).transaction('files').objectStore('files').get(k)))||mem.get(k)||null}catch(e){return mem.get(k)||null}},
  async put(k,v){try{const d=await db();await new Promise((res,rej)=>{const t=d.transaction('files','readwrite');t.objectStore('files').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){mem.set(k,v)}},
  async del(k){mem.delete(k);try{const d=await db();await new Promise((res,rej)=>{const t=d.transaction('files','readwrite');t.objectStore('files').delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}},
  async keys(){let ks=[];try{ks=await req((await db()).transaction('files').objectStore('files').getAllKeys())}catch(e){}return new Set([...ks,...mem.keys()])}
 };

 /* ---------- state ---------- */
 const S={grade:'',subject:'',term:'',cat:'',q:'',sol:false,shown:PAGE,bulk:null,view:null,busy:new Set(),pct:{}};
 let docs=null,have=new Set(),ready=false,loading=null;
 async function loadIndex(force){
  if(!force){try{const cached=JSON.parse(localStorage.getItem(INDEX_CACHE)||'null');if(cached&&Array.isArray(cached.documents))docs=cached.documents}catch(e){}}
  try{
   let r;try{r=await fetch(indexUrl(),{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status)}catch(e){r=await fetch('./data/tasnim-index.json',{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status)}
   const d=await r.json();if(!d||!Array.isArray(d.documents))throw new Error('Invalid Tasnim index');
   docs=d.documents;try{localStorage.setItem(INDEX_CACHE,JSON.stringify({version:d.version||'',documents:docs,updated_at:d.updated_at||''}))}catch(e){}
   return true;
  }catch(e){if(!Array.isArray(docs))docs=[];return false;}
 }
 function load(force){
  if(!loading||force)loading=Promise.all([loadIndex(!!force),store.keys().then(k=>{have=k}).catch(()=>{})]).then(()=>{ready=true;refresh();return true});
  return loading;
 }
 async function refreshIndex(){loading=null;const ok=await load(true);say(ok?tr('تم تحديث فهرس تسنيم.','Index Tasnim actualisé.','Tasnim index updated.'):tr('تعذر الاتصال؛ عُرض آخر فهرس محفوظ.','Connexion impossible ; dernier index local affiché.','Could not connect; showing the last saved index.'));return ok;}
 const gradeDocs=()=>docs?docs.map((d,i)=>({d,i})).filter(x=>x.d.grade===S.grade):[];
 const norm=s=>String(s||'').replace(/[أإآ]/g,'ا').toLowerCase();
 function filtered(){
  const q=norm(S.q).trim();
  return gradeDocs().filter(({d})=>(!S.subject||d.subject===S.subject)&&(!S.cat||(d.category||'exam')===S.cat)&&(!S.term||String(d.term)===S.term)&&(!S.sol||d.solution)&&(!q||norm(d.title+' '+d.subject+' '+(d.season||'')).includes(q)))
   .sort((a,b)=>String(b.d.season||'').localeCompare(String(a.d.season||''))||(a.d.term||9)-(b.d.term||9)||String(a.d.title).localeCompare(String(b.d.title),'ar'));
 }

 /* ---------- download ---------- */
 async function fetchDoc(i,signal){
  const d=docs[i],url=base()+d.file;
  S.busy.add(i);S.pct[i]=0;
  try{
   const res=await fetch(url,{signal});
   if(!res.ok)throw new Error('HTTP '+res.status);
   const total=+(res.headers&&res.headers.get&&res.headers.get('content-length'))||d.bytes||0;
   let parts=[],got=0;
   if(res.body&&res.body.getReader){
    const rd=res.body.getReader();
    for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;S.pct[i]=total?Math.min(99,Math.round(got*100/total)):0;const el=document.getElementById('tl-p-'+i);if(el)el.textContent=S.pct[i]+'%'}
   }else{parts=[await res.arrayBuffer()]}
   const type=MIME[ext(d.file)]||'application/octet-stream';
   const blob=new Blob(parts,{type});
   if(ext(d.file)==='pdf'&&String.fromCharCode(...new Uint8Array(await blob.slice(0,4).arrayBuffer()))!=='%PDF')throw new Error('not a PDF');
   if(!blob.size)throw new Error('empty file');
   await store.put(d.file,{blob,size:blob.size,at:Date.now()});
   have.add(d.file);
   return blob;
  }finally{S.busy.delete(i);delete S.pct[i]}
 }
 async function blobOf(i){
  const d=docs[i],rec=await store.get(d.file);
  if(rec&&rec.blob)return rec.blob;
  const b=await fetchDoc(i);refreshList();return b;
 }
 const errText=e=>(e&&e.name==='AbortError')?'':tr('تعذّر التنزيل. تحقق من الاتصال ثم أعد المحاولة.','Téléchargement impossible. Vérifiez la connexion.','Download failed. Check your connection and retry.');
 async function downloadAll(){
  if(S.bulk)return;
  const todo=filtered().filter(x=>!have.has(x.d.file));
  if(!todo.length){say(tr('كل المعروض محمّل على جهازك','Tout est déjà sur l’appareil','Everything shown is already on your device'));return}
  const ctl=new AbortController();S.bulk={n:todo.length,done:0,fail:0,ctl};refreshList();
  for(const {i} of todo){
   if(ctl.signal.aborted)break;
   try{await fetchDoc(i,ctl.signal);S.bulk.done++}catch(e){if(e&&e.name==='AbortError')break;S.bulk.fail++}
   refreshList();
  }
  const b=S.bulk;S.bulk=null;refreshList();
  say(tr(`تم تنزيل ${b.done} من ${b.n}`+(b.fail?` — تعذّر ${b.fail}`:''),`${b.done}/${b.n} téléchargés`,`${b.done}/${b.n} downloaded`));
 }
 function cancelBulk(){if(S.bulk)S.bulk.ctl.abort()}
 async function clearGrade(){
  const mine=gradeDocs().filter(x=>have.has(x.d.file));
  if(!mine.length)return;
  if(typeof confirm==='function'&&!confirm(tr(`حذف ${mine.length} ملفاً من جهازك؟`,`Supprimer ${mine.length} fichiers ?`,`Delete ${mine.length} files from this device?`)))return;
  for(const {d} of mine){await store.del(d.file);have.delete(d.file)}
  refreshList();
 }

 /* ---------- save / share ---------- */
 const fileName=d=>(String(d.title||'tasnim').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'tasnim')+'.'+ext(d.file);
 async function saveBlob(d,blob){
  const name=fileName(d);
  try{
   const f=new File([blob],name,{type:blob.type});
   if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:d.title});return 'shared'}
  }catch(e){if(e&&e.name==='AbortError')return 'cancel'}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}},30000);return 'download';
 }
 async function save(i){try{await saveBlob(docs[i],await blobOf(i))}catch(e){const m=errText(e);if(m)say(m)}}

 /* ---------- in-app viewer ---------- */
 async function openDoc(i){
  try{
   const d=docs[i],blob=await blobOf(i);
   closeViewer(true);
   const url=URL.createObjectURL(blob),isPdf=ext(d.file)==='pdf';
   const o=document.createElement('div');o.className='tl-viewer';o.id='tlViewer';
   o.innerHTML=`<div class="tl-vbar"><button type="button" class="tl-vbtn" onclick="SM_TASLIB.close()" aria-label="${tr('إغلاق','Fermer','Close')}">✕</button><b>${esc(d.title)}</b><button type="button" class="tl-vbtn" onclick="SM_TASLIB.saveCurrent()" aria-label="${tr('حفظ أو مشاركة','Enregistrer / partager','Save / share')}">💾</button></div>`+
    (isPdf?`<iframe class="tl-frame" src="${url}" title="${esc(d.title)}"></iframe><p class="tl-vhint">${tr('إن لم يظهر الملف على جهازك فاضغط 💾 للحفظ أو المشاركة.','Si le fichier ne s’affiche pas, touchez 💾.','If the file does not display on your device, tap 💾 to save or share.')}</p>`
     :`<div class="tl-vno"><p>${tr('هذا ملف Word ولا يُعرض داخل التطبيق. اضغط 💾 لحفظه أو فتحه في تطبيق Word.','Fichier Word : touchez 💾 pour l’enregistrer.','This is a Word file and cannot be shown in the app. Tap 💾 to save or open it in Word.')}</p></div>`);
   document.body.appendChild(o);document.body.style&&(document.body.style.overflow='hidden');
   S.view={i,url,blob,pushed:false};
   try{history.pushState({smSchoolPage:typeof page!=='undefined'?page:'home',tlViewer:1},'');S.view.pushed=true}catch(e){}
  }catch(e){const m=errText(e);if(m)say(m)}
 }
 function closeViewer(silent){
  const v=S.view;if(!v)return;
  S.view=null;
  const o=document.getElementById('tlViewer');if(o&&o.remove)o.remove();
  try{URL.revokeObjectURL(v.url)}catch(e){}
  if(document.body.style)document.body.style.overflow='';
  if(!silent&&v.pushed){try{history.back()}catch(e){}}
 }
 async function saveCurrent(){if(S.view)await saveBlob(docs[S.view.i],S.view.blob)}
 if(typeof window.addEventListener==='function')window.addEventListener('popstate',()=>{if(S.view){S.view.pushed=false;closeViewer(true)}});
 const hb=window.handleAppBack;
 if(typeof hb==='function')window.handleAppBack=function(){if(S.view){closeViewer(false);return}return hb.apply(this,arguments)};


 /* ---------- v2.1.6: run the Tasnim fetch script from the app ----------
    The script (tools/fetch_tasnim.py) needs a real server with internet, so it runs in the repository's GitHub Actions
    workflow. The app only triggers that workflow and follows its status; the browser never scrapes Tasnim itself.
    The GitHub token is typed by the owner, kept in this device's localStorage only, and sent only to api.github.com. */
 const WF='publish-learning-content.yml',TOK_KEY='smGhActionsToken',REPO_KEY='smGhRepo',GH='https://api.github.com';
 const lsGet=k=>{try{return String(localStorage.getItem(k)||'')}catch(e){return ''}};
 const lsSet=(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){}};
 const SY={run:null,msg:'',busy:false,timer:null,open:false,ticks:0,watch:false,since:0};
 function repoSlug(){
  const saved=lsGet(REPO_KEY).trim();
  if(/^[\w.-]+\/[\w.-]+$/.test(saved))return saved;
  const m=contentBase().match(/^https:\/\/([\w-]+)\.github\.io\/([\w.-]+)/i);
  return m?m[1]+'/'+m[2]:'';
 }
 const hasToken=()=>!!lsGet(TOK_KEY);
 async function gh(path,opt){
  const r=await fetch(GH+'/repos/'+repoSlug()+path,Object.assign({cache:'no-store'},opt,{headers:Object.assign({Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+lsGet(TOK_KEY)},(opt&&opt.headers)||{})}));
  if(r.status===204)return {status:204,data:null};
  let data=null;try{data=await r.json()}catch(e){}
  return {status:r.status,data};
 }
 function ghError(st){
  if(st===401)return tr('المفتاح غير صالح أو منتهي. أنشئ مفتاحاً جديداً.','Jeton invalide ou expiré.','The token is invalid or expired.');
  if(st===403)return tr('المفتاح لا يملك صلاحية Actions: Read and write على هذا المستودع.','Le jeton n’a pas Actions : Read and write sur ce dépôt.','The token lacks “Actions: Read and write” on this repository.');
  if(st===404)return tr('المستودع أو سير العمل غير موجود، أو أن المفتاح لا يصل إلى هذا المستودع.','Dépôt ou workflow introuvable (ou jeton sans accès).','Repository or workflow not found (or the token has no access to it).');
  if(st===422)return tr('رُفض الطلب: تأكد أن سير العمل منشور في الفرع main.','Requête refusée : le workflow doit exister sur la branche main.','Request rejected: the workflow must exist on the main branch.');
  return tr('تعذّر الاتصال بـ GitHub ('+st+').','Connexion à GitHub impossible ('+st+').','Could not reach GitHub ('+st+').');
 }
 function syncLine(){
  if(SY.msg)return SY.msg;
  const r=SY.run;
  if(!r)return tr('لم يُفحص بعد. اضغط «حالة التشغيل».','Pas encore vérifié.','Not checked yet.');
  const when=r.run_started_at||r.created_at||'';
  const t=when?new Date(when).toLocaleString(L()==='ar'?'ar-DZ':L()==='fr'?'fr-FR':'en-GB'):'';
  if(r.status==='completed')return (r.conclusion==='success'?'✅ ':'⚠ ')+tr(r.conclusion==='success'?'آخر تشغيل نجح':'آخر تشغيل انتهى بحالة '+r.conclusion,r.conclusion==='success'?'Dernier run réussi':'Dernier run : '+r.conclusion,r.conclusion==='success'?'Last run succeeded':'Last run ended: '+r.conclusion)+(t?' · '+t:'');
  return '⏳ '+tr(r.status==='queued'?'في الانتظار…':'قيد التشغيل… قد يستغرق ساعات وتُحفظ النتائج تلقائياً.',r.status==='queued'?'En file d’attente…':'En cours… peut durer des heures ; les résultats sont enregistrés automatiquement.',r.status==='queued'?'Queued…':'Running… may take hours; results are saved automatically.')+(t?' · '+t:'');
 }
 function paintSync(){const el=document.getElementById('tlSyncStatus');if(el)el.textContent=syncLine()}
 const running=r=>!!r&&(r.status==='queued'||r.status==='in_progress'||r.status==='waiting'||r.status==='requested'||r.status==='pending');
 async function syncStatus(quiet){
  if(!repoSlug()||!hasToken()){SY.msg=tr('أدخل رابط المستودع والمفتاح أولاً.','Saisissez d’abord le dépôt et le jeton.','Enter the repository and token first.');paintSync();return null}
  try{
   const {status,data}=await gh('/actions/workflows/'+WF+'/runs?per_page=1');
   if(status!==200)throw {st:status};
   let run=(data&&data.workflow_runs&&data.workflow_runs[0])||null;
   /* Right after a dispatch GitHub may still list the previous run for a few seconds: keep waiting for the new one. */
   if(SY.since){
    const born=run?Date.parse(run.created_at||''):0;
    if(!run||!(born>=SY.since-120000)){
     if(Date.now()-SY.since<600000){SY.run={status:'queued',created_at:new Date(SY.since).toISOString()};SY.msg='';paintSync();schedulePoll();return SY.run}
     SY.since=0;SY.watch=false;
    }else SY.since=0;
   }
   SY.run=run;SY.msg=run?'':tr('لا توجد تشغيلات سابقة.','Aucun run précédent.','No previous runs.');paintSync();
   if(running(run)){SY.watch=true;schedulePoll()}else stopPoll();
   if(SY.watch&&run&&run.status==='completed'){
    SY.watch=false;
    if(run.conclusion==='success'){say(tr('انتهى الجلب. أحدّث فهرس تسنيم…','Récupération terminée, actualisation de l’index…','Fetch finished, refreshing the index…'));await refreshIndex()}
    else say(tr('انتهى التشغيل دون نجاح كامل. راجع Actions على GitHub.','Run terminé sans succès complet.','The run did not fully succeed.'));
   }
   return run;
  }catch(e){SY.msg=ghError(e&&e.st||0);paintSync();if(!quiet)say(SY.msg);stopPoll();return null}
 }
 function schedulePoll(){if(SY.timer||typeof setTimeout!=='function')return;SY.timer=setTimeout(()=>{SY.timer=null;if(++SY.ticks>800){stopPoll();return}syncStatus(true)},45000)}
 function stopPoll(){if(SY.timer&&typeof clearTimeout==='function')clearTimeout(SY.timer);SY.timer=null;SY.ticks=0}
 async function runSync(scope){
  if(SY.busy)return false;
  if(!repoSlug()||!hasToken()){SY.msg=tr('أدخل رابط المستودع والمفتاح أولاً.','Saisissez d’abord le dépôt et le jeton.','Enter the repository and token first.');paintSync();say(SY.msg);return false}
  const one=scope==='grade'&&S.grade;
  if(typeof confirm==='function'&&!confirm(tr(
   `سيشغَّل سكريبت جلب تسنيم على GitHub (${one?S.grade:'كل المستويات'}) بإذن صاحب الموقع، وقد يستغرق ساعات. المتابعة؟`,
   `Lancer le script Tasnim sur GitHub (${one?S.grade:'tous les niveaux'}) avec l’autorisation du site ? Cela peut durer des heures.`,
   `Start the Tasnim fetch script on GitHub (${one?S.grade:'all grades'}) with the site owner’s permission? It can take hours.`)))return false;
  SY.busy=true;SY.msg=tr('جارٍ الإرسال…','Envoi…','Sending…');paintSync();
  try{
   const cur=await syncStatus(true);
   if(running(cur)){say(tr('يوجد تشغيل جارٍ بالفعل؛ لن أبدأ آخر.','Un run est déjà en cours.','A run is already in progress.'));return true}
   const inputs={content:'all'};if(one)inputs.grades=S.grade;
   const {status}=await gh('/actions/workflows/'+WF+'/dispatches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs})});
   if(status!==204)throw {st:status};
   say(tr('بدأ سكريبت جلب تسنيم على GitHub. سأتابع حالته.','Le script Tasnim a démarré sur GitHub.','The Tasnim fetch script has started on GitHub.'));
   SY.since=Date.now();SY.watch=true;SY.run={status:'queued',created_at:new Date(SY.since).toISOString()};SY.msg='';paintSync();
   setTimeout&&setTimeout(()=>syncStatus(true),10000);
   return true;
  }catch(e){SY.msg=ghError(e&&e.st||0);paintSync();say(SY.msg);return false}
  finally{SY.busy=false}
 }
 function saveSyncConfig(token,repo){
  token=String(token||'').trim();repo=String(repo||'').trim().replace(/^https:\/\/github\.com\//i,'').replace(/\/+$/,'').replace(/\.git$/,'');
  if(repo&&!/^[\w.-]+\/[\w.-]+$/.test(repo)){say(tr('صيغة المستودع: المالك/الاسم','Format du dépôt : propriétaire/nom','Repository format: owner/name'));return false}
  if(repo)lsSet(REPO_KEY,repo);
  if(token){if(!/^[\w-]{20,255}$/.test(token)){say(tr('صيغة المفتاح غير صحيحة.','Format de jeton invalide.','Invalid token format.'));return false}lsSet(TOK_KEY,token)}
  say(tr('تم حفظ الإعداد على هذا الجهاز فقط.','Enregistré sur cet appareil uniquement.','Saved on this device only.'));refresh();return true;
 }
 function clearSyncToken(){lsSet(TOK_KEY,'');stopPoll();SY.run=null;SY.msg='';SY.since=0;SY.watch=false;say(tr('حُذف المفتاح من هذا الجهاز.','Jeton supprimé de cet appareil.','Token removed from this device.'));refresh()}
 function syncHtml(){
  const slug=repoSlug(),tok=hasToken();
  return `<details class="tl-sync" ${SY.open?'open':''} ontoggle="SM_TASLIB.syncToggle(this.open)"><summary><b>🔄 ${tr('تشغيل سكريبت جلب تسنيم (للمشرف)','Lancer le script Tasnim (admin)','Run the Tasnim fetch script (admin)')}</b></summary>`+
   `<p><small>${tr('يعمل السكريبت على GitHub Actions بإذن صاحب الموقع، ثم تظهر الملفات هنا بعد «تحديث الفهرس». لا يفتح التطبيق أي موقع آخر.','Le script s’exécute sur GitHub Actions avec l’autorisation du site ; les fichiers apparaissent ici après « Actualiser ».','The script runs on GitHub Actions with the site owner’s permission; files appear here after “Refresh index”.')}</small></p>`+
   `<p id="tlSyncStatus" role="status">${esc(syncLine())}</p>`+
   `<div class="tl-bulk"><button type="button" class="primary-btn tl-btn" onclick="SM_TASLIB.runSync('all')" ${slug&&tok?'':'disabled'}>▶ ${tr('جلب كل المستويات','Tous les niveaux','All grades')}</button>`+
   (S.grade?`<button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.runSync('grade')" ${slug&&tok?'':'disabled'}>▶ ${esc(S.grade)}</button>`:'')+
   `<button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.syncStatus()" ${slug&&tok?'':'disabled'}>📡 ${tr('حالة التشغيل','État','Status')}</button></div>`+
   `<div class="tl-filters"><input id="tlGhRepo" type="text" dir="ltr" autocomplete="off" value="${esc(slug)}" placeholder="OWNER/REPOSITORY">`+
   `<input id="tlGhTok" type="password" dir="ltr" autocomplete="off" placeholder="${tok?'••••••••••••':'github_pat_…'}">`+
   `<button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.saveSync(document.getElementById('tlGhTok').value,document.getElementById('tlGhRepo').value)">${tr('حفظ','Enregistrer','Save')}</button>`+
   (tok?`<button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.clearToken()">🗑 ${tr('حذف المفتاح','Supprimer le jeton','Remove token')}</button>`:'')+`</div>`+
   `<small>${tr('أنشئ مفتاح GitHub «Fine-grained» لهذا المستودع وحده بصلاحية Actions: Read and write. يُحفظ على هذا الجهاز فقط ولا يُرسل إلا إلى api.github.com. لا تضعه في الملفات ولا تشاركه.','Créez un jeton GitHub « fine-grained » limité à ce dépôt (Actions : Read and write). Il reste sur cet appareil et n’est envoyé qu’à api.github.com.','Create a fine-grained GitHub token limited to this repository (Actions: Read and write). It stays on this device and is only sent to api.github.com.')}</small></details>`;
 }

 /* ---------- rendering ---------- */
 const credit=()=>`<small class="tl-credit">${tr('المصدر: موقع تسنيم للتربية والتعليم (t-onec.com) — الملفات لأصحابها وتُستعمل بإذن صاحب الموقع.','Source : site Tasnim (t-onec.com) — fichiers utilisés avec l’autorisation du site.','Source: Tasnim (t-onec.com) — files belong to their authors, used with the site owner’s permission.')}</small>`;
 const head=()=>`<div class="learning-meta"><b>📚 ${tr('دروس وفروض واختبارات — مكتبة تسنيم','Cours, devoirs et examens — Tasnim','Lessons & exams — Tasnim library')}</b><button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.refreshIndex()">↻ ${tr('تحديث الفهرس','Actualiser','Refresh index')}</button></div>`;
 function rowHtml({d,i}){
  const got=have.has(d.file),busy=S.busy.has(i);
  const meta=[d.subject,d.term?tr('الفصل '+d.term,'T'+d.term,'Term '+d.term):'',d.season,d.solution?tr('مع الحل','avec corrigé','with solution'):'',d.bytes?kb(d.bytes):''].filter(Boolean).join(' · ');
  return `<div class="tl-row"><div class="tl-main"><b>${got?'✅ ':''}${esc(d.title)}</b><small>${esc(meta)}</small></div>`+
   `<div class="tl-actions">${busy?`<span class="tl-wait" id="tl-p-${i}">⏳ ${S.pct[i]||0}%</span>`:`<button type="button" class="primary-btn tl-btn" onclick="SM_TASLIB.open(${i})">${got?tr('فتح','Ouvrir','Open'):tr('تنزيل وفتح','Télécharger','Get & open')}</button><button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.save(${i})" aria-label="${tr('حفظ','Enregistrer','Save')}">💾</button>`}</div></div>`;
 }
 function listHtml(){
  const all=filtered(),shown=all.slice(0,S.shown),mine=gradeDocs().filter(x=>have.has(x.d.file)).length;
  const pending=all.filter(x=>!have.has(x.d.file)).length;
  let bar;
  if(S.bulk){const b=S.bulk,p=Math.round(b.done*100/b.n);bar=`<div class="tl-bulk"><progress max="100" value="${p}"></progress><small>${tr('جارٍ التنزيل','Téléchargement','Downloading')} ${b.done}/${b.n}${b.fail?' · ⚠ '+b.fail:''}</small><button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.cancelBulk()">${tr('إيقاف','Arrêter','Stop')}</button></div>`}
  else bar=`<div class="tl-bulk"><button type="button" class="primary-btn tl-btn" onclick="SM_TASLIB.downloadAll()" ${pending?'':'disabled'}>⬇ ${tr('تنزيل كل المعروض','Tout télécharger','Download all shown')} (${pending})</button>${mine?`<button type="button" class="secondary-btn tl-btn" onclick="SM_TASLIB.clearGrade()">🗑 ${tr('حذف التنزيلات','Supprimer','Delete downloads')} (${mine})</button>`:''}</div>`;
  return `<small class="tl-count">${all.length} ${tr('موضوعاً','sujets','papers')} · ${mine} ${tr('على جهازك','sur l’appareil','on this device')}</small>${bar}`+
   (all.length?`<div class="tl-list">${shown.map(rowHtml).join('')}</div>`:`<p>${tr('لا نتائج مطابقة.','Aucun résultat.','No matching papers.')}</p>`)+
   (all.length>shown.length?`<button type="button" class="secondary-btn tl-more" onclick="SM_TASLIB.more()">${tr('عرض المزيد','Plus','Show more')} (${all.length-shown.length})</button>`:'');
 }
 function inner(){
  if(!ready)return head()+`<p>${tr('جارٍ التحميل…','Chargement…','Loading…')}</p>`;
  const all=gradeDocs();
  if(!all.length)return head()+emptyHtml()+syncHtml()+credit();
  const subs=[...new Set(all.map(x=>x.d.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const opt=(v,t,c)=>`<option value="${esc(v)}" ${String(c)===String(v)?'selected':''}>${esc(t)}</option>`;
  return head()+`<div class="tl-filters">`+
   `<select aria-label="${tr('المادة','Matière','Subject')}" onchange="SM_TASLIB.set('subject',this.value)">${opt('',tr('كل المواد','Toutes','All subjects'),S.subject)}${subs.map(s=>opt(s,s,S.subject)).join('')}</select>`+
   `<select aria-label="${tr('النوع','Type','Type')}" onchange="SM_TASLIB.set('cat',this.value)">${opt('',tr('كل الأنواع','Tous','All types'),S.cat)}${opt('exam',tr('اختبارات وفروض','Examens et devoirs','Exams & homework'),S.cat)}${opt('lesson',tr('دروس وملخصات','Cours et résumés','Lessons & summaries'),S.cat)}${opt('exercise',tr('تمارين وحلول','Exercices','Exercises'),S.cat)}</select>`+
   `<select aria-label="${tr('الفصل','Trimestre','Term')}" onchange="SM_TASLIB.set('term',this.value)">${opt('',tr('كل الفصول','Tous','All terms'),S.term)}${[1,2,3].map(n=>opt(n,tr('الفصل '+n,'Trimestre '+n,'Term '+n),S.term)).join('')}</select>`+
   `<input type="search" value="${esc(S.q)}" placeholder="${tr('ابحث…','Rechercher…','Search…')}" oninput="SM_TASLIB.set('q',this.value)">`+
   `<label class="tl-check"><input type="checkbox" ${S.sol?'checked':''} onchange="SM_TASLIB.set('sol',this.checked)"> ${tr('مع الحل فقط','Corrigés','With solution')}</label></div>`+
   `<div id="tlList">${listHtml()}</div>`+syncHtml()+credit();
 }
 function emptyHtml(){
  const cb=contentBase(),none=!(docs&&docs.length);
  const msg=none
   ?(cb?tr('الفهرس المنشور على خادم المحتوى فارغ. افتح مستودعك على GitHub ← Actions ← «Publish SM education learning content» ← Run workflow، وانتظر انتهاءه ثم اضغط «تحديث الفهرس».','L’index publié est vide. Sur GitHub : Actions → « Publish SM education learning content » → Run workflow, puis « Actualiser ».','The published index is empty. On GitHub: Actions → “Publish SM education learning content” → Run workflow, then tap Refresh.')
        :tr('التطبيق غير مربوط بخادم المحتوى بعد. أدخل رابط GitHub Pages الخاص بمشروعك ليحمّل الاختبارات والفروض والحلول مباشرة.','L’application n’est pas reliée au serveur de contenu. Saisissez l’URL GitHub Pages de votre projet pour télécharger les sujets directement.','The app is not linked to your content server yet. Enter your GitHub Pages URL to download papers directly.'))
   :tr('لا توجد مواضيع لهذه السنة في الفهرس الحالي. جرّب مستوى آخر أو حدّث الفهرس.','Aucun sujet pour ce niveau dans l’index actuel.','No papers for this grade in the current index.');
  return `<p>${msg}</p><div class="tl-filters"><input id="tlSrc" type="url" inputmode="url" dir="ltr" value="${esc(savedBase())}" placeholder="https://USER.github.io/REPOSITORY"><button type="button" class="primary-btn tl-btn" onclick="SM_TASLIB.setSource(document.getElementById('tlSrc').value)">${tr('حفظ الرابط وتحديث','Enregistrer et actualiser','Save & refresh')}</button></div>`;
 }
 async function setSource(v){
  v=String(v||'').trim().replace(/\/+$/,'');
  if(v&&!/^https:\/\/[^\s]+$/i.test(v)){say(tr('الرابط يجب أن يبدأ بـ https://','L’URL doit commencer par https://','URL must start with https://'));return false}
  try{v?localStorage.setItem(SRC_KEY,v):localStorage.removeItem(SRC_KEY)}catch(e){}
  docs=null;ready=false;loading=null;refresh();
  const ok=await load(true);refresh();
  say(ok?tr('تم الاتصال وتحديث الفهرس.','Connecté, index actualisé.','Connected, index updated.'):tr('تعذر الوصول إلى الرابط.','Lien inaccessible.','Could not reach the link.'));
  return ok;
 }
 function refresh(){const el=document.getElementById('tasLib');if(el)el.innerHTML=inner()}
 function refreshList(){const el=document.getElementById('tlList');if(el)el.innerHTML=listHtml()}
 function panel(g){
  if(S.grade!==g)Object.assign(S,{grade:g,subject:'',term:'',cat:'',q:'',sol:false,shown:PAGE});
  if(!ready)load();
  return `<section class="panel tasnim-panel tl" id="tasLib">${inner()}</section>`;
 }
 function set(k,v){S[k]=v;S.shown=PAGE;refreshList()}

 window.tasnimPanel=panel;
 window.SM_TASLIB={set,setSource,more(){S.shown+=PAGE;refreshList()},refreshIndex,open:openDoc,save,saveCurrent,close:()=>closeViewer(false),downloadAll,cancelBulk,clearGrade,
  runSync,syncStatus,saveSync:saveSyncConfig,clearToken:clearSyncToken,syncToggle(v){SY.open=!!v},
  _t:{S,SY,repoSlug,syncHtml,store,load,loadIndex,filtered,fetchDoc,docs:()=>docs,have:()=>have,reset(){docs=null;ready=false;loading=null;have=new Set();mem.clear();Object.assign(S,{grade:'',subject:'',term:'',q:'',sol:false,shown:PAGE,bulk:null,view:null})}}};
})();
