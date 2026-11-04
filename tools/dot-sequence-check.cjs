const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch(); const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const dir=process.env.ARTIFACT_DIR||'/tmp/val-dot-sequence'; fs.mkdirSync(dir,{recursive:true});
 await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/'); await page.evaluate(()=>document.fonts.ready);
 let checks=0;
 for(const width of [390,1440,1920,2560]){
  await page.setViewportSize({width,height:1080});
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const time of [5400,5700,6000]){
    const state=await page.evaluate(t=>{
     document.getAnimations().forEach(a=>{a.pause();if(['val-fill','val-greeting-rise','val-dot-fill'].includes(a.animationName))a.currentTime=t;else a.finish();});
     const title=document.querySelector('h1').getBoundingClientRect();
     const svg=document.querySelector('.logo-banner svg');
     const top=new DOMPoint(0,40).matrixTransform(svg.getScreenCTM()).y;
     return {titleTop:title.top,gap:top-title.bottom,dot:new DOMMatrix(getComputedStyle(document.querySelector('.val-dot-fill')).transform).a,overflow:document.documentElement.scrollWidth>innerWidth};
    },time);
    assert.ok(state.titleTop>=0,'greeting must not clip above viewport');
    assert.ok(!state.overflow,'no horizontal overflow');
    if(width>=1024)assert.ok(state.gap>=24,`desktop clearance ${width}: ${state.gap}`);
    if(time===5400)assert.equal(state.dot,0);
    if(time===5700)assert.ok(state.dot>0&&state.dot<1);
    if(time===6000)assert.equal(state.dot,1);
    await page.screenshot({path:`${dir}/${width}-${theme}-${time}.png`}); checks++;
   }
  }
 }
 assert.deepEqual(errors,[]);await browser.close();console.log(`${checks} sequence/clearance samples passed, four widths and both themes; no page errors.`);
})().catch(e=>{console.error(e);process.exit(1);});
