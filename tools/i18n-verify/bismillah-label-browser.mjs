// The Owner, 5 Oct 2026: "Bismillah is still showing as Ayah in the view came from the centre of approach."
// Decision 55 leaves Al-Fātiḥah's Bismillah unnumbered (display only; stored 1:1 never changes). It must never be
// printed as "Ayah Bismillah", "1:Bismillah" or as the number 1: the wheel's centre, the Note window's title, its
// list and its own āyah picker all name it "Bismillah". Another surah's first āyah still reads "Ayah 1".
// Expected words are written by hand. en/bn at 390 and 1280. Run from the repository root with serve.js.
//   --mutate=old-names   ayahNameFor() prints "Ayah {n}" again     -> the centre checks fail
//   --mutate=old-picker  the Note picker prints the number again  -> the picker check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const W = { en: { b: "Bismillah", title: "Bismillah — Surah Al-Faatiha", ayah1: "Ayah 1" }, bn: { b: "বিসমিল্লাহ", title: "বিসমিল্লাহ — সূরা", ayah1: "আয়াত ১" } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 1000 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const swap = (a, b) => { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); };
    if (MUTATE === "old-names") swap('function ayahNameFor(surah, ayah) { return isUnnumberedBismillah(surah, ayah) ? t("Bismillah") : ', "function ayahNameFor(surah, ayah) { return ");
    else if (MUTATE === "old-picker") swap('${n === selected ? "selected" : ""}>${ayahLabelFor(currentSurahNum, n)}</option>', '${n === selected ? "selected" : ""}>${num(n)}</option>');
    else throw new Error(`unknown mutation ${MUTATE}`);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const setSelect = (id, v) => P.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  const hub = () => P.evaluate(() => document.querySelector(".wheel-hub-unit, [data-hub-unit], #wheelHubUnit")?.innerText ?? [...document.querySelectorAll("[class*=hub]")].map((e) => e.innerText).join(" | "));
  await setSelect("surahSelect", 2); await P.waitForTimeout(1200);
  await setSelect("unitTypeSelect", "ayah"); await P.waitForTimeout(400);
  await setSelect("ayahSelect", 1); await P.waitForTimeout(700);
  const h2 = await hub();
  check(`${tag}: another surah's first āyah still reads "${W[lang].ayah1}" in the centre`, h2.includes(W[lang].ayah1), h2);
  await setSelect("surahSelect", 1); await P.waitForTimeout(1200);
  await setSelect("unitTypeSelect", "ayah"); await P.waitForTimeout(400);
  await setSelect("ayahSelect", 1); await P.waitForTimeout(700);
  const h1 = await hub();
  check(`${tag}: the centre names the Bismillah`, h1.includes(W[lang].b), h1);
  check(`${tag}: ...and never as an āyah`, !/Ayah Bismillah|আয়াত বিসমিল্লাহ|1:Bismillah|১:বিসমিল্লাহ/.test(h1), h1);
  check(`${tag}: the Study options āyah picker reads Bismillah`, (await P.evaluate(() => { const s = document.getElementById("ayahSelect"); return s.options[s.selectedIndex]?.textContent; })) === W[lang].b);
  await P.evaluate(() => document.getElementById("tabNoteBtn").click());
  await P.waitForFunction(() => !document.getElementById("noteView")?.hidden, null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(1200);
  const nv = await P.evaluate(() => { const v = document.getElementById("noteView"); const pick = v.querySelector('[data-note-picker="ayah"]'); return { text: v.innerText, title: [document.getElementById("notePopupTitle")?.textContent.trim() ?? ""], pick: pick ? pick.options[pick.selectedIndex]?.textContent : null }; });
  // A phone shows the Note full-screen with no title bar, so the title is checked where there is one (a PC).
  if (width >= 1024) check(`${tag}: the Note window's title is "${W[lang].title}…"`, nv.title.some((x) => x.startsWith(W[lang].title)), JSON.stringify(nv.title));
  check(`${tag}: nothing in the Note window says "1:Bismillah" or "Ayah Bismillah"`, !/1:Bismillah|Ayah Bismillah|১:বিসমিল্লাহ|আয়াত বিসমিল্লাহ|Quran 1:Bismillah/.test(nv.text + nv.title.join(" ")));
  check(`${tag}: the Note window's own āyah picker reads Bismillah`, nv.pick === W[lang].b, String(nv.pick));
  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
