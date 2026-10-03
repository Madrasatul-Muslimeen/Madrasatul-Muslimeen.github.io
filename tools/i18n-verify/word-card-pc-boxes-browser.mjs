// Word card round 7 (#525, decision 59) -- the two PC boxes: Record your Progress
// (four coloured stage buttons) and Know Your Status (the percentage ring).
// en and bn. Expected values are written by hand, never read from the code under test.
// Run from the repository root with `node serve.js` running.
//   --mutate-ring  makes the ring read the WbW total on every tab (route rewrite);
//                  the "each tab shows its own level's percentage" check must fail.
//   --dump=FILE    write the phone-width measurements (parts boxes, stage buttons) to FILE
//   --compare=FILE compare the phone-width measurements against a FILE dumped from `main` (+-1px)
//   --shots        screenshots to /tmp/pcboxes-*.png
//   --lang=en|bn   narrow a run.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const MUTATE = process.argv.includes("--mutate-ring");
const SHOTS = process.argv.includes("--shots");
const DUMP = arg("dump"), COMPARE = arg("compare");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bnDigits = (s) => String(s).replace(/\d/g, (d) => BN_DIGITS[d]);
// Hand-computed: round(known * 10000 / 77429) / 100, two decimals.
const RING = { wbw: "28.16", basic: "12.92", depth: "6.46" };
const CIRC = 2 * Math.PI * 50;
const LABELS = { en: ["Not started", "Learning", "Practising", "Achieved"], bn: ["শুরু হয়নি", "শিখছি", "অনুশীলন করছি", "অর্জিত হয়েছে"] };
const HEADINGS = { en: ["Record your Progress", "Know Your Status"], bn: ["আপনার অগ্রগতি লিখুন", "আপনার অবস্থা জানুন"] };
const BG = { learning: "rgb(138, 106, 53)", practising: "rgb(201, 162, 75)", achieved: "rgb(91, 132, 196)" };

const SEED = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__wbw__1_7", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 7, entries: { "6": { s: "l", at: "2026-09-13T10:00:00.000Z", by: "p1" } } },
];
DATA.quranWordApprovals = [];
DATA.quranWordTotals = [
  { _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", level: "wbw", known: 21805, total: 77429, byJuz: {} },
  { _id: TENANT_ID + "__p1__basic", tenantId: TENANT_ID, personId: "p1", level: "basic", known: 10000, total: 77429, byJuz: {} },
  { _id: TENANT_ID + "__p1__depth", tenantId: TENANT_ID, personId: "p1", level: "depth", known: 5000, total: 77429, byJuz: {} },
];
`;

async function openWord(page, position) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(250);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s && s.value !== "7") { s.value = "7"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction((p) => !!document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`), position, { timeout: 8000 }).catch(() => {});
  await page.evaluate((p) => { document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`)?.click(); }, position);
  await page.waitForFunction(() => { const b = document.querySelector("#quranWordCardMount [data-word-progress]"); return !!b && !!b.querySelector("[data-word-progress-state]"); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
}

const measure = (page) => page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const root = document.querySelector("#quranWordCardMount");
  const panel = root.querySelector("[data-word-card-panel]");
  const main = panel.querySelector(".word-card-main") ?? panel;
  const rec = root.querySelector("[data-word-progress-rec]") ?? root.querySelector("[data-word-progress]"), status = root.querySelector("[data-word-progress-status]");
  const ring = root.querySelector("[data-word-progress-ring]");
  const arc = ring?.querySelector(".word-progress-ring-arc");
  const vis = (el) => !!el && el.getBoundingClientRect().width > 0;
  return {
    card: R(root.querySelector(".quran-word-card")), main: R(main), rec: R(rec), status: R(status),
    // the left column's own content: the last visible child before the boxes
    mainChildren: [...main.children].map(R).filter(Boolean),
    buttons: [...root.querySelectorAll("[data-word-progress-state]")].map((el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { state: el.dataset.wordProgressState, text: el.textContent.trim(), l: r.left, r: r.right, t: r.top, w: r.width, h: r.height, bg: cs.backgroundColor, pressed: el.getAttribute("aria-pressed") === "true", cut: el.scrollWidth > el.clientWidth + 1 }; }),
    parts: [...root.querySelectorAll("[data-word-card-part]")].map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }),
    headings: [...root.querySelectorAll(".word-progress-heading-pc")].filter(vis).map((h) => h.textContent.trim()),
    phoneHeadingVisible: vis(root.querySelector(".word-progress-heading-phone")),
    where: root.querySelector(".word-progress-where")?.textContent.trim() ?? null,
    ringVisible: vis(ring), ringLabel: ring?.getAttribute("aria-label") ?? null,
    ringNum: ring?.querySelector(".word-progress-ring-num")?.textContent.trim() ?? null,
    arcLen: arc ? Number(arc.getAttribute("stroke-dasharray").split(" ")[0]) : null,
    hasArc: !!arc,
    coverage: R(root.querySelector(".word-progress-coverage")), coverageText: root.querySelector(".word-progress-coverage")?.textContent ?? "",
    known: R(root.querySelector(".word-progress-whole-quran-box")),
    ringRect: R(ring),
    sidewaysScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    contentScroll: (() => { const c = root.querySelector(".word-card-content") || root; return c.scrollWidth - c.clientWidth; })(),
  };
});
const press = async (page, state) => { await page.click(`#quranWordCardMount [data-word-progress-state="${state}"]`); await page.waitForTimeout(450); };
const tab = async (page, level) => { await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`); await page.waitForTimeout(500); };
const dumped = {};

for (const lang of ["en", "bn"].filter((l) => !arg("lang") || arg("lang") === l)) {
  const digits = (s) => (lang === "bn" ? bnDigits(s) : s);
  // ---- wide: 1280 and 1440 -------------------------------------------------
  // UPDATED IN PLACE (Architect review of #525): two columns only from a 62rem card, so Depth's three conjugation
  // tables keep their side-by-side row; 1024 (an 881px card) keeps today's single column and is checked below.
  for (const width of process.argv.includes("--narrow-only") ? [] : [1280, 1440]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    if (MUTATE) {
      await ctx.route("**/js/quran-word-card.js", async (route) => {
        const res = await route.fetch();
        const src = await res.text();
        const body = src.replace('const level = wbw.level ?? "wbw";', 'const level = "wbw";');
        if (body === src) throw new Error("mutation did not apply");
        await route.fulfill({ response: res, body });
      });
    }
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openWord(page, 6);
    for (const level of ["wbw", "basic", "depth"]) {
      const T = `[${L} ${level}]`;
      if (level !== "wbw") await tab(page, level);
      const m = await measure(page);
      check(`${T} Record your Progress sits to the right of the tab content`, !!m.rec && !!m.main && m.rec.l >= m.main.r - 0.5, JSON.stringify({ rec: m.rec?.l, mainRight: m.main?.r }));
      check(`${T} Know Your Status sits to the right of the tab content, below the first box`, !!m.status && m.status.l >= m.main.r - 0.5 && m.status.t >= m.rec.b - 0.5, JSON.stringify({ st: m.status, rec: m.rec }));
      check(`${T} the two PC headings, in ${lang}`, JSON.stringify(m.headings) === JSON.stringify(HEADINGS[lang]) && !m.phoneHeadingVisible, JSON.stringify(m.headings));
      const levelWord = { en: { wbw: "WbW", basic: "Basic", depth: "Depth" }, bn: { wbw: "শব্দে শব্দে", basic: "প্রাথমিক", depth: "গভীরতা" } }[lang][level];
      check(`${T} the small line names level · āyah · word`, m.where === `${levelWord} · 1:7 · ${lang === "bn" ? `শব্দ ${bnDigits(6)}` : "word 6"}`, String(m.where));
      check(`${T} four stage buttons in the box: none cut, each >= 40px high, each inside the box`, m.buttons.length === 4 && JSON.stringify(m.buttons.map((b) => b.text)) === JSON.stringify(LABELS[lang]) && m.buttons.every((b) => !b.cut && b.h >= 40 && b.l >= m.rec.l - 0.5 && b.r <= m.rec.r + 0.5), JSON.stringify(m.buttons.map((b) => [b.text, b.w, b.h, b.cut])));
      // WbW's seeded word is Learning; Basic and Depth have no record, so Not started is pressed (its own dark colour).
      const pressedWant = level === "wbw" ? ["learning", BG.learning] : ["not_started", "rgb(51, 63, 92)"];
      check(`${T} the pressed button (${pressedWant[0]}) keeps its stage colour`, m.buttons.find((b) => b.pressed)?.state === pressedWant[0] && m.buttons.find((b) => b.pressed)?.bg === pressedWant[1], JSON.stringify(m.buttons.find((b) => b.pressed)));
      // The coverage line ("N of M words known in this āyah") is WbW's alone, as on main.
      const inStatus = (r) => !!r && r.w > 0 && r.l >= m.status.l - 0.5 && r.r <= m.status.r + 0.5;
      check(`${T} Know Your Status holds the ring${level === "wbw" ? ", the coverage line" : ""} and the "You know" box`, m.ringVisible && inStatus(m.ringRect) && inStatus(m.known) && (level === "wbw" ? inStatus(m.coverage) : !m.coverage), JSON.stringify({ ring: m.ringRect, cov: m.coverage, known: m.known, st: m.status }));
      if (level === "wbw") check(`${T} the ring beside the coverage line, not under it`, m.coverage.l >= m.ringRect.r - 0.5, JSON.stringify({ ring: m.ringRect?.r, cov: m.coverage?.l }));
      // The ring: this level's own percentage, the arc 28.16% of the circumference.
      check(`${T} the ring reads ${digits(RING[level])}%`, m.ringNum === `${digits(RING[level])}%`, String(m.ringNum));
      check(`${T} the ring's aria-label`, m.ringLabel === (lang === "bn" ? `কুরআনের ${digits(RING[level])}% শব্দ জানা` : `${RING[level]}% of the words of the Qur'an known`), String(m.ringLabel));
      const want = (Number(RING[level]) / 100) * CIRC;
      check(`${T} the arc is ${RING[level]}% of the circumference (+-0.5%)`, m.hasArc && Math.abs(m.arcLen - want) <= CIRC * 0.005, `${m.arcLen} vs ${want.toFixed(2)}`);
      check(`${T} "You know" line for this level says the same number`, new RegExp(`${digits(RING[level]).replace(".", "\\.")}`).test(await page.evaluate((lv) => document.querySelector(`#quranWordCardMount [data-whole-quran-level-percent="${lv}"]`)?.textContent ?? "", level)), "");
      check(`${T} no sideways scroll`, m.sidewaysScroll <= 0 && m.contentScroll <= 0, JSON.stringify({ d: m.sidewaysScroll, c: m.contentScroll }));
      if (level === "wbw") {
        if (SHOTS) await page.screenshot({ path: `/tmp/pcboxes-${lang}-${width}.png` });
        // Stage buttons still claim: one click on each writes the same document and fields.
        const expectCode = { not_started: "n", learning: "l", practising: "p", achieved: "a" };
        for (const state of ["practising", "achieved", "learning"]) {
          await press(page, state);
          const w = await page.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "quranWordProgress" && (x.id || "").includes("__wbw__")).at(-1));
          const ent = w?.data?.["entries.6"] ?? w?.data?.entries?.["6"];
          check(`${T} clicking ${state} writes __p1__wbw__1_7 entries.6 = ${expectCode[state]}`, /__p1__wbw__1_7$/.test(w?.id ?? "") && ent?.s === expectCode[state] && ent?.by === "p1", JSON.stringify(w));
          const mm = await measure(page);
          const pressedBtn = mm.buttons.find((b) => b.pressed);
          if (state !== "learning") check(`${T} pressed ${state} wears its colour`, pressedBtn?.state === state && pressedBtn.bg === BG[state], JSON.stringify(pressedBtn));
        }
        await press(page, "not_started");
        const w = await page.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "quranWordProgress" && (x.id || "").includes("__wbw__")).at(-1));
        check(`${T} clicking not_started writes the same document`, /__p1__wbw__1_7$/.test(w?.id ?? ""), JSON.stringify(w));
      }
    }
    await ctx.close();
  }

  // ---- narrow: today's layout, boxes under the tab content ----------------
  // 1024 is the widest default screen still below the breakpoint (an 881px card there).
  for (const width of [320, 390, 768, 900, 1024]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 1000 : 844 }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openWord(page, 6);
    for (const level of ["wbw", "basic", "depth"]) {
      const T = `[${L} ${level}]`;
      if (level !== "wbw") await tab(page, level);
      const m = await measure(page);
      const contentBottom = Math.max(...m.mainChildren.map((c) => c.b));
      check(`${T} Record your Progress is under the tab content`, !!m.rec && m.rec.t >= contentBottom - 1, JSON.stringify({ t: m.rec?.t, contentBottom }));
      check(`${T} Know Your Status is under Record your Progress`, !!m.status && m.status.t >= m.rec.b - 1);
      check(`${T} the PC-only parts stay hidden (ring, second heading, where-line)`, !m.ringVisible && m.headings.length === 0 && m.phoneHeadingVisible);
      check(`${T} no sideways scroll`, m.sidewaysScroll <= 0 && m.contentScroll <= 0, JSON.stringify({ d: m.sidewaysScroll, c: m.contentScroll }));
      dumped[`${L}/${level}`] = { parts: m.parts, buttons: m.buttons.map((b) => ({ w: b.w, h: b.h })) };
      if (SHOTS && level === "wbw") await page.screenshot({ path: `/tmp/pcboxes-${lang}-${width}.png` });
    }
    await ctx.close();
  }

  // ---- no total loaded: the ring shows an em dash and no arc -------------
  if (!process.argv.includes("--narrow-only")) {
    const L = `${lang}/1280/no-total`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 900 }, extraSeedJs: SEED });
    await ctx.route("**/js/study-wbw-total-readiness.js", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace("ready: true,", "ready: false,") });
    });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openWord(page, 6);
    const m = await measure(page);
    check(`[${L}] the ring shows "—" and no arc, never 0%`, m.ringVisible && m.ringNum === "—" && !m.hasArc && !/0/.test(m.ringNum ?? ""), JSON.stringify({ n: m.ringNum, arc: m.hasArc }));
    check(`[${L}] the ring's aria-label says not loaded`, !!m.ringLabel && !/%/.test(m.ringLabel), String(m.ringLabel));
    await ctx.close();
  }
}

if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(dumped, null, 1));
if (COMPARE) {
  console.log("\n=== phone-width measurements against main (+-1px) ===");
  const base = JSON.parse(fs.readFileSync(COMPARE, "utf8"));
  const near = (a, b) => Math.abs(a - b) <= 1;
  for (const [k, v] of Object.entries(dumped)) {
    const b = base[k];
    if (!b) { console.log(`  (no baseline for ${k}; it was not dumped from main)`); continue; }
    const same = v.parts.length === b.parts.length && v.parts.every((p, i) => near(p.w, b.parts[i].w) && near(p.h, b.parts[i].h))
      && v.buttons.every((p, i) => near(p.w, b.buttons[i].w) && near(p.h, b.buttons[i].h));
    check(`${k} part boxes (${v.parts.length}) and 4 stage buttons measure the same as main`, same, JSON.stringify({ now: v.buttons, was: b.buttons }));
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
