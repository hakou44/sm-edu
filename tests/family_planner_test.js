const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/family-planner.js','utf8');
const store=new Map();
const learner={id:'kid-1',name:'Test',level:'middle',grade:'الثانية متوسط'};
const ctx={lang:'ar',levels:{primary:[],middle:['الثانية متوسط'],secondary:[]},subjects:{middle:['رياضيات','عربية','فيزياء']},
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 getProgress:()=>[{learnerId:'kid-1',subject:'رياضيات',correct:1,total:5,date:new Date().toISOString().slice(0,10)},{learnerId:'kid-1',subject:'عربية',correct:9,total:10,date:new Date().toISOString().slice(0,10)}],
 getLearners:()=>[learner],ensureDefaultLearner:()=>[learner],toast:()=>{},render:()=>{},escapeReviewText:x=>String(x),
 Date,Math,JSON,String,Number,Object,Array,navigator:{},URL};
vm.createContext(ctx);vm.runInContext(src+';this.api={familyConfig,familySlots,familySetField,familyToggleSlot,familyWeekReport,familyPlannerPanel,familyIso,familyWeeklyFocus}',ctx);
const a=ctx.api,cfg=a.familyConfig('kid-1');
const slots=a.familySlots(learner,cfg,new Date());
assert.equal(slots.length,2);assert.equal(slots[0].subject,'رياضيات');assert(slots[0].focus);assert.notEqual(slots[0].subject,slots[1].subject);assert.equal(slots[0].time,'16:00');assert.equal(slots[1].time,'16:40');
a.familySetField('kid-1','perDay','3');assert.equal(a.familyConfig('kid-1').perDay,3);
a.familySetField('kid-1','minutes','99');assert.equal(a.familyConfig('kid-1').minutes,30);
const iso=a.familyIso(new Date());a.familyToggleSlot('kid-1',iso,0,'رياضيات',true);
assert.equal(a.familyConfig('kid-1').done[iso].length,1);
const r=a.familyWeekReport(learner);assert.deepEqual(Array.from(r.weak),['رياضيات']);assert.equal(r.attempts,2);
assert(a.familyPlannerPanel().includes('Test'));
const focus=a.familyWeeklyFocus(learner);assert(focus.subjects.includes('رياضيات'));assert.equal(focus.reason,'weak_evidence');assert(focus.sessions[0].sessions===3);
const sparse=a.familyWeeklyFocus({...learner,id:'empty'});assert.equal(sparse.reason,'not_enough_data');
console.log('PASS: family planner slots, weak-subject priority, config validation, completion tracking and weekly report');
