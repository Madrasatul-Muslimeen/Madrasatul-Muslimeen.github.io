// PCF MSA J58 -- a Bangla-script transliteration of one Qur'an word, made from its vowelled (Uthmani) Arabic by fixed
// rules. Pure; no data. Prototype for the Owner's sample.
const FATHA = "َ", DAMMA = "ُ", KASRA = "ِ", SUKUN = "ْ", SHADDA = "ّ";
const FATHATAN = "ً", DAMMATAN = "ٌ", KASRATAN = "ٍ";
const DAGGER = "ٰ", MADDAH = "ٓ", HAMZA_ABOVE = "ٔ";
const SILENT = new Set(["۟", "۠"]); // the letter carrying it is not read
const IGNORE = new Set([MADDAH, "ۢ", "ۭ", "ـ", "ۖ", "ۗ", "ۘ", "ۙ", "ۚ", "ۛ", "ۜ", "۝", "۞", "۩", " "]);
const MARKS = new Set([FATHA, DAMMA, KASRA, SUKUN, SHADDA, FATHATAN, DAMMATAN, KASRATAN, DAGGER, MADDAH, HAMZA_ABOVE, "۟", "۠", "ۢ", "ۭ"]);
const CONS = {
  "ب": "ব", "ت": "ত", "ث": "ছ", "ج": "জ", "ح": "হ", "خ": "খ", "د": "দ", "ذ": "য",
  "ر": "র", "ز": "য", "س": "স", "ش": "শ", "ص": "ছ", "ض": "দ", "ط": "ত", "ظ": "য",
  "غ": "গ", "ف": "ফ", "ق": "ক", "ك": "ক", "ل": "ল", "م": "ম", "ن": "ন", "ه": "হ",
  "ة": "ত",
};
const HAMZA = new Set(["ء", "أ", "إ", "ؤ", "ئ"]);
const SIGN = { [FATHA]: "া", [KASRA]: "ি", [DAMMA]: "ু" };
const LETTER = { [FATHA]: "আ", [KASRA]: "ই", [DAMMA]: "উ" };
const HASANT = "্";

/** Splits the word into letters, each with its marks. Tatweel carries marks of its own (a hamza on it is a letter). */
function units(word) {
  const out = [];
  for (const ch of word) { // never NFC: it would fuse alif + maddah into آ
    if (MARKS.has(ch) && out.length) { out[out.length - 1].marks += ch; continue; }
    if (ch === "ـ") { out.push({ ch, marks: "" }); continue; }
    if (IGNORE.has(ch)) continue;
    out.push({ ch, marks: "" });
  }
  // a tatweel carrying a hamza is a hamza; a bare tatweel carrying only a dagger alif lengthens the letter before it
  return out.filter((u) => u.ch !== "ـ" || u.marks).map((u) => (u.ch === "ـ" && u.marks.includes(HAMZA_ABOVE) ? { ch: "ء", marks: u.marks.replace(HAMZA_ABOVE, "") } : u));
}
const vowelOf = (m) => [FATHA, KASRA, DAMMA].find((v) => m.includes(v)) ?? null;
const tanweenOf = (m) => (m.includes(FATHATAN) ? FATHA : m.includes(KASRATAN) ? KASRA : m.includes(DAMMATAN) ? DAMMA : null);

export function banglaTranslit(word) {
  const u = units(word);
  let s = "";
  let lastVowel = null; // the vowel the text so far ends on (null after a consonant with no vowel)
  const lengthen = () => {
    if (lastVowel === FATHA) s += "-";
    else if (lastVowel === KASRA) s = s.replace(/ি$/, "ী").replace(/ই$/, "ঈ");
    else if (lastVowel === DAMMA) s = s.replace(/ু$/, "ূ").replace(/উ$/, "ঊ");
    lastVowel = "long";
  };
  const vowel = (base, m, { letterForm = false } = {}) => {
    const v = vowelOf(m), t = tanweenOf(m);
    const shadda = m.includes(SHADDA);
    let out = base && shadda ? `${base}${HASANT}${base}` : base;
    const vv = v ?? t;
    if (vv) out += letterForm && !base ? LETTER[vv] : SIGN[vv];
    if (t) out += "ন";
    if (m.includes(DAGGER)) out += "-";
    lastVowel = m.includes(DAGGER) || t ? "long" : vv;
    return out;
  };
  for (let i = 0; i < u.length; i++) {
    const { ch, marks: m } = u[i];
    const next = u[i + 1];
    if ([...SILENT].some((x) => m.includes(x))) continue;
    const start = s === "";
    if (ch === "ـ") { if (m.includes(DAGGER)) lengthen(); continue; } // a tatweel carrying a dagger alif: the vowel before is long
    if (ch === "ٱ") { // alif wasla: read only at the start of a word
      if (!start) continue;
      const v2 = u[i + 2] && vowelOf(u[i + 2].marks);
      s += next?.ch === "ل" ? "আ" : v2 === DAMMA ? "উ" : "ই";
      lastVowel = "start";
      continue;
    }
    if (ch === "آ") { if (!start && lastVowel === FATHA) lengthen(); else { s += start || lastVowel ? "আ-" : "'আ-"; lastVowel = "long"; } continue; }
    if (ch === "ا") { // plain alif
      if (start) { s += vowelOf(m) ? LETTER[vowelOf(m)] : "আ"; lastVowel = vowelOf(m) ?? FATHA; continue; }
      if (lastVowel === FATHA) lengthen();
      continue; // after tanween, or silent
    }
    if (ch === "ى" && (vowelOf(m) || tanweenOf(m) || m.includes(SHADDA))) { u[i] = { ch: "ي", marks: m }; i--; continue; } // ى with a vowel is a yā'
    if (ch === "ى") { // alif maqsura
      if (m.includes(DAGGER) || lastVowel === FATHA) lengthen();
      else if (lastVowel === KASRA) lengthen();
      continue;
    }
    if (HAMZA.has(ch) || (ch === "ء")) {
      const v = vowelOf(m) ?? tanweenOf(m) ?? (ch === "إ" ? KASRA : null);
      if (!v) { s += "'"; lastVowel = null; continue; }
      s += (start || lastVowel ? "" : "'") + LETTER[v] + (tanweenOf(m) ? "ন" : "");
      if (m.includes(DAGGER)) s += "-";
      lastVowel = m.includes(DAGGER) || tanweenOf(m) ? "long" : v;
      continue;
    }
    if (ch === "ع") { // ʿayn
      const v = vowelOf(m) ?? tanweenOf(m);
      if (m.includes(SHADDA)) s += "‘";
      s += "‘" + (v ? LETTER[v] + (tanweenOf(m) ? "ন" : "") : "");
      if (m.includes(DAGGER)) s += "-";
      lastVowel = m.includes(DAGGER) || tanweenOf(m) ? "long" : v;
      continue;
    }
    if (ch === "و" || ch === "ۥ") { // waw / small waw
      const v = vowelOf(m) ?? tanweenOf(m);
      if (ch === "ۥ" || (!v && !m.includes(SHADDA))) {
        if (lastVowel === DAMMA) lengthen();
        else if (lastVowel === FATHA) { s += "ও"; lastVowel = null; }
        else { s += "ও"; lastVowel = null; }
        continue;
      }
      s += (m.includes(SHADDA) && !start ? "ও" : "") + "ওয়" + (v ? SIGN[v] : "") + (tanweenOf(m) ? "ন" : "");
      if (m.includes(DAGGER)) s += "-";
      lastVowel = m.includes(DAGGER) || tanweenOf(m) ? "long" : v;
      continue;
    }
    if (ch === "ي" || ch === "ۦ") { // ya / small ya
      const v = vowelOf(m) ?? tanweenOf(m);
      if (ch === "ۦ" || (!v && !m.includes(SHADDA))) {
        if (lastVowel === KASRA) lengthen();
        else { s += "ই"; lastVowel = null; }
        continue;
      }
      const base = m.includes(SHADDA) && !start ? `য়${HASANT}য` : (start ? "ইয়" : "য়");
      s += base + (v ? SIGN[v] : "") + (tanweenOf(m) ? "ন" : "");
      if (m.includes(DAGGER)) s += "-";
      lastVowel = m.includes(DAGGER) || tanweenOf(m) ? "long" : v;
      continue;
    }
    if (ch === "ل" && !vowelOf(m) && !m.includes(SUKUN) && next?.marks.includes(SHADDA)) continue; // sun letter: ل is not read
    const c = CONS[ch];
    if (!c) { s += ch; continue; }
    if (ch === "ة" && !vowelOf(m) && !tanweenOf(m)) { s += "হ"; lastVowel = null; continue; } // pause on tā' marbūṭa
    s += vowel(c, start ? m.replace(SHADDA, "") : m); // a doubled first letter is only doubled when joined to the word before
    // the name Allah (and lillāh): lām-lām with shadda then hā' is read long, "আল্লা-হ"
    if (ch === "ل" && m.includes(SHADDA) && vowelOf(m) === FATHA && next?.ch === "ه" && u[i - 1]?.ch === "ل") lengthen();
    if (!vowelOf(m) && !tanweenOf(m) && !m.includes(DAGGER)) lastVowel = null;
  }
  return s;
}
