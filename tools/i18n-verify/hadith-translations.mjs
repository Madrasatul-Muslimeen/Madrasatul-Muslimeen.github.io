// Decision 89: the English and Bangla hadith translations (hadith-translations-pull.mjs -> output/translations/).
// Expected values written BY HAND from reading the source (hadith-api eng-/ben-bukhari 6311, the bedtime dua that is
// Dua 1). Run from the repository root.
import fs from "node:fs";
const { chunkEdition, translatorOf, BOOKS, CHUNK } = await import("../hadith-data-pull/hadith-translations-pull.mjs");
const { TRANSLATED_BOOKS, loadHadithTranslation } = await import("../../app/js/hadith-translations.js");
const { buildConcordance } = await import("../../app/js/openiti-corpus.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const DIR = "tools/hadith-data-pull/output/translations";
const S = JSON.parse(fs.readFileSync(`${DIR}/summary.json`, "utf8"));
check("POSITIVE CONTROL: the summary lists 8 books, each in English and Bangla", S.books.length === 8 && S.books.every((b) => b.langs.en && b.langs.bn), JSON.stringify(S.books.map((b) => Object.keys(b.langs))));
check("the app's TRANSLATED_BOOKS is exactly the summary's books (and the pull's)",
  TRANSLATED_BOOKS.size === 8 && S.books.every((b) => TRANSLATED_BOOKS.has(b.versionUri)) && BOOKS.every((b) => TRANSLATED_BOOKS.has(b.versionUri)));
check("every book's translations are keyed to a book the concordance numbers", S.books.every((b) => fs.existsSync(`tools/hadith-data-pull/output/concordance/${b.versionUri}.json`)));
for (const [ed, lang, min] of [["bukhari", "en", 7500], ["bukhari", "bn", 7500], ["muslim", "en", 7300], ["muslim", "bn", 7300], ["nawawi", "en", 42], ["nawawi", "bn", 42]]) {
  const b = S.books.find((x) => x.edition === ed);
  check(`${ed} ${lang}: at least ${min} hadith`, b.langs[lang].count >= min, String(b.langs[lang].count));
}
check("every chunk file listed exists, and holds only numbers of its own range", S.books.every((b) => Object.entries(b.langs).every(([l, i]) => i.chunks.every((k) => {
  const f = `${DIR}/${b.edition}/${l}/${k}.json`; if (!fs.existsSync(f)) return false;
  return Object.keys(JSON.parse(fs.readFileSync(f, "utf8"))).every((n) => Math.floor(Number(n) / CHUNK) === k);
}))));
check("credits: Muhsin Khan (Bukhari en), Abdul Hamid Siddiqui (Muslim en); an-Nawawi is the Forty's author, not named as its translator",
  S.books[0].langs.en.translator === "Muhsin Khan" && S.books[1].langs.en.translator === "Abdul Hamid Siddiqui" && S.books.find((b) => b.edition === "nawawi").langs.en.translator === null);
check("translatorOf: Unknown and the book's own author give null", translatorOf("Unknown") === null && translatorOf("Imam Nawawi") === null && translatorOf("Muhsin Khan") === "Muhsin Khan");
const ce = chunkEdition([{ hadithnumber: 1, text: " a " }, { hadithnumber: 2, text: "" }, { hadithnumber: 815.2, text: "x" }, { hadithnumber: 815, text: "y" }, { hadithnumber: 501, text: "z" }]);
check("chunkEdition: values", ce.count === 4 && ce.chunks.get(0)?.[1] === "a" && !(2 in ce.chunks.get(0)) && ce.chunks.get(1)?.[815] === "x y" && ce.chunks.get(1)?.[501] === "z", JSON.stringify([...ce.chunks]));

// The loader against the files on disk.
const fetchImpl = async (url) => { const f = url.replace(/^.*\/translations\//, `${DIR}/`); return fs.existsSync(f) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(f, "utf8")) } : { ok: false, status: 404 }; };
const opt = { fetchImpl, baseUrl: "x/translations/" };
const en = await loadHadithTranslation("0256Bukhari.Sahih.JK000110-ara1", 6311, "en", opt);
const bn = await loadHadithTranslation("0256Bukhari.Sahih.JK000110-ara1", 6311, "bn", opt);
check("INDEPENDENT -- Bukhari 6311 in English: «Narrated Al-Bara bin `Azib … When you want to go to bed»", !!en && en.text.startsWith("Narrated Al-Bara bin `Azib") && en.text.includes("When you want to go to bed") && en.translator === "Muhsin Khan", en?.text.slice(0, 80));
check("INDEPENDENT -- Bukhari 6311 in Bangla: «বারাআ ইবনু ‘আযিব (রাঃ) হতে বর্ণিত»", !!bn && bn.text.startsWith("বারাআ ইবনু ‘আযিব (রাঃ) হতে বর্ণিত") && bn.translator === null, bn?.text.slice(0, 60));
check("a number with no translation, or a book without translations, gives null",
  (await loadHadithTranslation("0256Bukhari.Sahih.JK000110-ara1", 99999, "en", opt)) === null && (await loadHadithTranslation("0256Bukhari.AdabMufrad.JK000011-ara1", 1, "en", opt)) === null);
// The concordance's standard number (what translations are keyed by) differs from Muslim's cited Abdul-Baqi number.
const mus = buildConcordance(JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/concordance/0261Muslim.Sahih.Shamela0001727-ara1.json", "utf8")));
check("buildConcordance gives stdByN: Muslim passage 17 is standard 2158 while cited as Abdul-Baqi 933", mus.stdByN.get(17) === 2158 && mus.byN.get(17) === "933", JSON.stringify([mus.stdByN.get(17), mus.byN.get(17)]));
console.log(`\n==== Hadith translations (English, Bangla): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
