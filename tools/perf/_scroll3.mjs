import { chromium, newContext, openPage } from "../i18n-verify/harness.mjs";
const browser = await chromium.launch();
for (const lang of ["en","bn"]) for (const vp of [{width:320,height:640},{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1280,height:800}]) for (const imm of [0,1,2]) {
const ctx = await newContext(browser, { viewport: vp, appLang: lang });
await ctx.addInitScript(() => { try { localStorage.setItem("mm_reading_sideways", "1"); } catch {} });
const { page } = await openPage(ctx, "/app/quranrevival.html");
await page.evaluate(() => { const s=document.getElementById("surahSelect"); s.value="2"; s.dispatchEvent(new Event("change",{bubbles:true})); });
await page.waitForTimeout(1200);
await page.evaluate(() => { const s=document.getElementById("ayahSelect"); s.value="282"; s.dispatchEvent(new Event("change",{bubbles:true})); });
await page.waitForTimeout(600);
const r0 = await page.evaluate(() => document.getElementById("tabReadBtn").getBoundingClientRect().width>0);
if (!r0) await page.click("#tabStudyBtn");
await page.click("#tabReadBtn"); await page.waitForTimeout(600);
for (let i=0;i<imm;i++){ await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }
const m = await page.evaluate(async () => {
  const p=document.getElementById("ayahPanels"), rs=document.getElementById("readScroll");
  p.scrollTop=p.scrollHeight; await new Promise(r=>setTimeout(r,300));
  const els=[...p.querySelectorAll("*")].filter(e=>e.children.length===0 && e.textContent.trim() && e.getBoundingClientRect().height>0);
  const maxBottom=Math.max(...els.map(e=>e.getBoundingClientRect().bottom));
  const visBottom=Math.min(rs.getBoundingClientRect().bottom, innerHeight);
  return { hiddenPx: Math.round(maxBottom-visBottom), rsOverflow: rs.scrollHeight - rs.clientHeight, gapBelowPanel: Math.round(visBottom - p.getBoundingClientRect().bottom), hx: document.documentElement.scrollWidth - innerWidth };
});
console.log(lang, `${vp.width}x${vp.height}`, "fullscreen-step", imm, JSON.stringify(m));
await ctx.close(); }
await browser.close();
