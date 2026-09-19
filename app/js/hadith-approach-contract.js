// Hadith H2-C — the Approach contract, as PURE SYMBOLIC POLICY.
//
// WHAT THIS IS. The H2-B proposal lists eight candidate Hadith Approaches and
// the decision package recommends three for v1. None of them has an id, and
// allocating one is the Master Architect's, at authorisation time, never a
// session's. This module is what lets the rest of the work proceed anyway: it
// names the three as SYMBOLS and carries an EMPTY permanent-id table. When the
// ids are allocated, one table is filled in and nothing else changes.
//
// WHAT IT IS NOT. It is not a registry, not a seed, not an event contract and
// not a writer. It produces a SLOT and stops. Turning a slot into a claim needs
// a trackable id, and a trackable id is a document id in a live collection --
// which is the gate this module exists to wait behind rather than pre-empt.
//
// IT IS IMPORTED BY NOTHING, and that is the whole safety case. A check walks
// the import graph from every page in app/ and asserts this module is
// unreachable by any chain of any length, with a positive control so the walk
// cannot pass vacuously. Delete this file and the application is unchanged.
//
// IT IMPORTS NOTHING, DELIBERATELY. Enforcement by inability, the same shape
// ADR-010 uses for Origin/Destination: a module that cannot see `buildUnitKey`,
// `APPROACH_TEMPLATES` or the records layer cannot quietly grow a claim path,
// cannot read a Quran Approach id, and cannot be argued into one. A check
// asserts the absence of every import rather than trusting this comment.
//
// NO `approach_NN` APPEARS ANYWHERE IN THIS FILE, including in the analogues
// below. A Quran Approach is named by its own SYMBOL, because writing the id
// here would read as a binding to it -- and the H2-B audit's central finding is
// that a trackable id IS a document id, so reusing one would make a single id
// mean two things in two modules (I5).

/**
 * The three v1 candidates, as symbols.
 *
 * WHY THESE THREE, and why no more. Each is a direct analogue of an existing
 * Quran Approach and needs NO data this repository does not have: no isnād, no
 * grade, no commentary text, no rights-cleared edition. The other five
 * candidates in H2-B each depend on something that does not exist yet, so
 * naming them here would be naming a slot nothing could ever fill.
 *
 * ORDER IS NOT PRECEDENCE. These are not ranked, and the array order must never
 * be read as a future numbering -- that would be a forward allocation by the
 * back door.
 */
export const HADITH_APPROACH_SLOTS = Object.freeze([
  "READ_ARABIC",
  "READ_WITH_MEANING",
  "MEMORISE",
]);

/**
 * What each slot means, and what it depends on. Everything here is SYMBOLIC:
 * no id, no display name, no translated string. Display names are a product
 * decision and belong to whoever allocates the ids, in both languages (I11).
 */
export const HADITH_APPROACH_INTENT = Object.freeze({
  READ_ARABIC: Object.freeze({
    meaning: "the matn read accurately in Arabic",
    quranAnalogueSymbol: "READING_WITH_TAJWEED",
    analogueIsExact: false,           // Tajwīd is a Qur'ānic discipline; the Hadith form is plain accurate reading
    dataDependency: "none",
  }),
  READ_WITH_MEANING: Object.freeze({
    meaning: "the matn read alongside an attributed translation",
    quranAnalogueSymbol: "READING_WITH_MEANING",
    analogueIsExact: true,
    dataDependency: "none",           // the ATTRIBUTION model is H1's; a rights-cleared translation is a separate gate
  }),
  MEMORISE: Object.freeze({
    meaning: "a narration committed to memory",
    quranAnalogueSymbol: "MEMORISING",
    analogueIsExact: true,
    dataDependency: "none",
  }),
});

/**
 * THE EMPTY TABLE. This is the point of the whole module.
 *
 * It stays `{}` until the Master Architect allocates ids. A check asserts it is
 * empty, and a second check asserts no `approach_`-shaped string appears
 * anywhere in this file -- so the table cannot be filled in "provisionally" by
 * a session, and a placeholder cannot be smuggled in as a comment either.
 */
export const HADITH_APPROACH_IDS = Object.freeze({});

/** True for one of the three slots, false for anything else. */
export function isHadithApproachSlot(value) {
  return HADITH_APPROACH_SLOTS.includes(value);
}

/**
 * The permanent trackable id for a slot, or `null` while none is allocated.
 *
 * TWO DIFFERENT ANSWERS, DELIBERATELY. A KNOWN slot with no id yet returns
 * `null` -- "not decided", a state the caller must handle. An UNKNOWN slot
 * THROWS -- "not a thing", which is a programming error and must never be
 * quietly treated as undecided. Collapsing the two would let a typo read as a
 * pending decision forever.
 */
export function hadithApproachId(slot) {
  if (!isHadithApproachSlot(slot)) {
    throw new Error(`hadithApproachId: "${slot}" is not a Hadith Approach slot. The slots are ${HADITH_APPROACH_SLOTS.join(", ")}.`);
  }
  return Object.prototype.hasOwnProperty.call(HADITH_APPROACH_IDS, slot) ? HADITH_APPROACH_IDS[slot] : null;
}

/** Whether every slot has an allocated id — i.e. whether this contract is usable at all yet. */
export function allocationState() {
  const allocated = HADITH_APPROACH_SLOTS.filter((s) => hadithApproachId(s) !== null);
  return Object.freeze({
    total: HADITH_APPROACH_SLOTS.length,
    allocated: allocated.length,
    pending: Object.freeze(HADITH_APPROACH_SLOTS.filter((s) => hadithApproachId(s) === null)),
    usable: allocated.length === HADITH_APPROACH_SLOTS.length,
  });
}

/**
 * The slot a Hadith study interaction would credit — or `null`.
 *
 * `null` is a real, quiet answer rather than a throw: an interaction this v1
 * has no slot for is not an error, and inventing one would be exactly the
 * "evidence invented to complete tracking" that is forbidden. The caller says
 * so on screen; it does not guess.
 *
 * READING WITH MEANING IS READ OFF WHAT IS ON SCREEN, not off a mode someone
 * has to remember to set — the same signal the Quran side settled on, and for
 * the same reason: a mode nobody sets is a mode that lies.
 */
export function hadithStudySlot({ interaction, translationShown = false } = {}) {
  if (interaction === "read") return translationShown ? "READ_WITH_MEANING" : "READ_ARABIC";
  if (interaction === "memorise") return "MEMORISE";
  return null;
}

/**
 * What a caller would need before a slot could become a claim. Returned as a
 * list of REASONS rather than a boolean, so a surface can say which thing is
 * missing instead of failing blank (I15's spirit, one layer up).
 */
export function blockersFor(slot) {
  const out = [];
  if (!isHadithApproachSlot(slot)) return Object.freeze(["not a Hadith Approach slot"]);
  if (hadithApproachId(slot) === null) out.push("no permanent Approach id is allocated for this slot");
  out.push("the Hadith permanent unit key is undecided (gate C2)");
  return Object.freeze(out);
}
