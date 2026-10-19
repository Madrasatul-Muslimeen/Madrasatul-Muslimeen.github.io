// The Home menu's "Legacy App" links (PCF MMSA J32, 16 Oct 2026): every frozen archive the brief names is one tap away,
// finger-sized, on screen, in the page's language, opening its own folder in a new tab. legacy-v10/ (v10.68) joined
// legacy-v07, -v08 and -v09 here, and legacy-v11/ (v11.39) on 19 Oct 2026 (the Owner, PCF MSA J39). Measured on the rendered page at 320 / 390 / 820 / 1440px, English and Bangla.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/legacy-links-browser.mjs [--mutate=nov10|nov11]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const LINK = (v) => `<a href="https://madrasatul-muslimeen.github.io/legacy-${v}/index.html" class="nav-legacy-link" target="_blank" rel="noopener">Legacy App - ${v} ↗</a>`;
const ARCHIVES = ["v10", "v11"];
const PAGES = ["/app/quranrevival.html", "/app/records.html", "/app/notes.html"];
const LABEL = (v) => ({ en: `Legacy App - ${v} ↗`, bn: `পুরাতন অ্যাপ - ${v} ↗` });
const browser = await chromium.launch();
for (const pagePath of PAGES) for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const t = `${lang} ${width}px ${pagePath.split("/").pop()}`;
  const height = width > 600 ? 900 : 844;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "nov10" || MUTATE === "nov11") {
    const gone = LINK(MUTATE.slice(2));
    const file = `app/${pagePath.split("/").pop()}`;
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(gone)) throw new Error(`mutation anchor missing in ${file}`);
    await ctx.route(`**${pagePath}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(gone).join("") }));
  } else if (MUTATE) throw new Error(`no such mutation ${MUTATE}`);
  try {
    const { page } = await openPage(ctx, pagePath);
    await page.waitForTimeout(1000);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const before = await page.evaluate(() => [...document.querySelectorAll("details.nav-cat-home a.nav-legacy-link")].map((a) => new URL(a.href).pathname));
    check(`${t}: POSITIVE CONTROL the Home menu carries the v07, v08 and v09 archive links`, ["/legacy-v07/", "/legacy-v08/", "/legacy-v09/"].every((p) => before.some((h) => h.startsWith(p))), JSON.stringify(before));
    await page.click("details.nav-cat-home > summary"); await page.waitForTimeout(300);
    for (const v of ARCHIVES) {
      const link = await page.evaluate((dir) => {
        const a = [...document.querySelectorAll("details.nav-cat-home a.nav-legacy-link")].find((x) => new URL(x.href).pathname.startsWith(`/legacy-${dir}/`));
        if (!a) return null;
        a.scrollIntoView({ block: "nearest" });
        const r = a.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: a.textContent.trim(), href: new URL(a.href).pathname, target: a.target, rel: a.rel, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom, reachable: !!at && (at === a || a.contains(at)) };
      }, v);
      check(`${t}: the menu has a "Legacy App - ${v}" link to /legacy-${v}/index.html, opening in a new tab`, !!link && link.href === `/legacy-${v}/index.html` && link.target === "_blank" && /noopener/.test(link.rel), JSON.stringify(link));
      check(`${t}: its label is in the page's language ("${LABEL(v)[lang]}")`, !!link && link.text === LABEL(v)[lang], link?.text);
      check(`${t}: the ${v} link is finger-sized (>=40px), inside the screen and nothing covers it`, !!link && link.h >= 40 && link.l >= -1 && link.r <= width + 1 && link.t >= -1 && link.b <= height + 1 && link.reachable, JSON.stringify(link));
    }
  } catch (e) { check(`${t}: flow ran`, false, String(e).split("\n")[0]); }
  await ctx.close();
}
// The live offline worker keeps every archive out of its cache.
const sw = fs.readFileSync("app/sw.js", "utf8");
check("app/sw.js keeps /legacy-v10/ and /legacy-v11/ out of the live app's cache, as it does /legacy-v09/", /startsWith\("\/legacy-v09\/"\)/.test(sw) && /startsWith\("\/legacy-v10\/"\)/.test(sw) && /startsWith\("\/legacy-v11\/"\)/.test(sw));
await browser.close();
console.log(`\n==== Legacy App links: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
