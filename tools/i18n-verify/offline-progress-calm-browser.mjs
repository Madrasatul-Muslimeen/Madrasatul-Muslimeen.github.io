// The Owner, 15 Nov 2026 (phone screenshots, MSA used offline, word ربحت 2:16:7; PCF MSA J139 ask 1): on the Word Card the pink banner
// "That information could not be loaded (unavailable) ... Ref: read Arabic word progress" sat on top of "Study Next". A READ that fails only
// because the device is offline is not shouted about: no banner; the card says one calm line where the progress would be.
//   node tools/i18n-verify/offline-progress-calm-browser.mjs [--mutate=loud|oldtext]      (serve.js on :8080, or QR_BASE)
//   --mutate=loud     an offline read shows the banner again (errors.js)               -> "NO red banner" FAILS
//   --mutate=oldtext  the page keeps the old "Progress not loaded yet" offline          -> "calm offline line" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  loud: ["app/js/errors.js", "  if (!isReadFailure(context)) return false;", "  return false;"],
  oldtext: ["app/quranrevival.html", 'navigator.onLine === false ? t("You are offline: your progress shows when you are back online") : t("Progress not loaded yet"));', 't("Progress not loaded yet"));'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const OFFLINE = { en: "You are offline: your progress shows when you are back online", bn: "আপনি অফলাইনে আছেন: অনলাইনে ফিরলে আপনার অগ্রগতি দেখা যাবে" };
for (const [lang, w, h] of [["en", 390, 844], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html", body: src.replace(a, b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  await setSel("surahSelect", "2"); await page.waitForTimeout(1500);
  await setSel("ayahSelect", "255"); await page.waitForTimeout(900);
  // positive control: online, with reads working, the card opens and shows no banner and no offline line
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":2:255:3"]')?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 15000 });
  await page.waitForTimeout(800);
  check(`${tag} POSITIVE CONTROL: online, the card shows its progress, no banner and no offline line`, await page.evaluate((o) => { const c = document.querySelector("#quranWordCardMount .quran-word-card"); return !!c && !document.getElementById("qr-write-failure-banner") && !c.textContent.includes(o); }, OFFLINE[lang]));
  // now the line goes down: every read fails the way the SDK does offline
  // the sūrah is opened online (its file loads), then the line goes down before the card: another sūrah's progress chunk is not cached, so the read really goes out and fails
  await page.evaluate(() => { window.__stubFailReads = ["quranWordProgress", "quranWordApprovals", "quranLemmaProgress", "quranLemmaApprovals"]; }); // the progress reads only: the sūrah itself still opens
  await setSel("surahSelect", "112"); await page.waitForTimeout(1500);
  await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }); });
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":112:1:1"]')?.click());
  await page.waitForTimeout(2500);
  const m = await page.evaluate((o) => {
    const b = document.getElementById("qr-write-failure-banner");
    const c = document.querySelector("#quranWordCardMount .quran-word-card");
    return { banner: !!b && getComputedStyle(b).display !== "none", bannerText: b?.textContent ?? "", card: !!c, calm: !!c && c.textContent.includes(o), old: !!c && /Progress not loaded yet|অগ্রগতি এখনও লোড হয়নি/.test(c.textContent) };
  }, OFFLINE[lang]);
  check(`${tag} offline: NO red banner for the failed progress read (${m.bannerText.slice(0, 60)})`, m.card && !m.banner, JSON.stringify(m));
  check(`${tag} offline: the card says the calm offline line where the progress would be`, m.calm && !m.old, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Offline progress, calm${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
