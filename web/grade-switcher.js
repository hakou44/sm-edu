/* SM éducation v2.1.4 — always-visible school level switcher (translated; follows the app language). */
(function(){
 'use strict';
 const bar=document.getElementById('gradeBar');
 if(!bar||typeof levels==='undefined'||typeof setGrade!=='function')return;
 const L=()=>{try{return typeof lang!=='undefined'?lang:'ar'}catch(e){return 'ar'}};
 const tr=(ar,fr,en)=>{const l=L();return l==='fr'?fr:l==='en'?en:ar};
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const groups=[['primary',['الابتدائي','Primaire','Primary']],['middle',['المتوسط','Moyen (collège)','Middle school']],['secondary',['الثانوي','Secondaire (lycée)','Secondary']]];
 const idx=()=>L()==='fr'?1:L()==='en'?2:0;
 bar.innerHTML='<label for="gradeSwitch"></label><select id="gradeSwitch">'+
  groups.map(([g])=>'<optgroup data-g="'+g+'">'+levels[g].map(x=>'<option value="'+esc(g)+'|'+esc(x)+'">'+esc(x)+'</option>').join('')+'</optgroup>').join('')+'</select>';
 const sel=document.getElementById('gradeSwitch');
 const label=bar.querySelector('label');
 const paint=()=>{
  const text=tr('المستوى الدراسي','Niveau scolaire','School level');
  label.textContent='📚 '+text;sel.setAttribute('aria-label',text);
  groups.forEach(([g,names])=>{const og=bar.querySelector('optgroup[data-g="'+g+'"]');if(og)og.label=names[idx()]});
 };
 const sync=()=>{try{paint();if(sel.value!==level+'|'+grade)sel.value=level+'|'+grade}catch(e){}};
 sel.addEventListener('change',()=>{const [g,n]=sel.value.split('|');setGrade(g,n)});
 const baseRender=window.render;
 if(typeof baseRender==='function'){window.render=function(){const r=baseRender.apply(this,arguments);sync();return r}}
 sync();
})();
