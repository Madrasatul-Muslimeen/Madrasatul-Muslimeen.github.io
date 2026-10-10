// Owner decision 38 (30 Sep 2026): "There should be a visible SEARCH button on
// the landing page". Four places were mocked in the real page; the Owner chose
// A -- top right of the banner, beside the title. It opens the app's existing
// search (Study options' "2:255 or a word" box), ready to type.
//
// Run from the repository root, with serve.js on :8080. Expected values are
// written BY HAND, never computed by the code under test.
// Set SHOT_DIR=<dir> to save screenshots.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start({ lang = "en", width = 390, height = 800 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}
const measure = (page) => page.evaluate(() => {
  const h1 = document.querySelector("h1"), title = document.getElementById("appTitleText"), b = document.getElementById("headSearchBtn");
  const R = (e) => e.getBoundingClientRect();
  const hr = R(h1), tr = R(title), br = R(b), cs = getComputedStyle(b);
  const label = b.querySelector(".head-search-label");
  const mid = (r) => (r.top + r.bottom) / 2;
  return {
    w: Math.round(br.width), h: Math.round(br.height),
    sameLine: br.top < tr.bottom && br.bottom > tr.top,
    rightEdge: Math.round(hr.right - br.right), afterTitle: br.left >= tr.right,
    labelShown: !!label && label.getBoundingClientRect().width > 0, labelText: label?.textContent.trim(),
    aria: b.getAttribute("aria-label"), border: cs.borderTopColor, bw: cs.borderTopWidth, bg: cs.backgroundColor, color: cs.color,
    cut: b.scrollWidth > b.clientWidth + 1, over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    titleOneLine: R(title).height < 40, midGap: Math.abs(mid(br) - mid(tr)),
  };
});

// ---- Where it sits, how it looks, at every width, both languages
// Expected by hand: on the title's line, at the banner's right edge, 36px tall,
// a 2px gold (#B8862F) border on white with navy text; the word shown from
// 360px up ("Search" / "খুঁজুন"), the magnifier alone below that (36x36).
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 768, 1280]) {
    const { ctx, page } = await start({ lang, width });
    const m = await measure(page);
    const tag = `${lang} ${width}px`;
    check(`${tag}: Search is on the title's line, at the banner's right edge`, m.sameLine && m.afterTitle && m.rightEdge <= 1 && m.titleOneLine, JSON.stringify(m));
    check(`${tag}: gold 2px border, white, navy, 36px tall`, m.h === 36 && m.bw === "2px" && m.border === "rgb(184, 134, 47)" && m.bg === "rgb(255, 255, 255)" && m.color === "rgb(31, 58, 110)", JSON.stringify(m));
    if (width < 360) check(`${tag}: the magnifier alone, a 36px circle`, !m.labelShown && m.w === 36, JSON.stringify(m));
    else check(`${tag}: reads "${lang === "bn" ? "খুঁজুন" : "Search"}", nothing cut`, m.labelShown && m.labelText === (lang === "bn" ? "খুঁজুন" : "Search") && !m.cut, JSON.stringify(m));
    check(`${tag}: spoken name is "${lang === "bn" ? "খুঁজুন" : "Search"}"`, m.aria === (lang === "bn" ? "খুঁজুন" : "Search"), String(m.aria));
    check(`${tag}: no sideways scroll`, !m.over, JSON.stringify(m));
    if ((lang === "en" && (width === 390 || width === 1280)) || (lang === "bn" && width === 320)) await page.screenshot({ path: `${SHOT_DIR}/head-search-${lang}-${width}.png`, clip: { x: 0, y: 0, width, height: 200 } });
    await ctx.close();
  }
}

// ---- A tap opens Study options with the cursor in the search box, on screen
for (const [lang, width] of [["en", 390], ["bn", 320], ["en", 1280]]) {
  const { ctx, page } = await start({ lang, width });
  const before = await page.evaluate(() => document.getElementById("panelStudyOptions").hidden);
  await page.click("#headSearchBtn");
  await page.waitForTimeout(400);
  const a = await page.evaluate(() => {
    const inp = document.getElementById("jumpInput"), r = inp.getBoundingClientRect();
    return { panelOpen: !document.getElementById("panelStudyOptions").hidden, focused: document.activeElement === inp,
      inView: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight, placeholder: inp.placeholder };
  });
  check(`[${lang} ${width}] Study options was closed before the tap`, before === true);
  check(`[${lang} ${width}] a tap opens Study options with the cursor in the search box, on screen`, a.panelOpen && a.focused && a.inView, JSON.stringify(a));
  // Typing a reference and pressing Enter uses the app's own search: 2:255 goes to Al-Baqara 255.
  await page.keyboard.type("2:255");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value }));
  check(`[${lang} ${width}] typing 2:255 and Enter goes to Surah 2, Ayah 255`, s.surah === "2" && s.ayah === "255", JSON.stringify(s));
  // A second tap while it is open keeps it open (never toggles it shut).
  await page.click("#headSearchBtn"); await page.waitForTimeout(250);
  check(`[${lang} ${width}] a second tap keeps it open, cursor back in the box`, await page.evaluate(() => !document.getElementById("panelStudyOptions").hidden && document.activeElement?.id === "jumpInput"));
  if (lang === "en" && width === 390) await page.screenshot({ path: `${SHOT_DIR}/head-search-open-${lang}-${width}.png` });
  await ctx.close();
}

// ---- With the "Previewing as" badge (an owner previewing a role).
// UPDATED IN PLACE 10 Oct 2026, the Owner: "Prime now takes another bar space. Place it left to search as only 'Prime'".
// It used to inject a fake badge AFTER Search, so the real relocatePreviewNotice() never ran here. Now a real
// "View as: Prime" preview (qr.sessionContext.viewAsRole) renders it: the role word alone, left of Search, on the
// title's line, with the whole sentence as its spoken name.
for (const [lang, width] of [["en", 360], ["en", 390], ["en", 412], ["en", 1280], ["bn", 390], ["bn", 360]]) {
  const { ctx, page } = await start({ lang, width });
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("qr.sessionContext") || "null"); if (c) { c.viewAsRole = "prime"; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); } });
  await page.reload();
  await page.waitForSelector("h1 .nav-preview-notice", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const R = (e) => e?.getBoundingClientRect();
    const h1 = document.querySelector("h1");
    const n = h1.querySelector(".nav-preview-notice");
    const t = R(document.getElementById("appTitleText")), b = R(document.getElementById("headSearchBtn")), r = R(n);
    return {
      badge: !!n, text: n?.textContent.trim(), label: n?.getAttribute("aria-label") ?? "",
      onTitleLine: !!r && r.top < t.bottom && r.bottom > t.top, searchOnTitleLine: b.top < t.bottom && b.bottom > t.top,
      leftOfSearch: !!r && r.right <= b.left + 1, overlapTitle: !!r && r.left < t.right - 1,
      over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      inNavBar: !!document.querySelector("#navBar .nav-preview-notice"),
    };
  });
  const word = lang === "en" ? m.text === "Prime" : (!!m.text && !/[A-Za-z]/.test(m.text) && m.text.length < 12);
  check(`[${lang} ${width}] the preview badge is the role word alone (${m.text}), its spoken name the whole sentence`, m.badge && word && m.label.length > m.text.length && m.label.includes(m.text), JSON.stringify(m));
  check(`[${lang} ${width}] ...left of Search, on the title's line, no overlap, no second copy in the nav, no sideways scroll`, m.onTitleLine && m.searchOnTitleLine && m.leftOfSearch && !m.overlapTitle && !m.inNavBar && !m.over, JSON.stringify(m));
  await ctx.close();
}

console.log(`\n==== Banner Search button (Owner decision 38): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
