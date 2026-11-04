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
      document.getAnimations().filter(a => ['val-fill'].includes(a.animationName)).forEach(a => {a.pause(); a.currentTime=t;});
      const style = getComputedStyle(document.querySelector('.logo-flow'));
      const m = new DOMMatrix(style.transform);
      return {x:m.m41,y:m.m42};
    }, time);
  }
  const empty=await sample(0), early=await sample(2000), mid=await sample(3000), full=await sample(6000), returning=await sample(9000);
  assert.ok(empty.x<early.x && early.x<mid.x && mid.x<full.x, 'gold reveals mold from left to right');
  assert.ok([empty,early,mid,full,returning].every(s=>s.y===0), 'no gravity-driven vertical movement');
  assert.ok(returning.x<full.x && returning.x>empty.x, 'return pass moves back to the left');
  assert.equal(await page.locator('.val-pour, .val-stream').count(),0,'gravity-fed streams removed');
  assert.equal(await page.locator('#val-liquid stop[stop-opacity]').count(),0,'liquid is opaque, not translucent light');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ['dark','light']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      for (const [name,time] of [['empty',0],['reveal',2000],['half',3000],['full',6000]]) {
        await sample(time);
        await page.locator('.intro').screenshot({path:`${artifacts}/${width}-${theme}-${name}.png`});
      }
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.logo-flow').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal((await sample(3000)).x,600,'reduced motion retains static partial fill');
  await browser.close();
  console.log('Hero passed: opaque left-to-right fill, leftward return, no gravity streams or vertical movement, four viewport sizes, both themes, reduced motion. 16 phase screenshots captured.');
})().catch(e=>{console.error(e);process.exit(1);});
