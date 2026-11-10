// PCF MSA J120 O6 (the Owner's answer G): recitation saved for offline ONE SŪRAH AT A TIME (Study options -> Listening).
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/recitation-offline-browser.mjs
//   ONE=1 ...         English at 390px only (what the mutations use)
//   MUT=nosw ...      mutation: the worker never answers from the audio cache      -> the offline playback checks fail
//   MUT=norange ...   mutation: the worker ignores Range (returns the whole file)  -> the offline SEEK check fails
//   MUT=nolist ...    mutation: a finished save is not remembered                  -> the "listed as saved" checks fail
//   MUT=noerr ...     mutation: a failed file does not stop the save (sūrah listed anyway) -> the "cannot be reached" checks fail
//   MUT=noremove ...  mutation: Remove leaves the files in the cache               -> the "removed" checks fail
// archive.org is not reachable here, so it is answered by this suite with a real playable WAV (named .mp3, as the
// app asks for) and a Range answer. WHETHER archive.org itself answers CORS and Range could not be measured from this
// sandbox (no route to it); Playwright also adds the CORS header to what a route fulfils. That is said, not claimed:
// the app is built so a host that does not allow it makes the save say so (check 5) instead of saving something that
// would not play. What it proves, rendered and measured:
//   1. The section is in the Listening card, in English and Bangla at 390 and 1280: names the reciter, shows the size
//      "about N MB" BEFORE anything is downloaded, button and select >= 40px tall, nothing wider than the card.
//   2. Save Sūrah 1 (7 files): "Saving… n of 7" runs to "Saved for offline", the sūrah is listed with its size and a
//      Remove, the worker's cache mm-audio-v1 holds exactly 7 files, and the list survives a reload.
//   3. With the network CUT: an audio element on a saved file reaches currentTime > 0 (it plays), and a seek to 0.8s
//      lands (a Range request answered by the worker); a file that was NOT saved fails (control).
//   4. Remove empties the cache for that sūrah and offline playback of it fails again.
//   5. A host that cannot be reached or does not allow saving (the browser reports both the same way): the save says so
//      in words (role=alert) and the sūrah is NOT listed.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
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
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
if (MUT === "nosw") mutate("app/sw.js", /if \(isRecitationAudio\(request\)\) \{/g, "if (false) {");
else if (MUT === "norange") mutate("app/sw.js", /if \(!m \|\| \(m\[1\] === "" && m\[2\] === ""\)\) return hit;/g, "return hit;");
else if (MUT === "nolist") mutate("app/js/recitation-offline.js", /  writeSaved\(all\);\n  return bytes;/g, "  return bytes;");
else if (MUT === "noremove") mutate("app/js/recitation-offline.js", /await Promise\.all\(urls\.map\(\(u\) => cache\.delete\(u\)\)\);/g, "");
else if (MUT === "noerr") mutate("app/js/recitation-offline.js", /  if \(firstError\) throw firstError;\n/g, "");

// a real, playable 2-second 8 kHz mono WAV (a quiet tone)
function wav() {
  const rate = 8000, n = rate * 2, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(3000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return buf;
}
const AUDIO = wav();
let net = true; // the "network": false makes every archive.org request fail, as a real cut does (context.setOffline does not stop routed requests)
const withCors = (route) => {
  if (!net) return route.abort();
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()["range"] || "");
  const h = { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": "audio/wav" };
  if (range) {
    const s = Number(range[1]), e = range[2] ? Math.min(Number(range[2]), AUDIO.length - 1) : AUDIO.length - 1;
    return route.fulfill({ status: 206, headers: { ...h, "content-range": `bytes ${s}-${e}/${AUDIO.length}` }, body: AUDIO.subarray(s, e + 1) });
  }
  return route.fulfill({ status: 200, headers: h, body: AUDIO });
};
const FIRST = "https://archive.org/download/abdullah-ali-basfar.ayahbyayah/001001.mp3";
const OTHER = "https://archive.org/download/abdullah-ali-basfar.ayahbyayah/002001.mp3"; // sūrah 2: never saved here

const play = (page, url, seekTo) => page.evaluate(async ({ url, seekTo }) => {
  const a = new Audio(url); a.muted = true;
  const out = { played: false, seeked: null, error: null };
  a.addEventListener("error", () => { out.error = a.error?.code ?? "error"; });
  try { await a.play(); } catch (e) { out.error = out.error || String(e.name || e); }
  const t0 = Date.now();
  while (!out.error && a.currentTime <= 0 && Date.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 80));
  out.played = a.currentTime > 0;
  if (seekTo && out.played) {
    a.currentTime = seekTo;
    const t1 = Date.now();
    while (!out.error && Math.abs(a.currentTime - seekTo) > 0.3 && a.currentTime < seekTo && Date.now() - t1 < 3000) await new Promise((r) => setTimeout(r, 80));
    out.seeked = a.currentTime >= seekTo - 0.05 && !out.error;
  }
  a.pause();
  return out;
}, { url, seekTo });
const cacheKeys = (page) => page.evaluate(async () => (await (await caches.open("mm-audio-v1")).keys()).map((r) => r.url));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const passes = process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280]];
  for (const [lang, width] of passes) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, allowServiceWorker: true });
    await ctx.route("https://archive.org/download/**", withCors);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
    await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(500);
    await page.waitForSelector("#recitationOfflineBox #recitOfflineSurah", { timeout: 8000 });
    await page.selectOption("#recitOfflineSurah", "1");
    const sec = await page.evaluate(() => {
      const box = document.getElementById("recitationOfflineBox"), card = document.getElementById("listeningCard"), R = (e) => e.getBoundingClientRect();
      const btn = document.getElementById("recitOfflineSave"), sel = document.getElementById("recitOfflineSurah");
      return { text: box.textContent, btnText: btn?.textContent.trim(), btnH: btn ? R(btn).height : 0, selH: R(sel).height, boxW: R(box).width, cardW: R(card).width,
        inside: R(box).right <= R(card).right + 1 && R(btn).right <= R(card).right + 1, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} the section names the reciter and the Owner's 1 MB per minute`, /Abdullah Basfar/.test(sec.text) && (lang === "bn" ? /১ এমবি/ : /1 MB/).test(sec.text) && (lang === "bn" ? /এমবি|মিনিট/.test(sec.text) : /MB for each minute/.test(sec.text)), sec.text.slice(0, 160));
    check(`${tag} the size is shown BEFORE anything is downloaded ("about … MB")`, lang === "bn" ? /প্রায়/.test(sec.btnText ?? "") && /এমবি|MB/.test(sec.btnText ?? "") : /about [\d.]+ MB/.test(sec.btnText ?? ""), sec.btnText);
    check(`${tag} button and select are at least 40px tall, inside the card, no sideways scroll`, sec.btnH >= 40 && sec.selH >= 40 && sec.inside && sec.over <= 0, JSON.stringify(sec));
    if (width === 390) { await page.evaluate(() => document.getElementById("recitationOfflineBox").scrollIntoView({ block: "center" })); await page.waitForTimeout(200); await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/recitation-offline-${lang}-${width}.png` }); }

    await page.click("#recitOfflineSave");
    await page.waitForFunction(() => /Saved for offline:|অফলাইনের জন্য রাখা হয়েছে:/.test(document.getElementById("recitOfflineStatus")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
    const status = await page.evaluate(() => document.getElementById("recitOfflineStatus")?.textContent ?? "");
    check(`${tag} the save ends "Saved for offline: …"`, /Saved for offline:|অফলাইনের জন্য রাখা হয়েছে:/.test(status), status);
    const keys = await cacheKeys(page);
    check(`${tag} the worker's cache mm-audio-v1 holds exactly Sūrah 1's 7 files`, keys.length === 7 && keys.every((u) => /abdullah-ali-basfar\.ayahbyayah\/001\d{3}\.mp3$/.test(u)), JSON.stringify(keys));
    const listed = await page.evaluate(() => [...document.querySelectorAll(".recit-off-list li")].map((l) => l.textContent.trim()));
    check(`${tag} the sūrah is listed as saved, with a size and a Remove`, listed.length === 1 && (lang === "bn" ? /১/ : /Surah 1 /).test(listed[0]) && /0\.2|০\.২/.test(listed[0]) && !!(await page.$("[data-recit-remove='1'], #recitOfflineRemove")), JSON.stringify(listed));
    if (width === 390 && lang === "en") {
      await page.reload({ waitUntil: "networkidle" });
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
      await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(500);
      check(`${tag} the saved sūrah is still listed after a reload`, (await page.$$(".recit-off-list li")).length === 1);
    }

    // ---- the network cut
    await ctx.setOffline(true); net = false;
    const on = await play(page, FIRST, 0.8);
    check(`${tag} offline: a saved file PLAYS (currentTime > 0)`, on.played && !on.error, JSON.stringify(on));
    check(`${tag} offline: a saved file SEEKS (a Range request answered by the worker)`, on.seeked === true, JSON.stringify(on));
    const off = await play(page, OTHER);
    check(`${tag} offline control: a file that was NOT saved does not play`, !off.played, JSON.stringify(off));
    await ctx.setOffline(false); net = true;

    // ---- Remove
    await page.click("[data-recit-remove='1'], #recitOfflineRemove");
    await page.waitForFunction(() => (document.querySelectorAll(".recit-off-list li").length === 0), null, { timeout: 5000 }).catch(() => {});
    check(`${tag} Remove: the list is empty again`, (await page.$$(".recit-off-list li")).length === 0);
    check(`${tag} Remove: the cache holds none of Sūrah 1's files`, (await cacheKeys(page)).length === 0, JSON.stringify(await cacheKeys(page)));
    await ctx.setOffline(true); net = false;
    check(`${tag} Remove: offline playback of it fails again`, !(await play(page, FIRST)).played);
    await ctx.close(); net = true;

    // ---- a host that cannot be reached
    if (width === 390) {
      const c2 = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, allowServiceWorker: true });
      await c2.route("https://archive.org/download/**", (r) => r.abort());
      const { page: p2 } = await openPage(c2, "/app/quranrevival.html");
      await p2.evaluate(() => navigator.serviceWorker.ready);
      await p2.reload({ waitUntil: "networkidle" });
      await p2.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await p2.click("#tabStudyBtn"); await p2.waitForTimeout(200);
      await p2.click("#tabStudyOptionsBtn"); await p2.waitForTimeout(500);
      await p2.selectOption("#recitOfflineSurah", "1");
      await p2.click("#recitOfflineSave");
      await p2.waitForFunction(() => /Could not save|রাখা যায়নি/.test(document.getElementById("recitOfflineStatus")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
      const bad = await p2.evaluate(() => ({ text: document.getElementById("recitOfflineStatus")?.textContent ?? "", role: document.getElementById("recitOfflineStatus")?.getAttribute("role"), rows: document.querySelectorAll(".recit-off-list li").length }));
      check(`${tag} a host that cannot be reached or does not allow saving: the save says it could not, in words (role=alert)`, /Could not save this recitation|এই তিলাওয়াত রাখা যায়নি/.test(bad.text) && bad.role === "alert", JSON.stringify(bad));
      check(`${tag} a host that cannot be reached: nothing is listed as saved`, bad.rows === 0, JSON.stringify(bad));
      await c2.close();
    }
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
