// The Owner, 20 Nov 2026 ("Keep doing now for every month"): tools/quran-data-pull/pull-bewley.mjs reads the hizb aishabewley.org has up and keeps its layout.
// This suite uses an INVENTED page in the site's own HTML shape (no real translation text in a test file), plus a read of the files the pull wrote.
//   node tools/i18n-verify/bewley-pull.mjs [--mutate=NAME]      (repository root)
//   --mutate=indent    the 120px step is read as step 0               -> "a nested line steps in one step per 20px" FAILS
//   --mutate=gap       the stanza break is dropped                    -> "an empty paragraph is a stanza break" FAILS
//   --mutate=number    a verse number stays in the text               -> "the verse number is not part of the text" FAILS
//   --mutate=heading   a new sūrah heading does not start a sūrah    -> "a new heading starts a new sūrah" FAILS
//   --mutate=bounds    a verse outside its sūrah is accepted          -> "a verse outside its sūrah stops the merge" FAILS
//   --mutate=keep      an older month's verses are replaced           -> "each month only adds: earlier verses stay" FAILS
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FILE = "tools/quran-data-pull/pull-bewley.mjs";
const MUT = {
  indent: ["if (ml <= 120) return 1;", "if (ml <= 120) return 0;"],
  gap: ["if (!text) { if (last) pendingGap = true; continue; }", "if (!text) { continue; }"],
  number: ["surahs[cur].ayahs[v] = { lines: [{ i: 0, t: m[2].trim() }] };", "surahs[cur].ayahs[v] = { lines: [{ i: 0, t: text }] };"],
  heading: ["if (head) { cur = Number(head[1]); surahs[cur] ??= { ayahs: {} }; last = null; pendingGap = false; continue; }", "if (head) { continue; }"],
  bounds: ["if (Number(v) < 1 || Number(v) > total) throw", "if (false) throw"],
  keep: ["const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, \"utf8\")) : { surah: Number(n), ayahs: {} };", "const have = { surah: Number(n), ayahs: {} };"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const dir = fs.mkdtempSync("/tmp/bwp-");
let src = fs.readFileSync(FILE, "utf8");
if (MUTATE) { const [a, b] = MUT[MUTATE]; if (src.split(a).length !== 2) throw new Error(`anchor missing: ${MUTATE}`); src = src.split(a).join(b); }
// the module computes paths from its own location: keep it beside a surah-index copy
fs.mkdirSync(`${dir}/output`, { recursive: true });
fs.writeFileSync(`${dir}/pull-bewley.mjs`, src);
fs.copyFileSync("tools/quran-data-pull/output/surah-index.json", `${dir}/output/surah-index.json`);
const M = await import(`${dir}/pull-bewley.mjs`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// an invented hizb in the shape of the site: margin-left 40px = a verse's first line, 120px then +20px per nested step, <p>&nbsp;</p> = stanza break
const PAGE = `<html><body><p align=Center><font>Hizb 7</font></p><blockquote>
<p align=Left>&nbsp; &nbsp;<i>2. Surat al-Baqara - The Cow</i></p>
<p align=Left><i><b>In the Name of Allah, All-Merciful, Most Merciful</b></i></p>
<p>&nbsp;</p>
<p style="margin-left: 40px;">10 &nbsp;&nbsp;&nbsp; The first invented line, <br>
<p style="margin-left: 120px;"> its nested second line,<br>
<p style="margin-left: 140px;">and a deeper third.<br>
<p>&nbsp;</p>
<p style="margin-left: 40px;">11 &nbsp;&nbsp;&nbsp;&nbsp;A single line of nothing real.<br></p>
<p style="margin-left: 40px;">12 &nbsp;&nbsp; Another single line.<br></p>
<p align=Left><i>3. Surat Ali 'Imran - The Family</i></p>
<p style="margin-left: 40px;">1 &nbsp;&nbsp; Begins a second surah.<br></p>
<p align=Center><a href="/">Return to Home Page</a></p></blockquote></body></html>`;
let P; try { P = M.parseHizbPage(PAGE); } catch (e) { P = { hizb: null, surahs: {} }; check("the invented page parses (a heading must start a sūrah, or its verses have no home)", false, e.message); }
check("the hizb number is read off the page", P.hizb === 7, String(P.hizb));
check("a new heading starts a new sūrah (2 and 3)", Object.keys(P.surahs).join() === "2,3", Object.keys(P.surahs).join());
const a10 = P.surahs[2]?.ayahs?.[10];
check("the verse number is not part of the text", a10?.lines?.[0]?.t === "The first invented line,", JSON.stringify(a10));
check("a paragraph with no number continues the verse before it (3 lines)", a10?.lines?.length === 3, JSON.stringify(a10));
check("a nested line steps in one step per 20px: 40px = 0, 120px = 1, 140px = 2", same(a10?.lines?.map((l) => l.i), [0, 1, 2]), JSON.stringify(a10?.lines?.map((l) => l.i)));
check("an empty paragraph is a stanza break: gap on the NEXT verse only", P.surahs[2]?.ayahs?.[11]?.gap === true && !P.surahs[2]?.ayahs?.[12]?.gap && !a10?.gap, JSON.stringify([a10?.gap, P.surahs[2]?.ayahs?.[11]?.gap, P.surahs[2]?.ayahs?.[12]?.gap]));
check("the Bismillah line and the 'Return to Home Page' link are not verses", Object.values(P.surahs).every((s) => Object.values(s.ayahs).every((a) => a.lines.every((l) => !/in the name of allah|return to home/i.test(l.t)))));
check("indentStep: the steps the site uses", same([40, 120, 140, 160, 180, null].map(M.indentStep), [0, 1, 2, 3, 4, 0]), JSON.stringify([40, 120, 140, 160, 180, null].map(M.indentStep)));
let threw = false; try { M.parseHizbPage("<html><body>nothing here</body></html>"); } catch { threw = true; }
check("a page that is not a hizb page is refused, so nothing bad is ever written", threw);

// merging: into an empty folder, then a second month on top
const out = `${dir}/out`;
const idx = `${dir}/output/surah-index.json`;
const s1 = M.mergeIntoOutput(P, { out, surahIndexPath: idx });
check("the first month is written: sūrah 2 (3 verses) and 3 (1 verse)", s1.length === 2 && s1[0].now === 3 && fs.existsSync(`${out}/surah_002.json`) && fs.existsSync(`${out}/surah_003.json`), JSON.stringify(s1));
const PAGE2 = `<html><body><p>Hizb 8</p><blockquote><p><i>2. Surat al-Baqara - The Cow</i></p>
<p style="margin-left: 40px;">20 &nbsp;&nbsp; A later invented verse,<br>
<p style="margin-left: 120px;"> with its own nested line.<br></p></blockquote></body></html>`;
let P2; try { P2 = M.parseHizbPage(PAGE2); } catch { P2 = { hizb: 8, surahs: {} }; }
M.mergeIntoOutput(P2, { out, surahIndexPath: idx });
const held = JSON.parse(fs.readFileSync(`${out}/surah_002.json`, "utf8"));
check("each month only adds: earlier verses stay, the new one is there", Object.keys(held.ayahs).includes("10") && Object.keys(held.ayahs).includes("20"), Object.keys(held.ayahs).join());
const index = JSON.parse(fs.readFileSync(`${out}/index.json`, "utf8"));
check("index.json names the hizbs read and the verses held, with the credit", same(index.hizbs, [7, 8]) && index.surahs["2"].ayahs.includes(20) && /Bewley/.test(index.credit), JSON.stringify(index).slice(0, 200));
let bounded = false; try { M.mergeIntoOutput({ hizb: 9, surahs: { 114: { ayahs: { 99: { lines: [{ i: 0, t: "x" }] } } } } }, { out: `${dir}/out2`, surahIndexPath: idx }); } catch { bounded = true; }
check("a verse outside its sūrah stops the merge (sūrah 114 has 6 verses)", bounded);

// the files the real pull wrote (the hizb up on 20 Nov 2026)
const real = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/bewley/index.json", "utf8"));
check("the held files cover sūrah 26 from verse 105 and sūrah 27 from verse 1, with no gap in either", (() => { const c = (n) => { const a = real.surahs[n].ayahs; return a.every((v, i) => i === 0 || v === a[i - 1] + 1); }; return real.surahs["26"].ayahs[0] === 105 && real.surahs["27"].ayahs[0] === 1 && c("26") && c("27"); })(), JSON.stringify(Object.fromEntries(Object.entries(real.surahs).map(([k, v]) => [k, [v.ayahs[0], v.ayahs.at(-1), v.ayahs.length]]))));
console.log(`\n==== Bewley monthly pull${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
