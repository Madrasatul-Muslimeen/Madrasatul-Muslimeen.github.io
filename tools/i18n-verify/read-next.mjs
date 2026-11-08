// J03 K3 "Read next" -- the pure half (app/js/read-next.js) and its data file (app/data/tafsir-scholars.json).
// Run from the repository root:  node tools/i18n-verify/read-next.mjs
//   - the data file EQUALS what tools/scholars/build-tafsir-scholars.mjs makes from the Scholars Database v1.5, and a
//     one-value change to it is caught (mutation, in memory);
//   - every value it keeps is the database's own (names, life dates, Approaches, tafsīr text), and nothing is marked checked;
//   - the compiler matches (Bukhārī's Ṣaḥīḥ -> s008 ...), and a wrong death year matches nothing;
//   - the pure functions: tabs, āyah refs and links (with back=1), other hadith (self left out, labelled first, capped),
//     HadeethEnc word meanings in every shape, dictionary entries (NFC, both dictionaries, misses counted),
//     grouping by Approach (each scholar once, by Approach number);
//   - wiring: read-next.js has no DOM and no fetch; hadith-browser.js places the box with ONE call; nothing is fetched
//     when the box is drawn (the UI fetches only inside a tab's panel).
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildTafsirScholars, serialise, matchBooks, deathYearAH, relabelApproach, OUTPUT, SOURCE } from "../scholars/build-tafsir-scholars.mjs";
import * as RN from "../../app/js/read-next.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass");
    pass++; console.log("PASS", name);
  } catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
}

// ---- the data file -----------------------------------------------------------------------------------------------
const made = serialise(buildTafsirScholars());
const file = fs.readFileSync(OUTPUT, "utf8");
const data = JSON.parse(file);
const db = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const byId = new Map(db.rows.map((r) => [r.id, r]));

check("app/data/tafsir-scholars.json equals what the script makes from v1.5 (byte for byte)", () => assert.equal(file, made));
check("mutation: one changed value in the file is caught by the same comparison", () => {
  const bad = file.replace('"lifeAH": "224 AH – 310 AH"', '"lifeAH": "224 AH – 311 AH"');
  assert.notEqual(bad, file, "the mutation did not apply (positive control)");
  assert.notEqual(bad, made);
});
check("it names its source, v1.5, and is marked NOT checked", () => {
  assert.equal(data.source, SOURCE); assert.equal(data.sourceVersion, "v1.5"); assert.equal(data.checked, false);
});
check("a plausible number of scholars: 40+ tafsīr scholars, 5+ compilers (positive control for the filters)", () => {
  const tf = data.scholars.filter((s) => s.roles.includes("tafsir")).length;
  const co = data.scholars.filter((s) => s.roles.includes("compiler")).length;
  assert.ok(tf >= 40 && co >= 5, `${tf} tafsīr, ${co} compilers`);
});
check("every tafsīr scholar is a database 'mufassir' row, and every mufassir row is here", () => {
  const mf = db.rows.filter((r) => r.type === "mufassir").map((r) => r.id).sort();
  assert.deepEqual(data.scholars.filter((s) => s.roles.includes("tafsir")).map((s) => s.id).sort(), mf);
});
check("every kept value is the database's own: en, ar, lifeAH, lifeCE, Approaches text", () => {
  for (const s of data.scholars) {
    const r = byId.get(s.id);
    assert.ok(r, s.id);
    assert.equal(s.en, r.en, s.id); assert.equal(s.ar, r.ar ?? null, s.id);
    assert.equal(s.lifeAH, r.lifeAH ?? null, s.id); assert.equal(s.lifeCE, r.lifeCE ?? null, s.id);
    // display labels only: the database's text with each numbered tag relabelled by relabelApproach (J115 labels)
    const shown = String(r.approaches ?? "").split(" · ").map((x) => x.trim()).filter(Boolean).map(relabelApproach);
    assert.equal(s.approachesText, shown.join(" · "), s.id);
    assert.deepEqual(s.approaches, shown, s.id);
    assert.ok(String(r.quranWorks).startsWith(s.quranWork), s.id);
  }
});
check("each tafsīr title is a piece of the database's quranWorks text (al-Wāḥidī: three titles)", () => {
  for (const s of data.scholars) for (const title of s.tafsir) assert.ok(byId.get(s.id).quranWorks.includes(title), `${s.id} ${title}`);
  assert.deepEqual(data.scholars.find((s) => s.id === "s030").tafsir, ["al-Wasīṭ", "al-Wajīz", "Asbāb al-Nuzūl"]);
});
check("Bangla names: only the seven from the approved demo, each saying so; the rest null", () => {
  const bn = data.scholars.filter((s) => s.bn);
  assert.equal(bn.length, 7);
  assert.ok(bn.every((s) => s.bnFrom === "keys demo v2" && /[ঀ-৿]/.test(s.bn)));
  assert.ok(data.scholars.filter((s) => !s.bn).every((s) => s.bn === null && !("bnFrom" in s)));
});
check("compilers: Ṣaḥīḥ al-Bukhārī -> s008, Ṣaḥīḥ Muslim -> s009, Musnad Aḥmad -> s007, al-Tirmidhī -> s012", () => {
  assert.equal(data.books["0256Bukhari.Sahih.JK000110-ara1"], "s008");
  assert.equal(data.books["0261Muslim.Sahih.Shamela0001727-ara1"], "s009");
  assert.equal(data.books["0241IbnHanbal.Musnad.Shamela0025794-ara1"], "s007");
  assert.equal(data.books["0279Tirmidhi.Sunan.JK000140-ara1"], "s012");
});
check("a book whose author is not in the database matches nothing (al-Nawawī, al-Dārimī)", () => {
  assert.equal(data.books["0676Nawawi.RiyadSalihin.Shamela0012014-ara1"], undefined);
  assert.equal(data.books["0255CabdAllahDarimi.Sunan.JK000842-ara1"], undefined);
});
check("mutation: a wrong death year in a book id matches nobody", () => {
  assert.deepEqual(matchBooks(db.rows, ["0257Bukhari.Sahih.JK000110-ara1"]), {});
  assert.deepEqual(matchBooks(db.rows, ["0256Bukhari.Sahih.JK000110-ara1"]), { "0256Bukhari.Sahih.JK000110-ara1": "s008" });
});
check("deathYearAH reads the last AH year ('194 AH – 256 AH' -> 256, 'd. 671 AH' -> 671)", () => {
  assert.equal(deathYearAH({ lifeAH: "194 AH – 256 AH" }), 256);
  assert.equal(deathYearAH({ lifeAH: "d. 671 AH" }), 671);
  assert.equal(deathYearAH({}), null);
});

// ---- pure functions ----------------------------------------------------------------------------------------------
check("tabsFor: the fixed order; a missing entry draws no tab; Dictionary from lemmas OR words", () => {
  assert.deepEqual(RN.tabsFor({ tafsir: true, quran: [], lemmas: [], hadith: [], scholars: "tafsir" }), ["quran", "hadith", "dictionary", "scholars", "tafsir"]);
  assert.deepEqual(RN.tabsFor({ words: [] }), ["dictionary"]);
  assert.deepEqual(RN.tabsFor({ quran: null, hadith: undefined, scholars: false }), []);
});
check("parseAyahRef / uniqueAyahRefs: '36:38', [36,38] and {surah, ayah}; each once; bad refs dropped", () => {
  assert.deepEqual(RN.uniqueAyahRefs(["36:38", [36, 38], { surah: 36, ayah: 40 }, "115:1", "x", [2, 0]]), [[36, 38], [36, 40]]);
});
check("ayahHref keeps the way back (back=1, backTo)", () => {
  assert.equal(RN.ayahHref([36, 38], "hadith"), "./quranrevival.html?goto=36:38&back=1&backTo=hadith");
  assert.equal(RN.ayahHref([2, 255]), "./quranrevival.html?goto=2:255&back=1");
});
check("hadithHref opens the narration in the Hadith library with back=1", () => {
  assert.equal(RN.hadithHref({ book: "0261Muslim.Sahih.Shamela0001727-ara1", n: 611 }), "./hadith-collections.html?openiti=0261Muslim.Sahih.Shamela0001727-ara1&passage=611&back=1");
});
check("otherHadith: the card's own narration left out, each once, book-labelled first, capped with the count left", () => {
  const A = { book: "b", n: 1, test: "words" }, B = { book: "b", n: 2, test: "label" }, C = { book: "c", n: 1, test: "words" };
  const r = RN.otherHadith([[A, B], [B, C, { book: "self", n: 9 }]], { book: "self", n: 9 }, 2);
  assert.deepEqual(r.shown, [B, A]); assert.equal(r.more, 1);
});
check("wordMeanings: HadeethEnc's [{word, meaning}] (trimmed), plain strings, and an object map", () => {
  assert.deepEqual(RN.wordMeanings([{ word: "يوشك", meaning: " يقرب." }]), [{ word: "يوشك", meaning: "يقرب." }]);
  assert.deepEqual(RN.wordMeanings(["a — b"]), [{ word: "", meaning: "a — b" }]);
  assert.deepEqual(RN.wordMeanings({ x: "y" }), [{ word: "x", meaning: "y" }]);
  assert.deepEqual(RN.wordMeanings(null), []);
});
check("dictionaryEntries: each lemma once (NFC), English and Bangla, misses counted, never invented", () => {
  const en = { entries: { "شَمْس": { m: "sun", c: "high", u: "u1" } } };
  const bn = { entries: { "شَمْس": { m: ["সূর্য", "রবি"] }, "جَرَيْ": { m: ["চলা"] } } };
  const r = RN.dictionaryEntries(["شَمْس", "شَمْس", "جَرَيْ", "لا-شيء", null], en, bn);
  assert.deepEqual(r.entries, [{ lemma: "شَمْس", en: "sun", enUrl: "u1", bn: "সূর্য; রবি" }, { lemma: "جَرَيْ", en: null, enUrl: null, bn: "চলা" }]);
  assert.equal(r.missing, 1);
  assert.equal(RN.entryMeaning(r.entries[1], "en"), "চলা"); // English reader, no English entry: the Bangla one, not nothing
});
check("dictionaryEntries reads the REAL dictionaries: شَمْس is 'sun' / সূর্য", () => {
  const en = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-dictionary-en.json", "utf8"));
  const bn = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-dictionary-bn.json", "utf8"));
  const r = RN.dictionaryEntries(["شَمْس"], en, bn);
  assert.equal(r.entries[0].en, "sun"); assert.match(r.entries[0].bn, /সূর্য/);
});
check("groupByApproach: each tafsīr scholar exactly once, under their first Approach, groups by Approach number", () => {
  const list = RN.tafsirScholars(data);
  const groups = RN.groupByApproach(list);
  const ids = groups.flatMap((g) => g.scholars.map((s) => s.id));
  assert.equal(ids.length, list.length); assert.equal(new Set(ids).size, list.length);
  for (const g of groups) for (const s of g.scholars) assert.equal(s.approaches[0] ?? "", g.approach);
  const nums = groups.map((g) => RN.approachNumber(g.approach));
  assert.deepEqual(nums, [...nums].sort((a, b) => a - b));
  assert.equal(groups.find((g) => g.approach === "31 Gen1").scholars[0].id, "s021"); // al-Ṭabarī, in the database's order
});
check("compilerOf / scholarName / lifeLine: Bukhārī's book -> s008 with its Bangla name in Bangla, English otherwise", () => {
  const c = RN.compilerOf(data, "0256Bukhari.Sahih.JK000110-ara1");
  assert.equal(c.id, "s008");
  assert.equal(RN.scholarName(c, "bn"), "ইমাম মুহাম্মাদ আল-বুখারী"); assert.equal(RN.scholarName(c, "en"), "Imām Muḥammad al-Bukhārī");
  assert.equal(RN.lifeLine(c), "194 AH – 256 AH · 810 CE – 870 CE");
  assert.equal(RN.compilerOf(data, "nope"), null);
  const noBn = data.scholars.find((s) => !s.bn); assert.equal(RN.scholarName(noBn, "bn"), noBn.en);
});
check("whereToRead: one row per tafsīr title, every tafsīr scholar present", () => {
  const rows = RN.whereToRead(data);
  assert.equal(rows.length, RN.tafsirScholars(data).reduce((n, s) => n + s.tafsir.length, 0));
  assert.ok(rows.some((r) => r.title === "Tafsīr al-Qurʾān al-ʿAẓīm" && r.scholar.id === "s048"));
});
check("hadithExplanation: explanation and benefits kept; a record with neither gives null", () => {
  assert.deepEqual(RN.hadithExplanation({ explanation: " x ", hints: ["a", " "] }), { explanation: "x", hints: ["a"] });
  assert.equal(RN.hadithExplanation({ title: "t" }), null);
  assert.equal(RN.hadithExplanation(null), null);
});

// ---- wiring ------------------------------------------------------------------------------------------------------
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const pure = strip(fs.readFileSync("app/js/read-next.js", "utf8"));
check("read-next.js is pure: no document, window, fetch; it imports only lemma-dictionary.js", () => {
  assert.doesNotMatch(pure, /\b(document|window|fetch|localStorage)\b/);
  assert.deepEqual([...pure.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]), ["./lemma-dictionary.js"]);
});
const ui = strip(fs.readFileSync("app/js/read-next-ui.js", "utf8"));
// UPDATED IN PLACE for K3b (5 Nov 2026): a second fetch, loadTafsirLinks (the tafsīr books' sites), first use only.
check("read-next-ui.js fetches only inside loadTafsirScholars, loadTafsirLinks and loadEraSpeakers (first use), never at import or on drawing the box", () => {
  assert.equal((ui.match(/\bfetch\(/g) ?? []).length, 3);
  for (const fn of ["loadTafsirScholars", "loadTafsirLinks", "loadEraSpeakers"]) {
    const at = ui.indexOf(`function ${fn}`);
    const body = ui.slice(at, ui.indexOf("\n}\n", at));
    assert.equal((body.match(/\bfetch\(/g) ?? []).length, 1, `${fn} holds one fetch`);
  }
  const render = ui.slice(ui.indexOf("export function renderReadNext"), ui.indexOf("function fillPanel"));
  assert.ok(render.length > 200, "renderReadNext found (positive control)");
  assert.doesNotMatch(render, /\b(fetch|loadTafsirScholars|loadTafsirLinks|getSurah|describeHit|loadLemmaDictionary|resolve)\(/);
});

// ---- K3b "Study Next" (the Owner, 5 Nov 2026) ----
const links = JSON.parse(fs.readFileSync("app/data/tafsir-links.json", "utf8"));
// bn.js KEEPS the retired "Read next" key (a key is never removed: bn-duplicate-keys.mjs), so this checks that no app
// file USES it any more, not that bn.js lost it.
check("K3b: the box is called Study Next (পরবর্তী অধ্যয়ন), and no app file asks for \"Read next\" any more", () => {
  assert.match(ui, /el\("h3", "read-next-head", t\("Study Next"\)\)/);
  const bn = fs.readFileSync("app/js/i18n/bn.js", "utf8");
  assert.match(bn, /"Study Next": "পরবর্তী অধ্যয়ন"/);
  const users = [];
  for (const dir of ["app", "app/js"]) for (const f of fs.readdirSync(dir)) {
    if (!/\.(js|html)$/.test(f) || f === "bn.js") continue;
    if (/t\(\s*"Read next"/.test(fs.readFileSync(`${dir}/${f}`, "utf8"))) users.push(`${dir}/${f}`);
  }
  assert.deepEqual(users, []);
});
check("K3b: tafsir-links.json names every tafsīr title of tafsir-scholars.json exactly once, and nothing else", () => {
  const want = data.scholars.filter((s) => s.roles.includes("tafsir")).flatMap((s) => s.tafsir.map((t) => `${s.id}|${t}`)).sort();
  const have = links.links.map((l) => `${l.scholar}|${l.title}`);
  assert.equal(new Set(have).size, have.length, "a title is listed twice");
  assert.deepEqual([...have].sort(), want);
  assert.ok(want.length >= 50, `positive control: ${want.length} titles`);
});
check("K3b: every link is a known site with a book and the site's author, or site null with a reason; a partial book has a probe", () => {
  for (const l of links.links) {
    if (l.site === null) { assert.ok(["not online", "not per āyah"].includes(l.why), `${l.scholar} ${l.title}: ${l.why}`); assert.ok(!l.book); continue; }
    assert.ok(links.sites[l.site], `${l.scholar}: unknown site ${l.site}`);
    assert.ok(l.book && l.author, `${l.scholar} ${l.title}: book and author`);
    if (l.partial) assert.match(l.probe, /^\d+:\d+$/, `${l.scholar} probe`);
  }
});
check("K3b: quran.com carries exactly the five books it has (al-Ṭabarī, al-Baghawī, al-Qurṭubī, Ibn Kathīr, al-Saʿdī) -- the Owner's order puts it first", () => {
  assert.deepEqual(links.links.filter((l) => l.site === "quran.com").map((l) => l.scholar).sort(), ["s021", "s032", "s040", "s048", "s066"]);
});
check("K3b: the books the Owner named (Ibn ʿĀshūr, al-Jalālayn, al-Rāzī) each link to a site", () => {
  for (const [id, title] of [["s068", "al-Taḥrīr wa al-Tanwīr"], ["s049", "Tafsīr al-Jalālayn"], ["s038", "Mafātīḥ al-Ghayb"]]) {
    assert.ok(RN.tafsirLinkFor(links, id, title)?.site, `${id} ${title}`);
  }
});
check("K3b: tafsirLinkHref builds the exact address on each site, at that āyah; null when not online or the āyah is not a number", () => {
  assert.equal(RN.tafsirLinkHref(links, RN.tafsirLinkFor(links, "s048", "Tafsīr al-Qurʾān al-ʿAẓīm"), 36, 38), "https://quran.com/36:38/tafsirs/ar-tafsir-ibn-kathir");
  assert.equal(RN.tafsirLinkHref(links, RN.tafsirLinkFor(links, "s068", "al-Taḥrīr wa al-Tanwīr"), 2, 255), "https://tafsir.app/ibn-aashoor/2/255");
  assert.equal(RN.tafsirLinkHref(links, RN.tafsirLinkFor(links, "s044", "Lubāb al-Taʾwīl"), 36, 38),
    "https://www.altafsir.com/Tafasir.asp?tMadhNo=0&tTafsirNo=18&tSoraNo=36&tAyahNo=38&tDisplay=yes&UserProfile=0&LanguageId=1");
  assert.equal(RN.tafsirLinkHref(links, RN.tafsirLinkFor(links, "s065", "Tafsīr al-Marāghī"), 36, 38), null);
  assert.equal(RN.tafsirLinkHref(links, RN.tafsirLinkFor(links, "s048", "Tafsīr al-Qurʾān al-ʿAẓīm"), "36", 38), null);
});
check("K3b: a scholar's name opens THEIR row of the Scholars Database (v1.6, ?s=<id>&back=1); a bad id gives no link", () => {
  assert.equal(RN.scholarHref("s068"), "https://madrasatul-muslimeen.github.io/docs/reference/scholars-database/Scholars%20Database%20-%20v1.6.html?s=s068&back=1");
  assert.equal(RN.scholarHref("068"), null);
  assert.equal(RN.scholarHref(undefined), null);
  const page = decodeURIComponent(new URL(RN.SCHOLARS_DB_PAGE).pathname).slice(1);
  assert.ok(fs.existsSync(page), `${page} is in the repository (GitHub Pages serves it)`);
  const html = fs.readFileSync(page, "utf8");
  assert.match(html, /new URLSearchParams\(location\.search\)/);
  assert.match(html, /q\.get\("back"\) === "1"/);
  for (const s of data.scholars) assert.ok(html.includes(`"id": "${s.id}"`), `${s.id} is a row of the page`);
});
check("K3b: every tafsīr row's scholar and every scholar row is a link (new tab), and the Word card passes its āyah", () => {
  assert.match(ui, /function scholarLink\(s, lang\)/);
  assert.equal((ui.match(/scholarLink\(/g) ?? []).length, 3, "defined once, used in scholarRow and in the Tafsīr rows");
  assert.match(ui, /a\.target = "_blank"; a\.rel = "noopener";/);
  assert.match(ui, /go\.target = "_blank"; go\.rel = "noopener";/);
  const qr = fs.readFileSync("app/quranrevival.html", "utf8");
  assert.match(qr, /scholars: "tafsir", tafsir: \{ ayat: \[`\$\{currentSurahData\.surahNumber\}:\$\{ayah\.ayah\}`\] \}, backTo: "word"/);
});
check("labels: each era's display number is bound to the era BY NAME, not by number (Ṣaḥābah 28, Tābiʿūn 29, Tābiʿ al-Tābiʿīn 30, then +1)", () => {
  assert.equal(relabelApproach("28 Sahaba"), "28 Sahaba");
  assert.equal(relabelApproach("29 Tābiʿīn"), "29 Tābiʿīn");
  assert.equal(relabelApproach("29 Tābiʿ al-Tābiʿīn"), "30 Tābiʿ al-Tābiʿīn");
  assert.equal(relabelApproach("30 Gen1"), "31 Gen1");
  assert.equal(relabelApproach("36 Groups (Sufi)"), "37 Groups (Sufi)");
  assert.equal(relabelApproach("Gen3"), "Gen3");
  const tags = new Set(data.scholars.flatMap((s) => s.approaches));
  const num = (re) => [...tags].filter((t) => re.test(t)).map((t) => Number(t.match(/^\d+/)?.[0]));
  assert.deepEqual(num(/Sahaba/), [28]); assert.deepEqual(num(/^\d+ Tābiʿīn$/), [29]); assert.deepEqual(num(/Tābiʿ al-Tābiʿīn/), [30]);
  assert.ok(![...tags].some((t) => /^(29 Tābiʿ al|30 Gen1|31 Gen2|32 Maliki|33 Hanbali|34 Hanafi|35 Shafiʿi|36 Groups)/.test(t)), "an old number is left");
});
check("Slice B: whereToReadByCentury holds the same books as whereToRead, grouped by death century, earliest first", () => {
  const all = RN.whereToRead(data), groups = RN.whereToReadByCentury(data);
  assert.equal(groups.flatMap((g) => g.books).length, all.length);
  const cs = groups.map((g) => g.century).filter((c) => c != null);
  assert.deepEqual(cs, [...cs].sort((a, b) => a - b)); assert.equal(new Set(cs).size, cs.length);
  for (const g of groups) { for (const b of g.books) assert.equal(b.died == null ? null : Math.ceil(b.died / 100), g.century); const ds = g.books.map((b) => b.died ?? Infinity); assert.deepEqual(ds, [...ds].sort((a, b) => a - b)); }
  assert.equal(RN.deathYearOf({ lifeAH: "224 AH – 310 AH" }), 310); assert.equal(RN.deathYearOf({ lifeAH: "? – 373 AH" }), 373); assert.equal(RN.deathYearOf({ lifeAH: "unknown" }), null);
  // the real file is already in death order, so a fixture out of order proves the sorting itself
  const mk = (id, ah, title) => ({ id, roles: ["tafsir"], lifeAH: ah, tafsir: [title], approaches: [] });
  const fx = RN.whereToReadByCentury({ scholars: [mk("a", "? – 650 AH", "late"), mk("b", "? – 310 AH", "second"), mk("c", "? – 305 AH", "first"), mk("d", "unknown", "none"), mk("e", "? – 640 AH", "mid")] });
  assert.deepEqual(fx.map((g) => g.century), [4, 7, null]);
  assert.deepEqual(fx[0].books.map((b) => b.title), ["first", "second"]); assert.deepEqual(fx[1].books.map((b) => b.title), ["mid", "late"]);
  assert.equal(groups[0].century, 4, "al-Ṭabarī (d. 310) is the first group");
});
const hb = fs.readFileSync("app/js/hadith-browser.js", "utf8");
check("hadith-browser.js places the box with ONE call, inside the passage card", () => {
  assert.equal((hb.match(/renderReadNext\(/g) ?? []).length, 1);
  const card = hb.slice(hb.indexOf("function openitiPassageCard"), hb.indexOf("return card;", hb.indexOf("function openitiPassageCard")));
  assert.match(card, /renderReadNext\(card, hadithReadNextCtx\(versionUri, h\.n, heIds \?\? null\)\)/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
