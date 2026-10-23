// PCF MSA J82 parts 1, 2, 4, 5 (the Owner, 23 Oct 2026):
//   1. "LEARN NEXT · Next up: <word>" opens THAT word's Word card (not the Vocabulary list); ← Back returns to the previous word.
//   2. Bookmark from the Āyah card: closing / cancelling / saving the Bookmark window brings the Āyah card back.
//   4. ‹ › one printed Mushaf page on the full-screen Mushaf (the bar's empty space).
//   5. The same ‹ › in the normal Read view (Mushaf on).
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/j82-learn-next-bookmark-pages-browser.mjs [--only=learn|bookmark|pages] [--lang=en|bn] [--mutate=NAME]
// One mutation per part, each restoring the old behaviour:
//   learn-list    the line opens the Vocabulary list again           -> the part 1 checks fail
//   bookmark-gone the Āyah card is not reopened                      -> the part 2 checks fail
//   page-skip     ‹ › move two pages                                 -> the part 4/5 "exactly one" checks fail
//   no-fullscreen ‹ › dropped from the bare-state :not() list       -> the full-screen checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only");
const MUT = {
  "learn-list": ["openLearnNextWord().catch((error) => console.warn(\"Learn next unavailable\", error)); return; } // J82", "openLearnNextSheet().catch((error) => console.warn(\"Learn next unavailable\", error)); return; } // J82"],
  "bookmark-gone": ["            if (!ayahSheetUnitKey) {\n              if (intro?.opening)", "            if (false) {\n              if (intro?.opening)"],
  "page-skip": ["const target = cur + dir;\n      if (!Number.isFinite(cur) || target < 1", "const target = cur + dir * 2;\n      if (!Number.isFinite(cur) || target < 1"],
  "no-fullscreen": [":not(#mushafPagePrevBtn):not(#mushafPageNextBtn) { display: none; }", " { display: none; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const waitFor = async (name, page, fn, arg0 = null, ms = 12000) => {
  try { await page.waitForFunction(fn, arg0, { timeout: ms }); return true; }
  catch { console.log(`  TIMEOUT waiting for: ${name}`); return false; }
};

async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function goTo(page, s, a) {
  await setSel(page, "surahSelect", String(s)); await page.waitForTimeout(1200);
  await setSel(page, "ayahSelect", String(a)); await page.waitForTimeout(900);
}
const digits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

// ---------------------------------------------------------------- part 1: Learn next
async function partLearn(lang, width, height) {
  const tag = `[learn ${lang} ${width}]`;
  const { ctx, page } = await start(lang, width, height);
  const rows = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8")).rows;
  const first = rows[1]; // rank 2: the purple line then names rank 1, a different word
  const s = Math.floor(first.o / 1000000), a = Math.floor((first.o % 1000000) / 1000), p = first.o % 1000;
  await goTo(page, s, a);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await waitFor("word card", page, () => !!document.querySelector("#quranWordCardMount .quran-word-card"));
  await waitFor("learn next line", page, () => !!document.querySelector("#quranWordCardMount .word-card-learnnext"));
  const cardId = () => page.evaluate(() => document.querySelector("#quranWordCardMount .quran-word-card")?.closest("[data-occurrence-id]")?.dataset.occurrenceId ?? null);
  const arWord = () => page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-learnnext-ar")?.textContent ?? null);
  const headWord = () => page.evaluate(() => (document.querySelector("#quranWordCardMount .quran-word-card")?.textContent ?? "").replace(/\s+/g, " ").slice(0, 400));
  const nfc = (x) => String(x ?? "").normalize("NFC");
  const before = await headWord();
  const next = nfc(await arWord());
  check(`${tag} POSITIVE CONTROL: the Word card is open on rank 1 and the purple line names a different word`, !!before && next.length > 0 && next !== nfc(first.l), `${before.slice(0, 60)} / ${next}`);
  const nextRow = rows.find((r) => nfc(r.l) === next);
  await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
  await waitFor("next word card", page, (w) => !!document.querySelector("#quranWordCardMount .quran-word-card") && !document.getElementById("learnNextSheet")?.offsetParent, null, 8000);
  await page.waitForTimeout(1500);
  const list = await page.evaluate(() => { const e = document.getElementById("learnNextSheet"); return !!e && !e.hidden; });
  const vocab = await page.evaluate(() => { const e = document.getElementById("vocabSheet"); return !!e && !e.hidden; });
  const after = await headWord();
  const wordNow = await page.evaluate(() => document.querySelector("#quranWordCardMount .quran-word-card [lang='ar']")?.textContent ?? "");
  check(`${tag} pressing the line opens the next word's card, not the list (Learn next list shown: ${list}, Vocabulary shown: ${vocab})`, !list && !vocab && after !== before, after.slice(0, 80));
  const hasNextWord = await page.evaluate((w) => (document.querySelector("#quranWordCardMount .quran-word-card")?.textContent ?? "").normalize("NFC").includes(w), next);
  const placed = await page.evaluate((o) => !!document.querySelector(`#quranWordCardMount [data-occurrence-id$=":${o}"], [data-word-occurrence="quran-word-occurrence:v1:${o}"]`), nextRow ? `${Math.floor(nextRow.o / 1000000)}:${Math.floor((nextRow.o % 1000000) / 1000)}:${nextRow.o % 1000}` : "0:0:0");
  check(`${tag} the card now shows the Learn next word (${next})`, hasNextWord || placed, `${wordNow}`);
  const back = await page.evaluate(() => { const b = document.querySelector("[data-ayah-card-back]"); const r = b?.getBoundingClientRect(); return b ? { label: b.getAttribute("aria-label"), h: Math.round(r.height), w: Math.round(r.width) } : null; });
  check(`${tag} a way back is offered ("Back to Word Card 1:...") and is a finger target`, !!back && /(Word Card|শব্দ কার্ড)/.test(back.label) && back.h >= 36, JSON.stringify(back));
  if (back) await page.evaluate(() => document.querySelector("[data-ayah-card-back]").click());
  await page.waitForTimeout(2000);
  const restored = await headWord();
  check(`${tag} ← Back returns to the previous word's card exactly as it was`, restored === before, `${restored.slice(0, 80)} vs ${before.slice(0, 80)}`);
  await ctx.close();
}

// ---------------------------------------------------------------- part 2: Bookmark window exits
async function partBookmark(lang, width, height) {
  const tag = `[bookmark ${lang} ${width}]`;
  const { ctx, page } = await start(lang, width, height);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await goTo(page, 57, 2);
  const cardOpen = () => page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") && !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"));
  const cardAyah = () => page.evaluate(() => document.querySelector("#ayahActionSheetMount [data-ayah-sheet]")?.dataset.ayahSheetKey ?? document.querySelector("#ayahActionSheetMount [data-ayah-sheet]")?.textContent.slice(0, 60) ?? "");
  const popOpen = () => page.evaluate(() => !!document.querySelector("[data-bm-pop-cancel]"));
  const exits = [["Cancel", async () => page.click("[data-bm-pop-cancel]")], ["Esc", async () => page.keyboard.press("Escape")], ["Save", async () => page.click("[data-bm-pop-save]")]];
  for (const [name, exit] of exits) {
    await page.evaluate(() => document.querySelector("[data-ayah-num-badge]")?.click());
    const opened = await waitFor("ayah card", page, () => !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"), null, 8000);
    check(`${tag} POSITIVE CONTROL (${name}): the Āyah card opens`, opened);
    const key0 = await cardAyah();
    await page.evaluate(() => document.querySelector("[data-ayah-sheet-bookmark]")?.click());
    await waitFor("bookmark window", page, () => !!document.querySelector("[data-bm-pop-cancel], [data-bm-exists-choice], [data-bm-choice]"), null, 8000);
    const pop = await popOpen();
    check(`${tag} (${name}) the Bookmark window is open and the card is closed`, pop && !(await cardOpen()), `pop=${pop}`);
    if (pop) await exit();
    await waitFor("card back", page, () => !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"), null, 5000).catch(() => {});
    await page.waitForTimeout(600);
    const back = await cardOpen(), key1 = await cardAyah();
    check(`${tag} (${name}) the Āyah card is open again for the same āyah`, !!back && key1 === key0, `${key1} vs ${key0}`);
    await page.evaluate(() => document.querySelector("[data-ayah-sheet-close]")?.click());
    await page.waitForTimeout(300);
    if (await page.evaluate(() => !!document.querySelector("[data-bm-pop-cancel]"))) await page.keyboard.press("Escape");
  }
  await ctx.close();
}

// ---------------------------------------------------------------- parts 4 and 5: ‹ › page buttons
const pageNow = (page) => page.evaluate(() => Number(document.getElementById("mushafPageRef")?.dataset.page || 0));
const navState = (page) => page.evaluate(() => {
  const out = {};
  for (const id of ["mushafPagePrevBtn", "mushafPageNextBtn"]) {
    const b = document.getElementById(id), r = b.getBoundingClientRect();
    const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    out[id] = { shown: r.width > 0, w: Math.round(r.width), h: Math.round(r.height), hit: !!hit && b.contains(hit), disabled: b.disabled, label: b.getAttribute("aria-label") };
  }
  const bar = document.getElementById("readBar");
  out.barH = Math.round(bar.getBoundingClientRect().height);
  out.over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return out;
});
const barHeightWithout = (page) => page.evaluate(() => {
  const bar = document.getElementById("readBar"), st = document.createElement("style");
  st.textContent = "#mushafPagePrevBtn,#mushafPageNextBtn{display:none!important}"; document.head.append(st);
  const h = Math.round(bar.getBoundingClientRect().height); st.remove(); return h;
});
async function partPages(lang, width, height) {
  const tag = `[pages ${lang} ${width}]`;
  const { ctx, page } = await start(lang, width, height);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(400);
  await goTo(page, 57, 2);
  await page.click("#readMushafBtn");
  await waitFor("mushaf pages", page, () => [...document.querySelectorAll("#pageViewContainer .hifz-page")].some((e) => e.offsetParent !== null));
  await waitFor("page ref", page, () => !!document.getElementById("mushafPageRef")?.dataset.page);
  await page.waitForTimeout(600);
  const unit0 = await page.evaluate(() => document.getElementById("unitTypeSelect").value);
  const p0 = await pageNow(page);
  check(`${tag} POSITIVE CONTROL: the Mushaf shows a printed page (${p0})`, p0 > 0 && p0 < 604, String(p0));
  const st = await navState(page);
  const L = lang === "bn" ? ["আগের পৃষ্ঠা", "পরের পৃষ্ঠা"] : ["Previous page", "Next page"];
  for (const [id, name] of [["mushafPagePrevBtn", L[0]], ["mushafPageNextBtn", L[1]]]) {
    const b = st[id];
    check(`${tag} ${id}: shown, ≥ 40px, nothing covers it, spoken name "${name}"`, b.shown && b.w >= 40 && b.h >= 40 && b.hit && b.label === name, JSON.stringify(b));
  }
  const without = await barHeightWithout(page);
  check(`${tag} the Read bar keeps its line count (height ${st.barH} vs ${without} without ‹ ›), no sideways overflow`, st.barH === without && st.over <= 0, JSON.stringify({ with: st.barH, without, over: st.over }));
  if (width === 390 || width === 1440) await page.screenshot({ path: `${SHOT_DIR}/j82-${lang}-${width}-normal.png` });
  await page.click("#mushafPageNextBtn");
  await waitFor("next page", page, (p) => Number(document.getElementById("mushafPageRef")?.dataset.page) !== p, p0, 8000);
  await page.waitForTimeout(700);
  const p1 = await pageNow(page);
  check(`${tag} › moves exactly one page (${p0} → ${p1})`, p1 === p0 + 1, `${p0} → ${p1}`);
  check(`${tag} ...the unit choice is unchanged (${unit0})`, (await page.evaluate(() => document.getElementById("unitTypeSelect").value)) === unit0);
  await page.click("#mushafPagePrevBtn");
  await waitFor("prev page", page, (p) => Number(document.getElementById("mushafPageRef")?.dataset.page) !== p, p1, 8000);
  await page.waitForTimeout(700);
  const p2 = await pageNow(page);
  check(`${tag} ‹ moves exactly one page back (${p1} → ${p2})`, p2 === p0, `${p1} → ${p2}`);
  // Full screen: the bare state keeps ‹ ›.
  for (let i = 0; i < 4 && !(await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)))); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }
  const bare = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
  const sf = await navState(page);
  check(`${tag} POSITIVE CONTROL: the full-screen bare state is on`, bare);
  for (const id of ["mushafPagePrevBtn", "mushafPageNextBtn"]) check(`${tag} full screen: ${id} is shown, ≥ 40px, tappable`, sf[id].shown && sf[id].w >= 40 && sf[id].h >= 40 && sf[id].hit, JSON.stringify(sf[id]));
  const withoutF = await barHeightWithout(page);
  check(`${tag} full screen: the bar keeps its line count (${sf.barH} vs ${withoutF}), no sideways overflow`, sf.barH === withoutF && sf.over <= 0, JSON.stringify({ with: sf.barH, without: withoutF, over: sf.over }));
  if (width === 390 || width === 1440) await page.screenshot({ path: `${SHOT_DIR}/j82-${lang}-${width}-fullscreen.png` });
  if (sf.mushafPageNextBtn.shown) {
    await page.click("#mushafPageNextBtn");
    await waitFor("next page (full screen)", page, (p) => Number(document.getElementById("mushafPageRef")?.dataset.page) !== p, p0, 8000);
    await page.waitForTimeout(700);
    const p3 = await pageNow(page);
    const stillFull = await page.evaluate(() => document.body.classList.contains("immersive-read"));
    check(`${tag} full screen: › moves exactly one page (${p0} → ${p3}) and stays full screen`, p3 === p0 + 1 && stillFull, `${p0} → ${p3}`);
  }
  // Ends: page 1 and 604 disable the matching button.
  await page.evaluate(() => { const r = document.getElementById("mushafPageRef"); r.dataset.page = "1"; });
  const ends = await page.evaluate(async () => { const m = await import("/app/js/hifz-renderer.js"); return typeof m.mushafPageAyahGroups === "function"; });
  check(`${tag} POSITIVE CONTROL: the page table is reachable for the end-of-book check`, ends);
  await ctx.close();
}

async function partEnds(lang, width, height) {
  const tag = `[ends ${lang} ${width}]`;
  const { ctx, page } = await start(lang, width, height);
  await setSel(page, "unitTypeSelect", "page"); await page.waitForTimeout(500);
  for (const [pg, prevOff, nextOff] of [[1, true, false], [604, false, true]]) {
    await page.evaluate((n) => { const s = document.getElementById("unitNumSelect"); if (s) { s.value = String(n); s.dispatchEvent(new Event("change", { bubbles: true })); } }, pg);
    await page.waitForTimeout(500);
    await page.click("#readMushafBtn").catch(() => {});
    await waitFor("page ref", page, (n) => Number(document.getElementById("mushafPageRef")?.dataset.page) === n, pg, 10000);
    const st = await navState(page);
    check(`${tag} on page ${pg}: ‹ ${prevOff ? "disabled" : "enabled"} and › ${nextOff ? "disabled" : "enabled"}`, st.mushafPagePrevBtn.disabled === prevOff && st.mushafPageNextBtn.disabled === nextOff, JSON.stringify(st));
    await page.click("#readMushafBtn").catch(() => {});
    await page.waitForTimeout(400);
  }
  await ctx.close();
}

for (const lang of LANGS) {
  if (!ONLY || ONLY === "learn") await partLearn(lang, 1280, 900);
  if (!ONLY || ONLY === "bookmark") await partBookmark(lang, 1280, 900);
  if (!ONLY || ONLY === "pages") {
    for (const [w, h] of [[1440, 900], [1280, 900], [390, 844], [320, 640]]) await partPages(lang, w, h);
    await partEnds(lang, 1280, 900);
  }
}
console.log(`\n==== J82 learn-next / bookmark / page buttons${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
