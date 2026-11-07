// 7 Nov 2026 (the Owner, annotated screenshots, round r13a): five things on the Dua Study page.
//   1. Stepping ‹ › from a POPPED-UP Dua Card shows the next dua IN the pop-up (not behind it, on the page).
//   2. The Menu button is the three-line icon only; the menu's chips are small, 5 a row on a computer, 4 on a phone.
//   3. 📖 Full text holds the WHOLE narration (chain and all, the dua's words marked); "The whole narration" is no longer a
//      separate Menu button, and the card carries no narration fold of its own.
//   4. The "For <name>" chip is gone from the page (the name lives under My account).
//   5. Back from the Word card reopens the very word's card (the address carries dword=<dua>:<position>, used once).
// Run from the repository root, serve.js on :8080.
//   --mutate=nocarry   the pop-up state is not carried to the next dua  -> check 1 fails
//   --mutate=bigchip   chips back to 2 a row                            -> check 2 fails
//   --mutate=nonarr    Full text without the narration                   -> check 3 fails
//   --mutate=noword    the word is not reopened                          -> check 5 fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nocarry: ["js/dua-study.js", "carryPop = !!document.querySelector(\"[data-dua-window], .dua-card-popped\"); where.open = i + 1;", "carryPop = false; where.open = i + 1;"],
  bigchip: ["css/dua-study.css", "grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.3rem; padding: 0.3rem; }", "grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.3rem; padding: 0.3rem; }"],
  nonarr: ["js/dua-poster.js", "if (sheet.narration?.text) {", "if (false) {"],
  noword: ["js/dua-browser.js", "if (want != null) setTimeout(", "if (false) setTimeout("],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(width) {
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css" : "text/javascript", body: src.replace(a, b) }); });
  }
  return ctx;
}
const pos = (P) => P.evaluate(() => document.querySelector("[data-dua-card-pos]")?.textContent?.trim());

for (const width of [1280, 390]) {
  const tag = `[${width}]`;
  const ctx = await context(width);
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  await P.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
  check(`${tag} the page has no "For <name>" chip`, (await P.locator("#forPersonChip").count()) === 0);
  const menuText = await P.evaluate(() => document.querySelector("[data-dua-menu-toggle]")?.textContent?.trim());
  check(`${tag} the Menu button is the three-line icon only`, menuText === "☰", JSON.stringify(menuText));
  // one bar: Play, ‹ n of N ›, Menu, pop-up all on one row
  const oneRow = await P.evaluate(() => { const b = document.querySelector("[data-dua-topbar]"); const mids = [...b.querySelectorAll("button, .dua-card-pos")].map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }); return { n: mids.length, spread: Math.max(...mids) - Math.min(...mids) }; });
  check(`${tag} Play, ‹ n of N ›, Menu and the pop-up share ONE bar`, oneRow.n >= 6 && oneRow.spread < 12, JSON.stringify(oneRow));
  await P.click("[data-dua-menu-toggle]");
  const chips = await P.evaluate(() => {
    const out = {};
    for (const g of document.querySelectorAll(".dua-menu-panel .dua-menu-group")) {
      const bs = [...g.querySelectorAll("button")]; if (bs.length < 2) continue;
      const rows = new Map(); for (const b of bs) { const k = Math.round(b.getBoundingClientRect().top); rows.set(k, (rows.get(k) || 0) + 1); }
      out[g.dataset.duaMenuGroup] = { max: Math.max(...rows.values()), h: Math.round(bs[0].getBoundingClientRect().height), n: bs.length };
    }
    return out;
  });
  const want = width >= 521 ? 5 : 4;
  check(`${tag} the Listen chips (4) sit in one row`, chips.listen?.max === 4, JSON.stringify(chips));
  check(`${tag} the Study chips (${chips.study?.n}) fill up to ${want} to a row`, chips.study?.max === Math.min(want, chips.study?.n), JSON.stringify(chips));
  check(`${tag} chips are small (under 44px, not the old 48px)`, chips.study?.h < 44, JSON.stringify(chips));
  check(`${tag} there is no "The whole narration" Menu button`, (await P.locator('[data-dua-menu="narration"]').count()) === 0);
  check(`${tag} the card carries no narration fold of its own`, (await P.locator("details.dua-narration").count()) === 0);
  await P.click('[data-dua-menu="fulltext"]');
  await P.waitForSelector("[data-dua-fulltext]");
  const ft = await P.evaluate(() => { const n = document.querySelector('[data-dua-ft-sec="narration"]'); return { has: !!n, open: n?.open, mark: n?.querySelector("mark")?.textContent?.length || 0, len: n?.querySelector("p")?.textContent?.length || 0, dua: document.querySelector(".dua-ft-ar")?.textContent?.length || 0 }; });
  check(`${tag} Full text holds the whole narration, open, with the dua's words marked`, ft.has && ft.open && ft.mark > 0, JSON.stringify(ft));
  check(`${tag} the narration is longer than the dua alone (it has the chain)`, ft.len > ft.dua, JSON.stringify(ft));
  await P.click(".dua-pop-close");
  if (width >= 900) {
    // 1. the pop-up carries to the next dua
    await P.click("[data-dua-menu-toggle]").catch(() => {});
    await P.click("[data-dua-popout]");
    await P.waitForSelector("[data-dua-window]");
    const before = await pos(P);
    await P.click("[data-dua-window] [data-dua-card-next]");
    await P.waitForFunction((b) => document.querySelector("[data-dua-card-pos]")?.textContent?.trim() !== b, before, { timeout: 15000 }).catch(() => {});
    await P.waitForSelector("[data-dua-window] [data-dua-card-pos]", { timeout: 8000 }).catch(() => {});
    const after = await P.evaluate(() => ({ wins: document.querySelectorAll("[data-dua-window]").length, inWin: !!document.querySelector("[data-dua-window] [data-dua-card-pos]"), pos: document.querySelector("[data-dua-card-pos]")?.textContent?.trim(), onPage: !!document.querySelector("#duaRoot [data-dua-card-pos]") }));
    check(`${tag} POSITIVE CONTROL: the card moved on (${before} -> ${after.pos})`, after.pos && after.pos !== before, JSON.stringify(after));
    check(`${tag} the next dua is IN the pop-up, one window, none behind on the page`, after.wins === 1 && after.inWin && !after.onPage, JSON.stringify(after));
    await P.click("[data-dua-window] [data-dua-win-close]").catch(() => {});
  }
  await ctx.close();
}

// 5. the way back reopens the word's card
{
  const ctx = await context(1280);
  const probe = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  const Q = probe.page;
  await Q.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
  const n = await Q.evaluate(() => document.querySelector("[data-dua-card]")?.dataset.duaCard);
  await Q.goto(`${new URL(Q.url()).origin}/app/dua-study.html?g=rasul&open=8&dword=${n}:2`);
  await Q.waitForSelector(`[data-dua-word-panel="${n}"]:not([hidden])`, { timeout: 15000 }).catch(() => {});
  const back = await Q.evaluate((dua) => ({ open: !!document.querySelector(`[data-dua-word-panel="${dua}"]:not([hidden])`), pressed: document.querySelector('[data-dua-word="2"]')?.getAttribute("aria-pressed"), url: location.search }), n);
  check("back from the Word card reopens word 2's card", back.open && back.pressed === "true", JSON.stringify(back));
  check("the address is cleaned at once (dword is used once)", !/dword=/.test(back.url), back.url);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
