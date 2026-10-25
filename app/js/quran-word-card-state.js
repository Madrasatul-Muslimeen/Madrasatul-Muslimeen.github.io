// Audit part 91 (load speed): the Word Card's state, apart from its renderer. quranrevival.html needs these few pure
// functions from the first moment (every word tap, ‹ ›, Esc and level change goes through them) but the card's drawing
// code (quran-word-card.js and word-card-depth.js, 180 KB) only once a card is drawn, so the page imports this file and
// loads the renderer on first use. quran-word-card.js re-exports all of it, so every other importer is unchanged.

export const WORD_CARD_LEVELS = Object.freeze(["wbw", "intermediate", "basic", "tasrif", "depth"]);

function validLevel(level) {
  if (!WORD_CARD_LEVELS.includes(level)) throw new TypeError(`Unknown word-card level: ${level}.`);
  return level;
}

export function createWordCardState(level = "wbw") {
  return Object.freeze({ open: false, occurrenceId: null, level: validLevel(level) });
}

export function openWordCard(state, occurrenceId) {
  if (!occurrenceId) throw new TypeError("occurrenceId is required.");
  return Object.freeze({ ...state, open: true, occurrenceId });
}

export function closeWordCard(state) {
  return Object.freeze({ ...state, open: false });
}

export function selectWordCardLevel(state, level) {
  return Object.freeze({ ...state, level: validLevel(level) });
}

export function moveWordCard(state, orderedOccurrenceIds, direction) {
  if (!Array.isArray(orderedOccurrenceIds) || !orderedOccurrenceIds.length) return state;
  const at = orderedOccurrenceIds.indexOf(state.occurrenceId);
  if (at < 0) return state;
  const delta = direction === "previous" ? -1 : direction === "next" ? 1 : 0;
  if (!delta) throw new TypeError('direction must be "previous" or "next".');
  const target = orderedOccurrenceIds[at + delta];
  return target ? Object.freeze({ ...state, occurrenceId: target, open: true }) : state;
}
