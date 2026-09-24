// v08.57 -- the openers no longer hold the app for ~21 seconds on every open.
// The Owner's report: "app (site) takes years to open". Both splashes played
// back to back on EVERY load by default (3s + 3s + fade, then 14s + fade),
// with no way past them. Now: an unset preference means "Once a day"; a tap
// anywhere skips an opener; and "never" (which the harness has always
// written, believing it worked) really suppresses them.
//
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const browser = await chromium.launch();
async function freshPage(prefs, lang = "en") {
  const ctx = await newContext(browser, { appLang: lang });
  // Runs AFTER the harness's own init script, so it can undo its "never".
  await ctx.addInitScript((p) => {
    try {
      if (sessionStorage.getItem("__splashPrefsSet")) return;
      sessionStorage.setItem("__splashPrefsSet", "1");
      for (const k of ["mm_splash_pref", "mm_qs_splash_pref", "mm_splash_last_date", "mm_qs_splash_last_date"]) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v);
    } catch {}
  }, prefs);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/quranrevival.html`);
  return { ctx, page };
}
const overlays = (page) => page.evaluate(() => [...document.querySelectorAll(".app-splash-overlay")].map((o) => o.id));

// 1. Unset preference: the boot opener shows (first open today) ...
{
  const { ctx, page } = await freshPage({});
  await page.waitForSelector("#boot-splash-overlay", { timeout: 5000 }).catch(() => {});
  check("unset preference: the boot opener shows on the first open of the day", (await overlays(page)).includes("boot-splash-overlay"));
  const hint = await page.evaluate(() => document.querySelector("#boot-splash-overlay .splash-skip-hint")?.textContent.trim());
  check("the opener says it can be skipped", hint === "Tap to skip", `hint = ${hint}`);

  // 2. ... a tap skips it, and the Quran opener follows ...
  const t0 = Date.now();
  await page.mouse.click(40, 300);
  await page.waitForSelector("#quran-splash-overlay", { timeout: 3000 }).catch(() => {});
  check("a tap skips the boot opener within a second (not after 6s)", Date.now() - t0 < 1500 && !(await overlays(page)).includes("boot-splash-overlay"), `took ${Date.now() - t0}ms`);
  check("the Quran opener follows", (await overlays(page)).includes("quran-splash-overlay"));

  // 3. ... and a tap skips that one too.
  const t1 = Date.now();
  await page.mouse.click(40, 300);
  await page.waitForFunction(() => !document.querySelector(".app-splash-overlay"), null, { timeout: 3000 }).catch(() => {});
  check("a tap skips the Quran opener (not after 14s)", (await overlays(page)).length === 0 && Date.now() - t1 < 1500, `took ${Date.now() - t1}ms`);

  // 4. Reload the same day: an unset preference is "Once a day", so neither shows.
  const stored = await page.evaluate(() => [localStorage.getItem("mm_splash_last_date"), localStorage.getItem("mm_qs_splash_last_date")]);
  check("a skipped opener still counts as shown today", stored.every(Boolean), JSON.stringify(stored));
  await page.reload();
  await page.waitForTimeout(800);
  check("unset preference = Once a day: a second open the same day shows no opener", (await overlays(page)).length === 0, JSON.stringify(await overlays(page)));
  await ctx.close();
}

// 5. Someone who chose "Every time" keeps it.
{
  const { ctx, page } = await freshPage({ mm_splash_pref: "always", mm_qs_splash_pref: "always", mm_splash_last_date: "2099-01-01" });
  await page.waitForSelector("#boot-splash-overlay", { timeout: 5000 }).catch(() => {});
  check("a chosen 'Every time' still shows the opener, even after one was shown today", (await overlays(page)).includes("boot-splash-overlay"));
  await ctx.close();
}

// 6. The gear does NOT skip (its clicks stop at the panel).
{
  const { ctx, page } = await freshPage({});
  await page.waitForSelector("#bootSplashGear", { timeout: 5000 });
  await page.click("#bootSplashGear");
  await page.waitForTimeout(500);
  check("opening the gear's settings does not skip the opener", (await overlays(page)).includes("boot-splash-overlay"));
  await ctx.close();
}

// 7. "never" really suppresses both -- what the harness always believed.
{
  const { ctx, page } = await freshPage({ mm_splash_pref: "never", mm_qs_splash_pref: "never" });
  await page.waitForTimeout(1000);
  check("'never' suppresses both openers", (await overlays(page)).length === 0);
  await ctx.close();
}

// 8. Bangla.
{
  const { ctx, page } = await freshPage({}, "bn");
  await page.waitForSelector("#boot-splash-overlay .splash-skip-hint", { timeout: 5000 }).catch(() => {});
  const hint = await page.evaluate(() => document.querySelector("#boot-splash-overlay .splash-skip-hint")?.textContent.trim());
  check("the skip hint is in Bangla for a Bangla reader", hint === "এড়িয়ে যেতে ট্যাপ করুন", `hint = ${hint}`);
  await ctx.close();
}

await browser.close();
console.log(`==== Splash openers (v08.57): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
