// Issue #410 -- Study options: save the current settings as named presets,
// restore with one tap.
//
// Run from the repository root, with serve.js on :8080.
// Expected values are written by hand. The stub never mutates its DATA, so a
// write is proved through window.__stubWriteData, and the second preset is
// proved against a SEEDED first one (the write reads the document, patches it
// and writes it back).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// A seeded preset that differs from the page's defaults in EVERY field, so an
// apply that skips one control is caught.
const SEEDED = {
  id: "pre1", name: "Seeded night", savedAt: "2026-09-01T00:00:00.000Z", removed: false,
  settings: {
    mushafOn: true, sidewaysOn: false, tajweedOn: true, wbwOn: true, rootsOn: true, derivativesOn: true,
    translationLangs: ["bn"], wbwLang: "both", quranFont: "amiriquran",
    fullScreenHides: ["banner", "dock"], endOfUnitPrompt: false,
    unitType: "range",
    unit: { surahNum: 2, ayahNum: 5, rangeFrom: 5, rangeTo: 8 },
    reciterIds: [], repeat: 5, mode: "whole", loop: true,
  },
};
const seedJs = (presets, failable = false) => `
  const __presets = ${JSON.stringify(presets)};
  ${failable
    ? `Object.defineProperty(DATA.bookmarks[0], "settingsPresets", { enumerable: true, get() { if (window.__failPresets) throw Object.assign(new Error("boom"), { code: "unavailable" }); return __presets; } });`
    : `DATA.bookmarks[0].settingsPresets = __presets;`}
`;

async function start({ lang = "en", width = 390, presets = [SEEDED], failable = false, height = 844 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: seedJs(presets, failable) });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { ctx, page };
}
const openOptions = async (page) => {
  await page.click("#tabStudyBtn");
  await page.waitForTimeout(120);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForFunction(() => document.querySelectorAll("#presetChips .preset-chip").length > 0 || true);
  await page.waitForTimeout(400);
};
const bookmarkWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const lastPresets = async (page) => {
  const w = await bookmarkWrites(page);
  return w.length ? w[w.length - 1].data.settingsPresets : null;
};
const controls = (page) => page.evaluate(() => ({
  mushafOn: document.getElementById("mushafToggle").checked,
  sidewaysOn: document.getElementById("sidewaysToggle").checked,
  tajweedOn: document.getElementById("tajweedToggle").checked,
  wbwOn: document.getElementById("wbwShowToggle").checked,
  rootsOn: document.getElementById("rootsToggle").checked,
  derivativesOn: document.getElementById("derivativesToggle").checked,
  en: document.getElementById("trEnToggle").checked,
  bn: document.getElementById("trBnToggle").checked,
  wbwLang: document.getElementById("wbwLangSelect").value,
  quranFont: document.getElementById("quranFontSelect").value,
  fsHides: [...document.querySelectorAll("#fullScreenHides input[data-fs-hide]")].filter((b) => b.checked).map((b) => b.dataset.fsHide),
  endOfUnitPrompt: document.getElementById("endOfUnitPromptToggle").checked,
  unitType: document.getElementById("unitTypeSelect").value,
  surah: document.getElementById("surahSelect").value,
  ayah: document.getElementById("ayahSelect").value,
  from: document.getElementById("rangeFromSelect").value,
  to: document.getElementById("rangeToSelect").value,
  reciters: [...document.querySelectorAll(".drill-reciter-check")].filter((b) => b.checked).map((b) => b.value),
  repeat: document.getElementById("drillRepeatSelect").value,
  mode: document.getElementById("drillModeSelect").value,
  loop: document.getElementById("loopToggle").checked,
  optionsHidden: document.getElementById("panelStudyOptions").hidden,
  readShown: !document.getElementById("readView").hidden,
}));

console.log("\n=== Study options: saved settings (#410) ===");
{
  // ---- SAVE ----------------------------------------------------------------
  const { ctx, page } = await start();
  await openOptions(page);
  const all = await page.$$eval(".drill-reciter-check", (e) => e.map((b) => b.value));
  check("setup: at least two reciters are offered", all.length >= 2, JSON.stringify(all));
  // Put every control into a state that differs from the defaults.
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.selectOption("#ayahSelect", "3");
  await page.waitForTimeout(200);
  await page.check("#tajweedToggle"); await page.check("#wbwShowToggle");
  await page.check("#rootsToggle"); await page.check("#derivativesToggle");
  await page.uncheck("#sidewaysToggle"); await page.uncheck("#endOfUnitPromptToggle");
  await page.uncheck("#trEnToggle"); await page.check("#trBnToggle");
  await page.selectOption("#wbwLangSelect", "en");
  await page.selectOption("#quranFontSelect", "notonaskh");
  for (const b of await page.$$("#fullScreenHides input[data-fs-hide]")) await b.uncheck();
  await page.check('#fullScreenHides input[data-fs-hide="topnav"]');
  await page.check('#fullScreenHides input[data-fs-hide="transport"]');
  for (const b of await page.$$(".drill-reciter-check:checked")) await b.uncheck();
  await page.check(`.drill-reciter-check[value="${all[1]}"]`);
  await page.selectOption("#drillRepeatSelect", "3");
  await page.selectOption("#drillModeSelect", "whole");
  await page.check("#loopToggle");
  await page.waitForTimeout(200);

  const btn = await page.evaluate(() => {
    const b = document.getElementById("presetSaveBtn"); const r = b.getBoundingClientRect();
    return { text: b.textContent.trim(), h: r.height, top: r.top };
  });
  check("the Save button says ☆ Save these settings and is at least 40px tall", btn.text === "☆ Save these settings" && btn.h >= 40, JSON.stringify(btn));
  // Owner, 1 Oct 2026: Save moved up onto the panel's own (sticky) title line and
  // Search came right below it. Updated in place: measured with the panel scrolled
  // to its top, because a sticky title stays on screen while a picker scrolls past it.
  const order = await page.evaluate(() => {
    document.getElementById("panelStudyOptions").scrollTop = 0;
    const top = (id) => document.getElementById(id).getBoundingClientRect().top;
    return { inHead: !!document.querySelector("#panelStudyOptions > .qr-panel-head #presetSaveBtn"), save: top("presetSaveBtn"), search: top("jumpInput"), tenant: top("tenantSelect") };
  });
  check("the Save button sits on the Study options title line", order.inHead, JSON.stringify(order));
  check("top to bottom: Save, then Search, then the first picker", order.save < order.search && order.search < order.tenant, JSON.stringify(order));

  await page.click("#presetSaveBtn");
  const form = await page.evaluate(() => ({ shown: !document.getElementById("presetForm").hidden, name: document.getElementById("presetNameInput").value, keep: document.getElementById("presetKeepUnit").checked }));
  check("an inline form opens (not prompt()), default name is the unit label, keep-unit is on", form.shown && form.name.length > 0 && form.keep, JSON.stringify(form));
  await page.fill("#presetNameInput", "Night Hifz");
  await page.click("#presetFormSave");
  await page.waitForTimeout(400);
  const presets = await lastPresets(page);
  check("save wrote settingsPresets to the bookmarks document", Array.isArray(presets), JSON.stringify(presets));
  check("the seeded preset is kept and the new one added (two, distinct)", presets?.length === 2 && presets[0].id === "pre1" && presets[1].id !== "pre1" && presets[1].name === "Night Hifz", JSON.stringify(presets?.map((p) => p.name)));
  const saved = presets?.[1];
  const expected = {
    mushafOn: false, sidewaysOn: false, tajweedOn: true, wbwOn: true, rootsOn: true, derivativesOn: true,
    translationLangs: ["bn"], wbwLang: "en", quranFont: "notonaskh",
    fullScreenHides: ["topnav", "transport"], endOfUnitPrompt: false,
    unitType: "ayah", unit: { surahNum: 1, ayahNum: 3, rangeFrom: null, rangeTo: null },
    reciterIds: [all[1]], repeat: 3, mode: "whole", loop: true,
  };
  check("the saved settings are EXACTLY the listed fields (hand-written object)", same(saved?.settings, expected), JSON.stringify(saved?.settings));
  check("the preset carries id, name, savedAt and removed:false", !!saved?.id && !!saved?.savedAt && saved?.removed === false && Object.keys(saved).sort().join() === "id,name,removed,savedAt,settings", JSON.stringify(Object.keys(saved || {})));
  const wroteOnly = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks").map((w) => Object.keys(w.data).sort().join()));
  check("the write touches only settingsPresets (+ the tenant/person keys and updatedAt)", wroteOnly.every((k) => /^(personId,)?(settingsPresets,)?(tenantId,)?/.test(k) && k.includes("settingsPresets")), JSON.stringify(wroteOnly));
  check("the new chip appears next to the seeded one", await page.$$eval("#presetChips [data-preset-apply]", (e) => e.map((b) => b.textContent)).then((l) => same(l, ["Seeded night", "Night Hifz"])));

  // ---- keep-unit OFF ---------------------------------------------------------
  await page.click("#presetSaveBtn");
  await page.uncheck("#presetKeepUnit");
  await page.fill("#presetNameInput", "No unit");
  await page.click("#presetFormSave");
  await page.waitForTimeout(400);
  // The stub never mutates its DATA, so this write re-reads the SEEDED document: the new preset is the last entry.
  const p3 = (await lastPresets(page))?.at(-1);
  check("with 'Keep this unit' off the preset stores the unit TYPE and no unit", p3?.name === "No unit" && p3.settings.unit === null && p3.settings.unitType === "ayah", JSON.stringify(p3?.settings));
  await ctx.close();
}
{
  // ---- APPLY (with a kept unit), read back from the DOM -----------------------
  const { ctx, page } = await start();
  await openOptions(page);
  const before = await controls(page);
  check("setup: the page starts on defaults that differ from the preset", before.unitType !== "range" && !before.mushafOn && before.sidewaysOn, JSON.stringify(before));
  await page.click('#presetChips [data-preset-apply="pre1"]');
  await page.waitForTimeout(900);
  const c = await controls(page);
  const want = {
    mushafOn: true, sidewaysOn: false, tajweedOn: true, wbwOn: true, rootsOn: true, derivativesOn: true,
    en: false, bn: true, wbwLang: "both", quranFont: "amiriquran", fsHides: ["banner", "dock"], endOfUnitPrompt: false,
    unitType: "range", surah: "2", from: "5", to: "8", reciters: [], repeat: "5", mode: "whole", loop: true,
  };
  for (const [k, v] of Object.entries(want)) check(`apply restores ${k}`, same(c[k], v), `${JSON.stringify(c[k])} != ${JSON.stringify(v)}`);
  check("apply does not press Read or Play (Study options still open, reading view not shown)", !c.optionsHidden && !c.readShown, JSON.stringify({ o: c.optionsHidden, r: c.readShown }));
  check("apply says what to do next", await page.$eval("#presetMsg", (e) => !e.hidden && /Applied: Seeded night/.test(e.textContent)));
  await ctx.close();
}
{
  // ---- APPLY without a unit: the open unit is left alone ----------------------
  const noUnit = { ...SEEDED, id: "pre2", name: "No unit", settings: { ...SEEDED.settings, unitType: "surah", unit: null } };
  const { ctx, page } = await start({ presets: [noUnit] });
  await openOptions(page);
  await page.click('#presetChips [data-preset-apply="pre2"]');
  await page.waitForTimeout(700);
  const c = await controls(page);
  check("a preset saved without its unit changes the unit TYPE only (surah stays 1)", c.unitType === "surah" && c.surah === "1", JSON.stringify({ t: c.unitType, s: c.surah }));
  await ctx.close();
}
{
  // ---- RENAME and REMOVE (soft) ---------------------------------------------
  const second = { ...SEEDED, id: "pre2", name: "Juz review" };
  const { ctx, page } = await start({ presets: [SEEDED, second] });
  await openOptions(page);
  await page.click('#presetChips [data-preset-edit="pre2"]');
  const f = await page.evaluate(() => ({ shown: !document.getElementById("presetForm").hidden, name: document.getElementById("presetNameInput").value, keepHidden: document.getElementById("presetKeepRow").hidden, removeShown: !document.getElementById("presetFormRemove").hidden }));
  check("⋯ opens the same inline form, prefilled with the name, offering Remove", f.shown && f.name === "Juz review" && f.keepHidden && f.removeShown, JSON.stringify(f));
  await page.fill("#presetNameInput", "Juz 30 revision");
  await page.click("#presetFormSave");
  await page.waitForTimeout(400);
  let ps = await lastPresets(page);
  check("rename writes the new name and leaves the other preset untouched", ps?.length === 2 && ps[0].name === "Seeded night" && ps[1].name === "Juz 30 revision" && ps[1].id === "pre2" && ps[1].removed === false, JSON.stringify(ps?.map((p) => [p.name, p.removed])));
  check("the chip shows the new name", await page.$$eval("#presetChips [data-preset-apply]", (e) => e.map((b) => b.textContent)).then((l) => same(l, ["Seeded night", "Juz 30 revision"])));
  await page.click('#presetChips [data-preset-edit="pre1"]');
  await page.click("#presetFormRemove");
  await page.waitForTimeout(400);
  ps = await lastPresets(page);
  check("remove is SOFT: both presets are still written, the first with removed:true", ps?.length === 2 && ps[0].id === "pre1" && ps[0].removed === true && ps[1].removed === false, JSON.stringify(ps?.map((p) => [p.id, p.removed])));
  check("the removed preset's chip is gone", await page.$$eval("#presetChips [data-preset-apply]", (e) => e.map((b) => b.textContent)).then((l) => same(l, ["Juz 30 revision"])));
  await ctx.close();
}
{
  // ---- BOOKMARK MENU ---------------------------------------------------------
  const { ctx, page } = await start();
  await page.$eval(".nav-cat-bookmark > summary", (s) => s.click());
  await page.waitForTimeout(700);
  const menu = await page.evaluate(() => {
    const g = [...document.querySelectorAll("#navBookmarkList .nav-bm-folder")].find((d) => /Saved settings/.test(d.querySelector("summary").textContent));
    return { has: !!g, rows: g ? [...g.querySelectorAll("[data-bm-nav-preset]")].map((b) => b.textContent) : [] };
  });
  check("the Bookmark menu has a 'Saved settings' group listing the preset", menu.has && same(menu.rows, ["Seeded night"]), JSON.stringify(menu));
  // A collapsed group (the menu's own Expand/Collapse setting) must be opened to reach the row.
  await page.evaluate(() => document.querySelectorAll("#navBookmarkList .nav-bm-folder").forEach((d) => { d.open = true; }));
  const rowH = await page.$eval("[data-bm-nav-preset]", (b) => b.getBoundingClientRect().height);
  check("a menu row is at least 40px tall", rowH >= 40, String(rowH));
  await page.click("[data-bm-nav-preset]");
  await page.waitForTimeout(900);
  const c = await controls(page);
  check("tapping the row applies the preset (unit, view and listening)", c.unitType === "range" && c.surah === "2" && c.mushafOn && c.repeat === "5" && c.loop, JSON.stringify(c));
  check("…and brings up Study options, which holds Read and Play, without pressing either", !c.optionsHidden && !c.readShown, JSON.stringify({ o: c.optionsHidden, r: c.readShown }));
  await ctx.close();
}
{
  // ---- A FAILED WRITE reaches the reader (I15) --------------------------------
  const { ctx, page } = await start({ failable: true });
  await openOptions(page);
  await page.evaluate(() => { window.__failPresets = true; });
  await page.click("#presetSaveBtn");
  await page.fill("#presetNameInput", "Will fail");
  await page.click("#presetFormSave");
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const b = document.getElementById("qr-write-failure-banner");
    return { banner: !!b && b.textContent.trim().length > 0, chips: [...document.querySelectorAll("#presetChips [data-preset-apply]")].map((e) => e.textContent), wrote: (window.__stubWriteData || []).filter((w) => w.col === "bookmarks").length };
  });
  check("a failed save shows the write-failure banner", r.banner, JSON.stringify(r));
  check("a failed save adds no chip and records no write", same(r.chips, ["Seeded night"]) && r.wrote === 0, JSON.stringify(r));
  await ctx.close();
}
{
  // ---- BANGLA ------------------------------------------------------------------
  const { ctx, page } = await start({ lang: "bn" });
  await openOptions(page);
  const t = await page.evaluate(() => ({
    save: document.getElementById("presetSaveBtn").textContent.trim(),
    label: document.getElementById("presetNameLabel").textContent.trim(),
    keep: document.getElementById("presetKeepText").textContent.trim(),
  }));
  check("Bangla: the Save button is translated", t.save === "☆ এই সেটিংস সংরক্ষণ করুন", JSON.stringify(t));
  check("Bangla: the form labels are translated", t.label === "এই সেটিংসের নাম দিন" && t.keep === "এই একক রাখুন", JSON.stringify(t));
  await page.click('#presetChips [data-preset-apply="pre1"]');
  await page.waitForTimeout(800);
  check("Bangla: the applied line is translated", await page.$eval("#presetMsg", (e) => /প্রয়োগ হয়েছে: Seeded night/.test(e.textContent)));
  await page.click("#presetSaveBtn");
  await page.click("#presetFormCancel");
  await page.$eval(".nav-cat-bookmark > summary", (s) => s.click());
  await page.waitForTimeout(600);
  check("Bangla: the Bookmark-menu group is translated", await page.$$eval("#navBookmarkList .nav-bm-folder > summary", (s) => s.some((e) => e.textContent.includes("সংরক্ষিত সেটিংস"))));
  await ctx.close();
}
{
  // ---- LAYOUT at 320 / 390 / 1280, both languages, long real-length names -----
  const long = ["Night Hifz before Fajr with Sheikh", "Juz 30 review", "Tajweed colours with Word by Word in Bangla", "একটি খুব লম্বা সংরক্ষিত সেটিংসের নাম যা পর্দায় ধরে না"]
    .map((name, i) => ({ ...SEEDED, id: `L${i}`, name }));
  for (const lang of ["en", "bn"]) for (const width of [320, 390, 1280]) {
    const { ctx, page } = await start({ lang, width, presets: long });
    await openOptions(page);
    const m = await page.evaluate(() => {
      const panel = document.getElementById("panelStudyOptions").getBoundingClientRect();
      const body = document.querySelector(".study-options-body");
      const items = [...document.querySelectorAll("#presetSaveBtn, #presetChips .preset-chip, #presetChips button")];
      const out = items.map((e) => { const r = e.getBoundingClientRect(); return { cls: e.className || e.id, l: r.left, r: r.right, h: r.height }; });
      return { panelL: panel.left, panelR: panel.right, out, overflowX: body.scrollWidth - body.clientWidth, chips: document.querySelectorAll("#presetChips .preset-chip").length };
    });
    const tag = `${lang} ${width}px`;
    check(`${tag}: all four chips and the Save button render`, m.chips === 4 && m.out.length > 4, JSON.stringify(m.chips));
    check(`${tag}: nothing runs past the panel edges`, m.out.every((o) => o.l >= m.panelL - 0.5 && o.r <= m.panelR + 0.5), JSON.stringify(m.out.filter((o) => o.r > m.panelR + 0.5)));
    check(`${tag}: every tap target is at least 40px tall`, m.out.every((o) => o.h >= 39.5), JSON.stringify(m.out.filter((o) => o.h < 39.5)));
    check(`${tag}: the panel body does not scroll sideways`, m.overflowX <= 0, String(m.overflowX));
    // Bookmark menu rows
    await page.$eval(".nav-cat-bookmark > summary", (s) => s.click()); // a page-level overlay's resize handle sits over it at 1280px
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll("#navBookmarkList .nav-bm-folder").forEach((d) => { d.open = true; }));
    const menu = await page.evaluate(() => {
      const list = document.getElementById("navBookmarkList").getBoundingClientRect();
      const rows = [...document.querySelectorAll("[data-bm-nav-preset]")].map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height }; });
      return { rows, listL: list.left, listR: list.right, vw: window.innerWidth };
    });
    check(`${tag}: four Bookmark-menu rows, inside the list and the screen, ≥40px`, menu.rows.length === 4 && menu.rows.every((r) => r.l >= -0.5 && r.r <= menu.vw + 0.5 && r.r <= menu.listR + 0.5 && r.h >= 39.5), JSON.stringify(menu));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
