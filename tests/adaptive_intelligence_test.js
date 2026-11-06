const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/app.js','utf8');
function extract(name){const start=src.indexOf(`function ${name}(`);assert(start>=0,`${name} missing`);const next=src.indexOf('\nfunction ',start+10);return src.slice(start,next<0?src.length:next)}
const now=Date.now(),store=new Map();
const rows=[
 {subject:'رياضيات',correct:4,total:5,at:now-10*86400000,date:new Date(now-10*86400000).toISOString().slice(0,10),grade:'الثالثة متوسط'},
 {subject:'رياضيات',correct:1,total:5,at:now-2*86400000,date:new Date(now-2*86400000).toISOString().slice(0,10),grade:'الثالثة متوسط'},
 {subject:'رياضيات',correct:2,total:5,at:now-1*86400000,date:new Date(now-1*86400000).toISOString().slice(0,10),grade:'الثالثة متوسط'},
 {subject:'علوم',correct:1,total:5,at:now-10*86400000,date:new Date(now-10*86400000).toISOString().slice(0,10),grade:'الثالثة متوسط'},
 {subject:'علوم',correct:5,total:5,at:now-2*86400000,date:new Date(now-2*86400000).toISOString().slice(0,10),grade:'الثالثة متوسط'}
];
const learner={id:'kid-a',name:'Learner A',grade:'الثالثة متوسط'};
const context={Date,Math,JSON,String,Number,Object,Array,progressStats:()=>({learner,items:rows}),activeLearner:()=>learner,localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},lang:'ar',toast:()=>{},render:()=>{}};
vm.createContext(context);
vm.runInContext([extract('adaptiveTrendForSubject'),extract('adaptiveLearningData'),extract('adaptivePlanRows'),extract('buildAdaptivePlan'),extract('activeAdaptivePlan')].join('\n'),context);
const down=context.adaptiveTrendForSubject(rows.filter(x=>x.subject==='رياضيات'),now);
assert.equal(down.trend,'down');assert.equal(down.recentAccuracy,30);assert.equal(down.previousAccuracy,80);
const up=context.adaptiveTrendForSubject(rows.filter(x=>x.subject==='علوم'),now);
assert.equal(up.trend,'up');
const insufficient=context.adaptiveTrendForSubject([{correct:1,total:1,at:now-86400000}],now);
assert.equal(insufficient.trend,'unknown');
const data=context.adaptiveLearningData();
assert.equal(data[0].subject,'رياضيات');assert.equal(data[0].trend,'down');assert.equal(data.find(x=>x.subject==='علوم').trend,'up');
context.buildAdaptivePlan();
const plan=context.activeAdaptivePlan();
assert.equal(plan.engine_version,'1.8.8');assert.equal(plan.days.length,7);
assert.equal(plan.days[0].subject,'رياضيات');assert.equal(plan.days[0].reason,'recent_decline');
assert(plan.days.every(x=>x.strategy&&x.trend&&x.reviewAfterDays>=1&&x.reviewAfterDays<=7));
assert.equal(JSON.parse(store.get('smSchoolAdaptivePlans')).length,1);
console.log('PASS: recent-vs-prior trend detection, evidence threshold, decline prioritization and spaced adaptive plan metadata');
