// J95 (24 Oct 2026, the Owner: "Bangla audio sometimes plays part of the previous āyah and part of the next").
//
// The Bangla reciter (Shareef Bayezid Mahmud, archive.org) is one VBR MP3 per surah, and the app used to seek the
// <audio> element to each āyah's timestamp_from and stop at timestamp_to. A browser seeks a VBR MP3 by ESTIMATE:
// 106 files carry a Xing table of only 100 points, and 002.mp3 has no table at all, so the element's clock was up to
// 147 s off in Al-Baqarah (measured by the MSA Architect) and the reader heard the wrong āyah.
//
// This tool reads each file's MP3 frames once and maps every āyah's [timestamp_from, timestamp_to] (ms, from
// gtaf_bangla_timestamps.json) to frame-exact byte offsets. The app then fetches just those bytes (an HTTP Range
// request) and plays them as their own little clip, from its start to its end: no seek, no clock to trust.
//
// Output: tools/quran-data-pull/output/bn-audio-bytes.json
//   { v: 1, frameMs, surahs: { "<n>": { size, frames, ms, ayahs: [[startByte, endByte, flag], ...] } } }
//   flag: 1 checked against this recording; 2 not checked, its own map times in pauses; 0 not checked (see main())
//   endByte is exclusive. The start is ONE FRAME EARLY (the frame before the one holding timestamp_from) so the first
//   frame we want has its bit-reservoir bytes; that costs at most one frame (~26-36 ms) of the gap before the āyah.
//
// Run from the repository root (it downloads each surah once into a temporary folder and deletes it after reading):
//   node tools/quran-data-pull/build-bn-audio-bytes.mjs            all 114
//   node tools/quran-data-pull/build-bn-audio-bytes.mjs 2 36 108   only these (merged into an existing output)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = "tools/quran-data-pull/output/bn-audio-bytes.json";
const TIMESTAMPS = "gtaf_bangla_timestamps.json";
const FOLDER = "Quran Bangla mp3 - Shareef Bayezid Mahmud";
// The same two places audio-player.js's bn.surahUrl names (surahs 101-114 sit at the item root).
const surahUrl = (n) => (n <= 100
  ? `https://archive.org/download/ShareefBayezidMahmud/${encodeURIComponent(FOLDER)}/${String(n).padStart(3, "0")}.mp3`
  : `https://archive.org/download/ShareefBayezidMahmud/${n}.mp3`);

const BITRATES = {
  // [version][layer III] kbps; index 0 = free, 15 = bad
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
};
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };

/** Every Layer III frame in the file: { offsets[], sampleRate, samplesPerFrame }, the Xing/Info/VBRI frame left out. */
export function walkFrames(buf) {
  let p = 0;
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    p = 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  const offsets = [];
  let sampleRate = 0, samplesPerFrame = 0, resyncs = 0, infoFrame = null;
  const header = (i) => {
    if (i + 4 > buf.length || buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return null;
    const vBits = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3;
    if (vBits === 1 || layer !== 1) return null; // reserved version, or not Layer III
    const version = vBits === 3 ? 1 : vBits === 2 ? 2 : 25;
    const br = BITRATES[version === 1 ? 1 : 2][(buf[i + 2] >> 4) & 15];
    const srIdx = (buf[i + 2] >> 2) & 3;
    if (br <= 0 || srIdx === 3) return null;
    const sr = RATES[version][srIdx], pad = (buf[i + 2] >> 1) & 1;
    const spf = version === 1 ? 1152 : 576;
    const len = Math.floor(((spf / 8) * br * 1000) / sr) + pad;
    const mono = ((buf[i + 3] >> 6) & 3) === 3;
    return { len, sr, spf, version, mono };
  };
  while (p < buf.length - 4) {
    const h = header(p);
    // a real frame is followed by another real frame (or the end): this refuses a stray 0xFFE in tag data
    if (!h || (p + h.len < buf.length - 4 && !header(p + h.len))) { p++; resyncs++; continue; }
    if (!sampleRate) { sampleRate = h.sr; samplesPerFrame = h.spf; }
    if (!offsets.length && infoFrame === null) {
      const side = h.version === 1 ? (h.mono ? 17 : 32) : (h.mono ? 9 : 17);
      const tag = buf.toString("latin1", p + 4 + side, p + 8 + side);
      if (tag === "Xing" || tag === "Info" || buf.toString("latin1", p + 36, p + 40) === "VBRI") { infoFrame = p; p += h.len; continue; }
      infoFrame = -1;
    }
    offsets.push(p);
    p += h.len;
  }
  return { offsets, end: p, sampleRate, samplesPerFrame, resyncs, infoFrame };
}

/** [startByte, endByte) for each [fromMs, toMs]: one frame early at the start, whole frames to the end. */
export function ayahBytes(walk, ranges) {
  const { offsets, end, sampleRate, samplesPerFrame } = walk;
  const frameMs = (1000 * samplesPerFrame) / sampleRate;
  const at = (i) => (i >= offsets.length ? end : offsets[Math.max(0, i)]);
  return ranges.map(([fromMs, toMs]) => {
    const first = Math.floor(fromMs / frameMs) - 1;
    const last = Math.ceil(toMs / frameMs); // exclusive frame index
    return [at(first), at(last)];
  });
}

/**
 * Line each āyah's start up with THIS recording (measured 25 Oct 2026: the map is Greentech's, timed against another
 * encode; 036 is off by +0.3 s, 005 by up to 31 s and in places not at all). Decodes the file (ffmpeg, 8 kHz mono),
 * finds its pauses (runs of 50 ms windows under 6% of the speech level, at least 300 ms long), and walks the āyāt in
 * order, carrying the shift found so far:
 *   - "snap": a pause ends within 2 s of where the map (plus the shift) says the āyah starts -> the start moves to
 *     150 ms before the voice comes back, inside that pause;
 *   - "relock": none does -> the shift from -45 s to +45 s that puts the most of this and the next seven starts inside
 *     pauses; only when all but one of the eight land in pauses (a looser rule found a false +31 s lock in 005, where
 *     pauses are many), the start snaps from there;
 *   - "lost": neither -> NOT TRUSTED: the āyah keeps the map's own times (see the ranges below), and the shift carried on
 *     is the last one found.
 * The first āyah keeps its start (the file opens with it). Each āyah ends where the next begins; the last at the end.
 */
export function alignToRecording(file, entries, tmp, n) {
  const raw = path.join(tmp, `${n}.pcm`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", raw]);
  const pcm = new Int16Array(fs.readFileSync(raw).buffer.slice(0));
  fs.unlinkSync(raw);
  const WIN = 400, nWin = Math.floor(pcm.length / WIN), rms = new Float32Array(nWin);
  for (let w = 0; w < nWin; w++) { let t = 0; for (let i = w * WIN; i < (w + 1) * WIN; i++) t += pcm[i] * pcm[i]; rms[w] = Math.sqrt(t / WIN); }
  // "quiet" is judged against the recording NEARBY (the 20 s either side): 005's 5:69-5:97 carries a hiss whose
  // quietest 5% is louder than the whole file's 6%-of-speech level, so a single threshold found one pause in 550 s.
  // A window is quiet under 12% of the local speech level (the local 60th percentile), or under the global level.
  const globalQuiet = [...rms].sort((x, y) => x - y)[Math.floor(nWin * 0.6)] * 0.06;
  const BLOCK = 100; // 5 s blocks, a local level per block from the 9 blocks around it
  const blockP60 = [];
  for (let b0 = 0; b0 < nWin; b0 += BLOCK) { const seg = [...rms.slice(b0, b0 + BLOCK)].sort((x, y) => x - y); blockP60.push(seg[Math.floor(seg.length * 0.6)] || 0); }
  const quietAt = (w) => { const bi = Math.floor(w / BLOCK); const near = blockP60.slice(Math.max(0, bi - 4), bi + 5).sort((x, y) => x - y); return Math.max(globalQuiet, near[Math.floor(near.length / 2)] * 0.12); };
  const pauses = [];
  for (let w = 0; w < nWin;) {
    if (rms[w] > quietAt(w)) { w++; continue; }
    let e = w; while (e < nWin && rms[e] <= quietAt(e)) e++;
    if ((e - w) * 50 >= 300) pauses.push([w * 50, e * 50]);
    w = e;
  }
  const inPause = (ms) => pauses.some(([a, b]) => ms >= a && ms <= b);
  const nearest = (ms, within) => { let best = null; for (const [a, b] of pauses) { const d = Math.abs(b - ms); if (d <= within && (!best || d < best.d)) best = { a, b, d }; } return best; };
  const audioMs = nWin * 50;
  let shift = 0;
  const starts = [entries[0].timestamp_from], how = ["first"];
  for (let i = 1; i < entries.length; i++) {
    const from = entries[i].timestamp_from;
    let hit = nearest(from + shift, 2000), kind = "snap";
    if (!hit) {
      let best = { score: -1, off: shift };
      const ahead = entries.slice(i, i + 8).map((e) => e.timestamp_from);
      for (let off = -45000; off <= 45000; off += 50) {
        const score = ahead.filter((t) => inPause(t + off)).length;
        if (score > best.score || (score === best.score && Math.abs(off - shift) < Math.abs(best.off - shift))) best = { score, off };
      }
      if (best.score >= ahead.length - 1 && ahead.length >= 3) { hit = nearest(from + best.off, 1000); kind = "relock"; }
    }
    if (hit) { const start = Math.max(hit.a, hit.b - 150); shift = start - from; starts.push(start); how.push(kind); }
    else { starts.push(Math.min(Math.max(0, from + shift), audioMs)); how.push("lost"); }
  }
  // keep the order strict: a start never comes before the previous one
  for (let i = 1; i < starts.length; i++) if (starts[i] <= starts[i - 1]) { starts[i] = starts[i - 1] + 1; how[i] = "lost"; }
  // A trusted āyah runs from its aligned start to the next āyah's start. A "lost" one is NOT given a guess: it keeps
  // the map's own [timestamp_from, timestamp_to] (exact bytes, no seek, but the map's times, as before), so what a
  // student hears there stays what the map says until the Owner decides (J95: the MSA Architect's request).
  const ranges = starts.map((st, i) => (how[i] === "lost"
    ? [entries[i].timestamp_from, Math.min(entries[i].timestamp_to, audioMs)]
    : [st, i + 1 < starts.length ? starts[i + 1] - 1 : audioMs]));
  const shifts = starts.map((st, i) => st - entries[i].timestamp_from);
  // J95 E (the Owner, 25 Oct 2026): a "lost" āyah whose OWN map times both sit in a pause of this recording (within
  // 300 ms; the end may also be the end of the file) is played as it is, with a "not checked yet" line ("own"); any
  // other lost āyah is played inside the nearest checked stretch by the app, so it never cuts a word.
  // The START must be a pause inside the recitation (the map can run past this file's end: 112's last āyah starts after
  // it, and a "clip" there was 418 bytes of nothing); the END may be the end of the file; the clip lasts 1 s or more.
  const inGap = (ms) => pauses.some(([a, b]) => ms >= a - 300 && ms <= b + 300);
  const own = how.map((h, i) => {
    const { timestamp_from: from, timestamp_to: to } = entries[i];
    return h === "lost" && from < audioMs - 1000 && Math.min(to, audioMs) - from >= 1000 && inGap(from) && (to >= audioMs - 100 || inGap(to));
  });
  return { ranges, how, own, shifts, audioMs, lost: how.filter((h) => h === "lost").length, relocks: how.filter((h) => h === "relock").length, maxShift: Math.max(...shifts.map(Math.abs)) };
}

const curl = (url, file) => execFileSync("curl", ["-sS", "-L", "--fail", "--retry", "3", "-o", file, url], { stdio: ["ignore", "ignore", "inherit"] });

async function main() {
  const ts = JSON.parse(fs.readFileSync(TIMESTAMPS, "utf8"));
  const want = process.argv.slice(2).map(Number).filter(Boolean);
  const list = want.length ? want : Array.from({ length: 114 }, (_, i) => i + 1);
  const out = fs.existsSync(OUT) && want.length ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { v: 1, source: "ShareefBayezidMahmud (archive.org) + gtaf_bangla_timestamps.json", surahs: {} };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bn-audio-"));
  try {
    for (const n of list) {
      const entries = ts[String(n)];
      if (!entries?.length) throw new Error(`no timestamps for surah ${n}`);
      // BN_AUDIO_CACHE: a folder of already-downloaded NNN.mp3 files (the same one bn-audio-clip-browser uses), read
      // when the size matches what the item serves last time; anything else is downloaded as before
      const cached = process.env.BN_AUDIO_CACHE && path.join(process.env.BN_AUDIO_CACHE, `${String(n).padStart(3, "0")}.mp3`);
      const file = cached && fs.existsSync(cached) && (!out.surahs[String(n)] || fs.statSync(cached).size === out.surahs[String(n)].size)
        ? cached : path.join(tmp, `${n}.mp3`);
      if (file !== cached) curl(surahUrl(n), file);
      const buf = fs.readFileSync(file);
      const walk = walkFrames(buf);
      if (walk.offsets.length < 10) throw new Error(`surah ${n}: only ${walk.offsets.length} frames found`);
      const frameMs = (1000 * walk.samplesPerFrame) / walk.sampleRate;
      const ms = Math.round(walk.offsets.length * frameMs);
      const lastTo = entries.at(-1).timestamp_to;
      // The map and the file must describe the same recording. Measured, not assumed (25 Oct 2026): 005's audio is
      // 2,632 s while its map runs to 2,663 s, so this is RECORDED per surah (lenDiffMs, and the boundary check below)
      // rather than thrown; the app plays only surahs whose boundaries are found to sit in the recitation's pauses.
      const lenDiffMs = lastTo - ms;
      const al = alignToRecording(file, entries, tmp, n);
      const ayahs = ayahBytes(walk, al.ranges);
      // per āyah: [startByte, endByte, flag]: 1 checked; 2 not checked, but its own map times sit in this recording's
      // pauses (played as it is, with a "not checked yet" line); 0 not checked (the app plays the nearest checked stretch)
      const rows = ayahs.map(([a, b], i) => [a, b, al.how[i] !== "lost" ? 1 : al.own[i] ? 2 : 0]);
      out.frameMs = +frameMs.toFixed(3);
      out.surahs[String(n)] = { size: buf.length, frames: walk.offsets.length, ms, lenDiffMs, lost: al.lost, maxShiftMs: al.maxShift, ayahs: rows };
      console.log(`surah ${String(n).padStart(3)}: ${walk.offsets.length} frames, ${(ms / 1000).toFixed(1)} s (last āyah ends ${(lastTo / 1000).toFixed(1)} s), ${entries.length} āyāt, ${walk.infoFrame > 0 ? "Xing/Info frame skipped" : "no Xing/Info frame"}${walk.resyncs ? `, ${walk.resyncs} bytes skipped` : ""}; map-vs-audio ${(lenDiffMs / 1000).toFixed(1)} s; aligned: ${entries.length - 1 - al.lost - al.relocks} snapped, ${al.relocks} relocked, ${al.lost} lost, largest shift ${(al.maxShift / 1000).toFixed(1)} s`);
      if (file !== cached) fs.unlinkSync(file);
      fs.writeFileSync(OUT, JSON.stringify(out));
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`wrote ${OUT}: ${Object.keys(out.surahs).length} surahs, ${fs.statSync(OUT).size} bytes`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
