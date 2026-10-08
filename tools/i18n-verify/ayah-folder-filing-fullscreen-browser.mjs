// The Owner, 8 Oct 2026, two phone screenshots of the Āyah card's "File … in folder(s)" chooser:
//   "Make it full screen to have more Visibility n add a back button where it came from."
//   "On every letter typing, the keyboard goes down. Fix"
//   "Takes long time loading."
//   "Enable all folder Collapse/ expandable (use one button, not two. Same button collapse, next click expands).
//    Default open collapsed."
// And one found on the way: Save read the ticks off the screen, so a ticked folder hidden by a search would have been
// taken out of the Note's folders. Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nofull   the full-screen rules removed            -> the full-screen checks fail
//   --mutate=retype   typing redraws the whole chooser again   -> the focus checks fail
//   --mutate=domsave  Save reads the ticks off the screen      -> the hidden-tick check fails
//   --mutate=noback   ← Back only closes, never reopens        -> the way-back check fails
//   --mutate=nofold   every folder drawn open, no fold button  -> the fold checks fail
//   --mutate=slow     the old one-chain load, nothing started early or kept -> the timing check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofull: ["#ayahFolderFilingOverlay { padding: 0; align-items: stretch; justify-content: stretch; }\n  #ayahFolderFilingCard {", "#ayahFolderFilingCard_off {"],
  retype: ["          if (treeEl) treeEl.innerHTML = renderAyahFolderTreeHtml(", "          if (false) treeEl.innerHTML = renderAyahFolderTreeHtml("],
  domsave: ["onSave: () => saveAyahFolderFiling([...new Set(st.checkedFolderIds)]),", "onSave: (fromScreen) => saveAyahFolderFiling(fromScreen),"],
  noback: ["      openAyahActionSheet(`${surah}:${ayah}`, half);\n    });", "    });"],
  nofold: ["file:js/ayah-folder-filing-renderer.js", "  const open = !!term || expanded.has(folder.folderId);", "  const open = true;"],
  slow: ["      const promise = ownerFolderTreePagedSharded(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId })", "      const promise = ownerFolderTreePaged(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId })",
         "      prefetchAyahFolderTree(); // \"File in folder(s)\" then usually opens", "      void 0; // \"File in folder(s)\" then usually opens",
         "        const cached = ayahFolderTreeCache?.key === ayahFolderTreeKey() ? ayahFolderTreeCache.tree : null;", "        const cached = null;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

async function routeMutation(ctx) {
  if (!MUTATE) return;
  let spec = MUT[MUTATE], file = "quranrevival.html";
  if (spec[0].startsWith("file:")) { file = spec[0].slice(5); spec = spec.slice(1); }
  const type = file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
  await ctx.route(`**/app/${file}*`, async (r) => {
    let src = fs.readFileSync(`app/${file}`, "utf8");
    for (let i = 0; i < spec.length; i += 2) { if (!src.includes(spec[i])) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(spec[i]).join(spec[i + 1]); }
    await r.fulfill({ status: 200, contentType: type, body: src });
  });
}
const TENANT_ID = "t1", OWNER = "p1", UID = "test-uid", TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID };
const folder = (folderId, name, parentFolderId, order) => ({ _id: `${TENANT_ID}__${folderId}`, folderId, name, parentFolderId, semanticRole: "user", order, status: "active", ...own });
// Real-length names, as the Owner's own tree has (the screenshot cut several of them with "…").
const LONG = "Misguidance (MISINTERPRETATION) of Deen by those who claim to follow the scholars of the past";
const SEED = `
DATA.notes = ${JSON.stringify([{ _id: `${TENANT_ID}__n1`, noteId: "n1", title: "Ayat al-Kursi reflection", bodyHtml: "<p>x</p>", status: "active", visibility: "private", currentRevisionId: "n1-r1", ...own }])};
DATA.noteSources = ${JSON.stringify([{ _id: `${TENANT_ID}__s1`, sourceLinkId: "s1", noteId: "n1", sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", ...own }])};
DATA.noteFolders = ${JSON.stringify([
  folder("f1", "Siratul Mustaqeem", null, 0),
  folder("f2", "(521 - 600) Understanding the MISGUIDANCE:", null, 1),
  folder("f3", LONG, "f2", 0),
  folder("f4", "LIES about JIHAD", "f3", 0),
  folder("f5", "Know the RESPONSIBILITY of ULEMA, the inheritors of the Prophets", "f2", 1),
])};
DATA.notePlacements = ${JSON.stringify([{ _id: `${TENANT_ID}__pl1`, placementId: "pl1", noteId: "n1", folderId: "f3", order: 0, status: "active", ...own }])};
`;
const W = { en: { back: "← Back to Āyah card", save: "Save" }, bn: { back: "← আয়াত কার্ডে ফিরুন" } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function clean(page) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove())); }
async function openChooser(page) {
  await clean(page);
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); if (el.value !== "2") { el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900);
  await clean(page);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length >= 2, null, { timeout: 10000 });
  await page.waitForTimeout(200);
}

for (const lang of ["en", "bn"]) {
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    const tag = `[${lang} ${width}x${height}]`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await routeMutation(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openChooser(page);

    // 0. Folding: collapsed by default, one button opens and closes.
    const f0 = await page.evaluate(() => ({ ids: [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle),
      btn: document.querySelector('[data-ayah-folder-fold="f2"]')?.textContent, exp: document.querySelector('[data-ayah-folder-fold="f2"]')?.getAttribute("aria-expanded"),
      inside: document.querySelector('[data-ayah-folder-toggle="f2"]')?.closest("label").querySelector(".ayah-folder-inside")?.textContent ?? "",
      leafBtn: !!document.querySelector('[data-ayah-folder-fold="f1"]'),
      h: document.querySelector('[data-ayah-folder-fold="f2"]')?.getBoundingClientRect().height }));
    check(`${tag} it opens collapsed: only the two top folders show`, JSON.stringify(f0.ids) === '["f1","f2"]', JSON.stringify(f0.ids));
    check(`${tag} a folder with folders inside has one ▸ button (40px, aria-expanded false); a folder with none has no button`, f0.btn === "▸" && f0.exp === "false" && !f0.leafBtn && f0.h >= 40, JSON.stringify(f0));
    check(`${tag} the closed folder says a ticked folder is inside it`, /1/.test(f0.inside) && f0.inside.length > 3, f0.inside);
    await page.click('[data-ayah-folder-fold="f2"]'); await page.waitForTimeout(100);
    const f1 = await page.evaluate(() => ({ ids: [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle), btn: document.querySelector('[data-ayah-folder-fold="f2"]')?.textContent, exp: document.querySelector('[data-ayah-folder-fold="f2"]')?.getAttribute("aria-expanded"), f3ticked: document.querySelector('[data-ayah-folder-toggle="f3"]')?.checked }));
    check(`${tag} one tap on ▸ opens it (▾): its two folders appear, the ticked one ticked`, JSON.stringify(f1.ids) === '["f1","f2","f3","f5"]' && f1.btn === "▾" && f1.exp === "true" && f1.f3ticked === true, JSON.stringify(f1));
    await page.click('[data-ayah-folder-fold="f2"]'); await page.waitForTimeout(100);
    const f2 = await page.evaluate(() => [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle));
    check(`${tag} the same button tapped again closes it`, JSON.stringify(f2) === '["f1","f2"]', JSON.stringify(f2));
    await page.click('[data-ayah-folder-fold="f2"]'); await page.waitForTimeout(80);
    await page.click('[data-ayah-folder-fold="f3"]'); await page.waitForTimeout(80);
    const f3 = await page.evaluate(() => [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle));
    check(`${tag} a folder inside opens the same way (LIES about JIHAD appears)`, f3.includes("f4"), JSON.stringify(f3));

    // 1. Full screen (every folder open now, so every name is measured).
    const s = await page.evaluate(() => {
      const card = document.getElementById("ayahFolderFilingCard").getBoundingClientRect();
      const tree = document.querySelector("#ayahFolderFilingPickerMount .ayah-folder-tree").getBoundingClientRect();
      const back = document.getElementById("ayahFolderFilingBackBtn"), br = back.getBoundingClientRect();
      const btn = (q) => { const b = document.querySelector(q), r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { h: r.height, inView: r.top >= 0 && r.bottom <= innerHeight, top: !!hit && b.contains(hit) }; };
      const spans = [...document.querySelectorAll("#ayahFolderFilingPickerMount .ayah-folder-row-label span")];
      return { card: [card.left, card.top, card.width, card.height], vw: innerWidth, vh: innerHeight, treeH: tree.height,
        back: { text: back.textContent.trim(), h: br.height, top: br.top, hit: (() => { const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2); return !!hit && back.contains(hit); })() },
        save: btn("[data-ayah-folder-save]"), cancel: btn("[data-ayah-folder-cancel]"),
        cut: spans.filter((sp) => sp.scrollWidth > sp.clientWidth + 1 || getComputedStyle(sp).textOverflow === "ellipsis").map((sp) => sp.textContent.slice(0, 30)),
        longShown: spans.some((sp) => sp.textContent === document.querySelector('[data-ayah-folder-toggle="f3"]')?.closest("label").querySelector("span").textContent && sp.textContent.endsWith("the past")),
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} the chooser fills the screen`, Math.abs(s.card[0]) <= 1 && Math.abs(s.card[1]) <= 1 && Math.abs(s.card[2] - s.vw) <= 1 && Math.abs(s.card[3] - s.vh) <= 1, JSON.stringify(s.card));
    check(`${tag} the folder list takes most of the height (at least half the screen)`, s.treeH >= s.vh * 0.5, `${s.treeH | 0} of ${s.vh}`);
    check(`${tag} "${W[lang].back}" is at the top, 40px, nothing over it`, s.back.text === W[lang].back && s.back.h >= 40 && s.back.top < 80 && s.back.hit, JSON.stringify(s.back));
    check(`${tag} Save and Cancel are on screen and tappable, 44px`, s.save.inView && s.save.top && s.cancel.inView && s.cancel.top && s.save.h >= 44 && s.cancel.h >= 44, JSON.stringify([s.save, s.cancel]));
    check(`${tag} every folder name is whole (none cut with "…")`, s.cut.length === 0 && s.longShown, JSON.stringify(s.cut));
    check(`${tag} no sideways scroll`, s.over <= 0, String(s.over));
    if (width === 390 && lang === "bn") await page.screenshot({ path: "/tmp/ayah-folder-filing-bn-390.png" });

    // 2. Typing keeps the search box (the keyboard stays up on a phone).
    await page.evaluate(() => { const i = document.querySelector("[data-ayah-folder-search]"); i.__mark = "same"; });
    await page.click("[data-ayah-folder-search]");
    const focusAfter = [];
    for (const ch of "Mis") { await page.keyboard.type(ch); await page.waitForTimeout(80); focusAfter.push(await page.evaluate(() => document.activeElement?.__mark === "same" && document.activeElement.matches("[data-ayah-folder-search]"))); }
    check(`${tag} after each of the 3 letters typed, the search box still has the focus (it is never replaced)`, focusAfter.length === 3 && focusAfter.every(Boolean), JSON.stringify(focusAfter));
    const typed = await page.evaluate(() => ({ v: document.querySelector("[data-ayah-folder-search]").value, ids: [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle) }));
    // (a search shows the folders on a matching path open, whatever was folded)
    check(`${tag} the box reads "Mis" and the list is filtered (Siratul Mustaqeem gone, the MISGUIDANCE folders kept)`, typed.v === "Mis" && !typed.ids.includes("f1") && typed.ids.includes("f2") && typed.ids.includes("f3"), JSON.stringify(typed));

    // 3. A ticked folder the search hides stays ticked through Save.
    await page.fill("[data-ayah-folder-search]", "");
    await page.type("[data-ayah-folder-search]", "Sirat");
    await page.waitForTimeout(150);
    const hidden = await page.evaluate(() => ({ f3Shown: !!document.querySelector('[data-ayah-folder-toggle="f3"]'), f1Shown: !!document.querySelector('[data-ayah-folder-toggle="f1"]') }));
    check(`${tag} (positive control) searching "Sirat" hides the ticked folder and shows Siratul Mustaqeem`, !hidden.f3Shown && hidden.f1Shown, JSON.stringify(hidden));
    await page.evaluate(() => { window.__fsLog = []; });
    await page.click("[data-ayah-folder-save]");
    await page.waitForFunction(() => !document.getElementById("ayahFolderFilingOverlay").classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const writes = await page.evaluate(() => (window.__fsLog || []).filter((r) => /notePlacements/.test(r.col || "") && /set|update|batch|tx/i.test(r.kind || "")).map((r) => `${r.kind} ${r.col}/${r.id ?? ""}`));
    check(`${tag} Save with nothing changed writes no folder change (the hidden tick on the long folder is kept)`, writes.length === 0, JSON.stringify(writes));

    // 4. The way back: ← Back closes the chooser and reopens the Āyah card it came from.
    await openChooserAgainFn(page);
    await page.click("#ayahFolderFilingBackBtn");
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    const back = await page.evaluate(() => ({ chooser: document.getElementById("ayahFolderFilingOverlay").classList.contains("open"), card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "" }));
    check(`${tag} ← Back closes the chooser and reopens the Āyah card for 2:255`, !back.chooser && back.card && /2:255|২:২৫৫/.test(back.ref), JSON.stringify(back));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }
}
async function openChooserAgainFn(page) {
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-file-folder]"), null, { timeout: 8000 });
  await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length >= 2, null, { timeout: 10000 });
}
// 5. Loading time, with 250 folders and every read taking 300ms (the stub answers instantly otherwise).
{
  const many = [];
  for (let i = 0; i < 250; i++) many.push(folder(`g${String(i).padStart(3, "0")}`, `Folder ${i}`, null, i + 10));
  const SEED2 = SEED.replace("DATA.notePlacements", `DATA.noteFolders = DATA.noteFolders.concat(${JSON.stringify(many)});\nDATA.notePlacements`);
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED2, latencyMs: 300 });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMutation(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await clean(page);
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); if (el.value !== "2") { el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 20000 });
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500); await clean(page);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-file-folder]"), null, { timeout: 10000 });
  await page.waitForTimeout(2500); // a reader looks at the card before choosing "File in folder(s)"
  const t0 = Date.now();
  await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length >= 200, null, { timeout: 20000 }).catch(() => {});
  const first = Date.now() - t0;
  const rows = await page.evaluate(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length);
  check(`[timing] with 250 folders and 300ms reads, the folders are there ${first}ms after the tap (under 1,000ms: the tree was loaded while the card was open)`, rows >= 250 && first < 1000, `${first}ms, ${rows} rows`);
  await page.click("[data-ayah-folder-cancel]");
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-file-folder]"), null, { timeout: 10000 });
  const t1 = Date.now();
  await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length >= 200, null, { timeout: 20000 }).catch(() => {});
  const second = Date.now() - t1;
  check(`[timing] opened again at once, the kept folders show ${second}ms after the tap (under 1,000ms)`, second < 1000, `${second}ms`);
  await ctx.close();
}
console.log(`\n==== Āyah card "File in folder(s)": full screen, ← Back, typing keeps the keyboard, hidden ticks kept: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
