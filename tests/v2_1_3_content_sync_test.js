const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const cfg=fs.readFileSync(path.join(root,'web/config.js'),'utf8');
assert(cfg.includes('publicContentBase'));
const sync=fs.readFileSync(path.join(root,'web/ai-course-sync.js'),'utf8');
assert(sync.includes("base+'/data/ai-course-updates.json'"));
const lib=fs.readFileSync(path.join(root,'web/tasnim-library.js'),'utf8');
assert(lib.includes("base()+'/data/tasnim-index.json'")===false); // URL is composed through indexUrl()
assert(lib.includes("contentBase()+'/data/tasnim-index.json'"));
assert(lib.includes('async function refreshIndex()'));
assert(lib.includes('INDEX_CACHE'));
const feed=JSON.parse(fs.readFileSync(path.join(root,'web/data/ai-course-updates.json'),'utf8'));
assert.equal(feed.schema_version,1);
assert(feed.lessons.length>=2);
for(const x of feed.lessons){
 assert(/^[a-z0-9][a-z0-9-]{2,70}$/i.test(x.id));
 assert(Number.isInteger(x.m)&&x.m>=0&&x.m<=4);
 assert(x.t&&typeof x.t.ar==='string'&&typeof x.sum==='string'&&Array.isArray(x.pts)&&x.pts.length>0);
 assert(typeof x.ex==='string'&&Array.isArray(x.q)&&x.q.length>0);
 for(const q of x.q)assert(Array.isArray(q.c)&&q.c.length>=2&&Number.isInteger(q.a)&&q.a>=0&&q.a<q.c.length&&typeof q.w==='string');
}
const workflow=fs.readFileSync(path.join(root,'.github/workflows/publish-learning-content.yml'),'utf8');
assert(workflow.includes('schedule:'));
assert(workflow.includes('--confirm-permission'));
assert(workflow.includes('actions/deploy-pages@v4'));
console.log('v2.1.3 content feed and publishing tests passed');
