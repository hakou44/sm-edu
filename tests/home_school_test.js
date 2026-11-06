const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/home-school.js','utf8');
const store=new Map();
const today=new Date().toISOString().slice(0,10);
let progress=[{learnerId:'kid',subject:'الرياضيات',correct:1,total:5,date:today},{learnerId:'kid',subject:'اللغة العربية',correct:9,total:10,date:today}];
const calls=[];
const learners={
 mid:{id:'kid',name:'Test',level:'middle',grade:'الثانية متوسط'},
 p1:{id:'p1',name:'P1',level:'primary',grade:'الأولى ابتدائي'},
 p3:{id:'p3',name:'P3',level:'primary',grade:'الثالثة ابتدائي'},
 p4:{id:'p4',name:'P4',level:'primary',grade:'الرابعة ابتدائي'},
 sec:{id:'s1',name:'S1',level:'secondary',grade:'الأولى ثانوي'}
};
const ctx={lang:'ar',
 levels:{primary:['الأولى ابتدائي','الثانية ابتدائي','الثالثة ابتدائي','الرابعة ابتدائي','الخامسة ابتدائي'],middle:['الثانية متوسط'],secondary:['الأولى ثانوي']},
 subjects:{primary:['اللغة العربية','الرياضيات','التربية الإسلامية','التربية العلمية والتكنولوجية','التاريخ والجغرافيا','التربية المدنية'],
  middle:['اللغة العربية','الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية والتكنولوجيا','التاريخ والجغرافيا','التربية الإسلامية','التربية المدنية','الإعلام الآلي'],
  secondary:['اللغة العربية','الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية','التاريخ والجغرافيا','الفلسفة','العلوم الإسلامية','الإعلام الآلي']},
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 getProgress:()=>progress,getLearners:()=>Object.values(learners),ensureDefaultLearner:()=>[learners.mid],
 toast:m=>calls.push(['toast',m]),render:()=>{},escapeReviewText:x=>String(x),
 selectLearner:id=>calls.push(['select',id]),go:p=>calls.push(['go',p]),loadHeavyData:()=>calls.push(['load']),
 starterLessons:[{g:'middle',s:'الرياضيات'},{g:'primary',s:'الرياضيات'},{g:'middle',s:'الرياضيات'}],
 openStarterLesson:i=>calls.push(['lesson',i]),exerciseBankRecords:[{id:1}],
 renderExerciseBank:s=>calls.push(['bank',s]),startExerciseSession:m=>calls.push(['session',m]),
 Date,Math,JSON,String,Number,Object,Array,Set,Promise,setTimeout,Date};
vm.createContext(ctx);
vm.runInContext(src+';this.api={homeWeekPlan,homeSessionPlan,homeDaySessions,homeConfig,homeToggleStep,homeSessionDone,homeSetStart,homeToggleDay,homeWeekHours,homeWeekProgress,homeSchoolPage,homeOpenStep,homeIso,homeSubjects,homePickLesson,HOME_SCHOOL_KEY}',ctx);
const a=ctx.api,names=l=>Array.from(a.homeSubjects(l));

// 1. Subjects by grade: English from primary year 3, French from year 4 (platform rules)
assert(!names(learners.p1).includes('اللغة الإنجليزية')&&!names(learners.p1).includes('اللغة الفرنسية'));
assert(names(learners.p3).includes('اللغة الإنجليزية')&&!names(learners.p3).includes('اللغة الفرنسية'));
assert(names(learners.p4).includes('اللغة الإنجليزية')&&names(learners.p4).includes('اللغة الفرنسية'));

// 2. Weekly plan: every suggested session placed, never two of the same subject in a day, balanced load, deterministic
for(const l of Object.values(learners)){
 const days=[0,1,2,3,4],plan=a.homeWeekPlan(l,days),expect=Array.from(a.homeSessionPlan(l)).reduce((n,x)=>n+x.n,0);
 const placed=plan.reduce((n,p)=>n+p.subjects.length,0);
 assert.equal(placed,expect,l.name+' sessions placed');
 plan.forEach(p=>assert.equal(new Set(p.subjects).size,p.subjects.length,'no duplicate subject per day'));
 const loads=plan.map(p=>p.subjects.length);assert(Math.max(...loads)-Math.min(...loads)<=1,'balanced '+loads);
 assert.deepEqual(JSON.parse(JSON.stringify(plan)),JSON.parse(JSON.stringify(a.homeWeekPlan(l,days))));
}
assert.equal(a.homeWeekPlan(learners.mid,[0,1,2,3,4]).reduce((n,p)=>n+p.subjects.length,0),24);

// 3. Fewer study days: sessions per subject are capped to the number of days, still no duplicates
const three=a.homeWeekPlan(learners.mid,[1,3,4]);
assert.equal(three.length,3);three.forEach(p=>assert.equal(new Set(p.subjects).size,p.subjects.length));
assert.deepEqual(Array.from(a.homeWeekPlan(learners.mid,[]).map(x=>x)),[]);
assert.equal(a.homeWeekPlan(learners.mid,[9,-1,2.5]).length,0);

// 4. Day sessions: times, step split, weak-subject priority
const cfg=a.homeConfig('kid');
let weakChecked=false;
for(let i=0;i<7;i++){const d=new Date(Date.UTC(2026,10,1+i)),ss=a.homeDaySessions(learners.mid,cfg,d);if(!ss.length)continue;
 assert.equal(ss[0].time,'08:30');if(ss.length>1)assert.equal(ss[1].time,'09:20');
 ss.forEach(s=>{assert.equal(s.minutes,40);assert.equal(s.steps.reduce((n,x)=>n+x.minutes,0),40);assert.deepEqual(s.steps.map(x=>x.key),['lesson','exercise','review'])});
 if(ss.some(s=>s.subject==='الرياضيات')){assert.equal(ss[0].subject,'الرياضيات');assert(ss[0].focus);weakChecked=true}}
assert(weakChecked,'weak subject was prioritised');
assert.equal(a.homeDaySessions(learners.mid,cfg,new Date(Date.UTC(2026,10,6))).length,0,'Friday is not a study day by default');

// 5. Step completion needs all three steps, persists, and is pruned
const iso='2026-11-02';
a.homeToggleStep('kid',iso,encodeURIComponent('الرياضيات'),'lesson',true);
a.homeToggleStep('kid',iso,encodeURIComponent('الرياضيات'),'exercise',true);
assert(!a.homeSessionDone(a.homeConfig('kid'),iso,'الرياضيات'));
a.homeToggleStep('kid',iso,encodeURIComponent('الرياضيات'),'review',true);
assert(a.homeSessionDone(a.homeConfig('kid'),iso,'الرياضيات'));
a.homeToggleStep('kid',iso,encodeURIComponent('الرياضيات'),'review',false);
assert(!a.homeSessionDone(a.homeConfig('kid'),iso,'الرياضيات'));
a.homeToggleStep('kid','not-a-date',encodeURIComponent('x'),'lesson',true);
a.homeToggleStep('kid',iso,encodeURIComponent('x'),'bogus',true);
assert.deepEqual(Object.keys(a.homeConfig('kid').done),[iso]);

// 6. Settings validation
a.homeSetStart('kid','07:15');assert.equal(a.homeConfig('kid').start,'07:15');
a.homeSetStart('kid','25:99');assert.equal(a.homeConfig('kid').start,'07:15');
a.homeToggleDay('kid',5);assert(a.homeConfig('kid').days.includes(5));
a.homeToggleDay('kid',5);a.homeToggleDay('kid',99);assert.deepEqual(Array.from(a.homeConfig('kid').days),[0,1,2,3,4]);
for(const d of [0,1,2,3])a.homeToggleDay('kid',d);a.homeToggleDay('kid',4);
assert.deepEqual(Array.from(a.homeConfig('kid').days),[4],'at least one study day is always kept');
for(const d of [0,1,2,3])a.homeToggleDay('kid',d);

// 7. Weekly hours and progress
const hrs=a.homeWeekHours(learners.mid,a.homeConfig('kid'));
assert.equal(hrs.sessions,24);assert.equal(hrs.totalMinutes,24*40);
const wp=a.homeWeekProgress(learners.mid,a.homeConfig('kid'),new Date(Date.UTC(2026,10,5,12)));
assert(wp.planned>0&&wp.done>=0&&wp.done<=wp.planned);

// 8. Opening steps routes to the right tools
calls.length=0;a.homeOpenStep('kid',encodeURIComponent('الرياضيات'),'lesson');
assert(calls.some(c=>c[0]==='select'&&c[1]==='kid')&&calls.some(c=>c[0]==='go'&&c[1]==='library'));
const lessonCall=calls.find(c=>c[0]==='lesson');assert(lessonCall&&[0,2].includes(lessonCall[1]),'only middle-level lessons of that subject are used');
calls.length=0;a.homeOpenStep('kid',encodeURIComponent('الإعلام الآلي'),'lesson');
assert(!calls.some(c=>c[0]==='lesson')&&calls.some(c=>c[0]==='toast'),'missing lesson falls back to a notice');
calls.length=0;a.homeOpenStep('kid',encodeURIComponent('الرياضيات'),'review');
assert(calls.some(c=>c[0]==='go'&&c[1]==='exercises')&&calls.some(c=>c[0]==='bank'&&c[1]==='الرياضيات')&&calls.some(c=>c[0]==='session'&&c[1]==='mistakes'));
calls.length=0;a.homeOpenStep('kid',encodeURIComponent('الرياضيات'),'bogus');assert.equal(calls.length,0);


// 8b. Lesson choice: grade-specific lessons first, rotating with the lessons already completed in that subject
ctx.starterLessons.push({g:'middle',gr:'الثانية متوسط',s:'الرياضيات'},{g:'middle',gr:'الثانية متوسط',s:'الرياضيات'},{g:'middle',gr:'الأولى متوسط',s:'الرياضيات'});
assert.equal(a.homePickLesson(learners.mid,'الرياضيات'),3,'first grade-specific lesson');
progress.push({learnerId:'kid',subject:'الرياضيات',mode:'lessons',correct:1,total:1,date:today});
assert.equal(a.homePickLesson(learners.mid,'الرياضيات'),4,'next lesson after one completed');
progress.push({learnerId:'kid',subject:'الرياضيات',mode:'lessons',correct:1,total:1,date:today});
assert.equal(a.homePickLesson(learners.mid,'الرياضيات'),3,'rotation wraps around');
progress.push({learnerId:'other',subject:'الرياضيات',mode:'lessons',correct:1,total:1,date:today});
assert.equal(a.homePickLesson(learners.mid,'الرياضيات'),3,'other learners do not change the rotation');
assert.equal(a.homePickLesson(learners.mid,'الإعلام الآلي'),-1,'no lesson for the subject');
assert.equal(a.homePickLesson(learners.sec,'الرياضيات'),-1,'lessons of another stage are never used');
progress.length=2;ctx.starterLessons.length=3;

// 9. Page renders, with the unofficial-timetable notice, in all languages
for(const lg of ['ar','fr','en']){ctx.lang=lg;const html=a.homeSchoolPage();assert(html.includes('Test')&&html.includes('hs-table'));assert(/الرسمي|officiel|official/.test(html))}
console.log('PASS: home school weekly timetable, daily 3-step sessions, validation, hours/progress and navigation');
