// The Owner, 23 Oct 2026 (via the PCA): "QR doesn't have any language option. What happened? Fix it."
// It was there, 939px down a Home menu that shows 367px on a 1280x720 computer: six Legacy App links pushed Settings
// out of sight (app/css/shell.css now puts Settings first). This check opens Home on QR's own pages, signed in, at a
// short computer screen and a phone, in English and Bangla, and fails unless:
//   - the Language box is in Home, inside the part of the menu that shows, and is what a tap there reaches;
//   - choosing the other language changes the page's own words.
//   node tools/apps/qr-verify/language-browser.mjs     (serves itself on PORT, default 8106)
//   --mutate=order   serves shell.css without the Settings-first rule: the check must FAIL
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import { spawn } from "node:child_process";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
if (MUTATE && MUTATE !== "order") throw new Error(`Unknown mutation "${MUTATE}"`);
const PORT = Number(process.env.PORT) || 8106;
const server = spawn(process.execPath, ["tools/apps/serve-app.mjs", process.cwd()], { cwd: (await import("./_root.mjs")).REPO, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
process.env.QR_BASE = `http://localhost:${PORT}`;
const { chromium, newContext, openPage } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const RULE = ".nav-cat-home .nav-cat-group:has(#navAppLangSelect) { order: -1;";
check("(setup) shell.css carries the Settings-first rule", fs.readFileSync("app/css/shell.css", "utf8").includes(RULE));

const browser = await chromium.launch();
try {
  for (const [w, h] of [[1280, 720], [390, 844]]) for (const lang of ["en", "bn"]) for (const pg of ["quranrevival.html", "ldog-study.html"]) {
    const tag = `${pg} ${w}x${h} ${lang}`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
    if (MUTATE === "order") await ctx.route("**/app/css/shell.css*", async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(RULE, ".nav-cat-home .nav-cat-group:has(#navAppLangSelect) { order: 0;") }); });
    const { page } = await openPage(ctx, `/app/${pg}`);
    const found = await page.waitForSelector("#navAppLangSelect", { state: "attached", timeout: 15000 }).then(() => true).catch(() => false);
    check(`${tag}: POSITIVE CONTROL Home holds the Language box`, found);
    if (!found) { await ctx.close(); continue; }
    await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); d.open = true; });
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const s = document.getElementById("navAppLangSelect"), r = s.getBoundingClientRect(), box = s.closest(".nav-cat-links").getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), boxTop: Math.round(box.top), boxBottom: Math.round(box.bottom), ih: innerHeight, hit: hit === s, scrolled: s.closest(".nav-cat-links").scrollTop };
    });
    check(`${tag}: the Language box shows when Home opens (inside the menu's visible part, on screen, not scrolled to) and a tap reaches it`, m.hit && m.top >= m.boxTop && m.bottom <= m.boxBottom && m.bottom <= m.ih && m.scrolled === 0, JSON.stringify(m));
    const other = lang === "en" ? "bn" : "en";
    const before = await page.textContent("details.nav-cat-home > summary");
    await Promise.all([page.waitForLoadState("load").catch(() => {}), page.selectOption("#navAppLangSelect", other)]);
    await page.waitForFunction((b) => { const s = document.querySelector("details.nav-cat-home > summary"); return s && s.textContent !== b; }, before, { timeout: 15000 }).catch(() => {});
    const after = await page.textContent("details.nav-cat-home > summary").catch(() => "");
    check(`${tag}: choosing ${other} changes the page's words (Home: "${before.trim()}" -> "${String(after).trim()}")`, after && after !== before && (other === "bn" ? /[ঀ-৿]/.test(after) : /[A-Za-z]/.test(after)));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`\n==== QR language option${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
