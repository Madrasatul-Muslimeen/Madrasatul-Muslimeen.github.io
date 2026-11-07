/**
 * Hadith Study "Card colours" (the Owner's choice of 8 Nov 2026, PCF MSA J106): four colour sets for the Hadith cards, one
 * per reader, remembered on the reader's own device (localStorage, never sent anywhere).
 *   original  today's Night look, untouched      a  Night (A)      a2  Bright navy (A2)      a6  Copper border (A6)
 * The sets are CSS (css/hadith.css, html[data-hadith-colours=...]); this file only names them, stores the choice and writes
 * the attribute. They apply to the Night card look; the Light card look is the Owner's own separate setting and is not touched.
 * Pure apart from the two storage calls, each wrapped (a private window or blocked storage must never break the page).
 */
export const HADITH_COLOURS = Object.freeze([
  { id: "original", name: "Original" },
  { id: "a", name: "Night (A)" },
  { id: "a2", name: "Bright navy (A2)" },
  { id: "a6", name: "Copper border (A6)" },
]);
export const COLOURS_KEY = "mm_hadith_colours";
const known = (id) => HADITH_COLOURS.some((c) => c.id === id);

export function getHadithColours() {
  try { const v = localStorage.getItem(COLOURS_KEY); return known(v) ? v : "original"; } catch { return "original"; }
}
/** Stores the choice and sets the live attribute, so the cards change at once with no reload. */
export function setHadithColours(id) {
  const v = known(id) ? id : "original";
  try { localStorage.setItem(COLOURS_KEY, v); } catch { /* the choice still applies to this visit */ }
  document.documentElement.setAttribute("data-hadith-colours", v);
  return v;
}
/** Call once on load (the pages' own head script has usually done it already, before first paint). */
export function applyHadithColours() {
  const v = getHadithColours();
  document.documentElement.setAttribute("data-hadith-colours", v);
  return v;
}
