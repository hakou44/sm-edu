/* SM SCHOOL AI v1.9.0 — private, learner-scoped longitudinal learning memory. */
const LEARNING_MEMORY_KEY='smSchoolLearningMemory';
function learningMemoryRead(){
 try{const rows=JSON.parse(localStorage.getItem(LEARNING_MEMORY_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}
}
function learningMemoryEvidence(learnerId){
 const id=String(learnerId||'default');
 const matches=x=>x&&((x.learnerId===id)||(!x.learnerId&&id==='default'));
 const progress=(typeof getProgress==='function'?getProgress():[]).filter(matches);
 const errors=(()=>{try{return JSON.parse(localStorage.getItem('smSchoolLearningErrors')||'[]').filter(matches)}catch{return []}})();
 const reasoning=(()=>{try{return JSON.parse(localStorage.getItem('smSchoolReasoningRecords')||'[]').filter(matches)}catch{return []}})();
 const subjects={};
 progress.forEach(row=>{
  const subject=String(row.subject||'').trim();if(!subject)return;
  const a=subjects[subject]||(subjects[subject]={subject,correct:0,total:0,activities:0,firstDate:'',lastDate:''});
  const total=Math.max(0,Number(row.total)||0),correct=Math.max(0,Math.min(total,Number(row.correct)||0));
  a.total+=total;a.correct+=correct;a.activities++;
  const date=String(row.date||'').slice(0,10);
  if(date&&(!a.firstDate||date<a.firstDate))a.firstDate=date;
  if(date&&(!a.lastDate||date>a.lastDate))a.lastDate=date;
 });
 const subjectRows=Object.values(subjects).map(x=>({...x,accuracy:x.total?Math.round(x.correct/x.total*100):null,
  evidence:x.total>=20?'strong':x.total>=5?'moderate':'limited'})).sort((a,b)=>(a.accuracy??101)-(b.accuracy??101));
 const mistakeCounts={};
 errors.forEach(x=>{const key=String(x.topic||x.question||x.skill||'').trim().replace(/\s+/g,' ').slice(0,100);if(!key)return;mistakeCounts[key]=(mistakeCounts[key]||0)+1});
 const recurringMistakes=Object.entries(mistakeCounts).filter(([,n])=>n>=2).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,8);
 const reasoningCounts={};reasoning.forEach(x=>{const key=String(x.subject||'').trim();if(key)reasoningCounts[key]=(reasoningCounts[key]||0)+1});
 const total=progress.reduce((n,x)=>n+(Number(x.total)||0),0),correct=progress.reduce((n,x)=>n+Math.max(0,Math.min(Number(x.total)||0,Number(x.correct)||0)),0);
 const dates=progress.map(x=>String(x.date||'').slice(0,10)).filter(Boolean).sort();
 return {learnerId:id,activities:progress.length,totalAnswers:total,overallAccuracy:total?Math.round(correct/total*100):null,
  firstActivity:dates[0]||null,lastActivity:dates[dates.length-1]||null,subjects:subjectRows,recurringMistakes,
  reasoningEntries:reasoning.length,reasoningBySubject:reasoningCounts,generatedAt:new Date().toISOString()};
}
function learningMemorySnapshot(learnerId,now=new Date()){
 const id=String(learnerId||'default'),e=learningMemoryEvidence(id);
 const snapshots=learningMemoryRead().filter(x=>x.learnerId===id);
 const snapshot={learnerId:id,at:now.toISOString(),activities:e.activities,totalAnswers:e.totalAnswers,
  overallAccuracy:e.overallAccuracy,subjects:e.subjects.map(x=>({subject:x.subject,accuracy:x.accuracy,total:x.total,evidence:x.evidence})),
  recurringMistakes:e.recurringMistakes,reasoningEntries:e.reasoningEntries};
 const all=learningMemoryRead().filter(x=>x.learnerId!==id);
 const sameDay=snapshots.filter(x=>String(x.at||'').slice(0,10)!==now.toISOString().slice(0,10));
 const learnerHistory=[...sameDay,snapshot].sort((a,b)=>String(a.at).localeCompare(String(b.at))).slice(-52);
 all.push(...learnerHistory);
 localStorage.setItem(LEARNING_MEMORY_KEY,JSON.stringify(all.slice(-520)));
 return snapshot;
}
function learningMemoryPanel(learner){
 const id=learner?.id||'default',e=learningMemoryEvidence(id),ar=typeof lang!=='undefined'&&lang==='ar',fr=typeof lang!=='undefined'&&lang==='fr';
 const L=(a,f,en)=>ar?a:fr?f:en,esc=x=>typeof escapeReviewText==='function'?escapeReviewText(String(x??'')):String(x??'');
 const history=learningMemoryRead().filter(x=>x.learnerId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 const saved=history[0];
 const subjectHtml=e.subjects.slice(0,6).map(x=>`<div class="sp-subject"><div><b>${esc(x.subject)}</b><small>${x.total} ${L('إجابة مسجلة','réponses','answers')} · ${x.evidence==='strong'?L('دليل قوي','preuve forte','strong evidence'):x.evidence==='moderate'?L('دليل متوسط','preuve modérée','moderate evidence'):L('بيانات محدودة','données limitées','limited evidence')}</small></div><strong>${x.accuracy===null?'—':x.accuracy+'%'}</strong></div>`).join('');
 const mistakes=e.recurringMistakes.map(x=>`<li>${esc(x.label)} <small>(${x.count} ${L('مرات','fois','times')})</small></li>`).join('');
 return `<section class="panel learning-memory"><div class="learning-meta"><h3>🧠 ${L('الذاكرة التعليمية طويلة المدى','Mémoire pédagogique à long terme','Long-term learning memory')}</h3><span class="pill">v1.9.0</span></div>
 <p>${L('ملخص تراكمي مشتق من نتائج هذا التلميذ فقط. تُحفظ البيانات على هذا الجهاز ولا تُرسل إلى أي خدمة خارجية.','Synthèse longitudinale calculée uniquement à partir des résultats de cet élève. Stockée sur cet appareil.','A longitudinal summary derived only from this learner’s recorded results. Stored on this device.')}</p>
 <div class="stats-grid"><div class="stat-card"><b>${e.activities}</b><small>${L('نشاطاً تاريخياً','activités','recorded activities')}</small></div><div class="stat-card"><b>${e.totalAnswers}</b><small>${L('إجابة','réponses','answers')}</small></div><div class="stat-card"><b>${e.overallAccuracy===null?'—':e.overallAccuracy+'%'}</b><small>${L('الدقة التراكمية','précision cumulée','long-term accuracy')}</small></div></div>
 <h4>${L('ملف الذاكرة حسب المادة','Mémoire par matière','Subject memory')}</h4>${subjectHtml||`<p class="sp-muted">${L('لا توجد بيانات كافية لبناء ذاكرة تعليمية بعد.','Pas encore assez de données.','Not enough learning history yet.')}</p>`}
 <h4>${L('الأخطاء المتكررة المسجلة','Erreurs récurrentes enregistrées','Recorded recurring mistakes')}</h4>${mistakes?`<ul>${mistakes}</ul>`:`<p class="sp-muted">${L('لم يُكتشف تكرار موثق بعد. لا يعني ذلك عدم وجود صعوبات.','Aucune répétition documentée pour le moment.','No repeated recorded error found yet; this does not prove there are no difficulties.')}</p>`}
 <p class="sp-muted">${L('خطوات التفكير المكتوبة','Raisonnements écrits','Written reasoning entries')}: ${e.reasoningEntries}. ${e.firstActivity?L('أول نشاط:','Premier exercice :','First activity:')+' '+esc(e.firstActivity):''} ${e.lastActivity?L('آخر نشاط:','Dernière activité :','Latest activity:')+' '+esc(e.lastActivity):''}</p>
 <div class="sp-actions"><button class="primary-btn" onclick="learningMemorySaveActive()">${L('تحديث لقطة الذاكرة','Actualiser la mémoire','Save memory snapshot')}</button></div>
 <small class="sp-footnote">${saved?L('آخر لقطة محفوظة:','Dernière mémoire sauvegardée :','Last saved snapshot:')+' '+esc(String(saved.at).slice(0,16).replace('T',' ')):L('لم تُحفظ لقطة بعد. الملخص أعلاه يُحسب مباشرة من السجل المحلي.','Aucun instantané sauvegardé. La synthèse est calculée depuis l’historique local.','No snapshot saved yet. The summary above is calculated from local history.')}</small>
 </section>`;
}
function learningMemorySaveActive(){
 const learner=typeof activeLearner==='function'?activeLearner():{id:'default'};
 try{learningMemorySnapshot(learner.id);if(typeof toast==='function')toast(typeof lang!=='undefined'&&lang==='ar'?'تم تحديث الذاكرة التعليمية محلياً':'Learning memory snapshot saved locally');if(typeof render==='function')render();return true}catch(e){if(typeof toast==='function')toast('Could not save learning memory');return false}
}
