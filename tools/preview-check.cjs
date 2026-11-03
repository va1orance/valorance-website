/* Run with NODE_PATH pointing to a Playwright + @axe-core/playwright install. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const artifacts = process.env.ARTIFACT_DIR || '/tmp/valorance-preview';
fs.mkdirSync(artifacts, {recursive:true});
const {chromium} = require('playwright');
const {AxeBuilder} = require('@axe-core/playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8787';
const result = {checks: [], accessibility: [], errors: []};
const check = (name, value) => { assert.ok(value, name); result.checks.push(name); };
(async () => {
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({colorScheme: 'dark'});
  const page = await context.newPage();
  // A Tailscale connection can briefly stall between repeated video loads.
  const goto = page.goto.bind(page);
  page.goto = async (...args) => {
    try { return await goto(...args); }
    catch (error) {
      if (error.name !== 'TimeoutError') throw error;
      await page.evaluate(() => window.stop()).catch(() => {});
      return goto(...args);
    }
  };
  page.on('pageerror', e => result.errors.push(e.message));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width, height: 900});
    for (const theme of ['dark', 'light']) {
      await page.goto(base + '/', {waitUntil: 'domcontentloaded'});
      await page.evaluate(t => localStorage.setItem('theme', t), theme);
      await page.reload({waitUntil: 'domcontentloaded'});
      await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
      check(`home ${width}px ${theme}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`home ${width}px ${theme}: theme applied`, await page.locator('html').getAttribute('data-theme') === theme);
      check(`home ${width}px ${theme}: borderless cards`, await page.locator('.project-card').evaluateAll(cards => cards.every(c => getComputedStyle(c).borderTopWidth === '0px')));
      check(`home ${width}px ${theme}: four projects in order`, JSON.stringify(await page.locator('.project-card h3').allTextContents()) === JSON.stringify(['Night', 'Typetris', 'TritonLog', 'Learneth']));
      check(`home ${width}px ${theme}: unreleased cards have no dead links`, await page.locator('article.project-card').count() === 2 && await page.locator('article.project-card a').count() === 0);
      check(`home ${width}px ${theme}: artwork fits previews`, await page.locator('.tritonlog-preview, .learneth-preview').evaluateAll(previews => previews.every(p => { const a = p.firstElementChild.getBoundingClientRect(), b = p.getBoundingClientRect(); return a.x >= b.x && a.y >= b.y && a.right <= b.right && a.bottom <= b.bottom; })));
      check(`home ${width}px ${theme}: gold project titles`, await page.locator('.project-heading h3').evaluateAll(es => es.every(e => getComputedStyle(e).color === getComputedStyle(document.querySelector('h1 a')).color)));
      check(`home ${width}px ${theme}: borderless neumorphic theme toggle`, await page.locator('#theme-toggle').evaluate(e => getComputedStyle(e).borderTopWidth === '0px' && getComputedStyle(e).boxShadow !== 'none'));
      const well = await page.locator('.logo-well').boundingBox();
      const mark = await page.locator('video').boundingBox();
      check(`home ${width}px ${theme}: widescreen inlay`, Math.abs(well.width / well.height - 16 / 9) < .02);
      check(`home ${width}px ${theme}: compact original inlay`, well.width <= (width <= 560 ? 240 : width <= 760 ? 210 : 340) + 1);
      check(`home ${width}px ${theme}: centered enlarged undistorted logo`, Math.abs(mark.width - mark.height) < 1 && Math.abs(mark.x + mark.width / 2 - well.x - well.width / 2) < 1 && Math.abs(mark.y + mark.height / 2 - well.y - well.height / 2) < 1 && mark.height >= well.height * 1.6);
      if (width <= 560) {
        const copy = await page.locator('.intro-copy').boundingBox();
        const logo = await page.locator('.logo-well').boundingBox();
        const video = await page.locator('video').boundingBox();
        check(`home ${width}px ${theme}: logo below intro`, logo.y >= copy.y + copy.height);
        check(`home ${width}px ${theme}: logo scales within well`, logo.width >= 200 && video.width <= logo.width && Math.abs(video.width - video.height) < 1);
      }
      const scan = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      result.accessibility.push({width, theme, violations: scan.violations.map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target)}))});
      check(`home ${width}px ${theme}: WCAG automated scan`, scan.violations.length === 0);
    }
  }
  await page.goto(base + '/', {waitUntil: 'domcontentloaded'});
  await page.getByRole('button', {name:'Switch to dark theme'}).click();
  await page.reload();
  check('theme selection persists after reload', await page.locator('html').getAttribute('data-theme') === 'dark');
  check('selected projects heading removed', await page.getByText('Selected projects', {exact:true}).count() === 0);
  check('Valorance is gold', await page.locator('h1 a').evaluate(e => getComputedStyle(e).color === 'rgb(225, 182, 18)'));
  check('period is white', await page.locator('h1 .accent').evaluate(e => getComputedStyle(e).color === 'rgb(255, 255, 255)'));
  check('pause control removed', await page.locator('#motion-toggle').count() === 0);
  check('header removed entirely', await page.locator('header, .site-header, .wordmark').count() === 0);
  check('decorative microcopy removed', await page.locator('.eyebrow, .logo-caption, .section-note, .preview-label, .prototype-label, .project-type, .footer-name').count() === 0);
  await page.waitForFunction(() => !document.querySelector('video').paused);
  check('logo animation plays', await page.locator('video').evaluate(v => !v.paused));
  await page.keyboard.press('Control+Home');
  await page.reload();
  await page.keyboard.press('Tab');
  check('skip link is first keyboard target', await page.evaluate(() => document.activeElement.className === 'skip-link'));
  await page.keyboard.press('Enter');
  check('skip link focuses projects', await page.evaluate(() => document.activeElement.id === 'projects'));
  await page.locator('.night-card').click();
  check('Night card stays in preview', page.url() === base + '/night/');
  await page.getByRole('link', {name:'All projects'}).click();
  await page.locator('.typetris-card').click();
  check('Typetris card stays in preview', page.url() === base + '/typetris/');
  await page.getByRole('button', {name:'How to Play'}).click();
  check('instructions report expanded state', await page.locator('#how-to-play-toggle').getAttribute('aria-expanded') === 'true');
  const target = await page.locator('#player-word-grid .target-word').innerText();
  await page.locator('#player-input').pressSequentially(target + ' ', {delay: 30});
  check('typing target word increments combo', Number(await page.locator('#player-combo').innerText()) >= 1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    check(`Typetris ${width}px: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.locator('.back-link').click();
  check('game return navigation', page.url() === base + '/');
  for (const path of ['/night/terminology', '/night/design', '/night/statistics', '/original/', '/original/night/terminology']) {
    const response = await context.request.get(base + path);
    check(`route ${path}`, response.status() === 200);
    check(`preview noindex header ${path}`, response.headers()['x-robots-tag'] === 'noindex, nofollow');
  }
  for (const path of ['/.git/config', '/tools/', '/original/.git/config']) {
    check(`private path blocked ${path}`, (await context.request.get(base + path)).status() === 404);
  }
  const reduced = await browser.newContext({reducedMotion: 'reduce'});
  const rp = await reduced.newPage();
  await rp.goto(base + '/', {waitUntil: 'domcontentloaded'});
  check('reduced motion: no video downloads', await rp.locator('video source').count() === 0);
  check('reduced motion: video paused', await rp.locator('video').evaluate(v => v.paused));
  check('reduced motion: entrance disabled', await rp.locator('.logo-well').evaluate(e => getComputedStyle(e).animationName === 'none'));
  check('reduced motion: hover movement disabled', await rp.locator('.game-word').first().evaluate(e => getComputedStyle(e).transitionDuration === '0s'));
  check('reduced motion: pause button hidden', await rp.locator('#motion-toggle').count() === 0);
  const blocked = await browser.newContext({colorScheme:'dark'});
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Blocked', 'SecurityError'); }});
  });
  const bp = await blocked.newPage();
  await bp.goto(base + '/', {waitUntil: 'domcontentloaded'});
  await bp.locator('#theme-toggle').click();
  check('theme works with blocked localStorage', await bp.locator('html').getAttribute('data-theme') === 'light');
  const nojs = await browser.newContext({javaScriptEnabled:false});
  const np = await nojs.newPage();
  await np.goto(base + '/', {waitUntil: 'domcontentloaded'});
  check('projects usable without JS', await np.locator('.project-card').count() === 4);
  await np.locator('.night-card').click();
  check('Night navigates without JS', np.url() === base + '/night/');
  check('no uncaught browser errors', result.errors.length === 0);
  await page.goto(base + '/', {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
  await page.setViewportSize({width:1440,height:1080});
  await page.screenshot({path:path.join(artifacts, 'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(artifacts, 'mobile.png'),fullPage:true});
  await page.locator('#theme-toggle').click();
  await page.waitForTimeout(800);
  await page.screenshot({path:path.join(artifacts, 'light.png'),fullPage:true});
  await page.goto(base + '/typetris/');
  await page.screenshot({path:path.join(artifacts, 'typetris-mobile.png'),fullPage:true});
  await browser.close();
  fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify({passed:result.checks.length, accessibilityScans:result.accessibility.length, errors:result.errors}));
})().catch(e => {fs.writeFileSync(path.join(artifacts, 'results.json'),JSON.stringify({...result,failure:e.stack},null,2)); console.error(e);process.exit(1);});
