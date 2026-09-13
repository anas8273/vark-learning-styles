import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
test('student opens, completes 20 questions, retains retry identity and resets for new quiz',async()=>{
 const dom=new JSDOM('<div id="app"></div><div id="toast" hidden></div>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 const requests=[];let fail=true;
 w.fetch=async(url,init)=>{if(url.endsWith('/config'))return{ok:true,json:async()=>({expectedGrade:'ثاني متوسط',classLabels:['2/أ']})};requests.push(JSON.parse(init.body));if(fail){fail=false;throw Error('offline')};return{ok:true,json:async()=>({primary:'بصري',topModes:['بصري'],percent:{V:100,A:0,R:0,K:0},description:'نتيجة',secondary:'—'})}};
 w.AbortController=AbortController;w.confirm=()=>true;
 // Count mutation notifications: the previous runtime loops indefinitely here.
 let mutations=0;const observer=new w.MutationObserver(()=>{if(++mutations>30)throw Error('runaway rendering')});observer.observe(w.document,{subtree:true,childList:true});
 w.eval(['site-runtime.js','core.js','student.js','boot.js'].map(source).join('\n')); 
 await tick();assert.ok(w.document.querySelector('#start'));assert.ok(mutations<10);observer.disconnect();
 for(const [id,v] of Object.entries({name:'طالبة اختبار آلي',grade:'ثاني متوسط',className:'2/أ'}))w.document.getElementById(id).value=v;
 w.document.getElementById('start').click();
 for(let i=0;i<20;i++){w.document.querySelector('.answer').click();w.document.getElementById('next').click()}
 await tick();assert.match(w.document.body.textContent,/إعادة محاولة حفظ النتيجة/);assert.equal(requests.length,1);
 w.document.getElementById('next').click();await tick();assert.match(w.document.body.textContent,/اكتملت النتيجة/);assert.equal(requests[0].submissionId,requests[1].submissionId);assert.equal(requests[0].modes.length,20);
 w.document.getElementById('again').click();assert.ok(w.document.getElementById('start'));dom.window.close();
});
test('configuration failure provides retry instead of a blank page',async()=>{
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;w.AbortController=AbortController;w.fetch=async()=>{throw Error('offline')};w.eval(['core.js','student.js','boot.js'].map(source).join('\n')); await tick();assert.ok(w.document.getElementById('retryConfig'));dom.window.close();
});
