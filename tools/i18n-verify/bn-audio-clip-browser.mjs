// J95 (the Owner, 24 Oct 2026: "Bangla audio sometimes plays part of the previous āyah and part of the next").
//
// Before: the Bangla reciter's āyah was played by SEEKING its whole-surah VBR MP3 to timestamp_from and stopping at
// timestamp_to. A browser places a VBR seek by estimate, and the MSA Architect measured the element landing 0.5 s
// early in 036 and 51-147 s early in 002 (no Xing table). Now each āyah is fetched as its own byte range
// (tools/quran-data-pull/output/bn-audio-bytes.json, frame-exact, starts lined up with this recording's pauses) and
// played from 0 to its own end.
//
// Proved here, with archive.org served from local copies of the real files (this sandbox's TLS interception stops the
// browser reaching outside hosts; the route answers Range requests the way archive.org does: 206 + Content-Range):
//   1. Playing an āyah asks for exactly that āyah's bytes (one Range request, the map's row) and plays a blob: clip,
//      with no seek on the element.
//   2. The clip IS that āyah: the browser's own decode of the clip, cross-correlated with an ffmpeg decode of the whole
//      file, peaks within 60 ms of where the map says the clip starts, with a strong match (>= 0.6), for an early,
//      a middle and a late āyah of 002, one of 036 and one of 005.
//      POSITIVE CONTROL: the same clip against the file 3 s further on does NOT match (< 0.4).
//   3. A range (2:254-2:256) plays the three āyāt in order, each its own Range request.
//   4. Without the byte map (404), the old seek path still plays (no Range header): the fallback is kept.
// Mutations (--mutate=NAME) must FAIL:
//   seek    the byte map is never read (the old seek path)        -> 1, 2, 3
//   shift   every clip starts 1 s (about 38 frames) late           -> 2
// Run from the repository root with serve.js on :8080 (QR_BASE for another port). It downloads 002, 005 and 036 once
// into a cache folder (BN_AUDIO_CACHE, default the system temp folder) and needs ffmpeg.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";
import { walkFrames } from "../quran-data-pull/build-bn-audio-bytes.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !["seek", "shift"].includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);

const MAP = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/bn-audio-bytes.json", "utf8"));
const FOLDER = "Quran Bangla mp3 - Shareef Bayezid Mahmud";
const CACHE = process.env.BN_AUDIO_CACHE || path.join(os.tmpdir(), "bn-audio-cache");
fs.mkdirSync(CACHE, { recursive: true });
const file = (n) => {
  const f = path.join(CACHE, `${String(n).padStart(3, "0")}.mp3`);
  if (!fs.existsSync(f) || fs.statSync(f).size !== MAP.surahs[String(n)].size) {
    const url = `https://archive.org/download/ShareefBayezidMahmud/${encodeURIComponent(FOLDER)}/${String(n).padStart(3, "0")}.mp3`;
    execFileSync("curl", ["-sS", "-L", "--fail", "--retry", "3", "-o", f, url]);
  }
  return f;
};
const pcmOf = (n) => {
  const f = path.join(CACHE, `${String(n).padStart(3, "0")}.8k.pcm`);
  if (!fs.existsSync(f)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file(n), "-ac", "1", "-ar", "8000", "-f", "s16le", f]);
  return new Int16Array(fs.readFileSync(f).buffer.slice(0));
};
const SURAHS = [2, 5, 36];
const PCM = Object.fromEntries(SURAHS.map((n) => [n, pcmOf(n)]));
const BYTES = Object.fromEntries(SURAHS.map((n) => [n, fs.readFileSync(file(n))]));

/** Normalised cross-correlation of `clip` (8 kHz) against `full` at lags around `expectMs`; the best lag and score. */
function correlate(full, clip, expectMs, spanMs = 2000, skipMs = 1500) {
  // A clip now starts in the pause before its āyah, so its first second can be silence, which matches nothing: the
  // 3 s compared start skipMs into the clip, and the lag is reported for the clip's own start.
  const skip = Math.round((skipMs * 8000) / 1000);
  const L = Math.min(clip.length - skip, 8000 * 3);
  const c = clip.subarray(skip, skip + L);
  const cm = c.reduce((s, x) => s + x, 0) / L;
  const cz = Float64Array.from(c, (x) => x - cm);
  const cn = Math.sqrt(cz.reduce((s, x) => s + x * x, 0)) || 1;
  let best = { lagMs: null, score: -1 };
  const at = (lag) => {
    if (lag < 0 || lag + L > full.length) return -1;
    let fm = 0; for (let i = 0; i < L; i++) fm += full[lag + i]; fm /= L;
    let dot = 0, fn = 0; for (let i = 0; i < L; i++) { const f = full[lag + i] - fm; dot += f * cz[i]; fn += f * f; }
    return dot / (cn * (Math.sqrt(fn) || 1));
  };
  const c0 = Math.round(((expectMs + skipMs) * 8000) / 1000), span = Math.round((spanMs * 8000) / 1000);
  for (let lag = c0 - span; lag <= c0 + span; lag += 8) { const s = at(lag); if (s > best.score) best = { lag, score: s }; }
  for (let lag = best.lag - 8; lag <= best.lag + 8; lag++) { const s = at(lag); if (s > best.score) best = { lag, score: s }; }
  return { lagMs: (best.lag * 1000) / 8000 - skipMs, score: best.score, at: (clipStartLag) => at(clipStartLag + skip) };
}
const WALK = Object.fromEntries(SURAHS.map((n) => [n, walkFrames(BYTES[n])]));
const expectedStartMs = (n, byte) => {
  const w = WALK[n];
  const i = w.offsets.indexOf(byte);
  if (i < 0) throw new Error(`byte ${byte} of surah ${n} is not a frame start`);
  return (i * 1000 * w.samplesPerFrame) / w.sampleRate;
};

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
async function open({ noMap = false } = {}) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 1280, height: 800 } });
  const ranges = [], allRanges = [];
  // archive.org from the local copies: Range answered with 206 + Content-Range, like the real server
  await ctx.route(/archive\.org\/.*\.mp3/, async (route) => {
    const url = route.request().url();
    const n = Number(url.match(/(\d{3})\.mp3/)?.[1] ?? url.match(/\/(\d+)\.mp3/)?.[1]);
    const buf = BYTES[n];
    if (!buf) return route.fulfill({ status: 404, body: "" });
    const range = route.request().headers().range || null;
    ranges.push({ n, range });
    allRanges.push({ n, range });
    const head = { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": "audio/mpeg" };
    const m = range && range.match(/bytes=(\d+)-(\d*)/);
    if (!m) return route.fulfill({ status: 200, headers: head, body: buf });
    // an open-ended "bytes=N-" (the element streaming the whole file, the old seek path) is answered 2 MB at a time,
    // which a server may do and a browser handles; answering 82 MB per request crashed the page
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : Math.min(buf.length - 1, a + 2 * 1024 * 1024 - 1);
    return route.fulfill({ status: 206, headers: { ...head, "content-range": `bytes ${a}-${b}/${buf.length}` }, body: buf.subarray(a, b + 1) });
  });
  await ctx.route("**/tools/quran-data-pull/output/bn-audio-bytes.json*", async (route) => {
    if (noMap || MUTATE === "seek") return route.fulfill({ status: 404, body: "" });
    let map = MAP;
    if (MUTATE === "shift") {
      // every clip 1 s late: move each start ~38 frames on (to a real frame start)
      map = JSON.parse(JSON.stringify(MAP));
      for (const n of SURAHS) {
        const w = WALK[n], k = Math.round(1000 / ((1000 * w.samplesPerFrame) / w.sampleRate));
        map.surahs[String(n)].ayahs = map.surahs[String(n)].ayahs.map(([s, e, t]) => { const i = w.offsets.indexOf(s); return [w.offsets[Math.min(w.offsets.length - 1, i + k)], e, t]; });
      }
      console.log("  (mutation shift: every clip start moved 1 s on)");
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(map) });
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  // the timestamps for the seek path come from raw.githubusercontent.com in the real app: serve the repository copy
  await ctx.route("https://raw.githubusercontent.com/**/gtaf_bangla_timestamps.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync("gtaf_bangla_timestamps.json") }));
  return { ctx, page, errors, ranges, allRanges };
}

// The player keeps its <audio> private, so the page is given a hook: every Audio() made is remembered.
const HOOK = `(() => { const A = window.Audio; window.__audios = []; window.Audio = function (...x) { const el = new A(...x); window.__audios.push(el); el.addEventListener("seeking", () => { el.__seeks = (el.__seeks || 0) + 1; }); return el; }; window.Audio.prototype = A.prototype; })();`;

async function play(page, surah, ayah) {
  // wait for THIS āyah's clip: the element's source must change and play (after a stop, the previous clip sits paused
  // past 0.3 s and would otherwise be read as this one)
  const before = await page.evaluate(() => { const el = window.__audios?.at(-1); return el ? el.currentSrc || el.src : null; });
  await page.evaluate(([s, a]) => import("/app/js/audio-player.js").then((ap) => { window.__ap = ap; window.__err = null; ap.playSegmentedAyah(s, a, "bn").catch((e) => { window.__err = String(e?.message || e); }); }), [surah, ayah]);
  for (const end = Date.now() + 15000; Date.now() < end;) {
    const st = await page.evaluate(() => { const el = window.__audios?.at(-1); return el ? { t: el.currentTime, src: el.currentSrc || el.src, paused: el.paused, err: window.__err } : { err: window.__err }; });
    if (st.err || (st.src && st.src !== before && !st.paused && st.t > 0.3)) break;
    await page.waitForTimeout(100);
  }
  return page.evaluate(async () => {
    const el = window.__audios?.at(-1);
    if (!el) return { err: window.__err || "no audio element" };
    const out = { src: el.currentSrc || el.src, t: el.currentTime, seeks: el.__seeks || 0, err: window.__err };
    if (out.src.startsWith("blob:")) {
      const buf = await (await fetch(out.src)).arrayBuffer();
      const ac = new OfflineAudioContext(1, 8000 * 5, 8000);
      const decoded = await ac.decodeAudioData(buf.slice(0));
      out.decodedSec = decoded.duration;
      const src = ac.createBufferSource(); src.buffer = decoded; src.connect(ac.destination); src.start();
      const rendered = await ac.startRendering();
      out.pcm = Array.from(rendered.getChannelData(0), (x) => Math.round(x * 32767));
    }
    window.__ap.stop();
    return out;
  });
}

// ---------------------------------------------------------------------------------------------------------------
const CASES = [[2, 5, "early"], [2, 142, "middle"], [2, 255, "late"], [36, 38, ""], [5, 50, ""]];
{
  const { ctx, page, errors, ranges, allRanges } = await open();
  await page.addInitScript(HOOK);
  await page.reload({ waitUntil: "networkidle" });
  for (const [s, a, where] of CASES) {
    const tag = `[${s}:${a}${where ? " " + where : ""}]`;
    const row = MAP.surahs[String(s)].ayahs[a - 1];
    ranges.length = 0;
    const r = await play(page, s, a);
    const asked = ranges.filter((x) => x.n === s);
    check(`${tag} 1. one Range request, for exactly this āyah's bytes (${row[0]}-${row[1] - 1})`, asked.length === 1 && asked[0].range === `bytes=${row[0]}-${row[1] - 1}`, JSON.stringify(asked));
    check(`${tag} 1. it plays a blob: clip of its own, with no seek on the element`, !!r.src && r.src.startsWith("blob:") && r.seeks === 0 && r.t > 0 && !r.err, JSON.stringify({ src: r.src?.slice(0, 30), seeks: r.seeks, t: r.t, err: r.err }));
    if (r.pcm) {
      const expect = expectedStartMs(s, row[0]);
      const c = correlate(PCM[s], Int16Array.from(r.pcm), expect);
      check(`${tag} 2. the clip IS this place in the recording: best match ${c.lagMs?.toFixed(0)} ms vs the map's ${expect.toFixed(0)} ms (within 60), score ${c.score.toFixed(2)} (>= 0.6)`, Math.abs(c.lagMs - expect) <= 60 && c.score >= 0.6, JSON.stringify({ lag: c.lagMs, expect, score: c.score }));
      const off = c.at(Math.round(((expect + 3000) * 8000) / 1000));
      check(`${tag} 2. POSITIVE CONTROL: 3 s further on does not match (${off.toFixed(2)} < 0.4)`, off < 0.4, String(off));
    } else {
      check(`${tag} 2. the clip IS this place in the recording`, false, "no clip to decode");
    }
  }
  // 3. a range plays its āyāt in order, each its own request (the log since the page opened: 2:255's clip, fetched by
  //    test 2, may come from the player's small cache, which is right)
  const order = await page.evaluate(async () => {
    const ap = window.__ap; const seen = [];
    ap.setAyahChangeHandler((s, a) => seen.push(`${s}:${a}`));
    ap.playAyahRange(2, 254, 256, "bn").catch(() => {});
    const t0 = performance.now();
    // let each clip run 1.5 s, then send it to its end so the range moves on
    while (seen.length < 3 && performance.now() - t0 < 30000) {
      await new Promise((r) => setTimeout(r, 1500));
      const el = window.__audios.at(-1);
      if (el && el.duration && isFinite(el.duration)) el.currentTime = Math.max(0, el.duration - 0.2);
    }
    await new Promise((r) => setTimeout(r, 1500));
    ap.stop();
    return seen;
  });
  const asked = allRanges.filter((x) => x.n === 2).map((x) => x.range);
  const want = [254, 255, 256].map((a) => { const row = MAP.surahs["2"].ayahs[a - 1]; return `bytes=${row[0]}-${row[1] - 1}`; });
  check(`[2:254-256] 3. a range plays 2:254, 2:255, 2:256 in order`, order.slice(0, 3).join(",") === "2:254,2:255,2:256", JSON.stringify(order));
  check(`[2:254-256] 3. ...each from its own Range request (this page's log)`, want.every((w) => asked.includes(w)), JSON.stringify({ asked, want }));
  check("no page errors", errors.filter((e) => !/ERR_CERT|net::|Failed to load resource|quran\.foundation|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// 4. without the map, the old seek path still plays
if (!MUTATE) {
  const { ctx, page, ranges } = await open({ noMap: true });
  await page.addInitScript(HOOK);
  await page.reload({ waitUntil: "networkidle" });
  ranges.length = 0;
  const r = await play(page, 36, 38);
  // the element streams the whole-surah file itself (its own open-ended "bytes=N-" requests, never a map row) and seeks
  const row = MAP.surahs["36"].ayahs[37];
  check("[36:38, no byte map] 4. the old seek path still plays: the whole-surah file, not a clip, seeked to the āyah", !!r.src && /036\.mp3$/.test(r.src) && ranges.length > 0 && ranges.every((x) => x.n === 36 && (!x.range || /^bytes=\d+-$/.test(x.range))) && !ranges.some((x) => x.range === `bytes=${row[0]}-${row[1] - 1}`) && r.seeks >= 1 && r.t > 300, JSON.stringify({ src: r.src, ranges, t: r.t, seeks: r.seeks, err: r.err }));
  await ctx.close();
}

await browser.close();
console.log(`\n==== J95 Bangla audio plays each āyah as its own clip${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
