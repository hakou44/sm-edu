const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('web/lesson-planner-v1-18-2.js','utf8');assert.doesNotThrow(()=>new vm.Script(src));
const store={};const sandbox={window:{},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},Date,Math};vm.runInNewContext(src,sandbox);
const api=sandbox.window.smSchoolLessonPlannerV182;
for(const n of [15,30,45,60,90,120,240]){const a=api.allocate(n);assert.strictEqual(a.reduce((x,y)=>x+y,0),n);assert(a.every(x=>x>0));}
const p=api.build({grade:'السنة الرابعة متوسط',subject:'الرياضيات',title:'التناسبية',competency:'حل وضعيات تناسبية',minutes:90});
assert.strictEqual(p.stages.length,5);assert.strictEqual(p.stages.reduce((n,s)=>n+s.minutes,0),90);assert(p.validationNote.includes('الوثائق الرسمية'));assert.strictEqual(p.competency,'حل وضعيات تناسبية');
console.log('v1.18.2 lesson planner tests: PASS');
