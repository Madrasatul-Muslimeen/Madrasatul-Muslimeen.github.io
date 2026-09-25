// Mapping My Journey has a way back. The Owner, 25 Sep 2026: "There's no go
// back button to exit from Mapping view." The dock's Mapping tab (v08.61)
// opens journey-map.html as a separate page, and a phone's app shell may
// hide the browser's own back control. #backLink returns to the screen the
// reader came from (history.back() when that is a page of this app), or to
// Quran Study when there is nothing of ours to go back to.
//
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1100]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
    // Arrive the way a reader does: from Quran Study, through the dock tab.
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await Promise.all([page.waitForURL(/journey-map\.html#folders/), page.click("#tabJourneyBtn")]);
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const el = document.getElementById("backLink");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return { w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, text: el.textContent.replace(/\s+/g, " ").trim(),
        onTop: !!hit && (hit === el || el.contains(hit)), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    const tag = `${lang} ${width}px`;
    check(`${tag}: the Back button is on the page`, !!box, "no #backLink");
    if (!box) { await ctx.close(); continue; }
    check(`${tag}: it is on screen, in the first screenful, and nothing covers it`,
      box.left >= 0 && box.right <= width && box.top >= 0 && box.top < 400 && box.onTop, JSON.stringify(box));
    check(`${tag}: it is a finger-sized target (at least 40px tall)`, box.h >= 40, `height ${box.h}`);
    check(`${tag}: it reads in the page's language`,
      lang === "en" ? box.text === "← Back" : box.text === "← পেছনে", `text "${box.text}"`);
    check(`${tag}: no sideways page scroll`, !box.overflow);
    await Promise.all([page.waitForURL(/quranrevival\.html/), page.click("#backLink")]);
    check(`${tag}: pressing it returns to Quran Study`, /quranrevival\.html/.test(page.url()), page.url());
    await ctx.close();
  }
}

// Opened directly (a bookmark, a shared link): there is no page of ours to go
// back to, so the link itself takes the reader to Quran Study.
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 800 } });
  const { page } = await openPage(ctx, "/app/journey-map.html");
  const href = await page.getAttribute("#backLink", "href");
  check("opened directly: the Back button points at Quran Study", href === "quranrevival.html", `href ${href}`);
  await Promise.all([page.waitForURL(/quranrevival\.html/), page.click("#backLink")]);
  check("opened directly: pressing it lands on Quran Study", /quranrevival\.html/.test(page.url()), page.url());
  await ctx.close();
}

await browser.close();
console.log(`\n==== Mapping My Journey Back button: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
