const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../web/app.js','utf8');
const ctx={Date,Number,String,Array,Object,Math,lang:'ar',escapeReviewText:x=>String(x)};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('function parentWeeklySummary('),src.indexOf('function parentDashboard('))+';this.summary=parentWeeklySummary;this.panel=parentWeeklyPanel;this.plan=parentWeeklyPlan;',ctx);
const now=new Date('2026-11-02T12:00:00Z');
const rows=[
 {date:'2026-11-02',subject:'الرياضيات',correct:2,total:5},
 {date:'2026-11-01',subject:'الرياضيات',correct:1,total:5},
 {date:'2026-10-30',subject:'اللغة العربية',correct:5,total:5},
 {date:'2026-10-25',subject:'خارج الفترة',correct:0,total:10},
 {date:'2026-11-03',subject:'مستقبل',correct:0,total:10},
 {date:'2026-11-02',subject:'العلوم',correct:9,total:10}
];
const w=ctx.summary(rows,now);
assert.equal(w.from,'2026-10-27');assert.equal(w.to,'2026-11-02');
assert.equal(w.activities,4);assert.equal(w.total,25);assert.equal(w.correct,17);assert.equal(w.accuracy,68);
assert(w.needsSupport.some(x=>x.subject==='الرياضيات'));
assert(w.strong.some(x=>x.subject==='العلوم'));
assert(!w.needsSupport.some(x=>x.subject==='اللغة العربية'),'less than five answers must not trigger a warning');
const empty=ctx.summary([],now);assert.equal(empty.activities,0);assert.equal(empty.accuracy,0);
ctx.lang='ar';const html=ctx.panel(rows);assert(html.includes('ملخص الأسبوع الأخير'));assert(html.includes('توصية للأسبوع القادم'));assert(html.includes('لا يُعد تقييماً رسمياً'));
ctx.lang='fr';assert(ctx.panel(rows).includes('Bilan des 7 derniers jours'));
ctx.lang='en';assert(ctx.panel(rows).includes('Last 7 days'));
ctx.lang='ar';const plan=ctx.plan(w);assert.equal(plan.length,7);assert.equal(plan[0].subject,'الرياضيات');assert(plan[0].task.includes('درس قصير'));assert.equal(plan[6].day,7);
ctx.lang='ar';const planned=ctx.panel(rows);assert(planned.includes('خطة منزلية مقترحة للأيام السبعة القادمة'));assert(planned.includes('اليوم 1'));
console.log('PASS: parent weekly summary date window, thresholds, aggregation and multilingual panel');
