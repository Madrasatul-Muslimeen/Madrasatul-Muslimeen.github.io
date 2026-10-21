// PCF MSA J52, the Owner's 5B: "also a picture file to share from a phone". Draws the SAME poster model as
// ayah-poster.js's HTML onto a canvas, in the same proportions (every size is a share of the sheet's width, the
// HTML's `cqw`), so the picture and the printed sheet look alike. The browser shapes the Arabic and the Bangla
// itself (canvas text runs through the same shaper as the page), and the page has already loaded the fonts.
import { arabicNumber, dawahArabic, dawahTranslation, rangeRef, studyLines, PAPERS } from "./ayah-poster.js";

export const FONTS = Object.freeze({
  ar: "'QR Scheherazade', 'QR Noto Naskh', 'Noto Naskh Arabic', serif",
  en: "Georgia, 'Times New Roman', serif",
  bn: "'Noto Sans Bengali', 'Hind Siliguri', Vrinda, 'Shonar Bangla', sans-serif",
  ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
});
/** Pixels across the picture: an A4 sheet at 150 dots per inch (A3 keeps the same dots per mm). */
export const PICTURE_DPI = 150;
export function pictureSize(paper = "a4") {
  const p = PAPERS[paper] ?? PAPERS.a4;
  return { w: Math.round((p.w / 25.4) * PICTURE_DPI), h: Math.round((p.h / 25.4) * PICTURE_DPI) };
}

export const STUDY_COLOURS = Object.freeze({ paper: "#fffdf7", ink: "#1d2433", name: "#0f5132", ref: "#7a6a45", tr: "#5d5442", line: "#d9cfb8", num: "#a07a24", numLine: "#d9b765", boxes: ["#e8f4ec", "#fff1d6", "#e7eefb", "#fbe8ee"] });
export const DAWAH_COLOURS = Object.freeze({ bgTop: "#1f3160", bg: "#14213d", ink: "#f3ead6", ar: "#fff8e7", gold: "#d8b25a", frame: "rgba(216,178,90,0.55)", from: "#b9b3a2" });

const font = (ctx, px, family, { bold = false, italic = false } = {}) => { ctx.font = `${italic ? "italic " : ""}${bold ? "700 " : ""}${px}px ${family}`; };
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

/** Greedy word wrap of `text` to `max` pixels in the current font. A word longer than the line stands alone. */
export function wrapLines(ctx, text, max) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean), out = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > max) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** One study-poster word box: its lines, measured at scale k. */
function studyBox(ctx, w, show, u, k) {
  const maxInner = 34 * u * k, lines = [];
  font(ctx, 6.2 * u * k, FONTS.ar); lines.push({ t: w.ar, px: 6.2 * u * k, lh: 1.5, fam: FONTS.ar, rtl: true });
  if (show.tr && w.tr) lines.push(...wrapAt(ctx, w.tr, 2.1 * u * k, 1.3, FONTS.en, { italic: true }, maxInner, "tr"));
  if (show.trBn && w.trBn) lines.push(...wrapAt(ctx, w.trBn, 2.3 * u * k, 1.35, FONTS.bn, {}, maxInner, "tr"));
  if (show.en && w.en) lines.push(...wrapAt(ctx, w.en, 2.4 * u * k, 1.3, FONTS.en, { bold: true }, maxInner, "en"));
  if (show.bn && w.bn) lines.push(...wrapAt(ctx, w.bn, 2.5 * u * k, 1.35, FONTS.bn, {}, maxInner, "bn"));
  let inner = 0;
  for (const l of lines) { font(ctx, l.px, l.fam, l.style); inner = Math.max(inner, ctx.measureText(l.t).width); }
  const padX = 1.6 * u * k, padY = 1.2 * u * k;
  return { lines, w: Math.max(14 * u * k, inner + 2 * padX), h: lines.reduce((s, l) => s + l.px * l.lh, 0) + 2 * padY, padY };
}
function wrapAt(ctx, text, px, lh, fam, style, max, role) {
  font(ctx, px, fam, style);
  return wrapLines(ctx, text, max).map((t) => ({ t, px, lh, fam, style, role }));
}

/** Lays out (and, with draw, paints) the study poster at scale k. Returns how far down the content reaches. */
function paintStudy(ctx, W, H, model, opts, k, draw) {
  const u = W / 100, C = STUDY_COLOURS, show = studyLines(opts.lang, opts.translit), text = opts.text ?? {};
  const padX = 5.5 * u, top = 6 * u, footTop = H - 6 * u - (1.4 * u + 1.9 * u * 1.5);
  if (draw) { ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); }
  ctx.textBaseline = "middle"; ctx.textAlign = "center";
  let y = top;
  const centred = (t, px, fam, lh, colour, style = {}, dir = "ltr") => {
    font(ctx, px, fam, style); ctx.direction = dir;
    if (draw) { ctx.fillStyle = colour; ctx.fillText(t, W / 2, y + (px * lh) / 2); }
    y += px * lh;
  };
  centred(model.nameAr, 7 * u * k, FONTS.ar, 1.4, C.name, {}, "rtl"); y += 0.6 * u * k;
  centred(text.title ?? model.nameEn, 3 * u * k, FONTS.en, 1.3, C.ink, { bold: true }); y += 0.6 * u * k;
  centred(text.ref ?? rangeRef(model), 2.2 * u * k, FONTS.ui, 1.3, C.ref); y += 3 * u * k;
  const gap = 1.6 * u * k;
  for (const a of model.ayahs) {
    const items = a.words.map((w) => ({ ...studyBox(ctx, w, show, u, k), kind: "word" }));
    items.push({ kind: "num", w: 7 * u * k, h: 7 * u * k, n: a.n });
    // Rows, right to left: a box that does not fit starts the next row.
    const rows = [[]]; let x = W - padX;
    for (const it of items) {
      if (rows.at(-1).length && x - it.w < padX) { rows.push([]); x = W - padX; }
      rows.at(-1).push({ ...it, x: x - it.w }); x -= it.w + gap;
    }
    rows.forEach((row, ri) => {
      const rh = Math.max(...row.map((it) => it.h));
      if (draw) row.forEach((it, i) => {
        if (it.kind === "num") {
          ctx.strokeStyle = C.numLine; ctx.lineWidth = 0.35 * u * k;
          ctx.beginPath(); ctx.arc(it.x + it.w / 2, y + rh / 2, it.w / 2 - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
          font(ctx, 4 * u * k, FONTS.ar); ctx.direction = "rtl"; ctx.fillStyle = C.num; ctx.fillText(arabicNumber(it.n), it.x + it.w / 2, y + rh / 2);
          return;
        }
        const idx = rows.slice(0, ri).reduce((s, r) => s + r.filter((q) => q.kind === "word").length, 0) + i;
        roundRect(ctx, it.x, y, it.w, rh, 2 * u * k); ctx.fillStyle = C.boxes[idx % 4]; ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.35 * u * k; ctx.stroke();
        let ly = y + (rh - (it.h - 2 * it.padY)) / 2;
        for (const l of it.lines) {
          font(ctx, l.px, l.fam, l.style); ctx.direction = l.rtl ? "rtl" : "ltr";
          ctx.fillStyle = l.role === "tr" ? C.tr : C.ink;
          ctx.fillText(l.t, it.x + it.w / 2, ly + (l.px * l.lh) / 2); ly += l.px * l.lh;
        }
      });
      y += rh + (ri < rows.length - 1 ? gap : 0);
    });
    y += 2.6 * u * k;
  }
  if (draw) {
    ctx.strokeStyle = C.line; ctx.lineWidth = 0.3 * u; ctx.setLineDash([1.2 * u, 0.8 * u]);
    ctx.beginPath(); ctx.moveTo(padX, footTop); ctx.lineTo(W - padX, footTop); ctx.stroke(); ctx.setLineDash([]);
    font(ctx, 1.9 * u, FONTS.ui); ctx.fillStyle = C.ref; ctx.direction = "ltr"; ctx.textBaseline = "middle";
    const fy = footTop + 1.4 * u + (1.9 * u * 1.5) / 2;
    ctx.textAlign = "left"; ctx.fillText(text.from ?? "", padX, fy);
    ctx.textAlign = "right"; ctx.fillText(text.tip ?? "", W - padX, fy);
  }
  return { bottom: y, limit: footTop - 2 * u * k };
}

/** Lays out (and, with draw, paints) the Dawah poster at scale k, its blocks centred top to bottom. */
function paintDawah(ctx, W, H, model, opts, k, draw) {
  const u = W / 100, C = DAWAH_COLOURS, text = opts.text ?? {}, maxW = W - 16 * u;
  const blocks = [];
  const para = (t, px, fam, lh, colour, style = {}, dir = "ltr") => {
    font(ctx, px, fam, style); ctx.direction = dir;
    blocks.push({ lines: wrapLines(ctx, t, maxW), px, fam, lh, colour, style, dir });
  };
  para(text.ref ?? rangeRef(model), 2.4 * u * k, FONTS.ui, 1.4, C.gold, { bold: true });
  para(dawahArabic(model), 6.6 * u * k, FONTS.ar, 1.85, C.ar, {}, "rtl");
  blocks.push({ rule: true, h: 0.4 * u });
  if (opts.lang !== "bn") para(dawahTranslation(model, "en"), 3.5 * u * k, FONTS.en, 1.55, C.ink, { italic: true });
  if (opts.lang !== "en") para(dawahTranslation(model, "bn"), 3.5 * u * k, FONTS.bn, 1.6, C.ink);
  para(text.from ?? "", 1.9 * u * k, FONTS.ui, 1.4, C.from);
  const gap = 4 * u * k;
  const heights = blocks.map((b) => (b.rule ? b.h : b.lines.length * b.px * b.lh));
  const total = heights.reduce((s, h) => s + h, 0) + gap * (blocks.length - 1);
  if (draw) {
    const g = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 1.2 * W);
    g.addColorStop(0, C.bgTop); g.addColorStop(0.6, C.bg); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.frame; ctx.lineWidth = 0.4 * u; roundRect(ctx, 3 * u, 3 * u, W - 6 * u, H - 6 * u, 1.5 * u); ctx.stroke();
    let y = (H - total) / 2;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    blocks.forEach((b, i) => {
      if (b.rule) { ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - 11 * u, y, 22 * u, b.h); }
      else for (const l of b.lines) {
        font(ctx, b.px, b.fam, b.style); ctx.direction = b.dir; ctx.fillStyle = b.colour;
        ctx.fillText(l, W / 2, y + (b.px * b.lh) / 2); y += b.px * b.lh;
      }
      if (b.rule) y += b.h;
      if (i < blocks.length - 1) y += gap;
    });
  }
  return { bottom: total, limit: H - 18 * u };
}

/** The largest scale (0.3–1) at which the content fits the sheet; `fits` is false when even 0.3 overflows. */
export function fitScale(measure) {
  if (measure(1).bottom <= measure(1).limit) return { k: 1, fits: true };
  let lo = 0.3, hi = 1;
  if (measure(lo).bottom > measure(lo).limit) return { k: lo, fits: false };
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; const m = measure(mid); if (m.bottom <= m.limit) lo = mid; else hi = mid; }
  return { k: lo, fits: true };
}

/** Paints the poster onto `canvas` (sized to the paper) and returns { k, fits }. */
export function paintPoster(canvas, model, { kind = "study", lang = "both", translit = true, paper = "a4", text = {} } = {}) {
  const { w, h } = pictureSize(paper);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const paint = kind === "dawah" ? paintDawah : paintStudy;
  const opts = { lang, translit, text };
  const fit = fitScale((k) => paint(ctx, w, h, model, opts, k, false));
  ctx.clearRect(0, 0, w, h);
  paint(ctx, w, h, model, opts, fit.k, true);
  return fit;
}

/** A PNG Blob of the poster. */
export function posterBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("the picture could not be made"))), "image/png"));
}
