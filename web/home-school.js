/* SM SCHOOL AI v1.7.2 — Home school: suggested weekly timetable + guided daily sessions.
   Local only (no server, no account). The timetable is a suggested HOME routine, not the official Ministry timetable. */
const HOME_SCHOOL_KEY='smSchoolHomeSchool';
const HOME_STEPS=['lesson','exercise','review'];
const HOME_SESSION_MIN={primary:30,middle:40,secondary:45};
/* Suggested sessions per week and subject (platform-authored home routine; official hours/coefficients are not verified). */
const HOME_WEEKLY_SESSIONS={
 primary:{'اللغة العربية':5,'الرياضيات':5,'اللغة الفرنسية':3,'اللغة الإنجليزية':2,'التربية الإسلامية':2,'التربية العلمية والتكنولوجية':2,'التاريخ والجغرافيا':2,'التربية المدنية':1},
 middle:{'اللغة العربية':4,'الرياضيات':4,'اللغة الفرنسية':3,'اللغة الإنجليزية':3,'العلوم الطبيعية':2,'العلوم الفيزيائية والتكنولوجيا':2,'التاريخ والجغرافيا':2,'التربية الإسلامية':2,'التربية المدنية':1,'الإعلام الآلي':1},
 secondary:{'اللغة العربية':3,'الرياضيات':4,'اللغة الفرنسية':2,'اللغة الإنجليزية':2,'العلوم الطبيعية':3,'العلوم الفيزيائية':3,'التاريخ والجغرافيا':2,'الفلسفة':2,'العلوم الإسلامية':1,'الإعلام الآلي':1}
};
const HOME_DAY_NAMES={ar:['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],fr:['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};
function homeL(ar,fr,en){return lang==='ar'?ar:lang==='fr'?fr:en}
function homeIso(d){return d.toISOString().slice(0,10)}
function homeRows(){try{const r=JSON.parse(localStorage.getItem(HOME_SCHOOL_KEY)||'[]');return Array.isArray(r)?r.filter(x=>x&&typeof x==='object'&&x.learnerId):[]}catch{return []}}
function homeConfig(id){const c=homeRows().find(x=>x.learnerId===id);return c?{learnerId:id,start:'08:30',days:[0,1,2,3,4],done:{},...c}:{learnerId:id,start:'08:30',days:[0,1,2,3,4],done:{}}}
function homeSave(cfg){const rows=homeRows().filter(x=>x.learnerId!==cfg.learnerId);rows.unshift(cfg);localStorage.setItem(HOME_SCHOOL_KEY,JSON.stringify(rows.slice(0,20)))}
function homeSubjects(l){const base=[...((typeof subjects!=='undefined'&&subjects[l.level])||[])];if(l.level==='primary'){const n=levels.primary.indexOf(l.grade);if(n>=2)base.push('اللغة الإنجليزية');if(n>=3)base.push('اللغة الفرنسية')}const w=HOME_WEEKLY_SESSIONS[l.level]||{};return base.filter(s=>w[s]>0)}
function homeSessionPlan(l){const w=HOME_WEEKLY_SESSIONS[l.level]||{};return homeSubjects(l).map((subject,i)=>({subject,n:w[subject],i})).sort((a,b)=>b.n-a.n||a.i-b.i).map(({subject,n})=>({subject,n}))}
function homeWeekPlan(l,days){
 const D=[...new Set(days||[])].filter(d=>Number.isInteger(d)&&d>=0&&d<=6).sort((a,b)=>a-b);
 const plan=D.map(d=>({day:d,subjects:[]}));if(!plan.length)return plan;
 const items=homeSessionPlan(l);
 items.forEach((it,si)=>{const n=Math.min(it.n,plan.length);
  for(let k=0;k<n;k++){const ideal=(Math.floor(k*plan.length/n)+si)%plan.length;let best=-1,bl=1e9,bd=1e9;
   plan.forEach((p,i)=>{if(p.subjects.includes(it.subject))return;const load=p.subjects.length,dist=Math.min((i-ideal+plan.length)%plan.length,(ideal-i+plan.length)%plan.length);if(load<bl||(load===bl&&dist<bd)){best=i;bl=load;bd=dist}});
   if(best>=0)plan[best].subjects.push(it.subject)}});
 const order=items.map(x=>x.subject);plan.forEach(p=>p.subjects.sort((a,b)=>order.indexOf(a)-order.indexOf(b)));return plan}
function homeWeak(l){const by={};getProgress().filter(x=>x.learnerId===l.id||(!x.learnerId&&l.id==='default')).forEach(x=>{const k=String(x.subject||'');const o=by[k]||(by[k]={c:0,t:0});o.c+=Number(x.correct)||0;o.t+=Number(x.total)||0});return Object.keys(by).filter(k=>by[k].t>=3&&by[k].c/by[k].t<0.5)}
function homeStepMinutes(m){const lesson=Math.round(m*0.4),exercise=Math.round(m*0.4);return {lesson,exercise,review:m-lesson-exercise}}
function homeDaySessions(l,cfg,date){
 const entry=homeWeekPlan(l,cfg.days).find(p=>p.day===date.getUTCDay());if(!entry)return [];
 let subs=entry.subjects.slice();const weak=homeWeak(l).filter(s=>subs.includes(s));
 if(weak.length){const w=weak[Math.floor(date.getTime()/86400000)%weak.length];subs=[w,...subs.filter(s=>s!==w)]}
 const m=HOME_SESSION_MIN[l.level]||40,sm=homeStepMinutes(m);let [h,mi]=String(cfg.start||'08:30').split(':').map(Number);let t=(h||0)*60+(mi||0);
 return subs.map((subject,idx)=>{const time=`${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;t+=m+10;return {idx,time,subject,minutes:m,focus:idx===0&&weak.includes(subject),steps:HOME_STEPS.map(key=>({key,minutes:sm[key]}))}})}
function homeDoneSet(cfg,iso){return new Set(Array.isArray(cfg.done?.[iso])?cfg.done[iso]:[])}
function homeSessionDone(cfg,iso,subject){const s=homeDoneSet(cfg,iso);return HOME_STEPS.every(k=>s.has(`${subject}:${k}`))}
function homeToggleStep(id,iso,subjectEnc,step,checked){if(!HOME_STEPS.includes(step)||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return;const subject=decodeURIComponent(subjectEnc),cfg=homeConfig(id);cfg.done=cfg.done||{};const s=homeDoneSet(cfg,iso),key=`${subject}:${step}`;if(checked)s.add(key);else s.delete(key);cfg.done[iso]=[...s];const keys=Object.keys(cfg.done).sort();while(keys.length>120)delete cfg.done[keys.shift()];homeSave(cfg);render()}
function homeSetStart(id,value){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return;const cfg=homeConfig(id);cfg.start=value;homeSave(cfg);render()}
function homeToggleDay(id,d){const cfg=homeConfig(id),has=cfg.days.includes(d),next=has?cfg.days.filter(x=>x!==d):[...cfg.days,d].sort((a,b)=>a-b);if(!next.length||!Number.isInteger(d)||d<0||d>6)return;cfg.days=next;homeSave(cfg);render()}
function homeWeekHours(l,cfg){const m=HOME_SESSION_MIN[l.level]||40,count={};homeWeekPlan(l,cfg.days).forEach(p=>p.subjects.forEach(s=>{count[s]=(count[s]||0)+1}));const rows=homeSessionPlan(l).filter(x=>count[x.subject]).map(x=>({subject:x.subject,sessions:count[x.subject],minutes:count[x.subject]*m}));return {rows,totalMinutes:rows.reduce((n,x)=>n+x.minutes,0),sessions:rows.reduce((n,x)=>n+x.sessions,0)}}
function homeWeekProgress(l,cfg,today){const now=today||new Date(),plan=homeWeekPlan(l,cfg.days);let planned=0,done=0;for(let i=6;i>=0;i--){const d=new Date(now.getTime()-i*86400000),e=plan.find(p=>p.day===d.getUTCDay());if(!e)continue;const iso=homeIso(d);planned+=e.subjects.length;done+=e.subjects.filter(s=>homeSessionDone(cfg,iso,s)).length}return {planned,done}}
function homeFmtHours(min){const h=Math.floor(min/60),m=min%60;return m?`${h}h${String(m).padStart(2,'0')}`:`${h}h`}
function homeWhenExercisesReady(fn,tries=0){if(typeof exerciseBankRecords!=='undefined'&&exerciseBankRecords.length){fn();return}if(tries>40){toast(homeL('تعذّر تحميل بنك التمارين.','Banque d’exercices indisponible.','Exercise bank unavailable.'));return}setTimeout(()=>homeWhenExercisesReady(fn,tries+1),150)}
/* Lesson for a session: grade-specific lessons first, otherwise stage-level ones; rotates with the lessons the learner already completed in that subject. */
function homePickLesson(l,subject){const m=starterLessons.map((x,i)=>({x,i})).filter(o=>o.x.g===l.level&&o.x.s===subject&&(!o.x.gr||o.x.gr===l.grade));if(!m.length)return -1;const sp=m.filter(o=>o.x.gr===l.grade),pool=sp.length?sp:m;const done=getProgress().filter(x=>x.mode==='lessons'&&x.subject===subject&&(x.learnerId===l.id||(!x.learnerId&&l.id==='default'))).length;return pool[done%pool.length].i}
function homeOpenStep(id,subjectEnc,step){
 const subject=decodeURIComponent(subjectEnc),l=getLearners().find(x=>x.id===id);if(!l||!HOME_STEPS.includes(step))return;selectLearner(id);
 if(step==='lesson'){const idx=homePickLesson(l,subject);go('library');
  if(idx>=0){openStarterLesson(idx)}else toast(homeL('لا يوجد درس تكميلي لهذه المادة بعد؛ استعن بالكتاب المدرسي.','Pas encore de leçon complémentaire ; utilisez le manuel.','No supplemental lesson yet; use the textbook.'));return}
 go('exercises');loadHeavyData();
 homeWhenExercisesReady(()=>{renderExerciseBank(subject);if(step==='review')startExerciseSession('mistakes')})}
function homeSchoolPage(){
 const learners=ensureDefaultLearner(),dn=HOME_DAY_NAMES[lang]||HOME_DAY_NAMES.en,now=new Date(),iso=homeIso(now),dow=now.getUTCDay(),esc=x=>escapeReviewText(x);
 const stepName={lesson:homeL('الدرس','Leçon','Lesson'),exercise:homeL('التمارين','Exercices','Exercises'),review:homeL('المراجعة (الأخطاء)','Révision (erreurs)','Review (mistakes)')};
 const cards=learners.map(l=>{const cfg=homeConfig(l.id),id=esc(l.id),sessions=homeDaySessions(l,cfg,now),done=homeDoneSet(cfg,iso),plan=homeWeekPlan(l,cfg.days),hours=homeWeekHours(l,cfg),wp=homeWeekProgress(l,cfg,now);
  const todayDone=sessions.filter(s=>homeSessionDone(cfg,iso,s.subject)).length;
  const acts=getProgress().filter(x=>(x.learnerId===l.id||(!x.learnerId&&l.id==='default'))&&String(x.date)===iso);
  const dayBtns=dn.map((n,d)=>`<button type="button" class="secondary-btn${cfg.days.includes(d)?' is-active':''}" style="padding:4px 8px;margin:2px" onclick="homeToggleDay('${id}',${d})">${n}</button>`).join('');
  const sess=sessions.length?sessions.map(s=>{const enc=encodeURIComponent(s.subject),ok=homeSessionDone(cfg,iso,s.subject),n=acts.filter(a=>a.subject===s.subject).length;
   return `<div class="panel hs-session${ok?' is-done':''}" style="margin:8px 0"><b>${s.time} · ${esc(s.subject)}</b> <small>${s.minutes} ${homeL('دقيقة','min','min')}${s.focus?' · '+homeL('أولوية: مادة تحتاج دعماً','priorité : à renforcer','priority: needs support'):''}${ok?' · ✔':''}</small>
   ${s.steps.map((st,k)=>{const on=done.has(`${s.subject}:${st.key}`);return `<label class="adaptive-day ${on?'is-done':''}" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ${on?'checked':''} onchange="homeToggleStep('${id}','${iso}','${enc}','${st.key}',this.checked)"><span style="flex:1">${k+1}. ${stepName[st.key]} <small>(${st.minutes} ${homeL('د','min','min')})</small>${st.key==='exercise'&&n?` <small>· ${homeL('أنشطة مسجلة اليوم: ','activités aujourd’hui : ','activities today: ')}${n}</small>`:''}</span><button type="button" class="secondary-btn" style="padding:4px 10px" onclick="event.preventDefault();homeOpenStep('${id}','${enc}','${st.key}')">${homeL('ابدأ','Ouvrir','Open')} ↗</button></label>`}).join('')}</div>`}).join('')
   :`<div class="empty-note">${cfg.days.includes(dow)?homeL('لا توجد مواد لهذا المستوى.','Aucune matière pour ce niveau.','No subjects for this level.'):homeL('اليوم ليس يوم دراسة في الجدول.','Aujourd’hui n’est pas un jour d’étude.','Today is not a study day.')}</div>`;
  const table=plan.map(p=>`<tr><th style="text-align:start;white-space:nowrap">${dn[p.day]}</th><td>${homeDaySessions(l,{...cfg,done:{}},new Date(now.getTime()+((p.day-dow+7)%7)*86400000)).map(s=>`<small>${s.time} ${esc(s.subject)}</small>`).join('<br>')||'—'}</td></tr>`).join('');
  const hrows=hours.rows.map(r=>`<tr><td>${esc(r.subject)}</td><td>${r.sessions}</td><td>${homeFmtHours(r.minutes)}</td></tr>`).join('');
  return `<div class="panel family-card" style="margin-bottom:12px"><h3>🏠 ${esc(l.name)} <small>${esc(l.grade)}</small></h3>
  <div class="toolbar" style="flex-wrap:wrap;gap:8px"><label>${homeL('بداية اليوم الدراسي','Début de la journée','School day starts')} <input type="time" value="${esc(cfg.start)}" onchange="homeSetStart('${id}',this.value)"></label></div>
  <div>${dayBtns}</div>
  <h4>${homeL('يوم اليوم','Journée d’aujourd’hui','Today')} <small>${todayDone}/${sessions.length} ${homeL('حصص مكتملة','séances terminées','sessions complete')}</small></h4>${sess}
  <h4>${homeL('الجدول الأسبوعي المقترح','Emploi du temps hebdomadaire suggéré','Suggested weekly timetable')}</h4><div style="overflow-x:auto"><table class="hs-table" style="width:100%;border-collapse:collapse"><tbody>${table}</tbody></table></div>
  <details><summary>${homeL('الحجم الأسبوعي','Volume hebdomadaire','Weekly load')}: ${homeFmtHours(hours.totalMinutes)} · ${hours.sessions} ${homeL('حصة','séances','sessions')}</summary><table class="hs-table" style="width:100%"><thead><tr><th style="text-align:start">${homeL('المادة','Matière','Subject')}</th><th>${homeL('حصص','Séances','Sessions')}</th><th>${homeL('الساعات','Durée','Time')}</th></tr></thead><tbody>${hrows}</tbody></table></details>
  <p><small>${homeL('آخر 7 أيام: ','7 derniers jours : ','Last 7 days: ')}${wp.done}/${wp.planned} ${homeL('حصص مكتملة (درس + تمارين + مراجعة)','séances complètes (leçon + exercices + révision)','complete sessions (lesson + exercises + review)')}</small></p></div>`}).join('');
 return `<section class="panel family-planner"><h3>🏠 ${homeL('المدرسة المنزلية','L’école à la maison','Home school')}</h3><p>${homeL('يوم دراسي منزلي مرتّب: لكل حصة ثلاث خطوات (درس ← تمارين ← مراجعة الأخطاء) وفق مواد سنة الطفل في المنهاج الجزائري. الجدول والحجم الساعي المعروضان روتين منزلي مقترح من إعداد المنصة، وليسا التوقيت الرسمي ولا المعاملات الرسمية للوزارة، إذ لم تُتحقق بعد من وثائق الوزارة. تُحفظ البيانات على هذا الجهاز فقط.','Une journée structurée : chaque séance suit trois étapes (leçon → exercices → révision des erreurs) selon les matières de l’année de l’enfant. L’emploi du temps et les volumes horaires sont une routine suggérée par la plateforme, pas l’horaire ni les coefficients officiels du Ministère (non vérifiés). Données conservées sur cet appareil.','A structured home school day: each session has three steps (lesson → exercises → mistake review) for the child’s grade subjects. The timetable and weekly load are a platform-suggested home routine, not the Ministry’s official timetable or coefficients (not yet verified). Data stays on this device.')}</p></section>${learners.map(l=>typeof learningDiagnosticPanel==='function'?learningDiagnosticPanel(l):'').join('')}${cards}`}
