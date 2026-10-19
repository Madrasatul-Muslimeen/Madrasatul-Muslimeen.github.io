// Owner, 11 Oct 2026 (an Al-Burūj screenshot with four words circled: وَشَاهِدٍ 85:3:1, وَمَشْهُودٍ 85:3:2,
// شُهُودٌ 85:7:6, شَهِيدٌ 85:9:10): "same root n same meaning, therefore, achieving one should mark all achieved".
// Decision 58: WbW Achieved = the same dictionary word; BASIC Achieved = the same root with the same meaning
// (lemma-meaning-groups.json); Depth = the whole root. مَشْهُود (witnessed) had been kept in a group of its own,
// so Basic Achieved on شَاهِد marked three of the four. It joins شهد:1 (the witness group).
// Expected values are hand-written. Run from the repository root, with serve.js on :8080.
// MUTATE=apart serves the old groups file (مَشْهُود on its own) and must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const MASHHUD = "مَشْهُود";

async function enterRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
}
async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const waitMark = (page, s, a, p, want) => page.waitForFunction(([s, a, p, want]) => {
  const els = [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)];
  return els.length > 0 && els.some((e) => e.classList.contains("is-known-word")) === want;
}, [s, a, p, want], { timeout: 5000 }).then(() => true).catch(() => false);

const WORDS = [[3, 1, "وَشَاهِدٍ"], [3, 2, "وَمَشْهُودٍ"], [7, 6, "شُهُودٌ"], [9, 10, "شَهِيدٌ"]];
// Hand-written: which of the four each level's Achieved on 85:3:1 (شَاهِد) must mark.
// UPDATED IN PLACE 19 Oct 2026 (PCF MSA J38 1A, the Word card's five levels): Depth is now a study mark on the ROOT
// and never makes a word count as known, so Depth Achieved on شَاهِد marks NONE of the four. This is the reverse of
// what Depth did before (the whole root); the check still runs and now proves the new rule. WbW and Basic (now
// "Family") are unchanged.
const WANT = { wbw: [true, false, true, false], basic: [true, true, true, true], depth: [false, false, false, false] };

for (const level of ["wbw", "basic", "depth"]) for (const width of [390, 1280]) {
  const tag = `[${level} ${width}]`;
  console.log(`\n=== Al-Burūj: ${level} Achieved on وَشَاهِدٍ ${tag} ===`);
  const ctx = await newContext(browser, { appLang: "en", viewport: { width, height: width >= 768 ? 900 : 844 } });
  if (MUTATE === "apart") {
    await ctx.route("**/lemma-meaning-groups.json", async (r) => {
      const res = await r.fetch(); const data = await res.json();
      const id = data.byLemma[MASHHUD];
      if (!id) throw new Error("mutation target not found");
      data.groups[id] = data.groups[id].filter((l) => l !== MASHHUD); delete data.byLemma[MASHHUD];
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await enterRead(page);
  await goTo(page, 85, 3);
  check(`${tag} before any claim, وَمَشْهُودٍ is not marked`, await waitMark(page, 85, 3, 2, false));
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":85:3:1"]')?.click());
  await page.waitForTimeout(1200);
  if (level !== "wbw") { await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`); await page.waitForTimeout(1200); }
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  for (let i = 0; i < WORDS.length; i++) {
    const [a, p, w] = WORDS[i];
    await goTo(page, 85, a);
    const want = WANT[level][i];
    check(`${tag} ${w} (85:${a}:${p}) is ${want ? "" : "NOT "}marked known`, await waitMark(page, 85, a, p, want));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Known meaning groups, Al-Burūj${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
