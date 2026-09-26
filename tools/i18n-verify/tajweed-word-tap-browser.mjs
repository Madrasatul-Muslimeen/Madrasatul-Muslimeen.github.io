// Issue #294 -- the Owner: "Clicking on a word displays a WbW card; it only
// works in Mushaf view. Why not in read and study view too?" Because with
// Tajweed colours ON the flowing Arabic was one unsplit block. It is split
// into word buttons now; this suite proves it in a real browser:
//   - with Tajweed on, in Read view and in Note view, every word of 2:2 is a
//     focusable role=button span (a real <button> reflowed the line), and tapping one opens the Word Card for THAT occurrence (checked
//     on word 7, the word an idgham colour run crosses into);
//   - the colours are still there (tajweed spans inside the buttons);
//   - the āyah lays out exactly as the old unsplit block did: the same
//     height and line count, measured by rendering the old HTML into a clone
//     of the same element on the same page;
//   - no sideways scroll, both languages, phone and desktop.
// Run from the repository root with serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

async function openStudy(page, which) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const reachable = await page.evaluate((id) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) > 0, which);
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click(`#${which}`);
  await page.waitForTimeout(700);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 800 }]) {
  for (const lang of ["en", "bn"]) {
    const label = `${lang} ${viewport.width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openStudy(page, "tabReadBtn");
    await page.evaluate(() => {
      const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const u = document.getElementById("unitTypeSelect"); u.value = "ayah"; u.dispatchEvent(new Event("change", { bubbles: true }));
      const a = document.getElementById("ayahSelect"); a.value = "2"; a.dispatchEvent(new Event("change", { bubbles: true }));
      const tj = document.getElementById("tajweedToggle"); if (!tj.checked) { tj.checked = true; tj.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await page.waitForTimeout(900);

    for (const [view, scope, tab] of [["Read", "#readView", null], ["Note", "#noteView", "tabNoteBtn"]]) {
      if (tab) await openStudy(page, tab);
      const state = await page.evaluate(async (scope) => {
        const block = [...document.querySelectorAll(`${scope} .ayah-arabic, ${scope} .note-arabic`)]
          .find((el) => el.querySelector('[data-word-occurrence*=":2:2:"]') || /ذ/.test(el.textContent));
        if (!block) return null;
        const buttons = [...block.querySelectorAll('[role="button"][tabindex="0"][data-word-occurrence*=":2:2:"]')];
        const colouredInside = block.querySelectorAll("[data-word-occurrence] [class^='tajweed-']").length;
        const { tajweedRawToSafeHtml } = await import("/app/js/ayah-renderer.js");
        const res = await fetch("/tools/quran-data-pull/output/surahs/surah_002.json");
        const data = await res.json();
        const raw = (data.ayahs ?? data).find((x) => x.ayah === 2).tajweedText;
        const clone = block.cloneNode(false);
        clone.innerHTML = tajweedRawToSafeHtml(raw);
        block.parentElement.insertBefore(clone, block.nextSibling);
        const lh = parseFloat(getComputedStyle(block).lineHeight);
        const now = block.getBoundingClientRect(), old = clone.getBoundingClientRect();
        clone.remove();
        return {
          buttons: buttons.length,
          colouredInside,
          heightNow: Math.round(now.height), heightOld: Math.round(old.height),
          linesNow: Math.round(now.height / lh), linesOld: Math.round(old.height / lh),
        };
      }, scope);
      check(`${label} ${view} view: 2:2 is on screen with Tajweed on`, !!state, "no 2:2 Arabic block");
      if (!state) continue;
      check(`${label} ${view} view: all 7 words of 2:2 are tappable, focusable words (role=button) with Tajweed on`, state.buttons === 7, String(state.buttons));
      check(`${label} ${view} view: the tajweed colours are still there, inside the buttons`, state.colouredInside > 0, String(state.colouredInside));
      check(`${label} ${view} view: the āyah lays out exactly as the old unsplit block (same height, same lines)`,
        Math.abs(state.heightNow - state.heightOld) <= 1 && state.linesNow === state.linesOld, JSON.stringify(state));

      await page.click(`${scope} [data-word-occurrence="quran-word-occurrence:v1:2:2:7"]`);
      await page.waitForTimeout(700);
      const card = await page.evaluate(() => {
        const mount = [...document.querySelectorAll("[id^='quranWordCardMount']")].find((m) => m.querySelector(".quran-word-card"));
        const c = mount?.querySelector(".quran-word-card");
        return c ? { text: c.textContent.slice(0, 200), occ: c.dataset.occurrence ?? c.getAttribute("data-word-occurrence") ?? null } : null;
      });
      check(`${label} ${view} view: tapping word 7 (inside the idgham run) opens the Word Card`, !!card, "no Word Card");
      check(`${label} ${view} view: the Word Card is for 2:2 word 7, not a neighbour`,
        !!card && (card.occ ? card.occ.endsWith(":2:2:7") : /لِّلْمُتَّقِينَ|2:2/.test(card.text)), JSON.stringify(card));
      await page.keyboard.press("Escape");
      await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
      await page.waitForTimeout(300);
      // Keyboard: focus word 1 and press Enter -- a span is not a native
      // button, so this is the case that needs its own handler.
      await page.focus(`${scope} [data-word-occurrence="quran-word-occurrence:v1:2:2:1"]`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);
      const byKey = await page.evaluate(() => !![...document.querySelectorAll("[id^='quranWordCardMount']")].find((m) => !m.hidden && m.querySelector(".quran-word-card")));
      check(`${label} ${view} view: Enter on a focused tajweed word opens its Word Card (keyboard parity with a button)`, byKey);
      await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
      await page.waitForTimeout(300);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(`${label} ${view} view: no sideways scroll`, sw <= 1, `${sw}px`);
    }
    check(`${label} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Tajweed word tap, browser (issue #294): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
