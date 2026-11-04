const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const dir=process.env.ARTIFACT_DIR||'/tmp/val-scroll';fs.mkdirSync(dir,{recursive:true});
 let checks=0;const errors=[];
 for(const width of [390,1440,1920,2560])for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:theme});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/');
  await page.addStyleTag({content:'html {scroll-behavior:auto!important}'});
  async function sample(p){
   await page.evaluate(p=>window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p),p);
   await page.waitForTimeout(80);
   return page.evaluate(()=>({x:new DOMMatrix(getComputedStyle(document.querySelector('.logo-flow')).transform).e,dot:new DOMMatrix(getComputedStyle(document.querySelector('.val-dot-fill')).transform).a,raised:document.documentElement.hasAttribute('data-greeting-raised'),overflow:document.documentElement.scrollWidth>innerWidth,loop:document.getAnimations().some(a=>['val-fill','val-dot-fill'].includes(a.animationName))}));
  }
  for(const progress of [0,.25,.475,.49,.5,.75,1,.25,0]){
   const state=await sample(progress);
   assert.ok(Math.abs(state.x-(-25+1130*progress))<5);checks++;
   assert.equal(state.overflow,false);checks++;
   assert.equal(state.loop,false);checks++;
   if(progress===0)assert.equal(state.dot,0);
   if(progress>=.5)assert.equal(state.dot,1);
   if(progress===.49)assert.ok(state.dot>0&&state.dot<1);
   checks++;
   if(progress===.5){
    // Capture the mold itself at its real scroll-driven state for visual inspection.
    await page.screenshot({path:`${dir}/${width}-${theme}-half.png`,fullPage:true});
   }
  }
  assert.equal((await sample(0)).raised,true);checks++;
  await page.waitForTimeout(1300);
  await page.screenshot({path:`${dir}/${width}-${theme}-top.png`});
  await page.close();
 }
 const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});
 await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/');
 assert.equal(await page.locator('.intro-copy').evaluate(e=>getComputedStyle(e).animationName),'none');checks++;
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);
 assert.equal(await page.locator('.val-dot-fill').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a),1);checks++;
 assert.deepEqual(errors,[]);checks++;
 await browser.close();console.log(JSON.stringify({checks,errors,artifacts:dir}));
})().catch(e=>{console.error(e);process.exit(1)});
