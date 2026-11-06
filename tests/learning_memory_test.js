const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage={smSchoolProgress:JSON.stringify([
 {learnerId:'a',subject:'Math',correct:8,total:10,date:'2026-10-01'},
 {learnerId:'a',subject:'Math',correct:4,total:10,date:'2026-10-10'},
 {learnerId:'a',subject:'Science',correct:2,total:5,date:'2026-10-11'},
 {learnerId:'b',subject:'Math',correct:0,total:10,date:'2026-10-11'}
]),smSchoolLearningErrors:JSON.stringify([
 {learnerId:'a',topic:'Fractions'},{learnerId:'a',topic:'Fractions'},
 {learnerId:'b',topic:'Geometry'},{learnerId:'a',topic:'Decimals'}
]),smSchoolReasoningRecords:JSON.stringify([
 {learnerId:'a',subject:'Math',reasoning:'I split the number'},
 {learnerId:'b',subject:'Math',reasoning:'private other learner'}
])};
const localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>delete storage[k]};
const ctx={localStorage,lang:'ar',getProgress:()=>JSON.parse(storage.smSchoolProgress),activeLearner:()=>({id:'a'}),toast:()=>{},render:()=>{},escapeReviewText:x=>String(x).replace(/</g,'&lt;')};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/learning-memory.js','utf8'),ctx);
const e=ctx.learningMemoryEvidence('a');
assert.equal(e.activities,3);assert.equal(e.totalAnswers,25);assert.equal(e.overallAccuracy,56);
assert.equal(e.subjects.length,2);assert.equal(e.subjects.find(x=>x.subject==='Math').total,20);
assert.equal(e.recurringMistakes[0].label,'Fractions');assert.equal(e.reasoningEntries,1);
assert(!JSON.stringify(e).includes('private other learner'));
const panel=ctx.learningMemoryPanel({id:'a',name:'Learner A'});
assert(panel.includes('الذاكرة التعليمية طويلة المدى'));assert(panel.includes('Fractions'));
ctx.learningMemorySnapshot('a',new Date('2026-11-03T12:00:00Z'));
ctx.learningMemorySnapshot('a',new Date('2026-11-03T14:00:00Z'));
let snaps=JSON.parse(storage.smSchoolLearningMemory);assert.equal(snaps.length,1);assert.equal(snaps[0].learnerId,'a');
ctx.learningMemorySnapshot('b',new Date('2026-11-04T12:00:00Z'));
snaps=JSON.parse(storage.smSchoolLearningMemory);assert.equal(snaps.length,2);
assert.equal(ctx.learningMemorySaveActive(),true);
console.log('PASS: learner-isolated long-term memory, evidence thresholds, recurring errors, privacy, snapshots and panel rendering');
