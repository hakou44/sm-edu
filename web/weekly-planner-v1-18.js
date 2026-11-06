/* SM SCHOOL AI v1.18.1 — competency-based pedagogical study sessions. */
(function(){
 'use strict';
 const KEY='smSchoolWeeklyPlanV118';
 const STAGES=[['تهيئة واسترجاع المكتسبات',10],['بناء التعلم والاكتشاف',35],['التدريب والتطبيق الموجّه',25],['الإدماج وحل وضعية',20],['التقويم التكويني والمعالجة',10]];
 const makeStages=total=>{const n=Math.max(5,Math.round(Number(total)||15));let used=0;return STAGES.map(([label,pct],i)=>{const mins=i===STAGES.length-1?n-used:Math.max(1,Math.floor(n*pct/100));used+=mins;return {label,minutes:mins,done:false}})};
 window.smSchoolPedagogicalSessionV181={makeStages,stageLabels:STAGES.map(x=>x[0])};
 const subjects=['الرياضيات','اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية','التاريخ والجغرافيا','التربية الإسلامية','الإعلام الآلي'];
 const days=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const learner=()=>{try{return localStorage.getItem('smSchoolActiveLearner')||'default'}catch(_){return'default'}};
 const read=()=>{try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');return all[learner()]||{minutes:90,items:[]}}catch(_){return{minutes:90,items:[]}}};
 const write=x=>{const all=JSON.parse(localStorage.getItem(KEY)||'{}');all[learner()]=x;localStorage.setItem(KEY,JSON.stringify(all))};
 function render(){
  const mount=document.getElementById('pageContent');
  if(!mount||!document.querySelector('.sc-panel')||document.getElementById('weeklyPlannerV118'))return;
  const panel=document.createElement('section');panel.className='panel sc-panel';panel.id='weeklyPlannerV118';
  panel.innerHTML=`<h3>🗓️ مخطط المراجعة الأسبوعي الذكي</h3><p>أنشئ خطة منزلية قابلة للتعديل حسب وقت التلميذ وأولوياته. الخطة مساعدة تنظيمية وليست جدولاً مدرسياً رسمياً.</p><div class="toolbar"><label>الوقت المتاح يومياً بالدقائق<input id="wpMinutes" type="number" min="15" max="360" step="15" value="90"></label><label>المادة<select id="wpSubject">${subjects.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label>الأولوية<select id="wpPriority"><option value="3">تحتاج دعماً كبيراً</option><option value="2" selected>متوسطة</option><option value="1">جيدة / مراجعة</option></select></label><label>اليوم<select id="wpDay">${days.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></label></div><div class="toolbar"><button type="button" class="primary-btn" id="wpAdd">إضافة حصة</button><button type="button" class="secondary-btn" id="wpGenerate">اقتراح توزيع أسبوعي</button></div><div id="wpStats" class="notice" aria-live="polite"></div><div id="wpList"></div>`;
  mount.appendChild(panel);
  const minutes=panel.querySelector('#wpMinutes'),subject=panel.querySelector('#wpSubject'),priority=panel.querySelector('#wpPriority'),day=panel.querySelector('#wpDay'),list=panel.querySelector('#wpList'),stats=panel.querySelector('#wpStats');
  function show(){const p=read();minutes.value=p.minutes||90;list.innerHTML=p.items.length?p.items.map((it,i)=>{if(!Array.isArray(it.stages)||it.stages.length!==5)it.stages=makeStages(it.minutes);const completed=it.stages.filter(x=>x.done).length;return `<article class="notice" style="margin:.5rem 0"><label><input type="checkbox" data-done="${i}" ${it.done?'checked':''}> <strong>${esc(days[it.day])} — ${esc(it.subject)}</strong></label><p>${it.minutes} دقيقة · ${it.priority===3?'أولوية مرتفعة':it.priority===2?'أولوية متوسطة':'مراجعة'} · مراحل التعلم: ${completed}/5</p><details><summary>المسار البيداغوجي للحصة</summary><ol>${it.stages.map((st,j)=>`<li><label><input type="checkbox" data-stage="${i}:${j}" ${st.done?'checked':''}> ${esc(st.label)} — ${st.minutes} د</label></li>`).join('')}</ol></details><button type="button" data-remove="${i}" class="secondary-btn">حذف</button></article>`}).join(''):'<p>لم تضف حصصاً بعد. ابدأ بإضافة حصة أو اطلب اقتراح توزيع.</p>';const done=p.items.filter(x=>x.done).length,total=p.items.length;stats.textContent=`إنجاز الأسبوع: ${done} من ${total} حصص · ${p.items.reduce((a,x)=>a+x.minutes,0)} دقيقة مخططة`;}
  panel.querySelector('#wpAdd').addEventListener('click',()=>{const p=read();p.minutes=Math.max(15,Math.min(360,Number(minutes.value)||90));const duration=Math.max(15,Math.round(p.minutes/15)*15);p.items.push({subject:subject.value,priority:Number(priority.value),day:Number(day.value),minutes:duration,done:false,stages:makeStages(duration)});write(p);show()});
  panel.querySelector('#wpGenerate').addEventListener('click',()=>{const p=read(),mins=Math.max(15,Math.min(360,Number(minutes.value)||90));p.minutes=mins;const chosen=[...new Set([subject.value,...subjects.filter(s=>s!==subject.value)])].slice(0,5);const perSession=Math.max(15,Math.round(mins/5/5)*5);p.items=chosen.map((s,i)=>({subject:s,priority:s===subject.value?3:2,day:i%5,minutes:perSession,done:false,stages:makeStages(perSession)}));write(p);show()});
  list.addEventListener('change',e=>{if(e.target.dataset.done!==undefined){const p=read();p.items[Number(e.target.dataset.done)].done=e.target.checked;write(p);show();return}if(e.target.dataset.stage!==undefined){const [i,j]=e.target.dataset.stage.split(':').map(Number);const p=read();if(p.items[i]&&p.items[i].stages&&p.items[i].stages[j]){p.items[i].stages[j].done=e.target.checked;write(p);show()}}});
  list.addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){const p=read();p.items.splice(Number(e.target.dataset.remove),1);write(p);show()}});
  show();
 }
 const previous=window.studyCenterRender;
 if(typeof previous==='function')window.studyCenterRender=function(){previous.apply(this,arguments);render()};
 window.smSchoolWeeklyPlanner={render,storageKey:KEY};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
