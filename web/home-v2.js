/* SM éducation v2.1.3-r2 — clear home screen (action tiles) + grouped "More" menu. Loaded last. */
(function(){
 'use strict';
 const L=()=>(typeof lang!=='undefined'?lang:'ar');
 const tr=(ar,fr,en)=>L()==='ar'?ar:L()==='fr'?fr:en;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 /* ---------- Home: what do you want to do? ---------- */
 const TILES=[
  ['library','📖',['تعلّم','Apprendre','Learn'],['كتب ودروس تكميلية','Manuels et leçons','Books & lessons']],
  ['exercises','✎',['تمرّن','S’entraîner','Practice'],['تمارين مع الحلول','Exercices corrigés','Exercises with solutions']],
  ['tests','▣',['اختبر نفسك','Se tester','Test yourself'],['اختبارات وفروض','Tests et devoirs','Tests & exams']],
  ['teacher','🎓',['المعلم الذكي','Enseignant IA','Smart teacher'],['شرح ثم تقييم','Explication puis évaluation','Explain then assess']],
  ['tutor','✧',['المساعد الذكي','Assistant IA','AI assistant'],['اسأل وستجد شرحاً','Posez vos questions','Ask anything']],
  ['computing','⌘',['الذكاء الاصطناعي والحوسبة','IA et informatique','AI & computing'],['برمجة وروبوتيك','Code et robotique','Coding & robotics']],
  ['videos','▷',['فيديوهات الشرح','Vidéos','Videos'],['شروح مرئية','Cours en vidéo','Video lessons']],
  ['certificates','☆',['الشهادات','Examens nationaux','National exams'],['BEM و BAC','BEM et BAC','BEM & BAC']]
 ];
 function home2(){
  const stats=(typeof progressStats==='function')?progressStats():{total:0,accuracy:0,today:0};
  const g=(typeof grade!=='undefined')?grade:'';
  const i=L()==='ar'?0:L()==='fr'?1:2;
  const goal=Math.min(100,(stats.today||0)/3*100);
  return `<section class="panel home2-hero"><div><small>${tr('مرحباً بك في','Bienvenue sur','Welcome to')} SM éducation</small><h2>${esc(g)}</h2><p>${tr('اختر ما تريد فعله اليوم','Que voulez-vous faire aujourd’hui ?','What would you like to do today?')}</p></div><button class="primary-btn" onclick="go('exercises')">${tr('ابدأ تمريناً','Commencer','Start')} ←</button></section>`+
   `<div class="home2-grid">${TILES.map(t=>`<button type="button" class="home2-tile" onclick="go('${t[0]}')"><span class="home2-ic">${t[1]}</span><b>${esc(t[2][i])}</b><small>${esc(t[3][i])}</small></button>`).join('')}</div>`+
   `<section class="panel progress-summary"><div><b>${tr('هدف اليوم','Objectif du jour','Daily goal')}</b><small>${tr('أنجز 3 أنشطة تعليمية اليوم','Terminez 3 activités aujourd’hui','Complete 3 activities today')}</small></div><div class="goal-track"><span style="width:${goal}%"></span></div><strong>${Math.min(stats.today||0,3)} / 3</strong><button class="secondary-btn" onclick="go('progress')">${tr('تقدمي الدراسي','Mon progrès','My progress')} ↗</button></section>`+
   `<div class="stats-grid"><div class="stat-card"><div class="stat-icon">◷</div><div><b>${stats.total||0}</b><small>${tr('الأنشطة المنجزة','Activités terminées','Completed activities')}</small></div></div><div class="stat-card"><div class="stat-icon">✧</div><div><b>${stats.accuracy||0}%</b><small>${tr('الإجابات الصحيحة','Bonnes réponses','Correct answers')}</small></div></div></div>`;
 }
 window.home=home2;
 try{if(typeof page!=='undefined'&&page==='home'&&typeof window.render==='function')window.render()}catch(e){}

 /* ---------- "More" menu: grouped with headings ---------- */
 const GROUPS=[
  [['التعلّم','Apprendre','Learn'],['library','videos','computing','studycenter','homeschool']],
  [['أدوات ذكية','Outils intelligents','Smart tools'],['teacher','translate']],
  [['الامتحانات والأولياء','Examens et parents','Exams & parents'],['certificates','parents']]
 ];
 function regroup(){
  const box=document.getElementById('navMoreBox');if(!box)return;
  const items=[...box.querySelectorAll('.nav-item')];if(!items.length)return;
  box.querySelectorAll('.nav-group-title').forEach(x=>x.remove());
  const used=new Set(),i=L()==='ar'?0:L()==='fr'?1:2,frag=document.createDocumentFragment();
  GROUPS.forEach(([title,pages])=>{
   const mine=pages.map(p=>items.find(b=>b.dataset.page===p)).filter(Boolean);if(!mine.length)return;
   const h=document.createElement('div');h.className='nav-group-title';h.textContent=title[i];frag.appendChild(h);
   mine.forEach(b=>{used.add(b);frag.appendChild(b)});
  });
  items.filter(b=>!used.has(b)).forEach(b=>frag.appendChild(b));
  box.appendChild(frag);
 }
 regroup();
 if(typeof window.render==='function'){const _r=window.render;window.render=function(){const out=_r.apply(this,arguments);try{regroup()}catch(e){}return out}}
})();
