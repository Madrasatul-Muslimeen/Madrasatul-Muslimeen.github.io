// PCF MSA J106 S2 (the Owner, 14 Nov 2026, ticks 2B 5B 6A): Subjects.
//   - the Subjects menu offers FOUR, in the Owner's order: Learning Akhlaq, Loving Rasulullah, Knowing Al-Ghayb,
//     Learning Stories from Hadith (the Shamayyl card became "Loving Rasulullah"; the Hadith Reading card is not a Subject);
//   - the new Subject opens as a real Subject (its list reads from its own key of the existing hadithSubjects document, which
//     needs no Rules change: `subjects` is a map; the add/retire write path is proven for every id by hadith-subjects-browser);
//   - the Continue chips sit at the TOP of Subjects: the shared strip element (#continueStrip), unchanged, mounted;
//   - leaving Subjects parks the strip IN the page (the page's own scripts still find #continueStrip by id) and coming back
//     mounts it again, with the chips still there.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nostrip: ["js/hadith-browser.js", "  mountContinueStrip(box);\n", "\n"],
  nopark: ["js/hadith-continue-mount.js", "if (strip && strip.isConnected) ensureHolder().appendChild(strip);", "void 0;"],
  threeonly: ["js/hadith-browser.js", "  { id: \"rasulullah\", name: \"Loving Rasulullah\"", "  { id: \"rasulullah-off\", name: \"Loving Rasulullah\""],
  oldorder: ["js/hadith-subjects.js", "[\"akhlaq\", \"rasulullah\", \"ghayb\", \"stories\"]", "[\"akhlaq\", \"ghayb\", \"rasulullah\", \"stories\"]"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-subjects-s2 mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// A Continue chip needs a bookmark that has a resume position: one Deen Study resume row.
const SEED = `window.__stubApplyBatches = true; DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", folders: [], saved: [], resume: { "deen::none::deen_ethics": { position: null, settings: null, updatedAt: "2026-10-04T00:00:00.000Z" } } }];`;
const ORDER = ["akhlaq", "rasulullah", "ghayb", "stories"];

for (const [lang, width] of [["en", 390], ["bn", 320], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 844 }, extraSeedJs: SEED });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(`app/${file}`, "utf8").split(a).join(b) }));
  }
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, "/app/hadith-study.html");
  await P.waitForSelector('[data-hadith-tab="subjects"]', { timeout: 25000 });
  await P.waitForFunction(() => /Continue|চালিয়ে/.test(document.getElementById("continueStrip")?.innerText ?? ""), null, { timeout: 25000 }).catch(() => {});
  check(`${tag} positive control: the page's shared Continue strip has a chip to move`, await P.evaluate(() => /Continue|চালিয়ে/.test(document.getElementById("continueStrip")?.innerText ?? "")));
  await P.click('button[data-hadith-tab="subjects"]');
  await P.waitForSelector("#hadithMenu-subjects:not([hidden])", { timeout: 5000 });
  const picks = await P.$$eval("#hadithMenu-subjects [data-hadith-subject-pick]", (n) => n.map((x) => x.dataset.hadithSubjectPick));
  check(`${tag} the Subjects menu offers the four, in the Owner's order`, JSON.stringify(picks) === JSON.stringify(ORDER), JSON.stringify(picks));
  await P.click('#hadithMenu-subjects [data-hadith-subject-pick="rasulullah"]');
  await P.waitForSelector('[data-hadith-subject="rasulullah"]', { timeout: 10000 }).catch(() => {});
  const top = await P.evaluate(() => { const box = document.querySelector('[data-hadith-subject="rasulullah"]'); const s = box?.firstElementChild; const r = s?.getBoundingClientRect(); return { first: s?.id, text: s?.innerText.slice(0, 60), shown: !!r && r.width > 0 && r.height > 0, h2: box?.querySelector("h2")?.textContent, one: document.querySelectorAll("#continueStrip").length }; });
  check(`${tag} Loving Rasulullah opens as a Subject`, !!top.h2, JSON.stringify(top));
  check(`${tag} the Continue chips are the FIRST thing in Subjects, shown, and it is the same single #continueStrip`, top.first === "continueStrip" && top.shown && top.one === 1 && /Continue|চালিয়ে/.test(top.text || ""), JSON.stringify(top));
  // Leaving Subjects: the strip is parked IN the page, not lost.
  await P.click('button[data-hadith-tab="explore"]');
  await P.waitForTimeout(400);
  const parked = await P.evaluate(() => { const s = document.getElementById("continueStrip"); return { there: !!s, inSubjects: !!s?.closest(".hadith-subject"), chips: /Continue|চালিয়ে/.test(s?.innerText ?? "") }; });
  check(`${tag} leaving Subjects parks the strip in the page (the page's scripts still find #continueStrip by id) with its chips`, parked.there && !parked.inSubjects && parked.chips, JSON.stringify(parked));
  await P.click('button[data-hadith-tab="subjects"]');
  await P.click('#hadithMenu-subjects [data-hadith-subject-pick="ghayb"]');
  await P.waitForSelector('[data-hadith-subject="ghayb"]', { timeout: 10000 });
  const back = await P.evaluate(() => document.querySelector('[data-hadith-subject="ghayb"]')?.firstElementChild?.id);
  check(`${tag} coming back to Subjects mounts the strip at the top again`, back === "continueStrip", String(back));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-subjects-s2: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
