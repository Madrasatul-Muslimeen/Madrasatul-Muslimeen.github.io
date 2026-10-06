// W2 (6 Oct 2026) -- the Writing sheet's pop-out: one word, or the whole Ayah of
// that word, in a window over the sheet, enlargeable, with the pen, eraser, undo
// and clear working over it.
//
// I2: a renderer. The sheet hands it words, fonts and a glyph painter; it reads no
// records and NEVER stores the writing (no Firestore, localStorage or IndexedDB).
// The letters are re-drawn with fillText/strokeText at every size, never stretched
// from a bitmap, and the strokes are kept in the letters' own units (em, measured
// from the words' anchor) so a size change redraws them with the letters.

import { t } from "./i18n.js";

const MULT = [0.3, 0.45, 0.65, 0.85, 1, 1.4];     // of the base size, five or more steps
const BASE_AYAH = 64;                              // css px at 1.0
const PEN_EM = 0.07;
const ERASER_EM = 0.4;
const INK = "#1b3a8a";
const PAPER = "#fffdf8";
const GAP = 0.12;                                  // em between words, as on the page
const LINE_H = 2.0;                                // em per line

const CSS = `
.wp{position:fixed;inset:0;z-index:9600;background:rgba(20,24,40,0.55);display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:'Inter',system-ui,sans-serif}
.wp-win{display:flex;flex-direction:column;background:#fffdf8;color:#1b1b16;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.45);overflow:hidden;resize:both;width:min(96vw,760px);height:min(78vh,560px);min-width:min(300px,98vw);min-height:min(260px,96vh);max-width:98vw;max-height:98vh}
.wp-bar{flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding:6px 4px;background:#1F3A6E;color:#fff}
.wp-row{display:flex;gap:4px;align-items:center;min-width:0;flex-wrap:nowrap}
.wp-bar button{min-height:40px;min-width:40px;padding:0.3rem 0.4rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.95rem;line-height:1.1;white-space:nowrap;flex:0 0 auto;cursor:pointer}
.wp-bar button:disabled{opacity:0.4;cursor:default}
.wp-bar button[aria-pressed="true"]{background:#B8862F;border-color:#B8862F}
.wp-bar .wp-sp{flex:1 1 0;min-width:0}
.wp-bar .wp-shade{min-height:40px;min-width:56px;flex:1 1 0;max-width:150px;padding:0.3rem 0.4rem;border:1px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;font:inherit;font-size:0.85rem}
.wp-bar .wp-shade option{color:#1b1b16;background:#fff}
.wp-confirm{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:8px 10px;background:#fff3cf;color:#4a3a10;border-bottom:2px solid #B8862F}
.wp-confirm[hidden]{display:none}
.wp-confirm button{min-height:40px;padding:0.3rem 0.9rem;border-radius:8px;border:1px solid #B8862F;background:#fff;color:#4a3a10;font:inherit;cursor:pointer}
.wp-scroll{flex:1 1 auto;min-height:0;overflow:auto;position:relative;background:${PAPER};-webkit-overflow-scrolling:touch}
.wp-stage{position:relative}
.wp-stage canvas{position:absolute;left:0;top:0;display:block}
.wp-stage .wp-ink{touch-action:none;cursor:crosshair}
.wp-move .wp-ink{cursor:grab}
@media (max-width:599.98px){.wp-tx{display:none}}
`;

export function openWordPopout({ host, word, ayahWords, ensureFont, paintGlyph, shade, onShade, onClose, mode = "word" }) {
  const root = document.createElement("div");
  root.className = "wp";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", t("Pop out"));
  root.innerHTML = `<style>${CSS}</style>
    <div class="wp-win" data-wp-win>
      <div class="wp-bar">
        <div class="wp-row">
          <button type="button" data-wp-mode="word" aria-pressed="false">${t("Word")}</button>
          <button type="button" data-wp-mode="ayah" aria-pressed="false">${t("Ayah")}</button>
          <span class="wp-sp"></span>
          <button type="button" data-wp="smaller" aria-label="${t("Smaller letters")}" title="${t("Smaller letters")}">A−</button>
          <button type="button" data-wp="bigger" aria-label="${t("Bigger letters")}" title="${t("Bigger letters")}">A+</button>
          <button type="button" data-wp="win" aria-pressed="false" aria-label="${t("Bigger window")}" title="${t("Bigger window")}">⤢</button>
          <button type="button" data-wp="close" aria-label="${t("Close")}" title="${t("Close")}">✕</button>
        </div>
        <div class="wp-row">
          <button type="button" data-wp-tool="pen" aria-pressed="true" aria-label="${t("Pen")}" title="${t("Pen")}">🖊<span class="wp-tx"> ${t("Pen")}</span></button>
          <button type="button" data-wp-tool="eraser" aria-pressed="false" aria-label="${t("Eraser")}" title="${t("Eraser")}">🧽<span class="wp-tx"> ${t("Eraser")}</span></button>
          <button type="button" data-wp="undo" aria-label="${t("Undo")}" title="${t("Undo")}">↶</button>
          <button type="button" data-wp="clear" aria-label="${t("Clear")}" title="${t("Clear")}">🗑</button>
          <button type="button" data-wp="move" aria-pressed="false" aria-label="${t("Move")}" title="${t("Move")}">✋<span class="wp-tx"> ${t("Move")}</span></button>
          <select class="wp-shade" data-wp-shade aria-label="${t("Letter style")}" title="${t("Letter style")}">
            <option value="light">${t("Light")}</option>
            <option value="lighter">${t("Lighter")}</option>
            <option value="book">${t("Like the book")}</option>
          </select>
        </div>
      </div>
      <div class="wp-confirm" data-wp-confirm hidden>
        <span>${t("Close without saving your writing?")}</span>
        <button type="button" data-wp="close-anyway">${t("Close")}</button>
        <button type="button" data-wp="keep">${t("Keep writing")}</button>
      </div>
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

  const st = {
    mode: mode === "ayah" ? "ayah" : "word",
    idx: 3, tool: "pen", move: false, big: false, destroyed: false,
    strokes: { word: [], ayah: [] }, drawing: null, geom: null, shade, fit: 0,
  };
  const dirty = () => st.strokes.word.length + st.strokes.ayah.length > 0;
  const m = document.createElement("canvas").getContext("2d");

  const wordsFor = () => (st.mode === "word" ? [word] : ayahWords());

  function baseFs() {
    if (st.mode === "ayah") return BASE_AYAH;
    if (!st.fit) {
      // Fit the word to most of a phone's width once, so a window resize never changes the letter size.
      m.font = `100px '${word.family}'`;
      const em = (m.measureText(word.g).width || 100) / 100;
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
    items.forEach((it) => {
      const cur = lines[lines.length - 1];
      if (st.mode === "ayah" && cur.length && cursor + it.width > avail) { lines.push([]); cursor = 0; }
      lines[lines.length - 1].push({ ...it, offset: cursor });
      cursor += it.width + gap;
    });
    return { items, lines, maxW };
  }

  let lastBox = "";
  function render() {
    if (st.destroyed) return;
    const vw = scrollEl.clientWidth, vh = scrollEl.clientHeight;
    if (!vw || !vh) return;
    lastBox = `${vw}x${vh}`;
    const fs = fsNow();
    const pad = fs * 0.3;
    const L = layout(fs, vw - 2 * pad);
    const lh = fs * LINE_H;
    const needW = (st.mode === "word" ? L.maxW : L.maxW) + 2 * pad;
    const Wc = Math.max(vw, Math.ceil(needW));
    const Hc = Math.max(vh, Math.ceil(L.lines.length * lh + 2 * pad));
    const ax = st.mode === "word" ? Wc / 2 : Wc - pad;          // anchor of the strokes
    const ay = st.mode === "word" ? Hc / 2 : 0;
    const top = st.mode === "word" ? Hc / 2 - lh / 2 : pad;
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
    L.lines.forEach((line, li) => {
      const y = top + li * lh + lh * 0.72;
      line.forEach((w) => {
        ctx.font = `${fs}px '${w.family}'`;
        paintGlyph(ctx, w.g, rightEdge - w.offset, y, w.marker, st.shade);
      });
    });
    st.geom = { Wc, Hc, fs, ax, ay, dpr };
    // Architect review (#604): when the letters are wider than the window, show the START of the Arabic
    // (its right-hand end), not its left; a centred word that fits stays centred. Only on a new size or
    // view, so a reader's own scrolling (✋ Move) is not undone by a window resize.
    const viewKey = `${st.mode}|${fs}`;
    if (viewKey !== st.lastView) {
      st.lastView = viewKey;
      scrollEl.scrollLeft = Math.max(0, Math.ceil(rightEdge + pad - vw));
      if (st.mode === "word") scrollEl.scrollTop = Math.max(0, Math.round((Hc - vh) / 2));
    }
    stage.dataset.mode = st.mode;
    stage.dataset.fs = String(fs);
    stage.dataset.size = String(st.idx);
    stage.dataset.canvasW = String(Wc);
    stage.dataset.canvasH = String(Hc);
    stage.dataset.lines = String(L.lines.length);
    stage.dataset.glyphs = L.items.map((i) => i.g).join("|");
    stage.dataset.locs = L.items.map((i) => i.loc).join(",");
    stage.dataset.pages = L.items.map((i) => i.page).join(",");
    root.dataset.glyph = word.g;
    root.dataset.loc = word.loc;
    paintInk();
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
    st.strokes[st.mode].forEach((s) => {
      const X = (p) => g.ax + p[0] * g.fs, Y = (p) => g.ay + p[1] * g.fs;
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

  function paintBar() {
    root.querySelectorAll("[data-wp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wpMode === st.mode)));
    root.querySelectorAll("[data-wp-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wpTool === st.tool)));
    $('[data-wp="move"]').setAttribute("aria-pressed", String(st.move));
    root.classList.toggle("wp-move", st.move);
    $('[data-wp="smaller"]').disabled = st.idx <= 0;
    $('[data-wp="bigger"]').disabled = st.idx >= MULT.length - 1;
    const wb = $('[data-wp="win"]');
    wb.setAttribute("aria-pressed", String(st.big));
    const wl = st.big ? t("Smaller window") : t("Bigger window");
    wb.setAttribute("aria-label", wl);
    wb.title = wl;
    $("[data-wp-shade]").value = st.shade;
  }

  async function start() {
    const pages = new Set([word.page]);
    try { ayahWords().forEach((w) => pages.add(w.page)); } catch { /* the word alone still works */ }
    await Promise.all([...pages].map((p) => ensureFont(p)));
    if (st.destroyed) return;
    paintBar();
    render();
  }

  // ---- writing, two-finger scroll and the ✋ Move button
  const touches = new Map();
  let pan = null;
  const pos = (e) => {
    const r = ink.getBoundingClientRect();
    const g = st.geom;
    return [(e.clientX - r.left - g.ax) / g.fs, (e.clientY - r.top - g.ay) / g.fs];
  };
  const centroid = () => {
    const v = [...touches.values()];
    return [(v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2];
  };
  function cancelStroke() {
    if (!st.drawing) return;
    const list = st.strokes[st.mode];
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
    st.strokes[st.mode].push(s);
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
    if (b.dataset.wpMode) { st.mode = b.dataset.wpMode; paintBar(); render(); return; }
    if (b.dataset.wpTool) { st.tool = b.dataset.wpTool; paintBar(); return; }
    switch (b.dataset.wp) {
      case "smaller": if (st.idx > 0) { st.idx--; paintBar(); render(); } break;
      case "bigger": if (st.idx < MULT.length - 1) { st.idx++; paintBar(); render(); } break;
      case "win":
        st.big = !st.big;
        win.style.width = st.big ? "98vw" : "";
        win.style.height = st.big ? "96vh" : "";
        paintBar();
        break;
      case "undo": st.strokes[st.mode].pop(); paintInk(); break;
      case "clear": st.strokes[st.mode].length = 0; paintInk(); break;
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

  let ro = null;
  if (typeof ResizeObserver === "function") {
    let frame = 0;
    ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (`${scrollEl.clientWidth}x${scrollEl.clientHeight}` !== lastBox) render(); });
    });
    ro.observe(scrollEl);
  }
  start();
  return { root, destroy, requestClose, isDirty: dirty };
}
