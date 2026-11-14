// Decision 103 (12 Oct 2026) -- "Intermediate is for different meanings of the same root and of the same word".
// A dictionary word's DIFFERENT MEANINGS as the Qur'an's own word-by-word translation renders it: its occurrences
// grouped by the main English word of their translation (lemma-senses.json, ~240 KB, built by
// tools/quran-data-pull/build-lemma-senses.mjs with senseKey() below -- ONE copy of the rule, shared).
// Loaded on FIRST USE only (the Word card's Intermediate tab), never at startup (I9). Read-only.
const SENSES_URL = "/tools/quran-data-pull/output/lemma-senses.json";
let promise = null;
let loaded = null; // Map(nfc lemma -> [[label, count, [ref, ...]], ...])
const nfc = (s) => String(s).normalize("NFC");

const STOP = new Set(("a an the and or of to in on at by for from with without into upon about over under as than then so " +
  "i me my we us our you your he him his she her it its they them their this that these those who whom whose which what " +
  "is are was were be been being am will shall would should can could may might must do does did done has have had " +
  "not no nor indeed surely verily certainly truly all any some one ones there here when while if yes O o " +
  "also even only very indeed s but yet nay lest so both let two three four five six seven eight nine ten before after concerning regarding near between among against toward " +
  "towards unto through except besides beside around within across behind beyond during " +
  // Names open many translations ("Allah has promised", "And Musa said"); they are who, not what the word means.
  "allah musa firaun ibrahim isa nuh harun yusuf sulaiman dawud maryam adam shaitaan iblis israil yaqub ismail ishaq " +
  "lut shuaib salih hud zakariya yahya ilyas yunus ayyub idris luqman muhammad jibreel mikael haman qarun yajuj majuj").split(/\s+/));
// Irregular English verbs, so "said" and "say", "knew" and "know" are one sense.
const IRREGULAR = Object.fromEntries(("said:say knew:know known:know made:make came:come went:go gone:go saw:see seen:see gave:give " +
  "given:give took:take taken:take brought:bring told:tell thought:think found:find left:leave sent:send built:build " +
  "held:hold kept:keep heard:hear spoke:speak spoken:speak wrote:write written:write ate:eat eaten:eat fell:fall " +
  "fallen:fall rose:rise risen:rise began:begin begun:begin felt:feel led:lead met:meet paid:pay stood:stand struck:strike " +
  "taught:teach understood:understand chose:choose chosen:choose forgot:forget forgotten:forget forgave:forgive " +
  "forgiven:forgive hid:hide hidden:hide shook:shake slew:slay slain:slay swore:swear sworn:swear threw:throw " +
  "thrown:throw drew:draw drawn:draw grew:grow grown:grow flew:fly sat:sit fought:fight caught:catch bought:buy " +
  "sought:seek lost:lose meant:mean bore:bear born:bear wore:wear says:say saying:say").split(" ").map((x) => x.split(":")));
// "witnesses"/"witness" and "promised"/"promises" share a stem; a word ending "ss" keeps it.
const stem = (w) => {
  if (/sses$/.test(w)) w = w.slice(0, -2);
  else if (/ies$/.test(w)) w = w.slice(0, -3) + "y";
  else if (/(s|x|z|ch|sh)es$/.test(w) && w.length >= 6) w = w.slice(0, -2);
  else if (!/ss$/.test(w)) w = w.replace(/(ing|ed|s)$/, (m) => (w.length - m.length >= 3 ? "" : m));
  return w.replace(/e$/, "");
};
export function senseKey(translation) {
  const words = String(translation || "").toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^a-z' -]/g, " ")
    .split(/[\s-]+/).map((w) => w.replace(/'s$|'/g, "")).filter((w) => w && !STOP.has(w));
  return words.length ? (IRREGULAR[words[0]] ? stem(IRREGULAR[words[0]]) : stem(words[0])) : null;
}

export function loadLemmaSenses() {
  if (!promise) {
    promise = fetch(SENSES_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the word meanings (HTTP ${res.status}).`);
      return res.json();
    }).then((data) => {
      loaded = new Map(Object.entries(data?.values ?? {}).map(([k, v]) => [nfc(k), v]));
      return loaded;
    }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}

/** Synchronous: undefined until loaded; then the lemma's senses ([[label, count, refs]], count order), or [] for a
 *  word the translation renders one way only. */
export function lemmaSensesOf(lemma) {
  if (!loaded) return undefined;
  if (!lemma) return [];
  return loaded.get(nfc(lemma)) ?? [];
}

/** Test seam. */
export function _resetLemmaSensesForTests() { promise = null; loaded = null; }
