// PCF MSA J101 (the Owner, 26 Oct 2026, a phone screenshot of the Word Card, 6:3:10): "Can we save some space here?
// We only show one chosen language beside the arabic in the same row. And we take the root button off from that row …
// Then let the transliteration only stays with little slim bar at the current place. And can we build a card/ form for
// all word/ verb forms and place the button in the same row to share space with transliteration?" Ticked: B (the app's
// own language), A (a new Forms card), keep the colour by part.
// The word is 1:5:2 نَعْبُدُ (a Form I verb in the present). What the Forms card must say is read here, independently,
// from the packaged verb-forms.json (never from the page). Run from the repository root with serve.js on :8080.
// Every mutation must make the suite exit 1:
//   rootbox    the ROOT box comes back into the header           -> "no ROOT box" fails
//   twolang    the meaning bar shows English AND Bangla again    -> "one meaning" fails
//   noforms    no Forms button                                   -> the Forms checks fail
//   nohere     the "this word" ring is never drawn               -> "this word is marked" fails
//   escshut    Escape closes the whole Word Card                 -> "Escape returns to the word" fails
//   nochip     the meaning sits on the header with no background -> the contrast check fails (Night look)
//   tabhead    a tablet card shows the meaning in the header again (the Owner's 26 Oct tablet screenshot) -> the tablet checks fail
// UPDATED IN PLACE 26 Oct 2026 (the Owner, a TABLET screenshot of 14:11: "This was not a good job. When you do a fix in
// mobile, you need check how it goes in Tab n vice versa. For Tab, keep only Arabic on top bar. Bring translation on the
// bar below with transliteration. You might try fit form button on the top bar."): the suite now measures tablet widths
// (520, 600) and the Owner's own long word (14:11:28 فَلْيَتَوَكَّلِ), and on every card asks whether the DRAWN Arabic
// touches any other control on the header -- the check whose absence let J101's tablet header ship crowded. On a card
// wider than 30rem the header is the Arabic and Forms ▸ only, and the meaning is in the slim bar beside the transliteration;
// on a phone card it is the J101 layout.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const CARD = "app/js/quran-word-card.js", PAGE = "app/quranrevival.html";
const MUT = {
  rootbox: [CARD, 'headGlossHtml(word, context, text) + formsButtonHtml(layers, context, "head") : ""}', 'headGlossHtml(word, context, text) + formsButtonHtml(layers, context, "head") : ""}<div class="word-card-root-box" data-word-card-root-box><small>ROOT</small><span>ع ب د</span></div>'],
  twolang: [CARD, '    <div class="word-card-meaning-text">${gloss}${translit}</div>${btn}', '    <div class="word-card-meaning-text"><p class="word-card-meaning word-card-meaning-en" lang="en">${escapeHtml(word.translation?.en ?? "")}</p><p class="word-card-meaning word-card-meaning-bn" lang="bn">${escapeHtml(word.translation?.bn ?? "")}</p>${translit}</div>${btn}'],
  noforms: [CARD, '  if (!layers.root) return "";\n  const ft = formsText(context);\n  return `<button', '  return "";\n  const ft = formsText(context);\n  return `<button'],
  tabhead: [PAGE, "  .quran-word-card header > .word-card-head-gloss { display: none; }\n", ""],
  nohere: [CARD, "const here = f.lemma === myLemma && myTense === tense;", "const here = false;"],
  nochip: [PAGE, "padding: 0.3rem 0.6rem; border: 1px solid var(--card-line); border-radius: 0.4rem; background: var(--card-bg-inset); font-size: 1.22rem;", "font-size: 1.22rem;"],
  escshut: [PAGE, "        if (formsBack) { formsBack.click(); return; }", "        void formsBack;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 520, 600, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];

// Expected, from the data file itself: عَبَدَ is Form I, and its present tense occurs this many times in the Qur'an.
const VF = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/verb-forms.json", "utf8")).values;
const ABADA = VF["عَبَدَ"];
if (!ABADA || ABADA.f !== 1) throw new Error("fixture: عَبَدَ is not Form I in verb-forms.json");
const sumOf = (t) => Object.entries(ABADA.n).filter(([k]) => k.startsWith(`${t}.`) || k === t).reduce((s, [, v]) => s + v, 0);
const EXPECT = { PERF: sumOf("PERF"), IMPF: sumOf("IMPF"), IMPV: sumOf("IMPV") };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, at = [1, 5, 2]) {
  const [su, ay, po] = at;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 780 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const glob = file === CARD ? "**/js/quran-word-card.js*" : "**/app/quranrevival.html*";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file === CARD ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(500);
  if (su !== 1) { await page.evaluate((n) => { const s = document.getElementById("surahSelect"); s.value = String(n); s.dispatchEvent(new Event("change", { bubbles: true })); }, su); await page.waitForTimeout(1500); }
  await page.evaluate((n) => { const s = document.getElementById("ayahSelect"); if (s && s.value !== String(n)) { s.value = String(n); s.dispatchEvent(new Event("change", { bubbles: true })); } }, ay);
  const occ = `:${su}:${ay}:${po}`;
  await page.waitForFunction((o) => !!document.querySelector(`[data-word-occurrence$="${o}"]`), occ, { timeout: 8000 }).catch(() => {});
  await page.evaluate((o) => document.querySelector(`[data-word-occurrence$="${o}"]`)?.click(), occ);
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-meaning-bar]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}
const top = (page) => page.evaluate(() => {
  const m = document.getElementById("quranWordCardMount"), card = m.querySelector(".quran-word-card"), header = card.querySelector("header");
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, mid: (r.top + r.bottom) / 2 }; };
  const shown = (el) => !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
  const box = R(card), wordEl = header.querySelector(".word-card-head-word"), word = R(wordEl);
  const gloss = [...card.querySelectorAll("[data-word-card-head-gloss], [data-word-card-bar-gloss]")].find(shown) ?? null;
  const bar = card.querySelector("[data-word-card-meaning-bar]"), btn = [...card.querySelectorAll("[data-word-card-forms]")].find(shown) ?? null;
  const tr = bar?.querySelector(".word-card-transliteration");
  const hit = (el) => { const r = el?.getBoundingClientRect(); if (!r?.width) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && el.contains(e); };
  const clipped = [...card.querySelectorAll("header > *, [data-word-card-meaning-bar] > *, .word-card-meaning-text > *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.r + 0.5 || r.left < box.l - 0.5); }).length;
  // The DRAWN Arabic (its text's own box, not its cell) against every other control on the header.
  const ar = header.querySelector(".word-card-arabic"), rg = document.createRange(); rg.selectNodeContents(ar); const g = rg.getBoundingClientRect();
  const glyphHits = [...header.children].filter(shown).filter((e) => !e.contains(ar)).filter((e) => { const b = e.getBoundingClientRect(); return b.left < g.right - 0.5 && g.left < b.right - 0.5 && b.top < g.bottom - 0.5 && g.top < b.bottom - 0.5; }).map((e) => e.className || e.tagName);
  const close = R(header.querySelector("[data-word-card-close]"));
  return {
    wide: box.w > 480.5, rootBox: !!card.querySelector("[data-word-card-root-box]"),
    meanings: [...card.querySelectorAll(".word-card-meaning")].filter(shown).map((e) => e.getAttribute("lang")),
    headerMeaning: [...header.querySelectorAll(".word-card-meaning")].filter(shown).length,
    glossInHeader: !!gloss && header.contains(gloss), glossInBar: !!gloss && !!bar?.contains(gloss),
    gloss: gloss?.textContent.trim() ?? "", glossLang: gloss?.getAttribute("lang") ?? null, glossColoured: !!gloss?.querySelector("[style*='color'], [class*='seg']"),
    sameRow: !!word && !!gloss && Math.abs(word.mid - R(gloss).mid) < 14, glossWhole: !!gloss && gloss.scrollWidth <= gloss.clientWidth + 1,
    glossBesideTr: !!gloss && !!tr && Math.abs(R(gloss).mid - R(tr).mid) < 12,
    barH: R(bar)?.h ?? 0, translit: tr?.textContent.trim() ?? "", btnH: R(btn)?.h ?? 0, btnHit: hit(btn), btnCount: [...card.querySelectorAll("[data-word-card-forms]")].filter(shown).length,
    btnInHeader: !!btn && header.contains(btn), btnInBar: !!btn && !!bar?.contains(btn),
    btnRow: !!tr && !!btn && Math.abs(R(tr).mid - R(btn).mid) < 12, btnOnTopRow: !!btn && !!close && Math.abs(R(btn).mid - close.mid) < 6,
    glyphHits, glyphCut: !!word && (g.left < word.l - 0.5 || g.right > word.r + 0.5),
    clipped, over: document.documentElement.scrollWidth - innerWidth,
  };
});
const pop = (page) => page.evaluate(() => {
  const p = document.querySelector("#quranWordCardMount [data-word-card-forms-pop]");
  if (!p) return { open: false };
  const verb = p.querySelector('[data-word-card-forms-verb="عَبَدَ"]');
  const cell = (t) => verb?.querySelector(`[data-word-card-forms-tense="${t}"]`);
  const n = (t) => { const s = cell(t)?.querySelector(".word-card-fc-n")?.textContent ?? ""; const d = s.replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c)).replace(/[^0-9]/g, ""); return d ? Number(d) : null; };
  const box = p.querySelector(".word-card-dpop-box").getBoundingClientRect();
  return { open: true, loading: !!p.querySelector("[data-word-card-forms-loading]"), verb: !!verb,
    present: cell("IMPF")?.querySelector("b")?.textContent.trim() ?? null, past: cell("PERF")?.querySelector("b")?.textContent.trim() ?? null,
    here: [...p.querySelectorAll("[data-word-card-forms-here]")].map((e) => e.dataset.wordCardFormsTense ?? e.dataset.wordCardFormsNoun),
    counts: { PERF: n("PERF"), IMPF: n("IMPF"), IMPV: n("IMPV") }, doer: p.querySelectorAll('[data-word-card-forms-noun="doer"]').length, verbs: [...p.querySelectorAll('[data-word-card-forms-verb]')].map((e) => e.dataset.wordCardFormsVerb),
    inside: box.left >= -0.5 && box.right <= innerWidth + 0.5 && box.top >= -0.5, focus: document.activeElement?.className ?? "" };
});
const waitPop = (page) => page.waitForFunction(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-forms-pop]"); return !!p && !p.querySelector("[data-word-card-forms-loading]"); }, null, { timeout: 12000 }).catch(() => {});

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width);
  const a = await top(page);
  check(`${tag} no ROOT box in the header (the root is under WbW and in Root, Family, Taṣrīf)`, !a.rootBox, JSON.stringify(a));
  check(`${tag} the drawn Arabic touches no other control on the header, and is not cut`, a.glyphHits.length === 0 && !a.glyphCut, JSON.stringify({ hits: a.glyphHits, cut: a.glyphCut }));
  check(`${tag} ONE meaning, in the app's own language (${lang})`, a.meanings.length === 1 && a.glossLang === lang && a.gloss.length > 0, JSON.stringify({ m: a.meanings, l: a.glossLang, g: a.gloss }));
  if (a.wide) {
    check(`${tag} tablet/computer card: the top bar holds the Arabic and Forms ▸ only (no meaning), Forms ▸ ≥ 40px, tappable, on the top row`, a.headerMeaning === 0 && a.btnInHeader && a.btnCount === 1 && a.btnH >= 40 && a.btnHit && a.btnOnTopRow, JSON.stringify(a));
    check(`${tag} ...the meaning is on the slim bar below, beside the transliteration (≤ 52px)`, a.glossInBar && a.glossBesideTr && a.barH > 0 && a.barH <= 52 && a.translit.length > 0, JSON.stringify(a));
  } else {
    check(`${tag} phone card: the meaning beside the Arabic on the same row`, a.glossInHeader && a.sameRow, JSON.stringify({ row: a.sameRow, inHeader: a.glossInHeader }));
    check(`${tag} ...the transliteration is one slim bar (≤ 52px), Forms ▸ shares its row, ≥ 40px, tappable`, a.btnInBar && a.btnCount === 1 && a.barH > 0 && a.barH <= 52 && a.translit.length > 0 && a.btnRow && a.btnH >= 40 && a.btnHit, JSON.stringify(a));
  }
  if (lang === "en") check(`${tag} ...the English keeps its colour by word part`, a.glossColoured, a.gloss);
  check(`${tag} nothing cut or outside the card, no sideways scroll`, a.clipped === 0 && a.glossWhole && a.over <= 0, JSON.stringify(a));
  if (width === 390 || width === 600) {
    // The meaning beside the Arabic, and each coloured word part, read at >= 4.5:1 on every card look (the first build
    // measured 1.2:1 on Night, where the header behind it is light).
    const ratios = await page.evaluate(() => {
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const out = [];
      for (const look of ["light", "dark", "night"]) {
        if (look === "dark") document.documentElement.removeAttribute("data-card-look"); else document.documentElement.setAttribute("data-card-look", look);
        const g = [...document.querySelectorAll("#quranWordCardMount [data-word-card-head-gloss], #quranWordCardMount [data-word-card-bar-gloss]")].find((e) => e.getClientRects().length > 0);
        for (const el of [g, ...(g ? g.querySelectorAll("*") : [])]) {
          if (!el || !el.textContent.trim()) continue;
          let bg = null;
          for (let n = el; n && !bg; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] === 1)) bg = c; }
          const a = lum(rgb(getComputedStyle(el).color)), b = lum(bg ?? [255, 255, 255]);
          out.push({ look, r: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) });
        }
      }
      document.documentElement.removeAttribute("data-card-look");
      return out;
    });
    check(`${tag} the meaning and its coloured parts read at >= 4.5:1 on the light, dark and Night looks`, ratios.length > 0 && ratios.every((x) => x.r >= 4.5), JSON.stringify(ratios.filter((x) => x.r < 4.5)));
  }
  if (width === 390 || width === 600 || width === 1280) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/j101-${lang}-${width}.png` });

  if (!a.btnCount) { check(`${tag} POSITIVE CONTROL: the Forms button exists`, false); await ctx.close(); continue; }
  await page.click("#quranWordCardMount [data-word-card-forms] >> visible=true"); await waitPop(page);
  const p1 = await pop(page);
  // The data writes shadda and fatḥa in its own order; compared after canonical ordering (NFD), as Unicode means them.
  if (p1.verbs) p1.form2 = p1.verbs.some((v) => v.normalize("NFD") === "عَبَّد".normalize("NFD"));
  check(`${tag} Forms opens the Forms card: عَبَدَ, Form I, with its past and present`, p1.open && !p1.loading && p1.verb && !!p1.present && !!p1.past, JSON.stringify(p1));
  check(`${tag} ...the counts are the Qur'an's own (past ${EXPECT.PERF}, present ${EXPECT.IMPF}, command ${EXPECT.IMPV})`, p1.counts.PERF === EXPECT.PERF && p1.counts.IMPF === EXPECT.IMPF && p1.counts.IMPV === EXPECT.IMPV, JSON.stringify(p1.counts));
  // From lemma-forms.json: ع ب د has a doer (عَابِد) and a Form II verb (عَبَّد) in the Qur'an, and no verbal noun.
  check(`${tag} ...this word (present) is the one marked; the Form II verb and the doer are listed`, p1.here.length === 1 && p1.here[0] === "IMPF" && p1.doer >= 1 && p1.form2, JSON.stringify({ here: p1.here, doer: p1.doer, form2: p1.form2, verbs: p1.verbs }));
  check(`${tag} ...inside the screen, the focus on ← Back to the word`, p1.inside && /word-card-forms-back/.test(p1.focus), JSON.stringify({ inside: p1.inside, focus: p1.focus }));
  if (width === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/j101-${lang}-${width}-forms.png` });
  await page.click("#quranWordCardMount .word-card-forms-back"); await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({ pop: !!document.querySelector("#quranWordCardMount [data-word-card-forms-pop]"), card: !!document.querySelector("#quranWordCardMount .quran-word-card"), focus: document.activeElement?.className ?? "" }));
  check(`${tag} ← Back to the word: the card closes, the word is where it was, the focus on Forms ▸`, !back.pop && back.card && /word-card-forms-btn/.test(back.focus), JSON.stringify(back));
  await page.click("#quranWordCardMount [data-word-card-forms] >> visible=true"); await waitPop(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const esc = await page.evaluate(() => ({ pop: !!document.querySelector("#quranWordCardMount [data-word-card-forms-pop]"), card: !!document.querySelector("#quranWordCardMount .quran-word-card") }));
  check(`${tag} Escape returns to the word (the Word Card stays open)`, !esc.pop && esc.card, JSON.stringify(esc));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// The Owner's own word from the tablet screenshot, 14:11:28 فَلْيَتَوَكَّلِ (long, and a long English gloss): the drawn
// Arabic touches nothing on the header and is not cut, at phone and tablet widths, both languages.
if (!arg("width")) for (const lang of LANGS) for (const width of [320, 390, 520, 600, 768]) {
  const tag = `[${lang} ${width} 14:11:28]`;
  const { ctx, page, errors } = await start(lang, width, [14, 11, 28]);
  const a = await top(page);
  check(`${tag} the drawn Arabic touches no other control on the header, and is not cut`, a.glyphHits.length === 0 && !a.glyphCut && a.translit.length > 0, JSON.stringify({ hits: a.glyphHits, cut: a.glyphCut, tr: a.translit }));
  check(`${tag} the meaning is where it belongs (${a.wide ? "the slim bar" : "beside the Arabic"}), whole, one Forms ▸, nothing outside the card`, a.meanings.length === 1 && (a.wide ? a.glossInBar && a.headerMeaning === 0 && a.btnInHeader : a.glossInHeader) && a.btnCount === 1 && a.glossWhole && a.clipped === 0 && a.over <= 0, JSON.stringify(a));
  if (width === 600) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/j101-${lang}-${width}-14-11.png`, clip: { x: 0, y: 0, width, height: 420 } });
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Word Card top: one meaning beside the Arabic, slim bar, Forms card (PCF MSA J101)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
