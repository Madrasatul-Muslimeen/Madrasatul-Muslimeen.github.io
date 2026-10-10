// Asma Collections round 2 -- parses the free-text "reference" every
// Name/phrase already carries (asma-collections-data.js's own DEFAULT_
// CANONICAL_REFS / DEFAULT_EXTRA_ASMA_NAMES.ref) into individual Qur'an
// and Hadith citations, so the detail screen can turn each into its own
// chip: a Qur'an one jumps to the real reading screen (goToReference() +
// openNoteView(), the same mechanism QCR's own goToAyahFromQcr() already
// uses); a Hadith one stays reference-only, since this app has no
// canonical hadith-text reader to jump to yet (a real, disclosed gap, not
// a shortcut).
//
// I2: pure function, no DOM, no Firebase -- verified against all 105
// DISTINCT reference strings the owner's own uploaded file actually
// contains (tools/asma-ref-parser-check.mjs, run and read by eye before
// this was wired into any screen), not against invented examples.
//
// The text mixes several real shapes, all handled here:
//   "কুরআন ২:১৬৩"                                   one ayah
//   "কুরআন ১:১; ৫৫:১"                                 several ayahs -- the
//                                                    word "কুরআন" is never
//                                                    repeated, so a bare
//                                                    "X:Y" fragment after
//                                                    an already-seen Qur'an
//                                                    fragment is read as a
//                                                    continuation of it
//   "কুরআন ২:২৪৫; তিরমিযী ১৩১৪ — হাসান সহীহ"        Qur'an AND Hadith mixed
//   "সহীহ বুখারী ৬৪১০ — সহীহ"                        Hadith, with a grade
//   "কুরআন ১:১ (সর্বত্র)"                             a trailing parenthetical
//                                                    note (dropped for a
//                                                    Qur'an citation -- the
//                                                    item's own separate
//                                                    weak/isPhrase flags
//                                                    already carry anything
//                                                    that note would say)
//   "ইবনে মাজাহ (হাদিস) — সনদ দুর্বল"                  a "collection" with NO
//                                                    number at all --
//                                                    nothing to cite, so
//                                                    this yields zero
//                                                    citations rather than
//                                                    inventing one
//   "ঐতিহ্যবাহী সম্মানসূচক বাক্যাংশ (নির্দিষ্ট আয়াত নেই)"  not a citation at
//                                                    all -- yields zero
//                                                    citations; the raw
//                                                    text still shows as
//                                                    plain reference text
//                                                    on screen, just with
//                                                    no chip built from it

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

function bnToNum(s) {
  return Number(
    [...s]
      .map((c) => {
        const i = BENGALI_DIGITS.indexOf(c);
        return i === -1 ? c : String(i);
      })
      .join("")
  );
}

// Every Hadith collection name this app's own reference text actually
// uses (checked against all 105 distinct strings) -- longest first, since
// "সহীহ বুখারী" must not be short-matched by a plainer prefix.
const HADITH_COLLECTIONS = [
  "সহীহুল জামি'",
  "সহীহ বুখারী",
  "সহীহ মুসলিম",
  "সুনানে নাসাঈ",
  "তিরমিযী",
  "আবু দাউদ",
  "ইবনে মাজাহ",
];

const QURAN_WORD = "কুরআন";
const AYAH_RE = /^([০-৯]+)\s*:\s*([০-৯]+)/;
const DIGITS_RE = /([০-৯]+)/;
const GRADE_RE = /[—-]\s*(.+)$/;

/** Splits a trailing "(...)" note off the end of a fragment, if present.
 *  A parenthetical that sits mid-fragment (e.g. before a hadith grade) is
 *  left alone -- only a note that is the very LAST thing in the fragment
 *  is a note about the whole fragment. */
function stripTrailingParen(s) {
  const m = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { core: m[1].trim(), note: m[2].trim() } : { core: s, note: "" };
}

/** Returns [{ kind: "quran", surah, ayah, label }, { kind: "hadith",
 *  collection, number, grade, label }, ...] for one reference string.
 *  Anything the text doesn't resolve to a real citation (a course note,
 *  an unnumbered "(হাদিস)" placeholder, a bare descriptive sentence) is
 *  simply left out -- never guessed into a wrong chip. */
export function parseAsmaRef(ref) {
  const text = String(ref ?? "").trim();
  if (!text) return [];
  const fragments = text.split(";").map((f) => f.trim()).filter(Boolean);
  const citations = [];
  let mode = null; // "quran" once a Qur'an fragment has been seen this string

  for (const raw of fragments) {
    const { core } = stripTrailingParen(raw);

    const collection = HADITH_COLLECTIONS.find((c) => core.startsWith(c));
    if (collection) {
      mode = "hadith";
      const afterName = core.slice(collection.length).trim();
      const numMatch = afterName.match(DIGITS_RE);
      if (!numMatch) continue; // e.g. "ইবনে মাজাহ (হাদিস) — সনদ দুর্বল" -- no number to cite
      const gradeMatch = afterName.match(GRADE_RE);
      citations.push({
        kind: "hadith",
        collection,
        number: bnToNum(numMatch[1]),
        grade: gradeMatch ? gradeMatch[1].trim() : "",
        label: `${collection} ${numMatch[1]}`,
      });
      continue;
    }

    let ayahPart = core;
    if (core.startsWith(QURAN_WORD)) {
      mode = "quran";
      ayahPart = core.slice(QURAN_WORD.length).trim();
    }
    if (mode === "quran") {
      const m = ayahPart.match(AYAH_RE);
      if (m) {
        citations.push({
          kind: "quran",
          surah: bnToNum(m[1]),
          ayah: bnToNum(m[2]),
          label: `${m[1]}:${m[2]}`,
        });
        continue;
      }
    }
    // Not a citation this parser can read -- e.g. a bare descriptive
    // sentence with no ayah/hadith number in it at all.
  }
  return citations;
}
