const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../web/student-profile.js','utf8');
const store=new Map();const now=new Date('2026-11-02T12:00:00Z');
const rows=[
 {date:'2026-10-30',learnerId:'kid',subject:'Math',correct:4,total:5,mode:'test',topic:'Fractions'},
 {date:'2026-10-25',learnerId:'kid',subject:'Math',correct:2,total:5,mode:'test',topic:'Fractions'},
 {date:'2026-10-20',learnerId:'kid',subject:'Arabic',correct:3,total:5,mode:'exercise'},
 {date:'2026-10-15',learnerId:'kid',subject:'Arabic',correct:2,total:5,mode:'exercise'},
 {date:'2026-10-10',learnerId:'kid',subject:'Math',correct:1,total:5,mode:'test'},
 {date:'2026-10-30',learnerId:'other',subject:'Math',correct:0,total:10,mode:'test'}
];
const ctx={Date,Math,Number,String,Array,Object,JSON,Map,URL:{},Blob:function(){},document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},navigator:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},getProgress:()=>rows,activeLearner:()=>({id:'kid',name:'Learner A',grade:'Grade 4'}),escapeReviewText:x=>String(x).replace(/[&<>"']/g,''),lang:'en',toast:()=>{}};
vm.createContext(ctx);vm.runInContext(source+';this.data=studentProfileData;this.panel=studentProfilePanel;this.report=studentProfileReportText;this.readiness=studentProfileReadiness;this.plan=studentProfileRevisionPlan;this.planText=studentProfilePlanText;',ctx);
const d=ctx.data({id:'kid',name:'Learner A',grade:'Grade 4'},now);
assert.equal(d.total,25,'only selected learner answers counted');assert.equal(d.activities,5);assert.equal(d.subjects.length,2);assert.equal(d.subjects.find(x=>x.subject==='Math').topicRows[0].topic,'Fractions');assert.equal(d.goal,80);assert(['attention','monitor','on_track','insufficient'].includes(d.signal));
const html=ctx.panel({id:'kid',name:'Learner A',grade:'Grade 4'});for(const x of ['AI Student Profile','spGoal','Four-week progress trend','Exam readiness','Personalized 5-day revision plan','Copy revision plan','Weekly report','Monthly report'])assert(html.includes(x),`missing ${x}`);
const report=ctx.report(d,'week');assert(report.includes('Learner: Learner A'));assert(report.includes('Period:'));console.log('PASS: v1.8.1 learner profile isolates learner data, aggregates trends, tracks topic mastery, sets goals and creates reports');
