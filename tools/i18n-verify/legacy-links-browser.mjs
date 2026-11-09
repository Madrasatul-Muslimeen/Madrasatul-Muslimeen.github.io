// The Home menu's "Legacy App" links (PCF MMSA J32, 16 Oct 2026): every frozen archive the brief names is one tap away,
// finger-sized, on screen, in the page's language, opening its own folder in a new tab. legacy-v10/ (v10.68) joined
// legacy-v07, -v08 and -v09 here, and legacy-v11/ (v11.39) on 19 Oct 2026 (the Owner, PCF MSA J39). Measured on the rendered page at 320 / 390 / 820 / 1440px, English and Bangla.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/legacy-links-browser.mjs [--mutate=nov10|nov11|nov12|...|nogroup]  (any archive on disk; nogroup = the links loose in the menu again)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const LINK = (v) => `<a href="https://madrasatul-muslimeen.github.io/legacy-${v}/index.html" class="nav-legacy-link" target="_blank" rel="noopener">${v} ↗</a>`;
// 9 Nov 2026 (the Owner: "Why the v12 is not kept in legacy?"): this list was typed by hand, so legacy-v12/ was archived
// on 31 Oct with no menu link and nothing failed. It is now READ off the repository: every legacy-v1N/ folder must have
// its link. A future archive (legacy-v13/) fails this suite until its link is on every page.
const ARCHIVES = fs.readdirSync(".").filter((d) => /^legacy-v1\d$/.test(d) && fs.statSync(d).isDirectory()).map((d) => d.slice(7)).sort();
if (!(ARCHIVES.length >= 3 && ARCHIVES.includes("v10") && ARCHIVES.includes("v11"))) throw new Error(`positive control: archive folders read as ${JSON.stringify(ARCHIVES)}; run from the repository root`);
console.log(`archives found on disk: ${ARCHIVES.join(", ")}`);
const PAGES = ["/app/quranrevival.html", "/app/records.html", "/app/notes.html"];
// Inside the one "Legacy App" button each link is just its version ("v12 ↗", the same in every language).
const LABEL = (v) => ({ en: `${v} ↗`, bn: `${v} ↗` });
const LABEL_GROUP = { en: "Legacy App", bn: "পুরাতন অ্যাপ" };
const browser = await chromium.launch();
for (const pagePath of PAGES) for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const t = `${lang} ${width}px ${pagePath.split("/").pop()}`;
  const height = width > 600 ? 900 : 844;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (/^nov\d\d$/.test(MUTATE) && ARCHIVES.includes(MUTATE.slice(2))) {
    const gone = LINK(MUTATE.slice(2));
    const file = `app/${pagePath.split("/").pop()}`;
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(gone)) throw new Error(`mutation anchor missing in ${file}`);
    await ctx.route(`**${pagePath}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(gone).join("") }));
  } else if (MUTATE === "nogroup") {
    const file = `app/${pagePath.split("/").pop()}`;
    const body = fs.readFileSync(file, "utf8").replace(/<details class="nav-legacy-group">\s*<summary[^>]*>[^<]*<\/summary>\s*<div class="nav-legacy-list">/, "").replace(/(Legacy App - v\d\d ↗<\/a>)\s*<\/div>\s*<\/details>/, "$1");
    if (body.includes("nav-legacy-group")) throw new Error(`nogroup mutation did not apply to ${file}`);
    await ctx.route(`**${pagePath}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  } else if (MUTATE) throw new Error(`no such mutation ${MUTATE}`);
  try {
    const { page } = await openPage(ctx, pagePath);
    await page.waitForTimeout(1000);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const before = await page.evaluate(() => [...document.querySelectorAll("details.nav-cat-home a.nav-legacy-link")].map((a) => new URL(a.href).pathname));
    check(`${t}: POSITIVE CONTROL the Home menu carries the v07, v08 and v09 archive links`, ["/legacy-v07/", "/legacy-v08/", "/legacy-v09/"].every((p) => before.some((h) => h.startsWith(p))), JSON.stringify(before));
    await page.click("details.nav-cat-home > summary"); await page.waitForTimeout(300);
    // 9 Nov 2026, the Owner: "Legacy became a long list in the home menu, place it under one button".
    const grp = await page.evaluate(() => {
      const d = document.querySelector("details.nav-cat-home details.nav-legacy-group"), s = d?.querySelector(":scope > summary");
      if (!d || !s) return null;
      s.scrollIntoView({ block: "nearest" });
      const r = s.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      // checkVisibility(), not a height: Chrome 153 keeps a box for content inside a CLOSED <details>, though nothing is drawn.
      const shown = [...d.querySelectorAll("a.nav-legacy-link")].filter((a) => a.checkVisibility()).length;
      const outside = [...document.querySelectorAll("details.nav-cat-home a.nav-legacy-link")].filter((a) => !d.contains(a)).length;
      return { open: d.open, text: s.textContent.trim(), h: r.height, l: r.left, r: r.right, reachable: !!at && (at === s || s.contains(at)), shown, outside, links: d.querySelectorAll("a.nav-legacy-link").length };
    });
    check(`${t}: every Legacy App link sits inside ONE "Legacy App" button, none loose in the menu`, !!grp && grp.outside === 0 && grp.links === 4 + ARCHIVES.length, JSON.stringify(grp));
    check(`${t}: the button starts closed, so the list is hidden until tapped`, !!grp && !grp.open && grp.shown === 0, JSON.stringify(grp));
    check(`${t}: the button reads "${LABEL_GROUP[lang]}", is finger-sized (>=40px), inside the screen and nothing covers it`, !!grp && grp.text === LABEL_GROUP[lang] && grp.h >= 40 && grp.l >= -1 && grp.r <= width + 1 && grp.reachable, JSON.stringify(grp));
    if (grp) { await page.click("details.nav-cat-home details.nav-legacy-group > summary"); await page.waitForTimeout(250); }
    const opened = await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home details.nav-legacy-group"); return d ? { open: d.open, shown: [...d.querySelectorAll("a.nav-legacy-link")].filter((a) => a.checkVisibility()).length } : null; });
    check(`${t}: one tap opens it and shows all ${4 + ARCHIVES.length} archive links`, !!opened && opened.open && opened.shown === 4 + ARCHIVES.length, JSON.stringify(opened));
    for (const v of ARCHIVES) {
      const link = await page.evaluate((dir) => {
        const a = [...document.querySelectorAll("details.nav-cat-home a.nav-legacy-link")].find((x) => new URL(x.href).pathname.startsWith(`/legacy-${dir}/`));
        if (!a) return null;
        a.scrollIntoView({ block: "nearest" });
        const r = a.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: a.textContent.trim(), href: new URL(a.href).pathname, target: a.target, rel: a.rel, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom, reachable: !!at && (at === a || a.contains(at)) };
      }, v);
      check(`${t}: the Legacy App button has a "${v} ↗" link to /legacy-${v}/index.html, opening in a new tab`, !!link && link.href === `/legacy-${v}/index.html` && link.target === "_blank" && /noopener/.test(link.rel), JSON.stringify(link));
      check(`${t}: its label is in the page's language ("${LABEL(v)[lang]}")`, !!link && link.text === LABEL(v)[lang], link?.text);
      check(`${t}: the ${v} link is finger-sized (>=40px), inside the screen and nothing covers it`, !!link && link.h >= 40 && link.l >= -1 && link.r <= width + 1 && link.t >= -1 && link.b <= height + 1 && link.reachable, JSON.stringify(link));
    }
  } catch (e) { check(`${t}: flow ran`, false, String(e).split("\n")[0]); }
  await ctx.close();
}
// The live offline worker keeps every archive out of its cache.
const sw = fs.readFileSync("app/sw.js", "utf8");
for (const v of ["v09", ...ARCHIVES]) check(`app/sw.js keeps /legacy-${v}/ out of the live app's cache`, sw.includes(`startsWith("/legacy-${v}/")`));
await browser.close();
console.log(`\n==== Legacy App links: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
