// QR Lead (the Owner, 23 Oct 2026, two screenshots of An-Nahl's Mushaf on a computer):
//   1. "the right nav button doesn't work at all, the left nav button does things weird. sometimes bring to next page,
//      sometime 10/ more page apart" -- ‹ › (#mushafPagePrevBtn / #mushafPageNextBtn) must move EXACTLY one printed page.
//   2. "the image show a 3rd broke page" -- a computer showed two pages and a cut slice of a third: every page the strip
//      shows must be shown WHOLE.
//   3. "I want both read to be the same (preferably the 1st image which shows Surah list)" -- Study -> Read gets the
//      same bar as Read -> list -> a surah: ☰ Surah list, and Notes / Record / Approach in the bare full screen.
// Run from the repository root with serve.js on :8080 (or QR_BASE=<a built QR>):
//   node tools/i18n-verify/qr-mushaf-page-nav-browser.mjs [--mutate=NAME]
// Each mutation restores the old code and must make its part FAIL:
//   into-view   ‹ › scroll with scrollIntoView again          -> part 1 fails at 1280/1520
//   no-fit      the strip is not sized to whole pages          -> part 2 fails at 1280/1520
//   one-route   only Read -> list gets the Surah-list bar      -> part 3 fails
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "into-view": ["if (el) { scrollToMushafPage(el); updateMushafPageRef(); }", "if (el) { el.scrollIntoView({ inline: \"start\", block: \"start\", behavior: \"instant\" }); updateMushafPageRef(); }"],
  "no-fit": ["    function fitMushafStrip() {\n", "    function fitMushafStrip() { return;\n"],
  "one-route": ["document.body.classList.toggle(\"read-from-contents\", reading); // issue #419", "if (!reading) document.body.classList.remove(\"read-from-contents\"); // issue #419"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(width, height) {
  const ctx = await newContext(browser, { viewport: { width, height } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  return { ctx, page };
}
const pageNow = (page) => page.evaluate(() => Number(document.getElementById("mushafPageRef")?.dataset.page || 0));
// The pages the strip really shows (it clips: overflow), and whether any of them is cut.
const strip = (page) => page.evaluate(() => {
  const s = document.getElementById("pageViewContainer"), r = s.getBoundingClientRect();
  const L = r.left + s.clientLeft, R = L + s.clientWidth;
  const shown = [...s.querySelectorAll(":scope > .hifz-page")].map((el) => { const b = el.getBoundingClientRect(); return { p: Number(el.dataset.mushafPage), l: b.left, r: b.right, vis: Math.min(b.right, R) - Math.max(b.left, L) }; }).filter((x) => x.vis > 1);
  return { cut: shown.filter((x) => x.vis < x.r - x.l - 1).map((x) => `${x.p}:${Math.round(x.vis)}/${Math.round(x.r - x.l)}`), pages: shown.map((x) => x.p), stripW: Math.round(s.clientWidth) };
});
async function settle(page, from) {
  await page.waitForFunction((p) => Number(document.getElementById("mushafPageRef")?.dataset.page) !== p, from, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(700);
}

for (const [width, height] of [[1520, 1000], [1280, 800], [390, 844]]) {
  const tag = `[${width}]`;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page } = await start(width, height);
  await page.click("#readContentsBtn");
  await page.locator("#readContentsMount button", { hasText: "An-Nahl" }).first().click();
  await page.waitForFunction(() => !!document.getElementById("mushafPageRef")?.dataset.page, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const p0 = await pageNow(page);
  check(`${tag} POSITIVE CONTROL: Read -> list -> An-Nahl opens its first printed page (267)`, p0 === 267, String(p0));
  const s0 = await strip(page);
  check(`${tag} POSITIVE CONTROL: the strip shows at least one page`, s0.pages.length >= 1, JSON.stringify(s0));
  check(`${tag} part 2: no page is cut (${s0.pages.join(", ")} in ${s0.stripW}px)`, s0.cut.length === 0, JSON.stringify(s0));
  if (width >= 1280) check(`${tag} part 2: a computer shows a two-page spread, 267 on the right`, s0.pages.length === 2 && s0.pages.includes(267) && s0.pages.includes(268), JSON.stringify(s0));
  // Part 1: › three times, ‹ four times (the fourth crosses into An-Nahl's previous surah, page 266).
  let cur = p0;
  for (const [btn, dir, n] of [["#mushafPageNextBtn", 1, 3], ["#mushafPagePrevBtn", -1, 4]]) for (let i = 0; i < n; i++) {
    await page.click(btn); await settle(page, cur);
    const now = await pageNow(page), st = await strip(page);
    check(`${tag} part 1: ${dir > 0 ? "›" : "‹"} moves exactly one page (${cur} → ${now}) and that page is on screen, whole`, now === cur + dir && st.pages.includes(now) && st.cut.length === 0, JSON.stringify(st));
    cur = now;
  }
  if (width === 1520) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-mushaf-nav-${width}.png` });
  await ctx.close();
}

// Part 3: Study -> Read is the same Read.
for (const width of [1280, 390]) {
  const tag = `[study-read ${width}]`;
  const { ctx, page } = await start(width, 800);
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.click("#tabStudyBtn"); await page.click("#tabReadBtn");
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    return { reading: document.getElementById("readView")?.offsetParent !== null, list: vis("readListBtn"), quick: vis("readQuickRow") && ["readQuickNoteBtn", "readQuickTrackBtn", "readQuickApproachBtn"].every(vis) };
  });
  check(`${tag} POSITIVE CONTROL: Study -> Read opened the Read view`, m.reading, JSON.stringify(m));
  check(`${tag} part 3: ☰ Surah list is on the bar`, m.list, JSON.stringify(m));
  check(`${tag} part 3: Notes / Record / Approach are on the bare full screen`, m.quick, JSON.stringify(m));
  await page.click("#readListBtn").catch(() => {}); await page.waitForTimeout(800);
  check(`${tag} part 3: ☰ opens the Surah list`, await page.evaluate(() => !document.getElementById("readContentsMount")?.hidden));
  await ctx.close();
}

await browser.close();
console.log(`\n==== QR Mushaf ‹ › / whole pages / one Read${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
