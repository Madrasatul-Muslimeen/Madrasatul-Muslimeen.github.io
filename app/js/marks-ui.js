// Keys to Understanding, K2 (PCF MSA J03, QR Lead, 4 Nov 2026) -- the three marks on screen.
//
// PURE: HTML in, HTML out, plus a delegated click wiring. It never reads or writes Firestore (I2): the page
// loads a sūrah's marks with ayah-keys-data.js (loadSurahKeys, ONE call per sūrah, only when a card or the
// Marks wheel first shows -- never at start-up, I9) and saves with setAyahKey / setWordKey.
//
//  * marksRowHtml()      Difficult / Need practice / Done for ONE āyah or ONE word (the Āyah card, the Word card)
//  * wireMarksRow()      one delegated listener; the caller decides what a tap does
//  * marksWheelHtml()    the Status wheel's three views, three bands per piece: outer Difficult, middle Need
//                        practice, inner Done. A piece is a button; tapping it opens that āyah's or word's card.
//  * wheelPieces()       the pieces of each view, from the same one map of marks
//
// The view names and the marks' colours are the Owner's J03 demo v2 (docs/reference/2026-11-04-keys-demo).

import { MARK_IDS, marksIn, keyName } from "./ayah-keys.js";
import { buildUnitKey } from "./unit-keys.js";
import { t, num } from "./i18n.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The Status wheel's three views, in the order the switch shows them. */
export const MARKS_WHEEL_VIEWS = Object.freeze(["ayat", "ayah-words", "all-words"]);

/** One row of the three marks. `keys` = the stored key ids of this item; `disabled` = a read-only viewer. */
export function marksRowHtml({ unitKey, keys = [], lang = "en", disabled = false, heading = "", busy = false, names = null, ariaLabel = "" } = {}) {
  // MSA · QR J135: `names` ({ keyId: label }) renames buttons for ONE surface (the Word card says Learn / Learned); the saved key ids never change.
  const on = marksIn(keys);
  const buttons = MARK_IDS.map((id) => `<button type="button" class="mk-btn mk-${id}" data-mark-key="${id}" aria-pressed="${on.includes(id)}"${disabled || busy ? " disabled" : ""}>${esc(names?.[id] ?? keyName(id, lang))}</button>`).join("");
  return `<div class="marks-row" data-marks-row data-marks-unit="${esc(unitKey)}" role="group" aria-label="${esc(ariaLabel || heading || t("Marks"))}">`
    + `${heading ? `<span class="marks-row-label">${esc(heading)}</span>` : ""}<span class="marks-row-buttons">${buttons}</span></div>`;
}

/** Delegated wiring: `onToggle(unitKey, keyId, turnOn)` on a tap of an enabled mark button inside `root`. */
export function wireMarksRow(root, onToggle) {
  root?.querySelectorAll?.("[data-marks-row]").forEach((row) => {
    row.addEventListener("click", (e) => {
      const b = e.target.closest?.("[data-mark-key]");
      if (!b || b.disabled) return;
      e.stopPropagation();
      onToggle?.(row.dataset.marksUnit, b.dataset.markKey, b.getAttribute("aria-pressed") !== "true");
    });
  });
}

/**
 * The pieces of one view of the wheel, in reading order.
 *   ayat        every āyah of the sūrah:            { key, label, group, go: {kind:"ayah", ayah} }
 *   ayah-words  the words of one āyah:              { key, label, group, go: {kind:"word", ayah, position} }
 *   all-words   the words of every āyah (grouped):  same, group = the āyah number
 * `surahData` is the page's loaded sūrah ({ surahNumber, ayahs:[{ ayah, words:[{ position, arabic }] }] }).
 */
export function wheelPieces(view, surahData, ayahNum) {
  const s = surahData?.surahNumber;
  const ayahs = surahData?.ayahs ?? [];
  if (!s) return [];
  if (view === "ayat") return ayahs.map((a) => ({ key: buildUnitKey.ayah(s, a.ayah), label: String(a.ayah), group: a.ayah, go: { kind: "ayah", ayah: a.ayah } }));
  const wordsOf = (a) => (a.words ?? []).map((w) => ({ key: buildUnitKey.qword(s, a.ayah, w.position), label: w.arabic ?? String(w.position), group: a.ayah, go: { kind: "word", ayah: a.ayah, position: w.position } }));
  if (view === "ayah-words") { const a = ayahs.find((x) => x.ayah === ayahNum); return a ? wordsOf(a) : []; }
  if (view === "all-words") return ayahs.flatMap(wordsOf);
  return [];
}

function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const big = a1 - a0 > Math.PI ? 1 : 0;
  const f = (n) => n.toFixed(2);
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 ${big} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 ${big} 0 ${f(x3)} ${f(y3)}Z`;
}

/** Counts of each mark across the pieces: { hard, practice, done }. */
export function countMarks(pieces, entries) {
  const c = { hard: 0, practice: 0, done: 0 };
  for (const p of pieces) for (const m of marksIn(entries?.[p.key])) c[m]++;
  return c;
}

/**
 * The wheel as one SVG string. `entries` = the reader's map of unit key to key ids. A single full-circle piece
 * (a sūrah of one āyah, an āyah of one word) is drawn as two halves so the arc is never degenerate.
 * Each piece is `<g class="mk-piece" data-mk-go="<index>" role="button" tabindex="0" aria-label="…">`.
 */
export function marksWheelHtml(pieces, entries, { lang = "en", centreTop = "", centreSub = "", effort = null } = {}) {
  const S = 360, c = S / 2, n = pieces.length;
  if (!n) return `<p class="mk-wheel-empty" data-mk-wheel-empty>${esc(t("Nothing to show here yet."))}</p>`;
  const gap = n > 200 ? 0 : Math.min(0.012, 0.6 / n);
  const bands = [["hard", 150, 174], ["practice", 126, 148], ["done", 104, 124]];
  const pathsFor = (a0, a1, r0, r1) => (a1 - a0 > Math.PI * 1.99
    ? [arc(c, c, r0, r1, 0, Math.PI), arc(c, c, r0, r1, Math.PI, 2 * Math.PI - 0.0001)]
    : [arc(c, c, r0, r1, a0, a1)]);
  let lastGroup = null;
  const segs = pieces.map((p, i) => {
    const a0 = (i / n) * 2 * Math.PI + gap, a1 = ((i + 1) / n) * 2 * Math.PI - gap;
    const have = marksIn(entries?.[p.key]);
    const names = have.map((m) => keyName(m, lang)).join(", ");
    const effName = effort?.[p.key] === "known" ? "Already Known" : effort?.[p.key] === "little" ? "Little Difficult" : effort?.[p.key] === "very" ? "Very Hard" : "";
    const label = `${p.label}${names || effName ? ` · ${[names, effName].filter(Boolean).join(", ")}` : ""}`;
    // MSA · QR J136: a word whose stored effort is "known" or "very" lights the INNER band in its own colour (blue / purple);
    // Learned Easy is the `done` key and keeps the green it always had. `effort` is the reader's map of unit key -> word.
    const eff = effort?.[p.key] === "known" || effort?.[p.key] === "little" || effort?.[p.key] === "very" ? effort[p.key] : null;
    const paths = bands.map(([id, r0, r1]) => pathsFor(a0, a1, r0, r1).map((d) => `<path d="${d}" class="mk-band mk-band-${id}${have.includes(id) || (id === "done" && eff) ? " on" : ""}${id === "done" && eff ? ` mk-eff-${eff}` : ""}"/>`).join("")).join("");
    const tick = p.group !== lastGroup && lastGroup !== null && n > 1 ? `<path d="${arc(c, c, 104, 176, a0 - 0.003, a0 + 0.003)}" class="mk-tick"/>` : "";
    lastGroup = p.group;
    return `<g class="mk-piece" data-mk-go="${i}" data-mk-key="${esc(p.key)}" data-mk-marks="${esc(have.join(" "))}" role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title>${paths}${tick}</g>`;
  }).join("");
  const cnt = countMarks(pieces, entries);
  const line = (y, id, text) => `<text x="${c}" y="${y}" text-anchor="middle" class="mk-count mk-count-${id}" font-size="13">${esc(text)}</text>`;
  const centre = (centreTop ? `<text x="${c}" y="${c - 34}" text-anchor="middle" class="mk-centre-top" font-size="22">${esc(centreTop)}</text>` : "")
    + (centreSub ? `<text x="${c}" y="${c - 12}" text-anchor="middle" class="mk-centre-sub" font-size="13">${esc(centreSub)}</text>` : "")
    + line(c + 8, "hard", `${keyName("hard", lang)} ${num(cnt.hard)}`)
    + line(c + 26, "practice", `${keyName("practice", lang)} ${num(cnt.practice)}`)
    + line(c + 44, "done", `${keyName("done", lang)} ${num(cnt.done)}`)
    + `<text x="${c}" y="${c + 62}" text-anchor="middle" class="mk-count-total" font-size="11">/ ${num(n)}</text>`;
  return `<svg class="mk-wheel" data-mk-wheel viewBox="0 0 ${S} ${S}" role="group" aria-label="${esc(t("Marks wheel"))}">${segs}${centre}</svg>`;
}

/** Wire the pieces of a rendered wheel: `onGo(piece)` on a tap, Enter or Space. */
export function wireMarksWheel(root, pieces, onGo) {
  root?.querySelectorAll?.("[data-mk-go]").forEach((g) => {
    const go = () => { const p = pieces[Number(g.dataset.mkGo)]; if (p) onGo?.(p); };
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

/** The legend under the wheel (colour swatches with the mark names). */
export function marksLegendHtml(lang = "en") {
  // MSA · QR J136: the word views also show Already Known (blue) and Very Hard (purple) on the inner band.
  const extra = [["known", lang === "bn" ? "আগে থেকেই জানা" : "Already Known"], ["little", lang === "bn" ? "একটু কঠিন" : "Little Difficult"], ["very", lang === "bn" ? "খুব কঠিন" : "Very Hard"]]
    .map(([id, name]) => `<span class="mk-legend-item mk-legend-eff"><i class="mk-swatch mk-swatch-eff-${id}"></i>${esc(name)}</span>`).join("");
  return `<p class="mk-legend" data-mk-legend>${MARK_IDS.map((id) => `<span class="mk-legend-item"><i class="mk-swatch mk-swatch-${id}"></i>${esc(keyName(id, lang))}</span>`).join("")}${extra}</p>`;
}

/** CSS for everything above, in the page's own colours; one place, appended once by the page. */
export const MARKS_CSS = `
.marks-row { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .6rem; margin:.4rem 0; }
.marks-row { --mk-label:#c9d3ea; --mk-hard:#f89480; --mk-practice:#e5b04a; --mk-done:#58c08c; --mk-on:#0e1630; }
[data-card-look="light"] .marks-row { --mk-label:#46536b; --mk-hard:#b3321d; --mk-practice:#7a5410; --mk-done:#1b6f45; --mk-on:#ffffff; }
.marks-row-label { font-size:.82rem; color:var(--mk-label); }
.marks-row-buttons { display:flex; flex-wrap:wrap; gap:.4rem; }
.mk-btn { min-height:40px; padding:.3rem .8rem; border-radius:999px; border:1.5px solid currentColor; background:transparent; font:inherit; font-size:.9rem; cursor:pointer; }
.mk-btn:disabled { opacity:.55; cursor:default; }
/* MSA · QR J136 (Architect 94L, 10 Nov 2026): the marks-row text met only 2.6-4.3:1 (global-approach-card-browser, 8 fails). One palette per card look,
   every text colour 4.5:1 or better on its own card (a palette belongs to a SURFACE): light tones on the Night card, deep tones on the Light card. */
.marks-row .mk-hard { color:var(--mk-hard); } .marks-row .mk-practice { color:var(--mk-practice); } .marks-row .mk-done { color:var(--mk-done); }
.marks-row .mk-hard[aria-pressed="true"] { background:var(--mk-hard); color:var(--mk-on); border-color:var(--mk-hard); }
.marks-row .mk-practice[aria-pressed="true"] { background:var(--mk-practice); color:var(--mk-on); border-color:var(--mk-practice); }
.marks-row .mk-done[aria-pressed="true"] { background:var(--mk-done); color:var(--mk-on); border-color:var(--mk-done); }
.mk-wheel-wrap { width:100%; flex:1 1 100%; min-width:0; }
.mk-wheel-for { display:block; width:100%; box-sizing:border-box; margin:.25rem 0 .1rem; text-align:center; overflow-wrap:anywhere; }
.mk-wheel { width:100%; max-width:420px; height:auto; display:block; margin:0 auto; }
.mk-piece { cursor:pointer; outline:none; } .mk-piece:focus-visible .mk-band { stroke:#fff; stroke-width:1.5; }
.mk-band { fill:rgba(143,160,194,.22); } .mk-band-hard.on { fill:#c8553d; } .mk-band-practice.on { fill:#d99a2b; } .mk-band-done.on { fill:#2e8b57; }
.mk-band.mk-eff-known.on { fill:#2f6fb3; } .mk-band.mk-eff-little.on { fill:#8a8a1c; } .mk-band.mk-eff-very.on { fill:#6b3aa6; }
.mk-tick { fill:#0e1630; }
.mk-centre-top { fill:#e8ecf7; font-family:"Amiri Quran","Amiri",serif; } .mk-centre-sub, .mk-count-total { fill:#8fa0c2; }
.mk-count-hard { fill:#e0806b; } .mk-count-practice { fill:#e3b04b; } .mk-count-done { fill:#5cc58a; }
.wheel-stage-wrap.wheel-veiled.wheel-marks #wheelContainer svg { filter:none; }
.mk-view-switch .wheel-look-btn { font-size:.74rem; padding:.2rem .55rem; min-height:36px; }
.mk-view-switch { display:flex; flex-wrap:wrap; gap:.3rem; justify-content:center; margin:.4rem 0; }
.mk-legend { display:flex; flex-wrap:wrap; gap:.3rem .9rem; justify-content:center; font-size:.85rem; margin:.4rem 0; }
.mk-swatch { display:inline-block; width:.8rem; height:.8rem; border-radius:50%; margin-inline-end:.3rem; vertical-align:-1px; }
.mk-swatch-eff-known { background:#2f6fb3; } .mk-swatch-eff-little { background:#8a8a1c; } .mk-swatch-eff-very { background:#6b3aa6; }
.mk-swatch-hard { background:#c8553d; } .mk-swatch-practice { background:#d99a2b; } .mk-swatch-done { background:#2e8b57; }
.mk-wheel-msg, .mk-wheel-empty { text-align:center; color:#8fa0c2; margin:1rem 0; }
`;
