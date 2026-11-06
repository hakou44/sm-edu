const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/learning-diagnostics.js','utf8');
const ctx={Date,Number,String,Array,Object,Math,lang:'ar',escapeReviewText:x=>String(x),getProgress:()=>[],};vm.createContext(ctx);vm.runInContext(src+';this.diagnose=learningDiagnostic;this.plan=learningRemediationPlan;this.panel=learningDiagnosticPanel;',ctx);
const now=new Date('2026-11-02T12:00:00Z');
const rows=[
 {learnerId:'a',date:'2026-11-02',subject:'الرياضيات',correct:1,total:5},
 {learnerId:'a',date:'2026-11-01',subject:'الرياضيات',correct:1,total:5},
 {learnerId:'a',date:'2026-10-30',subject:'العربية',correct:3,total:5},
 {learnerId:'a',date:'2026-09-20',subject:'قديم',correct:0,total:10},
 {learnerId:'b',date:'2026-11-02',subject:'مادة أخرى',correct:0,total:10},
 {learnerId:'a',date:'2026-11-03',subject:'مستقبل',correct:0,total:10}
];
const d=ctx.diagnose(rows,'a',now);assert.equal(d.activities,3);assert.equal(d.totalAnswers,15);assert.equal(d.priority.length,1);assert.equal(d.priority[0].subject,'الرياضيات');assert.equal(d.developing.length,1);assert.equal(d.secure.length,0);assert(!d.subjects.some(x=>x.subject==='قديم'||x.subject==='مادة أخرى'||x.subject==='مستقبل'));
const plan=ctx.plan(d);assert.equal(plan.length,7);assert.equal(plan[0].subject,'الرياضيات');assert.equal(plan[0].kind,'lesson');assert.equal(plan[6].kind,'recheck');
const noData=ctx.diagnose([],'a',now);assert.equal(noData.subjects.length,0);assert.equal(ctx.plan(noData).length,7);
ctx.lang='ar';ctx.getProgress=()=>rows;assert(ctx.panel({id:'a'}).includes('تشخيص التعلم وخطة الدعم'));ctx.lang='fr';assert(ctx.panel({id:'a'}).includes('Diagnostic et plan de soutien'));ctx.lang='en';assert(ctx.panel({id:'a'}).includes('Learning diagnosis & support plan'));
console.log('PASS: learner-scoped 30-day diagnosis, minimum evidence, remediation plan and multilingual panel');
