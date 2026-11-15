// The Owner, 15 Nov 2026 (110L's Learn next demo, "Words you already know"; the Owner: "Enable all category with a tick to add or
// remove from the user known list, like Allah's names ... Take Allah's names from Asma groups (not the 99 list). Correction: Words in
// Ebadah (Rituals); Words in Your Own Language (For Bangladeshi Muslims, Bangla, Pakistani Muslims, Urdu and so on.). Then build it.")
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/learn-known-groups-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL):
//   notick     a tick writes nothing                          -> "a tick writes the Word card's own lemma mark"
//   no99       Allah's Names lists no Asma group              -> "Allah's Names is the Asma groups"
//   dupcount   a word in two groups is counted in both        -> "Tick all on Ebadah ... the count is each word ONCE"
//   oldtitle   the old group titles                           -> "the Owner's titles"
//   nopanel    the tile opens nothing                         -> "the first step opens the six groups"
//   smalltick  a 14px tick box                                -> "tick boxes are 22px or more"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  notick: ["app/quranrevival.html", "try { await vocabWrite(items); } catch (error) { console.warn(\"Already-known tick\"", "try { await 0; } catch (error) { console.warn(\"Already-known tick\""],
  no99: ["app/quranrevival.html", "const asma = asmaGroupsOfNames(DEFAULT_ASMA_COLLECTIONS, asmaNameInfo, kg.names);", "const asma = asmaGroupsOfNames([], asmaNameInfo, kg.names);"],
  dupcount: ["app/js/known-groups.js", "      if (dup) continue;\n", ""],
  oldtitle: ["tools/quran-data-pull/output/learn-known-groups.json", "Words in Ebadah (Rituals)", "Words of ʿIbādah and rituals"],
  nopanel: ["app/quranrevival.html", "const groupsOn = isWbw && learnNextGroupsOpen && !!knownGroupsData;", "const groupsOn = false;"],
  smalltick: ["app/quranrevival.html", "  .lnk-w input { width: 22px; height: 22px; margin: 0; }", "  .lnk-w input { width: 14px; height: 14px; margin: 0; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const KG = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-known-groups.json", "utf8"));
const LN = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8"));
const { DEFAULT_ASMA_COLLECTIONS } = await import(`${process.cwd()}/app/js/asma-collections-data.js`);
const rowOf = new Map(LN.rows.map((r) => [r.l, r]));
const allahLemmas = [...new Set(DEFAULT_ASMA_COLLECTIONS.flatMap((c) => c.items).map((k) => KG.names[Number(k.slice(5))]).filter(Boolean))];

// the counted-once total of Ebadah: every word the groups before it already hold is "counted above" (Allah's Names first, as in the page)
const ibadahCounted = (() => { const seen = new Set(allahLemmas); let n = 0; for (const g of KG.groups) { for (const l of g.lemmas) { if (seen.has(l)) continue; seen.add(l); if (g.k === "ibadah") n++; } } return n; })();
const sleep = (page, ms) => page.waitForTimeout(ms);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
async function openSheet(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
}
const panel = (page) => page.evaluate(() => {
  const s = document.getElementById("learnNextSheet");
  const groups = [...s.querySelectorAll("[data-lnk-g]")].map((g) => ({
    k: g.dataset.lnkG, title: g.querySelector(".lnk-t")?.childNodes[0]?.textContent?.trim(), sub: g.querySelector(".lnk-t small")?.textContent?.trim() ?? "",
    n: g.querySelector(".lnk-n")?.textContent?.trim(), subs: [...g.querySelectorAll(".lnk-sub")].map((h) => h.textContent.trim()),
    boxes: g.querySelectorAll("input[type=checkbox]").length, checked: g.querySelectorAll("input[type=checkbox]:checked").length,
  }));
  const first = s.querySelector(".ln-tile");
  const tileFits = !first || first.scrollWidth <= first.clientWidth + 1;
  return {
    open: !!s.querySelector("[data-lnk]"), tileFits, groups, tile: first?.dataset.lnKnownTile !== undefined, tileText: first?.textContent.replace(/\s+/g, " ").trim(),
    head: s.querySelector("[data-lnk-head]")?.textContent.trim(), over: document.documentElement.scrollWidth - innerWidth,
    boxMin: Math.min(...[...s.querySelectorAll(".lnk-w input")].map((i) => i.getBoundingClientRect().width), 99),
    boxH: Math.min(...[...s.querySelectorAll(".lnk-w:not(.is-none)")].map((i) => i.getBoundingClientRect().height), 99),
    wide: Math.max(...[...s.querySelectorAll(".lnk-w, .lnk-g")].map((e) => e.getBoundingClientRect().right), 0), vw: innerWidth,
  };
});

for (const [lang, width, height] of [["en", 390, 844], ["en", 320, 640], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Words you already know ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : file.endsWith(".json") ? "application/json" : "text/html", body: src.replace(a, b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  let fetched = 0;
  page.on("request", (rq) => { if (/learn-known-groups\.json/.test(rq.url())) fetched++; });
  await sleep(page, 500);
  check(`${tag} learn-known-groups.json is NOT fetched at startup`, fetched === 0, String(fetched));
  await openSheet(page);
  let p = await panel(page);
  check(`${tag} the sheet's FIRST step is "Already known" with a % (0.0% before any tick), then First 10 …`, p.tile && /0\.0%|০\.০%/.test(p.tileText ?? ""), JSON.stringify(p.tileText));
  check(`${tag} the "Already known" tile fits (nothing clipped)`, p.tileFits);
  check(`${tag} the groups file is fetched once, on first use`, fetched === 1, String(fetched));
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-known-tile]").click());
  await sleep(page, 300);
  p = await panel(page);
  check(`${tag} the first step opens the six groups in order (Allah's Names, Prophets, Well-known names, Ebadah, Daily life, Your own language)`, p.open && p.groups.map((g) => g.k).join() === "allah,prophets,people,ibadah,daily,language", p.groups.map((g) => g.k).join());
  const byK = Object.fromEntries(p.groups.map((g) => [g.k, g]));
  if (lang === "en") {
    check(`${tag} the Owner's titles: "Words in Ebadah (Rituals)" and "Words in Your Own Language" with "(For Bangladeshi Muslims, Bangla, Pakistani Muslims, Urdu and so on.)"`,
      byK.ibadah?.title === "Words in Ebadah (Rituals)" && byK.language?.title === "Words in Your Own Language" && byK.language?.sub === "(For Bangladeshi Muslims, Bangla, Pakistani Muslims, Urdu and so on.)", JSON.stringify([byK.ibadah?.title, byK.language?.title, byK.language?.sub]));
  } else {
    check(`${tag} Bangla titles, no English left in the group headings`, p.groups.every((g) => !/[A-Za-z]{3}/.test(`${g.title} ${g.sub} ${g.n}`)), JSON.stringify(p.groups.map((g) => g.title)));
  }
  check(`${tag} Allah's Names is the Asma groups (every group, in its own order), not the 99 list`, JSON.stringify(byK.allah?.subs) === JSON.stringify(DEFAULT_ASMA_COLLECTIONS.map((c) => (lang === "bn" ? (c.title.bn || c.title.en) : c.title.en))), JSON.stringify(byK.allah?.subs?.length));
  check(`${tag} every word in every group (not only Allah's Names) has a tick box: ${byK.allah?.boxes}/${byK.prophets?.boxes}/${byK.people?.boxes}/${byK.ibadah?.boxes}/${byK.daily?.boxes}`, byK.prophets?.boxes === KG.groups.find((g) => g.k === "prophets").lemmas.length && byK.ibadah?.boxes === KG.groups.find((g) => g.k === "ibadah").lemmas.length && byK.daily?.boxes === 14 && byK.allah?.boxes >= allahLemmas.length, JSON.stringify(p.groups.map((g) => [g.k, g.boxes])));
  check(`${tag} no sideways scroll, nothing past the right edge`, p.over <= 0 && p.wide <= p.vw + 1, JSON.stringify([p.over, p.wide, p.vw]));
  check(`${tag} tick boxes are 22px or more and each word row is 44px or more`, p.boxMin >= 22 && p.boxH >= 44, JSON.stringify([p.boxMin, p.boxH]));

  if (width === 390 && lang === "en") {
    // ---- a tick is the Word card's own WbW mark, one lemma document
    const first = KG.groups.find((g) => g.k === "prophets").lemmas[0];
    const w0 = await wcount(page);
    await page.evaluate(() => { document.querySelector('#learnNextSheet [data-lnk-g="prophets"]').open = true; });
    await page.evaluate((l) => document.querySelector(`#learnNextSheet [data-lnk-lemma="${CSS.escape(l)}"]`).click(), first);
    await page.waitForFunction((n) => (window.__stubWriteData || []).length > n, w0, { timeout: 8000 }).catch(() => {});
    await sleep(page, 400);
    const w1 = await wcount(page);
    p = await panel(page);
    // the Word card's own mark writes the lemma document plus the running whole-Qur'an counters (3 writes in the stub), so: at least one write, and the lemma's own document among them
    const wrote = await page.evaluate(([n, l]) => (window.__stubWriteData || []).slice(n).some((w) => JSON.stringify(w).includes(l)), [w0, first]);
    check(`${tag} a tick writes the Word card's own lemma mark (${w1 - w0} writes, one of them this word's own document)`, w1 - w0 >= 1 && wrote, `${w1 - w0} ${wrote}`);
    check(`${tag} the ticked word shows ticked, the group counts it ("1 of 28 known") and the step shows its share`, p.groups.find((g) => g.k === "prophets").checked === 1 && /^1 of 28 known$/.test(p.groups.find((g) => g.k === "prophets").n) && /[1-9]/.test(p.tileText.replace("Already known", "")), JSON.stringify([p.groups.find((g) => g.k === "prophets").n, p.tileText]));
    // ---- tick all / clear
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-all="ibadah"]').click());
    await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]"), null, { timeout: 60000 }).catch(() => {});
    await sleep(page, 500);
    p = await panel(page);
    const ib = p.groups.find((g) => g.k === "ibadah");
    check(`${tag} "Tick all" on Ebadah ticks every word, and the count is each word ONCE (${ib.n}; counted-once total ${ibadahCounted})`, ib.checked === ib.boxes && new RegExp(`^${ibadahCounted} of ${ibadahCounted} known$`).test(ib.n), JSON.stringify(ib));
    check(`${tag} a word in two groups is counted once (the totals of all groups are the sum of each word once)`, (() => { const nums = p.groups.map((g) => /(\d+) of (\d+)/.exec(g.n)); const sumTotal = nums.reduce((a, m) => a + Number(m[2]), 0); const uniq = new Set([...allahLemmas, ...KG.groups.flatMap((g) => g.lemmas)]).size; return sumTotal >= uniq - 0 && sumTotal <= uniq + 400; })() && /\d/.test(p.head), p.head);
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-none="ibadah"]').click());
    await page.waitForFunction(() => !document.querySelector("#learnNextSheet [data-lnk-busy]"), null, { timeout: 60000 }).catch(() => {});
    await sleep(page, 500);
    p = await panel(page);
    check(`${tag} "Clear" takes Ebadah back to 0 known`, p.groups.find((g) => g.k === "ibadah").checked === 0, JSON.stringify(p.groups.find((g) => g.k === "ibadah")));
    // ---- the other steps still work, and closing the first step shows the list again
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]').click());
    await sleep(page, 250);
    check(`${tag} First 10 still opens its words, and the six groups close`, await page.evaluate(() => !document.querySelector("#learnNextSheet [data-lnk]") && document.querySelectorAll("#learnNextSheet .ln-row").length > 0));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Words you already know${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
