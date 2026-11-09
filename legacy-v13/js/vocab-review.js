// PCF MSA J48 round 2 (the Owner's tick 3A, 20 Oct 2026) -- the Vocabulary review schedule.
// PURE: no DOM, no Firestore, no clock of its own (the page passes today's date). The page stores what this returns in
// quranVocabReview/{tenantId}__{personId} through vocab-review-data.js.
//
// The rule from the proposal the Owner ticked: a word answered right comes back after 1, then 2, 4, 8 and 16 days; a
// word missed comes back tomorrow. One entry per word: { b: box 0-5, due: "YYYY-MM-DD", r: "right"|"wrong", at, n }.
// It is practice state, NEVER a mark: "known" stays the Word card's own records.
import { PASS_RATIO, tally } from "./vocabulary.js";

/** Days until the next review for boxes 1..5 (box 0 = missed, back tomorrow). */
export const INTERVALS = Object.freeze([1, 2, 4, 8, 16]);
export const TOP_BOX = INTERVALS.length;
/** A review round asks at most this many due words, the longest-waiting first. */
export const REVIEW_ROUND_SIZE = 10;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" of a Date in the DEVICE's own calendar (the student's day, as the rest of the app counts days). */
export function dayOf(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** `day` plus `n` calendar days, as "YYYY-MM-DD". Noon UTC, so no clock change can move the date. */
export function addDays(day, n) {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`addDays: not a day: ${day}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The entry after one result. Right: one box up (at most the top), due after that box's days. Wrong: box 0, tomorrow. */
export function nextEntry(entry, right, today, at) {
  const box = Number.isInteger(entry?.b) ? Math.min(Math.max(entry.b, 0), TOP_BOX) : 0;
  const b = right ? Math.min(box + 1, TOP_BOX) : 0;
  return { b, due: addDays(today, right ? INTERVALS[b - 1] : 1), r: right ? "right" : "wrong", at, n: (Number(entry?.n) || 0) + 1 };
}

/** Is this entry due on `today` (or overdue)? */
export function isDue(entry, today) {
  return !!entry && typeof entry.due === "string" && entry.due <= today;
}

/** The due words' keys, the longest-waiting first (then the lowest box, then the key, so the order is stable). */
export function dueKeys(words, today) {
  return Object.entries(words ?? {})
    .filter(([, e]) => isDue(e, today))
    .sort(([ka, a], [kb, b]) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (a.b ?? 0) - (b.b ?? 0) || (ka < kb ? -1 : ka > kb ? 1 : 0)))
    .map(([k]) => k);
}

/** { due, later, next }: how many are due today, how many wait, and the earliest day after today that has any. */
export function summary(words, today) {
  let due = 0, later = 0, next = null;
  for (const e of Object.values(words ?? {})) {
    if (!e || typeof e.due !== "string") continue;
    if (e.due <= today) due++;
    else { later++; if (next === null || e.due < next) next = e.due; }
  }
  return { due, later, next };
}

/**
 * The schedule changes one round makes: { [lemma]: entry }, one per word asked.
 * answers: [{ rank, right }] as the Vocabulary sheet records them; rows: Learn next's rows (row.r = rank, row.l = lemma).
 * byQuestions (the Word card's one-word round, J56): the word is right at 90% of its questions or better; otherwise
 * (practice, review, step test) a word is right only if every question about it was right -- the same as tally().
 */
export function scheduleWrites(rows, answers, words, today, at, { byQuestions = false } = {}) {
  const byRank = new Map(rows.map((r) => [r.r, r]));
  const verdict = new Map();
  if (byQuestions) {
    const right = answers.filter((a) => a.right).length;
    const ok = answers.length > 0 && right / answers.length >= PASS_RATIO;
    for (const a of answers) verdict.set(a.rank, ok);
  } else {
    const t = tally(answers);
    for (const r of t.rightRanks) verdict.set(r, true);
    for (const r of t.wrongRanks) verdict.set(r, false);
  }
  const out = {};
  for (const [rank, right] of verdict) {
    const row = byRank.get(rank);
    if (!row) continue;
    out[row.l] = nextEntry(words?.[row.l], right, today, at);
  }
  return out;
}

/** The rows of a review round: the due words that are in Learn next's list, at most REVIEW_ROUND_SIZE. */
export function reviewDeck(rows, words, today, size = REVIEW_ROUND_SIZE) {
  const byLemma = new Map(rows.map((r) => [r.l.normalize("NFC"), r]));
  const out = [];
  for (const k of dueKeys(words, today)) {
    const row = byLemma.get(k.normalize("NFC"));
    if (row) out.push(row);
    if (out.length >= size) break;
  }
  return out;
}
