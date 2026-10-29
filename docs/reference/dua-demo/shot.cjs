const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const html = require('fs').readFileSync('dua-module-demo.html','utf8');
  for (const w of [390, 1280]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.setContent('<!doctype html><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><body>' + html, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.click('.pd >> nth=0'); await p.waitForTimeout(150); await p.screenshot({ path: `v4-pull-${w}.png` });
    const pullOk = await p.evaluate(() => { const r = document.querySelector('.pull').getBoundingClientRect(); return { l: r.left, r: r.right, vw: innerWidth }; });
    await p.click('.psub .pitem >> nth=3'); await p.waitForTimeout(150);
    await p.click('.pd >> nth=1'); await p.waitForTimeout(150); await p.screenshot({ path: `v4-sub-${w}.png` });
    await p.keyboard.press('Escape');
    await p.click('.row .open >> nth=0'); await p.waitForTimeout(250); await p.screenshot({ path: `v4-card-${w}.png` });
    await p.click('.cardmenu .cbtn >> nth=0'); await p.waitForTimeout(150); await p.screenshot({ path: `v4-meaning-${w}.png` });
    await p.keyboard.press('Escape');
    await p.click('.cardmenu .cbtn >> nth=2'); await p.click('.popcard .pbtn >> nth=2'); await p.waitForTimeout(150); await p.screenshot({ path: `v4-plan-${w}.png` });
    const chip = await p.evaluate(() => document.querySelector('.card .mk')?.textContent);
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(w, 'overflow', ow, 'pull', JSON.stringify(pullOk), 'chip', chip);
    await p.close();
  }
  console.log('errors', errs); await b.close();
})();
