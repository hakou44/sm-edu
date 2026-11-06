const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync(__dirname+'/../web/app.js','utf8');
assert(app.includes("const allowedPages=new Set(['home','progress','tutor','teacher',...Object.keys(pageInfo)]);if(!p||!allowedPages.has(p))return;"),
  'go() must allow all special pages as well as pageInfo-backed pages');
for(const page of ['home','progress','tutor','teacher','studycenter','library','exercises','tests','videos','certificates','computing','translate','parents','homeschool']){
  assert(app.includes("'"+page+"'"), 'navigation page is declared: '+page);
}
console.log('navigation route guard tests passed');
