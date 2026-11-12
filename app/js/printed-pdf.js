// Printed Mushaf pages as a PDF file (the Owner, 11 Nov 2026, "1A": "Download a PDF file: this juz' / the whole Mushaf").
// Stage 4 of docs/reports/2026-11-11-printed-mushaf-plan.md. Built IN THE BROWSER from the page pictures, on the reader's
// request, and handed over as an ordinary download: no server, no library, nothing at run time from a CDN, and nothing is
// kept in the app by this (that is "Keep in the app", printed-offline.js).
//
// How it is small: every page picture is a PNG, and a PDF image can carry PNG's own compressed data as it is. So the
// writer never decodes a picture: it reads the PNG's header, palette and IDAT chunks, and writes the IDAT bytes straight
// into a PDF image XObject (FlateDecode with the PNG predictor, which is how PNG row filters are stored). Lossless, fast,
// the same size as the pictures. The 604 pictures are all 622 x 917, 4-bit, 8-colour palette, not interlaced.
//
// What it supports, and refuses by name: palette PNGs of 1, 2, 4 or 8 bits, and 8-bit grey or RGB, not interlaced, no alpha
// channel. A palette picture may carry a tRNS (transparent) entry, but a PDF page is white paper, so such an entry is only
// harmless when its colour IS white (the set's one transparent entry is white): if it is not, the writer refuses rather
// than draw a page that looks different from the picture.
import { printedPageUrl } from "./mushaf-printed.js";
import { t, num } from "./i18n.js";

export const PDF_CREDIT = "Madinah Mushaf, King Fahd Complex for the Printing of the Holy Qur'an. Page pictures: King Saud University e-Mushaf.";
const SCALE = 0.75;      // 96 dpi: a 622 px wide picture is 466.5 pt (6.5 in) wide
const FOOT = 15;         // points under the picture for "Page N" and the credit line (15 keeps the page a whole 937 px at 96 dpi, so a reader draws the picture pixel for pixel)
const CONCURRENCY = 4;
const enc = new TextEncoder();

const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Read what a PDF image needs from a PNG: size, depth, colour type, palette (RGB triples) and the joined IDAT bytes. */
export function parsePng(bytes) {
  if (!bytes || bytes.length < 33 || SIGNATURE.some((v, i) => bytes[i] !== v)) throw new Error("not a PNG picture");
  let i = 8, ihdr = null, plte = null, trns = null;
  const idat = [];
  while (i + 8 <= bytes.length) {
    const len = u32(bytes, i), type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    const body = bytes.subarray(i + 8, i + 8 + len);
    if (type === "IHDR") ihdr = body;
    else if (type === "PLTE") plte = body;
    else if (type === "tRNS") trns = body;
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    i += 12 + len;
  }
  if (!ihdr || !idat.length) throw new Error("a PNG picture with no image data");
  const width = u32(ihdr, 0), height = u32(ihdr, 4), depth = ihdr[8], colorType = ihdr[9], interlace = ihdr[12];
  if (interlace !== 0) throw new Error("an interlaced PNG cannot be put in a PDF as it is");
  const okType = colorType === 3 ? [1, 2, 4, 8].includes(depth) : (colorType === 0 || colorType === 2) && depth === 8;
  if (!okType) throw new Error(`a PNG of colour type ${colorType} and depth ${depth} is not supported`);
  if (colorType === 3 && (!plte || plte.length < 3)) throw new Error("a palette PNG with no palette");
  if (colorType === 3 && trns) {
    for (let k = 0; k < trns.length; k++) {
      if (trns[k] === 255) continue;
      const w = plte[k * 3] === 255 && plte[k * 3 + 1] === 255 && plte[k * 3 + 2] === 255;
      if (!w) throw new Error("a palette entry is transparent and not white: a PDF page is white paper, so it would look different");
    }
  }
  const total = idat.reduce((n, c) => n + c.length, 0), joined = new Uint8Array(total);
  let at = 0;
  for (const c of idat) { joined.set(c, at); at += c.length; }
  return { width, height, depth, colorType, palette: colorType === 3 ? plte.slice(0, Math.floor(plte.length / 3) * 3) : null, idat: joined };
}

const hex = (u8) => { let s = ""; for (const b of u8) s += b.toString(16).padStart(2, "0"); return s; };
const pdfText = (s) => String(s).replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, "?");

/** The PDF, as a Blob. `pages` = [{ label, png }] in reading order (png: the picture's bytes). */
export function buildPdf({ pages, title = "Madinah Mushaf", credit = PDF_CREDIT }) {
  if (!pages.length) throw new Error("a PDF needs at least one page");
  const parts = [], offsets = [];
  let size = 0;
  const push = (p) => { parts.push(p); size += typeof p === "string" ? 0 : p.size ?? p.length; };
  const text = (s) => { const b = enc.encode(s); parts.push(b); size += b.length; };
  const begin = (n) => { offsets[n] = size; text(`${n} 0 obj\n`); };
  text("%PDF-1.4\n%âãÏÓ\n");
  const first = 5, per = 3; // objects: 1 catalog, 2 pages, 3 font, 4 info, then (page, contents, image) for each page
  begin(1); text(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  begin(2); text(`<< /Type /Pages /Kids [${pages.map((_, k) => `${first + k * per} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);
  begin(3); text(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);
  begin(4); text(`<< /Title (${pdfText(title)}) /Subject (${pdfText(credit)}) /Producer (MSA Printed Mushaf) >>\nendobj\n`);
  pages.forEach((pg, k) => {
    const png = parsePng(pg.png), pageObj = first + k * per, contentObj = pageObj + 1, imageObj = pageObj + 2;
    const w = png.width * SCALE, h = png.height * SCALE;
    begin(pageObj);
    text(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(2)} ${(h + FOOT).toFixed(2)}] /Resources << /XObject << /Im0 ${imageObj} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`);
    const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 0 ${FOOT} cm /Im0 Do Q\nBT /F1 6 Tf 0.3 g 10 5 Td (${pdfText(`${pg.label} | ${credit}`)}) Tj ET\n`;
    begin(contentObj); text(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);
    const cs = png.colorType === 3 ? `[/Indexed /DeviceRGB ${png.palette.length / 3 - 1} <${hex(png.palette)}>]` : png.colorType === 0 ? "/DeviceGray" : "/DeviceRGB";
    const colors = png.colorType === 2 ? 3 : 1;
    begin(imageObj);
    text(`<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace ${cs} /BitsPerComponent ${png.depth} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${png.depth} /Columns ${png.width} >> /Length ${png.idat.length} >>\nstream\n`);
    push(png.idat);
    text("\nendstream\nendobj\n");
  });
  const count = first + pages.length * per, xref = size;
  text(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) text(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  text(`trailer\n<< /Size ${count} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}

function failure(detail) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const e = new Error(offline ? t("Making the PDF needs the internet, unless these pages are kept in the app.") : t("Could not make the PDF: {detail}.", { detail }));
  e.reported = true;
  return e;
}

/** One page picture's bytes. A page kept in the app is answered by the worker from its cache; any other comes from the network. */
export async function pagePicture(p, { fetchFn = (...a) => fetch(...a) } = {}) {
  let res;
  try { res = await fetchFn(printedPageUrl(p), { mode: "cors", credentials: "omit" }); } catch { throw failure(t("the picture server did not answer or does not allow it")); }
  if (!res || res.type === "opaque" || !res.ok) throw failure(res && res.ok === false ? t("the picture server answered {status}", { status: num(res.status) }) : t("the picture server does not allow it"));
  return new Uint8Array(await res.arrayBuffer());
}

/** Hand a Blob to the reader as a download. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Fetch `pages` (page numbers), build the PDF and download it. onProgress(done, total) per picture. Resolves with { pages, bytes }. */
export async function downloadPrintedPdf({ pages, filename, title, onProgress = () => {}, fetchFn, saveFn = saveBlob }) {
  const pics = new Array(pages.length);
  let done = 0, next = 0, firstError = null;
  onProgress(0, pages.length);
  async function worker() {
    while (!firstError && next < pages.length) {
      const k = next++;
      try { pics[k] = await pagePicture(pages[k], { fetchFn }); done++; onProgress(done, pages.length); } catch (e) { firstError = firstError || e; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
  if (firstError) throw firstError;
  let blob;
  try { blob = buildPdf({ pages: pages.map((p, k) => ({ label: `Page ${p}`, png: pics[k] })), title }); } catch (e) { throw failure(e.message || String(e)); }
  saveFn(blob, filename);
  return { pages: pages.length, bytes: blob.size };
}
