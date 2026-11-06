// v2.0.1: in-app Tasnim library — filters, download with progress, bulk download, on-device store, viewer, back button.
const fs=require('fs'),assert=require('assert'),root=__dirname+'/..';
const els={};let pushed=0,backs=0,origBack=0,toasts=[];
global.window=global;global.lang='ar';global.page='tests';
global.toast=m=>toasts.push(m);global.confirm=()=>true;
global.handleAppBack=()=>{origBack++};
global.history={pushState(){pushed++},back(){backs++}};
global.document={getElementById:id=>els[id]||null,
 createElement:()=>({style:{},click(){},remove(){delete els[this.id]},set href(v){this._h=v},get href(){return this._h}}),
 body:{style:{},appendChild(el){if(el.id)els[el.id]=el}}};
const G='الثانية متوسط',PDF=n=>Buffer.concat([Buffer.from('%PDF-1.4\n'),Buffer.alloc(n,65)]);
const index={documents:[
 {title:'اختبارات الفصل الاول الرياضيات 2022-2023 رقم 01',grade:G,subject:'الرياضيات',term:1,season:'2022-2023',file:'exams/2am/math/a.pdf',solution:false,bytes:300},
 {title:'فروض الفصل الثالث الرياضيات 2019-2020 (تحميل الحل)',grade:G,subject:'الرياضيات',term:3,season:'2019-2020',file:'exams/2am/math/c2.pdf',solution:true,bytes:300},
 {title:'اختبار اللغة العربية الفصل الثاني 2023-2024',grade:G,subject:'اللغة العربية',term:2,season:'2023-2024',file:'exams/2am/arabic/b.pdf',solution:false,bytes:300},
 {title:'موضوع تالف',grade:G,subject:'اللغة العربية',term:1,season:'2021-2022',file:'exams/2am/arabic/bad.pdf',solution:false},
 {title:'موضوع غير موجود',grade:G,subject:'اللغة العربية',term:1,season:'2020-2021',file:'exams/2am/arabic/missing.pdf',solution:false},
 {title:'ملف وورد',grade:G,subject:'التاريخ والجغرافيا',term:1,season:'2022-2023',file:'exams/2am/hist/w.docx',solution:false,bytes:50},
 {title:'سنة أخرى',grade:'الأولى متوسط',subject:'الرياضيات',term:1,file:'exams/1am/math/z.pdf',solution:false}]};
const files={'exams/2am/math/a.pdf':PDF(300),'exams/2am/math/c2.pdf':PDF(300),'exams/2am/arabic/b.pdf':PDF(300),
 'exams/2am/arabic/bad.pdf':Buffer.from('<html>not a pdf</html>'),'exams/2am/hist/w.docx':Buffer.from('PK\x03\x04word')};
global.fetch=async u=>{
 if(u==='./data/tasnim-index.json')return new Response(JSON.stringify(index),{status:200});
 const b=files[u];if(!b)return new Response('nope',{status:404});
 return new Response(b,{status:200,headers:{'content-length':String(b.length)}});
};
eval(fs.readFileSync(root+'/web/tasnim-library.js','utf8'));
const T=window.SM_TASLIB._t;
(async()=>{
 // panel renders immediately, fills in after the index loads
 let html=window.tasnimPanel(G);
 assert(html.includes('id="tasLib"')&&html.includes('جارٍ التحميل'));
 els.tasLib={innerHTML:html};await T.load();
 html=els.tasLib.innerHTML;
 assert(html.includes('اختبارات الفصل الاول الرياضيات')&&!html.includes('سنة أخرى'),'only this grade');
 assert(html.includes('<option value="الرياضيات"')&&html.includes('t-onec.com'),'filters + source credit');
 assert(T.filtered().length===6);
 els.tlList={innerHTML:''};
 // filters
 window.SM_TASLIB.set('subject','الرياضيات');assert.equal(T.filtered().length,2);
 window.SM_TASLIB.set('term','3');assert.equal(T.filtered().length,1);
 window.SM_TASLIB.set('term','');window.SM_TASLIB.set('sol',true);assert.equal(T.filtered().length,1);assert(els.tlList.innerHTML.includes('مع الحل'));
 window.SM_TASLIB.set('sol',false);window.SM_TASLIB.set('subject','');
 window.SM_TASLIB.set('q','الأول');assert.equal(T.filtered().length,1,'search ignores alef forms (أ matches ا)');
 window.SM_TASLIB.set('q','');
 // bulk download: good files stored, html-as-pdf and 404 rejected, nothing half-saved
 await window.SM_TASLIB.downloadAll();
 assert.equal(T.have().size,4,'a, c2, b, w stored');
 assert(!T.have().has('exams/2am/arabic/bad.pdf')&&!T.have().has('exams/2am/arabic/missing.pdf'));
 assert(toasts.at(-1).includes('تم تنزيل 4 من 6')&&toasts.at(-1).includes('تعذّر 2'),toasts.at(-1));
 assert(els.tlList.innerHTML.includes('✅'));
 const rec=await T.store.get('exams/2am/math/a.pdf');
 assert(rec.blob.size>300&&rec.blob.type==='application/pdf');
 // opening a stored paper: in-app viewer, history entry, back button closes it first
 const iA=T.docs().findIndex(d=>d.file==='exams/2am/math/a.pdf');
 await window.SM_TASLIB.open(iA);
 assert(els.tlViewer&&els.tlViewer.innerHTML.includes('<iframe')&&T.S.view&&pushed===1);
 window.handleAppBack();assert(!T.S.view&&!els.tlViewer&&backs===1&&origBack===0,'back closes the viewer');
 window.handleAppBack();assert.equal(origBack,1,'back otherwise reaches the app handler');
 // Word files: no iframe, save action only
 await window.SM_TASLIB.open(T.docs().findIndex(d=>d.file.endsWith('.docx')));
 assert(els.tlViewer.innerHTML.includes('Word')&&!els.tlViewer.innerHTML.includes('<iframe'));
 window.SM_TASLIB.close();
 // opening an unstored paper downloads it first; a broken one reports an error and opens nothing
 await T.store.del('exams/2am/arabic/b.pdf');T.have().delete('exams/2am/arabic/b.pdf');
 await window.SM_TASLIB.open(T.docs().findIndex(d=>d.file==='exams/2am/arabic/b.pdf'));
 assert(T.have().has('exams/2am/arabic/b.pdf')&&T.S.view);window.SM_TASLIB.close();
 const n=toasts.length;await window.SM_TASLIB.open(T.docs().findIndex(d=>d.file.endsWith('bad.pdf')));
 assert(!T.S.view&&toasts.length===n+1&&toasts.at(-1).includes('تعذّر'));
 // delete this grade's downloads
 await window.SM_TASLIB.clearGrade();assert.equal(T.have().size,0);
 assert.equal(await T.store.get('exams/2am/math/a.pdf'),null);
 // config + wiring
 const cfg=fs.readFileSync(root+'/web/config.js','utf8');assert(cfg.includes('examsBase'));
 assert(fs.readFileSync(root+'/web/index.html','utf8').includes('tasnim-library.js'));
 const sw=fs.readFileSync(root+'/web/sw.js','utf8');
 assert(sw.includes('./tasnim-library.js')&&sw.includes('\\/exams\\/')&&sw.includes('if(r.ok)'));
 assert(fs.readFileSync(root+'/web/v2-pro.js','utf8').includes('window.tasnimPanel||tasnimPanel'),'test bank uses the library panel');
 console.log('PASS: Tasnim library — filters, bulk + single download, validation, on-device store, viewer, back button, wiring');
})().catch(e=>{console.error(e);process.exit(1)});
