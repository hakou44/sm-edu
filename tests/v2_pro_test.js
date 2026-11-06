// v2.0.0 regression: quality filter, verified generated maths, no archive/PDF link data, wiring.
const fs=require('fs'),assert=require('assert'),root=__dirname+'/..';
const src=fs.readFileSync(root+'/web/v2-pro.js','utf8');
global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.document={getElementById:()=>null,addEventListener(){}};
Object.assign(global,{lang:'ar',grade:'الثانية متوسط',level:'middle',levels:{primary:[],middle:[],secondary:[]},fetch:()=>Promise.reject(1),
 tutorServerPanel:()=>'',smAiStatusCard:()=>'',starterLessons:[],smFetchJSON:()=>Promise.reject(1),exerciseBankRecords:[],
 otNorm:x=>x,otTokens:()=>[],otScore:()=>0,otBank:async()=>[],startSmartTeacherSession(){},SM_GROQ:{enabled:()=>false}});
eval(src);
const bank=JSON.parse(fs.readFileSync(root+'/web/data/exercise-bank-2026-2027.json','utf8')).records;
const out=window.smQualityFilter(bank);
assert.equal(out.filter(window.smIsGenericQuestion).length,0,'generic template questions must be removed');
const gen=out.filter(r=>r.content_origin==='generated_verified_math');
assert(gen.length>=100,'generated maths present');
gen.forEach(r=>{assert.equal(new Set(r.choices).size,4);assert.equal(r.choices[r.answer_index],r.solution);assert(r.question&&r.explanation)});
assert.equal(new Set(out.map(r=>r.id)).size,out.length,'ids unique');
['school-assessments-archive-2017-2026','exam-archive-2026-2027','pdf-acquisition-2026-2027','external-exam-library'].forEach(n=>assert(!fs.existsSync(root+'/web/data/'+n+'.json'),n+' must be removed'));
const app=fs.readFileSync(root+'/web/app.js','utf8');
['school-assessments-archive','exam-archive-2026','pdf-acquisition','external-exam-library'].forEach(n=>assert(!app.includes("fetch('./data/"+n),n+' must not be fetched'));
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2-pro.js'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('v2-pro.js'));
assert(typeof window.testBankHomePage==='function'&&typeof window.smartTeacherPool==='function'&&typeof window.offlineTutorReply==='function');
console.log('PASS: v2.0.0 — filter, verified maths ('+gen.length+'), archive data removed, wiring');
