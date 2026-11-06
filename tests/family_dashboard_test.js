const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store=new Map(),learners=[{id:'a',name:'Learner A',grade:'4AP'},{id:'b',name:'Learner B',grade:'2AM'}],now=new Date('2026-11-02T12:00:00Z');
const progress=[
 {date:'2026-11-01',learnerId:'a',subject:'Math',correct:8,total:10,mode:'test'},
 {date:'2026-10-30',learnerId:'a',subject:'Arabic',correct:2,total:10,mode:'exercise'},
 {date:'2026-10-31',learnerId:'b',subject:'Science',correct:9,total:10,mode:'test'},
 {date:'2026-10-29',learnerId:'b',subject:'Math',correct:8,total:10,mode:'exercise'}
];
const ctx={Date,Math,Number,String,Array,Object,JSON,Map,Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},getProgress:()=>progress,getLearners:()=>learners,activeLearner:()=>learners[0],escapeReviewText:x=>String(x).replace(/[&<>"']/g,''),lang:'en'};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../web/student-profile.js','utf8'),ctx);vm.runInContext(fs.readFileSync(__dirname+'/../web/family-dashboard.js','utf8')+';this.metrics=familyDashboardMetrics;this.panel=familyDashboardPanel;this.export=downloadFamilyDashboardReport;',ctx);
const a=ctx.metrics(learners[0],progress,now),b=ctx.metrics(learners[1],progress,now);
assert.equal(a.total,20);assert.equal(a.accuracy,50);assert.equal(b.accuracy,85);assert.equal(a.subjects.length,2);assert.equal(a.weak.length,1);
const html=ctx.panel();for(const token of ['Parent family overview','Learner A','Learner B','Export all learners report','not a learner ranking'])assert(html.includes(token),`missing ${token}`);
assert.notEqual(a.accuracy,b.accuracy,'learner metrics remain isolated');console.log('PASS: family dashboard isolates learner records, summarizes 30-day outcomes and renders multi-learner overview');
