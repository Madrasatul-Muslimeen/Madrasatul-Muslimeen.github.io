// Decision 95, R3b (#730): the routes that used to open the Note view -- Asma Explore's āyah reference, a QCR collection's
// āyah, the Note view's side-list jump, ?goto=S:A and ?qpView=note -- open the Read view with the Notes pane on the right
// unit, with #noteView hidden, and each leaves its way back (decision 86). Run from the repository root, serve.js on :8080,
// at 390px Bangla and 1280px English.
//   --mutate=asmanote  Asma's reference opens the Note view again    -> the pane / Note-view-hidden checks fail
//   --mutate=qcrnote   a QCR āyah opens the Note view again          -> the same
//   --mutate=gotonote  ?goto= opens the Note view again              -> the same
//   --mutate=noback    no route sets a way back                      -> the way-back checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  asmanote: ["quranrevival.html", 'await openNotesPaneForKey(buildUnitKey.ayah(surah, ayah), { backLabel: t("Back to {name}", { name: entry ? asmaEntryDisplayName(entry) : t("Asma ul Husna") }) }, () => {', 'await openNoteView(buildUnitKey.ayah(surah, ayah)); void ((a, b, c) => c)(0, 0, () => {'],
  qcrnote: ["quranrevival.html", "await openNotesPaneForKey(unitKey, { backLabel: t(\"Back to {name}\", { name: t(\"QCR\") }) }, backToQcrCollection(qcrCurrentId));", "await openNoteView(unitKey, { fromCollectionId: qcrCurrentId });"],
  gotonote: ["quranrevival.html", "await openNotesPaneForKey(buildUnitKey.ayah(parsed.surah, from));", "await openNoteView(buildUnitKey.ayah(parsed.surah, from));"],
  noback: ["quranrevival.html", '{ backLabel: t("Back to {name}", { name: t("QCR") }) }, backToQcrCollection(qcrCurrentId));', '{}, () => { paintReadNotesBtn(); });'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["bn", 390, 844], ["en", 1280, 800]]) {
  const bn = lang === "bn";
  const open = async (path = "/app/quranrevival.html") => {
    const ctx = await newContext(browser, { appLang: bn ? "bn" : null, banner: false, viewport: { width, height } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page, errors } = await openPage(ctx, path);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
    return { ctx, page, errors };
  };
  const state = (page) => page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; };
    const pane = document.getElementById("readNotePane");
    const back = pane?.querySelector("[data-rnp-back]");
    return { read: vis("readView"), note: vis("noteView"), pane: !!pane && pane.hidden === false, back: back?.textContent.trim() ?? null,
      surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value };
  });
  const waitPane = (page) => page.waitForFunction(() => document.getElementById("readNotePane")?.hidden === false, null, { timeout: 15000 }).catch(() => {});
  const ignorable = (e) => /ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e);
  const tag0 = `[${lang} ${width}]`;

  // ---- 1. Asma Explore: a Name's āyah reference ----
  {
    const tag = `${tag0} Asma`;
    const { ctx, page: P, errors } = await open();
    await P.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await P.waitForTimeout(900);
    await P.evaluate(() => document.getElementById("explorePaletteAsmaBtn")?.click()); await P.waitForTimeout(1200);
    await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 10000 }).catch(() => {});
    await P.selectOption("#asmaXSingleSelect", "52").catch(() => {});
    await P.waitForFunction(() => document.querySelector("[data-asma-xref-jump]"), null, { timeout: 10000 }).catch(() => {});
    const key = await P.evaluate(() => document.querySelector("[data-asma-xref-jump]")?.dataset.asmaXrefJump ?? null);
    check(`${tag} POSITIVE CONTROL: Name 52 shows an āyah reference to tap`, !!key, String(key));
    const nm52 = await P.evaluate(() => document.querySelector("#asmaXListHeader .qcr-list-title")?.textContent?.trim() ?? "");
    await P.evaluate(() => document.querySelector("[data-asma-xref-jump]")?.click());
    await waitPane(P);
    const s = await state(P);
    const [su, ay] = (key ?? "0:0").split(":");
    check(`${tag} the reference opens the Read view on ${key} with the pane, Note view hidden`, s.read && !s.note && s.pane && s.surah === su && s.ayah === ay, JSON.stringify(s));
    // UPDATED in place by the Architect's review (#731): the back names the Name itself, as it did before R3b
    // ("← Back to <Name 52>"), not only "Asma ul Husna". The Name's own heading on the refs level is the expected text.
    check(`${tag} the pane's way back names the Name (${nm52})`, !!s.back && !!nm52 && s.back.includes(nm52), JSON.stringify({ back: s.back, nm52 }));
    await P.evaluate(() => document.querySelector("#readNotePane [data-rnp-back]")?.click());
    await P.waitForFunction(() => document.getElementById("asmaXSingleSelect")?.getClientRects().length, null, { timeout: 12000 }).catch(() => {});
    const b = await P.evaluate(() => ({ pane: document.getElementById("readNotePane")?.hidden === false, name: document.getElementById("asmaXSingleSelect")?.value, shown: !!document.getElementById("asmaXSingleSelect")?.getClientRects().length }));
    check(`${tag} ← Back returns to Explore on Name 52, the pane closed`, !b.pane && b.shown && b.name === "52", JSON.stringify(b));
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- 2. QCR: a collection's āyah ----
  {
    const tag = `${tag0} QCR`;
    const { ctx, page: P, errors } = await open();
    await P.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await P.waitForTimeout(900);
    await P.evaluate(() => document.getElementById("explorePaletteQcrBtn")?.click());
    await P.waitForFunction(() => document.querySelector("[data-qcr-jump]"), null, { timeout: 12000 }).catch(() => {});
    const info = await P.evaluate(() => ({ key: document.querySelector("[data-qcr-jump]")?.dataset.qcrJump ?? null, col: document.getElementById("qcrLevelSelect")?.value ?? null }));
    check(`${tag} POSITIVE CONTROL: the collection shows an āyah to tap`, !!info.key, JSON.stringify(info));
    await P.evaluate(() => document.querySelector("[data-qcr-jump]")?.click());
    await waitPane(P);
    const s = await state(P);
    const want = (info.key ?? "x:0:0").split(":");
    check(`${tag} the āyah opens the Read view on ${info.key} with the pane, Note view hidden`, s.read && !s.note && s.pane && s.surah === want[1], JSON.stringify(s));
    check(`${tag} the pane's way back names QCR`, !!s.back && s.back.includes("QCR"), JSON.stringify(s.back));
    await P.evaluate(() => document.querySelector("#readNotePane [data-rnp-back]")?.click());
    await P.waitForFunction(() => document.querySelector("#qcrLevelSelect")?.getClientRects().length, null, { timeout: 12000 }).catch(() => {});
    const b = await P.evaluate(() => ({ pane: document.getElementById("readNotePane")?.hidden === false, col: document.getElementById("qcrLevelSelect")?.value, shown: !!document.getElementById("qcrLevelSelect")?.getClientRects().length }));
    check(`${tag} ← Back returns to QCR on the same collection (${info.col}), the pane closed`, !b.pane && b.shown && b.col === info.col, JSON.stringify(b));

    // ---- 3. the Note view's side list jumps to another unit: the pane, back to where the pop-up came from ----
    await P.evaluate(() => document.querySelector("[data-qcr-jump]")?.click());
    await waitPane(P);
    await P.evaluate(() => document.getElementById("tabNoteBtn")?.click());
    await P.waitForFunction(() => document.querySelector("[data-note-popup-open]"), null, { timeout: 8000 }).catch(() => {});
    const row = await P.evaluate(() => document.querySelector("[data-note-popup-open]")?.dataset.notePopupOpen ?? null);
    if (row) {
      await P.evaluate(() => document.querySelector("[data-note-popup-open]")?.click());
      await waitPane(P);
      const s3 = await state(P);
      check(`${tag} the Note view's side-list jump opens the Read view with the pane, Note view hidden`, s3.read && !s3.note && s3.pane, JSON.stringify(s3));
    } else {
      console.log(`  NOTE  ${tag} the side list had no row in this fixture; the side-list jump was not exercised`);
    }
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- 4. ?goto=S:A with back=1 ----
  {
    const tag = `${tag0} ?goto=`;
    const { ctx, page: P, errors } = await open("/app/quranrevival.html?goto=2:255&back=1");
    await waitPane(P);
    const s = await state(P);
    check(`${tag} opens the Read view on 2:255 with the pane, Note view hidden`, s.read && !s.note && s.pane && s.surah === "2" && s.ayah === "255", JSON.stringify(s));
    const pill = await P.evaluate(() => { const b = [...document.querySelectorAll("#ayahCardBackPill [data-ayah-card-back]")].find((x) => x.getClientRects().length); return b?.textContent.trim() ?? null; });
    check(`${tag} with back=1 the "← Back" pill is kept`, !!pill, String(pill));
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- 5. ?qpView=note&qpUnit= ----
  {
    const tag = `${tag0} qpView=note`;
    const { ctx, page: P, errors } = await open("/app/quranrevival.html?qpSurah=2&qpAyah=255&qpView=note&qpUnit=ayah%3A2%3A255");
    await waitPane(P);
    const s = await state(P);
    check(`${tag} reopens the Read view on 2:255 with the pane, Note view hidden`, s.read && !s.note && s.pane && s.surah === "2" && s.ayah === "255", JSON.stringify(s));
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Read-view pane routes (decision 95, R3b): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
