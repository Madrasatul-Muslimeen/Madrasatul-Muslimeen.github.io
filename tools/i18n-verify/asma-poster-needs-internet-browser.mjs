// PCF MSA J120 O5 (the QR Lead's part 2): with no internet and the poster's web fonts not loaded, an Asma poster says so in words.
//   Run from the repository root with serve.js up:  node tools/i18n-verify/asma-poster-needs-internet-browser.mjs
//   MUT=noposter ...  mutation: the poster never adds its offline note     -> the "Posters need the internet" checks fail
//   MUT=alwaysnote .. mutation: the note shows even when the fonts did load -> the "exact poster says nothing" check fails
//   MUT=nobn ...      mutation: the two Bangla strings are removed         -> the Bangla checks fail
// Positive controls: ONLINE the poster has no note; OFFLINE with the poster fonts already loaded the poster is exact and says nothing.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
if (MUT === "noposter") mutate("app/js/asma-poster.js", /navigator\.onLine !== false\) return false;/g, "navigator.onLine !== false) return false; return false;");
if (MUT === "alwaysnote") mutate("app/js/asma-poster.js", /return !faces\.some\(.*\);/g, "return true;");
if (MUT === "nobn") mutate("app/js/i18n/bn.js", /^  "Posters need the internet": .*\n/gm, "");

const EXPECT = {
  en: { poster: "Posters need the internet" },
  bn: { poster: "পোস্টার দেখতে ইন্টারনেট লাগে" },
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  for (const lang of ["en", "bn"]) {
    for (const width of [390, 1280]) {
      const tag = `[${lang} ${width}]`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      await ctx.route("**/fonts.googleapis.com/**", (r) => r.abort());
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
      await page.click("#tabExploreBtn");
      await page.waitForTimeout(700);
      await page.click("#explorePaletteAsmaBtn");
      await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 }).catch(() => {});
      await page.selectOption("#asmaXSingleSelect", "1");
      await page.waitForFunction(() => !!document.getElementById("asmaXPosterPanel"), null, { timeout: 6000 }).catch(() => {});
      check(`${tag} online control: the poster has no offline note`, (await page.evaluate(() => !!document.querySelector(".ahp-offline-note"))) === false);
      await ctx.setOffline(true);
      await page.selectOption("#asmaXSingleSelect", "2");
      await page.waitForFunction(() => !!document.querySelector(".ahp-offline-note"), null, { timeout: 4000 }).catch(() => {});
      const note = await page.evaluate(() => {
        const n = document.querySelector(".ahp-offline-note"); if (!n) return null;
        const r = n.getBoundingClientRect();
        return { text: n.textContent.trim(), role: n.getAttribute("role"), w: r.width, h: r.height, right: r.right, vw: innerWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      check(`${tag} offline, fonts not loaded: the poster shows "${EXPECT[lang].poster}"`, note?.text === EXPECT[lang].poster, JSON.stringify(note));
      check(`${tag} offline: the note is on screen, inside the width, no sideways scroll`, !!note && note.w > 0 && note.h > 0 && note.right <= note.vw + 1 && note.over <= 0, JSON.stringify(note));
      // the words appear only when true: the poster's font loaded earlier -> the poster is exact, no note
      await ctx.setOffline(false);
      await page.evaluate(async () => { const f = new FontFace("Tinos", "url(/app/fonts/notonaskh.woff2)"); document.fonts.add(f); try { await f.load(); } catch {} });
      await ctx.setOffline(true);
      const loaded = await page.evaluate(() => [...document.fonts].some((f) => /Tinos/.test(f.family) && f.status === "loaded"));
      await page.selectOption("#asmaXSingleSelect", "3");
      await page.waitForTimeout(500);
      const exact = await page.evaluate(() => !!document.querySelector(".ahp-offline-note"));
      check(`${tag} offline, poster fonts already loaded: the exact poster says nothing`, loaded && exact === false, `loaded=${loaded} note=${exact}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  for (const r of restores.reverse()) r();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
