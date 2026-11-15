// The Owner, 15 Nov 2026, 3:17 pm (PCF MSA J138 n138b = A): "yes, only new words, not those which are already counted in the 'Already Known' list. But until user ticks they can be
// in other list. As soon as user ticks known words, they move." So the Learn next STEPS (First 10, First 25 ...) leave out every word the reader has TICKED in the Already known
// groups: ticked, a word leaves the steps and counts in Already known; unticked, it comes back; a word learned through the steps stays in them. The phone tile row is tidy (3+3+3).
//   node tools/i18n-verify/learn-known-steps-browser.mjs [--mutate=noexclude|stale|allwords|tilerow]
//   --mutate=noexclude  the steps ignore ticks                         -> "ticking a group word takes it out of First 10" FAILS
//   --mutate=stale      the step rows are not recomputed on a new tick  -> "ticking Rabb as well takes it out of First 10 too" FAILS
//   --mutate=allwords   the badge's words-known counts only step rows  -> "the words-known count still counts the ticked word" FAILS
//   --mutate=tilerow    "Already known" does not take its own row      -> "the phone tile row is 1 + 3+3+3" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noexclude: ["app/quranrevival.html", "      if (ex.size === 0) return c.data.rows;\n      const sig", "      return c.data.rows;\n      const sig"],
  stale: ["app/quranrevival.html", "if (stepRowsCache.base !== c.data.rows || stepRowsCache.sig !== sig) stepRowsCache", "if (stepRowsCache.base !== c.data.rows) stepRowsCache"],
  allwords: ["app/js/learn-next.js", "for (const row of allRows ?? []) if (isKnown(row))", "for (const row of rows ?? []) if (isKnown(row))"],
  tilerow: ["app/quranrevival.html", ".ln-tiles > .ln-tile-known { grid-column: 1 / -1;", ".ln-tiles > .ln-tile-known { grid-column: auto;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// ---- pure: the step rows
const { stepRowsExcluding, excludedFromSteps, knownGroupLemmas } = await import(`${process.cwd()}/app/js/known-groups.js`);
{
  const rows = [{ r: 1, l: "a", n: 10 }, { r: 2, l: "b", n: 5 }, { r: 3, l: "c", n: 3 }, { r: 4, l: "d", n: 2 }];
  check("pure: with nothing excluded the rows come back untouched", stepRowsExcluding(rows, new Set(), 20) === rows);
  const o = stepRowsExcluding(rows, new Set(["b"]), 20);
  check("pure: an excluded word leaves, the rest are renumbered 1.. with the original rank kept", o.map((r) => `${r.r}:${r.l}:${r.r0}`).join() === "1:a:1,2:c:3,3:d:4");
  check("pure: the running % starts from the excluded words (75, 90, 100)", o.map((r) => r.p).join() === "75,90,100", o.map((r) => r.p).join());
  check("pure: only a group word that IS known is excluded", [...excludedFromSteps(new Set(["a", "b"]), (l) => l === "b")].join() === "b");
  check("pure: the group lemmas are Allah's Names + the fixed groups + the language list", (() => { const s = knownGroupLemmas({ allahLemmas: ["x"], groups: [{ lemmas: ["y"] }] }, ["z"]); return s.has("x") && s.has("y") && s.has("z") && s.size === 3; })());
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const sleep = (page, ms) => page.waitForTimeout(ms);
const RABB = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-known-groups.json", "utf8")).names["101"];
const ALLAH = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-known-groups.json", "utf8")).names["132"]; // Allah, as the data names the word
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing/duplicated: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html", body: src.replace(a, b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  const read = () => page.evaluate(() => ({
    list: [...document.querySelectorAll("#learnNextSheet .ln-row")].map((r) => r.querySelector(".ln-ar")?.textContent ?? ""),
    first10: document.querySelector('#learnNextSheet [data-ln-tile="10"] .ln-tile-p')?.textContent ?? "",
    words: Number(document.querySelector("#learnNextSheet [data-vocab-badge]")?.dataset.vbWords ?? -1),
    sum: document.querySelector("#learnNextSheet [data-vb-sum]")?.textContent ?? "",
  }));
  const openFirst10 = async () => { await page.evaluate(() => { const s = document.querySelector("#learnNextSheet"); const g = s.querySelector("[data-ln-known-tile][aria-pressed=\"true\"]"); if (g) g.click(); }); await sleep(page, 200); await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]').click()); await sleep(page, 300); };
  const { lemmaText } = await import(`${process.cwd()}/app/js/lemma-text.js`);
  const allahTxt = lemmaText(ALLAH);
  await openFirst10();
  const before = await read();
  check(`${tag} POSITIVE CONTROL: First 10 lists 10 words including Allah (rank 2)`, before.list.length === 10 && before.list.some((x) => x.normalize("NFC").includes(allahTxt.normalize("NFC"))), JSON.stringify(before.list));
  // tick Allah in the Already known groups
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-known-tile]").click()); await sleep(page, 300);
  await page.evaluate((l) => { const el = document.querySelector(`#learnNextSheet [data-lnk-lemma="${CSS.escape(l)}"]`); el.scrollIntoView(); el.click(); }, ALLAH);
  await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]") && document.querySelector("#learnNextSheet [data-lnk-head]"), null, { timeout: 20000 }).catch(() => {});
  await sleep(page, 900);
  await openFirst10();
  const after = await read();
  check(`${tag} ticking a group word takes it out of First 10 (still 10 words: the next one moved in)`, after.list.length === 10 && !after.list.some((x) => x.normalize("NFC").includes(allahTxt.normalize("NFC"))), JSON.stringify(after.list));
  check(`${tag} a word that is not in a group stays in the steps (مِن, rank 1)`, after.list.some((x) => x.normalize("NFC").includes(lemmaText("مِن").normalize("NFC"))));
  const pct = (s) => parseFloat(s.replace(/[^\d.]/g, ""));
  check(`${tag} First 10's % now counts the ticked word and the ten new words (${before.first10} -> ${after.first10})`, pct(after.first10) > pct(before.first10));
  check(`${tag} the words-known count still counts the ticked word (${before.words} -> ${after.words})`, after.words === before.words + 1, `${before.words} -> ${after.words}`);
  check(`${tag} "steps passed" is still over nine steps (${after.sum})`, /9/.test(after.sum.replace(/[০-৯]/g, "")), after.sum);
  // a second tick: Rabb (rank 11) moved into First 10 when Allah left; ticking it takes it out again (the step rows are recomputed on every change)
  const rabbTxt = lemmaText(RABB);
  check(`${tag} after the first tick, Rabb (rank 11) had moved into First 10`, after.list.some((x) => x.normalize("NFC").includes(rabbTxt.normalize("NFC"))), JSON.stringify(after.list));
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-known-tile]").click()); await sleep(page, 300);
  await page.evaluate((l) => { const el = document.querySelector(`#learnNextSheet [data-lnk-lemma="${CSS.escape(l)}"]`); el.scrollIntoView(); el.click(); }, RABB);
  await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]"), null, { timeout: 20000 }).catch(() => {});
  await sleep(page, 900);
  await openFirst10();
  const two = await read();
  check(`${tag} ticking Rabb as well takes it out of First 10 too (two ticked words, ten words still)`, two.list.length === 10 && !two.list.some((x) => x.normalize("NFC").includes(rabbTxt.normalize("NFC"))) && !two.list.some((x) => x.normalize("NFC").includes(allahTxt.normalize("NFC"))), JSON.stringify(two.list));
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-known-tile]").click()); await sleep(page, 300);
  await page.evaluate((l) => { const el = document.querySelector(`#learnNextSheet [data-lnk-lemma="${CSS.escape(l)}"]`); el.scrollIntoView(); el.click(); }, RABB);
  await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]"), null, { timeout: 20000 }).catch(() => {});
  await sleep(page, 700);
  // untick Allah: it comes back (the groups are still open after the Rabb untick above)
  await page.evaluate((l) => { const el = document.querySelector(`#learnNextSheet [data-lnk-lemma="${CSS.escape(l)}"]`); el.scrollIntoView(); el.click(); }, ALLAH);
  await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]"), null, { timeout: 20000 }).catch(() => {});
  await sleep(page, 900);
  await openFirst10();
  const back = await read();
  check(`${tag} unticking brings it back to First 10, and the % returns (${back.first10})`, back.list.some((x) => x.normalize("NFC").includes(allahTxt.normalize("NFC"))) && back.list.length === 10 && back.first10 === before.first10, JSON.stringify([back.first10, back.list]));
  if (w === 390) {
    const rows = await page.evaluate(() => { const t = [...document.querySelectorAll("#learnNextSheet .ln-tiles > .ln-tile")].map((e) => Math.round(e.getBoundingClientRect().top)); const ys = [...new Set(t)]; return ys.map((y) => t.filter((v) => v === y).length); });
    check(`${tag} the phone tile row is 1 + 3+3+3 (rows: ${rows.join("+")})`, JSON.stringify(rows) === "[1,3,3,3]", JSON.stringify(rows));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Learn next steps leave out ticked words${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
