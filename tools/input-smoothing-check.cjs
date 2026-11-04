const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];const errors=[];
 for(const touch of [false,true]){
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1440,height:900},hasTouch:touch,isMobile:touch});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/');
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  await page.waitForTimeout(900);
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{
   window.probe={rootWrites:0,frames:[],scrolls:0};
   new MutationObserver(ms=>{probe.rootWrites+=ms.filter(m=>m.attributeName==='style').length}).observe(document.documentElement,{attributes:true});
   addEventListener('scroll',()=>probe.scrolls++,{passive:true});
   window.sample=()=>{probe.frames.push(performance.now());probe.raf=requestAnimationFrame(sample)};sample();
  });
  const before=(await cdp.send('Performance.getMetrics')).metrics;
  if(touch){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:690}]});
   for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:690-i*35}]});await page.waitForTimeout(24)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   for(let i=0;i<6;i++){await page.mouse.wheel(0,90);await page.waitForTimeout(110)}
  }
  await page.waitForTimeout(2400);
  const after=(await cdp.send('Performance.getMetrics')).metrics;
  const state=await page.evaluate(()=>{cancelAnimationFrame(probe.raf);return {...probe,raf:undefined,y:scrollY,x:new DOMMatrix(getComputedStyle(document.querySelector('.logo-flow')).transform).e,range:document.documentElement.scrollHeight-innerHeight}});
  const metric=name=>after.find(m=>m.name===name).value-before.find(m=>m.name===name).value;
  const gaps=state.frames.slice(1).map((t,i)=>t-state.frames[i]).sort((a,b)=>a-b);
  results.push({touch,rootWrites:state.rootWrites,scrolls:state.scrolls,styleMs:metric('RecalcStyleDuration')*1000,layoutMs:metric('LayoutDuration')*1000,frameP95:gaps[Math.floor(gaps.length*.95)],maxFrame:gaps.at(-1),x:state.x,y:state.y});
  console.log(JSON.stringify({touch,state:{...state,frames:state.frames.length},expected:-25+1130*Math.min(1,state.y/(state.range*.65))}));
  assert.ok(Math.abs(state.x-(-25+1130*Math.min(1,state.y/(state.range*.65))))<5,'fill settles at correct scroll position');
  await page.screenshot({path:`/tmp/val-input-${touch?'touch':'wheel'}.png`,fullPage:true});
  if(touch){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:200}]});
   for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:200+i*30}]});await page.waitForTimeout(24)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   for(let i=0;i<3;i++){await page.mouse.wheel(0,-90);await page.waitForTimeout(110)}
  }
  await page.waitForTimeout(2400);
  const reverse=await page.evaluate(()=>({y:scrollY,range:document.documentElement.scrollHeight-innerHeight,x:new DOMMatrix(getComputedStyle(document.querySelector('.logo-flow')).transform).e}));
  assert.ok(reverse.y<state.y,'reverse touch/wheel input scrolls upward');
  assert.ok(Math.abs(reverse.x-(-25+1130*Math.min(1,reverse.y/(reverse.range*.65))))<5,'reverse input settles correctly');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.locator('.logo-flow').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).e),1105,'live reduced motion stops smoothing immediately');
  await page.close();
 }
 await browser.close();
 console.log(JSON.stringify({results,errors},null,2));
 if(process.env.RESULT_FILE)fs.writeFileSync(process.env.RESULT_FILE,JSON.stringify({results,errors},null,2));
 assert.deepEqual(errors,[]);
 if(!process.env.BASELINE)assert.ok(results.every(r=>r.rootWrites===0),'scroll fill must not invalidate styles across the entire page each animation frame');
})().catch(e=>{console.error(e);process.exit(1)});
