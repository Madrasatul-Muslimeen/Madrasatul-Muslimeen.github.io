// A dictionary word (lemma) as a reader should SEE it (Owner, 7 Oct 2026:
// "Why are these unusual letters? Fix." -- the Word card showed 2عَاد and
// عَا^ئِدُون).
//
// The packaged lemma strings are the Quranic Arabic Corpus's Buckwalter
// spelling converted to Arabic letters, and the converter left the corpus's
// own extra symbols as Latin characters. They are KEYS -- every lemma index,
// progress document and lookup uses them exactly as written -- so they are
// never rewritten in the data, only here, at the moment they are printed:
//
//   ^  maddah above              U+0653
//   #  hamza above               U+0654
//   @  small high rounded zero   U+06DF
//   [  small high meem           U+06E2
//   ,  small waw                 U+06E5
//   .  small yeh                 U+06E6
//   a trailing digit numbers two dictionary words spelled alike
//   (the corpus's عَاد "Ead" the verb, عَاد2 the people of 'Ad): it is
//   not a letter and is dropped.
const MARKS = { "^": "ٓ", "#": "ٔ", "@": "۟", "[": "ۢ", ",": "ۥ", ".": "ۦ" };

export function lemmaText(lemma) {
  return String(lemma ?? "").replace(/[\^#@\[,.]/g, (c) => MARKS[c]).replace(/\d+$/u, "");
}
