// W2 (6 Oct 2026) -- the Writing sheet's pop-out: one word, or the whole Ayah of
// that word, in a window over the sheet, enlargeable, with the pen, eraser, undo
// and clear working over it.
// Decision 83 (7 Oct 2026): full screen on every width, ⬆ More paper, lines to trace over or blank (the
// word pinned above the paper), and ‹ › to the previous / next word (or Ayah), each keeping its own writing.
//
// I2: a renderer. The sheet hands it words, fonts and a glyph painter; it reads no
// records and NEVER stores the writing (no Firestore, localStorage or IndexedDB).
// The letters are re-drawn with fillText/strokeText at every size, never stretched
// from a bitmap, and the strokes are kept in the letters' own units (em, measured
// from the words' anchor) so a size change redraws them with the letters.

import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { ARABIC_LETTERS } from "./arabic-letters.js";

const MULT = [0.3, 0.45, 0.65, 0.85, 1, 1.4];     // of the base size, five or more steps
const BASE_AYAH = 64;                              // css px at 1.0
const PEN_EM = 0.07;
const ERASER_EM = 0.4;
const INK = "#1b3a8a";
const PAPER = "#fffdf8";
const RULE = "#e4dcc6";
const GAP = 0.12;                                  // em between words, as on the page
const LINE_H = 2.0;                                // em per line
const MORE_BLOCKS = 2;                             // fresh lines (or Ayah copies) one tap of ⬆ adds
const MAX_BLOCKS = 60;
// Letters practice (PCF MSA J35): the Mushaf page fonts draw Qur'an glyph codes and cannot show a lone letter or its
// joining forms, so Letters mode draws real Unicode text in Amiri Quran, a bundled Arabic text font (app/fonts, no
// network): it is the face closest to the Qur'an's own hand and it keeps every joining feature, so the font joins
// the tatweel forms. FontFace is loaded once, under a name of its own.
const LETTER_FAMILY = "MMSA Letter Practice";
const LETTER_FORMS = ["alone", "start", "middle", "end"];
const LETTER_FS = 96;                              // css px at 1.0 (a phone fits the widest form)
let letterFontReady = null;
function ensureLetterFont() {
  if (!letterFontReady) {
    letterFontReady = (async () => {
      try {
        const f = new FontFace(LETTER_FAMILY, `url(${new URL("../fonts/amiriquran.woff2", import.meta.url).href})`);
        await f.load();
        document.fonts.add(f);
        return true;
      } catch { return false; }
    })();
  }
  return letterFontReady;
}

const CSS = `
.wp{position:fixed;inset:0;z-index:9600;background:rgba(20,24,40,0.55);display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:'Inter',system-ui,sans-serif}
.wp-win{display:flex;flex-direction:column;background:#fffdf8;color:#1b1b16;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.45);overflow:hidden;resize:both;width:min(96vw,760px);height:min(78vh,560px);min-width:min(300px,98vw);min-height:min(260px,96vh);max-width:98vw;max-height:98vh}
.wp-full .wp-win{width:100%;height:100%;max-width:none;max-height:none;border-radius:0;resize:none}
.wp-bar{flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding:6px 4px;background:#1F3A6E;color:#fff}
.wp-row{display:flex;gap:3px;align-items:center;min-width:0;flex-wrap:nowrap}
@media (max-width:480px){.wp-bar .wp-tx{display:none}.wp-bar button[data-wp-mode]{padding-left:0.25rem;padding-right:0.25rem}}
@media (max-width:380px){.wp-bar{flex-direction:row;flex-wrap:wrap;gap:3px}.wp-row{display:contents}.wp-bar .wp-sp{display:none}}
.wp-bar button{min-height:40px;min-width:40px;padding:0.3rem 0.35rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.95rem;line-height:1.1;white-space:nowrap;flex:0 0 auto;cursor:pointer}
.wp-bar button:disabled{opacity:0.4;cursor:default}
.wp-bar button[aria-pressed="true"]{background:#B8862F;border-color:#B8862F}
.wp-bar .wp-sp{flex:1 1 0;min-width:0}
.wp-bar .wp-shade{min-height:40px;min-width:48px;flex:1 1 0;max-width:190px;padding:0.3rem 0.4rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.85rem}
.wp-bar .wp-shade option{color:#1b1b16;background:#fff}
.wp-bar .wp-shade[data-wp-lines]{flex:0 1 auto;max-width:none}
.wp-bar .wp-row3:empty{display:none}
.wp-bar .wp-row3 .wp-shade{flex:1 1 0;max-width:none;font-size:0.9rem}
@media (max-width:380px){.wp-bar .wp-row3 .wp-shade{flex:1 1 40%}}
.wp-confirm{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:8px 10px;background:#fff3cf;color:#4a3a10;border-bottom:2px solid #B8862F}
.wp-confirm[hidden]{display:none}
.wp-confirm button{min-height:40px;padding:0.3rem 0.9rem;border-radius:8px;border:1px solid #B8862F;background:#fff;color:#4a3a10;font:inherit;cursor:pointer}
.wp-model{flex:0 0 auto;max-height:34%;overflow:auto;background:#f4eedd;border-bottom:1px solid #e3d9bd}
.wp-model[hidden]{display:none}
.wp-model canvas{display:block}
.wp-scroll{flex:1 1 auto;min-height:0;overflow:auto;position:relative;background:${PAPER};-webkit-overflow-scrolling:touch}
.wp-stage{position:relative}
.wp-stage canvas{position:absolute;left:0;top:0;display:block}
.wp-stage .wp-ink{touch-action:none;cursor:crosshair}
.wp-move .wp-ink{cursor:grab}
@media (max-width:599.98px){.wp-tx{display:none}}
`;

export function openWordPopout({ host, word, ayahWords, unitWords, ensureFont, paintGlyph, shade, onShade, onClose, mode = "word" }) {
  const root = document.createElement("div");
  root.className = "wp";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", t("Pop out"));
  root.innerHTML = `<style>${CSS}</style>
    <div class="wp-win" data-wp-win>
      <div class="wp-bar">
        <!-- Owner, 7 Oct 2026 (a photo, the empty ends of rows 1 and 2 marked): "Organise the buttons, make it in 2 row."
             Row 1: what is written (Word / Ayah, ‹ ›, its size and its lines), then ✕. Row 2: the pen's tools, the letter style, then ⛶.
             On a phone the tools show their icons only (names on long-press); at 320px the bar wraps into a third row. -->
        <div class="wp-row">
          <button type="button" data-wp-mode="word" aria-pressed="false">${t("Word")}</button>
          <button type="button" data-wp-mode="ayah" aria-pressed="false">${t("Ayah")}</button>
          <button type="button" data-wp-mode="letters" aria-pressed="false">${t("Letters")}</button>
          <button type="button" data-wp="prev" aria-label="${t("Previous word")}" title="${t("Previous word")}">‹</button>
          <button type="button" data-wp="next" aria-label="${t("Next word")}" title="${t("Next word")}">›</button>
          <button type="button" data-wp="smaller" aria-label="${t("Smaller letters")}" title="${t("Smaller letters")}">A−</button>
          <button type="button" data-wp="bigger" aria-label="${t("Bigger letters")}" title="${t("Bigger letters")}">A+</button>
          <select class="wp-shade" data-wp-lines aria-label="${t("Lines")}" title="${t("Lines")}">
            <option value="trace">${t("Trace over")}</option>
            <option value="blank">${t("Blank lines")}</option>
          </select>
          <span class="wp-sp"></span>
          <button type="button" data-wp="close" aria-label="${t("Close")}" title="${t("Close")}">✕</button>
        </div>
        <div class="wp-row">
          <button type="button" data-wp-tool="pen" aria-pressed="true" aria-label="${t("Pen")}" title="${t("Pen")}">🖊<span class="wp-tx"> ${t("Pen")}</span></button>
          <button type="button" data-wp-tool="eraser" aria-pressed="false" aria-label="${t("Eraser")}" title="${t("Eraser")}">🧽<span class="wp-tx"> ${t("Eraser")}</span></button>
          <button type="button" data-wp="undo" aria-label="${t("Undo")}" title="${t("Undo")}">↶</button>
          <button type="button" data-wp="clear" aria-label="${t("Clear")}" title="${t("Clear")}">🗑</button>
          <button type="button" data-wp="move" aria-pressed="false" aria-label="${t("Move")}" title="${t("Move")}">✋<span class="wp-tx"> ${t("Move")}</span></button>
          <button type="button" data-wp="more" aria-label="${t("More paper")}" title="${t("More paper")}">⬆<span class="wp-tx"> ${t("More paper")}</span></button>
          <select class="wp-shade" data-wp-shade aria-label="${t("Letter style")}" title="${t("Letter style")}">
            <option value="light">${t("Light")}</option>
            <option value="lighter">${t("Lighter")}</option>
            <option value="book">${t("Like the book")}</option>
          </select>
          <span class="wp-sp"></span>
          <button type="button" data-wp="win" aria-pressed="false" aria-label="${t("Full screen")}" title="${t("Full screen")}">⛶</button>
        </div>
        <!-- Owner, 8 Oct 2026: on a phone the two list boxes showed only their first letters ("Blank lines", "Light").
             In a window narrower than 500px they move here, side by side, half the width each (placeListBoxes()). -->
        <div class="wp-row wp-row3" data-wp-row3></div>
      </div>
      <div class="wp-confirm" data-wp-confirm hidden>
        <span>${t("Close without saving your writing?")}</span>
        <button type="button" data-wp="close-anyway">${t("Close")}</button>
        <button type="button" data-wp="keep">${t("Keep writing")}</button>
      </div>
      <div class="wp-model" data-wp-model hidden><canvas data-wp-modelcv></canvas></div>
      <div class="wp-scroll" data-wp-scroll><div class="wp-stage" data-wp-stage><canvas class="wp-paper" data-wp-paper></canvas><canvas class="wp-ink" data-wp-ink></canvas></div></div>
    </div>`;
  host.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const win = $("[data-wp-win]");
  const scrollEl = $("[data-wp-scroll]");
  const stage = $("[data-wp-stage]");
  const paper = $("[data-wp-paper]");
  const ink = $("[data-wp-ink]");
  const confirmEl = $("[data-wp-confirm]");
  const modelEl = $("[data-wp-model]");
  const modelCv = $("[data-wp-modelcv]");

  const st = {
    mode: mode === "ayah" ? "ayah" : "word",
    li: 0,                                          // the letter Letters mode is on (index into ARABIC_LETTERS)
    cw: word,                                       // the word the pop-out is on now
    // The Owner, 9 Oct 2026: the pop-out "should take the whole screen with its buttons" -- it opens full screen;
    // ⛶ still makes it a window.
    idx: 3, tool: "pen", move: false, full: true, destroyed: false,
    lines: "trace", extra: 0,                       // extra = fresh blocks added with ⬆ More paper
    strokes: new Map(),                             // one list of strokes per word / per Ayah
    drawing: null, geom: null, shade, fit: 0,
  };
  const dirty = () => [...st.strokes.values()].some((l) => l.length > 0);
  const m = document.createElement("canvas").getContext("2d");

  const ayahOf = (loc) => { try { return ayahWords(loc) || []; } catch { return []; } };
  const letterNow = () => ARABIC_LETTERS[st.li];
  const letterName = () => letterNow().name[getAppLang() === "bn" ? "bn" : "en"];
  const formLabel = (f) => ({ alone: t("Alone"), start: t("Beginning"), middle: t("Middle"), end: t("Ending") })[f];
  /** What a form really is for a letter that never joins forward: said plainly, never an invented shape. */
  const formNote = (L, f) => (L.joinsLeft ? "" : f === "start" ? t("does not join the next letter") : f === "middle" ? t("joins only the letter before it") : "");
  const lettersItems = () => {
    const L = letterNow();
    return LETTER_FORMS.map((f) => ({ g: L.forms[f], loc: `L:${L.id}:${f}`, page: 0, family: LETTER_FAMILY, marker: false, form: f }));
  };
  const wordsFor = () => (st.mode === "letters" ? lettersItems() : st.mode === "word" ? [st.cw] : (ayahOf(st.cw.loc).length ? ayahOf(st.cw.loc) : [st.cw]));
  /** The strokes of what is on the paper: this word, or this Ayah (keyed by its first word). */
  function strokeList() {
    const key = st.mode === "letters" ? `l:${letterNow().id}` : st.mode === "word" ? `w:${st.cw.loc}` : `a:${(ayahOf(st.cw.loc)[0] || st.cw).loc}`;
    if (!st.strokes.has(key)) st.strokes.set(key, []);
    return st.strokes.get(key);
  }

  function baseFs() {
    if (st.mode === "ayah") return BASE_AYAH;
    if (st.mode === "letters") return LETTER_FS;
    if (!st.fit) {
      // Fit the word to most of a phone's width once, so a window resize never changes the letter size.
      m.font = `100px '${st.cw.family}'`;
      const em = (m.measureText(st.cw.g).width || 100) / 100;
      st.fit = Math.min(420, (Math.min(window.innerWidth, 900) - 40) / em);
    }
    return st.fit;
  }
  const fsNow = () => baseFs() * MULT[st.idx];

  /** Where every word sits, in css px, anchored right; wraps whole words into lines that fit `avail`. */
  function layout(fs, avail) {
    const words = wordsFor();
    const gap = GAP * fs;
    const items = words.map((w) => {
      m.font = `${fs}px '${w.family}'`;
      return { ...w, width: m.measureText(w.g).width };
    });
    const maxW = Math.max(0, ...items.map((i) => i.width));
    const lines = [[]];
    let cursor = 0;
    const letters = st.mode === "letters";
    items.forEach((it) => {
      const cur = lines[lines.length - 1];
      // Letters: each form has a line of its own, centred on the others.
      if (letters && cur.length) { lines.push([]); cursor = 0; }
      else if (st.mode === "ayah" && cur.length && cursor + it.width > avail) { lines.push([]); cursor = 0; }
      lines[lines.length - 1].push({ ...it, offset: letters ? (maxW - it.width) / 2 : cursor });
      cursor += it.width + gap;
    });
    return { items, lines, maxW };
  }

  /** The word (or Ayah) pinned above the paper while the lines are blank. */
  function renderModel() {
    const blank = st.lines === "blank";
    modelEl.hidden = !blank;
    if (!blank) return;
    if (st.mode === "letters") { renderLettersModel(); return; }
    const vw = modelEl.clientWidth || scrollEl.clientWidth;
    const fs = st.mode === "word" ? Math.min(56, fsNow()) : 24;
    const pad = 8;
    const L = layout(fs, vw - 2 * pad);
    const lh = fs * 1.6;
    const Wc = Math.max(vw, Math.ceil(L.maxW + 2 * pad));
    const Hc = Math.ceil(L.lines.length * lh + 2 * pad);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    modelCv.width = Math.round(Wc * dpr); modelCv.height = Math.round(Hc * dpr);
    modelCv.style.width = `${Wc}px`; modelCv.style.height = `${Hc}px`;
    const ctx = modelCv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f4eedd";
    ctx.fillRect(0, 0, Wc, Hc);
    ctx.lineJoin = "round";
    ctx.textBaseline = "alphabetic";
    ctx.direction = "ltr";
    ctx.textAlign = "right";
    // Owner, 7 Oct 2026: "Why the word is not in tracing/ writing font?" -- the model is drawn in the same hollow
    // letters as the lines to trace over, in dark ink so it is still read at a glance (a thicker outline than the paper's).
    ctx.lineWidth = Math.max(1, fs / 40);
    const rightEdge = st.mode === "word" ? Wc / 2 + L.maxW / 2 : Wc - pad;
    L.lines.forEach((line, li) => {
      const y = pad + li * lh + lh * 0.72;
      line.forEach((w) => {
        ctx.font = `${fs}px '${w.family}'`;
        paintGlyph(ctx, w.g, rightEdge - w.offset, y, w.marker, "model");   // dark: read, not traced
      });
    });
    modelEl.dataset.glyphs = L.items.map((i) => i.g).join("|");
  }

  /** Letters, blank lines: the four forms shown once above the ruled lines, each with its name and example word. */
  function renderLettersModel() {
    const vw = modelEl.clientWidth || scrollEl.clientWidth;
    const L = letterNow();
    const cellW = vw / 4;
    const Hc = 132;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    modelCv.width = Math.round(vw * dpr); modelCv.height = Math.round(Hc * dpr);
    modelCv.style.width = `${vw}px`; modelCv.style.height = `${Hc}px`;
    const ctx = modelCv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f4eedd";
    ctx.fillRect(0, 0, vw, Hc);
    ctx.lineJoin = "round";
    ctx.direction = "ltr";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    const fs = Math.min(44, cellW * 0.62);
    ctx.lineWidth = Math.max(1, fs / 40);
    // right to left, as the Arabic is read: alone, beginning, middle, end
    LETTER_FORMS.forEach((f, i) => {
      const cx = vw - cellW * (i + 0.5);
      ctx.font = `${fs}px '${LETTER_FAMILY}'`;
      paintGlyph(ctx, L.forms[f], cx, 50, false, "model");
      noteLines(ctx, cx, 72, cellW - 4, 11, f === "alone" ? `${letterName()} · ${formLabel(f)}` : formLabel(f), formNote(L, f));
      ctx.font = `15px '${LETTER_FAMILY}'`;
      ctx.fillStyle = "#1b1b16";
      ctx.fillText(L.examples[f], cx, Hc - 8);
    });
    modelEl.dataset.glyphs = LETTER_FORMS.map((f) => L.forms[f]).join("|");
  }
  /** A form's name, and under it (smaller) what it really is; wrapped to the cell, never cut. */
  function noteLines(ctx, x, y, maxW, px, label, note) {
    let yy = y;
    const wrap = (text, font, color) => {
      ctx.font = font; ctx.fillStyle = color;
      let cur = "";
      for (const w of text.split(" ")) {
        const tryS = cur ? `${cur} ${w}` : w;
        if (cur && ctx.measureText(tryS).width > maxW) { ctx.fillText(cur, x, yy); yy += px + 2; cur = w; } else cur = tryS;
      }
      if (cur) { ctx.fillText(cur, x, yy); yy += px + 2; }
    };
    wrap(label, `600 ${px}px 'Inter',system-ui,sans-serif`, "#4a3a10");
    if (note) wrap(note, `${px - 1}px 'Inter',system-ui,sans-serif`, "#7a6a40");
  }

  let lastBox = "";
  function render() {
    if (st.destroyed) return;
    renderModel();
    const vw = scrollEl.clientWidth, vh = scrollEl.clientHeight;
    if (!vw || !vh) return;
    lastBox = `${vw}x${vh}`;
    const fs = fsNow();
    const pad = fs * 0.3;
    const L = layout(fs, vw - 2 * pad);
    const lh = fs * LINE_H;
    const blockH = L.lines.length * lh;
    const needW = L.maxW + 2 * pad;
    const Wc = Math.max(vw, Math.ceil(needW));
    // The paper is copied down the window (a copybook): enough blocks to fill it, plus whatever ⬆ More paper added.
    const blocks = Math.min(MAX_BLOCKS, Math.max(1, Math.ceil((vh - 2 * pad) / blockH)) + st.extra);
    const Hc = Math.max(vh, Math.ceil(blocks * blockH + 2 * pad));
    const ax = st.mode === "word" ? Wc / 2 : Wc - pad;          // anchor of the strokes
    const ay = 0;
    const top = pad;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    while (dpr > 1 && (Wc * dpr > 8192 || Hc * dpr > 8192 || Wc * Hc * dpr * dpr > 24e6)) dpr -= 0.25;
    stage.style.width = `${Wc}px`;
    stage.style.height = `${Hc}px`;
    for (const c of [paper, ink]) {
      c.width = Math.round(Wc * dpr); c.height = Math.round(Hc * dpr);
      c.style.width = `${Wc}px`; c.style.height = `${Hc}px`;
    }
    const ctx = paper.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, Wc, Hc);
    ctx.lineJoin = "round";
    ctx.textBaseline = "alphabetic";
    ctx.direction = "ltr";
    ctx.textAlign = "right";
    ctx.lineWidth = Math.max(0.35, fs / 90);
    const rightEdge = st.mode === "word" ? Wc / 2 + L.maxW / 2 : Wc - pad;
    for (let b = 0; b < blocks; b++) {
      L.lines.forEach((line, li) => {
        const y = top + (b * L.lines.length + li) * lh + lh * 0.72;
        if (st.lines === "blank") {
          ctx.fillStyle = RULE;
          ctx.fillRect(Math.round(pad), Math.round(y + lh * 0.12), Math.round(Wc - 2 * pad), 1);
          return;
        }
        line.forEach((w) => {
          ctx.font = `${fs}px '${w.family}'`;
          paintGlyph(ctx, w.g, rightEdge - w.offset, y, w.marker, st.shade);
          if (st.mode === "letters") paperNote(ctx, w, pad, y, lh);
        });
      });
    }
    st.geom = { Wc, Hc, fs, ax, ay, dpr, lh, pad, blockH, blocks };
    // Architect review (#604): when the letters are wider than the window, show the START of the Arabic
    // (its right-hand end), not its left; a centred word that fits stays centred. Only on a new size or
    // view, so a reader's own scrolling (✋ Move) is not undone by a window resize.
    const viewKey = `${st.mode}|${fs}|${st.mode === "letters" ? st.li : st.cw.loc}`;
    if (viewKey !== st.lastView) {
      st.lastView = viewKey;
      scrollEl.scrollLeft = Math.max(0, Math.ceil(rightEdge + pad - vw));
      scrollEl.scrollTop = 0;
    }
    stage.dataset.mode = st.mode;
    if (st.mode === "letters") stage.dataset.letter = letterNow().id; else delete stage.dataset.letter;
    stage.dataset.fs = String(fs);
    stage.dataset.size = String(st.idx);
    stage.dataset.canvasW = String(Wc);
    stage.dataset.canvasH = String(Hc);
    stage.dataset.lines = String(L.lines.length);
    stage.dataset.blocks = String(blocks);
    stage.dataset.linesMode = st.lines;
    stage.dataset.glyphs = L.items.map((i) => i.g).join("|");
    stage.dataset.locs = L.items.map((i) => i.loc).join(",");
    stage.dataset.pages = L.items.map((i) => i.page).join(",");
    root.dataset.glyph = st.cw.g;
    root.dataset.loc = st.cw.loc;
    paintInk();
  }

  /** Letters, trace over: each form's name and example word, small, at the paper's left edge of its line. */
  function paperNote(ctx, w, pad, y, lh) {
    const L = letterNow();
    ctx.save();
    ctx.textAlign = "left";
    ctx.lineWidth = 1;
    const x = Math.round(pad * 0.5) + 4;
    const top = y - lh * 0.72;
    ctx.fillStyle = "#4a3a10";
    ctx.font = `600 12px 'Inter',system-ui,sans-serif`;
    ctx.fillText(w.form === "alone" ? `${letterName()} · ${formLabel(w.form)}` : formLabel(w.form), x, top + 18);
    const note = formNote(L, w.form);
    if (note) { ctx.fillStyle = "#7a6a40"; ctx.font = `11px 'Inter',system-ui,sans-serif`; ctx.fillText(note, x, top + 32); }
    ctx.fillStyle = "#1b1b16";
    ctx.font = `20px '${LETTER_FAMILY}'`;
    ctx.fillText(L.examples[w.form], x, top + (note ? 58 : 48));
    ctx.restore();
  }

  function paintInk() {
    const g = st.geom;
    if (!g) return;
    const ctx = ink.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ink.width, ink.height);
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokeList().forEach((s) => {
      const X = (p) => g.ax + p[0] * g.fs, Y = (p) => g.pad + g.ay + p[1] * g.fs;
      ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineWidth = s.w * g.fs;
      if (s.pts.length === 1) {
        ctx.beginPath();
        ctx.arc(X(s.pts[0]), Y(s.pts[0]), s.w * g.fs / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      s.pts.forEach((p, k) => (k ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p))));
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  // ---- ‹ › : the neighbour word (or Ayah) in the unit, or null at its ends
  function unitList() { try { return unitWords?.() || []; } catch { return []; } }
  function neighbour(dir) {
    if (st.mode === "letters") { const k = st.li + dir; return k >= 0 && k < ARABIC_LETTERS.length ? k : null; }
    const all = unitList();
    const i = all.findIndex((w) => w.loc === st.cw.loc);
    if (i < 0) return null;
    if (st.mode === "word") {
      for (let k = i + dir; k >= 0 && k < all.length; k += dir) if (!all[k].marker) return all[k];
      return null;
    }
    const mine = new Set(ayahOf(st.cw.loc).map((w) => w.loc));
    mine.add(st.cw.loc);
    let k = i;
    while (k + dir >= 0 && k + dir < all.length && mine.has(all[k + dir].loc)) k += dir;
    const n = all[k + dir];
    if (!n) return null;
    return n;
  }

  function paintBar() {
    root.querySelectorAll("[data-wp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wpMode === st.mode)));
    root.querySelectorAll("[data-wp-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wpTool === st.tool)));
    $('[data-wp="move"]').setAttribute("aria-pressed", String(st.move));
    root.classList.toggle("wp-move", st.move);
    root.classList.toggle("wp-full", st.full);
    $('[data-wp="smaller"]').disabled = st.idx <= 0;
    $('[data-wp="bigger"]').disabled = st.idx >= MULT.length - 1;
    const wb = $('[data-wp="win"]');
    wb.setAttribute("aria-pressed", String(st.full));
    const wl = st.full ? t("Exit full screen") : t("Full screen");
    wb.setAttribute("aria-label", wl);
    wb.title = wl;
    const w = st.mode === "word", lt = st.mode === "letters";
    const pl = lt ? t("Previous letter") : w ? t("Previous word") : t("Previous Ayah"), nl = lt ? t("Next letter") : w ? t("Next word") : t("Next Ayah");
    const pv = $('[data-wp="prev"]'), nx = $('[data-wp="next"]');
    pv.setAttribute("aria-label", pl); pv.title = pl; pv.disabled = !neighbour(-1);
    nx.setAttribute("aria-label", nl); nx.title = nl; nx.disabled = !neighbour(1);
    $("[data-wp-shade]").value = st.shade;
    $("[data-wp-lines]").value = st.lines;
  }

  async function ensureFor(w) {
    const pages = new Set([w.page]);
    try { ayahOf(w.loc).forEach((x) => pages.add(x.page)); } catch { /* the word alone still works */ }
    await Promise.all([...pages].map((p) => ensureFont(p)));
  }
  async function start() {
    await ensureFor(st.cw);
    if (st.destroyed) return;
    paintBar();
    render();
  }
  async function go(dir) {
    const n = neighbour(dir);
    if (!n) return;
    cancelStroke();
    if (st.mode === "letters") { st.li = n; st.extra = 0; paintBar(); render(); return; }
    await ensureFor(n);
    if (st.destroyed) return;
    st.cw = n;
    st.fit = 0;
    st.extra = 0;
    paintBar();
    render();
  }
  function morePaper() {
    const g = st.geom;
    if (!g) return;
    const before = g.Hc;
    if (g.blocks >= MAX_BLOCKS) return;
    st.extra += MORE_BLOCKS;
    render();
    // slide the paper up so the first fresh line is at the top of the window
    scrollEl.scrollTop = Math.max(0, before - g.pad - g.lh * 0.5);
  }

  // ---- writing, two-finger scroll and the ✋ Move button
  const touches = new Map();
  let pan = null;
  const pos = (e) => {
    const r = ink.getBoundingClientRect();
    const g = st.geom;
    return [(e.clientX - r.left - g.ax) / g.fs, (e.clientY - r.top - g.pad - g.ay) / g.fs];
  };
  const centroid = () => {
    const v = [...touches.values()];
    return [(v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2];
  };
  function cancelStroke() {
    if (!st.drawing) return;
    const list = strokeList();
    const k = list.indexOf(st.drawing);
    if (k >= 0) list.splice(k, 1);
    st.drawing = null;
    paintInk();
  }
  ink.addEventListener("pointerdown", (e) => {
    if (!st.geom) return;
    e.preventDefault();
    if (e.pointerType === "touch") {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size >= 2) { cancelStroke(); pan = { last: centroid() }; return; }
    }
    try { ink.setPointerCapture(e.pointerId); } catch { /* not all engines */ }
    if (st.move) { pan = { last: [e.clientX, e.clientY], one: e.pointerId }; return; }
    const s = { tool: st.tool, w: st.tool === "eraser" ? ERASER_EM : PEN_EM, pts: [pos(e)] };
    strokeList().push(s);
    st.drawing = s;
    paintInk();
  });
  ink.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (pan) {
      e.preventDefault();
      const c = pan.one != null ? (e.pointerId === pan.one ? [e.clientX, e.clientY] : null) : (touches.size >= 2 ? centroid() : null);
      if (!c) return;
      scrollEl.scrollLeft -= c[0] - pan.last[0];
      scrollEl.scrollTop -= c[1] - pan.last[1];
      pan.last = c;
      return;
    }
    if (!st.drawing) return;
    e.preventDefault();
    st.drawing.pts.push(pos(e));
    paintInk();
  });
  const end = (e) => {
    touches.delete(e.pointerId);
    if (pan && (pan.one === e.pointerId || (pan.one == null && touches.size < 2))) pan = null;
    st.drawing = null;
    try { ink.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  ink.addEventListener("pointerup", end);
  ink.addEventListener("pointercancel", end);

  // ---- closing
  function destroy() {
    if (st.destroyed) return;
    st.destroyed = true;
    ro?.disconnect();
    window.removeEventListener("keydown", onKey, true);
    root.remove();
  }
  function finish() { destroy(); onClose?.(); }
  function requestClose() {
    if (dirty()) { confirmEl.hidden = false; return; }
    finish();
  }
  function onKey(e) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!confirmEl.hidden) { confirmEl.hidden = true; return; }
    requestClose();
  }
  window.addEventListener("keydown", onKey, true);

  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.dataset.wpMode) {
      st.mode = b.dataset.wpMode; st.extra = 0;
      // The Owner, 9 Oct 2026: an Ayah opened from its end mark, then Word, showed the end mark as "the word". A mark
      // is never a word to write: Word starts on that Ayah's first word.
      if (st.mode === "word" && st.cw.marker) st.cw = ayahOf(st.cw.loc).find((w) => !w.marker) ?? unitList().find((w) => !w.marker && w.loc.split(":").slice(0, 2).join(":") === st.cw.loc.split(":").slice(0, 2).join(":")) ?? st.cw;
      paintBar(); render();
      if (st.mode === "letters") ensureLetterFont().then(() => { if (!st.destroyed && st.mode === "letters") { render(); root.dataset.letterFont = "1"; } });
      return;
    }
    if (b.dataset.wpTool) { st.tool = b.dataset.wpTool; paintBar(); return; }
    switch (b.dataset.wp) {
      case "smaller": if (st.idx > 0) { st.idx--; paintBar(); render(); } break;
      case "bigger": if (st.idx < MULT.length - 1) { st.idx++; paintBar(); render(); } break;
      case "win": st.full = !st.full; paintBar(); break;
      case "prev": go(-1); break;
      case "next": go(1); break;
      case "more": morePaper(); break;
      case "undo": strokeList().pop(); paintInk(); break;
      case "clear": strokeList().length = 0; paintInk(); break;
      case "move": st.move = !st.move; paintBar(); break;
      case "close": requestClose(); break;
      case "close-anyway": finish(); break;
      case "keep": confirmEl.hidden = true; break;
      default: break;
    }
  });
  $("[data-wp-shade]").addEventListener("change", (e) => {
    st.shade = e.target.value;
    onShade?.(st.shade);
    render();
  });
  $("[data-wp-lines]").addEventListener("change", (e) => {
    st.lines = e.target.value === "blank" ? "blank" : "trace";
    st.extra = 0;
    render();
  });

  // The two list boxes: in their rows when the window is wide, in a row of their own when it is narrower than
  // NARROW_WIN, where the rows' 40px buttons leave them under 65px (they showed "B…" and "L…").
  const NARROW_WIN = 500;
  const row3 = $("[data-wp-row3]");
  const linesSel = $("[data-wp-lines]"), shadeSel = $("[data-wp-shade]");
  const homes = [[linesSel, linesSel.nextElementSibling], [shadeSel, shadeSel.nextElementSibling]];
  function placeListBoxes() {
    const narrow = win.getBoundingClientRect().width < NARROW_WIN;
    if (narrow && linesSel.parentElement !== row3) row3.append(linesSel, shadeSel);
    else if (!narrow && linesSel.parentElement === row3) for (const [sel, before] of homes) before.before(sel);
  }
  placeListBoxes();

  let ro = null;
  if (typeof ResizeObserver === "function") {
    let frame = 0;
    ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { placeListBoxes(); if (`${scrollEl.clientWidth}x${scrollEl.clientHeight}` !== lastBox) render(); });
    });
    ro.observe(scrollEl);
    ro.observe(win);
  }
  start();
  return { root, destroy, requestClose, isDirty: dirty };
}
