/* SM SCHOOL AI v2.1.0 — lightweight runtime status and accessibility helpers. */
(function(){
  'use strict';
  const labels = {
    ar: {online:'متصل بالإنترنت', offline:'دون اتصال — المحتوى المحمّل متاح', tip:'حالة اتصال الجهاز؛ لا تعني أن خادم الذكاء الاصطناعي متاح.'},
    fr: {online:'Connecté', offline:'Hors ligne — contenu téléchargé disponible', tip:'État réseau de l’appareil ; ne garantit pas la disponibilité du serveur IA.'},
    en: {online:'Online', offline:'Offline — downloaded content available', tip:'Device network status; this does not guarantee AI server availability.'}
  };
  const langNow=()=>['ar','fr','en'].includes(window.lang)?window.lang:'ar';
  function mount(){
    const host=document.querySelector('.top-actions');
    if(!host || document.getElementById('connectionStatus')) return;
    const el=document.createElement('span');
    el.id='connectionStatus';
    el.className='connection-status';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.title=labels[langNow()].tip;
    host.insertBefore(el,host.firstChild);
    update();
  }
  function update(){
    const el=document.getElementById('connectionStatus');
    if(!el)return;
    const online=navigator.onLine!==false, l=labels[langNow()];
    el.classList.toggle('is-offline',!online);
    el.innerHTML='<i aria-hidden="true"></i><span></span>';
    el.querySelector('span').textContent=online?l.online:l.offline;
    el.title=l.tip;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  const originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){const result=originalRender.apply(this,arguments);update();return result;};
  }
})();
