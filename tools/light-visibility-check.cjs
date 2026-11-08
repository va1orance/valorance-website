const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1600}});
 await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/');
 await page.waitForTimeout(1400);
 let checks=0;
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const boxes=await page.locator('.project-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
  const a=boxes[0],b=boxes[1];
  await page.mouse.move(a.x-40,a.y+a.h/2);await page.waitForTimeout(120);
  const visibility=()=>page.locator('.project-card').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).getPropertyValue('--light-visible')||1)));
  let v=await visibility();
  assert.ok(v[0]>.9,'front card receives direct light');checks++;
  assert.ok(v[1]<.1,'LIGHT [a] [b]: a blocks direct illumination on b');checks++;
  await page.screenshot({path:`/tmp/valorance-visibility-${theme}.png`});
  await page.mouse.move(b.x+b.w+40,b.y+b.h/2);await page.waitForTimeout(120);
  v=await visibility();assert.ok(v[1]>.9 && v[0]<.1,'occlusion reverses with light');checks++;
 }
 const inset=await page.locator('.night-preview').evaluate(e=>getComputedStyle(e,'::after').boxShadow);
 assert.notEqual(inset,'none','artwork has a pronounced inset lighting layer above the image');checks++;
 await page.evaluate(()=>document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));
 assert.equal(await page.locator('.project-card').first().evaluate(e=>e.style.getPropertyValue('--light-visible')),'');checks++;
 console.log(`${checks} receiver visibility checks passed`);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
