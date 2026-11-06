/* SM SCHOOL AI — direct Groq tutor.
   The key is typed by the user inside the app and kept only in this device's localStorage.
   It is never bundled in the APK, never added to local backups, and never sent anywhere except api.groq.com. */
(function(){
 const KEY='smSchoolGroqKey',MODEL='smSchoolGroqModel',DEFAULT_MODEL='llama-3.3-70b-versatile',FALLBACK_MODEL='llama-3.1-8b-instant',BASE='https://api.groq.com/openai/v1';
 const store={get:k=>{try{return localStorage.getItem(k)||''}catch{return ''}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
 const L=()=>(typeof lang!=='undefined'?lang:'ar');
 const tr=(ar,fr,en)=>L()==='ar'?ar:L()==='fr'?fr:en;
 const say=m=>{if(typeof toast==='function')toast(m)};
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const enabled=()=>!!store.get(KEY);
 const model=()=>store.get(MODEL)||DEFAULT_MODEL;
 const LANGS={ar:'Arabic',fr:'French',en:'English'};

 function buildMessages(p){
  const langName=LANGS[p.language]||'Arabic';
  const common=`You are a careful, encouraging tutor for a student in Algeria. Grade: ${p.grade}. Subject: ${p.subject}. `+
   `Respond only in ${langName}. Adapt complexity to the grade. Never invent official curriculum claims, textbook page numbers, or ministry exam content. `+
   'Label generated material as practice, not official. If uncertain, state the uncertainty. Use age-appropriate language. '+
   `Observed learning context (may be incomplete): ${p.learning_context||'No recorded performance yet'}. Use it gently to prioritize explanations; never shame or label the learner.`;
  let task;
  if(p.task==='lesson')task='Teach the requested topic from first principles. Structure: learning objective, prerequisite idea, clear step-by-step explanation, one worked example, common misconception, short recap, and two self-check questions with answers separated at the end. Topic/request: '+p.message;
  else if(p.task==='practice')task='Create exactly 5 original practice questions for the requested topic, gradually increasing in difficulty. Include a mix of recall, application and reasoning where appropriate. Give a separate answer key with concise explanations after all questions. Avoid claiming alignment to a specific official lesson sequence. Topic/request: '+p.message;
  else task="Provide detailed formative feedback and a structured correction of the student's written answer: (1) overall assessment, (2) correct ideas, (3) missing or inaccurate ideas with reasons, (4) language, terminology and method errors when relevant, (5) a suggested rubric with an explicitly approximate score only when the task supports it, (6) a complete model answer, (7) two targeted improvement actions. Never claim the score is official or Ministry-approved. "+`Question or task: ${p.message}\nStudent answer: ${p.student_answer||''}`;
  return [{role:'system',content:common},{role:'user',content:task}];
 }

 function errMessage(status){
  if(status===401)return tr('مفتاح Groq غير صالح أو منتهي. أعيدي إدخاله.','Clé Groq invalide ou expirée.','Groq key is invalid or expired.');
  if(status===429)return tr('تم بلوغ حد Groq المؤقت. حاولي بعد قليل.','Limite Groq atteinte, réessayez plus tard.','Groq rate limit reached. Try again shortly.');
  if(status===404||status===400)return tr('النموذج غير متاح. غيّري اسم النموذج في الإعدادات.','Modèle indisponible. Changez le nom du modèle.','Model unavailable. Change the model name in settings.');
  return tr('تعذر الاتصال بـ Groq.','Connexion à Groq impossible.','Could not reach Groq.');
 }
 const reply=(status,body)=>{if(status>=400&&body&&body.detail)say('Groq: '+body.detail);return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})};

 async function ask(payload){
  const key=store.get(KEY);
  let r;
  try{
   r=await _fetch(BASE+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:model(),messages:buildMessages(payload),temperature:0.4,max_tokens:1800})});
  }catch{return reply(502,{detail:errMessage(0)})}
  if(!r.ok&&(r.status===400||r.status===404)&&model()!==FALLBACK_MODEL){try{r=await _fetch(BASE+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:FALLBACK_MODEL,messages:buildMessages(payload),temperature:0.4,max_tokens:1800})})}catch{return reply(502,{detail:errMessage(0)})}}
   if(!r.ok){let extra='';try{const j=await r.clone().json();extra=(j&&j.error&&j.error.message)||''}catch{}return reply(r.status===401?401:502,{detail:errMessage(r.status)+(extra?' ['+String(extra).slice(0,160)+']':'')})}
  try{
   const d=await r.json();const answer=d.choices[0].message.content;
   if(typeof answer!=='string'||!answer.trim())throw 0;
   return reply(200,{mode:'groq',task:payload.task,answer:answer.trim(),remaining:null});
  }catch{return reply(502,{detail:errMessage(0)})}
 }

 // Route the app's existing tutor calls to Groq when a key is saved; everything else is untouched.
 const _fetch=window.fetch.bind(window);
 window.fetch=function(input,init){
  try{
   const url=typeof input==='string'?input:(input&&input.url)||'';
   if(enabled()&&/\/api\/v1\/ai\/(tutor|chat)$/.test(url.split('?')[0])&&init&&init.body){
    const payload=JSON.parse(init.body);
    if(/\/chat$/.test(url.split('?')[0]))payload.task='lesson';
    return ask(payload);
   }
  }catch{}
  return _fetch(input,init);
 };

 function panel(){
  const on=enabled();
  return `<details class="panel tutor-server" id="groqPanel" ${on?'':'open'}><summary><b>⚡ ${tr('مفتاح Groq (المعلّم الذكي مباشرة)','Clé Groq (tuteur IA direct)','Groq key (direct AI tutor)')}</b> <small>${on?'✅ '+tr('مفعّل','activé','active'):'⚪ '+tr('غير مفعّل','inactif','inactive')}</small></summary>`+
   `<p><small>${tr('أدخلي مفتاحك ثم اضغطي حفظ ليعمل المعلّم الذكي دون خادم. يُحفظ المفتاح محلياً على هذا الجهاز ولا يدخل النسخ الاحتياطية. عند التفعيل يُرسل السؤال وملخص الأداء إلى Groq مباشرة. لا ترسلي مفتاحك لأي شخص.','Saisissez votre clé puis enregistrez : le tuteur fonctionne sans serveur. La clé reste dans le stockage local de cet appareil. La question et le résumé des résultats sont envoyés directement à Groq.','Enter your key and save to run the tutor without a server. The key stays in this device’s local storage. The question and learning summary are sent directly to Groq.')}</small></p>`+
   `<div class="toolbar"><input id="groqKeyInput" type="password" dir="ltr" autocomplete="off" placeholder="gsk_..." value="${on?'••••••••••••':''}"><button class="primary-btn" type="button" onclick="saveGroqKey()">${tr('حفظ وتفعيل','Enregistrer','Save & enable')}</button></div>`+
   `<div class="toolbar"><input id="groqModelInput" dir="ltr" placeholder="${DEFAULT_MODEL}" value="${esc(store.get(MODEL))}"><button class="secondary-btn" type="button" onclick="testGroqKey()">${tr('اختبار','Tester','Test')}</button><button class="secondary-btn" type="button" onclick="removeGroqKey()">${tr('حذف المفتاح','Supprimer','Remove key')}</button></div></details>`;
 }
 const _panel=typeof tutorServerPanel==='function'?tutorServerPanel:()=>'';
 window.tutorServerPanel=function(){return _panel()+panel()};

 window.saveGroqKey=function(){
  const k=(document.getElementById('groqKeyInput')?.value||'').trim(),m=(document.getElementById('groqModelInput')?.value||'').trim();
  if(k&&!/^•+$/.test(k)){
   if(!/^gsk_[A-Za-z0-9_\-]{20,}$/.test(k)){say(tr('صيغة المفتاح غير صحيحة (يبدأ بـ gsk_)','Format de clé invalide (gsk_...)','Invalid key format (starts with gsk_)'));return}
   if(!store.set(KEY,k)){say(tr('تعذر حفظ المفتاح','Enregistrement impossible','Could not save key'));return}
  }else if(!enabled()){say(tr('أدخلي المفتاح أولاً','Saisissez la clé','Enter the key first'));return}
  if(m)store.set(MODEL,m);else store.del(MODEL);
  say(tr('تم حفظ المفتاح وتفعيل Groq ✓','Clé enregistrée, Groq activé ✓','Key saved, Groq enabled ✓'));
  const s=document.querySelector('#groqPanel summary small');if(s)s.textContent='✅ '+tr('مفعّل','activé','active');
  const i=document.getElementById('groqKeyInput');if(i)i.value='••••••••••••';
 };
 window.removeGroqKey=function(){
  store.del(KEY);store.del(MODEL);
  const i=document.getElementById('groqKeyInput');if(i)i.value='';
  const s=document.querySelector('#groqPanel summary small');if(s)s.textContent='⚪ '+tr('غير مفعّل','inactif','inactive');
  say(tr('تم حذف المفتاح','Clé supprimée','Key removed'));
 };
 window.testGroqKey=async function(){
  const typed=(document.getElementById('groqKeyInput')?.value||'').trim();
  const key=(typed&&!/^•+$/.test(typed))?typed:store.get(KEY);
  if(!key){say(tr('أدخلي المفتاح أولاً','Saisissez la clé','Enter the key first'));return}
  const m=(document.getElementById('groqModelInput')?.value||'').trim()||model();
  try{
   const r=await _fetch(BASE+'/models',{headers:{'Authorization':'Bearer '+key}});
   if(!r.ok){say(errMessage(r.status));return}
   const d=await r.json(),ids=(d.data||[]).map(x=>x.id);
   say(ids.includes(m)?tr('المفتاح يعمل والنموذج متاح ✓','Clé valide, modèle disponible ✓','Key works, model available ✓'):tr('المفتاح يعمل لكن النموذج غير موجود — غيّري اسمه','Clé valide mais modèle introuvable','Key works but the model was not found — change its name'));
  }catch{say(errMessage(0))}
 };
 window.SM_GROQ={enabled,model,buildMessages};
})();
