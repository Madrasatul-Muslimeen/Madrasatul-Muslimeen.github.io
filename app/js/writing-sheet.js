// Issue #421 -- the Writing sheet: the Mushaf page as an A4 tracing sheet.
// Light hollow letters, write over them with a finger or pen, save the result
// as a picture on the reader's own device, or print it on A4.
//
// I2: a renderer. Pages in, DOM out. It reads no records, writes no activity
// and NEVER stores the writing: no Firestore, no localStorage, no IndexedDB.
// The two things it may remember are view choices, never the writing: the
// letter style (`writingSheetShade`) and whether the toolbar is hidden
// (`writingSheetTools`, the Owner's "hide n appear", 30 Sep 2026).
// I9: nothing here is fetched or loaded until openWritingSheet() is called --
// the caller imports this file dynamically, on the button press.
//
// The printed structure never changes. Each page keeps its own lines, in
// order, with the words the Mushaf data puts on each; a line is justified by
// horizontal scale (0.8-1.5, anchored right) exactly as hifz-renderer's
// justifyPageLines() does, and everything scales with the page's WIDTH. Words
// never re-flow onto another line, so the structure is the same at 320px and
// at 1280px.
//
// The data and the fonts are hifz-renderer.js's own; nothing is copied.

import { t, num } from "./i18n.js";
import {
  ensureMushafData, getMushafPageLines, getAyahEndMarkerPosition, getMushafPagesForKeys,
  loadMushafPageFont, loadSurahHeaderFont, surahHeaderGlyph, fatihaPageLines,
} from "./hifz-renderer.js";
import { openWordPopout } from "./writing-popout.js";
import { FATIHA_SPLIT_AFTER_WORD } from "./fatiha-count.js";

const SHADE_KEY = "writingSheetShade";
const TOOLS_KEY = "writingSheetTools";
const SHADES = {
  light: { mode: "stroke", color: "#b4ab96" },
  lighter: { mode: "stroke", color: "#d6cfbf" },
  book: { mode: "fill", color: "#dcd8cd" },
};
const PAPER = "#fffdf8";
const RULE = "#cfc8b6";
const MARKER = "#1b2440";
const INK = "#1b3a8a";
const PEN_W = 0.006;    // of the page width
const ERASER_W = 0.035;
const A4_RATIO = 210 / 297;
const PRINT_WIDTH_PX = 1654; // A4 at 200 dpi
const BASMALLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

// Layout, all as a fraction of the page WIDTH so the page scales as one piece.
const MARGIN_X = 0.07;
const TOP = 0.075;       // of the page height
const FOOT = 0.075;      // of the page height
const FONT_SIZE = 0.043;
const WORD_GAP = 0.12;   // em, the same gap .hifz-line uses

let openSheet = null;

function readShade() {
  try {
    const v = localStorage.getItem(SHADE_KEY);
    if (v && SHADES[v]) return v;
  } catch { /* storage may be blocked */ }
  return "light";
}
function readToolsHidden() {
  try { return localStorage.getItem(TOOLS_KEY) === "hidden"; } catch { return false; }
}
function saveToolsHidden(hidden) {
  try { localStorage.setItem(TOOLS_KEY, hidden ? "hidden" : "shown"); } catch { /* this visit only */ }
}
function saveShade(v) {
  try { localStorage.setItem(SHADE_KEY, v); } catch { /* remembered for this visit only */ }
}

/** Pure: where every line, word and rule of a page sits at width `W`. `measure(text, family, px)` returns a width. */
export function layoutWritingPage(lines, family, W, measure, inUnit) {
  const H = W / A4_RATIO;
  const top = H * TOP;
  const pitch = (H - top - H * FOOT) / 15;
  const fs = W * FONT_SIZE;
  const cw = W * (1 - 2 * MARGIN_X);
  const out = [];
  lines.forEach((line, i) => {
    const y = top + pitch * i;
    const item = { type: line.type, y, base: y + pitch * 0.68, rule: y + pitch * 0.96, words: [], scale: 1 };
    if (line.type === "ayah" && line.words) {
      const gap = WORD_GAP * fs;
      let natural = 0;
      line.words.forEach((w, k) => {
        const [s, a, p] = w.loc.split(":");
        const key = `${s}:${a}`;
        const width = measure(w.g, family, fs);
        // w.fatihaSplitMarker: the ⑥ the reader's Al-Fatiha count adds before غَيْرِ (fatihaPageLines).
        const marker = !!w.fatihaSplitMarker || getAyahEndMarkerPosition(key) === Number(p);
        item.words.push({ g: w.g, loc: w.loc, width, marker, dim: !inUnit(Number(s), Number(a)), offset: natural });
        natural += width + (k < line.words.length - 1 ? gap : 0);
      });
      item.scale = Math.max(0.8, Math.min(1.5, natural ? cw / natural : 1));
      item.natural = natural;
    }
    out.push(item);
  });
  return { W, H, fs, pitch, top, cw, lines: out };
}

function drawGlyphs(ctx, text, x, y, shade) {
  if (shade.mode === "stroke") {
    ctx.strokeStyle = shade.color;
    ctx.strokeText(text, x, y);
  } else {
    ctx.fillStyle = shade.color;
    ctx.fillText(text, x, y);
  }
}

/** Draws one page (paper, rules, letters, markers, number) onto a canvas context already scaled to CSS-width `W`. */
export function drawWritingPage(ctx, info, layout, shadeName) {
  const shade = SHADES[shadeName] || SHADES.light;
  const { W, H, fs, cw } = layout;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.textBaseline = "alphabetic";
  ctx.direction = "ltr";
  ctx.textAlign = "right";
  const right = W - W * MARGIN_X;
  const lineW = Math.max(0.35, fs / 90);
  layout.lines.forEach((ln) => {
    ctx.strokeStyle = RULE;
    ctx.lineWidth = Math.max(0.5, W / 900);
    ctx.beginPath();
    ctx.moveTo(W * MARGIN_X, ln.rule);
    ctx.lineTo(right, ln.rule);
    ctx.stroke();
  });
  layout.lines.forEach((ln) => {
    if (ln.type === "ayah") {
      ctx.save();
      ctx.translate(right, ln.base);
      ctx.scale(ln.scale, 1);
      ctx.font = `${fs}px '${info.family}'`;
      ctx.lineWidth = lineW;
      ln.words.forEach((w) => {
        ctx.globalAlpha = w.dim ? 0.32 : 1;
        if (w.marker) { ctx.fillStyle = MARKER; ctx.fillText(w.g, -w.offset, 0); }
        else drawGlyphs(ctx, w.g, -w.offset, 0, shade);
      });
      ctx.restore();
    } else if (ln.type === "basmallah") {
      ctx.save();
      ctx.font = `${fs * 1.05}px 'Amiri','Traditional Arabic',serif`;
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.lineWidth = lineW;
      drawGlyphs(ctx, BASMALLAH, W / 2, ln.base, shade);
      ctx.restore();
    } else if (ln.type === "surah_name") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.globalAlpha = shadeName === "book" ? 1 : 0.5;
      ctx.fillStyle = shadeName === "book" ? MARKER : "#7a5f1e";
      const glyph = info.headerGlyph(ln.surah);
      if (info.headerOk) {
        ctx.font = "100px 'surah-header'";
        const natural = ctx.measureText(glyph).width || 1;
        const px = Math.min(100 * (cw * 0.9) / natural, layout.pitch * 1.6);
        ctx.font = `${px}px 'surah-header'`;
        ctx.fillText(glyph, W / 2, ln.base + layout.pitch * 0.08);
      } else {
        ctx.font = `${fs * 1.2}px 'Amiri','Traditional Arabic',serif`;
        ctx.direction = "rtl";
        ctx.fillText(info.headerName(ln.surah), W / 2, ln.base);
      }
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#6b6558";
  ctx.font = `${W * 0.03}px 'Amiri','Traditional Arabic',serif`;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillText(Number(info.n).toLocaleString("ar-EG", { useGrouping: false }), W / 2, H - H * FOOT * 0.35);
  ctx.restore();
}

function drawInk(ctx, strokes, W) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokes.forEach((s) => {
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = s.w * W;
    if (s.pts.length === 1) {
      ctx.beginPath();
      ctx.arc(s.pts[0][0] * W, s.pts[0][1] * W, s.w * W / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    s.pts.forEach((p, k) => (k ? ctx.lineTo(p[0] * W, p[1] * W) : ctx.moveTo(p[0] * W, p[1] * W)));
    ctx.stroke();
  });
  ctx.globalCompositeOperation = "source-over";
}

function measurer() {
  const c = document.createElement("canvas").getContext("2d");
  return (text, family, px) => { c.font = `${px}px '${family}'`; return c.measureText(text).width; };
}

const CSS = `
#writingSheet{position:fixed;inset:0;z-index:9500;background:#e9e4d6;display:flex;flex-direction:column;font-family:'Inter',system-ui,sans-serif;color:#1b1b16}
#writingSheet[hidden]{display:none}
#writingSheet .ws-chrome{position:sticky;top:0;z-index:5;flex:0 0 auto}
#writingSheet.ws-zoomed .ws-chrome{position:fixed;top:0;left:0;transform-origin:0 0}
#writingSheet .ws-end{margin-left:auto;display:flex;gap:6px;align-items:center;flex:0 0 auto}
#writingSheet.ws-tools-hidden .ws-toolbar{background:transparent;pointer-events:none;padding:6px 8px}
#writingSheet.ws-tools-hidden .ws-row2,#writingSheet.ws-tools-hidden .ws-menu,#writingSheet.ws-tools-hidden .ws-row1 > :not(.ws-end),#writingSheet.ws-tools-hidden .ws-end > :not(.ws-toggle){display:none}
#writingSheet.ws-tools-hidden .ws-toggle{pointer-events:auto;background:#1F3A6E !important;border-color:#1F3A6E !important;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
#writingSheet.ws-tools-hidden .ws-chrome{position:fixed;top:0;right:0;left:auto}
#writingSheet.ws-tools-hidden.ws-zoomed .ws-chrome{right:auto}
/* The toolbar is exactly two rows at every width (Owner, 6 Oct 2026): row 1 the drawing tools and Close/Hide, row 2 the unit, the letter style and the ⋯ menu. */
#writingSheet .ws-toolbar{position:relative;z-index:3;display:flex;flex-direction:column;gap:6px;padding:8px 8px;background:#1F3A6E;color:#fff;flex:0 0 auto}
#writingSheet .ws-row{display:flex;gap:6px;align-items:center;min-width:0;flex-wrap:nowrap}
#writingSheet .ws-group{display:flex;gap:6px;align-items:center;min-width:0}
#writingSheet .ws-toolbar button{min-height:40px;min-width:40px;padding:0.3rem 0.7rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.9rem;line-height:1.1;white-space:nowrap;flex:0 0 auto;cursor:pointer}
#writingSheet .ws-toolbar .ws-unit{flex:1 1 0;min-width:0;white-space:normal;text-align:start;overflow-wrap:anywhere;font-size:0.85rem}
#writingSheet .ws-toolbar .ws-shade{min-height:40px;padding:0.3rem 1.6rem 0.3rem 0.7rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23fff'/%3E%3C/svg%3E") no-repeat right 0.55rem center;color:#fff;font:inherit;font-size:0.9rem;-webkit-appearance:none;appearance:none;cursor:pointer;flex:0 0 auto;max-width:42%}
#writingSheet .ws-toolbar .ws-shade option{color:#1b1b16;background:#fff}
#writingSheet .ws-ic-narrow{display:none}
#writingSheet .ws-menu{position:absolute;right:8px;top:100%;margin-top:2px;z-index:6;display:flex;flex-direction:column;gap:4px;padding:6px;background:#1F3A6E;border:1px solid rgba(255,255,255,0.35);border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.35)}
#writingSheet .ws-menu[hidden]{display:none}
#writingSheet .ws-unitpanel{position:relative;z-index:4;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end;padding:10px 12px;background:#fff8e6;color:#2b2410;border-bottom:2px solid #B8862F}
#writingSheet .ws-unitpanel[hidden]{display:none}
#writingSheet .ws-unitpanel label{display:flex;flex-direction:column;gap:2px;font-size:0.8rem;min-width:0}
#writingSheet .ws-unitpanel label[hidden]{display:none}
#writingSheet .ws-unitpanel select{min-height:40px;font:inherit;font-size:0.9rem;max-width:100%;min-width:0}
#writingSheet .ws-unitpanel button{min-height:40px;min-width:40px;padding:0.3rem 0.9rem;border-radius:8px;border:1px solid #B8862F;background:#fff;color:#4a3a10;font:inherit;cursor:pointer}
#writingSheet .ws-unitpanel [data-ws="unit-show"]{background:#B8862F;color:#fff}
@media (max-width:599.98px){
  #writingSheet .ws-title,#writingSheet .ws-tx{display:none}
  #writingSheet .ws-ic-narrow{display:inline}
  #writingSheet .ws-toolbar{padding:6px 4px;gap:4px}
  #writingSheet .ws-row,#writingSheet .ws-group,#writingSheet .ws-end{gap:3px}
  #writingSheet .ws-toolbar button{padding:0.3rem 0.2rem;font-size:1rem}
  #writingSheet .ws-toolbar .ws-unit{font-size:0.8rem;padding:0.2rem 0.4rem}
  #writingSheet .ws-toolbar .ws-shade{font-size:0.8rem;padding:0.3rem 1.2rem 0.3rem 0.4rem;background-position:right 0.4rem center}
}
#writingSheet .ws-toolbar button:disabled{opacity:0.4;cursor:default}
#writingSheet .ws-toolbar button[aria-pressed="true"],#writingSheet .ws-toolbar button[aria-checked="true"]{background:#B8862F;border-color:#B8862F}
#writingSheet .ws-title{font-weight:600;font-size:0.95rem;margin-right:4px}
#writingSheet .ws-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:12px 8px 40px;-webkit-overflow-scrolling:touch}
#writingSheet .ws-page{position:relative;margin:0 auto 14px;box-shadow:0 4px 16px rgba(0,0,0,0.22);background:${PAPER};max-width:820px}
#writingSheet .ws-page canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
#writingSheet .ws-ink{touch-action:pan-x pan-y pinch-zoom}
#writingSheet.ws-writing .ws-ink{touch-action:none;cursor:crosshair}
#writingSheet .ws-msg{position:absolute;inset:auto 0 50% 0;text-align:center;font-size:13px;color:#a33;padding:0 12px}
#writingSheet .ws-pick{position:relative;z-index:4;padding:8px 12px;background:#fff3cf;color:#4a3a10;border-bottom:2px solid #B8862F;font-size:0.9rem}
#writingSheet .ws-pick[hidden]{display:none}
#writingSheet.ws-picking .ws-ink{cursor:zoom-in}
#writingSheet .ws-confirm{position:relative;z-index:4;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:10px 12px;background:#fff3cf;color:#4a3a10;border-bottom:2px solid #B8862F}
#writingSheet .ws-confirm[hidden]{display:none}
#writingSheet .ws-confirm button{min-height:40px;padding:0.3rem 0.9rem;border-radius:8px;border:1px solid #B8862F;background:#fff;color:#4a3a10;font:inherit;cursor:pointer}
#writingSheet .ws-print{display:none}
@media print{
  @page{size:A4;margin:10mm}
  html,body{height:auto !important;overflow:visible !important;background:#fff !important;margin:0 !important;padding:0 !important}
  body > *:not(#writingSheet){display:none !important}
  #writingSheet{position:static !important;display:block !important;background:#fff}
  #writingSheet .ws-toolbar,#writingSheet .ws-scroll,#writingSheet .ws-confirm{display:none !important}
  #writingSheet .ws-print{display:block !important}
  #writingSheet .ws-print-page{height:277mm;overflow:hidden;break-after:page;page-break-after:always;text-align:center}
  #writingSheet .ws-print-page:last-child{break-after:auto;page-break-after:auto}
  #writingSheet .ws-print-page img{width:190mm;height:auto;max-height:277mm;display:block;margin:0 auto}
}
`;

/**
 * Opens the sheet.
 *   pages         real Mushaf page numbers, in order
 *   range         { from: [surah, ayah], to: [surah, ayah] } of the Study Unit
 *                 (words outside it are dimmed), or null to dim nothing
 *   surahArabicName(n)  optional label lookup for the surah-banner fallback
 *   onClose()     optional
 *   onChooseUnit({ type, surah, from, to, page })  optional; the caller applies the
 *                 choice to the app's Study Unit and re-opens the sheet (W1). The
 *                 sheet never sets the unit itself (I2).
 *   surahs        [{ n, name, ayahCount }], names in the reader's language
 *   initial       { type, surah, from, to, page } of the current unit
 *   unitLabel     what the sheet holds now, in words
 */
export async function openWritingSheet({ fatihaCount = false, pages, range = null, surahArabicName = null, onClose = null, onChooseUnit = null, surahs = [], initial = null, unitLabel = "" } = {}) {
  if (openSheet) openSheet.destroy();
  const inUnit = (s, a) => {
    if (!range) return true;
    const v = s * 1000 + a;
    return v >= range.from[0] * 1000 + range.from[1] && v <= range.to[0] * 1000 + range.to[1];
  };
  const root = document.createElement("div");
  root.id = "writingSheet";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", t("Writing sheet"));
  let shade = readShade();
  root.dataset.shade = shade;
  root.innerHTML = `<style>${CSS}</style>
    <div class="ws-chrome" data-ws-chrome>
    <div class="ws-toolbar">
      <div class="ws-row ws-row1">
        <span class="ws-title">${t("Writing sheet")}</span>
        <div class="ws-group">
          <button type="button" data-ws="write" aria-pressed="false" aria-label="${t("Write")}" title="${t("Write")}">✏<span class="ws-tx"> ${t("Write")}</span></button>
          <button type="button" data-ws-tool="pen" aria-pressed="true" aria-label="${t("Pen")}" title="${t("Pen")}"><span class="ws-ic-narrow">🖊</span><span class="ws-tx">${t("Pen")}</span></button>
          <button type="button" data-ws-tool="eraser" aria-pressed="false" aria-label="${t("Eraser")}" title="${t("Eraser")}"><span class="ws-ic-narrow">🧽</span><span class="ws-tx">${t("Eraser")}</span></button>
          <button type="button" data-ws="undo" aria-label="${t("Undo")}" title="${t("Undo")}"><span class="ws-ic-narrow">↶</span><span class="ws-tx">${t("Undo")}</span></button>
          <button type="button" data-ws="clear" aria-label="${t("Clear")}" title="${t("Clear")}"><span class="ws-ic-narrow">🗑</span><span class="ws-tx">${t("Clear")}</span></button>
        </div>
        <span class="ws-end" data-ws-end><button type="button" data-ws="close" aria-label="${t("Close")}" title="${t("Close")}">✕<span class="ws-tx"> ${t("Close")}</span></button><button type="button" class="ws-toggle" data-ws="tools" aria-expanded="true"></button></span>
      </div>
      <div class="ws-row ws-row2">
        <button type="button" class="ws-unit" data-ws="unit" aria-expanded="false"${onChooseUnit ? "" : " disabled"}></button>
        <button type="button" data-ws="popout" aria-pressed="false" aria-label="${t("Pop out")}" title="${t("Pop out")}">🔍<span class="ws-tx"> ${t("Pop out")}</span></button>
        <select class="ws-shade" data-ws-shade-select aria-label="${t("Letter style")}" title="${t("Letter style")}">
          <option value="light">${t("Light")}</option>
          <option value="lighter">${t("Lighter")}</option>
          <option value="book">${t("Like the book")}</option>
        </select>
        <button type="button" data-ws="more" aria-haspopup="true" aria-expanded="false" aria-label="${t("More")}" title="${t("More")}">⋯</button>
      </div>
      <div class="ws-menu" data-ws-menu hidden>
        <button type="button" data-ws="save">${t("Save picture")}</button>
        <button type="button" data-ws="print">${t("Print A4")}</button>
      </div>
    </div>
    <div class="ws-pick" data-ws-pick role="status" hidden>${t("Tap a word to pop it out")}</div>
    <div class="ws-unitpanel" data-ws-unitpanel hidden></div>
    <div class="ws-confirm" data-ws-confirm-unit hidden>
      <span>${t("Change what you practise? Your writing on this sheet will be cleared.")}</span>
      <button type="button" data-ws="unit-change">${t("Change")}</button>
      <button type="button" data-ws="unit-keep">${t("Keep writing")}</button>
    </div>
    <div class="ws-confirm" data-ws-confirm hidden>
      <span>${t("Close without saving your writing?")}</span>
      <button type="button" data-ws="close-anyway">${t("Close")}</button>
      <button type="button" data-ws="keep">${t("Keep writing")}</button>
    </div>
    </div>
    <div class="ws-scroll" data-ws-scroll><p data-ws-loading style="text-align:center;color:#555">${t("Loading the writing sheet…")}</p></div>
    <div class="ws-print" data-ws-print aria-hidden="true"></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  // The Owner, 6 Oct 2026 ("follow my counting", decision 76): with the reader's Al-Fatiha count on,
  // page 1 is drawn exactly as the Read view's Mushaf draws it -- the Bismillah unnumbered, the
  // numbers one lower, and ⑥ before غَيْرِ -- through the SAME function, so the two cannot drift.
  const pageLines = (n) => { const ls = getMushafPageLines(n); return fatihaCount && Number(n) === 1 && ls ? fatihaPageLines(ls) : ls; };
  const scrollEl = $("[data-ws-scroll]");
  const printEl = $("[data-ws-print]");
  const confirmEl = $("[data-ws-confirm]");
  const unitConfirmEl = $("[data-ws-confirm-unit]");
  const panelEl = $("[data-ws-unitpanel]");
  const menuEl = $("[data-ws-menu]");

  const chromeEl = $("[data-ws-chrome]");
  let toolsHidden = readToolsHidden();
  const st = { pick: false, popout: null, write: false, tool: "pen", pages: [], current: null, dirty: new Set(), drawing: null, destroyed: false };
  const measure = measurer();

  const paintToolbar = () => {
    root.classList.toggle("ws-writing", st.write);
    root.classList.toggle("ws-picking", st.pick);
    $('[data-ws="popout"]').setAttribute("aria-pressed", String(st.pick));
    $("[data-ws-pick]").hidden = !st.pick;
    $('[data-ws="write"]').setAttribute("aria-pressed", String(st.write));
    root.querySelectorAll("[data-ws-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wsTool === st.tool)));
    $("[data-ws-shade-select]").value = shade;
    const ub = $('[data-ws="unit"]');
    ub.textContent = `📖 ${unitLabel}`;
    ub.title = unitLabel;
    ub.setAttribute("aria-label", `${t("Choose what to practise")}: ${unitLabel}`);
    root.dataset.shade = shade;
    root.classList.toggle("ws-tools-hidden", toolsHidden);
    const tg = $('[data-ws="tools"]');
    tg.textContent = toolsHidden ? `▾ ${t("Tools")}` : `▴ ${t("Hide")}`;
    tg.setAttribute("aria-expanded", String(!toolsHidden));
    tg.setAttribute("aria-label", toolsHidden ? t("Show the tools") : t("Hide the tools"));
    tg.title = tg.getAttribute("aria-label");
    placeChrome();
  };

  // The Owner, 30 Sep 2026: "enable them to be accessible when zoom in". A
  // pinch-zoom enlarges the whole page, so a toolbar pinned to the page slides
  // off screen and grows. While zoomed, pin the toolbar to the VISUAL viewport
  // instead: move it to where the reader is looking and scale it back to its
  // normal size, so every button stays on screen and finger-sized.
  function placeChrome() {
    const vv = window.visualViewport;
    const zoomed = !!vv && vv.scale > 1.01;
    root.classList.toggle("ws-zoomed", zoomed);
    if (!zoomed) { chromeEl.style.transform = ""; chromeEl.style.width = ""; return; }
    const w = toolsHidden ? "" : `${vv.width * vv.scale}px`;
    const x = toolsHidden ? vv.offsetLeft + vv.width - (chromeEl.offsetWidth / vv.scale) : vv.offsetLeft;
    chromeEl.style.width = w;
    chromeEl.style.transform = `translate(${x}px, ${vv.offsetTop}px) scale(${1 / vv.scale})`;
  }

  // Close and Hide have a fixed place now (row 1, right-hand end), so nothing needs measuring.
  let chromeFrame = 0;
  const onViewport = () => { cancelAnimationFrame(chromeFrame); chromeFrame = requestAnimationFrame(placeChrome); };
  window.visualViewport?.addEventListener("resize", onViewport);
  window.visualViewport?.addEventListener("scroll", onViewport);

  function destroy() {
    st.destroyed = true;
    st.popout?.destroy();
    io?.disconnect();
    window.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("resize", onViewport);
    window.visualViewport?.removeEventListener("scroll", onViewport);
    window.removeEventListener("afterprint", clearPrint);
    document.removeEventListener("keydown", onKey);
    root.remove();
    if (openSheet && openSheet.root === root) openSheet = null;
  }
  function requestClose() {
    if (st.dirty.size) { unitConfirmEl.hidden = true; confirmEl.hidden = false; return; }
    destroy();
    onClose?.();
  }
  function onKey(e) { if (e.key === "Escape") { e.preventDefault(); requestClose(); } }
  document.addEventListener("keydown", onKey);
  openSheet = { root, destroy };

  // ---- data and fonts: only now, after the button press (I9)
  let io = null;
  try {
    await ensureMushafData();
  } catch (err) {
    scrollEl.innerHTML = `<p class="ws-msg" style="position:static;padding:20px">${t("Couldn't load this page's data.")}</p>`;
    console.warn("Writing sheet data failed:", err);
    wireToolbar();
    return openSheet;
  }
  if (st.destroyed) return null;
  scrollEl.innerHTML = "";
  const headerNeeded = pages.some((n) => (pageLines(n) || []).some((l) => l.type === "surah_name"));
  const headerOk = headerNeeded ? await loadSurahHeaderFont() : false;

  const headerGlyph = (surah) => surahHeaderGlyph(surah);
  const headerName = (surah) => (typeof surahArabicName === "function" ? surahArabicName(Number(surah)) : null) || `سورة ${surah}`;

  pages.forEach((n) => {
    const lines = pageLines(n);
    const wrap = document.createElement("div");
    wrap.className = "ws-page";
    wrap.dataset.page = String(n);
    const canvas = document.createElement("canvas");
    canvas.className = "ws-page-canvas";
    const ink = document.createElement("canvas");
    ink.className = "ws-ink";
    wrap.append(canvas, ink);
    scrollEl.appendChild(wrap);
    const info = {
      n, lines, wrap, canvas, ink, strokes: [], drawn: false, family: `hifz-p${n}`, fontOk: null,
      headerOk, headerGlyph, headerName, ratio: 0, layout: null,
    };
    st.pages.push(info);
    if (!lines) {
      const m = document.createElement("div");
      m.className = "ws-msg";
      m.textContent = t("Couldn't load this page's data.");
      wrap.appendChild(m);
    }
    wireInk(info);
  });
  sizeAll();

  function cssWidth() {
    const avail = scrollEl.clientWidth - 16;
    return Math.max(160, Math.min(820, avail || 300));
  }
  function sizePage(info) {
    const W = cssWidth();
    const H = W / A4_RATIO;
    info.wrap.style.width = `${W}px`;
    info.wrap.style.height = `${H}px`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [info.canvas, info.ink]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    info.dpr = dpr;
    info.W = W;
  }
  function sizeAll() { st.pages.forEach(sizePage); }

  function paintInk(info) {
    const ctx = info.ink.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, info.ink.width, info.ink.height);
    ctx.setTransform(info.dpr, 0, 0, info.dpr, 0, 0);
    drawInk(ctx, info.strokes, info.W);
  }

  async function paintPage(info) {
    if (!info.lines || st.destroyed) return;
    if (info.fontOk === null) info.fontOk = (await loadMushafPageFont(info.n)).ok;
    if (st.destroyed) return;
    if (!info.fontOk) {
      if (!info.wrap.querySelector(".ws-msg")) {
        const m = document.createElement("div");
        m.className = "ws-msg";
        m.textContent = t("Couldn't display this page's letters (its font didn't load).");
        info.wrap.appendChild(m);
      }
    }
    const layout = layoutWritingPage(info.lines, info.family, info.W, measure, inUnit);
    info.layout = layout;
    const ctx = info.canvas.getContext("2d");
    ctx.setTransform(info.dpr, 0, 0, info.dpr, 0, 0);
    drawWritingPage(ctx, info, layout, shade);
    info.drawn = true;
    const w = info.wrap;
    // Read back off the DRAWN layout, not off the data: a renderer that
    // re-flowed words onto new lines would draw more lines than the data has,
    // and only these attributes let a check see it.
    w.dataset.lines = String(layout.lines.length);
    w.dataset.lineTypes = layout.lines.map((l) => l.type).join(",");
    w.dataset.wordsPerLine = layout.lines.map((l) => (l.type === "ayah" && l.words ? l.words.length : 0)).join(",");
    w.dataset.geom = JSON.stringify({ top: layout.top / layout.W, pitch: layout.pitch / layout.W, fs: layout.fs / layout.W });
    w.dataset.painted = shade;
    // Read back off the DRAWN layout, so a check can see which words the sheet dimmed.
    const drawnWords = layout.lines.flatMap((l) => l.words || []);
    w.dataset.dimmed = String(drawnWords.filter((x) => x.dim).length);
    w.dataset.undimmed = String(drawnWords.filter((x) => !x.dim).length);
    paintInk(info);
  }

  function paintAll(force) {
    st.pages.forEach((p) => { if (p.drawn || force) { p.drawn = false; if (p.ratio > 0 || force) paintPage(p); } });
  }

  if (typeof IntersectionObserver === "function") {
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const info = st.pages.find((p) => p.wrap === e.target);
        if (!info) return;
        info.ratio = e.intersectionRatio;
        if (e.isIntersecting && !info.drawn) paintPage(info);
      });
      const best = st.pages.filter((p) => p.ratio > 0).sort((a, b) => b.ratio - a.ratio)[0];
      if (best && !st.drawing) st.current = best;
    }, { root: scrollEl, rootMargin: "100% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    st.pages.forEach((p) => io.observe(p.wrap));
  } else {
    st.pages.forEach((p) => paintPage(p));
  }
  st.current = st.pages[0] || null;

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeAll();
      st.pages.forEach((p) => { paintInk(p); if (p.drawn) paintPage(p); });
    }, 120);
  }
  window.addEventListener("resize", onResize);

  // ---- writing
  function wireInk(info) {
    const ink = info.ink;
    const pos = (e) => {
      const r = ink.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, ((e.clientY - r.top) / r.width)];
    };
    ink.addEventListener("pointerdown", (e) => {
      if (st.pick) {
        // W2: a tap in pick mode chooses a word and never draws.
        e.preventDefault();
        const hit = wordAt(info, e.clientX, e.clientY);
        if (hit) { st.pick = false; paintToolbar(); popOut(hit); }
        return;
      }
      if (!st.write) return;
      e.preventDefault();
      try { ink.setPointerCapture(e.pointerId); } catch { /* not all engines */ }
      const s = { tool: st.tool, w: st.tool === "eraser" ? ERASER_W : PEN_W, pts: [pos(e)] };
      info.strokes.push(s);
      st.drawing = { info, s };
      st.current = info;
      st.dirty.add(info.n);
      paintInk(info);
    });
    ink.addEventListener("pointermove", (e) => {
      const d = st.drawing;
      if (!d || d.info !== info) return;
      e.preventDefault();
      d.s.pts.push(pos(e));
      paintInk(info);
    });
    const end = (e) => {
      if (!st.drawing || st.drawing.info !== info) return;
      st.drawing = null;
      try { ink.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    ink.addEventListener("pointerup", end);
    ink.addEventListener("pointercancel", end);
  }

  // ---- W2: pop out a word or an Ayah. Which word was tapped comes from the page's own layout, never from pixels.
  function wordAt(info, clientX, clientY) {
    const lay = info.layout;
    if (!lay) return null;
    const r = info.ink.getBoundingClientRect();
    const k = lay.W / r.width;
    const x = (clientX - r.left) * k, y = (clientY - r.top) * k;
    const right = lay.W - lay.W * MARGIN_X;
    const gap = WORD_GAP * lay.fs;
    for (const ln of lay.lines) {
      if (ln.type !== "ayah" || !ln.words.length) continue;
      if (y < ln.y - lay.pitch * 0.05 || y > ln.y + lay.pitch) continue;
      const u = (right - x) / ln.scale;
      const w = ln.words.find((q) => u >= q.offset - gap / 2 && u <= q.offset + q.width + gap / 2);
      return w ? { g: w.g, loc: w.loc, marker: w.marker, page: info.n, family: info.family } : null;
    }
    return null;
  }
  function ayahWordsOf(loc) {
    const [s, a, p0] = loc.split(":");
    const key = `${s}:${a}`;
    // Decision 76: with the reader's Al-Fatiha count on, the stored 1:7 is TWO Ayat (6 = words 1-4 and ⑥,
    // 7 = from غَيْرِ to ⑦); the pop-out's Ayah view shows only the half the tapped word is in.
    const split = fatihaCount && key === "1:7";
    const half = (p) => (Number(p) <= FATIHA_SPLIT_AFTER_WORD ? 1 : 2);
    const out = [];
    getMushafPagesForKeys([key]).forEach((pg) => {
      (pageLines(pg) || []).forEach((line) => {
        if (line.type !== "ayah" || !line.words) return;
        line.words.forEach((w) => {
          const [ws, wa, wp] = w.loc.split(":");
          if (`${ws}:${wa}` !== key) return;
          if (split && half(wp) !== half(p0)) return;
          out.push({ g: w.g, loc: w.loc, page: pg, family: `hifz-p${pg}`, marker: !!w.fatihaSplitMarker || getAyahEndMarkerPosition(key) === Number(wp) });
        });
      });
    });
    return out;
  }
  function popOut(hit) {
    st.popout?.destroy();
    st.popout = openWordPopout({
      host: root,
      word: hit,
      mode: hit.marker ? "ayah" : "word",
      ayahWords: () => ayahWordsOf(hit.loc),
      ensureFont: (pg) => loadMushafPageFont(pg),
      paintGlyph: (ctx, g, x, y, marker, shadeName) => {
        if (marker) { ctx.fillStyle = MARKER; ctx.fillText(g, x, y); }
        else drawGlyphs(ctx, g, x, y, SHADES[shadeName] || SHADES.light);
      },
      shade,
      onShade: (v) => { shade = v; saveShade(shade); paintToolbar(); st.pages.forEach((p) => { if (p.drawn) paintPage(p); }); },
      onClose: () => { st.popout = null; },
    });
  }

  // ---- saving
  function compose(info, widthPx, shadeName) {
    const W = widthPx;
    const H = Math.round(W / A4_RATIO);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const layout = layoutWritingPage(info.lines, info.family, W, measure, inUnit);
    drawWritingPage(ctx, info, layout, shadeName);
    const inkC = document.createElement("canvas");
    inkC.width = W; inkC.height = H;
    const ictx = inkC.getContext("2d");
    drawInk(ictx, info.strokes, W);
    ctx.drawImage(inkC, 0, 0);
    return c;
  }

  async function ensureReady(info) {
    if (info.fontOk === null) info.fontOk = (await loadMushafPageFont(info.n)).ok;
  }

  async function savePicture() {
    const info = st.current || st.pages[0];
    if (!info || !info.lines) return;
    await ensureReady(info);
    const c = document.createElement("canvas");
    c.width = info.canvas.width; c.height = info.canvas.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(info.canvas, 0, 0);
    ctx.drawImage(info.ink, 0, 0);
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (!blob) return;
    const name = `mushaf-page-${info.n}-writing.png`;
    const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: name });
        st.dirty.delete(info.n);
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return; // the reader cancelled the share sheet
      console.warn("Share failed, downloading instead:", err);
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    st.dirty.delete(info.n);
  }

  // ---- printing
  function clearPrint() { printEl.innerHTML = ""; }
  async function printA4() {
    clearPrint();
    for (const info of st.pages) {
      await ensureReady(info);
      if (st.destroyed) return;
      const holder = document.createElement("div");
      holder.className = "ws-print-page";
      if (info.lines) {
        const img = document.createElement("img");
        img.alt = `${t("Page")} ${info.n}`;
        img.src = compose(info, PRINT_WIDTH_PX, shade).toDataURL("image/png");
        holder.appendChild(img);
      }
      printEl.appendChild(holder);
      await new Promise((r) => setTimeout(r, 0));
    }
    window.addEventListener("afterprint", clearPrint, { once: true });
    window.print();
  }

  // ---- choosing what to practise (W1). The sheet only asks; the caller changes the Study Unit and re-opens it.
  const TYPES = [["ayah", "Ayah"], ["range", "Range"], ["surah", "Surah"], ["page", "Page"]];
  const closeMenu = () => { menuEl.hidden = true; $('[data-ws="more"]').setAttribute("aria-expanded", "false"); };
  const closePanel = () => { panelEl.hidden = true; unitConfirmEl.hidden = true; $('[data-ws="unit"]').setAttribute("aria-expanded", "false"); };
  const seq = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const opts = (list, sel) => list.map((o) => `<option value="${o.v}"${String(o.v) === String(sel) ? " selected" : ""}>${o.text}</option>`).join("");
  function openPanel() {
    const ini = initial || {};
    const type = TYPES.some((x) => x[0] === ini.type) ? ini.type : "surah";
    const surah = surahs.some((s) => s.n === ini.surah) ? ini.surah : (surahs[0]?.n || 1);
    panelEl.innerHTML = `
      <label>${t("Type")}<select data-ws-u="type">${opts(TYPES.map(([v, k]) => ({ v, text: t(k) })), type)}</select></label>
      <label data-ws-u-for="surah,ayah,range">${t("Surah")}<select data-ws-u="surah">${opts(surahs.map((s) => ({ v: s.n, text: `${num(s.n)}. ${s.name}` })), surah)}</select></label>
      <label data-ws-u-for="ayah">${t("Ayah")}<select data-ws-u="ayah"></select></label>
      <label data-ws-u-for="range">${t("From")}<select data-ws-u="from"></select></label>
      <label data-ws-u-for="range">${t("To")}<select data-ws-u="to"></select></label>
      <label data-ws-u-for="page">${t("Page")}<select data-ws-u="page">${opts(seq(604).map((n) => ({ v: n, text: num(n) })), ini.page || pages[0] || 1)}</select></label>
      <button type="button" data-ws="unit-show">${t("Show")}</button>
      <button type="button" data-ws="unit-cancel">${t("Cancel")}</button>`;
    const f = (k) => panelEl.querySelector(`[data-ws-u="${k}"]`);
    const fillAyahs = (keep) => {
      const count = surahs.find((s) => s.n === Number(f("surah").value))?.ayahCount || 1;
      const list = seq(count).map((n) => ({ v: n, text: num(n) }));
      const pick = (v, d) => (Number(v) >= 1 && Number(v) <= count ? Number(v) : d);
      f("ayah").innerHTML = opts(list, pick(keep ? ini.from : 1, 1));
      f("from").innerHTML = opts(list, pick(keep ? ini.from : 1, 1));
      f("to").innerHTML = opts(list, pick(keep ? ini.to : count, count));
    };
    const showFor = () => {
      const ty = f("type").value;
      panelEl.querySelectorAll("[data-ws-u-for]").forEach((l) => { l.hidden = !l.dataset.wsUFor.split(",").includes(ty); });
    };
    fillAyahs(true);
    showFor();
    f("type").addEventListener("change", showFor);
    f("surah").addEventListener("change", () => fillAyahs(false));
    panelEl.hidden = false;
    $('[data-ws="unit"]').setAttribute("aria-expanded", "true");
  }
  function readChoice() {
    const f = (k) => panelEl.querySelector(`[data-ws-u="${k}"]`);
    const type = f("type").value;
    const surah = Number(f("surah").value);
    let from = Number(f("from").value), to = Number(f("to").value);
    if (from > to) [from, to] = [to, from];
    if (type === "ayah") from = to = Number(f("ayah").value);
    if (type === "surah") { from = 1; to = surahs.find((s) => s.n === surah)?.ayahCount || 1; }
    return { type, surah, from, to, page: Number(f("page").value) };
  }
  async function applyChoice() {
    const choice = readChoice();
    st.dirty.clear();
    closePanel();
    try { await onChooseUnit(choice); } catch (err) { console.warn("Writing sheet: choosing a unit failed:", err); }
  }

  // ---- toolbar
  function wireToolbar() {
    $("[data-ws-shade-select]").addEventListener("change", (e) => {
      shade = e.target.value;
      saveShade(shade);
      paintToolbar();
      st.pages.forEach((p) => { if (p.drawn) paintPage(p); });
    });
    root.addEventListener("click", (e) => {
      if (!menuEl.hidden && !e.target.closest("[data-ws-menu],[data-ws=more]")) closeMenu();
      const b = e.target.closest("button");
      if (!b || !root.contains(b)) return;
      if (b.dataset.wsTool) { st.tool = b.dataset.wsTool; paintToolbar(); return; }
      switch (b.dataset.ws) {
        case "popout": st.pick = !st.pick; paintToolbar(); break;
        case "write": st.write = !st.write; paintToolbar(); break;
        case "tools": toolsHidden = !toolsHidden; saveToolsHidden(toolsHidden); paintToolbar(); break;
        case "undo": {
          const p = st.current;
          if (p && p.strokes.length) { p.strokes.pop(); paintInk(p); if (!p.strokes.length) st.dirty.delete(p.n); }
          break;
        }
        case "clear": {
          const p = st.current;
          if (p) { p.strokes.length = 0; paintInk(p); st.dirty.delete(p.n); }
          break;
        }
        case "save": closeMenu(); savePicture(); break;
        case "print": closeMenu(); printA4(); break;
        case "more": { const open = menuEl.hidden; menuEl.hidden = !open; b.setAttribute("aria-expanded", String(open)); break; }
        case "unit": if (panelEl.hidden) { closeMenu(); confirmEl.hidden = true; openPanel(); } else closePanel(); break;
        case "unit-cancel": closePanel(); break;
        case "unit-show": if (st.dirty.size) { confirmEl.hidden = true; unitConfirmEl.hidden = false; } else applyChoice(); break;
        case "unit-change": applyChoice(); break;
        case "unit-keep": unitConfirmEl.hidden = true; break;
        case "close": requestClose(); break;
        case "close-anyway": destroy(); onClose?.(); break;
        case "keep": confirmEl.hidden = true; break;
        default: break;
      }
    });
    paintToolbar();
  }
  wireToolbar();
  return openSheet;
}

export function closeWritingSheet() { if (openSheet) openSheet.destroy(); }
