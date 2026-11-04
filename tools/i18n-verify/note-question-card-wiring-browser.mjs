// PCF MSA J05 (the Architect's wiring round): a Note made from Quran Study takes the Approach selected there at that moment.
// Quran Study passes currentTrackableId to the shared Note opener (js/note-opener.js, ?approach=<id>); journey-map.html keeps
// it on the new Note's noteSources link (createStudyNote's approachId) and, while that Note is written, shows the Approach's
// question card above the toolbar (critical-reasoning-guides.js, loaded by dynamic import ONLY when ?approach= is given).
// Proven, on the real catalogue's Approach ids (seedTemplates), from the Āyah card's 📝 Note at 2:255:
//   Approach 14 -> its four questions, in the app's language; a tap adds the question as an <h3>; the noteSources write
//   carries approachId "approach_14"; >= 40px, inside the window, no sideways scroll, readable (contrast), at 360/768/1440,
//   en and bn, 100% and 200% text. Toggle Off -> no card. Approach 1 (no questions) -> no card. A plain Map open never
//   fetches critical-reasoning-guides.js.
// Run from the repository root, serve.js on :8080 (or QR_BASE). Screenshots: /tmp/qcard-*.png (or QCARD_SHOTS=<dir>).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   noapproach   Quran Study no longer hands its Approach to the opener   -> the card and the approachId checks
//   nowrite      the Map leaves approachId off createStudyNote            -> "the noteSources write carries approachId"
//   eager        the Map loads the guides whatever the address            -> "a plain Map open does not fetch"
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
import { QUESTIONS } from "../../app/js/critical-reasoning-guides.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noapproach: ["quranrevival.html", "openNewNote({ approachId: currentTrackableId, ...opts,", "openNewNote({ ...opts,"],
  nowrite: ["journey-map.html", 'approachId: /^approach_\\d{2}$/.test(newApproachId ?? "") ? newApproachId : null })', "})"],
  eager: ["journey-map.html", "const questionGuidesReady = newApproachId\n", "const questionGuidesReady = true\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7); // e.g. --only="en 1440 100%" (one setting of part 1)
const SHOTS = process.env.QCARD_SHOTS || "/tmp";
const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };
const SEED = "window.__stubApplyBatches = true; window.__stubRecordTxData = true;";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function context(lang, width, height, { off = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, seedTemplates: SEED_TEMPLATES, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (off) await ctx.addInitScript(() => { try { localStorage.setItem("mmsa-question-card:p1", "off"); } catch {} });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      const n = src.split(a).length - 1;
      if (!n) throw new Error(`mutation anchor missing: ${MUTATE}`);
      console.log(`  (mutation ${MUTATE}: ${n} occurrence(s) replaced in ${file})`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}

/** Quran Study at 2:255 with `approach` selected; the Āyah card's 📝 Note; returns the opener's frame once the Note is editing. */
async function newNoteFrom(ctx, approach, pct) {
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  const kill = () => ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await kill();
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(800);
  await kill();
  const chose = await ev((id) => { const s = document.getElementById("trackableSelect"); if (![...s.options].some((o) => o.value === id)) return false; s.value = id; s.dispatchEvent(new Event("change", { bubbles: true })); return s.value === id; }, approach);
  await ev((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  await P.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(300);
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  let F = null;
  for (let i = 0; i < 100 && !F; i++) { F = P.frames().find((x) => /journey-map\.html\?embed=1&new=1&unit=ayah%3A2%3A255/.test(x.url())) ?? null; if (!F) await P.waitForTimeout(100); }
  await F?.waitForSelector("#notePane [data-edit-body]", { state: "visible", timeout: 20000 }).catch(() => {});
  if (F) await F.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct).catch(() => {});
  await P.waitForTimeout(600);
  return { P, F, chose, errors };
}
const cardState = (F) => F.evaluate(() => {
  const c = document.querySelector("#notePane [data-question-card-host]");
  const tb = document.querySelector("#notePane [data-edit-toolbar], #notePane .edit-toolbar");
  if (!c) return { exists: false };
  const r = c.getBoundingClientRect();
  const bs = [...c.querySelectorAll("[data-question-id]")];
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b.length >= 3 && (b[3] ?? 1) > 0.5) return b; } return [255, 255, 255]; };
  let worst = 99;
  for (const b of bs) { const fg = lum(rgb(getComputedStyle(b).color)), bg = lum(bgOf(b)); const cr = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05); worst = Math.min(worst, cr); }
  return {
    exists: true, shown: getComputedStyle(c).display !== "none" && r.height > 0, texts: bs.map((b) => b.textContent.trim()),
    minH: bs.length ? Math.min(...bs.map((b) => b.getBoundingClientRect().height)) : 0,
    inside: bs.every((b) => { const q = b.getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1; }),
    cut: bs.filter((b) => b.scrollWidth > b.clientWidth + 1).length,
    above: tb ? r.bottom <= tb.getBoundingClientRect().top + 1 : null,
    side: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    contrast: Math.round(worst * 100) / 100,
  };
});
const approachWrites = (F) => F.evaluate(() => (window.__stubWriteData || []).map((x) => x.data ?? x).filter((d) => d && Object.prototype.hasOwnProperty.call(d, "approachId") && d.sourceKey).map((d) => ({ approachId: d.approachId, sourceKey: d.sourceKey })));

// 1. Approach 14, at every width, en and bn, 100% and 200% text.
for (const lang of ["en", "bn"]) for (const [width, height] of [[360, 780], [768, 1000], [1440, 900]]) for (const pct of [100, 200]) {
  if (pct === 200 && width === 768) continue;
  const tag = `[A14 ${lang} ${width} ${pct}%]`;
  if (ONLY && !tag.includes(ONLY)) continue;
  const ctx = await context(lang, width, height);
  const { P, F, chose, errors } = await newNoteFrom(ctx, "approach_14", pct);
  check(`${tag} POSITIVE CONTROL: Approach 14 is offered and chosen in Quran Study, and the Note window opened editing`, chose && !!F, JSON.stringify({ chose, frame: !!F }));
  if (F) {
    check(`${tag} the opener's address names the Approach`, /[?&]approach=approach_14(&|$)/.test(F.url()), F.url());
    const want = QUESTIONS[14].map((q) => (lang === "bn" ? q.bn : q.en));
    const c = await cardState(F);
    check(`${tag} the four Approach-14 questions show, in ${lang}, above the toolbar`, c.shown && JSON.stringify(c.texts) === JSON.stringify(want) && c.above !== false, JSON.stringify(c));
    check(`${tag} every question is >= 40px, whole, inside the window; no sideways scroll in the window`, c.shown && c.minH >= 39.5 && c.inside && c.cut === 0 && c.side <= 0, JSON.stringify(c));
    check(`${tag} the questions are readable on the window (contrast >= 4.5)`, c.shown && c.contrast >= 4.5, `contrast ${c.contrast}`);
    const side = await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${tag} no sideways scroll on the page`, side <= 0, `overflow ${side}px`);
    const w = await approachWrites(F);
    check(`${tag} the noteSources write carries approachId "approach_14" (ayah:2:255)`, w.some((x) => x.approachId === "approach_14" && x.sourceKey === "ayah:2:255"), JSON.stringify(w));
    if ((width === 360 && lang === "bn" && pct === 200) || (width === 1440 && lang === "en" && pct === 100)) await P.screenshot({ path: `${SHOTS}/qcard-${lang}-${width}-${pct}.png` });
    if (c.shown && pct === 100) {
      // The new Note opens with the caret at the end of its text (openNewNoteForWriting): the reader taps a question straight away.
      if (process.env.QCARD_DEBUG) console.log(await F.evaluate(() => { const s = getSelection(); const b = document.querySelector("#notePane [data-edit-body]"); return JSON.stringify({ active: document.activeElement?.className, inBody: b.contains(s.anchorNode), anchor: s.anchorNode?.nodeName, editable: b.isContentEditable, btns: [...document.querySelectorAll("#notePane [data-question-id]")].map((x) => x.dataset.questionText) }); }));
      await F.click(`#notePane [data-question-id="${QUESTIONS[14][0].id}"]`);
      await P.waitForTimeout(200);
      const body = await F.evaluate(() => document.querySelector("#notePane [data-edit-body]")?.innerHTML ?? "");
      const q = want[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      check(`${tag} a tap adds "${want[0]}" as a heading to answer under`, new RegExp(`<h3[^>]*>${q}</h3>\\s*<p>`).test(body), JSON.stringify({ h3: body.match(/<h3[^>]*>[^<]*<\/h3>/g), end: body.slice(-160) }));
      // Architect review (5 Nov): with the caret parked INSIDE the Āyah block (contenteditable=false) a tap used to add nothing.
      const parked = await F.evaluate(() => {
        const b = document.querySelector("#notePane [data-edit-body]"), lock = b?.querySelector("[contenteditable='false']");
        const tn = lock && document.createTreeWalker(lock, NodeFilter.SHOW_TEXT).nextNode();
        if (!tn) return false;
        const r = document.createRange(); r.setStart(tn, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        b.dispatchEvent(new Event("keyup", { bubbles: true })); b.dispatchEvent(new Event("mouseup", { bubbles: true }));
        return true;
      });
      await F.click(`#notePane [data-question-id="${QUESTIONS[14][1].id}"]`);
      await P.waitForTimeout(200);
      const body2 = await F.evaluate(() => document.querySelector("#notePane [data-edit-body]")?.innerHTML ?? "");
      const q2 = want[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      check(`${tag} caret parked inside the Āyah block: a tap still adds "${want[1]}" (after the block)`, parked && new RegExp(`<h3[^>]*>${q2}</h3>`).test(body2), JSON.stringify({ parked, h3: body2.match(/<h3[^>]*>[^<]*<\/h3>/g) }));
    }
  }
  const real = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// 2. The toggle Off: no card (the Note still keeps its Approach). 3. Approach 1, no questions: no card.
if (!ONLY) for (const [label, approach, off] of [["toggle Off", "approach_14", true], ["Approach 1", "approach_01", false]]) {
  for (const lang of ["en", "bn"]) {
    const tag = `[${label} ${lang} 1440]`;
    const ctx = await context(lang, 1440, 900, { off });
    const { F, chose } = await newNoteFrom(ctx, approach, 100);
    check(`${tag} POSITIVE CONTROL: ${approach} chosen and the Note window opened editing`, chose && !!F && !!(await F.$("#notePane [data-edit-body]")));
    const c = F ? await cardState(F) : null;
    check(`${tag} no question card`, !!c && (!c.exists || (!c.shown && c.texts.length === 0)), JSON.stringify(c));
    const w = F ? await approachWrites(F) : [];
    check(`${tag} the Note still keeps the Approach it was made under (${approach})`, w.some((x) => x.approachId === approach), JSON.stringify(w));
    await ctx.close();
  }
}

// 4. A plain Map open loads nothing new: critical-reasoning-guides.js is never fetched.
if (!ONLY) {
  const ctx = await context("en", 1440, 900);
  const fetched = [];
  ctx.on("request", (r) => { if (/critical-reasoning-guides\.js/.test(r.url())) fetched.push(r.url()); });
  const { page: P } = await openPage(ctx, "/app/journey-map.html");
  await P.waitForTimeout(2500);
  const loaded = await P.evaluate(() => !!document.querySelector("#folderTree, .folder-row, [data-folder-id]"));
  check("[plain Map] POSITIVE CONTROL: the Map rendered its folders", loaded);
  check("[plain Map] a plain Map open does not fetch critical-reasoning-guides.js", fetched.length === 0, fetched.join(" "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Note question card wiring: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
