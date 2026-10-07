// The Owner's four Word card / Āyah card requests of 7 Oct 2026, checked together:
//   1. "Why are these unusual letters? Fix."  -- 2عَاد, عَا^ئِدُون on the derived-form cards (Basic and Depth).
//   2. "the occurances, the color setting, not readable. Fix."  -- Depth's occurrence rows were green on navy.
//   3. "Enable the word cards here to popup the occurrences, links. on click on the card. The Ayah Should then be
//      showing highlighted in the read view ... while there should a back button to the word card."
//   4. "Ayah card: enable Nav buttons to next/ prev Ayah ... and the Popup note view button ... (Enable back button
//      always to come back to the view/ location where it came from). May be you can organise the Ayah card button
//      more elegantly."
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/word-card-ayah-card-ways-back-browser.mjs [--mutate=<name>]
// Expected values are written BY HAND (the fixture word is 14:13:9, لَتَعُودُنَّ, root ع و د). Mutations break one thing each:
//   nolemmatext  the display fix is undone (lemmaText returns its input)  -> the stray-mark checks fail
//   darkbg       Depth's sections keep the Night card's dark surface       -> the contrast checks fail
//   nopop        Basic's cards open no pop-up                              -> the pop-up checks fail
//   nohighlight  the opened āyah is not marked                              -> the highlight checks fail
//   nostep       the Āyah card's ‹ › do nothing                             -> the step checks fail
//   nopill       nothing remembers the way back to the Āyah card            -> the "back to the card" checks fail
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  nolemmatext: ["js/lemma-text.js", 'return String(lemma ?? "").replace(', 'return String(lemma ?? ""); void ('],
  darkbg: ["quranrevival.html", "    --card-bg: #fff; }\n  .word-card-acc .word-card-occurrence-link:hover", "    }\n  .word-card-acc .word-card-occurrence-link:hover"],
  nopop: ["js/quran-word-card.js", "    ${pop}\n  </section>", "\n  </section>"],
  nohighlight: ["quranrevival.html", "      paintWordCardTarget(origin ? quranWordCardTarget : null);", "      paintWordCardTarget(null);"],
  nostep: ["js/ayah-action-sheet.js", "callbacks.onStep?.(unitKey, Number(btn.dataset.ayahSheetStep))", "void 0"],
  nopill: ["quranrevival.html", "    function setAppReturn(title, label, back) { ayahCardReturn = { title, label, back }; renderAyahCardBackPill(); }", "    function setAppReturn() {}"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- 1. The display fix, against every packaged lemma ----------------------------------------------------
import fs from "node:fs";
const { lemmaText } = await import("../../app/js/lemma-text.js");
const lemmas = Object.keys(JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemmas-index.json", "utf8")).values);
const stray = /[\^#@\[,.\d]/;
check("POSITIVE CONTROL: the packaged lemmas really carry the source's Latin marks (280 of 4,832)", lemmas.length === 4832 && lemmas.filter((l) => /[^؀-ۿ\s]/.test(l)).length === 280, String(lemmas.filter((l) => /[^؀-ۿ\s]/.test(l)).length));
check("lemmaText leaves no Latin mark or number in any of the 4,832 lemmas", lemmas.every((l) => !stray.test(lemmaText(l))), JSON.stringify(lemmas.filter((l) => stray.test(lemmaText(l))).slice(0, 5)));
check("lemmaText: عَاد2 → عَاد, عَا^ئِدُون → عَآئِدُون (madda), أَن[بَأَ → أَنۢبَأَ (small meem), وُ,رِىَ → وُۥرِىَ (small waw)",
  lemmaText("عَاد2") === "عَاد" && lemmaText("عَا^ئِدُون") === "عَا\u0653ئِدُون" && lemmaText("أَن[بَأَ") === "أَن\u06E2بَأَ" && lemmaText("وُ,رِىَ") === "وُ\u06E5رِىَ",
  [lemmaText("عَاد2"), lemmaText("عَا^ئِدُون"), lemmaText("أَن[بَأَ"), lemmaText("وُ,رِىَ")].join(" "));
check("lemmaText changes nothing in a lemma that has no mark (the key stays the key)", lemmas.filter((l) => !/[^؀-ۿ\s]/.test(l)).every((l) => lemmaText(l) === l));

// ---- 2. In the browser --------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUTATIONS[MUTATE];
    await ctx.route(`**/app/${file}`, async (r) => {
      const res = await r.fetch(); const src = await res.text();
      if (!src.includes(a)) throw new Error(`mutation target not found: ${MUTATE}`);
      await r.fulfill({ response: res, body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const clean = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
async function goToAyah(page, surah, ayah) {
  await clean(page);
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate((s) => { const el = document.getElementById("surahSelect"); if (el.value !== String(s)) { el.value = String(s); el.dispatchEvent(new Event("change", { bubbles: true })); } }, surah);
  await page.waitForFunction((s) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:"]`), surah, { timeout: 10000 });
  await page.evaluate((a) => { const el = document.getElementById("ayahSelect"); el.value = String(a); el.dispatchEvent(new Event("change", { bubbles: true })); }, ayah);
  await page.waitForTimeout(900);
  await clean(page);
}
/** WCAG contrast of two rgb() strings. */
const contrast = (a, b) => {
  const lum = (c) => { const [r, g, bl] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05);
};

for (const [lang, width, height] of [["en", 390, 844], ["bn", 390, 844], ["en", 1280, 900]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width, height);
  await goToAyah(page, 14, 13);
  await page.evaluate(() => document.querySelector('#readView [data-word-occurrence="quran-word-occurrence:v1:14:13:9"]')?.click());
  await page.waitForFunction(() => document.querySelector(".quran-word-card"), null, { timeout: 8000 });
  await clean(page);

  // Basic: the derived-form cards, with clean Arabic, as buttons.
  await page.click('#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForFunction(() => document.querySelectorAll("[data-word-card-dcard]").length >= 6, null, { timeout: 10000 }).catch(() => {});
  const cards = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-dcard]")].map((b) => ({ tag: b.tagName, lemma: b.getAttribute("data-word-form-toggle"), ar: b.querySelector(".word-card-dcard-ar")?.textContent })));
  check(`${tag} Basic: root ع و د shows its six derived forms, each a button`, cards.length === 6 && cards.every((c) => c.tag === "BUTTON" && c.lemma), JSON.stringify(cards));
  check(`${tag} Basic: no card shows a stray "2" or "^" (عَاد, عَآئِدُون)`, cards.every((c) => !stray.test(c.ar ?? "")) && cards.some((c) => c.ar === "عَاد") && cards.some((c) => c.ar === "عَا\u0653ئِدُون"), cards.map((c) => c.ar).join(" "));

  // 3. A card opens its places in a pop-up.
  await page.evaluate(() => document.querySelector('[data-word-card-dcard][data-word-form-toggle="أُعِيدُ"]')?.scrollIntoView({ block: "center" }));
  await page.click('[data-word-card-dcard][data-word-form-toggle="أُعِيدُ"]');
  await page.waitForFunction(() => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]").length > 0, null, { timeout: 8000 }).catch(() => {});
  const pop = await page.evaluate(() => {
    const box = document.querySelector(".word-card-dpop-box"); if (!box) return null;
    const r = box.getBoundingClientRect(); const rows = [...box.querySelectorAll("[data-word-occurrence-goto]")];
    const first = rows[0]?.getBoundingClientRect();
    const hit = first ? document.elementFromPoint(first.left + first.width / 2, first.top + first.height / 2) : null;
    return { inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, rows: rows.length, ar: box.querySelector(".word-card-dpop-ar")?.textContent, title: box.querySelector(".word-card-dpop-title")?.textContent, firstTappable: !!hit && rows[0].contains(hit) };
  });
  check(`${tag} tapping أُعِيدُ opens a pop-up on screen with its 18 places, the first one tappable`, !!pop && pop.inView && pop.rows === 18 && pop.ar === "أُعِيدُ" && pop.firstTappable, JSON.stringify(pop));
  const target = await page.evaluate(() => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]")[2]?.getAttribute("data-word-occurrence-goto"));
  if (target) {
    await page.click(`.word-card-dpop [data-word-occurrence-goto="${target}"]`);
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const [s, a, p] = target.split(":");
    const there = await page.evaluate(({ s, a, p }) => {
      const w = [...document.querySelectorAll(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:${p}"]`)].find((el) => el.getClientRects().length);
      const other = [...document.querySelectorAll(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:${a}:"]`)].find((el) => el !== w && el.getClientRects().length);
      const cs = w ? getComputedStyle(w) : null, os = other ? getComputedStyle(other) : null;
      const r = w?.getBoundingClientRect();
      return { surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]"),
        wordOutline: cs?.outlineStyle, wordBg: cs?.backgroundColor, ayahBg: os?.backgroundColor, inView: !!r && r.top >= 0 && r.bottom <= innerHeight };
    }, { s, a, p });
    check(`${tag} a place opens its āyah (${s}:${a}) in the Read view with "Back to Word Card"`, there.surah === s && there.ayah === a && there.back, JSON.stringify(there));
    check(`${tag} the āyah is tinted and its word ringed in gold, on screen`, there.wordOutline === "solid" && there.wordBg !== "rgba(0, 0, 0, 0)" && there.ayahBg !== "rgba(0, 0, 0, 0)" && there.inView, JSON.stringify(there));
    await page.click("[data-word-card-origin-back]");
    await page.waitForFunction(() => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]").length > 0, null, { timeout: 10000 }).catch(() => {});
    const back = await page.evaluate(() => ({ level: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"), pop: !!document.querySelector(".word-card-dpop-box"), mark: !!document.getElementById("wordCardTargetStyle") }));
    check(`${tag} Back returns to the Word card on Basic with the pop-up open again, and the highlight is gone`, back.level === "basic" && back.pop && !back.mark, JSON.stringify(back));
    await page.click("[data-word-card-dpop-close]");
    check(`${tag} the pop-up's ✕ closes it`, await page.evaluate(() => !document.querySelector(".word-card-dpop")));
  } else check(`${tag} a place opens its āyah`, false, "no occurrence rows");

  // 1 + 2. Depth: the same clean Arabic, and readable occurrence rows.
  await page.click('#quranWordCardMount [data-word-card-level="depth"]');
  await page.waitForFunction(() => document.querySelectorAll("[data-word-form-toggle]").length >= 6, null, { timeout: 10000 }).catch(() => {});
  const depthAr = await page.evaluate(() => [...document.querySelectorAll(".word-card-form-arabic, .word-card-fam-w")].map((e) => e.textContent));
  check(`${tag} Depth: no derived form shows a stray "2" or "^"`, depthAr.length >= 6 && depthAr.every((t) => !stray.test(t)), depthAr.join(" "));
  await page.evaluate(() => document.querySelector('[data-word-form-toggle="أُعِيدُ"]:not([data-word-card-dcard])')?.click());
  await page.waitForFunction(() => document.querySelector(".word-card-form-occurrences .word-card-occurrence-link"), null, { timeout: 8000 }).catch(() => {});
  const rows = await page.evaluate(() => {
    const b = document.querySelector(".word-card-form-occurrences .word-card-occurrence-link"); if (!b) return null;
    const cs = getComputedStyle(b);
    return { bg: cs.backgroundColor, img: cs.backgroundImage, ar: getComputedStyle(b.querySelector(".word-card-occurrence-arabic")).color, ref: getComputedStyle(b.querySelector(".word-card-occurrence-ref")).color };
  });
  check(`${tag} Depth: an occurrence row has a plain light surface (no dark gradient)`, !!rows && rows.img === "none" && rows.bg !== "rgba(0, 0, 0, 0)", JSON.stringify(rows));
  check(`${tag} Depth: its Arabic and its reference both read at 4.5:1 or better`, !!rows && rows.img === "none" && contrast(rows.ar, rows.bg) >= 4.5 && contrast(rows.ref, rows.bg) >= 4.5, rows ? `${contrast(rows.ar, rows.bg).toFixed(2)} / ${contrast(rows.ref, rows.bg).toFixed(2)}` : "");
  await page.click("[data-word-card-close]");

  // 4. The Āyah card: ‹ › and 📖 in the header, tiles, and the ways back.
  await goToAyah(page, 14, 14);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="14:14"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  const head = await page.evaluate(() => {
    const els = ["ayah-sheet-ref", '[data-ayah-sheet-step="-1"]', '[data-ayah-sheet-step="1"]', "[data-ayah-sheet-noteview]", "[data-ayah-sheet-close]"].map((q) => document.querySelector(q.startsWith("[") ? `[data-ayah-sheet] ${q}` : `[data-ayah-sheet] .${q}`));
    const rs = els.map((e) => e?.getBoundingClientRect());
    const sheet = document.querySelector("[data-ayah-sheet]").getBoundingClientRect();
    return { all: rs.every(Boolean), order: rs.every((r, i) => !i || r.left >= rs[i - 1].right - 1), oneRow: rs.slice(1).every((r) => Math.abs(r.top - rs[1].top) < 2), inside: rs.every((r) => r.left >= sheet.left - 1 && r.right <= sheet.right + 1), tap: rs.slice(1).every((r) => r.height >= 40 && r.width >= 40) };
  });
  check(`${tag} the header reads: reference, ‹, ›, 📖 Note view, ✕ -- one row, inside the card, 40px targets`, head.all && head.order && head.oneRow && head.inside && head.tap, JSON.stringify(head));
  // The Owner: "all these choices/ actions could be placed below the Ayah name/ number in a row".
  const acts = await page.evaluate(() => {
    const row = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-actions]"); if (!row) return null;
    const head = document.querySelector("[data-ayah-sheet] .ayah-sheet-header").getBoundingClientRect();
    const status = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-status]").getBoundingClientRect();
    const btns = [...row.querySelectorAll("button")]; const rs = btns.map((b) => b.getBoundingClientRect());
    const sheet = document.querySelector("[data-ayah-sheet]").getBoundingClientRect();
    return { n: btns.length, rows: new Set(rs.map((r) => Math.round(r.top))).size, underHead: rs.every((r) => r.top >= head.bottom - 1 && r.bottom <= status.top + 1),
      inside: rs.every((r) => r.left >= sheet.left - 1 && r.right <= sheet.right + 1), tap: rs.every((r) => r.height >= 44 && r.width >= 40),
      named: btns.every((b) => (b.getAttribute("aria-label") || "").length > 2), labelsFit: btns.every((b) => { const l = b.querySelector(".ayah-sheet-act-label"); return l && l.scrollWidth <= l.clientWidth + 1; }) };
  });
  check(`${tag} the nine actions sit in a row under the header (at most two rows on a phone), each named, each label whole`, !!acts && acts.n === 9 && acts.rows <= 2 && acts.underHead && acts.inside && acts.tap && acts.named && acts.labelsFit, JSON.stringify(acts));
  const ref = () => page.evaluate(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "");
  const ref0 = await ref();
  await page.click('[data-ayah-sheet-step="1"]'); await page.waitForTimeout(500);
  const refNext = await ref();
  await page.click('[data-ayah-sheet-step="-1"]'); await page.waitForTimeout(500);
  const refBack = await ref();
  check(`${tag} › moves the card to 14:15 and ‹ back to 14:14`, /14:15|১৪:১৫/.test(refNext) && refBack === ref0 && /14:14|১৪:১৪/.test(ref0), `${ref0} → ${refNext} → ${refBack}`);

  await page.click("[data-ayah-sheet-noteview]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec").length === 4, null, { timeout: 8000 }).catch(() => {});
  const nv = await page.evaluate(() => {
    const box = document.querySelector("#ayahNoteViewPopup:not([hidden]) .ayah-nv-box"); if (!box) return null;
    const r = box.getBoundingClientRect();
    return { secs: box.querySelectorAll(".ayah-nv-sec").length, arabic: !!box.querySelector(".ayah-arabic")?.textContent.trim(), en: !!box.querySelector(".ayah-translation:not(.ayah-translation-bn)")?.textContent.trim(), bn: !!box.querySelector(".ayah-translation-bn")?.textContent.trim(), wbw: box.querySelectorAll(".wbw-word").length, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
  });
  check(`${tag} 📖 shows the āyah as the Note view does: Arabic, English, Bangla, Word by Word, on screen`, !!nv && nv.secs === 4 && nv.arabic && nv.en && nv.bn && nv.wbw === 10 && nv.inView, JSON.stringify(nv));
  await page.click("[data-ayah-nv-back]");
  const afterNv = await page.evaluate(() => ({ pop: !!document.querySelector("#ayahNoteViewPopup:not([hidden])"), card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent }));
  check(`${tag} the pop-up's ← goes back to the same Āyah card`, !afterNv.pop && afterNv.card && afterNv.ref === ref0, JSON.stringify(afterNv));

  // A word chip leaves the card for the Word card; "Back to Āyah card" brings the card back.
  await page.evaluate(() => document.querySelector("[data-ayah-sheet] [data-word-occurrence]")?.click());
  await page.waitForFunction(() => document.querySelector(".quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  const pill = await page.evaluate(() => { const p = document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]"); if (!p) return null; const r = p.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { text: p.textContent.trim(), tappable: !!hit && p.contains(hit), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  check(`${tag} after a word chip, "Back to Āyah card 14:14" is on screen and tappable`, !!pill && /14:14|১৪:১৪/.test(pill.text) && pill.tappable && pill.inView, JSON.stringify(pill));
  if (pill) {
    await page.click("[data-ayah-card-back]");
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    const again = await page.evaluate(() => ({ card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent, word: !!document.querySelector(".quran-word-card"), pill: !!document.querySelector("#ayahCardBackPill:not([hidden])") }));
    check(`${tag} it closes the Word card and reopens the same Āyah card; the pill goes`, again.card && again.ref === ref0 && !again.word && !again.pill, JSON.stringify(again));
  }
  // Note & more… leaves for the Note view; the way back returns to the Read view and the card.
  await page.evaluate(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note]")?.click());
  await page.waitForTimeout(1200);
  const inNote = await page.evaluate(() => !!document.querySelector("#ayahCardBackPill:not([hidden])"));
  check(`${tag} Note & more… also leaves "Back to Āyah card"`, inNote);
  if (inNote) {
    await page.click("[data-ayah-card-back]");
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(() => ({ card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent, readShown: !!document.getElementById("readView")?.getClientRects().length }));
    check(`${tag} …and it brings back the Read view with the same Āyah card`, r.card && r.ref === ref0 && r.readShown, JSON.stringify(r));
  }
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// The way-back law, the Owner's own example: a Name's reference, then back to that Name (and its poster).
{
  const { ctx, page } = await start("en", 390, 844);
  await clean(page);
  await page.click("#tabExploreBtn"); await page.waitForTimeout(600);
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 });
  await page.selectOption("#asmaXSingleSelect", "1");
  await page.waitForFunction(() => document.querySelector('#asmaXPosterPanel [data-asma-poster="1"]'), null, { timeout: 8000 });
  await page.click("#asmaXPosterPanel");
  await page.waitForFunction(() => document.querySelector('#asmaXPosterOverlay.open [data-poster-quran="55:1"]'), null, { timeout: 5000 }).catch(() => {});
  await page.click('#asmaXPosterOverlay [data-poster-quran="55:1"]');
  await page.waitForFunction(() => document.querySelector("#ayahCardBackPill:not([hidden])"), null, { timeout: 8000 }).catch(() => {});
  const pill = await page.evaluate(() => document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")?.textContent.trim() ?? null);
  check("a poster's reference (55:1) leaves \"Back to Ar-Rahman\" on screen", /Back to Ar-Rahman/.test(pill ?? ""), String(pill));
  if (pill) {
    await page.click("[data-ayah-card-back]");
    await page.waitForFunction(() => document.querySelector("#asmaXPosterOverlay.open .ahp-standalone"), null, { timeout: 10000 }).catch(() => {});
    const back = await page.evaluate(() => ({ poster: !!document.querySelector('#asmaXPosterOverlay.open [data-asma-poster="1"]'), panel: !!document.querySelector('#asmaXPosterPanel [data-asma-poster="1"]'), pill: !!document.querySelector("#ayahCardBackPill:not([hidden])") }));
    check("…and it reopens Explore at Ar-Rahman with its full-size poster, the pill gone", back.poster && back.panel && !back.pill, JSON.stringify(back));
  }
  // The Hadith library, opened from a poster, offers ← Back.
  const href = await page.evaluate(() => document.querySelector("#asmaXPosterOverlay [data-poster-hadith]")?.getAttribute("href") ?? (async () => { const { posterHadithHref, POSTER_HADITH } = await import("/app/js/asma-poster.js"); return posterHadithHref(POSTER_HADITH["bukhari:6410"]); })());
  check("a poster's Hadith link carries back=1", /[?&]back=1\b/.test(href ?? ""), String(href));
  const lib = await ctx.newPage();
  await lib.goto(`http://localhost:8080/app/${String(href).replace(/^\.\//, "")}`);
  await lib.waitForTimeout(1200);
  check("the Hadith library opened that way shows \"← Back\"", await lib.evaluate(() => { const b = document.getElementById("hadithBackBtn"); return !!b && !b.hidden && /Back/.test(b.textContent) && b.getBoundingClientRect().height >= 40; }));
  await ctx.close();
}
{
  const { asmaPosterModel } = await import("../../app/js/asma-poster.js");
  const added = asmaPosterModel({ number: 140, transliteration: "Al-Munshi'", arabic: "", meaning: { en: "The Producer" }, ref: "কুরআন ৫৬:৭২, ৫৬:৭২, ৫৬:৭২", isExtra: true });
  check("a Name added without Arabic: the poster model knows it (and says so), and one Ayah cited three times is printed once",
    added.arabic === "" && added.quran.length === 1 && added.quran[0].surah === 56 && added.quran[0].ayah === 72, JSON.stringify(added.quran));
  const corrected = asmaPosterModel({ number: 1, transliteration: "Ar-Rahman", arabic: "الرحمن", meaning: { en: "x" }, enOverride: "The Owner's own wording", ref: "" });
  check("the Owner's own English correction wins over the archive poster's meaning", corrected.meaning === "The Owner's own wording", corrected.meaning);
}

// The ends of the Qur'an: ‹ is off on 1:1 and › on 114:6.
{
  const { ctx, page } = await start("en", 390, 844);
  // 1:1 may be the unnumbered Bismillah (no badge), so open 1:2's card and step back once.
  await goToAyah(page, 1, 2);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await page.click('[data-ayah-sheet-step="-1"]'); await page.waitForTimeout(400);
  const first = await page.evaluate(() => ({ prev: document.querySelector('[data-ayah-sheet-step="-1"]')?.disabled, next: document.querySelector('[data-ayah-sheet-step="1"]')?.disabled }));
  await page.click("[data-ayah-sheet-close]");
  await goToAyah(page, 114, 6);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="114:6"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  const last = await page.evaluate(() => ({ prev: document.querySelector('[data-ayah-sheet-step="-1"]')?.disabled, next: document.querySelector('[data-ayah-sheet-step="1"]')?.disabled }));
  await page.click('[data-ayah-sheet-step="-1"]'); await page.waitForTimeout(400);
  const stepped = await page.evaluate(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent);
  check("‹ is off on the first āyah of the Qur'an, › on the last; both work elsewhere", first.prev === true && first.next === false && last.next === true && last.prev === false && /114:5/.test(stepped ?? ""), JSON.stringify({ first, last, stepped }));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word card and Āyah card: clean Arabic, readable places, pop-ups and ways back (Owner, 7 Oct 2026): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
