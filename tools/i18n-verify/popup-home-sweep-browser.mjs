// PCF MSA J72, the sweep's second part (the Owner, 22 Oct 2026: "all screen that opens from a click should appear in the
// same size of the home screen it was click from and must have a back button/ arrow to come back"). Measured before, at
// 1440x900 with the home rect at 200,120 860x600: the Track window (way-modal.js; Hadith, Deen, Asma and every topic
// page) opened as a 512px box with only ×, and both Asma full-size posters covered the whole screen.
// (1) The Track window opens at exactly the home rect on Hadith and Deen (topic-study.js) and Asma (asma-study.js), with
//     a 40px ← Back (readable, in the page's language) that closes it.
// (2) Asma's full-size poster (asma-study.html, and Explore's in quranrevival.html) opens at exactly the home rect, the
//     poster inside its box, ← Back to {Name} closes it.
// (3) Inside a page window (J74, Hadith opened from the menu) the Track window fills the window's frame.
// (4) A phone (390) keeps today's layout (nothing placed), and the Track window there has ← Back too.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=nohome   placeDialogAtHome places nothing           -> (1)(2)(3) fail
//   --mutate=noframe  a page window is not told apart           -> (3) fails
//   --mutate=noback   ← Back does nothing                        -> (1)(4) "closes it" fail
//   --mutate=nobtn    no ← Back in the Track window              -> (1)(4) fail
//   --mutate=seethru  the poster's box keeps the dim layer         -> (2) "its box is solid" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nohome: ["js/home-window.js", "  const placed = placeAtHome(el, r);", "  const placed = placeAtHome(el, null);"],
  noframe: ["js/home-window.js", "export function inPageWindow() { try { return window.self !== window.top; } catch { return true; } }", "export function inPageWindow() { return false; }"],
  noback: ["js/way-modal.js", "if (backBtn && onClose) backBtn.addEventListener(\"click\", onClose);", "void backBtn;"],
  seethru: ["asma-study.html", "#posterOverlay.at-home { border-radius: 10px; box-shadow: 0 12px 40px rgba(10, 20, 45, 0.35); background: #26324a; }", "#posterOverlay.at-home { border-radius: 10px; }"],
  nobtn: ["js/way-modal.js", "      <button type=\"button\" class=\"way-back-btn\">${escapeHtml(t(\"← Back\"))}</button>\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// 860 wide: the page window's frame (858px) is then narrower than HOME_FROM, where only the frame branch can fill it (with a
// frame of 900px or more the clamped home rect happens to fill it too, and --mutate=noframe went unproven).
const HOME = { x: 200, y: 120, w: 860, h: 600 };
const BN = /[ঀ-৿]/;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const seedOf = (m) => `
(function () {
  const root = "${m.root}", mod = "${m.id}", id = (s) => TENANT_ID + "__" + s;
  DATA.trackables = DATA.trackables.filter((t) => t._id !== id("${m.trackable}"));
  DATA.trackables.push({ _id: id("${m.trackable}"), tenantId: TENANT_ID, subjectId: root, order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"), groupName: lang("Understanding", "অনুধাবন"), guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") }, panels: ["text"] });
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes(mod));
  const node = (sid, parent, anc, en, bn, order, leaf) => DATA.subjects.push({ _id: id(sid), tenantId: TENANT_ID, subjectId: sid, parentId: parent, name: lang(en, bn), moduleIds: [mod], ancestorIds: anc, status: "active", order, ...(leaf ? { isTrackable: true, resourceIds: ["r1"] } : {}) });
  node(root, null, [], "${m.id}", "${m.id}", 1, false);
  node("leaf_b", root, [root], "Short topic", "ছোট বিষয়", 1, true);
})();`;
const TOPICS = [
  { id: "hadith", root: "hadith", page: "hadith-study.html", trackable: "studied_hadith" },
  { id: "deen", root: "deen_study", page: "deen-study.html", trackable: "studied_deen" },
];

async function ctxFor(lang, width, { seed = null, home = true } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (home) await ctx.addInitScript((h) => { try { localStorage.setItem("mmsa-home-window-v1", JSON.stringify({ ...h, user: true })); } catch { /* */ } }, HOME);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); const n = src.split(a).length - 1; if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`); await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const clean = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
const rectOf = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const same = (a, b, t = 2) => !!a && !!b && Math.abs(a.x - b.x) <= t && Math.abs(a.y - b.y) <= t && Math.abs(a.w - b.w) <= t && Math.abs(a.h - b.h) <= t;
const CONTRAST = `(a, b) => { const p = (c) => (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); const L = (c) => { const [r, g, b2] = p(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b2; }; const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }`;
// The ← Back in the Track window: on screen, the thing under its own centre, 40px, readable, in the page's language.
const backState = (P) => P.evaluate(`(() => { const contrast = ${CONTRAST}; const b = document.querySelector("#wayModalMount .way-back-btn"); if (!b) return null; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const cs = getComputedStyle(b); return { text: b.textContent.trim(), h: Math.round(r.height), hit: !!at && (at === b || b.contains(at)), c: +contrast(cs.color, cs.backgroundColor).toFixed(2) }; })()`);
const backOk = (b, lang) => !!b && b.h >= 39.5 && b.hit && b.c >= 4.5 && /^← /.test(b.text) && (lang === "bn" ? BN.test(b.text) : b.text === "← Back");
// A rendered colour, not a class: rgb(...) or rgba(..., 1) is solid; the old dim layer was rgba(0, 0, 0, 0.65).
const opaque = (P, sel) => P.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)).backgroundColor; const a = c.startsWith("rgba") ? Number(c.match(/[\d.]+/g)[3]) : 1; return a === 1; }, sel);
const isOpen = (P) => P.evaluate(() => document.getElementById("wayModalOverlay").classList.contains("open"));

async function openTopicTrack(P) {
  await P.waitForSelector("#listContainer .topic-row-leaf", { timeout: 20000 });
  await P.click("#listContainer .topic-row-leaf"); await P.waitForTimeout(900);
  await P.click("#trackTopicBtn"); await P.waitForTimeout(700);
}

for (const lang of ["en", "bn"]) {
  // (1) the Track window on Hadith and Deen, at 1440
  for (const m of TOPICS) {
    const tag = `[${lang} 1440 ${m.id}]`;
    const ctx = await ctxFor(lang, 1440, { seed: seedOf(m) });
    const { page: P } = await openPage(ctx, `/app/${m.page}`);
    await clean(P);
    try {
      await openTopicTrack(P);
      const r = await rectOf(P, "#wayModalMount");
      check(`${tag} Track opens at exactly the home rect`, same(r, HOME), JSON.stringify({ r, HOME }));
      const b = await backState(P);
      check(`${tag} ...with a 40px, readable ← Back in the page's language`, backOk(b, lang), JSON.stringify(b));
      await P.click("#wayModalMount .way-back-btn", { timeout: 3000 }).catch(() => {}); await P.waitForTimeout(300);
      check(`${tag} ...← Back closes it`, !(await isOpen(P)));
    } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
    await ctx.close();
  }

  // (1) the Track window and (2) the full-size poster on asma-study.html
  {
    const tag = `[${lang} 1440 asma-study]`;
    const ctx = await ctxFor(lang, 1440);
    const { page: P } = await openPage(ctx, "/app/asma-study.html");
    await clean(P);
    try {
      await P.waitForSelector('.asma-card[data-number="1"]', { timeout: 15000 });
      await P.click('.asma-card[data-number="1"]'); await P.waitForSelector("#trackAsmaBtn", { timeout: 8000 });
      await P.click("#trackAsmaBtn"); await P.waitForTimeout(700);
      check(`${tag} Track opens at exactly the home rect`, same(await rectOf(P, "#wayModalMount"), HOME), JSON.stringify(await rectOf(P, "#wayModalMount")));
      check(`${tag} ...with a 40px, readable ← Back`, backOk(await backState(P), lang), JSON.stringify(await backState(P)));
      await P.click("#wayModalMount .way-back-btn", { timeout: 3000 }).catch(() => {}); await P.waitForTimeout(300);
      check(`${tag} ...← Back closes it`, !(await isOpen(P)));
      await P.click("#posterAsmaBtn"); await P.waitForTimeout(800);
      const o = await rectOf(P, "#posterOverlay"), poster = await rectOf(P, "#posterMount .ahp-standalone");
      check(`${tag} the full-size poster opens at exactly the home rect`, same(o, HOME), JSON.stringify(o));
      check(`${tag} ...its box is solid (the page behind does not show through)`, await opaque(P, "#posterOverlay"), await P.evaluate(() => getComputedStyle(document.getElementById("posterOverlay")).backgroundColor));
      check(`${tag} ...the poster sits inside its box, at least 300px wide`, !!poster && !!o && poster.x >= o.x && poster.x + poster.w <= o.x + o.w + 1 && poster.w >= 300, JSON.stringify({ o, poster }));
      await P.click("#posterBackBtn"); await P.waitForTimeout(300);
      check(`${tag} ...← Back to {Name} closes it`, await P.evaluate(() => !document.querySelector("#posterOverlay.open")));
    } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
    await ctx.close();
  }

  // (2) Explore's Asma full-size poster on the Qur'an page
  {
    const tag = `[${lang} 1440 Explore Asma]`;
    const ctx = await ctxFor(lang, 1440);
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    await clean(P); await P.waitForTimeout(800);
    try {
      await P.click("#tabExploreBtn"); await P.waitForTimeout(700);
      await P.click("#explorePaletteAsmaBtn");
      await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 });
      await P.selectOption("#asmaXSingleSelect", "1");
      await P.waitForSelector("#asmaXPosterPanel", { timeout: 6000 }); await P.waitForTimeout(300);
      await P.click("#asmaXPosterPanel"); await P.waitForTimeout(800);
      const o = await rectOf(P, "#asmaXPosterOverlay"), poster = await rectOf(P, "#asmaXPosterMount .ahp-standalone");
      check(`${tag} the full-size poster opens at exactly the home rect`, same(o, HOME), JSON.stringify(o));
      check(`${tag} ...its box is solid (the page behind does not show through)`, await opaque(P, "#asmaXPosterOverlay"), await P.evaluate(() => getComputedStyle(document.getElementById("asmaXPosterOverlay")).backgroundColor));
      check(`${tag} ...the poster sits inside its box, at least 300px wide`, !!poster && !!o && poster.x >= o.x && poster.x + poster.w <= o.x + o.w + 1 && poster.w >= 300, JSON.stringify({ o, poster }));
      await P.click("#asmaXPosterBackBtn"); await P.waitForTimeout(300);
      check(`${tag} ...← Back to {Name} closes it, Explore still there`, await P.evaluate(() => !document.querySelector("#asmaXPosterOverlay.open") && !!document.getElementById("asmaXPosterPanel")));
    } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
    await ctx.close();
  }
}

// (3) inside a page window: Hadith from the menu, then Track fills the window's frame
{
  const tag = "[en 1440 Hadith in a page window]";
  const ctx = await ctxFor("en", 1440, { seed: seedOf(TOPICS[0]) });
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  await clean(P); await P.waitForTimeout(1000);
  try {
    await P.evaluate(() => { const a = [...document.querySelectorAll(".app-nav a.nav-link[href]")].find((x) => x.getAttribute("href").startsWith("hadith-study.html")); a.closest("details")?.setAttribute("open", ""); a.click(); });
    let F = null;
    for (let i = 0; i < 80 && !F; i++) { F = P.frames().find((x) => x.url().includes("/app/hadith-study.html") && /inWindow=1/.test(x.url())) || null; if (!F) await P.waitForTimeout(100); }
    check(`${tag} POSITIVE CONTROL: Hadith opens in the page window`, !!F);
    await openTopicTrack(F);
    const s = await F.evaluate(() => { const r = document.getElementById("wayModalMount").getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight }; });
    check(`${tag} Track fills the window's frame (the home size there)`, s.x === 0 && s.y === 0 && Math.abs(s.w - s.vw) <= 1 && Math.abs(s.h - s.vh) <= 1, JSON.stringify(s));
  } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
  await ctx.close();
}

// (4) a phone keeps today's layout; ← Back is there too
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 390 hadith]`;
  const ctx = await ctxFor(lang, 390, { seed: seedOf(TOPICS[0]) });
  const { page: P } = await openPage(ctx, "/app/hadith-study.html");
  await clean(P);
  try {
    await openTopicTrack(P);
    const s = await P.evaluate(() => { const m = document.getElementById("wayModalMount"); const r = m.getBoundingClientRect(); return { placed: m.classList.contains("at-home") || !!m.style.left, l: r.left, r: r.right, w: Math.round(r.width) }; });
    check(`${tag} Track is not placed (phone layout as before), inside the screen`, !s.placed && s.l >= 0 && s.r <= 390, JSON.stringify(s));
    check(`${tag} ...with a 40px, readable ← Back`, backOk(await backState(P), lang), JSON.stringify(await backState(P)));
    const over = await P.evaluate(() => { const h = document.querySelector("#wayModalMount .way-modal-header"); return h ? h.scrollWidth - h.clientWidth : -1; });
    check(`${tag} ...the header does not run sideways`, over === 0, String(over));
    await P.click("#wayModalMount .way-back-btn", { timeout: 3000 }).catch(() => {}); await P.waitForTimeout(300);
    check(`${tag} ...← Back closes it`, !(await isOpen(P)));
  } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
  await ctx.close();
}

await browser.close();
console.log(`\n==== J72 sweep, part 2 (Track window, Asma posters at the home size, with ← Back): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
