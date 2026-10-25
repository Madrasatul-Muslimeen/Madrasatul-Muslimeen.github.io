// J95 E (the Owner ticked E, 25 Oct 2026): what a student hears on the Bangla āyāt whose timing could not be checked
// against this recording (bn-audio-bytes.json, a row's third field: 1 checked, 2 not checked but its own map times sit
// in the recording's pauses, 0 not checked).
//   B, flag 2: the āyah plays as it is, with one small line under the player: "Bangla timing for this āyah is not
//      checked yet." (and its Bangla), shown only while the Bangla reciter plays it.
//   D, flag 0: the nearest CHECKED STRETCH plays, from the last usable start at or before the āyah to the next usable
//      start after it, so a guessed boundary never cuts a word; the line names every āyah in it ("āyāt 1–3 play
//      together"). A checked āyah followed by unchecked ones is in the stretch too (its end is a guess). A range plays a
//      stretch once and carries on after it.
//
// Measured 25 Oct 2026: of the 316 unchecked āyāt only ONE (11:106) has map times that start and end in this
// recording's pauses (300 ms or longer, the builder's own rule for an āyah break); the other 315 are flag 0.
// Proved here with Hūd (011: 106 flag 2; 118-119 flag 0 between checked 117 and 120), Al-Ikhlāṣ (112: 1 checked, 2-4
// flag 0, the map running past the file's end) and Al-Fātiḥah (001, all checked), archive.org served from local copies
// (Range answered 206 + Content-Range, as the real server does):
//   1. 11:106 (B) asks for exactly its own row's bytes, really plays, and the line under the player says "not checked
//      yet".
//   2. 112:2 (D) asks for ONE Range, the stretch's bytes (row 1's start to the end of the file), really plays, and the
//      line names āyāt 1–4; 112:1 (checked, its end a guess) is the same clip, so it asks for nothing more.
//   3. 1:5 (checked) shows no line, straight after a B āyah that showed one; stopping hides the line.
//   4. A range 11:117-120 (the Read bar's sequencer, playDrill) plays the stretch 117-119 ONCE, then 11:120: requests
//      in order, āyah changes 117 then 120.
//   5. At 390x844 and 1440x900, in English and in Bangla (Bengali digits): the line is on screen, between the Read bar
//      and the reading, one or two lines, readable (contrast >= 4.5 against what is behind it).
// Mutations (--mutate=NAME) must FAIL:
//   noteoff    the player never sends a note        -> 1, 2, 3, 5
//   nostretch  every āyah plays its own row          -> 2, 4
//   noskip     a drill does not skip a stretch's āyāt -> 4
// Run from the repository root with serve.js on :8080 (QR_BASE for another port). It downloads 001, 011 (31 MB) and 112
// once into BN_AUDIO_CACHE (default the system temp folder).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATIONS = {
  noteoff: ["if (onTimingNote) onTimingNote(note);", ""],
  nostretch: ["if (p === i && q === i + 1) return", "if (true) return"],
  noskip: ["if (c && ayahNum > c.from && ayahNum <= c.to) return;", ""],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const MAP = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/bn-audio-bytes.json", "utf8"));
const FOLDER = "Quran Bangla mp3 - Shareef Bayezid Mahmud";
const CACHE = process.env.BN_AUDIO_CACHE || path.join(os.tmpdir(), "bn-audio-cache");
fs.mkdirSync(CACHE, { recursive: true });
const file = (n) => {
  const f = path.join(CACHE, `${String(n).padStart(3, "0")}.mp3`);
  if (!fs.existsSync(f) || fs.statSync(f).size !== MAP.surahs[String(n)].size) {
    const url = n <= 100
      ? `https://archive.org/download/ShareefBayezidMahmud/${encodeURIComponent(FOLDER)}/${String(n).padStart(3, "0")}.mp3`
      : `https://archive.org/download/ShareefBayezidMahmud/${n}.mp3`;
    execFileSync("curl", ["-sS", "-L", "--fail", "--retry", "3", "-o", f, url]);
  }
  return f;
};
const BYTES = { 1: fs.readFileSync(file(1)), 11: fs.readFileSync(file(11)), 112: fs.readFileSync(file(112)) };
const R11 = MAP.surahs["11"].ayahs, R112 = MAP.surahs["112"].ayahs;
const flags = (rows, a, b) => rows.slice(a - 1, b).map((r) => r[2]).join("");
// the fixture is what this suite says it is: if the map is rebuilt and these change shape, say so rather than pass
check("fixture: 11:105-107 = 1,2,1; 11:117-120 = 1,0,0,1; 112 = 1,0,0,0; 001 all checked",
  flags(R11, 105, 107) === "121" && flags(R11, 117, 120) === "1001" && flags(R112, 1, 4) === "1000" && MAP.surahs["1"].ayahs.every((r) => r[2] === 1),
  JSON.stringify([flags(R11, 105, 107), flags(R11, 117, 120), flags(R112, 1, 4)]));
const rowRange = (r) => `bytes=${r[0]}-${r[1] - 1}`;
const OWN106 = rowRange(R11[105]), OWN120 = rowRange(R11[119]);
const STRETCH112 = `bytes=${R112[0][0]}-${MAP.surahs["112"].size - 1}`;
const STRETCH11 = `bytes=${R11[116][0]}-${R11[119][0] - 1}`;

const EN_B = "Bangla timing for this āyah is not checked yet.";
const EN_D = "Bangla timing is not checked here: āyāt 1–4 play together.";
const BN_B = "এই আয়াতের বাংলা সময় এখনও যাচাই করা হয়নি।";
const BN_D = "এখানে বাংলা সময় যাচাই করা হয়নি: আয়াত ১–৪ একসাথে বাজছে।";

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
async function open({ width = 1280, height = 800, appLang = null } = {}) {
  const ctx = await newContext(browser, { banner: false, viewport: { width, height }, appLang });
  const ranges = [];
  await ctx.route(/archive\.org\/.*\.mp3/, async (route) => {
    const url = route.request().url();
    const n = Number(url.match(/\/(\d+)\.mp3$/)?.[1]);
    const buf = BYTES[n];
    if (!buf) return route.fulfill({ status: 404, body: "" });
    const range = route.request().headers().range || null;
    ranges.push({ n, range });
    const head = { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": "audio/mpeg" };
    const m = range && range.match(/bytes=(\d+)-(\d*)/);
    if (!m) return route.fulfill({ status: 200, headers: head, body: buf });
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : buf.length - 1;
    return route.fulfill({ status: 206, headers: { ...head, "content-range": `bytes ${a}-${b}/${buf.length}` }, body: buf.subarray(a, b + 1) });
  });
  if (MUTATE) {
    await ctx.route("**/app/js/audio-player.js*", async (route) => {
      const res = await route.fetch();
      const [from, to] = MUTATIONS[MUTATE];
      const src = await res.text();
      const count = src.split(from).length - 1;
      console.log(`  (mutation ${MUTATE}: ${count} occurrence(s) replaced)`);
      if (!count) throw new Error(`mutation ${MUTATE} found nothing to replace`);
      return route.fulfill({ response: res, body: src.split(from).join(to) });
    });
  }
  // the player keeps its <audio> private: every Audio() made is remembered
  await ctx.addInitScript(`(() => { const A = window.Audio; window.__audios = []; window.Audio = function (...x) { const el = new A(...x); window.__audios.push(el); el.addEventListener("playing", () => { el.__playings = (el.__playings || 0) + 1; }); return el; }; window.Audio.prototype = A.prototype; })();`);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  for (const end = Date.now() + 8000; Date.now() < end;) {
    if (await page.evaluate(() => !document.getElementById("readView").hidden)) break;
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => import("/app/js/audio-player.js").then((ap) => { window.__ap = ap; }));
  return { ctx, page, errors, ranges };
}

const noteState = (page) => page.evaluate(() => {
  const el = document.getElementById("bnTimingNote");
  const r = el.getBoundingClientRect();
  return { hidden: el.hidden, display: getComputedStyle(el).display, text: el.textContent.trim(), kind: el.dataset.kind, h: r.height };
});

/** Play one Bangla āyah through playOneAndWait (what the Read bar's ▶ does), wait for its clip to sound; the note. */
async function playOne(page, ranges, surah, ayah) {
  ranges.length = 0;
  const before = await page.evaluate(() => window.__audios?.at(-1)?.__playings || 0);
  await page.evaluate(([s, a]) => { window.__done = null; window.__ac = new AbortController(); window.__ap.playOneAndWait(s, a, "bn", { signal: window.__ac.signal }).then((x) => { window.__done = x; }, () => {}); }, [surah, ayah]);
  for (const end = Date.now() + 15000; Date.now() < end;) {
    // a NEW "playing" (the clip asked for, not the one already sounding), and it has run a little
    const st = await page.evaluate(() => { const el = window.__audios?.at(-1); return el && { n: el.__playings || 0, src: el.currentSrc || el.src, t: el.currentTime, paused: el.paused }; });
    if (st && st.n > before && st.src.startsWith("blob:") && !st.paused && st.t > 0.2) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(150);
  const played = await page.evaluate((before) => { const el = window.__audios?.at(-1); return !!el && (el.__playings || 0) > before && (el.currentSrc || el.src).startsWith("blob:") && el.currentTime > 0.2 && !el.error; }, before);
  return { played, note: await noteState(page), asked: ranges.filter((x) => x.n === surah).map((x) => x.range) };
}
const stopAll = (page) => page.evaluate(() => { window.__ac?.abort(); window.__ap.stopDrill(); });

// ---------------------------------------------------------------------------------------------------------------
{
  const { ctx, page, errors, ranges } = await open();
  let r = await playOne(page, ranges, 11, 106);
  check(`[11:106 B] 1. one Range request, for exactly its own row (${OWN106})`, r.asked.length === 1 && r.asked[0] === OWN106, JSON.stringify(r.asked));
  check("[11:106 B] 1. it really plays", r.played, JSON.stringify(r));
  check(`[11:106 B] 1. the line under the player: "${EN_B}"`, !r.note.hidden && r.note.display !== "none" && r.note.text === EN_B && r.note.h > 0, JSON.stringify(r.note));
  await stopAll(page);
  r = await playOne(page, ranges, 112, 2);
  check(`[112:2 D] 2. ONE Range request, the stretch 112:1-4 to the file's end (${STRETCH112})`, r.asked.length === 1 && r.asked[0] === STRETCH112, JSON.stringify(r.asked));
  check("[112:2 D] 2. it really plays", r.played, JSON.stringify(r));
  check(`[112:2 D] 2. the line names the stretch: "${EN_D}"`, !r.note.hidden && r.note.text === EN_D && r.note.kind === "stretch", JSON.stringify(r.note));
  await stopAll(page);
  r = await playOne(page, ranges, 112, 1);
  check("[112:1, checked but its end a guess] 2. the same stretch: no new request (one stretch, one clip), the same line", r.asked.length === 0 && r.played && r.note.text === EN_D, JSON.stringify(r));
  await stopAll(page);
  const stopped = await noteState(page);
  check("3. stopping hides the line", stopped.hidden && stopped.display === "none" && stopped.h === 0, JSON.stringify(stopped));
  // positive control for 3: a note is really shown before the checked āyah plays, so the checked āyah has to hide it
  const shown = (await playOne(page, ranges, 11, 106)).note;
  r = await playOne(page, ranges, 1, 5);
  check("[1:5 checked] 3. a checked āyah shows no line (straight after a B āyah that showed one)", !shown.hidden && r.note.hidden && r.note.h === 0 && r.asked.length === 1 && r.played, JSON.stringify({ shown, r }));
  await stopAll(page);

  // 4. a range through a stretch: the Read bar's sequencer
  ranges.length = 0;
  const seen = await page.evaluate(async () => {
    const ap = window.__ap; const seen = [];
    ap.setAyahChangeHandler((s, a) => seen.push(`${s}:${a}`));
    const run = ap.playDrill({ surahNum: 11, fromAyah: 117, toAyah: 120, reciterIds: ["bn"], repeatCount: 1, mode: "each" }).catch((e) => seen.push(`ERR ${e?.name} ${e?.message}`));
    // send each clip to its end once it sounds, so the run moves on
    const t0 = performance.now();
    let done = false; run.then(() => { done = true; });
    while (!done && performance.now() - t0 < 40000) {
      await new Promise((r) => setTimeout(r, 700));
      const a = window.__audios?.at(-1);
      if (a && a.duration && isFinite(a.duration) && !a.paused && a.currentTime > 0.3) a.currentTime = Math.max(0, a.duration - 0.15);
    }
    ap.stopDrill();
    return seen;
  });
  const asked = ranges.filter((x) => x.n === 11).map((x) => x.range);
  check("[11:117-120] 4. āyah changes: 11:117, then 11:120 (118 and 119 are inside the stretch, not played again)", seen.join(",") === "11:117,11:120", JSON.stringify(seen));
  // the clip for the āyah after the current one is fetched while it plays, so 11:118's (the same stretch) is no request
  check("[11:117-120] 4. requests in order: the stretch 117-119 once, then 11:120's own row", asked.join(",") === `${STRETCH11},${OWN120}`, JSON.stringify({ asked, want: [STRETCH11, OWN120] }));
  check("no page errors", errors.filter((e) => !/ERR_CERT|net::|Failed to load resource|quran\.foundation|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// 5. where the line sits, at a phone and a computer width, in both languages
for (const [width, height] of [[390, 844], [1440, 900]]) {
  for (const lang of ["en", "bn"]) {
    const { ctx, page, ranges } = await open({ width, height, appLang: lang });
    for (const [s, a, want] of [[11, 106, lang === "bn" ? BN_B : EN_B], [112, 2, lang === "bn" ? BN_D : EN_D]]) {
      const tag = `[${width}px ${lang} ${s}:${a}]`;
      await playOne(page, ranges, s, a);
      const m = await page.evaluate(() => {
        const el = document.getElementById("bnTimingNote");
        const r = el.getBoundingClientRect(), bar = document.getElementById("readBar").getBoundingClientRect();
        const scroll = document.getElementById("readScroll").getBoundingClientRect();
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
        // the colour behind it: the first ancestor with a non-transparent background
        let bg = "rgb(255, 255, 255)";
        for (let n = el; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { bg = b; break; } }
        return { text: el.textContent.trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, lh, barBottom: bar.bottom, scrollTop: scroll.top, vw: innerWidth, vh: innerHeight, fg: cs.color, bg };
      });
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const L1 = lum(m.fg), L2 = lum(m.bg), contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      check(`${tag} 5. the line says "${want}"`, m.text === want, JSON.stringify(m.text));
      check(`${tag} 5. on screen, inside the width, under the Read bar and above the reading`, m.h > 0 && m.left >= 0 && m.right <= m.vw + 0.5 && m.top >= m.barBottom - 0.5 && m.bottom <= m.scrollTop + 0.5 && m.bottom <= m.vh, JSON.stringify(m));
      check(`${tag} 5. one or two lines (${(m.h / m.lh).toFixed(1)})`, m.h <= m.lh * 2 + 2, JSON.stringify({ h: m.h, lh: m.lh }));
      check(`${tag} 5. readable: contrast ${contrast.toFixed(1)} >= 4.5`, contrast >= 4.5, JSON.stringify({ fg: m.fg, bg: m.bg }));
      await stopAll(page);
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== J95 E Bangla "not checked" line and checked stretch${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
