/* SM SCHOOL AI v2.0.0 — professional pass. Loaded last; refines earlier scripts.
   1) exercise-bank quality filter + verified generated maths (3AP / 2AM / 1AS)
   2) smart teacher that works for every subject that has questions
   3) AI assistant that always answers (local mode) and can use Groq or Groq keys
   4) clean test bank (no archive / PDF / admin panels) + Tasnim documents card
*/
(function(){
 'use strict';
 const L=()=>(typeof lang!=='undefined'?lang:'ar');
 const tr=(ar,fr,en)=>L()==='ar'?ar:L()==='fr'?fr:en;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const say=m=>{if(typeof toast==='function')toast(m)};
 const store={get:k=>{try{return localStorage.getItem(k)||''}catch{return ''}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}},del:k=>{try{localStorage.removeItem(k)}catch{}}};

 /* ================= 1) QUALITY FILTER ================= */
 const GENERIC_Q=[/كيف تتحقق من جودة الحل/,/ما الخطوة الأنسب قبل صياغة الإجابة/,/في نشاط تطبيقي في مادة/,/بعد إنجاز تمرين/,/ما أفضل طريقة لمراجعة/];
 const GENERIC_C=[/الاكتفاء بأول نتيجة/,/تجاهل المعطيات/,/كتابة أي إجابة دون تحليل/,/حذف التبرير/,/الاعتماد على التخمين/];
 const isGeneric=r=>GENERIC_Q.some(p=>p.test(r.question||''))||(r.choices||[]).some(c=>GENERIC_C.some(p=>p.test(c)));

 /* deterministic RNG so generated ids/questions are stable between launches */
 function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
 const mcq=(R,correct,wrongs)=>{ // 4 unique options, deterministic order
  const set=[String(correct)];wrongs.forEach(w=>{w=String(w);if(!set.includes(w))set.push(w)});
  const cs=String(correct),nm=cs.match(/^([−-]?\d+(?:\.\d+)?)(.*)$/);
  let n=1;while(set.length<4){const w=nm?fmt(+(nm[1].replace('−','-'))+n*(n%2?1:-2))+nm[2]:cs+' ('+n+')';if(!set.includes(w))set.push(w);n++}
  const opts=set.slice(0,4).map(v=>({v,k:R()})).sort((a,b)=>a.k-b.k).map(x=>x.v);
  return {choices:opts,answer_index:opts.indexOf(String(correct))};
 };
 const ri=(R,a,b)=>a+Math.floor(R()*(b-a+1));
 const fmt=n=>String(n).replace('-','−');

 /* every generator returns {topic,lesson,diff,q,correct,wrong[],steps[],why} and is verified by construction */
 const GEN={
  'الثالثة ابتدائي':[
   R=>{const a=ri(R,120,640),b=ri(R,115,349);return{topic:'الأعداد والحساب',lesson:'الجمع',diff:'مبتدئ',q:`احسب: ${a} + ${b} = ؟`,correct:a+b,wrong:[a+b+10,a+b-10,a+b+100],steps:['نجمع الآحاد ثم العشرات ثم المئات.',`${a} + ${b} = ${a+b}`],why:`مجموع ${a} و${b} هو ${a+b}.`}},
   R=>{const b=ri(R,112,389),a=b+ri(R,120,450);return{topic:'الأعداد والحساب',lesson:'الطرح',diff:'مبتدئ',q:`احسب: ${a} − ${b} = ؟`,correct:a-b,wrong:[a-b+10,a-b-10,a+b],steps:['نبدأ بالآحاد وننتبه إلى الاستلاف.',`${a} − ${b} = ${a-b}`],why:`الفرق بين ${a} و${b} هو ${a-b}.`}},
   R=>{const a=ri(R,6,9),b=ri(R,6,9);return{topic:'الأعداد والحساب',lesson:'الضرب',diff:'متوسط',q:`ما ناتج ${a} × ${b}؟`,correct:a*b,wrong:[a*b+a,a*b-b,a*b+1],steps:[`نستعمل جدول الضرب: ${a} × ${b} = ${a*b}`],why:`${a} × ${b} = ${a*b}.`}},
   R=>{const d=ri(R,3,9),k=ri(R,4,9);return{topic:'الأعداد والحساب',lesson:'القسمة',diff:'متوسط',q:`قسّم ${d*k} على ${d}: ${d*k} ÷ ${d} = ؟`,correct:k,wrong:[k+1,k-1,d],steps:[`نبحث عن العدد الذي نضربه في ${d} فنجد ${d*k}.`,`${d} × ${k} = ${d*k}`],why:`${d*k} ÷ ${d} = ${k}.`}},
   R=>{const L1=ri(R,12,40),W=ri(R,5,L1-2);return{topic:'الهندسة والقياس',lesson:'محيط المستطيل',diff:'متوسط',q:`مستطيل طوله ${L1} سم وعرضه ${W} سم. ما محيطه؟`,correct:2*(L1+W)+' سم',wrong:[(L1*W)+' سم',(L1+W)+' سم',(2*L1+W)+' سم'],steps:['المحيط = (الطول + العرض) × 2',`(${L1} + ${W}) × 2 = ${2*(L1+W)}`],why:'محيط المستطيل = (الطول + العرض) × 2.'}},
   R=>{const p=ri(R,15,60),n=ri(R,3,9);return{topic:'حل مسائل',lesson:'مسألة ضرب',diff:'متقدم',q:`ثمن القلم الواحد ${p} دج. ما ثمن ${n} أقلام؟`,correct:p*n+' دج',wrong:[(p+n)+' دج',(p*n+p)+' دج',(p*(n-1))+' دج'],steps:['ثمن عدة أقلام = ثمن القلم × عددها',`${p} × ${n} = ${p*n}`],why:`${p} × ${n} = ${p*n} دج.`}}
  ],
  'الثانية متوسط':[
   R=>{const a=ri(R,2,15);let b=ri(R,2,15);if(b===a)b=a+1;return{topic:'الأعداد النسبية',lesson:'جمع الأعداد النسبية',diff:'متوسط',q:`احسب: (−${a}) + (+${b}) = ؟`,correct:fmt(b-a),wrong:[fmt(a+b),fmt(a-b),fmt(-(a+b))],steps:['عددان بإشارتين مختلفتين: نطرح القيمتين المطلقتين ونأخذ إشارة الأكبر.',`${b} − ${a} = ${b-a}`],why:`(−${a}) + (+${b}) = ${fmt(b-a)}.`}},
   R=>{const x=ri(R,2,12),a=ri(R,2,9),b=ri(R,1,15);return{topic:'المعادلات',lesson:'معادلة من الدرجة الأولى',diff:'متوسط',q:`حلّ المعادلة: ${a}x + ${b} = ${a*x+b}`,correct:'x = '+x,wrong:['x = '+(x+1),'x = '+(x-1),'x = '+(a*x+b)],steps:[`${a}x = ${a*x+b} − ${b} = ${a*x}`,`x = ${a*x} ÷ ${a} = ${x}`],why:`x = ${x}.`}},
   R=>{const d=ri(R,4,12),a=ri(R,1,d-2),b=ri(R,1,d-a-1);return{topic:'الكسور',lesson:'جمع كسرين لهما نفس المقام',diff:'مبتدئ',q:`احسب: ${a}/${d} + ${b}/${d} = ؟`,correct:`${a+b}/${d}`,wrong:[`${a+b}/${2*d}`,`${a*b}/${d}`,`${a+b+1}/${d}`],steps:['عند تساوي المقامين نجمع البسطين ونُبقي المقام.',`(${a} + ${b})/${d} = ${a+b}/${d}`],why:`مجموع الكسرين هو ${a+b}/${d}.`}},
   R=>{const t=[[3,4,5],[5,12,13],[6,8,10],[8,15,17]][ri(R,0,3)];return{topic:'الهندسة',lesson:'نظرية فيثاغورس',diff:'متقدم',q:`مثلث قائم ضلعاه القائمان ${t[0]} سم و${t[1]} سم. ما طول الوتر؟`,correct:t[2]+' سم',wrong:[(t[0]+t[1])+' سم',(t[2]+1)+' سم',(t[1]-t[0])+' سم'],steps:['الوتر² = مربع الضلع الأول + مربع الضلع الثاني',`${t[0]}² + ${t[1]}² = ${t[0]**2+t[1]**2} = ${t[2]}²`],why:`الوتر = ${t[2]} سم.`}},
   R=>{const p=[10,20,25,50][ri(R,0,3)],n=ri(R,2,12)*20;return{topic:'النسبة المئوية',lesson:'حساب نسبة مئوية',diff:'متوسط',q:`احسب ${p}% من ${n}.`,correct:n*p/100,wrong:[n*p/100+p,n/p,n-p],steps:[`${p}% من ${n} = ${n} × ${p} ÷ 100`,`= ${n*p/100}`],why:`${p}% من ${n} يساوي ${n*p/100}.`}},
   R=>{const b=ri(R,4,20)*2,h=ri(R,3,15);return{topic:'الهندسة',lesson:'مساحة المثلث',diff:'متوسط',q:`مثلث قاعدته ${b} سم وارتفاعه ${h} سم. ما مساحته؟`,correct:(b*h/2)+' سم²',wrong:[(b*h)+' سم²',(b+h)+' سم²',(b*h/2+b)+' سم²'],steps:['المساحة = (القاعدة × الارتفاع) ÷ 2',`(${b} × ${h}) ÷ 2 = ${b*h/2}`],why:`مساحة المثلث = ${b*h/2} سم².`}}
  ],
  'الأولى ثانوي':[
   R=>{let r1=ri(R,-6,6)||3,r2=ri(R,-6,6)||-2;if(Math.abs(r1)===Math.abs(r2))r2=r1>0?r1+2:r1-2;const s=r1+r2,p=r1*r2;const eq=`x² ${s?((-s>0?'+ ':'− ')+Math.abs(s)+'x '):''}${p?((p>0?'+ ':'− ')+Math.abs(p)):''} = 0`.replace('  ',' ');return{topic:'المعادلات من الدرجة الثانية',lesson:'حل معادلة من الدرجة الثانية',diff:'متقدم',q:`ما حلّا المعادلة: ${eq} ؟`,correct:`${fmt(Math.min(r1,r2))} و ${fmt(Math.max(r1,r2))}`,wrong:[`${fmt(-Math.max(r1,r2))} و ${fmt(-Math.min(r1,r2))}`,`${fmt(r1+1)} و ${fmt(r2+1)}`,`${fmt(r1)} و ${fmt(-r2)}`],steps:[`المجموع = ${s} والجداء = ${p}`,`الحلان: ${fmt(Math.min(r1,r2))} و ${fmt(Math.max(r1,r2))}`],why:`يتحقق ${r1}+${r2} = ${s} و ${r1}×${r2} = ${p}.`}},
   R=>{const a=ri(R,-5,7);const fa=a===0?1:a;return{topic:'الدوال',lesson:'مجموعة التعريف',diff:'متوسط',q:`ما مجموعة تعريف الدالة f(x) = 1/(x ${fa>0?'−':'+'} ${Math.abs(fa)}) ؟`,correct:`ℝ ∖ {${fa}}`,wrong:[`ℝ ∖ {${-fa}}`,'ℝ',`ℝ ∖ {0}`],steps:['المقام لا ينعدم.',`x ${fa>0?'−':'+'} ${Math.abs(fa)} = 0 ⇔ x = ${fa}`],why:`يُستثنى العدد ${fa} من مجموعة التعريف.`}},
   R=>{const m=ri(R,-4,5)||2,p=ri(R,-6,8),k=ri(R,-3,6);const v=m*k+p;return{topic:'الدوال',lesson:'الدالة التآلفية',diff:'مبتدئ',q:`إذا كانت f(x) = ${m}x ${p>=0?'+':'−'} ${Math.abs(p)} فما قيمة f(${k}) ؟`,correct:fmt(v),wrong:[fmt(v+m),fmt(v-p),fmt(m+p+k)],steps:[`f(${k}) = ${m}×(${k}) ${p>=0?'+':'−'} ${Math.abs(p)}`,`= ${fmt(v)}`],why:`f(${k}) = ${fmt(v)}.`}},
   R=>{const x1=ri(R,-3,3),y1=ri(R,-4,4),m=ri(R,-4,4)||1,dx=ri(R,1,4);const x2=x1+dx,y2=y1+m*dx;return{topic:'الهندسة التحليلية',lesson:'الميل',diff:'متوسط',q:`ما ميل المستقيم المار بالنقطتين A(${fmt(x1)} ; ${fmt(y1)}) و B(${fmt(x2)} ; ${fmt(y2)}) ؟`,correct:fmt(m),wrong:[fmt(-m),fmt(m+1),fmt(dx)],steps:['الميل = (y_B − y_A) ÷ (x_B − x_A)',`(${fmt(y2)} − ${fmt(y1)}) ÷ (${fmt(x2)} − ${fmt(x1)}) = ${fmt(m)}`],why:`الميل يساوي ${fmt(m)}.`}},
   R=>{const a=ri(R,1,4),b=ri(R,-6,6),c=ri(R,-5,5);const D=b*b-4*a*c;return{topic:'المعادلات من الدرجة الثانية',lesson:'المميز Δ',diff:'متوسط',q:`احسب المميز Δ للمعادلة: ${a}x² ${b>=0?'+':'−'} ${Math.abs(b)}x ${c>=0?'+':'−'} ${Math.abs(c)} = 0`,correct:'Δ = '+fmt(D),wrong:['Δ = '+fmt(D+4*a),'Δ = '+fmt(b*b+4*a*c),'Δ = '+fmt(b*b-2*a*c)],steps:['Δ = b² − 4ac',`Δ = ${b*b} − 4×${a}×(${fmt(c)}) = ${fmt(D)}`],why:`Δ = ${fmt(D)}.`}},
   R=>{const a=ri(R,2,5),b=ri(R,1,8),c=a*ri(R,2,6)+b;const x=(c-b)/a;return{topic:'المتراجحات',lesson:'حل متراجحة من الدرجة الأولى',diff:'متوسط',q:`حلّ المتراجحة: ${a}x + ${b} > ${c}`,correct:`x > ${x}`,wrong:[`x < ${x}`,`x > ${c-b}`,`x ≥ ${x+1}`],steps:[`${a}x > ${c} − ${b} = ${c-b}`,`x > ${c-b} ÷ ${a} = ${x}`],why:`المجموعة هي ]${x} ; +∞[.`}}
  ]
 };
 function generatedMath(recs){
  const out=[],seenQ=new Set();
  Object.keys(GEN).forEach(g=>{
   const base=recs.find(r=>r.grade===g&&r.subject==='الرياضيات');if(!base)return;
   GEN[g].forEach((tpl,ti)=>{
    for(let n=0;n<8;n++){
     const R=rng(hash(g+'|'+ti+'|'+n));let item;
     try{item=tpl(R)}catch{continue}
     if(seenQ.has(g+item.q))continue;seenQ.add(g+item.q);
     const m=mcq(R,item.correct,item.wrong);if(m.choices.length!==4||m.answer_index<0)continue;
     const rec=Object.assign({},base,{
      id:`gen-${base.level[0]}${ti}${n}-${hash(g).toString(36)}`,topic:item.topic,lesson:item.lesson,difficulty:item.diff,
      term:(ti+n)%3+1,question:item.q,choices:m.choices,answer_index:m.answer_index,solution:String(item.correct),
      explanation:item.why,solution_steps:item.steps,question_type:'numeric',status:'platform_practice_not_official',
      content_origin:'generated_verified_math',quality_flags:[],repeat_grades:[],estimated_minutes:2
     });
     out.push(rec);
    }
   });
  });
  return out;
 }
 const _prevFilter=window.smQualityFilter;
 window.smQualityFilter=function(recs){
  const base=(typeof _prevFilter==='function'?_prevFilter(recs):recs).filter(r=>!isGeneric(r));
  const have=new Set(base.map(r=>r.id));
  return base.concat(generatedMath(base).filter(r=>!have.has(r.id)));
 };
 window.smIsGenericQuestion=isGeneric;

 /* ================= 2) SMART TEACHER ================= */
 const RANK={'مبتدئ':0,'متوسط':1,'متقدم':2};
 window.smartTeacherPool=function(subject){
  const bank=(typeof exerciseBankRecords!=='undefined'?exerciseBankRecords:[]);
  const R=rng(Date.now()&0xffff);
  return bank.filter(r=>r.grade===grade&&r.subject===subject&&Array.isArray(r.choices)&&r.choices.length>=2&&Number.isInteger(r.answer_index))
   .map(r=>({k:R(),r})).sort((a,b)=>(RANK[a.r.difficulty]??1)-(RANK[b.r.difficulty]??1)||a.k-b.k)
   .map(({r})=>({q:r.question,choices:r.choices,a:r.answer_index,why:r.explanation||r.solution||'',id:r.id}));
 };
 const _startST=window.startSmartTeacherSession;
 if(typeof _startST==='function'){
  window.startSmartTeacherSession=async function(){
   try{
    if(typeof exerciseBankRecords!=='undefined'&&!exerciseBankRecords.length){
     say(tr('جارٍ تحميل الأسئلة…','Chargement des questions…','Loading questions…'));
     const d=await smFetchJSON('./data/exercise-bank-2026-2027.json');
     exerciseBankRecords=window.smQualityFilter(Array.isArray(d.records)?d.records:[]);
    }
   }catch{}
   return _startST.apply(this,arguments);
  };
 }

 /* ================= 3) AI ASSISTANT: local mode + Groq option ================= */
 const lessonsFor=subject=>{
  const all=(typeof starterLessons!=='undefined'?starterLessons:[]);
  return all.filter(x=>(x.gr?x.gr===grade:x.g===level)&&(!subject||subject==='عام'||x.s===subject));
 };
 const arTxt=o=>o&&(o[L()]||o.ar)||'';
 function rankLessons(list,tokens){
  return list.map(x=>{const hay=otNorm(arTxt(x.title)+' '+arTxt(x.goal)+' '+arTxt(x.body));let s=0;tokens.forEach(t=>{if(otNorm(arTxt(x.title)).includes(t))s+=4;else if(hay.includes(t))s+=1});return{x,s}}).filter(o=>o.s>0).sort((a,b)=>b.s-a.s);
 }
 const choiceLine=r=>r.choices?'\n   '+r.choices.map((c,j)=>String.fromCharCode(65+j)+'. '+c).join('    '):'';
 window.offlineTutorReply=async function(msg,subject,task,student){
  const bank=(await otBank()).filter(r=>r.grade===grade&&(!subject||subject==='عام'||r.subject===subject));
  const tokens=otTokens(msg),lessons=lessonsFor(subject),rl=rankLessons(lessons,tokens);
  const rb=bank.map(r=>({r,s:otScore(r,tokens)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  const head=tr('🟢 وضع المنصة (دون إنترنت): الجواب من دروس وتمارين السنة المختارة. لشرح حرّ لأي سؤال فعّل مفتاح Groq أو Groq من أعلى الصفحة.','🟢 Mode plateforme (hors ligne) : réponse issue des leçons et exercices du niveau. Pour des explications libres, ajoutez une clé Groq ou Groq.','🟢 Platform mode (offline): answer comes from this grade’s lessons and exercises. Add a Groq or Groq key above for free-form explanations.');
  const lessonBlock=l=>`📘 ${arTxt(l.title)}\n🎯 ${arTxt(l.goal)}\n\n${arTxt(l.body)}\n\n✍️ ${tr('تطبيق','Application','Practice')}: ${arTxt(l.task)}\n✅ ${tr('الجواب','Réponse','Answer')}: ${arTxt(l.answer)}`;
  const pickQs=n=>{const base=rb.length?rb.map(x=>x.r):bank.slice();const seen=new Set();return base.filter(r=>{if(seen.has(r.question))return false;seen.add(r.question);return true}).slice(0,n)};
  if(task==='practice'){
   const qs=pickQs(5);
   if(!qs.length)return head+'\n\n'+tr('لا توجد تمارين لهذه المادة في هذه السنة بعد. اختر مادة أخرى.','Aucun exercice pour cette matière.','No exercises for this subject yet.');
   return `${head}\n\n📝 ${tr('تمارين تدريبية','Exercices','Practice questions')}\n\n`+qs.map((r,i)=>`${i+1}) ${r.question}${choiceLine(r)}`).join('\n\n')+`\n\n— ${tr('الإجابات','Réponses','Answers')} —\n`+qs.map((r,i)=>`${i+1}) ${r.solution}${r.explanation?' — '+r.explanation:''}`).join('\n');
  }
  if(task==='evaluate'){
   const model=rl[0]?arTxt(rl[0].x.answer):(rb[0]?rb[0].r.solution:'');
   const stu=otTokens(student||'');const mod=otTokens(model);
   const hit=mod.length?mod.filter(t=>stu.includes(t)).length/mod.length:0;
   const verdict=!model?tr('لم أجد جواباً نموذجياً مطابقاً لسؤالك.','Pas de réponse modèle correspondante.','No matching model answer found.'):hit>=.6?tr('إجابتك قريبة جداً من الجواب النموذجي 👏','Votre réponse est très proche du modèle 👏','Your answer is very close to the model 👏'):hit>=.3?tr('إجابتك جزئية: أضف العناصر الناقصة في الجواب النموذجي.','Réponse partielle : complétez avec le modèle.','Partial answer: add the missing elements from the model.'):tr('إجابتك بعيدة عن النموذج؛ راجع الدرس ثم أعد المحاولة.','Réponse éloignée du modèle ; revoyez la leçon.','Your answer differs from the model; review the lesson and retry.');
   return `${head}\n\n${verdict}\n${model?`\n✅ ${tr('الجواب النموذجي','Réponse modèle','Model answer')}: ${model}`:''}\n\n${tr('ملاحظة: التقييم هنا مقارنة كلمات مفتاحية فقط؛ للتصحيح المفصّل فعّل الذكاء الاصطناعي.','Note : comparaison de mots-clés uniquement.','Note: keyword comparison only; enable AI for detailed marking.')}`;
  }
  if(rl.length){
   const l=rl[0].x,extra=pickQs(2).filter(r=>otNorm(r.lesson||'')===otNorm(arTxt(l.title))||rb.length);
   return `${head}\n\n${lessonBlock(l)}`+(rl[1]?`\n\n➕ ${tr('دروس قريبة','Leçons proches','Related lessons')}: ${rl.slice(1,4).map(o=>arTxt(o.x.title)).join(' • ')}`:'')+(extra.length?`\n\n🧪 ${tr('جرّب','Essayez','Try')}:\n`+extra.map((r,i)=>`${i+1}) ${r.question}${choiceLine(r)}\n   ✅ ${r.solution}`).join('\n'):'');
  }
  if(rb.length){
   const top=rb[0].r,steps=(top.solution_steps||[]).map((x,i)=>`${i+1}. ${x}`).join('\n');
   return `${head}\n\n📚 ${top.topic} — ${top.lesson}\n\n${tr('مثال','Exemple','Example')}: ${top.question}\n${tr('الجواب','Réponse','Answer')}: ${top.solution}\n\n${top.explanation||''}${steps?'\n\n'+steps:''}`;
  }
  const titles=[...new Set(lessons.map(l=>arTxt(l.title)))].slice(0,8);
  return `${head}\n\n${tr('لم أجد درساً مطابقاً لسؤالك في هذه المادة والسنة.','Aucune leçon correspondante.','No matching lesson found.')}`+(titles.length?`\n\n${tr('دروس متاحة','Leçons disponibles','Available lessons')}:\n• `+titles.join('\n• '):'');
 };
 /* sendChat passes (msg,subject,task) only — also give the student's written answer for “evaluate” */
 const _off=window.offlineTutorReply;
 window.offlineTutorReply=function(m,s,t){return _off(m,s,t,document.getElementById('studentAnswer')?.value||'')};

 /* ================= 4) TEST BANK + TASNIM DOCUMENTS ================= */
 let tasnimIndex=null;
 function loadTasnimIndex(){
  if(tasnimIndex!==null)return;tasnimIndex=[];
  fetch('./data/tasnim-index.json').then(r=>r.ok?r.json():null).then(d=>{if(d&&Array.isArray(d.documents)){tasnimIndex=d.documents;if(typeof page!=='undefined'&&page==='tests'&&typeof renderTestBankHome==='function')renderTestBankHome()}}).catch(()=>{});
 }
 const TAS_BASE='https://www.t-onec.com/p/';
 function tasnimPanel(g){
  loadTasnimIndex();
  const docs=tasnimIndex.filter(d=>d.grade===g);
  const subs=[...new Set(docs.map(d=>d.subject))];
  const ext=(typeof tasnimExamUrl==='function')?tasnimExamUrl(g):'';
  let body;
  if(docs.length){
   body=`<div class="doc-list">${docs.slice(0,40).map(d=>`<a class="doc-row" href="${esc(d.file)}" target="_blank" rel="noopener"><span>📄 ${esc(d.title)}</span><small>${esc(d.subject||'')} · ${esc(d.term?('الفصل '+d.term):'')}${d.solution?' · '+tr('مع الحل','avec corrigé','with solution'):''}</small></a>`).join('')}</div><small>${docs.length} ${tr('وثيقة محمّلة على الجهاز','documents sur l’appareil','documents on this device')} · ${subs.length} ${tr('مادة','matières','subjects')}</small>`;
  }else{
   body=`<p>${tr('لم تُحمَّل وثائق لهذه السنة بعد. شغّل أداة التحميل المرفقة (tools/fetch_tasnim.py) على حاسوبك لتنزيل الملفات المرخّصة داخل التطبيق، وسيعرضها هنا دون إنترنت.','Aucun document pour ce niveau. Lancez tools/fetch_tasnim.py sur votre ordinateur pour les intégrer à l’application.','No documents for this grade yet. Run the bundled tools/fetch_tasnim.py on your computer to place the licensed files inside the app; they will show here offline.')}</p>`;
  }
  return `<section class="panel tasnim-panel"><div class="learning-meta"><b>📥 ${tr('فروض واختبارات — تسنيم','Devoirs et examens — Tasnim','Exams — Tasnim')}</b></div>${body}${ext?`<div class="toolbar"><a class="secondary-btn" href="${ext}" target="_blank" rel="noopener noreferrer">${tr('فتح صفحة '+g+' في موقع تسنيم','Ouvrir la page '+g,'Open '+g+' on Tasnim')} ↗</a></div>`:''}</section>`;
 }
 window.tasnimPanel=tasnimPanel;
 window.testBankHomePage=function(){
  const ar=L()==='ar';
  const g=bankTestSelection.grade||grade;
  const byGrade=exerciseBankRecords.filter(x=>x.grade===g);
  const counts={};byGrade.forEach(x=>counts[x.subject]=(counts[x.subject]||0)+1);
  const subs=Object.keys(counts).filter(s=>counts[s]>=4);
  const sub=subs.includes(bankTestSelection.subject)?bankTestSelection.subject:(subs[0]||'');
  bankTestSelection.grade=g;bankTestSelection.subject=sub;
  const term=bankTestSelection.term;
  const hasPaper=!!sub&&term!=='all'&&(typeof termExamPapers!=='undefined')&&termExamPapers.some(p=>p.grade===g&&p.subject===sub&&String(p.term)===term);
  const hasSit=!!sub&&term!=='all'&&(typeof integrativeAssessments!=='undefined')&&integrativeAssessments.some(p=>p.grade===g&&p.subject===sub&&String(p.term)===term);
  const history=readBankTestHistory();
  const opt=(v,t,cur)=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${t}</option>`;
  return `${sectionHead(tr('بنك الاختبارات','Banque de tests','Test bank'),g)}
  <section class="panel test-builder v2-builder"><h3>${tr('أنشئ اختباراً','Créer un test','Build a test')}</h3>
   <div class="test-builder-grid">
    <label>${tr('السنة','Niveau','Grade')}<select id="bankTestGrade" onchange="changeBankTestGrade(this.value)">${levels.primary.concat(levels.middle,levels.secondary).map(x=>`<option ${x===g?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>${tr('المادة','Matière','Subject')}<select id="bankTestSubject" onchange="bankTestSelection.subject=this.value;renderTestBankHome()">${subs.map(x=>`<option ${x===sub?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>${tr('الفصل','Trimestre','Term')}<select id="bankTestTerm" onchange="bankTestSelection.term=this.value;renderTestBankHome()">${opt('all',tr('كل الفصول','Tous','All'),term)}${opt('1',tr('الأول','1er','First'),term)}${opt('2',tr('الثاني','2e','Second'),term)}${opt('3',tr('الثالث','3e','Third'),term)}</select></label>
    <label>${tr('عدد الأسئلة','Questions','Questions')}<select id="bankTestCount" onchange="bankTestSelection.count=this.value">${['5','10','15','20'].map(x=>opt(x,x,bankTestSelection.count)).join('')}</select></label>
   </div>
   ${sub?`<div class="v2-actions"><button class="primary-btn" onclick="startBankTest()">⚡ ${tr('اختبار سريع من البنك','Test rapide','Quick test')} <small>(${counts[sub]} ${tr('سؤالاً','questions','questions')})</small></button>
     <button class="secondary-btn" onclick="startPreparedTermExam()" ${hasPaper?'':'disabled'}>📄 ${tr('الاختبار الفصلي الجاهز','Sujet trimestriel','Prepared term paper')}</button>
     <button class="secondary-btn" onclick="startIntegrativeAssessment()" ${hasSit?'':'disabled'}>🧩 ${tr('وضعية إدماجية','Situation d’intégration','Integrative situation')}</button></div>
    ${term==='all'?`<small class="v2-hint">${tr('اختر فصلاً لتفعيل الاختبار الفصلي والوضعية الإدماجية.','Choisissez un trimestre pour activer les sujets prêts.','Pick a term to enable the prepared paper and situation.')}</small>`:(!hasPaper&&!hasSit?`<small class="v2-hint">${tr('لا يتوفر اختبار فصلي جاهز لهذه المادة؛ استعمل الاختبار السريع.','Pas de sujet prêt pour cette matière ; utilisez le test rapide.','No prepared paper for this subject; use the quick test.')}</small>`:'')}`
    :`<div class="notice">${tr('لا توجد أسئلة كافية لهذه السنة بعد.','Pas assez de questions pour ce niveau.','Not enough questions for this grade yet.')}</div>`}
   <div id="bankTestMount"></div>
   <small class="v2-hint">${tr('الأسئلة تدريبية من إعداد المنصة وليست مواضيع وزارية رسمية.','Questions d’entraînement, non officielles.','Practice questions, not official ministry papers.')}</small>
  </section>
  ${(window.tasnimPanel||tasnimPanel)(g)}
  <section class="panel test-history"><h3>${tr('آخر النتائج','Résultats récents','Recent results')}</h3>${history.length?history.slice(0,6).map(x=>`<div class="activity-row"><div><b>${x.subject}</b><small>${x.grade} · ${x.date}</small></div><strong>${x.mark}/20</strong></div>`).join(''):`<div class="empty-note">${tr('لا توجد نتائج بعد.','Aucun résultat.','No results yet.')}</div>`}</section>`;
 };
 /* make sure these old panel loaders stay silent */
 ['loadExamLibrary','loadCurriculumGovernance','loadPdfReviewDocuments'].forEach(n=>{if(typeof window[n]==='function')window[n]=()=>{}});
 ['curriculumGovernancePanel','curriculumExamBuilderPanel','claudeContentDraftPanel','externalExamLibraryPanel','examLibraryPanel','pdfReviewPanel','schoolAssessmentsArchivePanel','examArchivePanel'].forEach(n=>{if(typeof window[n]==='function')window[n]=()=>''});

 /* ================= 5) Library page: official portals only ================= */
 document.addEventListener('DOMContentLoaded',()=>{loadTasnimIndex()});
})();
