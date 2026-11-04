const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.PREVIEW_URL || 'http://100.64.0.15:8788/', {waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.logo-banner svg').count(), 1, 'VAL silhouette is a full-width background banner, not a separate video box');
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    const intro = await page.locator('.intro').boundingBox();
    const logo = await page.locator('.logo-banner').boundingBox();
    const title = await page.locator('h1').boundingBox();
    assert.ok(logo.width >= intro.width - 1, `banner fills hero at ${width}`);
    assert.ok(title.y < logo.y + logo.height && title.y + title.height > logo.y, `greeting overlays banner at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}`);
  }
  const fill = page.locator('.logo-flow');
  const before = await fill.evaluate(e => getComputedStyle(e).transform);
  await page.waitForTimeout(600);
  assert.notEqual(await fill.evaluate(e => getComputedStyle(e).transform), before, 'light moves within VAL grooves');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await fill.evaluate(e => getComputedStyle(e).animationName), 'none', 'reduced motion keeps static inlay');
  await browser.close();
  console.log('Hero checks passed: full-width VAL inlay, overlaid greeting, moving fill, reduced motion, four viewport sizes.');
})().catch(e => { console.error(e); process.exit(1); });
