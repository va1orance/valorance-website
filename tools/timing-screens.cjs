const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{const browser=await chromium.launch(); const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('/tmp/val-timing',{recursive:true});
await page.goto(process.env.PREVIEW_URL||'http://100.64.0.15:8788/'); await page.evaluate(()=>document.fonts.ready);
for(const width of [1440,390]){await page.setViewportSize({width,height:900});
for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
for(const t of [2100,2700,3300]){
await page.evaluate(t=>{document.getAnimations().forEach(a=>{a.pause();if(['val-fill','val-greeting-rise'].includes(a.animationName))a.currentTime=t;else a.finish();});},t);
await page.locator('.intro').screenshot({path:`/tmp/val-timing/final-${width}-${theme}-${t}.png`});
}}}
await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log('12 timed screenshots captured; no uncaught browser errors.');})();
