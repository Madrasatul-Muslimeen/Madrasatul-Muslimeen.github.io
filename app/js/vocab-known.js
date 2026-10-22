// PCF MSA J48 round 3 (the Owner's 2A, 21 Oct 2026) -- "is this Learn next word known?" for ANY student, so the teacher's
// Monitor counts exactly what the student's own badge counts: a word is known through its WbW mark or its Family (the
// meaning group) mark; Root, Taṣrīf and Depth never count (J38). The same rule as quranrevival.html's
// lemmaViewWithGroup(); tools/i18n-verify/vocab-wheel-browser.mjs checks that both give the same figure.
// Reads: two lists per level (WbW, Family) per student, on first use only -- never at a page's startup.
import { primeAllLemmaProgress, lemmaProgressFor } from "./quran-lemma-progress-data.js";
import { loadLemmaMeaningGroups, meaningGroupOf } from "./lemma-meaning-groups.js";
import { claimKeyFor } from "./quran-lemma-levels.js";
import { isFormKey } from "./quran-word-form-key.js";
import { isLemmaProgressPersistenceReady } from "./study-lemma-progress-readiness.js";
import { isLemmaLevelsPersistenceReady } from "./study-lemma-levels-readiness.js";

const FAMILY_LEVEL = "basic";
const groupsLive = () => isLemmaProgressPersistenceReady() && isLemmaLevelsPersistenceReady();

/** Read the student's WbW and Family lists (cached for the visit). */
export async function primeVocabKnown(db, { tenantId, personId }) {
  await primeAllLemmaProgress(db, { tenantId, personId, level: "wbw" });
  if (groupsLive()) {
    try { await loadLemmaMeaningGroups(); } catch (error) { console.warn("meaning groups unavailable", error); }
    await primeAllLemmaProgress(db, { tenantId, personId, level: FAMILY_LEVEL });
  }
}

/** isKnown(row) for one student, synchronous over what primeVocabKnown() read. */
export function vocabKnownFor({ tenantId, personId, confirmationRequired = false }) {
  return (row) => {
    const lemmaId = row.l;
    if (lemmaProgressFor({ tenantId, personId, lemmaId, confirmationRequired }).countsAsKnown) return true;
    if (!groupsLive() || isFormKey(lemmaId)) return false;
    const key = claimKeyFor(FAMILY_LEVEL, { lemma: lemmaId }, meaningGroupOf);
    return !!lemmaProgressFor({ tenantId, personId, level: FAMILY_LEVEL, lemmaId: key, confirmationRequired }).countsAsKnown;
  };
}
