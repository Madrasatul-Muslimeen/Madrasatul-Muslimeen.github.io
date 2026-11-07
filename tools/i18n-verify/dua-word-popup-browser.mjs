// 7 Nov 2026 (the Owner, annotated screenshot): "Open this (the entire section) popup on clicking on word." A tapped dua
// word's whole card opens as a pop-up over the page (js/dua-word-popup.js), closed by ×, Escape or a tap outside it, and the
// focus returns to the word. Also the Owner's third screenshot: the Dua card body and the pop-up use the card plate
// (gradient) of the Full text pop-up in the night look.
// Run from the repository root, serve.js on :8080.
//   --mutate=nopop      the panel is never moved into a pop-up   -> the pop-up checks fail
//   --mutate=noback     the closed panel is not put back          -> the restore check fails
//   --mutate=noout      a tap outside does not close              -> the outside-tap check fails
//   --mutate=notrap     Tab is not kept inside                    -> the Tab check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nopop: ["js/dua-word-popup.js", "    pop.appendChild(panel);\n    document.body.appendChild(pop);\n", "    return;\n"],
  noback: ["js/dua-word-popup.js", "    if (home?.parent?.isConnected) home.parent.insertBefore(", "    if (false) home.parent.insertBefore("],
  noout: ["js/dua-word-popup.js", 'if (e.target === pop) dismiss();', ""],
  notrap: ["js/dua-word-popup.js", 'if (e.key !== "Tab" || !pop) return;', "return;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); });
  }
  return ctx;
}
const W = '[data-dua-card="1"] [data-dua-word="1"]';
const state = (P) => P.evaluate((w) => {
  const pop = document.querySelector(".dua-word-pop"), panel = document.querySelector('[data-dua-word-panel="1"]'), word = document.querySelector(w);
  const r = panel ? panel.getBoundingClientRect() : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }; // a lost panel must FAIL a check, not crash the suite
  return { pop: !!pop, popInBody: pop?.parentElement === document.body, panelInPop: !!pop && !!panel && pop.contains(panel), panelInCard: !!panel && !!document.querySelector('[data-dua-card="1"]')?.contains(panel),
    hidden: panel ? panel.hidden : null, role: panel?.getAttribute("role"), modal: panel?.getAttribute("aria-modal"), pressed: word.getAttribute("aria-pressed"), focusIsWord: document.activeElement === word,
    inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5, w: Math.round(r.width), h: Math.round(r.height),
    grad: panel ? getComputedStyle(panel).backgroundImage : "", cardGrad: getComputedStyle(document.querySelector('[data-dua-card="1"]')).backgroundImage };
}, W);
async function open(P) {
  await P.evaluate((w) => document.querySelector(w).scrollIntoView({ block: "center" }), W);
  await P.click(W);
  await P.waitForSelector('[data-dua-word-panel="1"]:not([hidden]) .dua-word-panel-close', { timeout: 6000 }).catch(() => {});
}
for (const [lang, width, look] of [["en", 390, "night"], ["bn", 390, "night"], ["en", 1280, "night"], ["en", 390, "light"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await context(lang, width, look);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector(W);
  const before = await state(P);
  check(`${tag} POSITIVE CONTROL: before the tap there is no pop-up and the panel sits in the card, hidden`, !before.pop && before.panelInCard && before.hidden, JSON.stringify(before));
  await open(P);
  let s = await state(P);
  check(`${tag} tapping a word opens its card as a pop-up on the page (not inside the card)`, s.pop && s.popInBody && s.panelInPop && !s.panelInCard && !s.hidden && s.pressed === "true", JSON.stringify(s));
  check(`${tag} the pop-up is a modal dialog and sits fully on screen`, s.role === "dialog" && s.modal === "true" && s.inView, JSON.stringify(s));
  if (look === "night") check(`${tag} the pop-up and the Dua card use the card plate gradient`, /gradient/.test(s.grad) && /gradient/.test(s.cardGrad), JSON.stringify([s.grad, s.cardGrad]));
  const focusIn = await P.evaluate(() => !!document.activeElement?.closest?.(".dua-word-pop"));
  check(`${tag} the focus moves into the pop-up`, focusIn);
  // Tab from the last control wraps to the first, inside the pop-up.
  const trap = await P.evaluate(async () => {
    const panel = document.querySelector('[data-dua-word-panel="1"]');
    const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((x) => x.getClientRects().length);
    items[items.length - 1].focus();
    return { n: items.length };
  });
  await P.keyboard.press("Tab");
  const wrapped = await P.evaluate(() => { const a = document.activeElement; return !!a?.closest?.(".dua-word-pop"); });
  check(`${tag} Tab from the last control stays inside the pop-up (${trap.n} controls)`, trap.n > 0 && wrapped);
  // × closes and gives everything back.
  await P.click(".dua-word-pop .dua-word-panel-close");
  s = await state(P);
  check(`${tag} × closes the pop-up, puts the card back in its place, and focuses the word again`, !s.pop && s.panelInCard && s.hidden && s.pressed === "false" && s.focusIsWord, JSON.stringify(s));
  await open(P);
  await P.keyboard.press("Escape");
  s = await state(P);
  check(`${tag} Escape closes it and focuses the word`, !s.pop && s.panelInCard && s.hidden && s.focusIsWord, JSON.stringify(s));
  await open(P);
  await P.mouse.click(4, 4);
  s = await state(P);
  check(`${tag} a tap outside the card closes it`, !s.pop && s.panelInCard && s.hidden, JSON.stringify(s));
  await open(P);
  s = await state(P);
  check(`${tag} it opens again afterwards (same word)`, s.pop && s.panelInPop && !s.hidden, JSON.stringify(s));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua word pop-up: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
