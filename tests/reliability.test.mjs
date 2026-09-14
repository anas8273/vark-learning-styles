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
 assert.equal(w.document.querySelector('.brain-icon').textContent,'V·A·R·K');
 const mobileCss=source('enhancements.css');
 assert.ok(mobileCss.includes('white-space:nowrap;unicode-bidi:isolate'));
 assert.ok(mobileCss.includes('.brain-icon{width:86px;height:58px;font-size:12px!important;letter-spacing:0}'));
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
test('teacher polls without overlapping requests and keeps previous data when offline',async()=>{
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://example.test/?view=admin',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const payload={roster:[],archivedRoster:[],deletedRoster:[],archives:[],audit:[],settings:{currentCycleLabel:'اختبار',currentCycleId:'legacy',classLabels:['2/أ'],expectedGrade:'ثاني متوسط',totalTarget:120,perClassTarget:30},duplicatesCollapsed:0,normalizedLegacyCount:0};
 let count=0,fail=false,release;const jobs=new Map();let seq=0;
 w.setTimeout=(f,ms)=>{jobs.set(++seq,{f,ms});return seq};w.clearTimeout=id=>jobs.delete(id);w.AbortController=AbortController;
 w.fetch=async()=>{count++;if(count===1)await new Promise(r=>release=r);if(fail)throw Error('offline');return{ok:true,json:async()=>payload}};
 w.eval(['core.js','stats.js','teacher.js','boot.js'].map(source).join('\n'));
 w.dispatchEvent(new w.Event('online'));assert.equal(count,1);release();await tick();assert.match(w.document.body.textContent,/النتائج والتحليل/);
 const poll=[...jobs.values()].find(j=>j.ms===15000);assert.ok(poll);fail=true;poll.f();await tick();assert.equal(count,2);assert.match(w.document.body.textContent,/النتائج والتحليل/);assert.match(w.document.body.textContent,/البيانات السابقة ما زالت معروضة/);dom.window.close();
});
