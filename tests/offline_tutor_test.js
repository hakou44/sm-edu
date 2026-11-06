const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/offline-tutor.js','utf8');
const recs=[{grade:'الثالثة متوسط',subject:'الإعلام الآلي',topic:'الترقيم الثنائي',lesson:'من الثنائي إلى العشري',question:'حوّل 101 إلى العشري',solution:'5',explanation:'نجمع قوى العدد 2.',solution_steps:['1×4+0×2+1×1=5','الجواب 5'],choices:null},
 {grade:'الثالثة متوسط',subject:'الإعلام الآلي',topic:'الشبكات',lesson:'عنوان IP',question:'ما دور عنوان IP؟',solution:'تعريف جهاز',explanation:'يحدد الجهاز.',solution_steps:['a','b'],choices:['تعريف جهاز','x','y']}];
const ctx={lang:'ar',grade:'الثالثة متوسط',exerciseBankRecords:recs,localStorage:{getItem:()=>null},toast:()=>{},escapeReviewText:x=>x,window:{},fetch:async()=>({json:async()=>({records:recs})}),document:{getElementById:()=>null},String,Set,Array,JSON,Math,RegExp};
vm.createContext(ctx);vm.runInContext(src+';this.api={offlineTutorReply,otTokens}',ctx);
(async()=>{
 const a=await ctx.api.offlineTutorReply('اشرح لي الترقيم الثنائي','الإعلام الآلي','lesson');
 assert(a.includes('الترقيم الثنائي')&&a.includes('5')&&a.includes('غير متصل'));
 const b=await ctx.api.offlineTutorReply('ما هو عنوان IP','الإعلام الآلي','practice');
 assert(b.includes('IP')&&b.includes('الإجابات'));
 const c=await ctx.api.offlineTutorReply('كلمات غير موجودة xyz','الإعلام الآلي','lesson');
 assert(c.includes('جرّب'));
 const d=await ctx.api.offlineTutorReply('x','الفيزياء','lesson');assert.equal(d,null);
 console.log('PASS: offline tutor fallback — lesson match, practice with answers, no-match suggestions, null when no data');
})();
