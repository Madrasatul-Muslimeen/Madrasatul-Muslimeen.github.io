// Audit part 142 fixes (MSA Architect, 31 Oct 2026; Builder report on issue #1363):
//   D1 the My account card closed onto a button hidden in the shut Home menu, so focus fell to <body>;
//   D2 Escape did not close bookmarks.html's New bookmark form;
//   D3 the aria-modal account card let Tab walk out to the 9-27 controls behind it.
//   node tools/i18n-verify/audit142-focus-browser.mjs [--mutate=NAME]   (serve.js on :8080, repo root; QR_BASE for another port)
//   no-d1  the card returns focus to the hidden button        -> "focus returns to a control on screen" FAILS
//   no-d2  the Escape handler on the form removed             -> "Escape closes the New bookmark form" FAILS
//   no-d3  the Tab hold removed                                -> "Tab stays inside the card" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-d1": ["/app/js/account-card.js", 'open(home ? home.querySelector("summary") || btn : btn);', "open(btn);"],
  "no-d2": ["/app/bookmarks.html", "if (!newBookmarkForm.contains(document.activeElement) && document.activeElement !== newBookmarkBtn) return;", "return;"],
  "no-d3": ["/app/js/account-card.js", 'if (e.key !== "Tab" || !overlay.classList.contains("open")) return;', "return;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

async function mutated(ctx) {
  if (!MUTATE) return;
  const [path, from, to] = MUT[MUTATE];
  await ctx.route(`**${path}*`, async (r) => {
    const res = await r.fetch(); let body = await res.text();
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation ${MUTATE}: anchor found ${n} times`);
    body = body.replace(from, to);
    console.log(`  (mutation ${MUTATE}: 1 copy changed in ${path})`);
    await r.fulfill({ response: res, body });
  });
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[360, 740], [1280, 800]]) {
    const tag = `${lang} ${w}`;
    // ---- D1 + D3: records.html, Home ▸ 👤 My account ----
    {
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
      await mutated(ctx);
      const { page } = await openPage(ctx, "/app/records.html");
      await page.waitForFunction(() => document.querySelector("[data-open-account-card]"), null, { timeout: 15000 });
      const opened = await page.evaluate(() => {
        const btn = document.querySelector("[data-open-account-card]");
        const d = btn.closest("details"); if (d) d.open = true;
        return !!d;
      });
      check(`${tag}: positive control, the account button sits inside the Home menu`, opened);
      await page.click("[data-open-account-card]");
      await page.waitForFunction(() => document.getElementById("accountCardOverlay")?.classList.contains("open"));
      check(`${tag}: the card opens with focus on its ✕`, await page.evaluate(() => document.activeElement?.id === "accountCardClose"));
      // D3: walk Tab 30 times and Shift+Tab 30 times; focus must never leave the sheet.
      const outside = [];
      for (const key of ["Tab", "Shift+Tab"]) {
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press(key);
          const inside = await page.evaluate(() => !!document.activeElement?.closest(".account-sheet"));
          if (!inside) { outside.push(`${key}#${i + 1}: ${await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)}`); break; }
        }
      }
      check(`${tag}: Tab stays inside the card (aria-modal)`, outside.length === 0, JSON.stringify(outside));
      await page.keyboard.press("Escape");
      const after = await page.evaluate(() => {
        const a = document.activeElement, r = a?.getBoundingClientRect();
        return { tag: a?.tagName, onScreen: !!r && r.width > 0 && r.height > 0 && a !== document.body, open: document.getElementById("accountCardOverlay").classList.contains("open") };
      });
      check(`${tag}: Escape closes the card`, !after.open);
      check(`${tag}: focus returns to a control on screen (the Home menu), not <body>`, after.onScreen, JSON.stringify(after));
      await ctx.close();
    }
    // ---- D2: bookmarks.html, + New bookmark, Escape ----
    {
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
      await mutated(ctx);
      const { page } = await openPage(ctx, "/app/bookmarks.html");
      await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
      await page.click("#newBookmarkBtn");
      await page.waitForFunction(() => getComputedStyle(document.getElementById("newBookmarkForm")).display !== "none");
      await page.focus("#nbName");
      check(`${tag}: positive control, the New bookmark form is open with focus in it`, await page.evaluate(() => document.activeElement?.id === "nbName"));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      const st = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById("newBookmarkForm")).display !== "none", focus: document.activeElement?.id }));
      check(`${tag}: Escape closes the New bookmark form`, !st.shown, JSON.stringify(st));
      check(`${tag}: focus goes back to + New bookmark`, st.focus === "newBookmarkBtn", JSON.stringify(st));
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`audit142-focus-browser: ${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
