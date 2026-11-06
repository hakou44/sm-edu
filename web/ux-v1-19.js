/* SM SCHOOL AI v1.19.0 — usability pass: simple navigation, clear AI setup, clean test bank,
   level-appropriate exercise bank, reliable smart teacher. Loaded last so it can refine earlier scripts. */
(function(){
 'use strict';
 const L=()=>(typeof lang!=='undefined'?lang:'ar');
 const tr=(ar,fr,en)=>L()==='ar'?ar:L()==='fr'?fr:en;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 /* ---------- 1) Exercise bank: keep a repeated question only in the lowest grade where it appears ---------- */
 window.smQualityFilter=function(recs){
  const order=[].concat(levels.primary,levels.middle,levels.secondary);
  return (recs||[]).filter(r=>{
   if(!(r.quality_flags||[]).includes('cross_grade_repeat'))return true;
   const mine=order.indexOf(r.grade);if(mine<0)return true;
   const idx=(r.repeat_grades||[]).concat(r.grade).map(g=>order.indexOf(g)).filter(i=>i>=0);
   return mine===Math.min.apply(null,idx);
  });
 };

 /* ---------- 2) Network guard: no Groq key -> clear message instead of an HTML page ---------- */
 const _fetch=window.fetch.bind(window);
 window.fetch=function(input,init){
  try{
   const url=typeof input==='string'?input:(input&&input.url)||'';
   if(/^\/api\/v1\//.test(url)){
    const base=(localStorage.getItem('smSchoolApiBase')||(window.SM_SCHOOL_CONFIG&&window.SM_SCHOOL_CONFIG.apiBase)||'').trim();
    const groq=window.SM_GROQ&&window.SM_GROQ.enabled();
    const isTutor=/\/api\/v1\/ai\/tutor$/.test(url.split('?')[0]);
    if((isTutor&&!groq)||(!base&&!isTutor)){
     const detail=isTutor?tr('الذكاء الاصطناعي غير مفعّل. أدخلي مفتاح Groq المجاني في أعلى صفحة «المساعد الذكي».','IA non activée : saisissez la clé Groq gratuite en haut de la page « Assistant IA ».','AI is not enabled. Paste your free Groq key at the top of the AI assistant page.'):tr('هذه الميزة تحتاج خادماً متصلاً وغير متاحة في التطبيق.','Cette fonction nécessite un serveur.','This feature needs a server and is not available in the app.');
     return Promise.resolve(new Response(JSON.stringify({detail}),{status:503,headers:{'Content-Type':'application/json'}}));
    }
   }
  }catch(e){}
  return _fetch(input,init);
 };

 /* ---------- 3) AI status card (replaces the confusing "Groq server" notice) ---------- */
 window.smAiStatusCard=function(){
  const on=!!(window.SM_GROQ&&window.SM_GROQ.enabled());
  if(on)return `<section class="panel ai-status ai-ok"><b>✅ ${tr('الذكاء الاصطناعي مفعّل','IA activée','AI is on')}</b><small>Groq · ${esc(window.SM_GROQ.model())}</small></section>`;
  return `<section class="panel ai-status"><b>⚪ ${tr('فعّل الذكاء الاصطناعي في 3 خطوات (مجاني)','Activez l’IA en 3 étapes (gratuit)','Turn on AI in 3 steps (free)')}</b>`+
   `<ol><li>${tr('أنشئ مفتاحاً مجانياً من الموقع أدناه','Créez une clé gratuite sur le site ci-dessous','Create a free key on the site below')}</li><li>${tr('الصقه في خانة «مفتاح Groq» بالأسفل','Collez-la dans « Clé Groq » ci-dessous','Paste it in the “Groq key” box below')}</li><li>${tr('اضغط «حفظ وتفعيل» ثم «اختبار»','Appuyez sur « Enregistrer » puis « Tester »','Tap “Save” then “Test”')}</li></ol>`+
   `<a class="primary-btn" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">${tr('إنشاء مفتاح Groq','Créer une clé Groq','Create a Groq key')} ↗</a>`+
   `<small>${tr('دون مفتاح تعمل أجوبة محدودة بدون إنترنت فقط.','Sans clé : réponses hors ligne limitées.','Without a key only limited offline answers work.')}</small></section>`;
 };
 window.smAiBadge=function(){const on=window.SM_GROQ&&window.SM_GROQ.enabled();return `<span class="status-dot" style="display:inline-block"></span> ${on?'Groq':tr('وضع دون اتصال','Hors ligne','Offline')}`};
 /* the old "demo / Groq server" wording */
 try{
  dict.ar.aiLimited='يعمل المساعد الذكي بمفتاح Groq المجاني. أدخله في الأعلى لتفعيل الإجابات الكاملة.';
  dict.fr.aiLimited='L’assistant utilise une clé Groq gratuite. Saisissez-la plus haut pour activer les réponses.';
  dict.en.aiLimited='The assistant uses a free Groq key. Enter it above to enable full answers.';
  dict.ar.aiDemo='لتفعيل الإجابات الذكية أدخل مفتاح Groq المجاني في أعلى هذه الصفحة.';
  dict.fr.aiDemo='Pour activer les réponses intelligentes, saisissez la clé Groq gratuite en haut de la page.';
  dict.en.aiDemo='To enable smart answers, enter your free Groq key at the top of this page.';}catch(e){}

 /* ---------- 4) Test bank: only what a student needs (no archive / PDF / admin / server panels) ---------- */
 ['externalExamLibraryPanel','examLibraryPanel','pdfReviewPanel','schoolAssessmentsArchivePanel','examArchivePanel','curriculumGovernancePanel','curriculumExamBuilderPanel','claudeContentDraftPanel'].forEach(n=>{if(typeof window[n]==='function')window[n]=()=>''});
 if(typeof window.testBankHomePage==='function'){
  const _tb=window.testBankHomePage;
  window.testBankHomePage=function(){return _tb().replace(/<details class="panel admin-sources"[\s\S]*?<\/details>/,'')};
 }

 /* ---------- 5) Navigation: 5 main entries + "More" ---------- */
 const PRIMARY=['home','exercises','tests','tutor','progress'];
 function buildNav(){
  const nav=document.getElementById('mainNav');if(!nav||nav.dataset.v19)return;nav.dataset.v19='1';
  const items=[...nav.querySelectorAll('.nav-item')];
  const main=PRIMARY.map(p=>items.find(b=>b.dataset.page===p)).filter(Boolean);
  const rest=items.filter(b=>!PRIMARY.includes(b.dataset.page));
  nav.textContent='';main.forEach(b=>nav.appendChild(b));
  const tog=document.createElement('button');tog.type='button';tog.className='nav-item nav-more-toggle';tog.id='navMoreToggle';
  const box=document.createElement('div');box.className='nav-more-box';box.id='navMoreBox';box.hidden=true;
  rest.forEach(b=>box.appendChild(b));
  tog.addEventListener('click',()=>{box.hidden=!box.hidden;syncMore()});
  nav.appendChild(tog);nav.appendChild(box);syncMore();
 }
 function syncMore(){
  const tog=document.getElementById('navMoreToggle'),box=document.getElementById('navMoreBox');if(!tog||!box)return;
  if(typeof page!=='undefined'&&box.querySelector('.nav-item[data-page="'+page+'"]'))box.hidden=false;
  tog.innerHTML='<span>⋯</span><span>'+tr('المزيد','Plus','More')+'</span><span class="chev">'+(box.hidden?'▾':'▴')+'</span>';
 }
 buildNav();
 if(typeof window.render==='function'){const _r=window.render;window.render=function(){const out=_r.apply(this,arguments);try{syncMore()}catch(e){}return out}}

 /* ---------- 6) Smart teacher: make sure its question pool is filled once the bank has loaded ---------- */
 const _go=window.go;
 if(typeof _go==='function'){window.go=function(p,f){if(p==='teacher'&&typeof loadHeavyData==='function'){try{loadHeavyData()}catch(e){}}return _go.apply(this,arguments)}}
})();
