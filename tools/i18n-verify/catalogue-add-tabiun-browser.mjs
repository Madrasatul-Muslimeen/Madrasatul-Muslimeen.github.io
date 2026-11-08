// PCF MSA J115 -- the owner-only ONE tap "Add the Tābiʿūn Approach after the Ṣaḥābah Approach", in the real Catalogue page.
//   node tools/i18n-verify/catalogue-add-tabiun-browser.mjs [--mutate=noguard|noafter]       (serve.js on :8080)
// A: Ṣaḥābah (approach_50, section 7), Tābiʿ al-Tābiʿīn (51) and a REMOVED approach_52 are seeded; nothing is written until the tap (never on page load);
//    the tap writes ONE trackables document, id approach_53 (the removed 52 is the highest: ids are never reused), in Ṣaḥābah's section, and it
//    shows in the table straight after Ṣaḥābah; a second tap refuses in words and writes nothing.   (en and bn)
// B: a REMOVED Tābiʿūn exists -> the tap refuses and writes nothing.   C: no Ṣaḥābah Approach -> refuses and writes nothing.
//   --mutate=noguard  the "a Tābiʿūn already exists" refusal is removed   -> the second-tap and removed-Tābiʿūn checks FAIL
//   --mutate=noafter  the new Approach is placed at the end of the list    -> the "straight after Ṣaḥābah" check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const ERA = "app/js/era-approaches.js";
const MUT = {
  noguard: [ERA, "if (tabiun.live.length) return { ok: false, reason: \"exists-live\", row: tabiun.live[0] };\n  if (tabiun.removed.length) return { ok: false, reason: \"exists-removed\", row: tabiun.removed[0] };", ""],
  noafter: [ERA, "ids.splice(at < 0 ? ids.length : at + 1, 0, id);", "ids.push(id);"],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEC7 = `const SEC7 = { en: "A'mal / Application", bn: "আমল / প্রয়োগ" };`;
const row = (n, name, status = "active") => `{ _id: TENANT_ID + "__approach_${n}", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: ${n}, status: "${status}", group: 7, groupName: SEC7, name: ${JSON.stringify(name)} }`;
const SEEDS = {
  A: `${SEC7}\nDATA.trackables.push(${row(50, { en: "Ṣaḥābah" })}, ${row(51, { en: "Tābiʿ al-Tābiʿīn" })}, ${row(52, { en: "An old removed one" }, "archived")});`,
  B: `${SEC7}\nDATA.trackables.push(${row(50, { en: "Ṣaḥābah" })}, ${row(51, { en: "Tābiʿūn" }, "archived")});`,
  C: `${SEC7}\nDATA.trackables.push(${row(53, { en: "Tābiʿ al-Tābiʿīn" })});`,
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "trackables" && w.kind === "set").map((w) => w.id));
const tableIds = (page) => page.evaluate(() => [...document.querySelectorAll("#trackablesBody .editTrkBtn")].map((b) => b.dataset.id));
async function open(lang, seed, mutate) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 844 }, extraSeedJs: seed });
  if (mutate) {
    const [file, a, b] = MUT[mutate];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${mutate}`);
      await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  await page.click('[data-cat-tab="approaches"]');
  await page.evaluate(() => { const c = document.getElementById("showArchivedTrackables"); if (c && !c.checked) c.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}
const tap = async (page) => { await page.click("#addTabiunBtn"); await page.waitForTimeout(900); };
const msg = (page) => page.evaluate(() => document.getElementById("addTabiunResult").textContent.trim());

for (const lang of ["en", "bn"]) {
  console.log(`\n=== A: the one tap, ${lang} ===`);
  const { ctx, page, errors } = await open(lang, SEEDS.A, MUTATE);
  const box = await page.evaluate(() => { const f = document.getElementById("addTabiunBox"), r = f.getBoundingClientRect(); return { shown: getComputedStyle(f).display !== "none" && r.height > 0, legend: f.querySelector("legend").textContent.trim(), btnH: document.getElementById("addTabiunBtn").getBoundingClientRect().height, over: document.documentElement.scrollWidth - innerWidth }; });
  check(`[${lang}] the owner sees the button, at least 40px tall, no sideways scroll`, box.shown && box.btnH >= 40 && box.over <= 1, JSON.stringify(box));
  check(`[${lang}] its heading is in the reader's language`, lang === "en" ? box.legend === "The eras of the scholars" : /[ঀ-৿]/.test(box.legend), box.legend);
  check(`[${lang}] (positive control) the seeded Ṣaḥābah Approach is in the table and no Tābiʿūn is`, (await tableIds(page)).includes("approach_50") && !(await tableIds(page)).includes("approach_53"));
  check(`[${lang}] nothing was created by loading the page`, (await writes(page)).length === 0, JSON.stringify(await writes(page)));
  await tap(page);
  const w1 = await writes(page);
  check(`[${lang}] one tap writes ONE trackables document, approach_53 (after the removed, highest 52)`, w1.length === 1 && w1[0] === "t1__approach_53", JSON.stringify(w1));
  const d = await page.evaluate(() => (window.__stubWriteData || []).find((w) => w.col === "trackables" && w.kind === "set")?.data ?? {});
  check(`[${lang}] it is a Quran Approach in Ṣaḥābah's section, named Tābiʿūn in English and Bangla`, d.subjectId === "quran" && d.group === 7 && d.groupName?.en === "A'mal / Application" && d.name?.en === "Tābiʿūn" && /[ঀ-৿]/.test(d.name?.bn ?? "") && d.status === "active" && d.sourceTemplateId === null && d.edited === true, JSON.stringify(d));
  const ids = await tableIds(page), i50 = ids.indexOf("approach_50"), i53 = ids.indexOf("approach_53");
  check(`[${lang}] it shows in the table straight after Ṣaḥābah`, i50 >= 0 && i53 === i50 + 1, JSON.stringify(ids));
  const log = await page.evaluate(() => (window.__fsLog || []).map((r) => r.kind + " " + (r.col || "")));
  const iSet = log.findIndex((l) => l.startsWith("setDoc trackables"));
  check(`[${lang}] the create is followed by one renumbering write`, iSet >= 0 && log.findIndex((l, k) => k > iSet && l.startsWith("batchCommit")) > iSet, JSON.stringify(log));
  check(`[${lang}] it says what was added`, (await msg(page)).length > 0 && !/already|আগেই/.test(await msg(page)), await msg(page));
  await tap(page);
  const w2 = await writes(page);
  check(`[${lang}] a second tap refuses in words and writes nothing more`, w2.length === 1 && /already|আগেই/.test(await msg(page)), JSON.stringify({ w2, m: await msg(page) }));
  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}
for (const [key, label, re] of [["B", "a REMOVED Tābiʿūn exists", /removed|সরানো/], ["C", "there is no Ṣaḥābah Approach", /Ṣaḥābah|সাহাবা/]]) {
  console.log(`\n=== ${key}: ${label} ===`);
  const { ctx, page } = await open("en", SEEDS[key], MUTATE);
  await tap(page);
  const w = await writes(page);
  check(`${label}: the tap writes nothing`, w.length === 0, JSON.stringify(w));
  check(`${label}: it says why in words`, re.test(await msg(page)), await msg(page));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Catalogue: add Tābiʿūn: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
