// The Owner, 18 Nov 2026: "Place this as a group in Word Card titled 'Already Known' ... and sync the categories whatever is in the Vocab List."
//
// The Word card's marking and the Vocab List's "Already known" groups are ONE thing seen from two sides. A group's words are the curated
// list the data file ships PLUS the words the reader marked on the Word card with the kind that belongs to that group:
//     Words used in Ebadah (Rituals)        <- the "rituals" mark   (was "In Rituals")
//     Words used in Daily Life              <- the "bangla"  mark   (was "In Daily Use")
//     Words used in the Names in My Language<- the "names"   mark   (was "In Bangla Names")
// "Words used in My Language" is every word on the reader's list, whatever its kind. The first three groups are the curated Names and
// are shown, never marked from the card. The kinds are the stored ones (bangla-words.js): nothing is renamed or moved in storage (keep1116).
//
// PURE: no DOM, no Firestore.
import { banglaWordsOfKind, banglaKindsOf, activeBanglaSet } from "./bangla-words.js";

/** Group key -> the Word card kind that marks it. The groups not here (Names; My Language) cannot be tapped on the card. */
export const KIND_OF_GROUP = Object.freeze({ ibadah: "rituals", daily: "bangla", bnnames: "names" });

/** The lemmas of one group: the curated ones, plus the marked ones of its kind. `staticLemmas` is an array. */
export function knownGroupLemmas(key, staticLemmas, banglaState) {
  const out = new Set(Array.isArray(staticLemmas) ? staticLemmas : []);
  if (key === "language") return new Set([...out, ...activeBanglaSet(banglaState)]);
  const kind = KIND_OF_GROUP[key];
  if (kind) for (const l of banglaWordsOfKind(banglaState, kind)) out.add(l);
  return out;
}

/**
 * The chips of the Word card's "Already Known" group for ONE word, in the Vocab List's order.
 *   groups: [{ k, lemmas: [static lemma ids] }] already filtered to the groups the reader sees (hidden ones are not here)
 * Returns [{ k, on, kind }]: `on` = the word is in that group; `kind` = the stored kind a tap switches, or null when the chip is shown only.
 */
export function knownGroupMarks({ groups, state, lemma }) {
  // Codex P2s on #1812: a tappable chip shows the STORED kind it toggles (so a tap always flips what it shows, also while the list is switched off),
  // and `member` says the word is in that group by the curated list or by a mark; the curated membership is shown, never mistaken for the tap's own state.
  const mine = new Set(banglaKindsOf(state, lemma));
  const inList = activeBanglaSet(state).has(lemma);
  return (groups ?? []).map(({ k, lemmas }) => {
    const kind = KIND_OF_GROUP[k] ?? null;
    const inStatic = Array.isArray(lemmas) && lemmas.includes(lemma);
    if (kind) return { k, on: mine.has(kind), member: inStatic || (mine.has(kind) && inList), kind };
    const on = k === "language" ? inList || inStatic : inStatic;
    return { k, on, member: on, kind: null };
  });
}
