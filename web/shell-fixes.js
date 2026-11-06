/* SM SCHOOL AI — v1.18.2 patch: native back button, AI-enabled smart teacher, exercise-bank fallback. */
(function(){
 const L=()=>(typeof lang!=='undefined'?lang:'ar');
 const tr=(ar,fr,en)=>L()==='ar'?ar:L()==='fr'?fr:en;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // 1) Hardware back button (Capacitor App plugin): one level back via the app's own handler.
 try{
  const cap=window.Capacitor||{};
  const A=(cap.Plugins&&cap.Plugins.App)||(typeof cap.registerPlugin==='function'?cap.registerPlugin('App'):null);
  if(A&&A.addListener)A.addListener('backButton',()=>{if(typeof handleAppBack==='function')handleAppBack()});
 }catch(e){}

 // 2) Smart teacher: fall back to the exercise bank when the built-in pool is empty for a subject.
 const _pool=typeof smartTeacherPool==='function'?smartTeacherPool:()=>[];
 window.smartTeacherPool=function(subject){
  const base=_pool(subject);if(base&&base.length)return base;
  const recs=(typeof exerciseBankRecords!=='undefined'?exerciseBankRecords:[])||[];
  return recs.filter(r=>r.grade===grade&&r.subject===subject&&Array.isArray(r.choices)&&r.choices.length>1&&Number.isInteger(r.answer_index))
   .slice(0,12).map(r=>({q:r.question,choices:r.choices,a:r.answer_index,why:r.explanation||''}));
 };
 // make sure the bank is loaded when the teacher page opens
 const _stp=typeof smartTeacherPage==='function'?smartTeacherPage:()=>'';
 window.smartTeacherPage=function(){
  try{if(typeof otBank==='function')otBank().catch(()=>{})}catch(e){}
  return aiBox()+_stp();
 };

 // 3) AI box on the smart-teacher page (uses the in-app Groq key).
 function aiBox(){
  const on=window.SM_GROQ&&window.SM_GROQ.enabled();
  const hasServer=false;
  const setup=(!on&&!hasServer)?`<div class="notice">⚡ ${tr('لتفعيل الشرح بالذكاء الاصطناعي: افتحي صفحة «المساعد الذكي» ← «مفتاح Groq» وأدخلي المفتاح.','Pour activer l’IA : page « Assistant IA » → « Clé Groq ».','To enable AI explanations: open the AI assistant page → “Groq key” and enter your key.')} <button class="secondary-btn" type="button" onclick="go('tutor')">${tr('فتح الإعداد','Ouvrir','Open setup')}</button></div>`:'';
  return `<section class="panel" id="stAiBox"><h3>🤖 ${tr('اسألي المعلم الذكي','Demandez à l’enseignant IA','Ask the AI teacher')}</h3>${setup}`+
   `<div class="toolbar"><input id="stAiTopic" placeholder="${tr('اكتبي الدرس أو السؤال…','Saisissez la leçon ou la question…','Type a lesson or question…')}" autocomplete="off"></div>`+
   `<div class="toolbar"><button class="primary-btn" type="button" onclick="stAiAsk('lesson')">${tr('اشرح الدرس','Expliquer','Explain')}</button><button class="secondary-btn" type="button" onclick="stAiAsk('practice')">${tr('5 تمارين','5 exercices','5 exercises')}</button></div>`+
   `<div id="stAiOut" aria-live="polite" style="white-space:pre-wrap"></div></section>`;
 }
 window.stAiAsk=async function(task){
  const out=document.getElementById('stAiOut'),topic=(document.getElementById('stAiTopic')?.value||'').trim();
  if(!out)return;if(!topic){out.textContent=tr('اكتبي الدرس أو السؤال أولاً.','Saisissez d’abord un sujet.','Enter a topic first.');return}
  const subj=document.getElementById('smartTeacherSubject')?.value||'عام';
  out.textContent=tr('جارٍ التفكير…','Réflexion…','Thinking…');
  try{
   const base=typeof apiBase==='function'?apiBase():'';
   const r=await fetch(`${base}/api/v1/ai/tutor`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,message:topic,student_answer:'',language:L(),grade,subject:subj,learning_context:''})});
   let d;try{d=await r.json()}catch{throw new Error(tr('الذكاء الاصطناعي غير مفعّل. أدخلي مفتاح Groq في صفحة المساعد الذكي.','IA non activée : saisissez la clé Groq dans l’assistant IA.','AI is not enabled. Enter your Groq key in the AI assistant page.'))}
   if(!r.ok)throw new Error(typeof d.detail==='string'?d.detail:'AI error');
   out.textContent=d.answer||'';
  }catch(e){out.textContent=e.message}
 };
})();
