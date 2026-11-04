const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../script.js'),'utf8');
function engine(reduced=false){
 const callbacks=new Map(),listeners={};let now=0,id=0;
 const element=()=>({style:{setProperty(){},removeProperty(){}},dataset:{},setAttribute(){},removeAttribute(){},hasAttribute(){return false},addEventListener(){}});
 const root=element();root.scrollHeight=2000;root.clientHeight=1000;
 const flow=element(),dot=element(),button=element();
 const motion={matches:reduced,addEventListener(){}};
 const context={Math,console,performance:{now:()=>now},localStorage:{getItem:()=>null},matchMedia:q=>q.includes('reduced')?motion:{matches:false,addEventListener(){}},requestAnimationFrame:fn=>{callbacks.set(++id,fn);return id},cancelAnimationFrame:i=>callbacks.delete(i),ResizeObserver:class{observe(){}},document:{documentElement:root,body:element(),hidden:false,addEventListener:(n,fn)=>listeners[n]=fn,getElementById:()=>button,querySelector:s=>s==='.logo-flow'?flow:s==='.val-dot-fill'?dot:{content:''},querySelectorAll:()=>[]},scrollY:0};
 context.window=context;context.addEventListener=(n,fn)=>(listeners[n]??=[]).push(fn);
 vm.runInNewContext(source,context);
 return {step(ms){now+=ms;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));return this.value()},scroll(y){context.scrollY=y;listeners.scroll.forEach(fn=>fn())},value(){return (parseFloat(flow.style.transform?.match(/translate\(([^p]+)/)?.[1]||'-25')+25)/1130},pending:()=>callbacks.size,motion,listeners,root};
}
const e=engine();e.scroll(650);
const first=e.step(5);
console.log(JSON.stringify({first5msDisplacement:first}));
assert.ok(first<0.0001,'stepped scroll input must ramp acceleration rather than kick the liquid');
let checks=1;
for(const hz of [30,60,120]){
 const e=engine();e.scroll(650);let last=0;
 for(let n=0;n<3*hz;n++){const x=e.step(1000/hz);assert.ok(x>=last-1e-10&&x<=1);last=x;checks++}
 assert.equal(e.value(),1);checks++;
 assert.equal(e.pending(),0);checks++;
 e.scroll(0);for(let n=0;n<3*hz;n++)e.step(1000/hz);
 assert.equal(e.value(),0);checks++;
 assert.equal(e.pending(),0);checks++;
}
const responses=[];
for(const hz of [30,60,120]){
 const e=engine();e.scroll(650);for(let n=0;n<hz/2;n++)e.step(1000/hz);responses.push(e.value());
}
assert.ok(Math.max(...responses)-Math.min(...responses)<1e-10,'response is independent of refresh rate');checks++;
const reversal=engine();reversal.scroll(650);for(let i=0;i<20;i++)reversal.step(16);
const beforeReverse=reversal.value();reversal.scroll(0);const afterReverse=reversal.step(16);
assert.ok(afterReverse>beforeReverse,'existing momentum survives a direction change');checks++;
for(let i=0;i<200;i++)reversal.step(16);
assert.equal(reversal.value(),0);checks++;
const r=engine(true);r.scroll(325);r.step(16);assert.equal(r.value(),.5);checks++;
console.log(JSON.stringify({checks}));
