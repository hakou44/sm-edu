/* SM SCHOOL AI v1.16.0 — Offline interactive learning labs. */
(function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labs=[
  {id:'percent',title:'النسبة المئوية',subject:'الرياضيات',desc:'احسب نسبة من قيمة.',fields:[['base','القيمة الأصلية','100'],['rate','النسبة %','25']],calc:v=>({value:v.base*v.rate/100,unit:'',steps:[`${v.base} × ${v.rate} ÷ 100`,`${v.base*v.rate/100}`]})},
  {id:'speed',title:'السرعة المتوسطة',subject:'الفيزياء',desc:'السرعة المتوسطة = المسافة ÷ الزمن.',fields:[['distance','المسافة (كم)','120'],['time','الزمن (ساعة)','2']],calc:v=>({value:v.time>0?v.distance/v.time:null,unit:'كم/ساعة',steps:[`السرعة = ${v.distance} ÷ ${v.time}`,v.time>0?`${(v.distance/v.time).toFixed(2)} كم/ساعة`:'الزمن يجب أن يكون أكبر من صفر']})},
  {id:'ohm',title:'قانون أوم',subject:'الفيزياء',desc:'احسب التوتر الكهربائي U = R × I.',fields:[['resistance','المقاومة (Ω)','10'],['current','شدة التيار (A)','2']],calc:v=>({value:v.resistance*v.current,unit:'V',steps:['U = R × I',`U = ${v.resistance} × ${v.current} = ${v.resistance*v.current} V`]})},
  {id:'density',title:'الكتلة الحجمية',subject:'العلوم الفيزيائية',desc:'الكتلة الحجمية = الكتلة ÷ الحجم.',fields:[['mass','الكتلة (غ)','200'],['volume','الحجم (سم³)','50']],calc:v=>({value:v.volume>0?v.mass/v.volume:null,unit:'غ/سم³',steps:['ρ = m ÷ V',v.volume>0?`ρ = ${v.mass} ÷ ${v.volume} = ${(v.mass/v.volume).toFixed(2)} غ/سم³`:'الحجم يجب أن يكون أكبر من صفر']})}
 ];
 function render(){const mount=document.getElementById('pageContent');if(!mount||!document.querySelector('.sc-panel')||document.getElementById('smLabHub'))return;
 const section=document.createElement('section');section.className='panel sc-panel';section.id='smLabHub';
 section.innerHTML=`<h3>🧪 المختبرات التفاعلية دون إنترنت</h3><p>محاكاة حسابية آمنة تساعد على فهم القوانين. ليست بديلاً عن التجارب المخبرية المدرسية.</p><div class="toolbar"><label for="smLabSelect">اختر المختبر</label><select id="smLabSelect">${labs.map(x=>`<option value="${x.id}">${esc(x.subject)} — ${esc(x.title)}</option>`).join('')}</select></div><div id="smLabBody" aria-live="polite"></div>`;mount.appendChild(section);
 const select=section.querySelector('#smLabSelect'),body=section.querySelector('#smLabBody');function show(){const lab=labs.find(x=>x.id===select.value)||labs[0];body.innerHTML=`<h4>${esc(lab.title)}</h4><p>${esc(lab.desc)}</p><div class="toolbar">${lab.fields.map(f=>`<label>${esc(f[1])}<input data-field="${f[0]}" type="number" step="any" value="${f[2]}" inputmode="decimal"></label>`).join('')}</div><button type="button" class="primary-btn" id="smLabCalc">احسب واشرح</button><div class="notice" id="smLabOutput" role="status">أدخل القيم ثم اضغط احسب واشرح.</div>`;
 body.querySelector('#smLabCalc').addEventListener('click',()=>{const values={};lab.fields.forEach(f=>values[f[0]]=Number(body.querySelector(`[data-field="${f[0]}"]`).value));if(Object.values(values).some(n=>!Number.isFinite(n))){body.querySelector('#smLabOutput').textContent='يرجى إدخال أعداد صحيحة.';return}const r=lab.calc(values),out=body.querySelector('#smLabOutput');out.innerHTML=`<strong>النتيجة: ${r.value===null?'غير معرفة':esc(Number(r.value.toFixed(4))+' '+r.unit)}</strong><ol>${r.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`;});}
 select.addEventListener('change',show);show();}
 const original=window.studyCenterRender;if(typeof original==='function')window.studyCenterRender=function(){original();render()};window.smSchoolLabs={render,ids:()=>labs.map(x=>x.id)};
 if(document.readyState!=='loading')render();else document.addEventListener('DOMContentLoaded',render);
})();
