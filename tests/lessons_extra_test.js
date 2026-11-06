const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/lessons-extra.js','utf8');
const base=[{g:'primary',s:'اللغة العربية',title:{ar:'x'},goal:{ar:'x'},body:{ar:'x'},task:{ar:'x'},answer:{ar:'x'}}];
const ctx={starterLessons:base.slice()};vm.createContext(ctx);
vm.runInContext(src,ctx);const n1=ctx.starterLessons.length;
vm.runInContext(src,ctx);assert.equal(ctx.starterLessons.length,n1,'loading twice must not duplicate lessons');
const extra=ctx.starterLessons.filter(x=>x.gr);assert.equal(extra.length,n1-1);assert(extra.length>=110,'at least 110 extra lessons');
const focus={'الثالثة ابتدائي':['primary',['اللغة العربية','الرياضيات','التربية الإسلامية','التربية العلمية والتكنولوجية','التاريخ والجغرافيا','التربية المدنية','اللغة الإنجليزية']],
 'الثانية متوسط':['middle',['اللغة العربية','الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية والتكنولوجيا','التاريخ والجغرافيا','التربية الإسلامية','التربية المدنية','الإعلام الآلي']],
 'الرابعة متوسط':['middle',['اللغة العربية','الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية والتكنولوجيا','التاريخ والجغرافيا','التربية الإسلامية','التربية المدنية','الإعلام الآلي']],
 'الأولى ثانوي':['secondary',['اللغة العربية','الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','العلوم الطبيعية','العلوم الفيزيائية','التاريخ والجغرافيا','الإعلام الآلي','العلوم الإسلامية']]};
for(const [gr,[g,subs]] of Object.entries(focus))for(const s of subs){const m=extra.filter(x=>x.gr===gr&&x.g===g&&x.s===s);assert(m.length>=2,`${gr} / ${s}: at least 2 lessons (found ${m.length})`)}
const seen=new Set();
for(const x of extra){assert(focus[x.gr]&&focus[x.gr][0]===x.g,'grade/stage pair '+x.gr);assert(focus[x.gr][1].includes(x.s),`subject ${x.s} belongs to ${x.gr}`);
 for(const k of ['title','goal','body','task','answer']){assert(x[k]&&typeof x[k].ar==='string'&&x[k].ar.trim().length>2,`${x.title.ar}: ${k}`)}
 assert(x.body.ar.length>=40,'body not trivial: '+x.title.ar);assert(!/TODO|lorem|\?\?\?/i.test(JSON.stringify(x)),'no placeholders');
 const key=x.gr+'|'+x.s+'|'+x.title.ar;assert(!seen.has(key),'duplicate '+key);seen.add(key)}
console.log(`PASS: ${extra.length} extra lessons across ${new Set(extra.map(x=>x.gr+x.s)).size} grade/subject pairs, structure, coverage and idempotent loading`);
