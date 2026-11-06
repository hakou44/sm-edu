/* SM SCHOOL AI v1.17.0 — timed practice exam support. */
(function(){
 'use strict';
 let timer=null;
 const original=window.renderActiveBankTest;
 if(typeof original!=='function')return;
 window.renderActiveBankTest=function(){
  if(timer){clearInterval(timer);timer=null;}
  original();
  const test=window.activeBankTest,mount=document.getElementById('bankTestMount');
  if(!test||!mount||test.submitted)return;
  const duration=Math.max(1,Number(test.durationMinutes)||Math.max(10,test.items.length*2));
  if(!test.startedAt)test.startedAt=Date.now();
  const header=mount.querySelector('.bank-test-head');
  if(header){const clock=document.createElement('strong');clock.id='smExamClock';clock.className='exam-clock';clock.setAttribute('role','timer');clock.setAttribute('aria-live','off');header.appendChild(clock);}
  const tick=()=>{
   const left=Math.max(0,duration*60000-(Date.now()-test.startedAt));
   const node=document.getElementById('smExamClock');
   if(node){const m=Math.floor(left/60000),s=Math.floor(left%60000/1000);node.textContent=`الوقت المتبقي ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;node.classList.toggle('is-warning',left<=60000);}
   if(left<=0){clearInterval(timer);timer=null;if(!test.submitted&&typeof window.submitBankTest==='function'){const notice=document.createElement('p');notice.className='notice';notice.textContent='انتهى الوقت؛ تم إنهاء الاختبار تلقائياً.';mount.prepend(notice);window.submitBankTest();}}
  };
  tick();timer=setInterval(tick,1000);
 };
 const submit=window.submitBankTest;
 if(typeof submit==='function')window.submitBankTest=function(){if(timer){clearInterval(timer);timer=null;}return submit.apply(this,arguments)};
})();
