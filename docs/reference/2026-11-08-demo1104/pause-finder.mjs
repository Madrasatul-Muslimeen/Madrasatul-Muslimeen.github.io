// PCF MSA J121 demo1104 (QR Lead, 8 Nov 2026) -- finds where each āyah starts in ONE sūrah's recording from its pauses.
// PURE: numbers in, numbers out. No audio is stored, fetched or sent anywhere; only the TIMES (seconds) come out.
// loudnessFrames(samples, rate)  -> dB per 20 ms frame
// findPauses(db, opts)           -> [{from, to, mid}] seconds: stretches clearly quieter than the speech, long enough to be a pause
// layOut(pauses, total, {ayat, joined}) -> the opening, each āyah's [from,to], and plain-words issues (count check)

export const FRAME_MS = 20;

/** Loudness (dB, RMS) of each 20 ms frame of mono samples (-1..1). */
export function loudnessFrames(samples, rate, frameMs = FRAME_MS) {
  const len = Math.max(1, Math.round(rate * frameMs / 1000)), n = Math.floor(samples.length / len), db = new Float64Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let i = f * len; i < (f + 1) * len; i++) s += samples[i] * samples[i]; db[f] = 20 * Math.log10(Math.sqrt(s / len) + 1e-9); }
  return db;
}

const median = (a) => { const b = Array.from(a).sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

/**
 * A pause = a run quieter than (the median loudness - dropDb), at least minPause seconds long. Runs closer than mergeGap are
 * ONE pause (a blip inside a pause must not split it into two). `mid` is the middle of the pause: an āyah starts there, so a
 * few hundred ms of timing error can never cut a word.
 */
export function findPauses(db, { frameMs = FRAME_MS, dropDb = 7, minPause = 0.6, mergeGap = 0.2, smooth = 3 } = {}) {
  const n = db.length; if (!n) return [];
  const s = new Float64Array(n), h = Math.floor(smooth / 2);
  for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let k = i - h; k <= i + h; k++) if (k >= 0 && k < n) { a += db[k]; c++; } s[i] = a / c; }
  const thr = median(db) - dropDb, dt = frameMs / 1000, runs = [];
  for (let i = 0; i < n;) {
    if (s[i] < thr) { let j = i; while (j < n && s[j] < thr) j++; if ((j - i) * dt >= minPause) runs.push([i * dt, j * dt]); i = j; } else i++;
  }
  const merged = [];
  for (const r of runs) { const last = merged[merged.length - 1]; if (last && r[0] - last[1] < mergeGap) last[1] = r[1]; else merged.push([r[0], r[1]]); }
  return merged.map(([from, to]) => ({ from, to, mid: (from + to) / 2 }));
}

/**
 * Lay the pauses onto a sūrah of `ayat` āyāt. `joined` = [[22,23]]: āyāt the reciter says with NO pause between them; they
 * share one [from,to] and play together. `together` = [[28,29],…]: āyāt that DO have a pause between them (it is counted
 * as a boundary) but the Owner wants them played as one stretch, so both get [start of the first, end of the second]. A sound file usually starts with the opening (Aʿūdhu + Bismillah) and ends with
 * silence: the FIRST pause closes the opening (opening=true) and a LAST pause that reaches the end of the file is only the
 * ending. Boundaries needed = ayat - 1 - (number of joined pairs). Anything else is reported, never hidden.
 */
export function layOut(pauses, total, { ayat, joined = [], together = [], hasOpening = true } = {}) {
  const issues = [], p = pauses.slice();
  let tail = null; if (p.length && total - p[p.length - 1].to < 0.3) tail = p.pop();
  let openEnd = 0; if (hasOpening) { if (!p.length) issues.push("no-opening"); else openEnd = p.shift().mid; }
  const need = ayat - 1 - joined.length;
  if (p.length !== need) issues.push(p.length < need ? "missing" : "surplus");
  const bounds = p.map((x) => x.mid), skip = new Set(joined.map(([a, b]) => b)); // b starts where a starts: no boundary between them
  const ayahs = []; let bi = 0, from = openEnd;
  for (let a = 1; a <= ayat; a++) {
    if (skip.has(a)) { ayahs.push({ n: a, from: ayahs[ayahs.length - 1]?.from ?? from, to: ayahs[ayahs.length - 1]?.to ?? from }); continue; }
    const to = a === ayat ? (tail ? tail.from + Math.min(0.5, (tail.to - tail.from) / 2) : total) : (bounds[bi++] ?? null);
    ayahs.push({ n: a, from, to }); from = to;
  }
  for (const [a, b] of together) { const x = ayahs[a - 1], y = ayahs[b - 1]; if (x && y && y.to !== null) { x.to = y.to; y.from = x.from; } }
  for (const a of ayahs) a.pair = [...joined, ...together].find(([x, y]) => a.n === x || a.n === y) ?? null;
  return { opening: hasOpening ? { from: 0, to: openEnd } : null, ayahs, found: p.length, need, issues, ok: issues.length === 0 };
}
