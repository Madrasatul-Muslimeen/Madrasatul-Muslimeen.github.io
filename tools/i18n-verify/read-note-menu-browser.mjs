// Decision 95, R3c (#734): the Study menu's Note ("Notes") opens the Read view with the Notes pane on the current unit,
// no click path reaches the (dormant) Note view, and the Approach card's tab names are Bangla. Run from the repository
// root, serve.js on :8080, at 390px Bangla and 1280px English.
//   --mutate=oldnote   the tab opens the Note view again      -> the pane / Note-view-hidden checks fail
//   --mutate=nobn      the Bangla tab-name keys are removed   -> the tab-name checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  oldnote: ["quranrevival.html", "await openNotesPaneForKey(currentUnitInfo().unitKey);\n    }\n    // TEST SEAM", "await openNoteView(ayahRecordKey(currentSurahNum, currentAyahNum, currentHalf()));\n    }\n    // TEST SEAM"],
  nobn: ["js/i18n/bn.js", '  "Breakdown": "বিশ্লেষণ",', '  "BreakdownX": "বিশ্লেষণ",'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const ignorable = (e) => /ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["bn", 390, 844], ["en", 1280, 800]]) {
  const bn = lang === "bn";
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: bn ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html" : "text/javascript", body: src.replace(a, b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  const state = () => P.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; };
    return { read: vis("readView"), note: vis("noteView"), pane: document.getElementById("readNotePane")?.hidden === false,
      label: document.getElementById("tabNoteBtn")?.textContent.trim(), noteGone: document.getElementById("noteView") === null && typeof window.__dormantOpenNoteView === "undefined" };
  });
  const openMenu = async () => {
    const shown = await P.evaluate(() => (document.getElementById("tabNoteBtn")?.getBoundingClientRect().width ?? 0) > 0);
    if (!shown) { await P.evaluate(() => document.getElementById("tabStudyBtn")?.click()); await P.waitForTimeout(200); }
  };
  const waitPane = (want) => P.waitForFunction((w) => (document.getElementById("readNotePane")?.hidden === false) === w, want, { timeout: 12000 }).catch(() => {});

  await P.waitForTimeout(1500);
  await openMenu();
  const s0 = await state();
  check(`${tag} POSITIVE CONTROL: the menu's tab is there and #noteView and __dormantOpenNoteView are absent`, !!s0.label && s0.noteGone === true, JSON.stringify(s0));
  check(`${tag} the tab is labelled "${bn ? "নোট" : "Notes"}"`, s0.label === (bn ? "নোট" : "Notes"), JSON.stringify(s0.label));

  await P.evaluate(() => document.getElementById("tabNoteBtn").click()); await waitPane(true);
  const s1 = await state();
  check(`${tag} the tab opens the Read view with the pane, Note view hidden`, s1.read && s1.pane && !s1.note, JSON.stringify(s1));

  // Approach card: the pane's Track tab, tab names
  await P.evaluate(() => document.querySelector('#readNotePane [data-rnp-tab="track"]')?.click());
  await P.waitForFunction(() => document.querySelector("#readNotePane .way-tab-btn"), null, { timeout: 12000 }).catch(() => {});
  const names = await P.evaluate(() => [...document.querySelectorAll("#readNotePane .way-tab-btn")].map((b) => b.textContent.trim()));
  check(`${tag} POSITIVE CONTROL: the Approach card shows its tabs in the pane's Track tab`, names.length >= 3, JSON.stringify(names));
  const want = bn ? ["চিহ্নিত করুন", "নির্দেশিকা", "বিশ্লেষণ", "কভারেজ"] : ["Track", "Guide", "Breakdown", "Coverage"];
  check(`${tag} the Approach card's tab names are ${bn ? "Bangla" : "English"}`, want.every((w, i) => names[i] === w), JSON.stringify(names));
  const keys = await P.evaluate(() => [...document.querySelectorAll("#readNotePane .way-tab-btn")].map((b) => b.dataset.tab));
  check(`${tag} the tab keys (data-tab) stay English`, keys.slice(0, 3).join() === "Track,Guide,Breakdown", JSON.stringify(keys));

  await openMenu();
  await P.evaluate(() => document.getElementById("tabNoteBtn").click()); await waitPane(false);
  const s2 = await state();
  check(`${tag} pressed again, the tab closes the pane`, !s2.pane && s2.read && !s2.note, JSON.stringify(s2));

  // No click path reaches the Note view: press every Study-menu tab, Read-bar button and Āyah-card button.
  const reached = [];
  const probe = async (what) => { const s = await state(); if (s.note) reached.push(what); };
  const menuIds = await P.evaluate(() => [...document.querySelectorAll("#studyPillarMenu button")].map((b) => b.id).filter(Boolean));
  check(`${tag} POSITIVE CONTROL: the Study menu offers tabs to press`, menuIds.length >= 3, JSON.stringify(menuIds));
  for (const id of menuIds) {
    await openMenu();
    await P.evaluate((i) => document.getElementById(i)?.click(), id);
    await P.waitForTimeout(500); await probe(`#${id}`);
    await P.evaluate(() => document.getElementById("tabReadBtn")?.click()); await P.waitForTimeout(200);
  }
  await P.evaluate(() => document.getElementById("tabReadBtn")?.click()); await P.waitForTimeout(600);
  const skip = /play|audio|record|mic|share|download|speak|tts/i;
  const barIds = await P.evaluate((src) => [...document.querySelectorAll("#readView button")].filter((b) => b.id && !new RegExp(src, "i").test(b.id)).map((b) => b.id).slice(0, 40), skip.source);
  check(`${tag} POSITIVE CONTROL: the Read bar offers buttons to press`, barIds.length >= 3, JSON.stringify(barIds));
  for (const id of barIds) {
    await P.evaluate((i) => document.getElementById(i)?.click(), id);
    await P.waitForTimeout(250); await probe(`#${id}`);
    await P.evaluate(() => document.getElementById("tabReadBtn")?.click()); await P.waitForTimeout(150);
  }
  // the Āyah card's buttons
  const cardSel = "[data-ayah-sheet] button";
  const openCard = async () => { await P.evaluate(() => document.getElementById("tabReadBtn")?.click()); await P.waitForTimeout(500); await P.evaluate(() => document.querySelector("[data-ayah-num-badge]")?.click()); await P.waitForTimeout(600); };
  await openCard();
  const nCard = await P.evaluate((sel) => document.querySelectorAll(sel).length, cardSel);
  check(`${tag} POSITIVE CONTROL: the Āyah card offers buttons to press`, nCard >= 3, String(nCard));
  for (let i = 0; i < Math.min(nCard, 12); i++) {
    await P.evaluate(([sel, k]) => { const bs = [...document.querySelectorAll(sel)]; if (bs[k] && !/play|audio/i.test(bs[k].textContent)) bs[k].click(); }, [cardSel, i]);
    await P.waitForTimeout(300); await probe(`ayah-card button ${i}`);
    await openCard();
  }
  check(`${tag} #noteView stayed absent after every Study-menu tab, Read-bar button and Āyah-card button (${menuIds.length}+${barIds.length}+${nCard} pressed)`, reached.length === 0, JSON.stringify(reached));
  check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Study menu Notes tab, Note view unreachable, Bangla tab names (decision 95, R3c): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
