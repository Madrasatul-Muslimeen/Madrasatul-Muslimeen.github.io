// The Owner, 8 Oct 2026: "Folder system came from Siyagah. Here is Siyagah's MidPane Folder's few functions, add the
// marked ones" (a screenshot of Siyagah's folder pop-up header: the section's name, 📚, ◀ ▶, a section picker, 🎨),
// then, after the demo: "Go ahead with the Siyagah header."
// In the Āyah card's "File in folder(s)" chooser: the scope's name (📚 All sections / 📂 a section / Not in a section);
// 📚 every section at once; ◀ ▶ the previous / next section; the picker jumps; 🎨 folder text size, colour, bold, kept
// on this device; the chosen section kept too; a search looks through every section. Expected values written BY HAND.
// Run from the repository root, serve.js on :8080.
//   --mutate=nostep      ◀ ▶ do nothing                         -> the stepping checks fail
//   --mutate=nofont      🎨 changes are never applied            -> the font checks fail
//   --mutate=nosections  the sections are never read             -> the header checks fail
//   --mutate=noremember  the chosen section is not kept          -> the reopen check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nostep: ["          setAyahFolderScope(i < 0 ? order[d > 0 ? 0 : order.length - 1] : order[(i + d + order.length) % order.length]);", "          void i;"],
  nofont: ["      el.textContent = `#ayahFolderFilingPickerMount .ayah-folder-row-label span{", "      el.textContent = `#nothing span{"],
  nosections: ["        loadAllOwnerSections(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId, status: NOTE_STATUS.ACTIVE }).then((r) => r.rows).catch(() => []),", "        Promise.resolve([]),"],
  noremember: ["      try { localStorage.setItem(AYAH_FOLDER_SCOPE_KEY, st.scope); } catch", "      try { void 0; } catch"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const T = "t1", OWNER = "p1", UID = "test-uid", TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: T, ownerPersonId: OWNER, ownerUid: UID, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID };
const folder = (folderId, name, parentFolderId, order, sectionId = null) => ({ _id: `${T}__${folderId}`, folderId, name, parentFolderId, sectionId, semanticRole: "user", order, status: "active", ...own });
const section = (sectionId, name, order) => ({ _id: `${T}__${sectionId}`, sectionId, name, order, status: "active", ...own });
const S1 = "Mapping My Journey", S2 = "Tayyib n Tahura (ITSWOL - HEALTH)";
const SEED = `
DATA.noteSections = ${JSON.stringify([section("s1", S1, 0), section("s2", S2, 1)])};
DATA.noteFolders = ${JSON.stringify([
  folder("f1", "Siratul Mustaqeem", null, 0),
  folder("f2", "(521 - 600) Understanding the MISGUIDANCE:", null, 1, "s1"),
  folder("f3", "LIES about JIHAD", "f2", 0),
  folder("h1", "(01) Resources - Health", null, 2, "s2"),
  folder("h2", "(07) E - Daily Food-Intake / Food-Habit for Life", null, 3, "s2"),
])};
DATA.notePlacements = DATA.notePlacements || [];
`;
const W = { en: { all: "📚 All sections", none: "📂 Not in a section", s1: `📂 ${S1}`, s2: `📂 ${S2}`, noneHead: "NOT IN A SECTION" }, bn: { all: "📚 সব সেকশন", none: "📂 কোনো সেকশনে নেই", s1: `📂 ${S1}`, s2: `📂 ${S2}`, noneHead: "কোনো সেকশনে নেই" } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function clean(page) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove())); }
async function toAyah(page) {
  await clean(page);
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); if (el.value !== "2") { el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900); await clean(page);
}
async function openChooser(page) {
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-file-folder]"), null, { timeout: 8000 });
  await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahFolderFilingPickerMount [data-ayah-folder-toggle]").length >= 1, null, { timeout: 10000 });
  await page.waitForTimeout(200);
}
const read = (page) => page.evaluate(() => ({
  title: document.querySelector("[data-ayah-folder-sec-title]")?.textContent.trim() ?? null,
  ids: [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((c) => c.dataset.ayahFolderToggle),
  heads: [...document.querySelectorAll("[data-ayah-folder-sechead]")].map((h) => h.dataset.ayahFolderSechead),
  sel: document.querySelector("[data-ayah-folder-scope-select]")?.value ?? null,
}));

for (const lang of ["en", "bn"]) for (const [width, height] of [[390, 844], [1280, 800]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await toAyah(page);
  await openChooser(page);

  // The header, at first: every section.
  let s = await read(page);
  const nav = await page.evaluate(() => {
    const els = ["[data-ayah-folder-scope=\"all\"]", "[data-ayah-folder-step=\"-1\"]", "[data-ayah-folder-step=\"1\"]", "[data-ayah-folder-scope-select]", "[data-ayah-folder-font]"].map((q) => document.querySelector(`#ayahFolderFilingPickerMount ${q}`));
    const rs = els.map((e) => e?.getBoundingClientRect());
    if (!rs.every(Boolean)) return { all: false, missing: rs.map((r) => !!r) };
    const card = document.getElementById("ayahFolderFilingCard").getBoundingClientRect();
    return { all: rs.every(Boolean), order: rs.every((r, i) => !i || r.left >= rs[i - 1].right - 1), oneRow: rs.every((r) => Math.abs(r.top - rs[0].top) < 4), inside: rs.every((r) => r.left >= card.left - 1 && r.right <= card.right + 1), tap: rs.every((r) => r.height >= 40) };
  });
  check(`${tag} the header reads "${W[lang].all}", every section's folders under its own heading`, s.title === W[lang].all && JSON.stringify(s.heads) === '["none","s1","s2"]' && JSON.stringify(s.ids) === '["f1","f2","h1","h2"]' && s.sel === "all", JSON.stringify(s));
  check(`${tag} 📚 ◀ ▶ picker 🎨 in that order, one row, inside the chooser, each at least 40px`, nav.all && nav.order && nav.oneRow && nav.inside && nav.tap, JSON.stringify(nav));

  // ▶ ▶ ◀, the picker, 📚
  await page.click('[data-ayah-folder-step="1"]'); await page.waitForTimeout(100);
  s = await read(page);
  check(`${tag} ▶ goes to the first section: "${W[lang].none}", only its folder, no heading`, s.title === W[lang].none && JSON.stringify(s.ids) === '["f1"]' && s.heads.length === 0 && s.sel === "none", JSON.stringify(s));
  await page.click('[data-ayah-folder-step="1"]'); await page.waitForTimeout(100);
  s = await read(page);
  check(`${tag} ▶ again: "${S1}"`, s.title === W[lang].s1 && JSON.stringify(s.ids) === '["f2"]' && s.sel === "s1", JSON.stringify(s));
  await page.click('[data-ayah-folder-step="-1"]'); await page.waitForTimeout(100);
  s = await read(page);
  check(`${tag} ◀ goes back one`, s.sel === "none" && JSON.stringify(s.ids) === '["f1"]', JSON.stringify(s));
  await page.selectOption("[data-ayah-folder-scope-select]", "s2"); await page.waitForTimeout(100);
  s = await read(page);
  check(`${tag} the picker jumps to "${S2}" (the name shown whole)`, s.title === W[lang].s2 && JSON.stringify(s.ids) === '["h1","h2"]', JSON.stringify(s));
  // a search looks everywhere, whatever the section
  await page.fill("[data-ayah-folder-search]", "");
  await page.type("[data-ayah-folder-search]", "Sirat"); await page.waitForTimeout(120);
  s = await read(page);
  check(`${tag} a search looks through every section (Siratul Mustaqeem found from "${S2}")`, JSON.stringify(s.ids) === '["f1"]' && JSON.stringify(s.heads) === '["none"]', JSON.stringify(s));
  await page.fill("[data-ayah-folder-search]", ""); await page.dispatchEvent("[data-ayah-folder-search]", "input"); await page.waitForTimeout(100);
  // reopen: the section is kept
  await page.click("[data-ayah-folder-cancel]");
  await openChooser(page);
  s = await read(page);
  check(`${tag} opened again, it is still on "${S2}" (kept on this device)`, s.sel === "s2" && JSON.stringify(s.ids) === '["h1","h2"]', JSON.stringify(s));
  await page.click('[data-ayah-folder-scope="all"]'); await page.waitForTimeout(100);
  s = await read(page);
  check(`${tag} 📚 shows every section again`, s.sel === "all" && s.ids.length === 4, JSON.stringify(s));

  // 🎨
  await page.click("[data-ayah-folder-font]"); await page.waitForTimeout(100);
  const pop = await page.evaluate(() => { const p = document.querySelector("[data-ayah-folder-font-pop]"), r = p?.getBoundingClientRect(); return p ? { inView: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, sw: p.querySelectorAll("[data-ayah-folder-font-colour]").length } : null; });
  check(`${tag} 🎨 opens its panel on screen, with six colours`, !!pop && pop.inView && pop.sw === 6, JSON.stringify(pop));
  const style = () => page.evaluate(() => { const sp = document.querySelector('[data-ayah-folder-toggle="f1"]').closest("label").querySelector("span"), cs = getComputedStyle(sp); return { size: cs.fontSize, colour: cs.color, weight: cs.fontWeight }; });
  const s0 = await style();
  await page.click('[data-ayah-folder-font-step="1"]'); await page.waitForTimeout(80);
  await page.click('[data-ayah-folder-font-colour="#e2c06b"]'); await page.waitForTimeout(80);
  await page.click("[data-ayah-folder-font-bold]"); await page.waitForTimeout(80);
  const s1 = await style();
  check(`${tag} A+ makes the names 16px, Gold colours them, Bold makes them bold`, s0.size === "15px" && s1.size === "16px" && s1.colour === "rgb(226, 192, 107)" && Number(s1.weight) >= 700, JSON.stringify([s0, s1]));
  check(`${tag} the 🎨 panel stays open while choosing`, await page.evaluate(() => !!document.querySelector("[data-ayah-folder-font-pop]")));
  await page.reload(); await toAyah(page); await openChooser(page);
  const s2 = await style();
  check(`${tag} after a reload the names keep 16px, Gold, bold (kept on this device)`, s2.size === "16px" && s2.colour === "rgb(226, 192, 107)" && Number(s2.weight) >= 700, JSON.stringify(s2));
  await page.click("[data-ayah-folder-font]"); await page.click("[data-ayah-folder-font-reset]"); await page.waitForTimeout(80);
  check(`${tag} ↺ Reset puts the names back (15px, not bold)`, await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('[data-ayah-folder-toggle="f1"]').closest("label").querySelector("span")); return cs.fontSize === "15px" && Number(cs.fontWeight) < 700; }));
  check(`${tag} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  if (width === 390 && lang === "bn") await page.screenshot({ path: "/tmp/ayah-folder-header-bn-390.png" });
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}
console.log(`\n==== "File in folder(s)": Siyagah's header (📚 ◀ ▶ picker 🎨): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
