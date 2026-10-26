// PCF MSA J60 (the Owner, 21 Oct 2026, a phone screenshot of the Word card, Family level, at 6:3:4 ٱلسَّمَٰوَٰت):
// "Family: Keep only one row of occurances visible which should follow by 'x more', n enable that to open all. For each
// meaning with its occurances, give it a distinctive look/ plate." and "removing the color tick/ untick option, it should
// be always coloured … And also remove 'stem, particle' that line".
// Real data, at 6:3:4. Run from the repository root with serve.js on :8080 (or QR_BASE=http://localhost:8081).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   nofit      the page never measures the rows                   -> the one-row / "+N more" checks fail
//   nocurrent  the gold place is hidden like any other             -> "the gold 6:3:4 place stays on the first line" fails
//   nomore     the button is not dropped to the first line         -> "one line, the button included" fails
//   noopen     the button does not open the row                    -> the "Show fewer" / all-places checks fail
//   noresize   a new width is not re-measured                      -> the "re-measured at a new width" check fails
//   plate      a meaning has no plate of its own                   -> the plate checks fail
//   pref       the card follows the old stored Colour choice       -> "coloured even with Colour stored off" fails
//   tick       the Colour tick comes back                          -> the "no Colour tick" check fails
//   keepfirst  the first place is never given up (audit part 78)  -> the 320px "drawn wider ... still ONE line" checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const JS = "app/js/quran-word-card.js", HTML = "app/quranrevival.html";
const MUT = {
  nofit: [HTML, "      fitWordCardFamily(content);\n", ""],
  nocurrent: [JS, "chips.forEach((c) => { if (c !== current && top(c) > line1) c.hidden = true; });", "chips.forEach((c) => { if (top(c) > line1) c.hidden = true; });"],
  // Re-anchored (audit part 78): the loop now runs to i >= 0.
  nomore: [JS, "i >= 0 && (top(more) > line1 || (current && top(current) > line1)); i--)", "i >= 0 && false; i--)"],
  // Audit part 78: the first place is never given up again -> the wider-font check at 320 fails.
  keepfirst: [JS, "for (let i = chips.length - 1; i >= 0 &&", "for (let i = chips.length - 1; i > 0 &&"],
  noopen: [HTML, "        if (!wordCardFamilyOpen.delete(key)) wordCardFamilyOpen.add(key);\n", ""],
  noresize: [HTML, "{ if (content.clientWidth !== width) { width = content.clientWidth; fitWordCardFamily(content); } }", "{ }"],
  plate: [HTML, "color: var(--wc-purple-ink); background: var(--wc-purple-plate); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18); }", "color: var(--wc-purple-ink); }"],
  pref: [HTML, "colourWordPartsEnabled: true, translitScript", 'colourWordPartsEnabled: localStorage.getItem("mm_word_segments_colour") !== "0", translitScript'],
  tick: [JS, "    </div>\n  </div>`;\n}", '    </div><label class="word-card-segment-toggle"><input type="checkbox" data-word-card-colour-toggle checked aria-label="Colour"></label>\n  </div>`;\n}'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MOUNT = "#quranWordCardMount";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
// Each meaning's row: its places (shown or not), the distinct line tops of what shows, and its button.
const senses = (page) => page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-sense]")].map((s) => {
  const chips = [...s.querySelectorAll(".word-card-family-chip")];
  const shown = chips.filter((c) => c.getBoundingClientRect().width > 0);
  const more = s.querySelector("[data-word-card-family-more]");
  const mr = more?.getBoundingClientRect();
  const moreShown = !!mr && mr.width > 0;
  const tops = [...new Set([...shown, ...(moreShown ? [more] : [])].map((e) => Math.round(e.getBoundingClientRect().top)))];
  return {
    label: s.querySelector("b")?.textContent.trim() ?? "",
    key: more?.dataset.wordCardFamilyMore ?? null,
    total: chips.length, shown: shown.length, lines: tops.length,
    more: moreShown ? more.textContent.trim() : null, expanded: more?.getAttribute("aria-expanded") ?? null,
    current: chips.find((c) => c.classList.contains("word-card-family-chip-current"))?.getBoundingClientRect().width > 0 ? "shown" : chips.some((c) => c.classList.contains("word-card-family-chip-current")) ? "hidden" : "none",
    currentFirstLine: (() => { const c = chips.find((x) => x.classList.contains("word-card-family-chip-current")); return c && shown[0] ? Math.abs(c.getBoundingClientRect().top - shown[0].getBoundingClientRect().top) < 3 : null; })(),
  };
}));
const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const N = { en: (s) => Number(s), bn: (s) => Number(String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d))) };

const runs = [["en", 1280], ["en", 768], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390], ["bn", 320]];
for (const [lang, width] of runs) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Family rows + WbW colour [${tag}] ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  // The old stored choice was "Colour off"; J60 says the card is always coloured, whatever was stored.
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_word_segments_colour", "0"); } catch {} });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await goTo(page, 6, 3);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":6:3:4"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // WbW: always coloured, no Colour tick, no colour-key ("● particle ● stem") row.
  const wbw = await page.evaluate(() => {
    const m = document.querySelector("#quranWordCardMount");
    return {
      tick: !!m.querySelector("[data-word-card-colour-toggle], .word-card-segment-toggle"),
      keyRow: m.querySelectorAll(".word-card-segment-controls, .word-card-segment-legend").length,
      colouredAr: m.querySelectorAll(".word-card-arabic [class*='word-card-segment-']").length,
      // PCF MSA J101: the meaning moved beside the Arabic, in the app's own language; English is the one coloured by part
      // (the Bangla gloss has no part alignment, as before). Updated in place, reason recorded.
      colouredGloss: m.querySelectorAll("[data-word-card-head-gloss] [class*='word-card-segment-']").length,
      bar: (() => { const b = m.querySelector("[data-word-card-meaning-bar]")?.getBoundingClientRect(); const c = m.querySelector(".quran-word-card")?.getBoundingClientRect(); return b && c ? { l: b.left - c.left, r: c.right - b.right } : null; })(),
    };
  });
  check(`${tag} WbW: no Colour tick on the meaning line`, !wbw.tick, JSON.stringify(wbw));
  check(`${tag} WbW: no colour-key ("particle · stem") row`, wbw.keyRow === 0, JSON.stringify(wbw));
  check(`${tag} WbW: the word parts are coloured even with Colour stored off (Arabic and the meaning)`, wbw.colouredAr >= 2 && (lang === "bn" || wbw.colouredGloss >= 1), JSON.stringify(wbw));
  check(`${tag} WbW: the meaning line sits inside the card`, !!wbw.bar && wbw.bar.l >= -0.5 && wbw.bar.r >= -0.5, JSON.stringify(wbw.bar));

  await page.click(`${MOUNT} [data-word-card-level="basic"]`).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-family-sense]").length > 0, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  let rows = await senses(page);
  const heavens = rows.find((r) => r.current !== "none");
  const n = (s) => N[lang](String(s ?? "").match(/[\d০-৯]+/)?.[0]);
  check(`${tag} the "this word" meaning (${heavens?.label}) shows ONE line of places, the button on it too`, !!heavens && heavens.total > 20 && heavens.lines === 1 && heavens.shown < heavens.total, JSON.stringify(heavens));
  check(`${tag} its button says how many are behind it ("+N more"), and N is exactly what is hidden`, !!heavens?.more && /\+|আরও/.test(heavens.more) && n(heavens.more) === heavens.total - heavens.shown && heavens.expanded === "false", JSON.stringify(heavens));
  check(`${tag} the gold 6:3:4 place stays on the first line`, heavens?.current === "shown" && heavens?.currentFirstLine === true, JSON.stringify(heavens));
  const clamped = rows.filter((r) => r.more);
  check(`${tag} every meaning with a button shows one line only, and every number is right`, clamped.length >= 1 && clamped.every((r) => r.lines === 1 && n(r.more) === r.total - r.shown), JSON.stringify(clamped.map((r) => [r.label, r.lines, r.shown, r.total, r.more])));
  check(`${tag} a meaning whose places fit on one line has no button and hides nothing`, rows.filter((r) => !r.more).every((r) => r.shown === r.total && r.lines <= 1), JSON.stringify(rows.filter((r) => !r.more).map((r) => [r.label, r.shown, r.total, r.lines])));

  // Plates: each meaning is its own plate, distinct from the purple column, readable in both looks.
  for (const look of ["night", "light"]) {
    const p = await page.evaluate((look) => {
      document.documentElement.setAttribute("data-card-look", look);
      const box = document.querySelector("#quranWordCardMount [data-word-card-family-render]");
      const ss = [...box.querySelectorAll("[data-word-card-family-sense]")];
      const more = box.querySelector("[data-word-card-family-more]:not([hidden])");
      const gaps = ss.slice(1).map((s, i) => { const a = ss[i].getBoundingClientRect(), b = s.getBoundingClientRect(); return b.top >= a.bottom ? b.top - a.bottom : null; }).filter((g) => g !== null);
      return {
        col: getComputedStyle(box).backgroundColor,
        plates: [...new Set(ss.map((s) => getComputedStyle(s).backgroundColor))],
        bar: ss.map((s) => parseFloat(getComputedStyle(s).borderInlineStartWidth)),
        ink: [...new Set(ss.flatMap((s) => [...s.querySelectorAll("b, .word-card-family-x, .word-card-family-chip")].map((e) => getComputedStyle(e).color)))],
        more: more ? [getComputedStyle(more).color, getComputedStyle(more).backgroundColor] : null,
        gaps,
      };
    }, look);
    const ok = p.plates.length === 1 && p.plates[0] !== p.col && !/rgba\(0, 0, 0, 0\)/.test(p.plates[0]);
    check(`${tag} [${look}] every meaning sits on its own plate (${p.plates[0]}), not the column's ${p.col}, with a 5px bar at its start`, ok && p.bar.every((w) => w >= 4.5), JSON.stringify(p));
    check(`${tag} [${look}] the plates are apart (a gap between each)`, p.gaps.length >= 1 && p.gaps.every((g) => g >= 4), JSON.stringify(p.gaps));
    check(`${tag} [${look}] text on a plate is ≥ 4.5:1 (measured ${p.ink.map((c) => contrast(c, p.plates[0]).toFixed(1)).join(", ")})`, p.ink.length >= 1 && p.ink.every((c) => contrast(c, p.plates[0]) >= 4.5), JSON.stringify(p));
    check(`${tag} [${look}] the "+N more" button is ≥ 4.5:1 (measured ${p.more ? contrast(p.more[0], p.more[1]).toFixed(1) : "-"})`, !!p.more && contrast(p.more[0], p.more[1]) >= 4.5, JSON.stringify(p.more));
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-card-look"));

  // Open, then close.
  const key = heavens?.key;
  await page.evaluate((key) => document.querySelector(`#quranWordCardMount [data-word-card-family-more="${CSS.escape(key)}"]`)?.click(), key);
  await page.waitForTimeout(300);
  rows = await senses(page);
  let h = rows.find((r) => r.key === key);
  check(`${tag} a tap opens every place of that meaning, and the button reads "Show fewer"`, !!h && h.shown === h.total && h.lines > 1 && h.expanded === "true" && h.more === (lang === "bn" ? "কম দেখান" : "Show fewer"), JSON.stringify(h));
  check(`${tag} the other meanings stay as they were`, rows.filter((r) => r.key !== key && r.more).every((r) => r.lines === 1), JSON.stringify(rows.map((r) => [r.label, r.lines])));
  await page.evaluate((key) => document.querySelector(`#quranWordCardMount [data-word-card-family-more="${CSS.escape(key)}"]`)?.click(), key);
  await page.waitForTimeout(300);
  h = (await senses(page)).find((r) => r.key === key);
  check(`${tag} a second tap closes it to one line again`, !!h && h.lines === 1 && h.expanded === "false", JSON.stringify(h));

  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${tag} the page does not scroll sideways`, over <= 0, String(over));
  if (width === 320) {
    // Audit part 78 (the MSA Architect, measured): on a machine whose font draws the places wider, the first place
    // 2:29:12 + the gold 6:3:4 + "+240 more" did not fit 232px and the button dropped to line 2, because the first place
    // was never given up. Draw the places and the button wider (letter-spacing), re-measure (the width changes and comes
    // back), and the row must still be ONE line with the gold place and the button on it. POSITIVE CONTROL: they grew.
    const width0 = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-sense] .word-card-family-chip-current")].reduce((a, c) => a + c.getBoundingClientRect().width, 0));
    await page.addStyleTag({ content: "#quranWordCardMount .word-card-family-chip, #quranWordCardMount [data-word-card-family-more] { letter-spacing: 3px; }" });
    await page.setViewportSize({ width: 330, height: 844 }); await page.waitForTimeout(500);
    await page.setViewportSize({ width: 320, height: 844 }); await page.waitForTimeout(800);
    const width1 = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-sense] .word-card-family-chip-current")].reduce((a, c) => a + c.getBoundingClientRect().width, 0));
    const wide = (await senses(page)).find((r) => r.current !== "none");
    check(`${tag} audit part 78: POSITIVE CONTROL -- the wider font really widened the gold place (${Math.round(width0)} -> ${Math.round(width1)}px)`, width1 - width0 >= 12, JSON.stringify({ width0, width1 }));
    check(`${tag} audit part 78: drawn wider, the "this word" meaning is still ONE line, the gold place and the button on it, N right`, !!wide && wide.lines === 1 && wide.current === "shown" && wide.currentFirstLine === true && !!wide.more && n(wide.more) === wide.total - wide.shown, JSON.stringify(wide));
  }

  if (lang === "en" && width === 1280) {
    // A new width re-measures (a tablet turned, a window narrowed): from 1280 to a 320 phone, fewer places on the one line.
    const before = h?.shown;
    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForTimeout(800);
    const w = (await senses(page)).find((r) => r.key === key);
    check(`${tag} re-measured at a new width (1280 → 320): still one line, fewer places, the number updated`, !!w && w.lines === 1 && w.shown < before && n(w.more) === w.total - w.shown, JSON.stringify({ before, w }));
  }
  if (lang === "en" && width === 390) {
    if (process.argv.includes("--shot")) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
      await page.waitForTimeout(600);
      await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-family-render]")?.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: process.env.SHOT_DIR + "/j60-family-390-night.png" });
      await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "light"));
      await page.waitForTimeout(300);
      await page.screenshot({ path: process.env.SHOT_DIR + "/j60-family-390-light.png" });
      await page.click(`${MOUNT} [data-word-card-level="wbw"]`).catch(() => {});
      await page.waitForTimeout(800);
      await page.evaluate(() => document.querySelector("#quranWordCardMount .quran-word-card")?.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: process.env.SHOT_DIR + "/j60-wbw-390-light.png" });
    }
  }
  await ctx.close();
}
console.log(`\n==== Word card Family rows + WbW colour (J60)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
