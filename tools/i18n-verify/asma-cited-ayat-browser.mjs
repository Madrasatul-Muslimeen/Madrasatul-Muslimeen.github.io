// Owner, 9 Oct 2026 ("build it", after docs/reference/2026-10-09-asma-cited-ayat-demo.html): a Name open in Explore →
// Asma ul Husna writes out the āyāt it cites under its card. A word opens its Word card and "Āyah card" its Āyah card,
// at that āyah, with "Back to <Name>" returning to the Name (decision 86).
// Expected values written BY HAND from the platform data: Name 52 (Al-Wakil) cites 3:173 and 33:3; 3:173 has 17 words
// and 33:3 has 6; the words from the root و ك ل are 3:173:17 (ٱلْوَكِيلُ), 33:3:1 (وَتَوَكَّلْ) and 33:3:6 (وَكِيلًا).
// Run from the repository root, serve.js on :8080.
//   --mutate=nocited   the Name panel never draws the āyāt      -> every check after the first fails
//   --mutate=noroots   no word is marked                        -> the "marked" check fails
//   --mutate=noback    no way back is set                       -> the Back checks fail
//   --mutate=bnfont    the word rule loses its id                -> in Bangla the words fall into a Bangla face: fails
//   --mutate=pillonly  the Word card's way back stays a pill    -> on a phone the Word card covers it: the check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nocited: ["quranrevival.html", "      renderAsmaXCitedAyat(entry, asmaXGroupId, asmaXNumber);\n", "\n"],
  noroots: ["js/asma-cited-ayat.js", "      if (root && bare(w?.morphology?.lemma) === name) roots.add(root);", "      void root;"],
  noback: ["quranrevival.html", '      const backToName = (inWordCard = false) => setAppReturn(t("Back to {name}", { name }), "", () => returnToAsmaName(number, groupId, false), { inWordCard });', "      const backToName = () => {};"],
};
MUT.bnfont = ["quranrevival.html", "  #asmaXCitedAyat .asmax-cited-word {", "  .asmax-cited-word {"];
MUT.pillonly = ["quranrevival.html", "        backToName(true);", "        backToName(false);"];
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const HITS = ["3:173:17", "33:3:1", "33:3:6"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms) => P.waitForTimeout(ms);
const noSplash = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));

async function openName(P) {
  await noSplash(P);
  await P.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await settle(P, 900);
  await P.evaluate(() => document.getElementById("explorePaletteAsmaBtn")?.click()); await settle(P, 1200);
  await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 10000 }).catch(() => {});
  await P.selectOption("#asmaXSingleSelect", "52").catch(() => {});
  await P.waitForFunction(() => document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length === 2, null, { timeout: 10000 }).catch(() => {});
}
// The way back: inside the Word card ([data-word-card-app-back]), else the floating pill. Both must be ON SCREEN and
// the topmost thing at their own centre (on a phone the Word card covers the pill, which is why it moves inside).
const wayBack = (P, sel) => P.evaluate((sel) => {
  const b = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length);
  if (!b) return null;
  const r = b.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { text: b.textContent.trim(), reachable: !!top && (top === b || b.contains(top)), h: Math.round(r.height) };
}, sel);
async function backToName(P, tag, bn, sel) {
  const w = await wayBack(P, sel);
  // The Name in the reader's language: Al-Wakil / আল-ওয়াকীল (asmaEntryDisplayName()).
  check(`${tag} the way back reads "${bn ? "আল-ওয়াকীল-এ ফিরুন" : "Back to Al-Wakil"}", on top and reachable`, !!w && w.reachable && w.text.includes(bn ? "আল-ওয়াকীল-এ ফিরুন" : "Back to Al-Wakil"), JSON.stringify(w));
  if (!w?.reachable) return;
  await P.click(sel);
  await P.waitForFunction(() => document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length === 2, null, { timeout: 10000 }).catch(() => {});
  const back = await P.evaluate(() => ({ poster: !!document.getElementById("asmaXPosterPanel"), cited: document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length, sel: document.getElementById("asmaXSingleSelect")?.value }));
  check(`${tag} ...and it lands on Al-Wakil in Explore again, with its āyāt`, back.poster && back.cited === 2, JSON.stringify(back));
}

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`, bn = lang === "bn";
  const ctx = await newContext(browser, { appLang: bn ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openName(P);
  const v = await P.evaluate(() => {
    const arts = [...document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]")];
    const sec = document.getElementById("asmaXCitedAyat");
    return {
      shown: !!sec && !sec.hidden && sec.getBoundingClientRect().height > 0,
      keys: arts.map((a) => a.dataset.asmaxCited),
      words: arts.map((a) => a.querySelectorAll("[data-asmax-cited-word]").length),
      hits: [...document.querySelectorAll("#asmaXCitedAyat .asmax-cited-word.hit")].map((w) => w.dataset.asmaxCitedWord),
      tr: arts.map((a) => a.querySelector(".asmax-cited-tr")?.textContent ?? ""),
      label: sec?.querySelector(".asmax-cited-label")?.textContent ?? "",
      over: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("#asmaXCitedAyat button")].filter((b) => b.getBoundingClientRect().height < 40).length,
      wordRtl: getComputedStyle(document.querySelector("#asmaXCitedAyat .asmax-cited-words") ?? document.body).direction,
      font: getComputedStyle(document.querySelector("#asmaXCitedAyat .asmax-cited-word") ?? document.body).fontFamily,
      trColor: getComputedStyle(document.querySelector("#asmaXCitedAyat .asmax-cited-tr") ?? document.body).color,
    };
  });
  check(`${tag} Al-Wakil open: its two āyāt are written out (3:173, 33:3)`, v.shown && v.keys.join() === "3:173,33:3", JSON.stringify(v.keys));
  check(`${tag} ...every word is a button (17 and 6), right to left`, v.words.join() === "17,6" && v.wordRtl === "rtl", JSON.stringify([v.words, v.wordRtl]));
  check(`${tag} ...the words from the Name's root are marked: ${HITS.join(", ")}`, v.hits.join() === HITS.join(), JSON.stringify(v.hits));
  // In Bangla, shell.css sets every button in a Bangla face; the Qur'an words must keep the Qur'an font (found at review:
  // the words were buttons in Noto Sans Bengali and showed empty boxes for the small high marks).
  check(`${tag} ...the words are set in the Qur'an font`, /QR Scheherazade/.test(v.font), v.font);
  // The translation sits on Explore's dark panel: it must be light (.ayah-translation's #333 was unreadable there).
  check(`${tag} ...the translation is light on the dark panel`, (() => { const m = v.trColor.match(/\d+/g)?.map(Number) ?? [0, 0, 0]; return (m[0] + m[1] + m[2]) / 3 > 180; })(), v.trColor);
  check(`${tag} ...the translation is in the reader's language`, bn ? (v.tr[0] ?? "").includes("আল্লাহই যথেষ্ট") : (v.tr[0] ?? "").includes("Disposer of affairs"), (v.tr[0] ?? "").slice(0, 80));
  check(`${tag} ...the heading names the Name in the reader's language`, bn ? v.label === "যে আয়াতগুলোতে আল-ওয়াকীল নামটি এসেছে" : v.label === "The āyāt Al-Wakil is named in", v.label);
  check(`${tag} ...no sideways scroll; every button at least 40px tall`, v.over <= 0 && v.small === 0, JSON.stringify([v.over, v.small]));
  if (width === 390) await P.screenshot({ path: `/tmp/asma-cited-${lang}-${width}.png` });

  // A word → its Word card, at that āyah.
  await P.evaluate(() => document.querySelector('[data-asmax-cited-word="3:173:17"]')?.click());
  await P.waitForFunction(() => { const m = document.getElementById("quranWordCardMount"); return m && !m.hidden && m.textContent.includes("ٱلْوَكِيلُ"); }, null, { timeout: 12000 }).catch(() => {});
  const wc = await P.evaluate(() => { const m = document.getElementById("quranWordCardMount"); return { open: !!m && !m.hidden, word: m?.textContent.includes("ٱلْوَكِيلُ"), explore: !!document.getElementById("asmaXPosterPanel")?.getClientRects().length }; });
  check(`${tag} tapping ٱلْوَكِيلُ opens its Word card (3:173:17), Explore closed`, wc.open && wc.word && !wc.explore, JSON.stringify(wc));
  await backToName(P, `${tag} Word card:`, bn, "[data-word-card-app-back]");

  // "Āyah card" → that āyah's card.
  await P.evaluate(() => document.querySelector('[data-asmax-cited-card="33:3"]')?.click());
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 12000 }).catch(() => {});
  const ac = await P.evaluate(() => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("#ayahActionSheetMount .ayah-sheet-ref")?.textContent ?? "" }));
  check(`${tag} "Āyah card" opens the card for 33:3`, ac.open && (bn ? ac.ref.includes("৩৩:৩") : ac.ref.includes("33:3")), JSON.stringify(ac));
  // The Āyah card covers the page while it is open (as everywhere in the app); closing it uncovers the way back.
  await P.click("#ayahActionSheetMount [data-ayah-sheet-close]").catch(() => {});
  await settle(P, 400);
  await backToName(P, `${tag} Āyah card, closed:`, bn, "#ayahCardBackPill [data-ayah-card-back]");
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma: a Name's cited āyāt: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
