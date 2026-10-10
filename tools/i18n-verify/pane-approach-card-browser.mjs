// Decision 95, R3a (#725): the Approach card (Track / Guide / Breakdown / Coverage, the Approach picker, Claim with 👥)
// lives in the Notes pane's ✅ Track this āyah tab, for the pane's unit. The landing wheel's slice, the ring panel's Take
// and Explore's 🧭 Guide open the Read view with the pane on that tab, and no longer open the Note view. Each leaves a
// way back (decision 86). Run from the repository root, serve.js on :8080, at 390px Bangla and 1280px English.
// Expected values are written by hand from the fixture: the first Approach slice is "memorise"; its Guide is the
// fixture's guide ("What it is" / "How to do it" / "How to measure"); the people are p1 Ahsan and p2 Maryam.
//   --mutate=routenote  the wheel slice opens the Note view again          -> the pane / Note-view-hidden checks fail
//   --mutate=noroot     the card is wired only under #noteView             -> Claim in the pane writes nothing
//   --mutate=noback     the route sets no way back                         -> the way-back checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  routenote: ["quranrevival.html", 'openApproachCardInPane(key, t("Back to the Approach wheel"), openApproachWheel);', "noteApproachCardOpen = true; openNoteView(unitInfo.unitKey);"],
  noroot: ["quranrevival.html", 'const embedEl = root === noteView ? root.querySelector(\'[data-note-field="approach"] .way-embed\') : root.querySelector(".way-embed");', "const embedEl = noteView.querySelector('[data-note-field=\"approach\"] .way-embed');"],
  // The pane on a unit other than the Read view's (a Unit card's 📝 Note on a Juz) took its card for an āyah and read
  // its status from a Surah's chunk. Architect's review of #728: the type comes from the key, chunked by D12.
  ayahonly: ["quranrevival.html", 'const { unitType, parts } = parseUnitKey(u.unitKey);\n      const bySurah = ["ayah", "range", "surah", "ruku"].includes(unitType);', 'const unitType = "ayah", parts = [String(parseAyahUnitKey(u.unitKey).surah)];\n      const bySurah = true;'],
  noback: ["quranrevival.html", '{ tab: "track", backLabel }, () => { paintReadNotesBtn(); back(); });', '{ tab: "track" }, () => { paintReadNotesBtn(); });'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_1", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_1", entries: {} },
  { _id: TENANT_ID + "__p2__surah_1", tenantId: TENANT_ID, personId: "p2", chunkKey: "surah_1", entries: {} }
);`;
const L = {
  en: { backWheel: "← Back to the Approach wheel", backExplore: "← Back to Explore", guide: ["What it is", "How to do it", "How to measure"] },
  bn: { backWheel: "← পদ্ধতির চাকায় ফিরে যান", backExplore: "← অন্বেষণে ফিরে যান", guide: ["এটি কী", "কীভাবে করবেন", "কীভাবে মাপবেন"] },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["bn", 390, 844], ["en", 1280, 800]]) {
  const W = L[lang];
  const open = async () => {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
    return { ctx, page, errors };
  };
  const onTrack = (page) => page.waitForFunction(() => document.querySelector(".rnp-track:not([hidden]) [data-note-approach-select]"), null, { timeout: 8000 }).then(() => true, () => false);
  const ev = (page, f, a) => page.evaluate(f, a);

  // ---- from the landing wheel's slice ----
  {
    const tag = `[${lang} ${width} wheel]`;
    const { ctx, page, errors } = await open();
    await page.waitForFunction(() => document.querySelector('#wheelContainer .wheel-seg[data-key="memorise"]'));
    await page.$eval('#wheelContainer .wheel-seg[data-key="memorise"]', (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const got = await onTrack(page);
    await page.waitForTimeout(300);
    const m = await ev(page, () => ({ noteHidden: document.getElementById("noteView").hidden, read: !document.getElementById("readView")?.hidden, chosen: document.querySelector(".rnp-track [data-note-approach-select]")?.value, card: !!document.querySelector(".rnp-track .way-embed"), tabSel: document.querySelector('[data-rnp-tab="track"]')?.getAttribute("aria-selected"), buttons: document.querySelectorAll(".rnp-track [data-rnp-track]").length }));
    check(`${tag} the Notes pane opens on its Track tab with the card`, got && m.card && m.tabSel === "true", JSON.stringify(m));
    check(`${tag} #noteView stays hidden, the Read view is the screen`, m.noteHidden === true && m.read === true, JSON.stringify(m));
    check(`${tag} the tapped Approach (memorise) is chosen; the three buttons are kept`, m.chosen === "memorise" && m.buttons === 3, JSON.stringify(m));
    // Guide tab
    await page.click('.rnp-track .way-tab-btn[data-tab="Guide"]'); await page.waitForTimeout(150);
    const guide = await ev(page, () => document.querySelector('.rnp-track .way-tab-panel[data-tab="Guide"]')?.textContent ?? "");
    check(`${tag} the Guide tab shows the Approach's guide text`, W.guide.every((s) => guide.includes(s)), guide.slice(0, 200));
    await page.click('.rnp-track .way-tab-btn[data-tab="Track"]');
    // Claim Learning for p1 and p2
    await page.selectOption(".rnp-track .way-status-select", "learning");
    await page.click(".rnp-track [data-assign-trigger]"); await page.waitForTimeout(150);
    await page.click('.rnp-track [data-assign-list] input[value="p2"]');
    await page.click(".rnp-track [data-assign-trigger]"); await page.waitForTimeout(100);
    const n0 = await ev(page, () => (window.__stubWriteData || []).length);
    await page.click(".rnp-track .way-claim-btn"); await page.waitForTimeout(1200);
    const w = await ev(page, (k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => [x.id, Object.entries(x.data || {}).filter(([key]) => /::memorise/.test(key)).map(([, v]) => v?.claimedStatus ?? null)]), n0);
    check(`${tag} Claim "Learning" with 👥 p1+p2 writes records for both`, w.some(([id, s]) => id === "t1__p1__surah_1" && s.includes("learning")) && w.some(([id, s]) => id === "t1__p2__surah_1" && s.includes("learning")), JSON.stringify(w));
    check(`${tag} the card is redrawn in the pane afterwards, Note view still hidden`, await ev(page, () => !!document.querySelector(".rnp-track .way-embed") && document.getElementById("noteView").hidden), "");
    // way back
    const back = await ev(page, () => document.querySelector("[data-rnp-back]")?.textContent ?? "");
    check(`${tag} the pane's back says "${W.backWheel}"`, back === W.backWheel, back);
    await page.click("[data-rnp-back]"); await page.waitForTimeout(500);
    const after = await ev(page, () => ({ pane: !document.getElementById("readNotePane")?.hidden, wheel: (document.getElementById("wheelContainer")?.getBoundingClientRect().width ?? 0) > 0 }));
    check(`${tag} the way back returns to the landing wheel`, !after.pane && after.wheel, JSON.stringify(after));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- from Explore's 🧭 Guide ----
  {
    const tag = `[${lang} ${width} explore]`;
    const { ctx, page } = await open();
    await page.click("#tabExploreBtn");
    await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
    await page.evaluate(() => {
      const seg = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((s) => s.dataset.key === "1" && (!s.dataset.ringKind || s.dataset.ringKind === "surah"))[0];
      seg?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForSelector('[data-aa-row="memorise"] .aa-take', { timeout: 15000 });
    await page.click('[data-aa-row="memorise"] .aa-take');
    await page.waitForSelector('.aa-sheet [data-aa-act="guide"]', { timeout: 8000 });
    await page.click('.aa-sheet [data-aa-act="guide"]');
    const got = await onTrack(page);
    await page.waitForTimeout(300);
    const m = await ev(page, () => ({ noteHidden: document.getElementById("noteView").hidden, chosen: document.querySelector(".rnp-track [data-note-approach-select]")?.value, back: document.querySelector("[data-rnp-back]")?.textContent }));
    check(`${tag} Guide opens the pane's Track tab on memorise; Note view hidden`, got && m.chosen === "memorise" && m.noteHidden === true, JSON.stringify(m));
    await page.click('.rnp-track .way-tab-btn[data-tab="Guide"]'); await page.waitForTimeout(150);
    const guide = await ev(page, () => document.querySelector('.rnp-track .way-tab-panel[data-tab="Guide"]')?.textContent ?? "");
    check(`${tag} the Guide tab shows the guide text`, W.guide.every((s) => guide.includes(s)), guide.slice(0, 200));
    check(`${tag} the pane's back says "${W.backExplore}"`, m.back === W.backExplore, JSON.stringify(m));
    await page.click("[data-rnp-back]"); await page.waitForTimeout(700);
    const after = await ev(page, () => ({ pane: !document.getElementById("readNotePane")?.hidden, explore: (document.getElementById("exploreWheelContainer")?.getBoundingClientRect().width ?? 0) > 0 }));
    check(`${tag} the way back returns to Explore`, !after.pane && after.explore, JSON.stringify(after));
    await ctx.close();
  }
}
// ---- a Unit card's 📝 Note on a Juz, while the Read view is on an āyah: the card claims for the Juz, in subject_quran ----
{
  const tag = "[en 1280 juz]";
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 1280, height: 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(600);
  const unitType = (v) => ev((x) => { const s = document.getElementById("unitTypeSelect"); s.value = x; s.dispatchEvent(new Event("change", { bubbles: true })); }, v);
  await unitType("juz"); await page.waitForTimeout(800);
  await ev(() => document.getElementById("readUnitChip")?.click());
  await page.waitForFunction(() => document.querySelector("[data-unit-card-note]"), null, { timeout: 8000 }).catch(() => {});
  await unitType("ayah"); await page.waitForTimeout(800); // the Read view moves to an āyah; the card stays on Juz 1
  await ev(() => document.querySelector("[data-unit-card-note]")?.click());
  await page.waitForFunction(() => !document.getElementById("readNotePane")?.hidden, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await ev(() => document.querySelector('[data-rnp-tab="track"]')?.click());
  await page.waitForTimeout(600);
  const src = await ev(() => decodeURIComponent(document.querySelector("#readNotePane iframe")?.getAttribute("src") ?? ""));
  check(`${tag} the pane is on Juz 1 while the Read view is on an āyah`, /unit=juz:1&/.test(src), src.slice(0, 80));
  // The stub keeps its data still unless asked: apply writes, so the refreshed chunk carries the claim (harness lesson).
  await ev(() => { window.__stubApplyBatches = true; window.__stubRecordTxData = true; });
  const n0 = await ev(() => (window.__stubWriteData || []).length);
  await page.selectOption(".rnp-track .way-status-select", "learning").catch(() => {});
  await ev(() => document.querySelector(".rnp-track .way-claim-btn")?.click());
  await page.waitForTimeout(1500);
  const w = await ev((k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => x.id), n0);
  check(`${tag} Claim writes to the Juz's own chunk (subject_quran, D12)`, w.length > 0 && w.every((id) => /__subject_quran$/.test(id)), JSON.stringify(w));
  // The write path picks its chunk from the key (records.js); the CARD reads and refreshes the chunk it is handed, so a
  // card handed a Surah's chunk shows "Not claimed yet" after a Juz claim. This is the check the review's fix is for.
  const state = await ev(() => document.querySelector(".rnp-track .way-embed .way-track-state")?.textContent.trim() ?? "");
  check(`${tag} the card then shows the claim it just made, not "Not claimed yet"`, !!state && !/Not claimed yet/.test(state), state);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
