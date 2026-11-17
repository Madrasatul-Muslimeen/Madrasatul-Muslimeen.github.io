// The Owner, 17 Nov 2026 ("Download: C, both options"): in Study options > Listening > Recitation for offline
//   (1) "The whole Qur'an (114 sūrahs)" is a choice of the sūrah list: its Save keeps every sūrah not yet kept, in one press
//   (2) "⬇ Download MP3 file" gives ONE real .mp3 of the chosen sūrah in the Downloads folder (a reciter with a file per āyah
//       gets its files joined in order), nothing is kept in the app.
//   node tools/i18n-verify/recitation-mp3-download-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=noall     the whole-Qur'an choice is not in the list            -> "the list starts with the whole Qur'an" FAILS
//   --mutate=reverse   the āyah files are joined in the wrong order          -> "the file is the 7 āyah files joined in order" FAILS
//   --mutate=nofile    the Download MP3 button is not drawn                  -> "a Download MP3 file button is there" FAILS
//   --mutate=keepall   the whole-Qur'an choice also offers a file button     -> "no single file for the whole Qur'an" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noall: ["app/quranrevival.html", '<option value="all"${isAll ? " selected" : ""}>', '<option hidden value="all"${isAll ? " selected" : ""}>'],
  reverse: ["app/js/recitation-offline.js", "return new Blob(parts, { type: \"audio/mpeg\" });", "return new Blob([...parts].reverse(), { type: \"audio/mpeg\" });"],
  nofile: ["app/quranrevival.html", '(isAll ? "" : `<div class="recit-off-row"><button type="button" id="recitFileBtn"', '(true ? "" : `<div class="recit-off-row"><button type="button" id="recitFileBtn"'],
  keepall: ["app/quranrevival.html", '(isAll ? "" : `<div class="recit-off-row"><button type="button" id="recitFileBtn"', '(false ? "" : `<div class="recit-off-row"><button type="button" id="recitFileBtn"'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
// each āyah file is a different, known byte string: 0x01.. repeated, so the joined order can be read back
const fileFor = (url) => { const m = /(\d{3})(\d{3})\.mp3$/.exec(url); const a = m ? Number(m[2]) : 0; return Buffer.alloc(100 + a, a); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const w of [390, 1280]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: 900 }, acceptDownloads: true });
  await ctx.route("https://archive.org/download/**", (r) => r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "audio/mpeg" }, body: fileFor(r.request().url()) }));
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabStudyBtn").catch(() => {}); await page.waitForTimeout(200);
  await page.click("#tabStudyOptionsBtn").catch(() => {}); await page.waitForTimeout(500);
  await page.waitForSelector("#recitationOfflineBox #recitOfflineSurah", { timeout: 8000 });
  const firstOpt = await page.evaluate(() => { const o = document.querySelector("#recitOfflineSurah option"); return o && !o.hidden ? o.value : null; });
  check(`${tag} the list starts with the whole Qur'an`, firstOpt === "all", String(firstOpt));
  await page.selectOption("#recitOfflineSurah", "1");
  await page.waitForTimeout(300);
  check(`${tag} a Download MP3 file button is there`, !!(await page.$("#recitFileBtn")));
  if (await page.$("#recitFileBtn")) {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }).catch(() => null), page.click("#recitFileBtn")]);
    check(`${tag} the browser receives a file named "001 - …mp3"`, !!dl && /^001 - .+\.mp3$/.test(dl.suggestedFilename()), dl ? dl.suggestedFilename() : "no download");
    if (dl) {
      const path = await dl.path();
      const buf = fs.readFileSync(path);
      const want = Buffer.concat(Array.from({ length: 7 }, (_, i) => fileFor(`001${String(i + 1).padStart(3, "0")}.mp3`)));
      check(`${tag} the file is the 7 āyah files joined in order`, buf.equals(want), `${buf.length} bytes vs ${want.length}`);
    }
    const kept = await page.evaluate(async () => (await (await caches.open("mm-audio-v1")).keys()).length);
    check(`${tag} nothing was kept in the app by the download`, kept === 0, String(kept));
  }
  await page.selectOption("#recitOfflineSurah", "all");
  await page.waitForTimeout(300);
  const all = await page.evaluate(() => ({ save: document.getElementById("recitOfflineSave")?.textContent.trim() ?? null, file: !!document.getElementById("recitFileBtn") }));
  check(`${tag} the whole-Qur'an Save shows its size first ("about … MB")`, /Save for offline \(about [\d.,]+ MB\)/.test(all.save ?? ""), JSON.stringify(all));
  check(`${tag} no single file for the whole Qur'an (one sūrah at a time)`, all.file === false, JSON.stringify(all));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
