const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../web/learning-diagnostics.js','utf8');
const ctx={lang:'ar',level:'primary',grade:'السنة الرابعة ابتدائي',subjectsForCurrentGrade:()=>['الرياضيات','اللغة العربية'],escapeReviewText:x=>String(x).replace(/[&<>"']/g,''),getProgress:()=>[],activeLearner:()=>({id:'kid',name:'طفل',grade:'السنة الرابعة ابتدائي'}),smartTeacherPool:()=>[],localStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:()=>null},Date,JSON,Math,Number,String,Array,Object,toast:()=>{}};
vm.createContext(ctx);vm.runInContext(source+';this.panel=educationalIntelligencePanel;this.start=startEducationalDiagnostic;this.remediate=generateEducationalRemediation;',ctx);
const html=ctx.panel({id:'kid',name:'طفل',grade:'السنة الرابعة ابتدائي'});
for(const term of ['اختبار تشخيصي أولي','تصحيح الإجابات الكتابية','درس علاجي حسب الأخطاء','امتحان فصلي محاكي'])assert(html.includes(term),`missing ${term}`);
assert(html.includes('eiDiagnosticSubject')&&html.includes('eiWrittenAnswer')&&html.includes('eiExamTerm'));
console.log('PASS: v1.8.1 educational intelligence dashboard exposes diagnostic, written correction, remediation and term exam workflows');
