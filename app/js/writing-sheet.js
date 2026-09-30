// Issue #421 -- the Writing sheet: the Mushaf page as an A4 tracing sheet.
// Light hollow letters, write over them with a finger or pen, save the result
// as a picture on the reader's own device, or print it on A4.
//
// I2: a renderer. Pages in, DOM out. It reads no records, writes no activity
// and NEVER stores the writing: no Firestore, no localStorage, no IndexedDB.
// The one thing it may remember is the letter style (`writingSheetShade`).
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

import { t } from "./i18n.js";
import {
  ensureMushafData, getMushafPageLines, getAyahEndMarkerPosition,
  loadMushafPageFont, loadSurahHeaderFont, surahHeaderGlyph,
} from "./hifz-renderer.js";

const SHADE_KEY = "writingSheetShade";
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
        const marker = getAyahEndMarkerPosition(key) === Number(p);
        item.words.push({ g: w.g, width, marker, dim: !inUnit(Number(s), Number(a)), offset: natural });
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
#writingSheet .ws-toolbar{position:sticky;top:0;z-index:3;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 8px;background:#1F3A6E;color:#fff;flex:0 0 auto}
#writingSheet .ws-group{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#writingSheet .ws-toolbar button{min-height:40px;min-width:40px;padding:0.3rem 0.7rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.9rem;line-height:1.1;white-space:nowrap;flex:0 0 auto;cursor:pointer}
#writingSheet .ws-toolbar button:disabled{opacity:0.4;cursor:default}
#writingSheet .ws-toolbar button[aria-pressed="true"],#writingSheet .ws-toolbar button[aria-checked="true"]{background:#B8862F;border-color:#B8862F}
#writingSheet .ws-title{font-weight:600;font-size:0.95rem;margin-right:4px}
#writingSheet .ws-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:12px 8px 40px;-webkit-overflow-scrolling:touch}
#writingSheet .ws-page{position:relative;margin:0 auto 14px;box-shadow:0 4px 16px rgba(0,0,0,0.22);background:${PAPER};max-width:820px}
#writingSheet .ws-page canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
#writingSheet .ws-ink{touch-action:pan-y pinch-zoom}
#writingSheet.ws-writing .ws-ink{touch-action:none;cursor:crosshair}
#writingSheet .ws-msg{position:absolute;inset:auto 0 50% 0;text-align:center;font-size:13px;color:#a33;padding:0 12px}
#writingSheet .ws-confirm{position:sticky;top:0;z-index:4;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:10px 12px;background:#fff3cf;color:#4a3a10;border-bottom:2px solid #B8862F}
#writingSheet .ws-confirm[hidden]{display:none}
#writingSheet .ws-confirm button{min-height:40px;padding:0.3rem 0.9rem;border-radius:8px;border:1px solid #B8862F;background:#fff;color:#4a3a10;font:inherit;cursor:pointer}
#writingSheet .ws-print{display:none}
@media print{
  @page{size:A4;margin:10mm}
  html,body{height:auto !important;overflow:visible !important;background:#fff !important}
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
 */
export async function openWritingSheet({ pages, range = null, surahArabicName = null, onClose = null } = {}) {
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
    <div class="ws-toolbar">
      <span class="ws-title">${t("Writing sheet")}</span>
      <div class="ws-group">
        <button type="button" data-ws="write" aria-pressed="false">✏ ${t("Write")}</button>
        <button type="button" data-ws-tool="pen" aria-pressed="true">${t("Pen")}</button>
        <button type="button" data-ws-tool="eraser" aria-pressed="false">${t("Eraser")}</button>
        <button type="button" data-ws="undo">${t("Undo")}</button>
        <button type="button" data-ws="clear">${t("Clear")}</button>
      </div>
      <div class="ws-group" role="radiogroup" aria-label="${t("Letter style")}">
        <button type="button" role="radio" data-ws-shade="light" aria-checked="false">${t("Light")}</button>
        <button type="button" role="radio" data-ws-shade="lighter" aria-checked="false">${t("Lighter")}</button>
        <button type="button" role="radio" data-ws-shade="book" aria-checked="false">${t("Like the book")}</button>
      </div>
      <div class="ws-group">
        <button type="button" data-ws="save">${t("Save picture")}</button>
        <button type="button" data-ws="print">${t("Print A4")}</button>
        <button type="button" data-ws="close" aria-label="${t("Close")}">✕ ${t("Close")}</button>
      </div>
    </div>
    <div class="ws-confirm" data-ws-confirm hidden>
      <span>${t("Close without saving your writing?")}</span>
      <button type="button" data-ws="close-anyway">${t("Close")}</button>
      <button type="button" data-ws="keep">${t("Keep writing")}</button>
    </div>
    <div class="ws-scroll" data-ws-scroll><p data-ws-loading style="text-align:center;color:#555">${t("Loading the writing sheet…")}</p></div>
    <div class="ws-print" data-ws-print aria-hidden="true"></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const scrollEl = $("[data-ws-scroll]");
  const printEl = $("[data-ws-print]");
  const confirmEl = $("[data-ws-confirm]");

  const st = { write: false, tool: "pen", pages: [], current: null, dirty: new Set(), drawing: null, destroyed: false };
  const measure = measurer();

  const paintToolbar = () => {
    root.classList.toggle("ws-writing", st.write);
    $('[data-ws="write"]').setAttribute("aria-pressed", String(st.write));
    root.querySelectorAll("[data-ws-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wsTool === st.tool)));
    root.querySelectorAll("[data-ws-shade]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.wsShade === shade)));
    root.dataset.shade = shade;
  };

  function destroy() {
    st.destroyed = true;
    io?.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("afterprint", clearPrint);
    document.removeEventListener("keydown", onKey);
    root.remove();
    if (openSheet && openSheet.root === root) openSheet = null;
  }
  function requestClose() {
    if (st.dirty.size) { confirmEl.hidden = false; return; }
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
  const headerNeeded = pages.some((n) => (getMushafPageLines(n) || []).some((l) => l.type === "surah_name"));
  const headerOk = headerNeeded ? await loadSurahHeaderFont() : false;

  const headerGlyph = (surah) => surahHeaderGlyph(surah);
  const headerName = (surah) => (typeof surahArabicName === "function" ? surahArabicName(Number(surah)) : null) || `سورة ${surah}`;

  pages.forEach((n) => {
    const lines = getMushafPageLines(n);
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
    w.dataset.lines = String(info.lines.length);
    w.dataset.lineTypes = info.lines.map((l) => l.type).join(",");
    w.dataset.wordsPerLine = info.lines.map((l) => (l.type === "ayah" && l.words ? l.words.length : 0)).join(",");
    w.dataset.geom = JSON.stringify({ top: layout.top / layout.W, pitch: layout.pitch / layout.W, fs: layout.fs / layout.W });
    w.dataset.painted = shade;
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

  // ---- toolbar
  function wireToolbar() {
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !root.contains(b)) return;
      if (b.dataset.wsTool) { st.tool = b.dataset.wsTool; paintToolbar(); return; }
      if (b.dataset.wsShade) {
        shade = b.dataset.wsShade;
        saveShade(shade);
        paintToolbar();
        st.pages.forEach((p) => { if (p.drawn) paintPage(p); });
        return;
      }
      switch (b.dataset.ws) {
        case "write": st.write = !st.write; paintToolbar(); break;
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
        case "save": savePicture(); break;
        case "print": printA4(); break;
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
