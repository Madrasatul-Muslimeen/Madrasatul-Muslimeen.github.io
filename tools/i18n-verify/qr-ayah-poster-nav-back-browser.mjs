// QR Lead (the Owner, 29 Oct 2026, a phone screenshot of "Study poster · 114 : 1"): "This Study/ Dawah poster, should
// have a NAV buttons for next/previous Ayah. Also the 'back' button should take to the Ayah card where this poster came
// from, instead it takes to the App Home page."
//   1. ‹ › on the poster's bar: the previous / next āyah (one āyah per poster), across a sūrah's edge; ‹ off at 1:1 and
//      › off at 114:6; 44px tiles, hidden while the "Which poster?" chooser shows.
//   2. ← Back reopens the Āyah card the poster came from (rememberQuranPlace writes the CARD's āyah and qpCard;
//      openPlaceFromQueryString reopens the card) -- also after ‹ › moved the poster on.
//   node tools/i18n-verify/qr-ayah-poster-nav-back-browser.mjs [--mutate=no-card|no-nav]   (serve.js on :8080)
//   --mutate=no-card   the card is not reopened on the way back  -> the ← Back checks FAIL
//   --mutate=no-nav    ‹ › never shown                          -> the ‹ › checks FAIL
//   --mutate=under-zab the Surah list runs under the Zab bar again -> the 768/820 "An-Naas can be tapped" checks FAIL
// 3. Found on the way (the Owner's route starts at Read -> Surah list -> An-Naas): from 768px the full-screen list ran
//    under the 44px Zab bar, and at 768 and 820 An-Naas's row was 31 of 48px under it, its middle untappable.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-card": ["app/quranrevival.html", "        if (c.surah === surah && c.ayah === ayah) openAyahActionSheet(`${c.surah}:${c.ayah}`, c.half);", ""],
  "under-zab": ["app/quranrevival.html", "  @media (min-width: 768px) { body.zab-bar-on #readContentsMount { bottom: 44px; } }", ""],
  "no-nav": ["app/ayah-poster.html", "      const on = !!state.kind && !!surahData;", "      const on = false;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function ctxFor(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [file, from, to] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (src.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
    const body = src.replace(from, to);
    const re = file.endsWith("quranrevival.html") ? /\/app\/quranrevival\.html(\?.*)?$/ : /\/app\/ayah-poster\.html(\?.*)?$/;
    await ctx.route(re, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  return ctx;
}
const posterReady = (page) => page.waitForFunction(() => document.body.dataset.apReady === "1", null, { timeout: 15000 }).catch(() => {});
const poster = (page) => page.evaluate(() => {
  const r = (id) => { const e = document.getElementById(id), b = e?.getBoundingClientRect(); return e ? { shown: !e.hidden && b.width > 0, disabled: e.disabled, w: Math.round(b.width), h: Math.round(b.height), label: e.getAttribute("aria-label") } : null; };
  const u = new URL(location.href);
  return { title: document.getElementById("apTitle")?.textContent ?? "", prev: r("apPrev"), next: r("apNext"), surah: u.searchParams.get("surah"), ayah: u.searchParams.get("ayah"), from: u.searchParams.get("from"), to: u.searchParams.get("to"), sideways: document.documentElement.scrollWidth > innerWidth + 1 };
});

for (const [w, h, lang] of [[390, 844, "en"], [768, 1024, "bn"], [1280, 900, "en"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await ctxFor(lang, w, h);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  await page.click("#readContentsBtn");
  // the route, not the thing tested here (part 3 below proves a finger can reach this row): open An-Naas directly
  await page.waitForSelector('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]', { state: "attached", timeout: 15000 });
  await page.evaluate(() => document.querySelector('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]')?.click());
  await page.waitForFunction(() => !!document.querySelector('[data-ayah-marker="114:1"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[data-ayah-marker="114:1"]')?.click());
  await page.waitForTimeout(1000);
  const opened = await page.evaluate(() => { const b = document.querySelector("#ayahActionSheetMount [data-ayah-sheet-poster]") ?? [...document.querySelectorAll("#ayahActionSheetMount button")].find((x) => /Poster|পোস্টার/.test(x.textContent)); b?.click(); return !!b; });
  check(`${tag} POSITIVE CONTROL: the 114:1 Āyah card offers 🖨 Poster`, opened);
  await page.waitForURL(/ayah-poster\.html/, { timeout: 10000 }).catch(() => {});
  await posterReady(page);
  const chooser = await poster(page);
  check(`${tag} ‹ › are not shown while "Which poster?" is asked`, !!chooser.prev && !chooser.prev.shown && !chooser.next.shown, JSON.stringify(chooser));
  await page.click('[data-ap-choose="study"]');
  await page.waitForTimeout(500);
  let p = await poster(page);
  check(`${tag} on the Study poster ‹ › show as 44px tiles with their spoken names, nothing goes sideways`, p.prev?.shown && p.next?.shown && p.prev.w >= 44 && p.prev.h >= 44 && p.next.w >= 44 && !!p.prev.label && !!p.next.label && !p.sideways, JSON.stringify(p));
  if (w === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-poster-nav-${lang}-${w}.png` });
  if (p.next?.shown) {
    await page.click("#apNext"); await page.waitForTimeout(700);
    p = await poster(page);
    check(`${tag} › moves the poster to the next āyah (114:2), in its title and address`, p.surah === "114" && p.ayah === "2" && p.from === "2" && p.to === "2" && /2|২/.test(p.title), JSON.stringify(p));
    await page.click("#apPrev"); await page.waitForTimeout(700);
    await page.click("#apPrev"); await page.waitForTimeout(1500);
    p = await poster(page);
    check(`${tag} ‹ ‹ goes back across the sūrah's edge to Al-Falaq's last āyah (113:5)`, p.surah === "113" && p.ayah === "5" && p.from === "5", JSON.stringify(p));
  }
  if (w === 1280) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-poster-nav-${lang}-${w}.png` });
  // ← Back: the Āyah card it came from (114:1), even after ‹ › moved the poster on
  await page.click("#apBack");
  await page.waitForURL(/quranrevival\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => /114/.test(document.getElementById("ayahActionSheetMount")?.innerText ?? "") || /১১৪/.test(document.getElementById("ayahActionSheetMount")?.innerText ?? ""), null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => {
    const m = document.getElementById("ayahActionSheetMount");
    return { open: !!m?.closest(".open"), text: (m?.innerText ?? "").replace(/\s+/g, " ").slice(0, 90), landing: (document.getElementById("wheelSection")?.getBoundingClientRect().width ?? 0) > 0 && (document.getElementById("readBar")?.getBoundingClientRect().width ?? 0) === 0, qpCard: new URL(location.href).searchParams.get("qpCard") };
  });
  check(`${tag} ← Back reopens the Āyah card it came from (114:1), not the landing page`, back.open && /(114|১১৪):(1|১)(?![0-9০-৯])/.test(back.text) && !back.landing, JSON.stringify(back));
  check(`${tag} ...and the reopen request leaves the address once used`, back.qpCard === null, JSON.stringify(back));
  await ctx.close();
}

// 3. the Surah list's last row (An-Naas) is never under the Zab bar
for (const [w, h, lang] of [[768, 1024, "en"], [768, 1024, "bn"], [820, 1180, "en"], [820, 1180, "bn"], [1024, 1366, "en"], [390, 844, "en"]]) {
  const ctx = await ctxFor(lang, w, h);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  await page.click("#readContentsBtn"); await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const row = document.querySelector('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]');
    if (!row) return null;
    let e = row.parentElement; while (e) { if (e.scrollHeight > e.clientHeight + 2) e.scrollTop = e.scrollHeight; e = e.parentElement; }
    const r = row.getBoundingClientRect(), z = document.getElementById("zabBar")?.getBoundingClientRect();
    const zabOn = !!z && z.height > 0;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { rowBottom: Math.round(r.bottom), zabTop: zabOn ? Math.round(z.top) : null, mid: !!hit && row.contains(hit), zabOn };
  });
  check(`[list ${lang} ${w}] An-Naas, the list's last row, sits above the Zab bar and a tap in its middle reaches it`, !!m && m.mid && (!m.zabOn || m.rowBottom <= m.zabTop + 1), JSON.stringify(m));
  await ctx.close();
}

// the ends: ‹ off at 1:1, › off at 114:6 (opened straight on the poster)
for (const [s, a, which] of [[1, 1, "apPrev"], [114, 6, "apNext"]]) {
  const ctx = await ctxFor("en", 390, 844);
  const { page } = await openPage(ctx, `/app/ayah-poster.html?surah=${s}&ayah=${a}&kind=study`);
  await posterReady(page);
  const p = await poster(page);
  const btn = which === "apPrev" ? p.prev : p.next, other = which === "apPrev" ? p.next : p.prev;
  check(`[ends] ${which === "apPrev" ? "‹" : "›"} is off at ${s}:${a}, the other way stays on`, btn?.shown && btn.disabled && other?.shown && !other.disabled, JSON.stringify(p));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR āyah poster: ‹ › and ← Back to the Āyah card${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
