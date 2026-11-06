const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('web/weekly-planner-v1-18.js','utf8');
assert.doesNotThrow(()=>new vm.Script(src));
for(const x of ['الأحد','الرياضيات','smSchoolActiveLearner','wpGenerate','wpAdd','data-done','data-remove'])assert(src.includes(x),`missing ${x}`);
assert(src.includes('smSchoolWeeklyPlanV118'));
console.log('v1.18.0 weekly planner tests: PASS');
