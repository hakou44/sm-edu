const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={
 window:{SM_AI_TR:{}},
 dict:{ar:{},fr:{},en:{}},
 lang:'ar',page:'computing',
 escapeReviewText:s=>String(s),
 localStorage:{getItem:()=>null,setItem:()=>{}},
 LOCAL_BACKUP_KEYS:[],
 document:{addEventListener:()=>{},getElementById:()=>null,body:{style:{}}},
 navigator:{onLine:false},
 console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/ai-course-i18n.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/ai-course.js'),'utf8'),ctx);
const lessons=ctx.window.SM_AI_COURSE.lessons;
const robotics=lessons.filter(x=>x.m===4);
assert.equal(robotics.length,4,'robotics path should include four lessons');
assert(robotics.every(x=>ctx.window.SM_AI_TR[x.id]?.fr?.sum&&ctx.window.SM_AI_TR[x.id]?.en?.sum),'robotics lessons should have French and English translations');
assert(robotics.every(x=>x.q.length>=2&&x.q.every(q=>q.a>=0&&q.a<q.c.length)),'robotics quiz answer indexes should be valid');
assert.equal(ctx.window.SM_AI_COURSE.lessons.length>=18,true);
const dlctx={window:{},document:{addEventListener:()=>{},body:{style:{}}},navigator:{},URL,Blob,File,Date,Math,localStorage:{}};
vm.createContext(dlctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/download-center.js'),'utf8'),dlctx);
const html=dlctx.window.SM_STUDY_DOWNLOAD._test.htmlDoc({title:'اختبار',grade:'الأولى متوسط',subject:'رياضيات',term:'الفصل الأول'},[{question:'2+2؟',choices:['3','4'],answer_index:1,solution:'نجمع العددين.'}]);
assert(html.includes('SM éducation')&&html.includes('الإجابة الصحيحة')&&html.includes('نجمع العددين.'),'downloaded document should contain answer and correction');
const index=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
assert(index.includes('<title>SM éducation</title>')&&index.includes('download-center.js')&&index.includes('ai-course-sync.js'));
assert(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8').includes('SM éducation'));
assert(fs.readFileSync(path.join(root,'web/config.js'),'utf8').includes('smFetchJSON'),'shared JSON loader retained');
assert(fs.existsSync(path.join(root,'web/icons/icon-512.png')));
console.log('PASS: v2.1.3 branding, robotics lessons/translations, in-app study document generation and update wiring');
