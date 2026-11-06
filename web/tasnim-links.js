/* SM SCHOOL AI — Tasnim (t-onec.com) exam links, one compact card per grade.
   Links only: the exams belong to their authors and the site; nothing is copied into the app.
   v1.19.0: the old build pointed to a mistyped domain (h-onec.com); the pages below are on t-onec.com. */
const TASNIM_BASE='https://www.t-onec.com/p/';
function tasnimExamUrl(g){
 const n=x=>({'الأولى':1,'الثانية':2,'الثالثة':3,'الرابعة':4,'الخامسة':5})[String(x).split(' ')[0]];
 const num=n(g);if(!num)return '';
 if(/ابتدائي/.test(g))return `${TASNIM_BASE}exams-${num}ap.html`;
 if(/متوسط/.test(g))return `${TASNIM_BASE}exams-${num}am.html`;
 if(/ثانوي/.test(g))return `${TASNIM_BASE}exams-${num}as.html`;
 return '';
}
function tasnimPanel(g){
 const ar=typeof lang!=='undefined'?lang==='ar':true,fr=typeof lang!=='undefined'&&lang==='fr';
 const url=tasnimExamUrl(g);if(!url)return '';
 const a=(href,txt,cls)=>`<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
 return `<section class="panel tasnim-panel"><div class="learning-meta"><b>📥 ${ar?'فروض واختبارات مع الحلول — تسنيم':fr?'Devoirs et examens corrigés — Tasnim':'Exams with solutions — Tasnim'}</b></div>`+
  `<p>${ar?`مواضيع «${g}» بصيغة Word وPDF على موقع تسنيم. يفتح الرابط في المتصفح، وتُحمَّل الملفات من هناك.`:fr?`Sujets « ${g} » (Word, PDF) sur le site Tasnim ; le lien s’ouvre dans le navigateur.`:`“${g}” papers (Word, PDF) on the Tasnim site; the link opens in your browser.`}</p>`+
  `<div class="toolbar">${a(url,ar?`مواضيع ${g}`:fr?`Sujets ${g}`:`${g} papers`,'primary-btn')}${a(TASNIM_BASE+'exams-homework.html',ar?'كل المستويات':fr?'Tous les niveaux':'All levels','secondary-btn')}</div></section>`;
}
