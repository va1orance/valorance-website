const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.PREVIEW_URL || 'http://100.64.0.15:8788/', {waitUntil:'domcontentloaded'});
  const artifacts = process.env.ARTIFACT_DIR || '/tmp/valorance-liquid';
  fs.mkdirSync(artifacts, {recursive:true});
  assert.equal(await page.locator('.logo-banner svg').count(), 1);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    const intro = await page.locator('.intro').boundingBox();
    const logo = await page.locator('.logo-banner').boundingBox();
    const title = await page.locator('h1').boundingBox();
    assert.ok(logo.width >= intro.width - 1, `banner fills hero at ${width}`);
    assert.ok(title.y < logo.y + logo.height && title.y + title.height > logo.y, `greeting overlays banner at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  async function sample(time) {
    return page.evaluate(t => {
      document.getAnimations().filter(a => ['val-fill','val-pour','val-stream'].includes(a.animationName)).forEach(a => {a.pause(); a.currentTime=t;});
      const style = getComputedStyle(document.querySelector('.logo-flow'));
      const m = new DOMMatrix(style.transform);
      return {x:m.m41,y:m.m42,pour:Number(getComputedStyle(document.querySelector('.val-pour')).opacity),stream:parseFloat(getComputedStyle(document.querySelector('.val-stream')).strokeDashoffset)};
    }, time);
  }
  const empty=await sample(0), early=await sample(2000), mid=await sample(6000), full=await sample(9800);
  assert.ok(empty.y>early.y && early.y>mid.y && mid.y>full.y, 'pool accumulates from bottom to top');
  assert.ok(Math.abs(mid.x)<20, 'no sweeping light panel');
  assert.ok(early.pour>.8 && early.stream<.1, 'visible streams feed the pool');
  assert.equal(await page.locator('#val-liquid stop[stop-opacity]').count(),0,'liquid is opaque, not translucent light');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ['dark','light']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      for (const [name,time] of [['empty',0],['pour',2000],['half',6000],['full',9800]]) {
        await sample(time);
        await page.locator('.intro').screenshot({path:`${artifacts}/${width}-${theme}-${name}.png`});
      }
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.logo-flow').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('.val-pour').evaluate(e=>getComputedStyle(e).opacity),'0');
  await browser.close();
  console.log('Hero passed: rising opaque liquid, feeding streams, no light sweep, four viewport sizes, both themes, reduced motion. 16 phase screenshots captured.');
})().catch(e=>{console.error(e);process.exit(1);});
