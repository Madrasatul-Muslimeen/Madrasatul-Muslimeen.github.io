// QR Lead, 28 Oct 2026 -- the Architect's finding: behaviour 38e ("pressing Play again starts the unit over") failed
// 1-5 times in 8. Measured with a 10ms trace of āyah + button label: in every failing run the "second Play" landed
// 2-6ms after āyah 7 BEGAN. Between two āyāt the shared <audio> is paused while the next āyah seeks (a segmented
// reciter) or loads (a direct one), so ▶/⏸ flashed "▶ Play" at EVERY āyah; 38e's "wait for Play" caught the flash at
// āyah 7 and its click was a Pause of a run still going. At the real end, Play restarted 8 times in 8.
// The fix (audio-player.js isRunContinuing; quranrevival.html renderReadTransport / playCurrentSelection): a run between
// two āyāt is still playing -- the button reads ⏸ through the gap, a tap there pauses and the pause HOLDS (the next
// āyah does not start by itself), and ▶ resumes at that āyah rather than starting the unit over.
// Each scenario runs REPEAT times (default 3; the evidence run used 8), because the defect was intermittent.
//   A  Bangla (segmented), a Ruku' (1:1-7): the label never reads Play before the run ends; at the end Play restarts.
//   B  Bangla, and C Arabic (one file per āyah): a tap at the very moment āyah 4 starts (synchronously from the app's
//      own āyah change, i.e. while the next āyah is still seeking/loading) pauses and holds; ▶ resumes at āyah 4.
//   node tools/i18n-verify/qr-play-run-gap-browser.mjs [--mutate=label-flash|tap-resumes|no-hold|no-held-pause]
//   --mutate=label-flash    the label reads isPlaying() alone             -> A's "never Play mid-run" FAILS
//   --mutate=tap-resumes    a tap in the gap is not a pause               -> B and C FAIL (the run carries on / restarts)
//   --mutate=no-hold        startPlayback ignores a pause taken in a gap  -> B and C FAIL (āyah 4 starts by itself)
//   --mutate=no-held-pause  isPaused() forgets a held pause before the next file loads -> C FAILS (▶ restarts at 1)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "label-flash": ["app/quranrevival.html", "const playing = isPlaying() || isRunContinuing();", "const playing = isPlaying();"],
  "tap-resumes": ["app/quranrevival.html", "if (isPlaying() || isRunContinuing()) { pauseAudio();", "if (isPlaying()) { pauseAudio();"],
  "no-hold": ["app/js/audio-player.js", "if (userPaused && drillAbortController) return Promise.resolve();", ""],
  "no-held-pause": ["app/js/audio-player.js", "if (userPaused && drillAbortController && audioEl && !audioEl.error) return true;", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const REPEAT = Number(process.env.REPEAT || 3);

// The audio behaviour.mjs section 38 serves: real, decodable silence (a 0.5s file per āyah, a 3s surah file) and a
// timing map giving surah 1's seven āyāt 300ms each.
function silentWav(seconds, rate = 8000) {
  const dataLen = Math.round(seconds * rate) * 2, buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(dataLen, 40);
  return buf;
}
const WAV_AYAH = silentWav(0.5), WAV_SURAH = silentWav(3);
const TIMINGS = JSON.stringify({ 1: Array.from({ length: 7 }, (_, i) => ({ verse_key: `1:${i + 1}`, timestamp_from: i * 300, timestamp_to: (i + 1) * 300 })) });
const isSurahFile = (url) => /ShareefBayezidMahmud|al-quran-eng-mp3-audio/.test(url);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function setup(reciter) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: isSurahFile(r.request().url()) ? WAV_SURAH : WAV_AYAH }));
  if (MUTATE) {
    const [file, from, to] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (src.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
    const body = src.replace(from, to);
    const re = file.endsWith(".html") ? /\/app\/quranrevival\.html(\?.*)?$/ : /\/app\/js\/audio-player\.js(\?.*)?$/;
    await ctx.route(re, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript", body }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  if (!(await page.evaluate(() => (document.getElementById("tabStudyOptionsBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(120); }
  await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(200);
  for (const id of ["ar", "bn"]) {
    const box = `.drill-reciter-check[value="${id}"]`;
    if (id === reciter) await page.check(box); else if (await page.isChecked(box)) await page.uncheck(box);
  }
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(400);
  // A trace of every label the button is given, with the āyah at that moment (a MutationObserver sees every set,
  // however brief -- a 10ms poll missed some), and of every āyah the selector is set to.
  await page.evaluate(() => {
    window.__labels = []; window.__ayahs = [];
    const b = document.getElementById("readPlayBtn"), sel = document.getElementById("ayahSelect");
    new MutationObserver(() => window.__labels.push(`${sel.value}:${b.getAttribute("aria-label")}`)).observe(b, { attributes: true, attributeFilter: ["aria-label"] });
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); window.__ayahs.push(String(v)); if (window.__onAyah) window.__onAyah(String(v)); } });
  });
  return { ctx, page };
}
const waitFor = (page, fn, timeout = 8000, arg = null) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);
const label = (page) => page.evaluate(() => document.getElementById("readPlayBtn").getAttribute("aria-label") || "");
const isPlay = /Play|চালান/;

for (let run = 1; run <= REPEAT; run++) {
  // --- A: no "▶ Play" while the run is going; at the end, Play starts it over.
  {
    const { ctx, page } = await setup("bn");
    await page.click("#drillPlayBtn");
    const reached = await waitFor(page, () => document.getElementById("ayahSelect").value === "7", 20000);
    // the real end: the label reads Play and goes on reading it
    const ended = await waitFor(page, () => {
      const b = document.getElementById("readPlayBtn");
      if (!/Play|চালান/.test(b.getAttribute("aria-label") || "")) { window.__playSince = 0; return false; }
      window.__playSince ||= performance.now();
      return performance.now() - window.__playSince > 1000;
    }, 10000);
    const labels = await page.evaluate(() => window.__labels);
    const firstPause = labels.findIndex((l) => !/Play|চালান/.test(l.split(":")[1]));
    // a Play label is mid-run when a Pause label follows it (the end may set Play more than once)
    const lastPause = labels.findLastIndex((l) => !/Play|চালান/.test(l.split(":")[1]));
    const midRunPlay = labels.slice(firstPause, lastPause).filter((l) => /Play|চালান/.test(l.split(":")[1]));
    check(`A${run} Bangla Ruku': the run reaches āyah 7 and ends reading Play`, reached && ended, labels.slice(-4).join(" "));
    check(`A${run} ...and the button never reads Play while the run is going (between āyāt)`, firstPause >= 0 && midRunPlay.length === 0,
      `${midRunPlay.length} mid-run Play label(s): ${midRunPlay.slice(0, 6).join(" ")}`);
    await page.click("#readPlayBtn");
    const restarted = await waitFor(page, () => document.getElementById("ayahSelect").value === "1", 5000);
    check(`A${run} ...and Play pressed after the end starts the unit over (behaviour 38e)`, restarted, await page.evaluate(() => document.getElementById("ayahSelect").value));
    await page.close(); await ctx.close();
  }
  // --- B (Bangla) and C (Arabic): a tap in the gap as āyah 4 starts pauses, holds, and ▶ resumes at āyah 4.
  for (const [tag, reciter] of [["B", "bn"], ["C", "ar"]]) {
    const { ctx, page } = await setup(reciter);
    // the tap lands synchronously inside the app's own move to āyah 4: the next āyah is still seeking or loading
    await page.evaluate(() => { let done = false; window.__onAyah = (v) => { if (v === "4" && !done) { done = true; window.__tapAt = window.__ayahs.length; document.getElementById("readPlayBtn").click(); } }; });
    await page.click("#drillPlayBtn");
    const tapped = await waitFor(page, () => window.__tapAt > 0, 20000);
    await page.waitForTimeout(1800);
    const held = await page.evaluate(() => ({ ayah: document.getElementById("ayahSelect").value, after: window.__ayahs.slice(window.__tapAt) }));
    const lbl = await label(page);
    check(`${tag}${run} ${reciter}: a tap as āyah 4 starts pauses it, and the pause holds (still āyah 4, the button reads Play)`,
      tapped && held.ayah === "4" && held.after.length === 0 && isPlay.test(lbl), `${JSON.stringify(held)} label "${lbl}"`);
    const mark = await page.evaluate(() => window.__ayahs.length);
    await page.click("#readPlayBtn");
    const finished = await waitFor(page, () => document.getElementById("ayahSelect").value === "7"
      && /Play|চালান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), 15000);
    const after = await page.evaluate((m) => window.__ayahs.slice(m), mark);
    check(`${tag}${run} ${reciter}: ▶ resumes at āyah 4 and runs on to 7 (no restart at 1)`,
      finished && after.every((a) => Number(a) >= 4), `finished ${finished}, āyāt after ▶: ${after.join(",")}`);
    await page.close(); await ctx.close();
  }
}
await browser.close();
console.log(`\n==== QR Play: a run between āyāt is still playing${MUTATE ? ` [mutated: ${MUTATE}]` : ""} (x${REPEAT}): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
