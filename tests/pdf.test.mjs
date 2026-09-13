import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('PDF export preserves all 35 records, fixed A4 image size, logo constraints and eight analysis columns', async () => {
  const css = readFileSync(new URL('../public/pdf-layout.css', import.meta.url), 'utf8');
  const dom = new JSDOM(`<style>${css}</style><div id="app"></div><div id="toast"></div>`, {runScripts:'outside-only', url:'https://example.test'});
  const w=dom.window, pages=[], sizes=[];
  // jsdom has no layout engine. This test verifies export structure only.
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {top:this.classList.contains('pdf-footer')?1068:0,bottom:900,left:0,right:794,width:794,height:900}};
  w.Image=class { set src(value) {queueMicrotask(()=>this.onload())} };
  w.HTMLImageElement.prototype.decode=async()=>{};
  Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve()}});
  w.html2canvas=async node=>{pages.push(node.cloneNode(true));return{toDataURL:()=> 'data:image/jpeg;base64,'}};
  w.jspdf={jsPDF:class {addPage(){} addImage(...args){sizes.push(args.slice(2))} save(){}}};
  w.eval(['core.js','stats.js','pdf.js'].map(f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8')).join('\n'));
  const rows=Array.from({length:35},(_,i)=>({name:'طالبة '+i,grade:'ثاني متوسط',gradeKey:'2',className:'2/أ',classKey:'2أ',cycleId:'test',cycleLabel:'تجربة',V:5,A:5,R:5,K:5}));
  await w.createPdf('all',rows,{teacherName:'المعلمة',principalName:'المديرة'},120,'تجربة');
  assert.equal(pages.length,3);
  assert.equal(pages[0].querySelectorAll('.pdf-group th').length,8);
  assert.equal(pages.slice(1).reduce((sum,p)=>sum+p.querySelectorAll('tbody tr').length,0),35);
  assert.equal(pages[2].querySelector('.pdf-page-number').textContent,'3 / 3');
  for(const p of pages){assert.equal(p.querySelectorAll('.pdf-logo img').length,1);assert.equal(p.querySelectorAll('.pdf-footer-content>span').length,3)}
  for(const dimensions of sizes)assert.deepEqual(dimensions,[0,0,210,297]);
  assert.match(css,/width:150px!important;height:auto!important/);
  assert.equal(w.document.querySelector('.pdf-root'),null);
  assert.equal(w.createPdf.busy,false);
  dom.window.close();
});
