// A Name's description on its poster: the poster's, a suggestion, or the madrasah's own (decision 87, 8 Oct 2026),
// and the save fix that came with it (asma-study.js's save no longer wipes fields it does not pass).
// Run from the repository root with node serve.js running:  node tools/i18n-verify/asma-descriptions-browser.mjs
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";

const root = process.cwd();
globalThis.document ??= { head: null }; // the poster module adds its stylesheet to a page; in Node there is none
const D = await import(path.join(root, "app/js/asma-descriptions.js"));
const P = await import(path.join(root, "app/js/asma-poster.js"));
const A = await import(path.join(root, "app/js/asma-data.js"));
const C = await import(path.join(root, "app/js/asma-collections-data.js"));
let passed = 0, failed = 0;
function check(name, ok, detail = "") { if (ok) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name} ${detail}`); } }

console.log("\n===== Asma descriptions: model =====");
const all = [...A.ASMA_NAMES, ...C.DEFAULT_EXTRA_ASMA_NAMES];
const sugg = all.map((e) => ({ n: e.number, s: D.suggestedDescription(e), m: P.asmaPosterModel(e) }));
check("all 132 Names have a suggested description", all.length === 132 && sugg.every((x) => x.s.length > 40), `${all.length}`);
check("decision 49: no suggestion says Lord or God", sugg.every((x) => !/\b(Lord|God)\b/.test(x.s)), JSON.stringify(sugg.filter((x) => /\b(Lord|God)\b/.test(x.s)).map((x) => x.n)));
check("a suggestion cites only the Name's own references: every Ayah and Hadith it names is on the Name's poster", sugg.every((x) => x.m.quran.every((c) => x.s.includes(c.full || c.text)) && x.m.hadith.every((c) => x.s.includes(c.text))));
check("a Name with no reference says so, never invents one", sugg.filter((x) => !x.m.quran.length && !x.m.hadith.length).every((x) => x.s.includes("No Qur'an or Hadith reference is recorded")));
const witr = all.find((e) => e.number === 102);
check("Al-Witr's suggestion names Sahih al-Bukhari - 6410", D.suggestedDescription(witr).includes("Sahih al-Bukhari - 6410"));
const choicesWitr = D.descriptionChoices(witr, {});
check("source order: the madrasah's when written, else the poster's, else the suggestion; a wanted source with text wins",
  D.pickDescriptionSource(choicesWitr, null) === "poster" && D.pickDescriptionSource(D.descriptionChoices(witr, { 102: "Ours" }), null) === "madrasah"
  && D.pickDescriptionSource(choicesWitr, "suggested") === "suggested" && D.pickDescriptionSource(choicesWitr, "madrasah") === "poster"
  && D.pickDescriptionSource(D.descriptionChoices(all.find((e) => e.number === 99), {}), null) === "suggested");
check("a reader who cannot edit gets no Edit button", !D.renderDescriptionStrip(choicesWitr, "poster", { canEdit: false }).includes("data-asma-desc-edit") && D.renderDescriptionStrip(choicesWitr, "poster", { canEdit: true }).includes("data-asma-desc-edit"));
check("a suggestion on the poster is labelled as one", P.renderAsmaPoster(witr, "standalone", { description: { text: "x", source: "suggested" } }).includes("Suggested description")
  && !P.renderAsmaPoster(witr, "standalone", { description: { text: "x", source: "poster" } }).includes("Suggested description"));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["bn", 390, 844], ["en", 1280, 800]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== Asma descriptions: Explore poster ${tag} =====`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()); try { localStorage.removeItem("mmsa.asmaDescriptionSource"); } catch {} });
  await page.click("#tabExploreBtn"); await page.waitForTimeout(600);
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 });
  await page.selectOption("#asmaXSingleSelect", "102");
  await page.waitForFunction(() => document.querySelector('#asmaXPosterPanel [data-asma-poster="102"]'), null, { timeout: 8000 });
  await page.click("#asmaXPosterPanel");
  await page.waitForSelector("#asmaXPosterOverlay.open [data-asma-desc-strip]");
  const s1 = await page.evaluate(() => {
    const o = document.querySelector("#asmaXPosterOverlay.open"); const strip = o.querySelector("[data-asma-desc-strip]"); const poster = o.querySelector(".ahp-standalone");
    const sb = strip.getBoundingClientRect(), pb = poster.getBoundingClientRect();
    return { pressed: o.querySelector('[data-asma-desc-src][aria-pressed="true"]')?.dataset.asmaDescSrc, edit: !!o.querySelector("[data-asma-desc-edit]"),
      above: sb.bottom <= pb.top + 1, stripIn: sb.left >= -1 && sb.right <= innerWidth + 1, posterIn: pb.top >= -1 && pb.bottom <= innerHeight + 1 && pb.right <= innerWidth + 1,
      btnH: Math.min(...[...strip.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect().height)),
      desc: o.querySelector("[data-poster-desc]").textContent.slice(0, 40), labels: [...strip.querySelectorAll("[data-asma-desc-src]")].map((b) => b.textContent) };
  });
  check(`${tag} the strip sits above the poster, both on screen; Poster's chosen; ✎ Edit for the owner; 40px buttons`, s1.pressed === "poster" && s1.edit && s1.above && s1.stripIn && s1.posterIn && s1.btnH >= 39.5 && s1.desc.startsWith("The One, the Only"), JSON.stringify(s1));
  check(`${tag} the strip speaks the reader's language`, lang === "bn" ? s1.labels.join() === "পোস্টারের,প্রস্তাবিত,মাদরাসার" : s1.labels.join() === "Poster's,Suggested,Madrasah's", s1.labels.join());
  await page.click('#asmaXPosterOverlay [data-asma-desc-src="suggested"]');
  const s2 = await page.evaluate(() => { const d = document.querySelector("#asmaXPosterOverlay.open [data-poster-desc]"); return { tag: !!d.querySelector("[data-poster-desc-tag]"), text: d.textContent, src: d.dataset.posterDescSource }; });
  check(`${tag} Suggested: the poster says "Suggested description" and cites Sahih al-Bukhari - 6410`, s2.tag && s2.src === "suggested" && s2.text.includes("Sahih al-Bukhari - 6410"), JSON.stringify(s2).slice(0, 200));
  await page.click("#asmaXPosterOverlay [data-asma-desc-edit]");
  const pre = await page.$eval("#asmaXPosterOverlay [data-asma-desc-text]", (t) => t.value);
  check(`${tag} ✎ Edit starts from the text shown`, pre.includes("Sahih al-Bukhari - 6410"), pre.slice(0, 80));
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.fill("#asmaXPosterOverlay [data-asma-desc-text]", "Al-Witr: our madrasah's own words.");
  await page.click("#asmaXPosterOverlay [data-asma-desc-save]");
  await page.waitForFunction(() => document.querySelector('#asmaXPosterOverlay [data-asma-desc-src="madrasah"][aria-pressed="true"]'), null, { timeout: 5000 }).catch(() => {});
  const s3 = await page.evaluate(() => ({ writes: (window.__stubWriteData || []).filter((w) => w.col === "asmaCollections"), desc: document.querySelector("#asmaXPosterOverlay.open [data-poster-desc]")?.textContent }));
  const w = s3.writes[0];
  const wroteOnlyDesc = !!w && (w.kind === "update" ? Object.keys(w.data).filter((k) => k !== "updatedAt").join() === "nameDescriptions.102" && w.data["nameDescriptions.102"] === "Al-Witr: our madrasah's own words."
    : w.data.nameDescriptions?.["102"] === "Al-Witr: our madrasah's own words.");
  check(`${tag} Save writes ONLY this Name's description to the madrasah's Asma document, and the poster shows it`, s3.writes.length === 1 && wroteOnlyDesc && s3.desc === "Al-Witr: our madrasah's own words.", JSON.stringify(s3).slice(0, 300));
  await page.click("#asmaXPosterCloseBtn").catch(async () => page.keyboard.press("Escape"));
  await page.click("#asmaXPosterPanel");
  await page.waitForSelector("#asmaXPosterOverlay.open [data-asma-desc-strip]");
  const s4 = await page.evaluate(() => document.querySelector('#asmaXPosterOverlay.open [data-asma-desc-src][aria-pressed="true"]')?.dataset.asmaDescSrc);
  check(`${tag} reopened, the poster keeps showing the madrasah's description`, s4 === "madrasah", s4);
  await page.click("#asmaXPosterCloseBtn").catch(() => {});
  await page.selectOption("#asmaXSingleSelect", "99");
  await page.waitForFunction(() => document.querySelector('#asmaXPosterPanel [data-asma-poster="99"]'), null, { timeout: 8000 });
  await page.click("#asmaXPosterPanel");
  await page.waitForSelector("#asmaXPosterOverlay.open [data-asma-desc-strip]");
  const s5 = await page.evaluate(() => ({ posterBtn: document.querySelector('#asmaXPosterOverlay [data-asma-desc-src="poster"]').disabled, pressed: document.querySelector('#asmaXPosterOverlay [data-asma-desc-src][aria-pressed="true"]')?.dataset.asmaDescSrc, none: !!document.querySelector("#asmaXPosterOverlay .ahp-desc.ahp-none") }));
  check(`${tag} As-Sabur (no poster description): Poster's is off, the suggestion shows instead of "Description to come."`, s5.posterBtn && s5.pressed === "suggested" && !s5.none, JSON.stringify(s5));
  if (width === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/asma-desc-${lang}-${width}.png` });
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|fonts\.g/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// The save fix: an update that does not pass a field leaves it alone; a create still writes the defaults.
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/asma-study.html");
  const r = await page.evaluate(async () => {
    const m = await import("/app/js/asma-collections.js");
    window.__stubWriteData = [];
    await m.saveAsmaCollections({}, { tenantId: "t1", collections: [], extraNames: [], overrides: {}, docExists: true, uid: "u" });
    await m.saveAsmaCollections({}, { tenantId: "t1", collections: [], extraNames: [], overrides: {}, docExists: false, uid: "u" });
    return window.__stubWriteData.map((w) => ({ kind: w.kind, keys: Object.keys(w.data) }));
  });
  const [upd, cre] = r;
  check("save fix: an update from asma-study (no English corrections, reference corrections or classifications passed) leaves those fields alone",
    !!upd && !upd.keys.some((k) => ["nameOverridesEn", "nameRefOverrides", "classifications"].includes(k)), JSON.stringify(upd));
  check("save fix: a first save (create) still writes the defaults", !!cre && ["nameOverridesEn", "nameRefOverrides", "classifications"].every((k) => cre.keys.includes(k)), JSON.stringify(cre));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma descriptions: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
