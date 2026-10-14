// PCF J23 layout B, top of the Word card (the Owner, 14 Oct 2026):
//   "This āyah" sits on the 🔍 row (the header), the meaning line is above the level tabs, the Colour tick is on the
//   meaning line, and the word "Colour" shows only where the MEASURED line has room.
//   MUTATE=ownrow        renders "This āyah" in a row of its own again -> same-row check must FAIL
//   MUTATE=meaningbelow  makes the meaning bar follow the tabs          -> order check must FAIL
//   MUTATE=nofit         never hides the word                           -> no-room case must FAIL
//   MUTATE=notick        drops the tick from the meaning line           -> tick checks must FAIL
// Run from the repository root with `node serve.js` running. SHOT_DIR=/tmp writes the 390px screenshots.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, process.env.VERBOSE && console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const SHOT = process.env.SHOT_DIR || (await import("node:os")).tmpdir();
const saw = { shown: 0, hidden: 0 };

const AYAH_BTN = /\n *<button type="button" class="word-card-ayah-action-btn"[^\n]*<\/button>/;
const MEANING_CALL = /\$\{state\.level === "wbw" \? meaningBarHtml\([^\n]*\n/;

async function mutate(ctx) {
  if (!MUTATE) return;
  await ctx.route("**/js/quran-word-card.js", async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    const before = body;
    if (MUTATE === "ownrow") {
      const m = body.match(AYAH_BTN);
      if (m) body = body.replace(AYAH_BTN, "").replace("    ${segmentControlsHtml(", `    <div class="word-card-ayah-action-row">${m[0].trim()}</div>\n    \${segmentControlsHtml(`);
    }
    if (MUTATE === "meaningbelow") {
      const m = body.match(MEANING_CALL);
      if (m) body = body.replace(MEANING_CALL, "").replace("    ${levelPanel(state.level", m[0] + "    ${levelPanel(state.level");
    }
    if (MUTATE === "nofit") body = body.replace("height > compact + 1)", "height > compact + 1e9)");
    if (MUTATE === "notick") body = body.replace("validSegments(context.wordSegments) ? colourToggleHtml(context.colourWordPartsEnabled, text.colourToggleShort, true) : \"\"", '""');
    if (body === before) throw new Error("mutation did not apply: " + MUTATE);
    await route.fulfill({ response: res, body });
  });
}

async function openWord(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s && s.value !== "8") { s.value = "8"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":1:7:6"]'), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":1:7:6"]')?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-meaning-bar]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}

const read = (page) => page.evaluate(() => {
  const m = document.getElementById("quranWordCardMount");
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const card = m.querySelector(".quran-word-card");
  const bar = m.querySelector("[data-word-card-meaning-bar]");
  const tick = m.querySelector("[data-word-card-colour-toggle]");
  const label = m.querySelector(".word-card-segment-toggle-text");
  const header = card.querySelector("header");
  const box = R(card);
  const clipped = [...card.querySelectorAll("header > *, .word-card-meaning-bar > *, .word-card-meaning-text > *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.r + 0.5 || r.left < box.l - 0.5); }).length;
  return {
    header: R(header), headWord: R(header.querySelector(".word-card-head-word")), ayah: R(m.querySelector("[data-word-card-ayah-action]")), search: R(m.querySelector("[data-word-card-search-toggle]")),
    bar: R(bar), tickLabel: tick?.getAttribute("aria-label") ?? null, tickBox: R(tick?.closest("label")),
    labelShown: !!label && getComputedStyle(label).display !== "none" && label.getBoundingClientRect().width > 0,
    compact: bar?.hasAttribute("data-compact") ?? null, tabs: R(m.querySelector('[role="tablist"]')), text: R(bar?.querySelector(".word-card-meaning-text")),
    ayahRows: m.querySelectorAll(".word-card-ayah-action-row").length, clipped,
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth, cardScroll: card.scrollWidth - card.clientWidth,
  };
});

for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 768, 1280]) {
    for (const long of [false, true]) {
      const tag = `[${lang} ${width}${long ? " long" : ""}]`;
      console.log(`\n=== ${tag} ===`);
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
      await mutate(ctx);
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await page.waitForTimeout(600);
      await openWord(page);
      if (long) {
        // a long meaning, as 14:28:12 "(of) destruction" plus more; the card re-measures on resize, so nudge it.
        await page.evaluate(() => {
          const m = document.querySelector("#quranWordCardMount [data-word-card-meaning-bar] .word-card-meaning-en");
          if (m) m.textContent = "(of) destruction and utter ruin, the abode of perdition and loss";
        });
        await page.setViewportSize({ width: width + 1, height: 900 });
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(400);
      }
      const d = await read(page);
      check(`${tag} the card is open with a meaning line above tabs`, !!d.bar && !!d.tabs, JSON.stringify(d));
      if (!d.bar) { await ctx.close(); continue; }
      check(`${tag} "This āyah" is on the 🔍 row, not a row of its own`, !!d.ayah && !!d.search && Math.abs(d.ayah.t - d.search.t) <= 8 && d.ayah.b <= d.header.b + 0.5 && d.ayahRows === 0, JSON.stringify({ a: d.ayah, s: d.search, h: d.header, rows: d.ayahRows }));
      check(`${tag} the Arabic word keeps at least 60px (the header wraps rather than squeezing it)`, d.headWord.w >= 60, JSON.stringify(d.headWord));
      check(`${tag} "This āyah" is right of 🔍 and at least 38px tall`, !!d.ayah && d.ayah.l >= d.search.r - 0.5 && d.ayah.h >= 37.5, JSON.stringify(d.ayah));
      check(`${tag} the meaning line is above the level tabs`, d.bar.b <= d.tabs.t + 0.5, `${d.bar.b} vs ${d.tabs.t}`);
      check(`${tag} the meaning line is below the header`, d.bar.t >= d.header.b - 0.5);
      check(`${tag} the Colour tick is on the meaning line, at its right edge`, !!d.tickBox && d.tickBox.t >= d.bar.t - 0.5 && d.tickBox.b <= d.bar.b + 0.5 && d.tickBox.r >= d.bar.r - 16 && d.tickBox.l > d.text.l, JSON.stringify({ t: d.tickBox, b: d.bar }));
      check(`${tag} the tick keeps an aria-label "Colour" (translated)`, d.tickLabel === (lang === "bn" ? "রঙিন" : "Colour"), String(d.tickLabel));
      check(`${tag} the tick target is at least 38px`, !!d.tickBox && d.tickBox.h >= 37.5 && d.tickBox.w >= 37.5, JSON.stringify(d.tickBox));
      check(`${tag} the word is visible exactly when the line is not compact`, d.labelShown === !d.compact, JSON.stringify({ shown: d.labelShown, compact: d.compact }));
      check(`${tag} text and tick do not overlap`, !!d.tickBox && d.text.r <= d.tickBox.l + 0.5, JSON.stringify({ t: d.text, k: d.tickBox }));
      // Architect review, 14 Oct: Bangla's "রঙিন" is shorter than "Colour" and, measured, fits beside the long meaning at
      // 320px without making it wrap, so there IS room there and showing it is correct (the Owner: "as long as there is
      // space"). The no-room case is asserted in English, and the last check below still requires both states to occur.
      if (long && width <= 320 && lang === "en") check(`${tag} a long meaning leaves no room, so only the box shows`, d.compact === true && !d.labelShown, JSON.stringify({ compact: d.compact, shown: d.labelShown }));
      if (!long && width >= 768) check(`${tag} a short meaning on a wide card shows the word`, d.labelShown, JSON.stringify({ compact: d.compact }));
      saw[d.labelShown ? "shown" : "hidden"]++;
      check(`${tag} nothing clipped past the card, no sideways scroll`, d.clipped === 0 && d.page <= 0 && d.cardScroll <= 0, JSON.stringify({ c: d.clipped, p: d.page, s: d.cardScroll }));
      if (SHOT && !long && !MUTATE && width === 390) await page.screenshot({ path: `${SHOT}/layout-b-${lang}-390.png` });
      await ctx.close();
    }
  }
}
check("the word 'Colour' showed in at least one case and was dropped in at least one other", saw.shown > 0 && saw.hidden > 0, JSON.stringify(saw));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
