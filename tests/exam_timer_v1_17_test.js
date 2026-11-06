const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('web/exam-timer-v1-17.js','utf8');
assert.doesNotThrow(()=>new vm.Script(code));
for(const token of ['renderActiveBankTest','durationMinutes','smExamClock','submitBankTest','setInterval','clearInterval'])assert(code.includes(token),`missing ${token}`);
console.log('v1.17.0 timed exam module tests: PASS');
