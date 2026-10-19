// PCF MSA J48 round 1 -- "Vocabulary": Learn, Practise (four kinds) and the Step test over Learn next's steps.
// PURE: no DOM, no Firestore, no fetch. The page feeds it learn-next rows and draws what it returns.
// There is NO second "known" list: every result is written by the page through the Word card's own lemma mark.
import { stepRange } from "./learn-next.js";

export const PRACTICE_KINDS = Object.freeze(["flashcard", "meaning", "arabic", "ayah"]);
export const CHOICE_KINDS = Object.freeze(["meaning", "arabic", "ayah"]);
export const ROUND_SIZE = 10;
export const OPTION_COUNT = 4;
/** 90% or more passes the step test. */
export const PASS_RATIO = 0.9;

/** The words of a step: ranks 1..n, or only the step's new ones. */
export function deckRows(rows, step, onlyNew = false) {
  const range = stepRange(step, onlyNew);
  if (!range) return [];
  return rows.filter((r) => r.r >= range.from && r.r <= range.to);
}

/** In-place-free Fisher-Yates. `rng` is injectable so a check can pin the order. */
export function shuffle(list, rng = Math.random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The meaning a reader sees, in their language (the other language is the fallback). */
export function meaningOf(row, lang = "en") {
  const first = lang === "bn" ? row.b : row.e, second = lang === "bn" ? row.e : row.b;
  return (first || second || "").trim();
}

const norm = (s) => String(s ?? "").normalize("NFC").trim().toLowerCase();

/**
 * Four options for `row`: the right one plus three wrong ones taken from `pool` (the step's words, then the NEXT
 * step's when the step is too small). A wrong option never repeats the right (or another) option's meaning text, never
 * the same Arabic, and is never invented. Returns null if the pool cannot supply them.
 * `on` is "meaning" (options are meanings) or "arabic" (options are the Arabic word).
 */
export function pickOptions(row, pool, on, lang = "en", rng = Math.random) {
  const key = (r) => (on === "arabic" ? norm(r.l) : norm(meaningOf(r, lang)));
  const taken = new Set([key(row)]);
  // the right answer must also not share its meaning with a wrong Arabic option
  taken.add(norm(meaningOf(row, lang)));
  const wrong = [];
  for (const cand of shuffle(pool, rng)) {
    if (cand.r === row.r) continue;
    if (taken.has(key(cand)) || taken.has(norm(meaningOf(cand, lang)))) continue;
    if (on === "arabic" && taken.has(norm(cand.l))) continue;
    taken.add(key(cand)); taken.add(norm(meaningOf(cand, lang)));
    wrong.push(cand);
    if (wrong.length === OPTION_COUNT - 1) break;
  }
  if (wrong.length < OPTION_COUNT - 1) return null;
  const all = shuffle([row, ...wrong], rng);
  return all.map((r) => ({ rank: r.r, lemma: r.l, text: on === "arabic" ? r.l : meaningOf(r, lang), correct: r.r === row.r }));
}

/** The pool wrong options come from: the step's words; if fewer than 4, the next steps' words too (never invented). */
export function optionPool(rows, deck) {
  if (deck.length >= OPTION_COUNT * 2) return deck;
  const ranks = new Set(deck.map((r) => r.r));
  const maxRank = deck.reduce((m, r) => Math.max(m, r.r), 0);
  const extra = rows.filter((r) => !ranks.has(r.r) && r.r > maxRank).slice(0, 40);
  return [...deck, ...extra];
}

/** One question. kind: flashcard | meaning | arabic | ayah. Returns null when the options cannot be made. */
export function makeQuestion(row, kind, pool, lang = "en", rng = Math.random) {
  if (kind === "flashcard") return { kind, rank: row.r, lemma: row.l, options: [] };
  const options = pickOptions(row, pool, kind === "arabic" ? "arabic" : "meaning", lang, rng);
  return options ? { kind, rank: row.r, lemma: row.l, options } : null;
}

/** A practice round: up to ROUND_SIZE of the deck's words, shuffled, one question each, all of one kind. */
export function buildRound(rows, deck, kind, { lang = "en", rng = Math.random, size = ROUND_SIZE } = {}) {
  const pool = optionPool(rows, deck);
  return shuffle(deck, rng).slice(0, size).map((r) => makeQuestion(r, kind, pool, lang, rng)).filter(Boolean);
}

/** The step test: every word of the deck once, kinds 2-4 mixed. */
export function buildTest(rows, deck, { lang = "en", rng = Math.random } = {}) {
  const pool = optionPool(rows, deck);
  return shuffle(deck, rng).map((r) => makeQuestion(r, CHOICE_KINDS[Math.floor(rng() * CHOICE_KINDS.length)], pool, lang, rng)).filter(Boolean);
}

/** The one-word round of the Word card: one question of each kind 2-4. */
export function buildWordRound(rows, row, { lang = "en", rng = Math.random } = {}) {
  const near = rows.filter((r) => Math.abs(r.r - row.r) <= 60);
  const pool = near.length >= OPTION_COUNT * 2 ? near : rows.slice(0, 80);
  return CHOICE_KINDS.map((k) => makeQuestion(row, k, pool, lang, rng)).filter(Boolean);
}

/** answers: [{ rank, right }]. A word is "right" in a round if every question about it was right. */
export function tally(answers) {
  const byRank = new Map();
  for (const a of answers) byRank.set(a.rank, (byRank.get(a.rank) ?? true) && !!a.right);
  const right = [...byRank.values()].filter(Boolean).length;
  return { right, total: byRank.size, ratio: byRank.size ? right / byRank.size : 0, rightRanks: [...byRank].filter(([, v]) => v).map(([k]) => k), wrongRanks: [...byRank].filter(([, v]) => !v).map(([k]) => k) };
}

export function testPassed(answers) {
  const t = tally(answers);
  return t.total > 0 && t.ratio >= PASS_RATIO;
}

/**
 * What practice writes (round 1, no new store): right while Not started -> Learning; right while Learning -> Practising;
 * never demote, never touch Achieved or Practising. A wrong answer writes nothing. One write per word per round.
 */
export function stateAfterRight(state) {
  if (state === "not_started" || state == null) return "learning";
  if (state === "learning") return "practising";
  return null;
}

/** [{ rank, lemma, state }] to write at a round's end. `stateOf(lemma)` reads the current WbW mark. */
export function practiceWrites(rows, answers, stateOf) {
  const byRank = new Map(rows.map((r) => [r.r, r]));
  return tally(answers).rightRanks.map((rank) => {
    const row = byRank.get(rank);
    const state = row ? stateAfterRight(stateOf(row.l)) : null;
    return state ? { rank, lemma: row.l, state } : null;
  }).filter(Boolean);
}

/** The words a passed step test offers to mark Achieved: those not already Achieved. */
export function achievedWrites(deck, stateOf) {
  return deck.filter((r) => stateOf(r.l) !== "achieved").map((r) => ({ rank: r.r, lemma: r.l, state: "achieved" }));
}
