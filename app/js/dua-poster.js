// The Dua module (PCF MSA J104; docs/governance/dua-module-plan.md), build round R3:
//   D07 the Dua Card as an A4 poster to print, with Arabic, English, Bangla and word-by-word switches; the text (never
//       the frame or the banners) shrinks until the page holds everything;
//   D14 copy and share: Arabic only, chosen languages, word by word, the source; as text or as a poster picture.
// dua-study.js opens both from the Dua Card's menu and hands over a "sheet", what the open card knows:
//   { title, titleAr, ar, words: [[arabic, english, bangla], …] | null, en, bn, ref }
// English and Bangla are a dua's OWN meaning only (today the Prophets' āyahs); a Hadith dua's HadeethEnc text retells
// the whole hadith, so it is not offered as the dua's meaning. Word by word uses the Qur'an's meaning of a word, where
// the computer matched the word to a Qur'an word (the same links the Dua card's word panel uses).
import { t } from "./i18n.js";
import { getAppLang, quranFontStack } from "./prefs.js";
import { el } from "./hadith-shared-ui.js";
import { ensureAsmaPosterStyles, fitAsmaPosters, POSTER_FRAME_URL } from "./asma-poster.js";

const MAX_SCALE = 1.8;
const lang = () => (getAppLang() === "bn" ? "bn" : "en");
const hasWordMeanings = (sheet) => !!sheet.words?.some((w) => w[1] || w[2]);
/** Pure: which parts a sheet can show at all. */
export function available(sheet) {
  return { ar: !!sheet.ar, en: !!sheet.en, bn: !!sheet.bn, wbw: hasWordMeanings(sheet), src: !!sheet.ref };
}
/**
 * D26: ONE set of choices (the Owner, 4 Nov 2026: "Dua displays in the Dua poster from my selections in Dua Card").
 * Made with the chips on the Dua Card, kept for this visit, and read by the poster, by Print and by copy / share. It
 * starts with Arabic, the reader's own language and the source; `as` is only how a share leaves (text or picture).
 */
export const duaSel = { ar: true, en: lang() === "en", bn: lang() === "bn", wbw: false, vow: true, src: true, as: "text" };
const posterOpt = duaSel;
const shareOpt = duaSel;
/** Arabic as the reader chose it: with its vowel marks, or without. */
const arText = (s, opt) => (opt.vow === false ? String(s).replace(/[\u064B-\u0652\u0670]/g, "") : s);
const wordMeaning = (w, l) => (l === "bn" ? w[2] || w[1] : w[1] || w[2]) || "";

/** Pure (D14): the text to copy or share, in the order the poster shows it. */
export function shareText(sheet, opt, l = lang()) {
  const can = available(sheet);
  const out = [sheet.title || sheet.titleAr || ""];
  if (opt.ar && can.ar) out.push(arText(sheet.ar, opt));
  if (opt.wbw && can.wbw) out.push(sheet.words.map((w) => `${arText(w[0], opt)} = ${wordMeaning(w, l) || "·"}`).join("\n"));
  if (opt.en && can.en) out.push(sheet.en);
  if (opt.bn && can.bn) out.push(sheet.bn);
  if (opt.src && can.src) out.push(sheet.ref);
  return out.filter(Boolean).join("\n\n");
}

const BASE_DESC = 3.28; // cqw: the Asma poster's own body size, the scale's 1.0
const SHORT_TITLE = (s) => String(s || "").split(/[,،]/)[0].trim();
// D25: the Asma frame's own heading ("Al-Asmaul Husna · Names and Attributes of Allah") is part of the picture, so a
// Dua poster covers it with a patch of the frame's own green and says "Dua" there (measured on the 1055 x 1491 frame).
const BANNER_POLY = [[335, 96], [725, 96], [725, 176], [770, 176], [770, 257], [292, 257], [292, 176], [335, 176]];
const BANNER_GREEN = "#00361d";
const BANNER_AR = "الدُّعَاء";
const bannerWord = () => (lang() === "bn" ? "দুআ" : "Dua");
const none = () => el("span", "ahp-none", t("None given"));
/** D25: the Quran box's "s:a", when the sheet is a Qur'anic dua. */
const quranOf = (sheet) => /^(\d+):(\d+)/.exec(sheet.quran || "");

/**
 * D25: the poster page, on the Asma ul Husna poster's own frame, fonts and slots (asma-poster.js, read only): the dua's
 * short title where the Name goes, the orange line (Dua N), its first Arabic words in the cartouche, the chosen parts
 * stacked in the body, and the Quran / Hadith reference boxes. `interactive` makes the Quran reference a link.
 */
export function posterPage(sheet, opt, { interactive = true } = {}) {
  ensureAsmaPosterStyles();
  const can = available(sheet);
  const a4 = el("div", "ahp ahp-dua");
  a4.dataset.duaA4 = "";
  a4.lang = "en";
  const title = el("div", "ahp-title");
  const ts = el("span", null, SHORT_TITLE(sheet.title || sheet.titleAr));
  if (!sheet.title && sheet.titleAr) { ts.lang = "ar"; ts.dir = "rtl"; }
  title.appendChild(ts);
  const line = el("div", "ahp-mean");
  line.appendChild(el("span", null, sheet.line || ""));
  const cart = el("div", "ahp-ar");
  cart.lang = "ar";
  const cs = el("span", null, opt.ar && can.ar ? arText(sheet.ar, opt).trim().split(/\s+/).slice(0, 2).join(" ") : "");
  cart.appendChild(cs);
  const body = el("div", "ahp-desc");
  body.dataset.duaDesc = "";
  if (opt.ar && can.ar) {
    const p = el("p", "dua-a4-ar", arText(sheet.ar, opt));
    p.lang = "ar"; p.dir = "rtl"; p.dataset.duaA4Part = "ar";
    p.style.fontFamily = quranFontStack();
    body.appendChild(p);
  }
  if (opt.wbw && can.wbw) {
    const w = el("div", "dua-a4-wbw");
    w.dir = "rtl"; w.dataset.duaA4Part = "wbw";
    for (const x of sheet.words) {
      const s = el("span");
      const b = el("b", null, arText(x[0], opt)); b.lang = "ar";
      const m = el("small", null, wordMeaning(x, lang()) || "·"); m.dir = "auto";
      s.append(b, m);
      w.appendChild(s);
    }
    body.appendChild(w);
  }
  for (const k of ["en", "bn"]) {
    if (!opt[k] || !can[k]) continue;
    const x = el("p", `dua-a4-tx dua-a4-${k}`, sheet[k]);
    x.lang = k; x.dataset.duaA4Part = k;
    body.appendChild(x);
  }
  const bn = el("div", "ahp-banner");
  bn.dataset.duaBanner = "";
  bn.style.clipPath = `polygon(${BANNER_POLY.map(([x, y]) => `${(x / 10.55).toFixed(2)}% ${(y / 14.91).toFixed(2)}%`).join(",")})`;
  const bar = el("b", "ahp-banner-ar", BANNER_AR); bar.lang = "ar"; bar.dir = "rtl";
  const bwd = el("b", "ahp-banner-word", bannerWord()); bwd.lang = lang();
  bn.append(bar, bwd);
  const rq = el("div", "ahp-ref ahp-ref-q");
  const rh = el("div", "ahp-ref ahp-ref-h");
  if (opt.src) {
    const m = quranOf(sheet);
    if (m) {
      const txt = `Quran ${m[1]}:${m[2]}`;
      const r = interactive ? el("a", "dua-a4-ref", txt) : el("span", "dua-a4-ref ahp-unlinked", txt);
      if (interactive) { r.href = `./quranrevival.html?goto=${m[1]}:${m[2]}&back=1`; r.dataset.duaA4Quran = ""; r.setAttribute("aria-label", t("Open in Quran Study ↗")); }
      rq.appendChild(r);
    } else rq.appendChild(none());
    if (sheet.ref && !m) { const r = el("span", "dua-a4-ref ahp-unlinked", sheet.ref); r.dir = "auto"; rh.appendChild(r); } else rh.appendChild(none());
  }
  a4.append(bn, title, line, cart, body, rq, rh);
  return a4;
}

/**
 * D25: size the text so the page holds everything: the Asma poster's own fitting for the title, line, cartouche and
 * references, then the body from 1.8 times the Asma body size down to a quarter of it. Returns the scale used.
 */
export function fitPoster(a4) {
  fitAsmaPosters(a4);
  const d = a4.querySelector(".ahp-desc");
  if (!d) return 1;
  let size = BASE_DESC * MAX_SCALE;
  const set = () => { d.style.fontSize = `${size.toFixed(2)}cqw`; };
  set();
  while (d.scrollHeight > d.clientHeight + 1 && size > BASE_DESC * 0.25) { size -= 0.05; set(); }
  const k = size / BASE_DESC;
  a4.dataset.duaA4Scale = k.toFixed(2);
  return k;
}

function toggle(label, on, disabled, onClick, key) {
  const b = el("button", "dua-ref dua-switch", label);
  b.type = "button";
  b.dataset.duaSwitch = key;
  b.setAttribute("aria-pressed", String(on && !disabled));
  b.disabled = disabled;
  b.addEventListener("click", onClick);
  return b;
}
function gapNote(sheet) {
  const can = available(sheet);
  const bits = [];
  if (!can.en && !can.bn) bits.push(t("This dua's own meaning in English and Bangla is not in the app yet."));
  if (!can.wbw) bits.push(t("Word by word needs words matched to the Qur'an's words; this dua has none yet."));
  return bits.length ? el("p", "hadith-note dua-gap-note", bits.join(" ")) : null;
}

const SEL_KEYS = [["ar", "Arabic"], ["en", "English"], ["bn", "Bangla"], ["wbw", "Word by word"], ["vow", "Vowels"], ["src", "Source"]];
/** D26: the Dua Card's "Your selections" chips. They change `duaSel`; the poster and sharing read it when they open. */
export function selectionBar(sheetOf) {
  const wrap = el("div", "dua-sel");
  wrap.dataset.duaSel = "";
  wrap.appendChild(el("h4", "dua-sel-head", t("Your selections (they decide the poster and sharing)")));
  const row = el("div", "dua-switches");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", t("Your selections (they decide the poster and sharing)"));
  const can = available(sheetOf());
  for (const [k, label] of SEL_KEYS) {
    const off = k === "vow" ? false : !can[k];
    row.appendChild(toggle(t(label), duaSel[k], off, (ev) => {
      duaSel[k] = !duaSel[k];
      ev.currentTarget.setAttribute("aria-pressed", String(duaSel[k]));
    }, k));
  }
  wrap.appendChild(row);
  return wrap;
}
/** What the poster and sharing are showing, as words, with the way to change it (on the card). */
function showingNodes(sheet, close) {
  const can = available(sheet);
  const on = SEL_KEYS.filter(([k]) => duaSel[k] && (k === "vow" || can[k])).map(([, label]) => t(label));
  const box = el("div", "dua-showing");
  const line = el("p", "hadith-note dua-showing-line", `${t("Showing your selections:")} ${on.join(" · ") || "—"}`);
  line.dataset.duaShowing = "";
  box.appendChild(line);
  if (close) {
    const b = el("button", "dua-ref", t("Change them on the card"));
    b.type = "button"; b.dataset.duaChangeSel = "";
    b.addEventListener("click", close);
    box.appendChild(b);
  }
  return box;
}

/** D07: the poster pop-up's contents: switches, the page, Print. */
export function posterNodes(sheet, close) {
  const wrap = el("div", "dua-poster-wrap");
  const draw = () => {
    wrap.textContent = "";
    wrap.appendChild(showingNodes(sheet, close));
    const note = gapNote(sheet);
    if (note) wrap.appendChild(note);
    const a4 = posterPage(sheet, posterOpt);
    wrap.appendChild(a4);
    const fit = () => { if (a4.isConnected) fitPoster(a4); };
    requestAnimationFrame(fit);
    document.fonts?.ready.then(fit).catch(() => {});
    const acts = el("div", "dua-switches");
    const pr = el("button", "dua-ref", `🖨 ${t("Print")}`);
    pr.type = "button";
    pr.dataset.duaPrint = "";
    pr.addEventListener("click", () => printPoster(sheet));
    acts.appendChild(pr);
    acts.appendChild(el("span", "hadith-note", t("Prints on one A4 page.")));
    wrap.appendChild(acts);
  };
  draw();
  return [wrap];
}

/** Prints only the poster, on one A4 page: a copy of it is put outside the page, which print hides. */
export function printPoster(sheet) {
  document.getElementById("duaPrint")?.remove();
  const host = el("div");
  host.id = "duaPrint";
  const a4 = posterPage(sheet, posterOpt, { interactive: false });
  host.appendChild(a4);
  document.body.appendChild(host);
  document.body.classList.add("dua-printing");
  const done = () => { document.body.classList.remove("dua-printing"); host.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  const go = () => { fitPoster(a4); window.print(); };
  Promise.resolve(document.fonts?.ready).catch(() => {}).then(() => requestAnimationFrame(go));
}

// ---- D14 as a picture: the poster drawn on a canvas (A4 at 150 dpi) ----
const W = 1240, H = 1754;
function wrapLines(ctx, text, width) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}
function loadImage(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
/** D25: the poster as a picture. The Asma frame drawn at A4, then the text at the same slot fractions as the page. */
export async function drawPoster(sheet, opt) {
  const can = available(sheet);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const frame = await loadImage(POSTER_FRAME_URL);
  try { await document.fonts?.ready; } catch { /* system fonts */ }
  const u = W / 100; // one cqw
  const serif = "Tinos, 'Times New Roman', Times, serif";
  const naskh = "'Noto Naskh Arabic', 'Amiri', serif";
  ctx.fillStyle = "#fdfdf6"; ctx.fillRect(0, 0, W, H);
  if (frame) ctx.drawImage(frame, 0, 0, W, H);
  ctx.textAlign = "center";
  // The frame's own Asmaul Husna heading is covered with its green and replaced by "Dua" (as the page does).
  ctx.fillStyle = BANNER_GREEN;
  ctx.beginPath();
  BANNER_POLY.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * W / 1055, y * H / 1491));
  ctx.closePath(); ctx.fill();
  // One line centred in a room, the type shrunk to fit it.
  const one = (text, font, px, room, x, base, color, rtl, weight = "") => {
    if (!text) return;
    ctx.fillStyle = color; ctx.direction = rtl ? "rtl" : "ltr";
    let size = px;
    ctx.font = `${weight} ${size}px ${font}`;
    while (ctx.measureText(text).width > room && size > px * 0.45) { size -= 1; ctx.font = `${weight} ${size}px ${font}`; }
    ctx.fillText(text, x, base);
  };
  one(BANNER_AR, naskh, 6.6 * u, W * 0.3, W / 2, H * 0.1325, "#f6e7b6", true, "700");
  one(bannerWord(), lang() === "bn" ? "'Hind Siliguri', system-ui, sans-serif" : serif, 5.4 * u, W * 0.3, W / 2, H * 0.1625, "#f6e7b6", false, "700");
  const titleAr = !sheet.title && sheet.titleAr;
  one(SHORT_TITLE(sheet.title || sheet.titleAr), titleAr ? naskh : serif, 4.85 * u, W * 0.22, W / 2, H * 0.2295 + 4.85 * u, "#141414", !!titleAr);
  one(sheet.line || "", serif, 3.13 * u, W * 0.29, W / 2, H * 0.264 + 3.13 * u, "#f4501a", false);
  if (opt.ar && can.ar) one(arText(sheet.ar, opt).trim().split(/\s+/).slice(0, 2).join(" "), naskh, 14.3 * u, W * 0.37 * 0.96, W / 2, H * (0.316 + 0.067) + 14.3 * u * 0.32, "#0d3b29", true, "700");
  // The body: the chosen parts, stacked, in the Asma body slot.
  const blocks = [];
  if (opt.ar && can.ar) blocks.push({ text: arText(sheet.ar, opt), font: quranFontStack(), m: 1.5, color: "#0d3b29", rtl: true, lh: 1.9 });
  if (opt.wbw && can.wbw) blocks.push({ text: sheet.words.map((w) => `${arText(w[0], opt)} = ${wordMeaning(w, lang()) || "·"}`).join("   ·   "), font: serif, m: 0.6, color: "#3b3426", rtl: false, lh: 1.5 });
  for (const k of ["en", "bn"]) if (opt[k] && can[k]) blocks.push({ text: sheet[k], font: k === "bn" ? "'Hind Siliguri', system-ui, sans-serif" : serif, m: 1, color: "#111", rtl: false, lh: 1.4 });
  const bx = W * 0.212, bw = W * 0.579, top = H * 0.4695, room = H * 0.27;
  let k = MAX_SCALE, laid, end;
  for (;;) {
    let y = top;
    laid = blocks.map((b) => {
      const px = BASE_DESC * u * k * b.m;
      ctx.font = `${Math.round(px)}px ${b.font}`;
      ctx.direction = b.rtl ? "rtl" : "ltr";
      const lines = wrapLines(ctx, b.text, bw);
      const lh = px * b.lh;
      const at = y; y += lines.length * lh + px * 0.5;
      return { ...b, lines, lh, at, px: Math.round(px) };
    });
    end = y;
    if (y <= top + room || k <= 0.25) break;
    k -= 0.05;
  }
  const shift = Math.max(0, (top + room - end) / 2);
  for (const b of laid) {
    ctx.font = `${b.px}px ${b.font}`; ctx.fillStyle = b.color; ctx.direction = b.rtl ? "rtl" : "ltr";
    b.lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, b.at + shift + (i + 0.8) * b.lh));
  }
  if (opt.src) {
    const m = quranOf(sheet);
    const yy = H * 0.791 + 1.2 * u;
    one(m ? `Quran ${m[1]}:${m[2]}` : "None given", serif, 2.4 * u, W * 0.33, W * (0.112 + 0.176), yy, m ? "#1a1a1a" : "#8a8473", false);
    one(sheet.ref && !m ? sheet.ref : "None given", serif, 2.4 * u, W * 0.33, W * (0.535 + 0.177), yy, sheet.ref && !m ? "#1a1a1a" : "#8a8473", false);
  }
  c.dataset.duaScale = k.toFixed(2);
  return c;
}

/** D14: the copy / share pop-up's contents. */
export function shareNodes(sheet, close) {
  const wrap = el("div", "dua-share");
  const draw = () => {
    wrap.textContent = "";
    wrap.appendChild(el("h4", null, t("What to include")));
    wrap.appendChild(showingNodes(sheet, close));
    const note = gapNote(sheet);
    if (note) wrap.appendChild(note);
    wrap.appendChild(el("h4", null, t("Share it as")));
    const as = el("div", "dua-switches");
    for (const [k, label] of [["text", t("Text")], ["img", t("A poster picture")]]) {
      const b = el("button", "dua-ref dua-switch", label);
      b.type = "button"; b.dataset.duaShareAs = k;
      b.setAttribute("aria-pressed", String(shareOpt.as === k));
      b.addEventListener("click", () => { shareOpt.as = k; draw(); });
      as.appendChild(b);
    }
    wrap.appendChild(as);
    const status = el("p", "hadith-note dua-share-status");
    status.setAttribute("role", "status");
    const acts = el("div", "dua-switches");
    if (shareOpt.as === "text") {
      const text = shareText(sheet, shareOpt);
      const pv = el("div", "dua-share-preview", text);
      pv.dir = "auto"; pv.dataset.duaSharePreview = "";
      wrap.appendChild(pv);
      const cp = el("button", "dua-ref", t("Copy"));
      cp.type = "button"; cp.dataset.duaCopy = "";
      cp.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(text); status.textContent = t("Copied!"); }
        catch {
          const r = document.createRange(); r.selectNodeContents(pv);
          getSelection().removeAllRanges(); getSelection().addRange(r);
          status.textContent = t("The text is selected: copy it with your device's Copy.");
        }
      });
      acts.appendChild(cp);
      if (navigator.share) {
        const sh = el("button", "dua-ref", `${t("Share")} ↗`);
        sh.type = "button"; sh.dataset.duaShare = "";
        sh.addEventListener("click", () => navigator.share({ title: sheet.title || "Dua", text }).catch(() => {}));
        acts.appendChild(sh);
      }
    } else {
      const pv = el("div", "dua-share-picture");
      pv.dataset.duaSharePicture = "";
      pv.appendChild(el("p", "hadith-note", t("Loading…")));
      wrap.appendChild(pv);
      const save = el("a", "dua-ref", t("Save picture"));
      save.dataset.duaSavePicture = "";
      save.download = `dua-${(sheet.title || "poster").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}.png`;
      save.setAttribute("aria-disabled", "true");
      acts.appendChild(save);
      drawPoster(sheet, shareOpt).then((canvas) => {
        pv.textContent = "";
        const img = el("img", "dua-share-img");
        img.alt = t("Poster");
        img.src = canvas.toDataURL("image/png");
        img.dataset.duaScale = canvas.dataset.duaScale;
        pv.appendChild(img);
        save.href = img.src;
        save.removeAttribute("aria-disabled");
        canvas.toBlob((blob) => {
          if (!blob || !navigator.canShare) return;
          const file = new File([blob], save.download, { type: "image/png" });
          if (!navigator.canShare({ files: [file] })) return;
          const sh = el("button", "dua-ref", `${t("Share")} ↗`);
          sh.type = "button"; sh.dataset.duaShare = "";
          sh.addEventListener("click", () => navigator.share({ files: [file], title: sheet.title || "Dua" }).catch(() => {}));
          acts.appendChild(sh);
        }, "image/png");
      });
    }
    wrap.append(acts, status);
  };
  draw();
  return [wrap];
}
