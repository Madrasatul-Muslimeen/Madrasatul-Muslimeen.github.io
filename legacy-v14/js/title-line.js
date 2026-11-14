// One thin gold title line (the Owner, 11 Nov 2026, the phone-layout demo "yes build now"): a short title in three
// scripts, "Transliteration · Arabic · English", set over a group of controls in place of the several headings that used to
// say the same thing. Used over the Āyah card's three difficulty marks ("Mustawa al-Ṣuʿūbah · مستوى الصعوبة · Level of
// Difficulty") and over the Word Card's five level tabs ("Tadarruj · تدرج · Step-by-Step Learning").
// The transliteration and the Arabic are the title itself and stay as they are in every app language
// (data-i18n-skip); the English part is the one that is translated.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function titleLineHtml({ key, translit, ar, label }) {
  return `<div class="title-line" data-title-line="${esc(key)}"><span class="tl-tr" data-i18n-skip>${esc(translit)}</span><span class="tl-ar" lang="ar" dir="rtl" data-i18n-skip>${esc(ar)}</span><span class="tl-en">${esc(label)}</span></div>`;
}

export const TITLE_LINE_CSS = `
/* One thin row at every width, never cut: the type scales with the screen (the three parts together need about 290px at 11px), the decorative rules give way first. */
.title-line { display: flex; align-items: center; gap: clamp(0.25rem, 1.6vw, 0.5rem); min-width: 0; overflow: hidden; white-space: nowrap; margin: 0 0 0.4rem; font: 600 clamp(0.62rem, 2.9vw, 0.78rem)/1.3 'Inter', system-ui, sans-serif; color: var(--title-line-gold, #d9b25f); }
.title-line::before, .title-line::after { content: ""; height: 1px; background: currentColor; opacity: 0.55; }
.title-line::before { flex: 0 0 clamp(0rem, 2vw, 0.8rem); }
.title-line::after { flex: 1 1 0; min-width: 0; }
.title-line .tl-ar { font-family: 'Amiri Quran', 'Scheherazade New', serif; font-size: 1.56em; font-weight: 500; line-height: 1; }
/* The Owner, 13 Nov 2026: the Arabic 20% bigger. At 320px that pushed the line 18px past its row (the Latin and English stay as they were), so the very narrowest phones keep the old size. */
@media (max-width: 340px) { .title-line .tl-ar { font-size: 1.3em; } }
.title-line .tl-en { font-weight: 500; color: var(--card-text, inherit); }
/* the light card look: the night gold (#d9b25f) is 2.0:1 on white, so the line takes the deep gold the card already uses for its carets (#7a5410, over 6:1) */
[data-card-look="light"] .title-line { color: #7a5410; }
`;
