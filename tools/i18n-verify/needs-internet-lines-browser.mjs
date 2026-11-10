// PCF MSA J120 O5 (the QR Lead's part): with no internet, Quran Study's recitation Play and the Asma poster say so in words.
//   Run from the repository root with serve.js up:  node tools/i18n-verify/needs-internet-lines-browser.mjs
//   MUT=noaudio ...   mutation: audio-player.js ignores being offline      -> the "Recitation needs the internet" checks fail
//   MUT=noposter ...  mutation: the poster never adds its offline note     -> the "Posters need the internet" checks fail
//   MUT=nobn ...      mutation: the two Bangla strings are removed         -> the Bangla checks fail
// Positive controls: ONLINE, a failed Play keeps the old "Couldn't play" words and the poster has no note.
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
if (MUT === "noaudio") mutate("app/js/audio-player.js", /const offline = typeof navigator !== "undefined" && navigator\.onLine === false;/g, "const offline = false;");
if (MUT === "noposter") mutate("app/js/asma-renderer.js", /const offline = typeof navigator !== "undefined" && navigator\.onLine === false && variant !== "screensaver";/g, "const offline = false;");
if (MUT === "nobn") mutate("app/js/i18n/bn.js", /^  "(Recitation needs the internet\.|Posters need the internet)": .*\n/gm, "");

const EXPECT = {
  en: { rec: "Recitation needs the internet.", poster: "Posters need the internet" },
  bn: { rec: "তিলাওয়াত শুনতে ইন্টারনেট লাগে।", poster: "পোস্টার দেখতে ইন্টারনেট লাগে" },
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  for (const lang of ["en", "bn"]) {
    for (const width of [390, 1280]) {
      const tag = `[${lang} ${width}]`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
      // ----- recitation: a Play that fails, ONLINE first (positive control), then OFFLINE
      const play = (offlineMode) => page.evaluate(async (off) => {
        const m = await import("/app/js/audio-player.js");
        const got = [];
        m.setPlaybackErrorHandler((msg) => got.push(msg));
        try { m.playAyah(1, off ? 2 : 3, "ar"); } catch (e) { got.push("threw " + e); }
        const t0 = Date.now();
        while (!got.length && Date.now() - t0 < 6000) await new Promise((r) => setTimeout(r, 100));
        m.stop?.();
        return got[0] ?? null;
      }, offlineMode);
      const onlineMsg = await play(false);
      check(`${tag} online control: a failed Play keeps the old "Couldn't play" words`, typeof onlineMsg === "string" && !/^threw/.test(onlineMsg) && !/internet|ইন্টারনেট/.test(onlineMsg) && /Couldn.t play|বাজানো যায়নি/.test(onlineMsg), String(onlineMsg));
      await page.click("#tabExploreBtn");
      await page.waitForTimeout(700);
      await page.click("#explorePaletteAsmaBtn");
      await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 }).catch(() => {});
      await page.selectOption("#asmaXSingleSelect", "1");
      await page.waitForFunction(() => !!document.getElementById("asmaXPosterPanel"), null, { timeout: 6000 }).catch(() => {});
      const onlineNote = await page.evaluate(() => !!document.querySelector(".ahp-offline-note"));
      check(`${tag} online control: the poster has no offline note`, onlineNote === false);
      await ctx.setOffline(true);
      const offMsg = await play(true);
      check(`${tag} offline: a failed Play says "${EXPECT[lang].rec}"`, offMsg === EXPECT[lang].rec, String(offMsg));
      await page.selectOption("#asmaXSingleSelect", "2");
      await page.waitForFunction(() => !!document.querySelector(".ahp-offline-note"), null, { timeout: 4000 }).catch(() => {});
      const note = await page.evaluate(() => {
        const n = document.querySelector(".ahp-offline-note"); if (!n) return null;
        const r = n.getBoundingClientRect();
        return { text: n.textContent.trim(), role: n.getAttribute("role"), w: r.width, h: r.height, right: r.right, vw: innerWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      check(`${tag} offline: the poster shows "${EXPECT[lang].poster}"`, note?.text === EXPECT[lang].poster, JSON.stringify(note));
      check(`${tag} offline: the note is on screen, inside the width, no sideways scroll`, !!note && note.w > 0 && note.h > 0 && note.right <= note.vw + 1 && note.over <= 0, JSON.stringify(note));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  for (const r of restores.reverse()) r();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
