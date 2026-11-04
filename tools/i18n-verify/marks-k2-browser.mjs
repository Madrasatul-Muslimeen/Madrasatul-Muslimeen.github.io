// PCF MSA J03 K2 (QR Lead, 4 Nov 2026) -- the three marks (Difficult / Need practice / Done) on the Āyah card and the
// Word card, and the Marks wheel's three views.
// (1) The Āyah card shows the three marks for its āyah, the saved ones pressed; names in English and Bangla.
// (2) A tap saves the right unit key with the right list (createDocument/updateDocument), shows pressed, and a second tap removes it.
// (3) The Word card shows the three marks for its word and saves under qword:<s>:<a>:<pos>.
// (4) The Marks wheel: 3 views (āyāt of the sūrah; words of this āyah; words of every āyah), the right piece count, three
//     bands per piece, the saved marks lit on the right piece, the centre counts, and a tap opens that card.
// (5) Fit: every mark button is at least 40px tall, the card and wheel stay inside the screen, no sideways scroll.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port). --mutate=NAME must make the suite FAIL:
//   nocard    the Āyah card shows no marks                          -> (1)
//   nosave    a tap saves nothing                                   -> (2)
//   wrongkey  an āyah mark is saved under the word's unit key       -> (2)
//   noword    the Word card shows no marks                          -> (3)
//   noinner   the wheel draws no Done band                          -> (4)
//   nogo      a wheel piece opens nothing                           -> (4)
//   small     a mark button is only 26px tall                       -> (5)
//   bnleak    one Bangla string is missing                          -> (1)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const HTML = "app/quranrevival.html", UI = "app/js/marks-ui.js", BN = "app/js/i18n/bn.js";
const MUT = {
  nocard: [HTML, 'marksHtml: isOpeningSheet ? "" :', 'marksHtml: "" && '],
  nosave: [HTML, "      if (!c || marksBusy.has(unitKey)) return;", "      return;"],
  wrongkey: [HTML, "const res = type === \"qword\" ? await setWordKey(db, c, { ...base, position: Number(w) }) : await setAyahKey(db, c, base);", "const res = await setAyahKey(db, c, { ...base, ayah: Number(a) + 1 });"],
  noword: [HTML, "marksHtml: marksRowFor(`qword:", "marksHtml: '' && marksRowFor(`qword:"],
  noinner: [UI, 'const bands = [["hard", 150, 174], ["practice", 126, 148], ["done", 104, 124]];', 'const bands = [["hard", 150, 174], ["practice", 126, 148]];'],
  nogo: [UI, "const go = () => { const p = pieces[Number(g.dataset.mkGo)]; if (p) onGo?.(p); };", "const go = () => {};"],
  small: [UI, ".mk-btn { min-height:40px;", ".mk-btn { min-height:26px; padding:0 .8rem; line-height:1;"],
  bnleak: [BN, '  "Marks for this āyah": "এই আয়াতের চিহ্ন",\n', ""],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const TENANT = "t1";
const s1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
const a2 = s1.ayahs.find((a) => a.ayah === 2);
const SEED = `\nDATA.ayahKeyMarks = [{ _id: "${TENANT}__p1__1", tenantId: "${TENANT}", scope: "p1", surah: 1, entries: { "ayah:1:2": ["hard"], "qword:1:1:1": ["done"], "qword:1:2:1": ["practice"] }, schemaVersion: 1, createdAt: "2026-11-04T00:00:00.000Z", updatedAt: "2026-11-04T00:00:00.000Z", createdBy: "test-uid" }];\n`;
const NAMES = { en: ["Difficult", "Need practice", "Done"], bn: ["কঠিন", "অনুশীলন দরকার", "সম্পন্ন"] };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function open(ctx) {
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  return { page, errors };
}
async function openRead(page) {
  if (await ev(page, () => !document.getElementById("readView").hidden)) return;
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
const marksState = (page) => ev(page, () => [...document.querySelectorAll("[data-marks-row] [data-mark-key]")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => ({ id: b.dataset.markKey, on: b.getAttribute("aria-pressed") === "true", text: b.textContent, h: Math.round(b.getBoundingClientRect().height), dis: b.disabled })));
const writesOf = (page) => ev(page, () => (window.__stubWriteData || []).filter((x) => x.col === "ayahKeyMarks").map((x) => JSON.stringify(x)));

const QUICK = process.argv.includes("--quick"); // mutation runs: en 1440 and bn 390 only
for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
  if (QUICK && !((lang === "en" && width === 1440) || (lang === "bn" && width === 390))) continue;
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Marks K2 ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED + "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await open(ctx);
  const want = NAMES[lang];

  // go to 1:2 and open its card from the number badge
  await openRead(page);
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 900);
  await ev(page, () => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await page.waitForSelector("[data-ayah-sheet] [data-marks-row]", { timeout: 6000 }).catch(() => {});

  // (1)
  let m = await marksState(page);
  check(`${tag} (1) the Āyah card shows the three marks, in order, in ${lang}`, m.length === 3 && m.map((x) => x.text).join("|") === want.join("|"), JSON.stringify(m));
  check(`${tag} (1) only the saved mark (Difficult) is pressed`, m.length === 3 && m[0].on && !m[1].on && !m[2].on, JSON.stringify(m));
  check(`${tag} (5) every mark button is at least 40px tall`, m.length === 3 && m.every((x) => x.h >= 40), JSON.stringify(m.map((x) => x.h)));
  const fitCard = await ev(page, () => { const r = document.querySelector("[data-marks-row]").getBoundingClientRect(); const sh = document.querySelector("[data-ayah-sheet]").getBoundingClientRect(); return { inside: r.left >= sh.left - 1 && r.right <= sh.right + 1, over: document.documentElement.scrollWidth - innerWidth }; });
  check(`${tag} (5) the marks row sits inside the card, no sideways scroll`, fitCard.inside && fitCard.over <= 0, JSON.stringify(fitCard));
  if (lang === "en" && width === 390) await page.screenshot({ path: "/tmp/marks-k2-card-390.png" }).catch(() => {});

  // (2)
  const before = (await writesOf(page)).length;
  await ev(page, () => document.querySelector('[data-ayah-sheet] [data-mark-key="practice"]').click());
  await page.waitForFunction((n) => (window.__stubWriteData || []).filter((x) => x.col === "ayahKeyMarks").length > n, before, { timeout: 5000 }).catch(() => {});
  let w = (await writesOf(page)).slice(before);
  check(`${tag} (2) Need practice saves entries.ayah:1:2 = [hard, practice]`, w.length === 1 && w[0].includes("ayah:1:2") && w[0].includes('"hard","practice"'), JSON.stringify(w));
  await settle(page, 400);
  m = await marksState(page);
  check(`${tag} (2) the card shows Difficult and Need practice pressed`, m.length === 3 && m[0].on && m[1].on && !m[2].on, JSON.stringify(m));
  // The stub never mutates its data, so the next read is the seed ([hard]) again: tapping Need practice off writes the shorter list [hard].
  await ev(page, () => document.querySelector('[data-ayah-sheet] [data-mark-key="practice"]').click());
  await page.waitForFunction((n) => (window.__stubWriteData || []).filter((x) => x.col === "ayahKeyMarks").length > n, before + 1, { timeout: 5000 }).catch(() => {});
  w = (await writesOf(page)).slice(before + 1);
  check(`${tag} (2) a tap on a pressed mark writes the shorter list (the list without it, never a delete)`, w.length === 1 && w[0].includes('"entries.ayah:1:2":["hard"]') && w[0].includes('"kind":"update"'), JSON.stringify(w));
  await ev(page, () => document.querySelector("[data-ayah-sheet-close]")?.click());
  await settle(page, 300);

  // (3) Word card 1:1:1 (seeded Done)
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 700);
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
  const occ = "quran-word-occurrence:v1:1:1:1";
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
  await page.waitForSelector(".quran-word-card [data-marks-row]", { timeout: 6000 }).catch(() => {});
  m = await marksState(page);
  check(`${tag} (3) the Word card shows the three marks, Done pressed`, m.length === 3 && !m[0].on && !m[1].on && m[2].on, JSON.stringify(m));
  const wb = (await writesOf(page)).length;
  await ev(page, () => [...document.querySelectorAll('.quran-word-card [data-mark-key="hard"]')].find((b) => b.getBoundingClientRect().width > 0)?.click());
  await page.waitForFunction((n) => (window.__stubWriteData || []).filter((x) => x.col === "ayahKeyMarks").length > n, wb, { timeout: 5000 }).catch(() => {});
  w = (await writesOf(page)).slice(wb);
  check(`${tag} (3) Difficult on a word saves entries.qword:1:1:1 = [done, hard]`, w.length === 1 && w[0].includes("qword:1:1:1") && w[0].includes('"done","hard"'), JSON.stringify(w));
  await ev(page, () => document.querySelector("[data-word-card-close]")?.click());
  await settle(page, 300);

  // (4) the Marks wheel
  await ev(page, () => document.getElementById("tabApproachBtn")?.click());
  await settle(page, 500);
  if (width < 900) { await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]').catch(() => {}); await settle(page, 300); }
  await ev(page, () => document.querySelector('[data-wheel-kind="marks"]')?.click());
  await page.waitForSelector("#wheelContainer svg[data-mk-wheel]", { timeout: 6000 }).catch(() => {});
  const wi = (page) => ev(page, () => { const gs = [...document.querySelectorAll("#wheelContainer .mk-piece")]; return { n: gs.length, bands: gs[0]?.querySelectorAll(".mk-band").length ?? 0, marks: gs.map((g) => g.dataset.mkMarks), centre: [...document.querySelectorAll("#wheelContainer svg text")].map((t) => t.textContent).join(" | "), views: [...document.querySelectorAll("[data-mk-view]")].map((b) => [b.dataset.mkView, b.getAttribute("aria-pressed")]) }; });
  let wh = await wi(page);
  check(`${tag} (4) āyāt view: one piece per āyah (${s1.ayahs.length}), three bands each`, wh.n === s1.ayahs.length && wh.bands === 3, JSON.stringify({ n: wh.n, b: wh.bands }));
  check(`${tag} (4) three views offered, āyāt pressed`, wh.views.length === 3 && wh.views[0][1] === "true", JSON.stringify(wh.views));
  check(`${tag} (4) the saved mark (Difficult) is lit on piece 2 only`, wh.marks[1] === "hard" && wh.marks.filter(Boolean).length === 1, JSON.stringify(wh.marks));
  const dones = await ev(page, () => document.querySelectorAll("#wheelContainer .mk-band-done.on").length);
  check(`${tag} (4) the Done band is drawn (and lit nowhere in the āyāt view)`, wh.bands === 3 && dones === 0);
  await ev(page, () => document.querySelector('[data-mk-view="all-words"]').click());
  await settle(page, 400);
  wh = await wi(page);
  const totalWords = s1.ayahs.reduce((n, a) => n + (a.words?.length ?? 0), 0);
  check(`${tag} (4) all-words view: one piece per word (${totalWords}); 1:1:1 is Difficult+Done, 1:2:1 Need practice`, wh.n === totalWords && wh.marks[0] === "hard done" && /practice/.test(wh.marks.join("|")), JSON.stringify({ n: wh.n, first: wh.marks.slice(0, 2) }));
  await ev(page, () => document.querySelector('[data-mk-view="ayah-words"]').click());
  await settle(page, 400);
  wh = await wi(page);
  const curWords = s1.ayahs.find((a) => a.ayah === 1).words.length;
  check(`${tag} (4) words-of-this-āyah view: ${curWords} pieces`, wh.n === curWords || wh.n === a2.words.length, String(wh.n));
  const geo = await ev(page, () => { const r = document.querySelector("#wheelContainer svg").getBoundingClientRect(); return { l: r.left, r: r.right, over: document.documentElement.scrollWidth - innerWidth, w: r.width }; });
  check(`${tag} (5) the wheel stays on screen, no sideways scroll`, geo.l >= -1 && geo.r <= (width + 1) && geo.over <= 0 && geo.w > 150, JSON.stringify(geo));
  if (lang === "en") await page.screenshot({ path: `/tmp/marks-k2-wheel-${width}.png` }).catch(() => {});
  // a tap on a piece opens its card
  await ev(page, () => document.querySelector('[data-mk-view="ayat"]').click());
  await settle(page, 400);
  await ev(page, () => document.querySelectorAll("#wheelContainer .mk-piece")[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey === "ayah:1:2", null, { timeout: 5000 }).catch(() => {});
  const opened = await ev(page, () => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey ?? null);
  check(`${tag} (4) tapping piece 2 opens the Āyah card of 1:2`, opened === "ayah:1:2", String(opened));
  const real = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Marks K2: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
