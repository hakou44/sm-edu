const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/app.js','utf8');
function extract(name){const start=src.indexOf(`function ${name}(`);assert(start>=0,`${name} missing`);const next=src.indexOf('\nfunction ',start+10);return src.slice(start,next<0?src.length:next)}
const store=new Map();
const context={
 lang:'ar',
 progressStats:()=>({learner:{id:'kid-1',name:'Test learner',grade:'الثالثة متوسط'},items:[
  {subject:'رياضيات',correct:1,total:5,at:1,grade:'الثالثة متوسط'},
  {subject:'رياضيات',correct:2,total:5,at:2,grade:'الثالثة متوسط'},
  {subject:'عربية',correct:9,total:10,at:3,grade:'الثالثة متوسط'},
  {subject:'عربية',correct:8,total:10,at:4,grade:'الثالثة متوسط'}
 ]}),
 activeLearner:()=>({id:'kid-1',name:'Test learner',grade:'الثالثة متوسط'}),
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 levels:{primary:[],middle:['الثالثة متوسط'],secondary:[]},toast:()=>{},render:()=>{},
 Date,Math,JSON,String,Number,Object,Array
};
vm.createContext(context);
vm.runInContext([extract('adaptiveTrendForSubject'),extract('adaptiveLearningData'),extract('adaptivePlanRows'),extract('buildAdaptivePlan'),extract('activeAdaptivePlan')].join('\n'),context);
const rows=context.adaptiveLearningData();
assert.equal(rows[0].subject,'رياضيات');assert.equal(rows[0].accuracy,30);assert.equal(rows[0].status,'support');
assert.equal(rows[1].accuracy,85);assert.equal(rows[1].status,'mastered');
context.buildAdaptivePlan();
const plan=context.activeAdaptivePlan();
assert(plan&&plan.learnerId==='kid-1');assert.equal(plan.days.length,7);assert.equal(plan.days[0].subject,'رياضيات');
assert.equal(JSON.parse(store.get('smSchoolAdaptivePlans')).length,1);
console.log('PASS: adaptive thresholds, weakest-subject prioritization, seven-day plan and per-learner local persistence');
