// The Owner's two QCR reports of 12 Oct 2026 (PCF J22), at 390 and 1280px, in English and Bangla.
//
// 1. "How Bismillah is there in Tawaqqul group in QCR?" -- a QCR collection shows ONLY the āyāt it lists. A
//    Tawakkul-shaped collection with no Al-Fātiḥah 1:1 shows no "Bismillah" anywhere (list badges, wheel slices); a
//    collection that DOES list ayah:1:1 shows it as "Bismillah" with the Al-Fātiḥah count on (decisions 55/76) and as
//    "1:1" with it off. No display path adds a Bismillah: the word appears only for a stored ayah:1:1.
// 2. "Explore.QCR.Slide brings to this screen. It should bring the Ayah, Read view." -- a QCR row AND a wheel slice
//    open that āyah in the Read view (the 📝 Notes pane NOT opened over it, no Note view), with the floating
//    "← Back to QCR" pill (decision 86) that reopens Explore on the same collection.
//
// Run from the repository root with serve.js running (QR_BASE to point elsewhere than :8080).
//   --mutate=pane     the QCR jump opens the Notes pane again (v10.11)      -> "not the Notes pane" checks fail
//   --mutate=noback   the QCR jump sets no way back                          -> the pill / back checks fail
//   --mutate=slice    the wheel slice keeps the old pane route               -> the slice checks fail
//   --mutate=noread   the QCR jump leaves the reader on Explore              -> the "opens in the Read view" checks fail
//   --mutate=bismall  every QCR row is labelled as 1:1                       -> "no Bismillah in Tawakkul" fails
//   --mutate=nobism   1:1 is never the unnumbered Bismillah                  -> the count-on positive control fails
//   --mutate=nocount  1:1 is the Bismillah even with the count off           -> the count-off check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  pane: ["await scrollFlowToCurrentAyah();\n      setAppReturn(t(\"Back to {name}\", { name: t(\"QCR\") }), col ? langText(col.title, getAppLang()) : \"\", backToQcrCollection(collectionId));",
    "await openNotesPaneForKey(unitKey, { backLabel: t(\"Back to {name}\", { name: t(\"QCR\") }) }, backToQcrCollection(collectionId));"],
  noback: ["setAppReturn(t(\"Back to {name}\", { name: t(\"QCR\") }), col ? langText(col.title, getAppLang()) : \"\", backToQcrCollection(collectionId));", "void col;"],
  slice: ["attachScopedWheelClickHandler(qcrWheelContainerEl, (key) => goToAyahFromQcr(key));",
    "attachScopedWheelClickHandler(qcrWheelContainerEl, async (key) => { const id = qcrCurrentId; closeAllPanels(); const p = parseUnitKey(key).parts; await goToReference(Number(p[0]), Number(p[1]), null); await openNotesPaneForKey(key, {}, backToQcrCollection(id)); });"],
  // Issue #786 moved both anchors below (a QCR item is a RECORD key, so ayah:1:8 is read back as 1:7's second half
  // before the jump and the label): the same two mutations, re-anchored on the new lines -- not weakened.
  noread: ["await goToReference(surahNum, ayah, null, half);\n      }\n      await scrollFlowToCurrentAyah();",
    "await goToReference(surahNum, ayah, null, half);\n      }\n      setStageView(\"explore\");"],
  bismall: ["refLabel = ayahShortRefFor(surahNum, ayahNum, half);", "refLabel = ayahShortRefFor(1, 1);"],
  nobism: ["function isUnnumberedBismillah(surah, ayah) { return ayah === 1 && fatihaCountApplies(surah, fatihaOn()); }", "function isUnnumberedBismillah(surah, ayah) { return false; }"],
  nocount: ["function isUnnumberedBismillah(surah, ayah) { return ayah === 1 && fatihaCountApplies(surah, fatihaOn()); }", "function isUnnumberedBismillah(surah, ayah) { return ayah === 1 && surah === 1; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// A Tawakkul-shaped collection (no Al-Fātiḥah), and a positive control that really lists ayah:1:1. Seeded here,
// never in the stub's shared fixture.
const TAWAKKUL = ["ayah:3:159", "ayah:65:3", "ayah:14:12"];
const SEED = `DATA.ayahCollections = [{ _id: "t1", tenantId: "t1", collections: [
  { id: "qcrc_tawakkul", title: { en: "Tawakkul" }, badge: "", order: 5, status: "active", items: ${JSON.stringify(TAWAKKUL)} },
  { id: "qcrc_with11", title: { en: "Lists 1:1" }, badge: "", order: 6, status: "active", items: ["ayah:1:1", "ayah:65:3"] } ] }];`;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const digits = (s, bn) => (bn ? String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(s));
const ignorable = (e) => /ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e);

const browser = await chromium.launch();
for (const [lang, width, height] of [["en", 390, 844], ["bn", 390, 844], ["en", 1280, 800], ["bn", 1280, 800]]) {
  const bn = lang === "bn";
  const tag = `[${lang} ${width}]`;
  const BISM = bn ? "বিসমিল্লাহ" : "Bismillah";
  const BACK = bn ? "QCR-এ ফিরুন" : "Back to QCR";
  const ctx = await newContext(browser, { appLang: bn ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      const n = src.split(a).length - 1;
      if (!n) throw new Error(`mutation anchor missing: ${MUTATE}`);
      console.log(`  (mutation ${MUTATE}: ${n} occurrence(s) replaced)`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");

  const FIRST = { qcrc_tawakkul: TAWAKKUL[0], qcrc_with11: "ayah:1:1" };
  const openQcr = async (collectionId) => {
    // Explore's tab toggles, so it is pressed only when QCR is not already on screen.
    if (!(await P.evaluate(() => !!document.getElementById("qcrLevelSelect")?.getClientRects().length))) {
      await P.evaluate(() => document.getElementById("tabExploreBtn")?.click());
      await P.waitForTimeout(700);
      await P.evaluate(() => document.getElementById("explorePaletteQcrBtn")?.click());
    }
    await P.waitForFunction(() => document.querySelector("[data-qcr-jump]"), null, { timeout: 15000 }).catch(() => {});
    await P.selectOption("#qcrLevelSelect", collectionId).catch(() => {});
    // Wait for THIS collection's rows (its first key), not just the select's value: the list redraws after a surah load.
    await P.waitForFunction(([id, first]) => document.getElementById("qcrLevelSelect")?.value === id && document.querySelector("#qcrWaysListContainer [data-qcr-jump]")?.dataset.qcrJump === first, [collectionId, FIRST[collectionId]], { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(300);
  };
  const listState = () => P.evaluate(() => ({
    badges: [...document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump] .badge")].map((b) => b.textContent.trim()),
    keys: [...document.querySelectorAll("[data-qcr-jump]")].map((b) => b.dataset.qcrJump),
    wheel: [...document.querySelectorAll("#qcrWheelContainer .wheel-seg[data-key]")].map((s) => `${s.dataset.key}=${(s.querySelector("title")?.textContent ?? "").trim()}`),
    wheelNums: [...document.querySelectorAll("#qcrWheelContainer .wheel-seg-num, #qcrWheelContainer .wheel-seg-label")].map((s) => s.textContent.trim()),
  }));
  const readState = () => P.evaluate(() => {
    const vis = (el) => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
    const panels = document.getElementById("ayahPanels");
    const r = panels?.getBoundingClientRect();
    const pillBtn = [...document.querySelectorAll("#ayahCardBackPill [data-ayah-card-back]")].find((b) => vis(b));
    return {
      read: vis(document.getElementById("readView")),
      pane: vis(document.getElementById("readNotePane")),
      noteView: vis(document.getElementById("noteView")),
      explore: vis(document.getElementById("qcrLevelSelect")),
      surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value,
      shown: panels?.dataset.shownAyah ?? null,
      inView: !!r && vis(panels) && r.bottom > 0 && r.top < innerHeight,
      pill: pillBtn ? pillBtn.textContent.replace(/\s+/g, " ").trim() : null,
    };
  });

  // ---------------- 1. The Bismillah: only where the collection lists 1:1 ----------------
  await openQcr("qcrc_tawakkul");
  const tw = await listState();
  check(`${tag} POSITIVE CONTROL: the Tawakkul collection lists its ${TAWAKKUL.length} āyāt`, JSON.stringify(tw.keys) === JSON.stringify(TAWAKKUL), JSON.stringify(tw.keys));
  const want = TAWAKKUL.map((k) => digits(k.split(":").slice(1).join(":"), bn));
  check(`${tag} Tawakkul's rows read exactly ${want.join(", ")}`, JSON.stringify(tw.badges) === JSON.stringify(want), JSON.stringify(tw.badges));
  check(`${tag} no "${BISM}" in Tawakkul's list or wheel`, tw.badges.length > 0 && !tw.badges.some((b) => b.includes(BISM)) && !tw.wheel.some((w) => w.includes(BISM)) && !tw.wheelNums.some((w) => w.includes(BISM)), JSON.stringify(tw));
  check(`${tag} the wheel has one slice per listed āyah`, tw.wheel.length === TAWAKKUL.length, JSON.stringify(tw.wheel));

  await openQcr("qcrc_with11");
  const w11 = await listState();
  check(`${tag} POSITIVE CONTROL: a collection that lists ayah:1:1 shows it as "${BISM}" (count on)`, w11.keys[0] === "ayah:1:1" && w11.badges[0] === BISM, JSON.stringify(w11.badges));

  // ---------------- 2. A row opens the āyah in the Read view, with ← Back to QCR ----------------
  await openQcr("qcrc_tawakkul");
  await P.locator('[data-qcr-jump="ayah:65:3"]').click();
  await P.waitForFunction(() => document.getElementById("surahSelect")?.value === "65" && document.getElementById("ayahPanels")?.dataset.shownAyah === "65:3:", null, { timeout: 15000 }).catch(() => {});
  await P.waitForTimeout(700);
  const r1 = await readState();
  check(`${tag} a Tawakkul row opens 65:3 in the Read view`, r1.read && r1.surah === "65" && r1.ayah === "3" && r1.shown === "65:3:" && r1.inView, JSON.stringify(r1));
  check(`${tag} the row does not open the Notes pane or the Note view`, !r1.pane && !r1.noteView, JSON.stringify(r1));
  check(`${tag} the way back "← ${BACK} · Tawakkul" is on screen`, !!r1.pill && r1.pill.includes(BACK) && r1.pill.includes("Tawakkul"), JSON.stringify(r1.pill));
  await P.locator("#ayahCardBackPill [data-ayah-card-back]").click().catch(() => {});
  await P.waitForFunction(() => document.getElementById("qcrLevelSelect")?.getClientRects().length && document.querySelector("[data-qcr-jump]"), null, { timeout: 15000 }).catch(() => {});
  const b1 = await P.evaluate(() => ({ col: document.getElementById("qcrLevelSelect")?.value, shown: !!document.getElementById("qcrLevelSelect")?.getClientRects().length, rows: [...document.querySelectorAll("[data-qcr-jump]")].map((b) => b.dataset.qcrJump) }));
  check(`${tag} ← Back returns to QCR on Tawakkul`, b1.shown && b1.col === "qcrc_tawakkul" && b1.rows.includes("ayah:65:3"), JSON.stringify(b1));

  // ---------------- 3. The wheel slice ("Slide") does the same ----------------
  const seg = P.locator('#qcrWheelContainer .wheel-seg[data-key="ayah:14:12"]').first();
  const segOk = await seg.count();
  check(`${tag} POSITIVE CONTROL: the 14:12 slice is on the QCR wheel`, segOk > 0, String(segOk));
  if (segOk) {
    await seg.scrollIntoViewIfNeeded().catch(() => {});
    await seg.click({ force: true }).catch(() => seg.dispatchEvent("click"));
    await P.waitForFunction(() => document.getElementById("surahSelect")?.value === "14" && document.getElementById("ayahPanels")?.dataset.shownAyah === "14:12:", null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(700);
    const r2 = await readState();
    check(`${tag} the wheel slice opens 14:12 in the Read view`, r2.read && r2.surah === "14" && r2.ayah === "12" && r2.shown === "14:12:" && r2.inView, JSON.stringify(r2));
    check(`${tag} the slice does not open the Notes pane or the Note view`, !r2.pane && !r2.noteView, JSON.stringify(r2));
    check(`${tag} the slice leaves "← ${BACK}"`, !!r2.pill && r2.pill.includes(BACK), JSON.stringify(r2.pill));
    await P.locator("#ayahCardBackPill [data-ayah-card-back]").click().catch(() => {});
    await P.waitForFunction(() => document.getElementById("qcrLevelSelect")?.getClientRects().length, null, { timeout: 15000 }).catch(() => {});
    const b2 = await P.evaluate(() => ({ col: document.getElementById("qcrLevelSelect")?.value, shown: !!document.getElementById("qcrLevelSelect")?.getClientRects().length }));
    check(`${tag} ← Back from the slice returns to QCR on Tawakkul`, b2.shown && b2.col === "qcrc_tawakkul", JSON.stringify(b2));
  }
  check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));

  // ---------------- 4. With the Al-Fātiḥah count OFF, 1:1 is "1:1", not "Bismillah" ----------------
  await P.evaluate(() => localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"));
  await P.reload({ waitUntil: "networkidle" });
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  await openQcr("qcrc_with11");
  const off = await listState();
  check(`${tag} count off: ayah:1:1 reads "${digits("1:1", bn)}", never "${BISM}"`, off.keys[0] === "ayah:1:1" && off.badges[0] === digits("1:1", bn) && !off.badges.some((b) => b.includes(BISM)), JSON.stringify(off.badges));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QCR: Bismillah only where listed; a QCR āyah opens in the Read view: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
