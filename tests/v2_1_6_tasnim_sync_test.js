// v2.1.6: the Tasnim fetch script can be started from inside the app (GitHub Actions workflow_dispatch).
const fs=require('fs'),assert=require('assert'),root=__dirname+'/..';
const els={},toasts=[],store={};let confirmAnswer=true,calls=[];
global.window=global;global.lang='ar';global.page='tests';
global.toast=m=>toasts.push(m);global.confirm=()=>confirmAnswer;
global.localStorage={getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
global.handleAppBack=()=>{};global.history={pushState(){},back(){}};
global.document={getElementById:id=>els[id]||null,createElement:()=>({style:{},click(){},remove(){}}),body:{style:{},appendChild(el){if(el.id)els[el.id]=el}}};
global.SM_SCHOOL_CONFIG={publicContentBase:'https://hakou44.github.io/sm-school-ai'};
let latestRun={id:7,status:'completed',conclusion:'success',created_at:'2026-11-01T00:00:00Z'};
global.fetch=async(u,o={})=>{
 calls.push({u,o});
 if(u.includes('/data/tasnim-index.json')||u==='./data/tasnim-index.json')return new Response(JSON.stringify({documents:[]}),{status:200});
 if(u.startsWith('https://api.github.com/')){
  if(!/Bearer github_pat_/.test(o.headers.Authorization))return new Response('{}',{status:401});
  if(o.method==='POST')return new Response(null,{status:204});
  return new Response(JSON.stringify({workflow_runs:[latestRun]}),{status:200});
 }
 return new Response('nope',{status:404});
};
const lib=fs.readFileSync(root+'/web/tasnim-library.js','utf8');
eval(lib);
const T=window.SM_TASLIB._t,A=window.SM_TASLIB;
(async()=>{
 // static checks
 assert(lib.includes('publish-learning-content.yml')&&lib.includes('/dispatches'),'dispatch endpoint');
 assert(!/github_pat_[A-Za-z0-9_]{20,}/.test(lib),'no token in source');
 const wf=fs.readFileSync(root+'/.github/workflows/publish-learning-content.yml','utf8');
 assert(wf.includes('inputs:')&&wf.includes('FETCH_GRADES')&&wf.includes('"${ARGS[@]}"'),'workflow inputs wired through env');
 const step=wf.split('Refresh licensed Tasnim library politely')[1].split('- name:')[0];
 const script=step.split('run: |')[1];
 assert(script&&!script.includes('${{'),'no expression interpolation inside the run script (shell injection)');
 const sw=fs.readFileSync(root+'/web/sw.js','utf8');
 assert(sw.includes("api.github.com")&&sw.includes('sm-school-ai-v2.1.6'),'service worker bypasses GitHub API');
 // repo derived from publicContentBase; panel rendered, buttons disabled without token
 assert.equal(T.repoSlug(),'hakou44/sm-school-ai');
 let html=T.syncHtml();assert(html.includes('tlSyncStatus')&&html.includes('disabled')&&!html.includes('clearToken'));
 // validation
 assert.equal(A.saveSync('short','hakou44/sm-school-ai'),false);
 assert.equal(A.saveSync('github_pat_'+'x'.repeat(30),'https://github.com/Hakou44/sm-school-ai.git'),true);
 assert.equal(T.repoSlug(),'Hakou44/sm-school-ai');
 html=T.syncHtml();assert(html.includes('clearToken')&&!html.includes('github_pat_x'),'token never rendered back');
 // status
 calls=[];els.tlSyncStatus={textContent:''};
 await A.syncStatus();
 assert(calls[0].u.startsWith('https://api.github.com/repos/Hakou44/sm-school-ai/actions/workflows/publish-learning-content.yml/runs'));
 assert(els.tlSyncStatus.textContent.includes('✅'));
 // run for one grade
 T.S.grade='الثانية متوسط';calls=[];
 assert.equal(await A.runSync('grade'),true);
 const post=calls.find(c=>c.o.method==='POST');
 assert(post&&post.u.endsWith('/actions/workflows/publish-learning-content.yml/dispatches'));
 const body=JSON.parse(post.o.body);assert.equal(body.ref,'main');assert.equal(body.inputs.grades,'الثانية متوسط');assert.equal(body.inputs.content,'all');
 assert(els.tlSyncStatus.textContent.includes('⏳'));
 // no double run while one is in progress
 latestRun={id:8,status:'in_progress',created_at:'2026-11-06T00:00:00Z'};calls=[];
 await A.runSync('all');
 assert(!calls.some(c=>c.o.method==='POST'),'must not start a second run');
 // user cancels confirm -> nothing sent
 latestRun={id:9,status:'completed',conclusion:'success'};confirmAnswer=false;calls=[];
 assert.equal(await A.runSync('all'),false);assert.equal(calls.length,0);
 // bad token -> readable error
 confirmAnswer=true;store.smGhActionsToken='bad_token_value_that_is_long_enough';calls=[];
 assert.equal(await A.runSync('all'),false);assert(/المفتاح غير صالح/.test(toasts[toasts.length-1]));
 // race: right after dispatch GitHub still lists the OLD run -> keep waiting, then follow the new one to completion
 store.smGhActionsToken='github_pat_'+'y'.repeat(30);T.SY.since=0;T.SY.watch=false;T.SY.timer&&clearTimeout(T.SY.timer);T.SY.timer=null;
 latestRun={id:20,status:'completed',conclusion:'success',created_at:'2026-01-01T00:00:00Z'};
 assert.equal(await A.runSync('all'),true);
 await A.syncStatus(true);
 assert(els.tlSyncStatus.textContent.includes('⏳')&&T.SY.since>0,'old run must not end the watch');
 latestRun={id:21,status:'in_progress',created_at:new Date().toISOString()};
 await A.syncStatus(true);
 assert(T.SY.since===0&&T.SY.watch&&els.tlSyncStatus.textContent.includes('⏳'));
 const before=calls.filter(c=>c.u.includes('tasnim-index')).length;
 latestRun={id:21,status:'completed',conclusion:'success',created_at:latestRun.created_at};
 await A.syncStatus(true);
 assert(calls.filter(c=>c.u.includes('tasnim-index')).length>before,'index refreshed after the new run succeeds');
 T.SY.timer&&clearTimeout(T.SY.timer);
 // removing token
 A.clearToken();assert(!store.smGhActionsToken);
 console.log('PASS: v2.1.6 Tasnim fetch script can be started and followed from the app via GitHub Actions');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
