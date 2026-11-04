// The intention reminder on the Hadith and Dua pages (PCF MSA J05; the Owner, 4 Nov 2026: "Reminder text for all MSA, Build it").
// Placed by the MSA Architect with app/js/intention-mount.js above each page's content. For each page, en 1440 px and bn 360 px at 200%:
// (1) the day's intention shows, in the reader's language, inside the screen, whole, its Bismillah >= 44 px, no sideways scroll;
// (2) Bismillah closes it, and a reload the same day shows nothing ("once a day", the default);
// (3) the closed day is the ONE key Quran Study writes: closed in Quran Study today = not shown here;
// (4) "Off" (the setting chosen in Quran Study) = never; (5) "Every time" = shown again on the next opening; (6) no page errors.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port). --mutate=NAME must FAIL: nomount | noclose | ownkey | nooff
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { INTENTIONS, intentionIndexFor, localDay } from "../../app/js/intention-reminder.js";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`); if (ok) pass++; else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = {
  nomount: ["app/js/intention-mount.js", "  paint();\n  return { paint };", "  return { paint };"],
  noclose: ["app/js/intention-mount.js", "closedThisOpening = true; markClosedToday(p, today);", "closedThisOpening = true;"],
  ownkey: ["app/js/intention-mount.js", "closedDay: getClosedDay(p)", "closedDay: (() => { try { return localStorage.getItem(\"own-closed\"); } catch { return null; } })()"],
  nooff: ["app/js/intention-mount.js", "mode: getIntentionMode(p)", "mode: (getIntentionMode(p) === \"off\" ? \"daily\" : getIntentionMode(p))"],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error("unknown mutation " + MUTATE);
const today = localDay(), idx = intentionIndexFor(today);
const browser = await chromium.launch();
for (const [pageName, path] of [["hadith", "/app/hadith-study.html"], ["dua", "/app/dua-study.html"]]) {
  for (const [lang, width, pct] of [["en", 1440, 100], ["bn", 360, 200]]) {
    const tag = `[${pageName} ${lang} ${width} ${pct}%]`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [f, a, b] = MUT[MUTATE];
      await ctx.route(`**/${f.replace(/^app\//, "app/")}*`, async (r) => { const src = fs.readFileSync(f, "utf8"); if (!src.includes(a)) throw new Error("anchor " + MUTATE); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page, errors } = await openPage(ctx, path);
    const settle = (ms = 700) => page.waitForTimeout(ms);
    const zoom = () => page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
    const reload = async () => { await page.reload({ waitUntil: "networkidle" }); await zoom(); await settle(); };
    const who = () => page.evaluate(() => document.getElementById("personSelect")?.value || "-");
    const card = () => page.evaluate(() => { const c = document.querySelector("#intentionHost [data-intention-card]"); if (!c) return null; const r = c.getBoundingClientRect(); const b = c.querySelector("button").getBoundingClientRect(); const t = c.querySelector(".intention-text");
      return { text: t.textContent, idx: Number(c.dataset.intentionIndex), inside: r.left >= -1 && r.right <= innerWidth + 1 && r.width > 0, whole: t.scrollWidth <= t.clientWidth + 1, btnH: Math.round(b.height), over: document.documentElement.scrollWidth - innerWidth }; });
    const clearKeys = () => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("mmsa-intention-") || k === "own-closed") localStorage.removeItem(k); });
    await zoom(); await settle();
    await clearKeys(); await reload();
    let c = await card();
    check(`${tag} (1) the day's intention shows (${lang}), number ${idx + 1} of 4`, !!c && c.idx === idx && c.text === (lang === "bn" ? INTENTIONS[idx].bn : INTENTIONS[idx].en), JSON.stringify(c));
    check(`${tag} (1) inside the screen, whole, Bismillah >= 44 px, no sideways scroll`, !!c && c.inside && c.whole && c.btnH >= 44 && c.over <= 0, JSON.stringify(c));
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/intention-${pageName}-${lang}-${width}.png` }).catch(() => {});
    await page.click("#intentionHost [data-intention-bismillah]").catch(() => {});
    check(`${tag} (2) Bismillah closes it`, (await card()) === null);
    await reload();
    check(`${tag} (2) once a day: a reload the same day shows nothing`, (await card()) === null);
    // (3) closed in Quran Study today: the same key, written as Quran Study writes it
    await clearKeys(); const p = await who();
    await page.evaluate(([p, d]) => { localStorage.setItem(`mmsa-intention-closed:${p}`, d); localStorage.setItem("own-closed", "never"); }, [p, today]);
    await reload();
    check(`${tag} (3) closed in Quran Study today = not shown here (one key for all MSA)`, (await card()) === null);
    await clearKeys(); await page.evaluate((p) => localStorage.setItem(`mmsa-intention-mode:${p}`, "off"), p); await reload();
    check(`${tag} (4) Off = never`, (await card()) === null);
    await clearKeys(); await page.evaluate((p) => localStorage.setItem(`mmsa-intention-mode:${p}`, "every"), p); await reload();
    await page.click("#intentionHost [data-intention-bismillah]").catch(() => {}); await reload();
    check(`${tag} (5) Every time = shown again on the next opening`, (await card()) !== null);
    const real = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
    check(`${tag} (6) no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Intention reminder on Hadith and Dua: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
