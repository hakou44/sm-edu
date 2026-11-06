const assert=require('assert'),fs=require('fs'),vm=require('vm');
const root=__dirname+'/..',src=fs.readFileSync(root+'/web/groq-direct.js','utf8');
const store={};const calls=[];
const ctx={console,Response,lang:'ar',toast:()=>{},tutorServerPanel:()=>'<base/>',
 localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
 document:{getElementById:()=>null,querySelector:()=>null}};
ctx.window=ctx;ctx.fetch=async(u,i)=>{calls.push([u,i]);
 if(u.includes('api.groq.com')){return new Response(JSON.stringify({choices:[{message:{content:' شرح الدرس '}}]}),{status:200})}
 return new Response('{"answer":"server"}',{status:200})};
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const body=JSON.stringify({task:'lesson',message:'الكسور',language:'ar',grade:'3AP',subject:'رياضيات',learner_name:'Secret Name',learning_context:'x'});
 // no key -> server path untouched
 let r=await ctx.fetch('/api/v1/ai/tutor',{method:'POST',body});assert.equal((await r.json()).answer,'server');
 assert.equal(calls.length,1);assert(!calls[0][0].includes('groq'));
 // key saved -> Groq path, auth header, learner name not sent
 store.smSchoolGroqKey='gsk_'+'a'.repeat(30);
 r=await ctx.fetch('https://x.example/api/v1/ai/tutor',{method:'POST',body});const d=await r.json();
 assert.equal(d.mode,'groq');assert.equal(d.answer,'شرح الدرس');
 const g=calls[calls.length-1];assert(g[0].startsWith('https://api.groq.com/openai/v1/chat/completions'));
 assert.equal(g[1].headers.Authorization,'Bearer '+store.smSchoolGroqKey);
 assert(!g[1].body.includes('Secret Name'));
 // legacy chat endpoint also routes directly through Groq
 const chatBody=JSON.stringify({message:'اشرح الجمع',language:'ar',grade:'3AP',subject:'رياضيات'});
 r=await ctx.fetch('/api/v1/ai/chat',{method:'POST',body:chatBody});assert.equal((await r.json()).mode,'groq');
 assert(calls[calls.length-1][1].body.includes('اشرح الجمع'));
 // other endpoints untouched
 const n=calls.length;await ctx.fetch('/api/v1/curriculum/governance');assert(!calls[n][0].includes('groq'));
 assert(src.includes('https://api.groq.com/openai/v1'),'direct Groq endpoint must be configured');
 // 401 handled
 ctx.fetch=async()=>new Response('{}',{status:401});vm.runInContext('0',ctx);
 assert(ctx.tutorServerPanel().includes('groqKeyInput'));
 assert(!fs.readFileSync(root+'/web/app.js','utf8').includes('smSchoolGroqKey'),'key must stay out of backups');
 console.log('groq direct tests: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
