const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('web/weekly-planner-v1-18.js','utf8');
assert.doesNotThrow(()=>new vm.Script(src));
for(const x of ['تهيئة واسترجاع المكتسبات','بناء التعلم والاكتشاف','التدريب والتطبيق الموجّه','الإدماج وحل وضعية','التقويم التكويني والمعالجة','data-stage','smSchoolPedagogicalSessionV181'])assert(src.includes(x),`missing ${x}`);
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem(){return null},setItem(){} }};
vm.runInNewContext(src,sandbox);
const stages=sandbox.window.smSchoolPedagogicalSessionV181.makeStages(90);
assert.strictEqual(stages.length,5);assert.strictEqual(stages.reduce((n,s)=>n+s.minutes,0),90);assert(stages.every(s=>s.minutes>0&&!s.done));
for(const n of [15,30,45,120,360]){const a=sandbox.window.smSchoolPedagogicalSessionV181.makeStages(n);assert.strictEqual(a.reduce((x,y)=>x+y.minutes,0),n);assert(a.every(x=>x.minutes>0));}
console.log('v1.18.2 pedagogical cycle tests: PASS');
