// Issue #719 -- the Owner, 9 Oct 2026: "The writing view should have a progress record button for All family".
// ✅ Record on the writing sheet's second row HIDES the sheet (never destroys it: the writing is stored nowhere),
// opens the unit's card (the Āyah card for an āyah) with its 👥 picker, and leaves "Back to the writing sheet",
// which shows the sheet exactly as it was. Expected values written by hand (fixture p1 Ahsan, p2 Maryam).
// Run from the repository root, serve.js on :8080, at 390px Bangla and 1280px English.
//   --mutate=destroy    the sheet is destroyed instead of hidden -> the ink / sheet-kept checks fail
//   --mutate=noback     no way back is set                       -> the pill check fails
//   --mutate=self-only  only the Student is recorded             -> the two-person check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  destroy: ["js/writing-sheet.js", "          root.hidden = true;\n          onRecord?.(", "          root.hidden = true; destroy();\n          onRecord?.("],
  noback: ["quranrevival.html", '            setAppReturn(t("Back to the writing sheet")', '            (() => {})(t("Back to the writing sheet")'],
  "self-only": ["quranrevival.html", "      const targets = claimTargetIds();\n", "      const targets = [selectedPersonId];\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SEED = `
DATA.records.push(
  { _id: "t1__p1__surah_2", tenantId: "t1", personId: "p1", entries: {} },
  { _id: "t1__p2__surah_2", tenantId: "t1", personId: "p2", entries: {} }
);`;
const NAMES = { en: ["Ahsan", "Maryam"], bn: ["আহসান", "মারইয়াম"] };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["bn", 390, 844], ["en", 1280, 800]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_card_look", "night"); } catch (e) {} });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  const onBar = await ev(() => (document.getElementById("readWritingBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (onBar) await P.click("#readWritingBtn"); else { await P.click("#tabStudyBtn"); await P.click("#tabWritingBtn"); }
  await P.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 });
  await P.waitForTimeout(300);

  // 1. Where ✅ sits.
  const geo = await ev(() => {
    const r = (s) => { const e = document.querySelector(s); const b = e?.getBoundingClientRect(); return b ? { l: b.left, r: b.right, t: b.top, h: b.height, w: b.width } : null; };
    return { rec: r('#writingSheet [data-ws="record"]'), bm: r('#writingSheet [data-ws="bookmark"]'), row2: r("#writingSheet .ws-row2"), vw: innerWidth };
  });
  check(`${tag} ✅ is on row 2, inside the screen, 40px or more`, !!geo.rec && geo.rec.l >= 0 && geo.rec.r <= geo.vw && geo.rec.h >= 40 && geo.rec.t >= geo.row2.t - 1 && geo.rec.t + geo.rec.h <= geo.row2.t + geo.row2.h + 1, JSON.stringify(geo));
  check(`${tag} ✅ is the same height as 🔖`, !!geo.bm && Math.abs(geo.rec.h - geo.bm.h) < 1, JSON.stringify(geo));
  // Row 2 holds one line of buttons: its height is one button plus its padding (hand-written: under 2 x 40 + padding).
  check(`${tag} row 2 is still ONE line (height under 64px)`, geo.row2.h < 64, JSON.stringify(geo.row2));

  // 2. Draw a stroke.
  await clickWs(P, '[data-ws="write"]');
  const box = await ev(() => { const r = document.querySelector("#writingSheet .ws-page .ws-ink").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await P.mouse.move(box.x + box.w * 0.2, box.y + 60); await P.mouse.down();
  await P.mouse.move(box.x + box.w * 0.6, box.y + 100, { steps: 5 }); await P.mouse.move(box.x + box.w * 0.8, box.y + 80, { steps: 5 }); await P.mouse.up();
  await P.waitForTimeout(150);
  const ink = () => ev(() => { const c = document.querySelector("#writingSheet .ws-page .ws-ink"); if (!c) return -1; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  const inkBefore = await ink();
  check(`${tag} the stroke left ink on the canvas`, inkBefore > 0, String(inkBefore));
  await ev(() => { document.querySelector("#writingSheet [data-ws-scroll]").scrollTop = 120; });
  await P.waitForTimeout(100);
  const scrollBefore = await ev(() => document.querySelector("#writingSheet [data-ws-scroll]").scrollTop);

  // 3. Press ✅.
  await ev(() => document.querySelector('#writingSheet [data-ws="record"]').click());
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") && document.querySelector("[data-ayah-sheet] [data-claim-for]"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);
  const st = await ev(() => { const s = document.getElementById("writingSheet"); return { inPage: !!s, shown: !!s && s.getBoundingClientRect().width > 0 && getComputedStyle(s).display !== "none", card: !!document.querySelector("[data-ayah-sheet] [data-claim-for]") }; });
  check(`${tag} the sheet is HIDDEN but still in the page, and the Āyah card is open`, st.inPage && !st.shown && st.card, JSON.stringify(st));
  const back = await ev(() => { const p = document.querySelector("#ayahCardBackPill:not([hidden])"); return p ? p.textContent : null; });
  check(`${tag} "Back to the writing sheet" is on screen`, !!back && back.includes(lang === "bn" ? "লেখার শিটে ফিরুন" : "Back to the writing sheet"), String(back));
  await P.click("[data-ayah-sheet] [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(150);
  const offered = await ev(() => [...document.querySelectorAll('[data-ayah-sheet] [data-claim-for] [data-assign-list] input')].map((i) => i.value).sort());
  check(`${tag} the 👥 picker offers both p1 and p2`, offered.includes("p1") && offered.includes("p2"), JSON.stringify(offered));
  await P.click('[data-ayah-sheet] [data-claim-for] [data-assign-list] input[value="p2"]');
  await P.click("[data-ayah-sheet] [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(100);
  const approach = await ev(() => { const s = document.querySelector("[data-ayah-sheet] [data-approach-stage-select]"); const v = [...(s?.options ?? [])].map((o) => o.value).find((x) => x); if (s && v) { s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); } return v; });
  await P.waitForTimeout(400);
  const n = await ev(() => (window.__stubWriteData || []).length);
  await P.click('[data-ayah-sheet] [data-approach-stage-btn="learning"]'); await P.waitForTimeout(1000);
  const w = await ev(([k, a]) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => [x.id, x.data?.[`entries.ayah:2:255::${a}`]?.claimedStatus ?? null]), [n, approach]);
  check(`${tag} Learning is written for BOTH Ahsan (p1) and Maryam (p2)`, !!approach && w.some(([id, s]) => id === "t1__p1__surah_2" && s === "learning") && w.some(([id, s]) => id === "t1__p2__surah_2" && s === "learning"), JSON.stringify(w));

  // 4. Back.
  await P.click("[data-ayah-card-back]").catch(() => {});
  await P.waitForTimeout(500);
  const after = await ev(() => { const s = document.getElementById("writingSheet"); return { shown: !!s && s.getBoundingClientRect().width > 0, cardClosed: !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), pill: !!document.querySelector("#ayahCardBackPill:not([hidden])"), scroll: s?.querySelector("[data-ws-scroll]")?.scrollTop ?? -1 }; });
  check(`${tag} Back shows the sheet again, closes the card and the pill`, after.shown && after.cardClosed && !after.pill, JSON.stringify(after));
  const inkAfter = await ink();
  check(`${tag} the same canvas still has its ink (${inkBefore} pixels)`, inkAfter === inkBefore && inkAfter > 0, `${inkAfter} vs ${inkBefore}`);
  check(`${tag} the scroll position is the same (${scrollBefore})`, scrollBefore > 0 && Math.abs(after.scroll - scrollBefore) <= 1, `${after.scroll} vs ${scrollBefore}`);
  check(`${tag} no sideways scroll`, await ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
async function clickWs(page, sel) { await page.evaluate((s) => document.querySelector(`#writingSheet ${s}`).click(), sel); }
await browser.close();
console.log(`\n==== Writing sheet ✅ Record for every family member: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
