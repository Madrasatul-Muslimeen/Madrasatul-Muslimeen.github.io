// PCF MSA J48 round 2 -- the Vocabulary review schedule kept in the account (quranVocabReview), real data.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/vocab-review-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL, exit 1):
//   PURE (app/js/vocab-review.js changed in memory and re-imported):
//     interval   the spacing is 1, 2, 3, 8, 16                  -> "right answers come back after 1, 2, 4, 8, 16 days"
//     wrongkeep  a missed word keeps its box                    -> "a missed word goes to box 0, due tomorrow"
//     duelt      a word due TODAY is not due                    -> "due today counts"
//     lenient    a word with one wrong question counts right   -> "a word is right only if every question about it was right"
//     monthend   addDays ignores the month                      -> "days roll over month and year ends"
//   STATIC (the data layer against the published Rules):
//     extrafield the update writes a second field               -> "an update writes `words` only"
//     contract   the contract string drifts from the Rules     -> "contractVersion equals the Rules'"
//   BROWSER (page source changed in flight):
//     nostrip    Learn next shows no "Due today"                -> "Learn next says Due today: 3 words"
//     noload     Learn next never reads the schedule            -> "opening Learn next reads the schedule once"
//     nosave     a round never saves the schedule               -> "the review round writes ONE update"
//     noi15      a failed save is silent                        -> "a failed save says so in words"
//     isodate    a later review day prints as 2026-10-26        -> "a later review day reads as a date"
//     bnleak     one Bangla string is missing                   -> "Bangla has no English"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const OUT = "tools/quran-data-pull/output/";
const VR = "app/js/vocab-review.js", VRD = "app/js/vocab-review-data.js", PAGE = "app/quranrevival.html";
const PURE_MUT = {
  interval: ["export const INTERVALS = Object.freeze([1, 2, 4, 8, 16]);", "export const INTERVALS = Object.freeze([1, 2, 3, 8, 16]);"],
  wrongkeep: ["const b = right ? Math.min(box + 1, TOP_BOX) : 0;", "const b = right ? Math.min(box + 1, TOP_BOX) : box;"],
  duelt: ["return !!entry && typeof entry.due === \"string\" && entry.due <= today;", "return !!entry && typeof entry.due === \"string\" && entry.due < today;"],
  lenient: ["for (const r of t.wrongRanks) verdict.set(r, false);", "for (const r of t.wrongRanks) verdict.set(r, true);"],
  monthend: ["d.setUTCDate(d.getUTCDate() + n);", "d.setUTCDate(Math.min(d.getUTCDate() + n, 28));"],
};
const STATIC_MUT = {
  extrafield: [VRD, "await updateDocument(db, TENANT.QURAN_VOCAB_REVIEW, id, { words });", "await updateDocument(db, TENANT.QURAN_VOCAB_REVIEW, id, { words, personId });"],
  contract: [VRD, "export const VOCAB_REVIEW_CONTRACT = \"quran-vocab-review:v1\";", "export const VOCAB_REVIEW_CONTRACT = \"quran-vocab-review:v2\";"],
};
const MUT = {
  nostrip: [PAGE, "      if (due) return `<p class=\"ln-review-msg\">", "      if (false) return `<p class=\"ln-review-msg\">"],
  noload: [PAGE, "      ensureVocabReview().then(paintLearnNextReview).catch(", "      Promise.resolve().then(() => {}).catch("],
  nosave: [PAGE, "        const words = await saveVocabReview(db, {", "        const words = null; ({"],
  noi15: [PAGE, "        else if (v.saved === false) more +=", "        else if (false) more +="],
  isodate: [PAGE, "Nothing due today. Next review: {day}\", { day })", "Nothing due today. Next review: {day}\", { day: s.next })"],
  bnleak: ["app/js/i18n/bn.js", "  \"Review now\": \"এখন পুনরালোচনা করুন\",\n", ""],
};
if (MUTATE && !MUT[MUTATE] && !PURE_MUT[MUTATE] && !STATIC_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const rows = JSON.parse(fs.readFileSync(OUT + "learn-next.json", "utf8")).rows;
const mutated = (file, table) => { let src = fs.readFileSync(file, "utf8"); const m = table[MUTATE]; if (m && (m.length === 2 || m[0] === file)) { const [a, b] = m.length === 2 ? m : m.slice(1); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(a).join(b); } return src; };

// ---------------------------------------------------------------- PURE
console.log("\n=== pure: app/js/vocab-review.js ===");
let R;
{
  let src = mutated(VR, PURE_MUT);
  src = src.replace('from "./vocabulary.js"', `from "${process.cwd()}/app/js/vocabulary.js"`);
  fs.writeFileSync("/tmp/vocab-review-under-test.mjs", src);
  R = await import("/tmp/vocab-review-under-test.mjs?" + Date.now());
}
{
  const T = "2026-10-21", AT = "2026-10-21T01:00:00.000Z";
  let e = null; const dues = [];
  for (let i = 0; i < 6; i++) { e = R.nextEntry(e, true, T, AT); dues.push(e.due); }
  check("right answers come back after 1, 2, 4, 8, 16 days (and stay at 16 at the top box)",
    JSON.stringify(dues) === JSON.stringify(["2026-10-22", "2026-10-23", "2026-10-25", "2026-10-29", "2026-11-06", "2026-11-06"]) && e.b === 5 && e.n === 6, JSON.stringify(dues));
  const missed = R.nextEntry({ b: 4, due: "2026-10-20", r: "right", at: "x", n: 3 }, false, T, AT);
  check("a missed word goes to box 0, due tomorrow, counted once more", missed.b === 0 && missed.due === "2026-10-22" && missed.r === "wrong" && missed.n === 4 && missed.at === AT, JSON.stringify(missed));
  check("days roll over month and year ends", R.addDays("2026-10-31", 1) === "2026-11-01" && R.addDays("2026-12-31", 16) === "2027-01-16" && R.addDays("2027-02-28", 1) === "2027-03-01");
  const words = { a: { b: 1, due: "2026-10-21" }, b: { b: 0, due: "2026-10-19" }, c: { b: 3, due: "2026-10-22" }, d: { b: 2, due: "2026-10-19" } };
  check("due today counts; tomorrow does not; the longest-waiting first, then the lower box", JSON.stringify(R.dueKeys(words, T)) === JSON.stringify(["b", "d", "a"]), JSON.stringify(R.dueKeys(words, T)));
  const s = R.summary(words, T);
  check("the summary counts 3 due, 1 later, next on the 22nd", s.due === 3 && s.later === 1 && s.next === "2026-10-22", JSON.stringify(s));
  const ans = [{ rank: 1, right: true }, { rank: 2, right: true }, { rank: 2, right: false }, { rank: 3, right: false }];
  const w = R.scheduleWrites(rows, ans, {}, T, AT);
  check("a word is right only if every question about it was right (one entry per word asked)",
    Object.keys(w).length === 3 && w[rows[0].l].b === 1 && w[rows[1].l].b === 0 && w[rows[2].l].b === 0, JSON.stringify(w));
  const ten = (n) => Array.from({ length: 10 }, (_, i) => ({ rank: 1, right: i < n }));
  check("the one-word round: 9 of 10 counts the word right, 8 of 10 missed",
    R.scheduleWrites(rows, ten(9), {}, T, AT, { byQuestions: true })[rows[0].l].b === 1 && R.scheduleWrites(rows, ten(8), {}, T, AT, { byQuestions: true })[rows[0].l].b === 0);
  const many = Object.fromEntries(rows.slice(0, 30).map((r, i) => [r.l, { b: 1, due: R.addDays(T, -(i % 5)) }]));
  const deck = R.reviewDeck(rows, many, T);
  check("a review round asks at most 10 due words, the longest-waiting first", deck.length === 10 && deck.every((r) => many[r.l].due === R.addDays(T, -4) || many[r.l].due === R.addDays(T, -3)), deck.map((r) => many[r.l].due).join());
}
if (PURE_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

// ---------------------------------------------------------------- STATIC: the data layer against the published Rules
console.log("\n=== static: vocab-review-data.js against firestore.rules ===");
{
  const data = mutated(VRD, STATIC_MUT);
  const rules = fs.readFileSync("firestore.rules", "utf8");
  const block = rules.slice(rules.indexOf("function isVocabReviewCreate"), rules.indexOf("never by the document going."));
  check("POSITIVE CONTROL: the Rules carry the quranVocabReview block", block.includes("match /quranVocabReview/{reviewKey}") && block.length > 500);
  const ruleContract = /contractVersion', ''\) == '([^']+)'/.exec(block)?.[1];
  const dataContract = /VOCAB_REVIEW_CONTRACT = "([^"]+)"/.exec(data)?.[1];
  check("contractVersion equals the Rules'", !!ruleContract && ruleContract === dataContract, `${ruleContract} / ${dataContract}`);
  const hasOnly = /hasOnly\(\[([^\]]+)\]\)\s*\n?\s*&& request\.resource\.data\.keys\(\)\.hasAll/.exec(block)?.[1] ?? /keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/.exec(block)?.[1];
  const allowed = new Set((hasOnly ?? "").match(/'[^']+'/g)?.map((x) => x.slice(1, -1)) ?? []);
  const createBody = /createDocument\(db, TENANT\.QURAN_VOCAB_REVIEW, id, \{([^}]*)\}, uid\)/.exec(data)?.[1] ?? "";
  const createKeys = createBody.split(",").map((f) => f.trim().split(":")[0].trim()).filter(Boolean);
  check("a create writes exactly the fields the Rules allow (plus the I17 envelope createDocument adds)",
    allowed.size === 8 && createKeys.length === 4 && createKeys.every((k) => allowed.has(k)) && ["contractVersion", "tenantId", "personId", "words"].every((k) => createKeys.includes(k)), `${[...allowed]} / ${createKeys}`);
  const upd = [...data.matchAll(/updateDocument\(db, TENANT\.QURAN_VOCAB_REVIEW, id, \{([^}]*)\}\)/g)].map((m) => m[1].split(",").map((f) => f.trim().split(":")[0].trim()));
  const ruleUpd = /affectedKeys\(\)\.hasOnly\(\[([^\]]+)\]\)/.exec(block)?.[1];
  check("an update writes `words` only (updateDocument adds updatedAt; the Rules allow just those two)",
    upd.length === 1 && JSON.stringify(upd[0]) === JSON.stringify(["words"]) && ruleUpd?.replace(/\s/g, "") === "'words','updatedAt'", JSON.stringify(upd));
  check("the document id is `${tenantId}__${personId}`, the key the Rules bind", /return `\$\{tenantId\}__\$\{personId\}`;/.test(data) && block.includes("reviewKey == request.resource.data.tenantId + '__' + request.resource.data.personId"));
  check("nothing here deletes (I4/D6)", !/deleteDoc|deleteField/.test(data));
}
if (STATIC_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

// ---------------------------------------------------------------- BROWSER
const L = rows.slice(0, 4).map((r) => r.l);
const SEED = `(function () {
  const p = (n) => String(n).padStart(2, "0");
  const d = (o) => { const x = new Date(); x.setDate(x.getDate() + o); return x.getFullYear() + "-" + p(x.getMonth() + 1) + "-" + p(x.getDate()); };
  const L = ${JSON.stringify(L)};
  DATA.quranVocabReview = [{ _id: "t1__p1", tenantId: "t1", personId: "p1", contractVersion: "quran-vocab-review:v1", schemaVersion: 1, createdBy: "uid",
    words: { [L[0]]: { b: 2, due: d(-3), r: "right", at: "x", n: 2 }, [L[1]]: { b: 0, due: d(0), r: "wrong", at: "x", n: 1 },
             [L[2]]: { b: 4, due: d(-1), r: "right", at: "x", n: 4 }, [L[3]]: { b: 3, due: d(5), r: "right", at: "x", n: 3 } } }];
})();`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const sleep = (page, ms) => page.waitForTimeout(ms);
const nfc = (s) => String(s).normalize("NFC");
const { lemmaText } = await import(`${process.cwd()}/app/js/lemma-text.js`);
const { addDays, dayOf } = await import(`${process.cwd()}/app/js/vocab-review.js`);
const rowOfAr = (s) => rows.find((r) => nfc(lemmaText(r.l)) === nfc(s));
const meanOf = (r, lang) => (lang === "bn" ? r.b : r.e);
const schedWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranVocabReview"));
const schedReads = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "quranVocabReview" && /get/i.test(r.kind)).length);
async function openLearnNext(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => (document.querySelector("#learnNextSheet [data-ln-review]")?.textContent ?? "").trim().length > 0, null, { timeout: 4000 }).catch(() => {});
}
/** Answer the open question: right unless its word is `missLemma`. Returns the word asked. */
async function answer(page, lang, missLemma) {
  const info = await page.evaluate(() => {
    const card = document.querySelector("#vocabSheet .vo-card");
    return { kind: card?.dataset.voKind, ar: card?.querySelector(".vo-ar")?.textContent ?? null, mean: card?.querySelector(".vo-mean")?.textContent ?? null, occ: card?.querySelector(".vo-ring")?.dataset.voTarget ?? null, opts: [...document.querySelectorAll("#vocabSheet [data-vo=pick]")].map((b) => b.textContent.trim()) };
  });
  let row = null;
  if (info.kind === "meaning") row = rowOfAr(info.ar);
  else if (info.kind === "arabic") row = rows.find((r) => meanOf(r, lang) === info.mean);
  else if (info.kind === "ayah") { const t = info.occ.split(":").map(Number); row = rows.find((r) => r.o === t[0] * 1000000 + t[1] * 1000 + t[2]); }
  if (!row) throw new Error("could not tell which word was asked: " + JSON.stringify(info));
  const want = info.kind === "arabic" ? lemmaText(row.l) : meanOf(row, lang);
  const idx = info.opts.findIndex((o) => nfc(o) === nfc(want));
  const right = row.l !== missLemma;
  await page.evaluate((i) => document.querySelectorAll("#vocabSheet [data-vo=pick]")[i].click(), right ? idx : info.opts.findIndex((_, i) => i !== idx));
  await sleep(page, 200);
  return row;
}

for (const [lang, width, height] of [["en", 390, 844], ["en", 320, 640], ["en", 768, 900], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Vocabulary review ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  const today = await page.evaluate(() => { const x = new Date(), p = (n) => String(n).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; });
  check(`${tag} nothing reads the schedule at startup (I9)`, (await schedReads(page)) === 0);
  await openLearnNext(page);
  check(`${tag} opening Learn next reads the schedule once`, (await schedReads(page)) === 1, String(await schedReads(page)));
  const strip = await page.evaluate(() => { const s = document.querySelector("#learnNextSheet [data-ln-review]"); const b = s?.querySelector("[data-ln-review-go]"); const r = b?.getBoundingClientRect(); const c = b ? getComputedStyle(b) : null; const sheet = document.getElementById("learnNextSheet"); return { text: s?.textContent.trim() ?? "", h: r?.height ?? 0, right: r?.right ?? 0, w: document.documentElement.clientWidth, bg: c?.backgroundColor, fg: c?.color, over: sheet.scrollWidth - sheet.clientWidth }; });
  const digits = (s) => s.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
  check(`${tag} Learn next says Due today: 3 words (2 overdue + 1 due today; the word due in 5 days waits)`, /3/.test(digits(strip.text)) && strip.h > 0, strip.text);

  check(`${tag} Review now is 44px+, inside the screen, no sideways scroll`, strip.h >= 44 && strip.right <= strip.w && strip.over <= 0, JSON.stringify(strip));
  check(`${tag} Review now is painted in the Vocabulary purple token (rgb(75, 42, 133), white text)`, strip.bg === "rgb(75, 42, 133)" && strip.fg === "rgb(255, 255, 255)", `${strip.bg} / ${strip.fg}`);
  if (lang === "bn") check(`${tag} Bangla has no English in the strip`, strip.text.length > 0 && !/[A-Za-z]{2,}/.test(strip.text), strip.text);

  if (width === 390 || width === 320) {
    // ---- the review round: the three due words, L[2] missed
    const w0 = (await schedWrites(page)).length;
    await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-review-go]").click());
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
    const asked = [];
    for (let i = 0; i < 3; i++) { const r = await answer(page, lang, L[2]); asked.push(r.l); if (await page.evaluate(() => !!document.querySelector("#vocabSheet [data-vo=next]"))) { await page.evaluate(() => document.querySelector("#vocabSheet [data-vo=next]").click()); await sleep(page, 250); } }
    check(`${tag} the review round asks the three due words, each once (never the word not yet due)`, asked.length === 3 && new Set(asked).size === 3 && [L[0], L[1], L[2]].every((l) => asked.includes(l)), JSON.stringify(asked));
    await page.waitForSelector("#vocabSheet [data-vo-sched]", { timeout: 8000 }).catch(() => {});
    const ws = (await schedWrites(page)).slice(w0);
    check(`${tag} the review round writes ONE update to t1__p1, carrying words only`, ws.length === 1 && ws[0].kind === "update" && ws[0].id === "t1__p1" && JSON.stringify(Object.keys(ws[0].data).sort()) === JSON.stringify(["updatedAt", "words"]), JSON.stringify(ws.map((w) => [w.kind, w.id, Object.keys(w.data)])));
    const words = ws[0]?.data.words ?? {};
    check(`${tag} right moves a word one box up and out by that box's days (box 2 → 3, back in 4 days; box 0 → 1, back tomorrow)`, words[L[0]]?.b === 3 && words[L[0]]?.due === addDays(today, 4) && words[L[1]]?.b === 1 && words[L[1]]?.due === addDays(today, 1), JSON.stringify([words[L[0]], words[L[1]]]));
    check(`${tag} the missed word drops to box 0, back tomorrow`, words[L[2]]?.b === 0 && words[L[2]]?.due === addDays(today, 1) && words[L[2]]?.r === "wrong", JSON.stringify(words[L[2]]));
    check(`${tag} the word not asked is kept exactly as it was`, words[L[3]]?.b === 3 && words[L[3]]?.n === 3, JSON.stringify(words[L[3]]));
    check(`${tag} the score screen says it was saved to the review schedule`, (await page.evaluate(() => document.querySelector("#vocabSheet [data-vo-sched]")?.dataset.voSched)) === "saved");
    await page.evaluate(() => document.querySelector("#vocabSheet [data-vo=close]")?.click());
    await sleep(page, 400);
    const after = await page.evaluate(() => { const p = document.querySelector("#learnNextSheet [data-ln-review-next]"); return { next: p?.dataset.lnReviewNext ?? null, text: p?.textContent.trim() ?? "" }; });
    const tomorrow = addDays(today, 1);
    check(`${tag} back on Learn next: nothing due today, next review tomorrow, said in words (the way back lands on the list)`, !(await page.evaluate(() => !!document.querySelector("#learnNextSheet [data-ln-review-go]"))) && after.next === tomorrow && (lang === "bn" ? after.text.includes("আগামীকাল") : /tomorrow\.$/.test(after.text)) && !(await page.evaluate(() => document.getElementById("learnNextSheet").hidden)), JSON.stringify(after));

    if (width === 390) {
      // ---- a failed save is said in words (I15): a step test writes no mark, so only the schedule is written
      await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]').click());
      await sleep(page, 250);
      await page.evaluate(() => { window.__stubFailWrites = true; document.querySelector("#learnNextSheet [data-ln-vocab=test]").click(); });
      await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
      for (let i = 0; i < 10; i++) { await answer(page, lang, null); }
      await page.waitForSelector("#vocabSheet [data-vo-sched]", { timeout: 8000 }).catch(() => {});
      const failMsg = await page.evaluate(() => { const p = document.querySelector("#vocabSheet [data-vo-sched]"); return p ? { k: p.dataset.voSched, c: getComputedStyle(p).color } : null; });
      check(`${tag} a failed save says so in words, in the app's red (I15)`, failMsg?.k === "failed" && failMsg.c === "rgb(122, 31, 31)", JSON.stringify(failMsg));
    }
  }
  await ctx.close();
}

// ---- a student with no schedule yet: the first round CREATES it
{
  const tag = "[en 390 first round]";
  console.log(`\n=== Vocabulary review ${tag} ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  await openLearnNext(page);
  const text = await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-review]")?.textContent.trim() ?? "");
  check(`${tag} with no schedule, Learn next says how review works`, /1, 2, 4, 8 and 16 days/.test(text), text);
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]').click());
  await sleep(page, 250);
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-vocab=practise]").click());
  await page.waitForSelector("#vocabSheet [data-vo=start]", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector("#vocabSheet [data-kind=meaning]").click());
  await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 10; i++) { await answer(page, "en", rows[0].l); await page.evaluate(() => document.querySelector("#vocabSheet [data-vo=next]")?.click()); await sleep(page, 250); }
  await page.waitForSelector("#vocabSheet [data-vo-sched]", { timeout: 8000 }).catch(() => {});
  const ws = await schedWrites(page);
  const c = ws[0]?.data ?? {};
  check(`${tag} the first round CREATES t1__p1 with the contract, its owner and the I17 envelope`, ws.length === 1 && ws[0].kind === "set" && ws[0].id === "t1__p1" && c.contractVersion === "quran-vocab-review:v1" && c.tenantId === "t1" && c.personId === "p1" && !!c.createdBy && c.schemaVersion === 1, JSON.stringify(ws.map((w) => [w.kind, w.id, Object.keys(w.data)])));
  const today = dayOf(new Date());
  check(`${tag} it holds the 10 words asked: 9 right in box 1 (tomorrow), the missed one in box 0 (tomorrow)`, Object.keys(c.words ?? {}).length === 10 && Object.values(c.words).filter((e) => e.b === 1).length === 9 && c.words[rows[0].l]?.b === 0 && Object.values(c.words).every((e) => e.due === addDays(today, 1)), JSON.stringify(c.words));
  await ctx.close();
}
// ---- nothing due, the next review in 5 days: the day reads as a date, never "2026-10-26"
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 390 later]`;
  console.log(`\n=== Vocabulary review ${tag} ===`);
  const LATER = SEED.replace(/due: d\((-3|0|-1)\)/g, "due: d(9)");
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: LATER });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  await openLearnNext(page);
  const p = await page.evaluate(() => { const x = document.querySelector("#learnNextSheet [data-ln-review-next]"); return { next: x?.dataset.lnReviewNext ?? null, text: x?.textContent.trim() ?? "" }; });
  const today = dayOf(new Date()), d5 = addDays(today, 5);
  const digits = (s) => s.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
  check(`${tag} a later review day reads as a date (its day of the month, no 2026-10-26)`, p.next === d5 && !/\d{4}-\d{2}-\d{2}/.test(digits(p.text)) && digits(p.text).includes(String(Number(d5.slice(8)))) && (lang !== "bn" || !/[A-Za-z]{2,}/.test(p.text)), JSON.stringify(p));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
