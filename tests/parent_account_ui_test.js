const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
const store=new Map();let renders=0;
const ctx={lang:'en',page:'parents',apiBase:()=>'',localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},escapeReviewText:x=>String(x).replace(/[&<>"']/g,''),render:()=>renders++,fetch:async()=>({ok:true,json:async()=>({parent:{id:1,name:'Parent Test',email:'parent@test.example',role:'parent'},access_token:'opaque-token'})}),document:{getElementById:id=>({value:id==='parentName'?'Parent Test':id==='parentEmail'?'parent@test.example':'StrongPassword123!'})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../web/parent-account.js','utf8'),ctx);
let html=ctx.parentAccountPanel();assert(html.includes('Sign in')&&html.includes('Create account')&&html.includes('Parents only'));
ctx.parentAuthMode='register';html=ctx.parentAccountPanel();assert(html.includes('Parent full name'));
ctx.parentAuthMode='login';await ctx.submitParentAuth();assert.equal(ctx.parentAuthUser.role,'parent');assert.equal(store.get('smSchoolParentAccessToken'),'opaque-token');html=ctx.parentAccountPanel();assert(html.includes('Parent Test')&&html.includes('Change password')&&html.includes('Secure device sync'));
assert(renders>=1);console.log('PASS: parent-only UI modes, registration/login token handling and local-data privacy notice');
})().catch(e=>{console.error(e);process.exitCode=1});
