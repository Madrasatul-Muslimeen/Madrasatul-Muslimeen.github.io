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

export const BANNER_URL = "./img/dua-banner-bottom.webp";
export const BISMILLAH = "بِسْمِ ٱللَّهِ";
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

function topArch() {
  const a = el("div", "dua-arch");
  const ph = el("div", "dua-arch-ph");
  const b = el("b", null, BISMILLAH); b.lang = "ar"; b.dir = "rtl";
  ph.append(b, el("span", null, t("Top banner · text to come")));
  a.appendChild(ph);
  return a;
}

/** D07: the A4 page itself (HTML), drawn from the sheet and the switches. */
export function posterPage(sheet, opt) {
  const can = available(sheet);
  const a4 = el("div", "dua-a4");
  a4.dataset.duaA4 = "";
  a4.appendChild(topArch());
  const head = el("div", "dua-a4-head");
  const h = el("h2", null, sheet.title || sheet.titleAr || "");
  if (!sheet.title && sheet.titleAr) { h.lang = "ar"; h.dir = "rtl"; }
  head.appendChild(h);
  a4.appendChild(head);
  if (opt.ar && can.ar) {
    const p = el("p", "dua-a4-ar", arText(sheet.ar, opt));
    p.lang = "ar"; p.dir = "rtl"; p.dataset.duaA4Part = "ar";
    p.style.fontFamily = quranFontStack();
    p.style.setProperty("--arfs", (sheet.ar.length > 260 ? 3.2 : sheet.ar.length > 140 ? 3.9 : 4.8) + "cqw");
    a4.appendChild(p);
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
    a4.appendChild(w);
  }
  const size = (s) => (s.length > 420 ? "2.2cqw" : s.length > 220 ? "2.6cqw" : "3cqw");
  for (const k of ["en", "bn"]) {
    if (!opt[k] || !can[k]) continue;
    const x = el("p", `dua-a4-tx dua-a4-${k}`, sheet[k]);
    x.lang = k; x.dataset.duaA4Part = k;
    x.style.setProperty("--txfs", size(sheet[k]));
    a4.appendChild(x);
  }
  if (opt.src && sheet.ref) { const r = el("p", "dua-a4-ref", sheet.ref); r.dir = "auto"; a4.appendChild(r); }
  const img = el("img", "dua-a4-banner");
  img.src = BANNER_URL; img.alt = "";
  a4.appendChild(img);
  return a4;
}

/**
 * D07: size the text (never the frame or the banners) so the page is filled and holds everything: a short dua grows
 * up to 1.8 times, a long one shrinks down to 0.3. Returns the scale used.
 */
export function fitPoster(a4) {
  const parts = [...a4.querySelectorAll("[data-dua-a4-part]")];
  parts.forEach((p) => { p.style.fontSize = ""; });
  const base = parts.map((p) => parseFloat(getComputedStyle(p).fontSize));
  let k = MAX_SCALE;
  const size = () => parts.forEach((p, i) => { p.style.fontSize = `${base[i] * k}px`; });
  size();
  while (a4.scrollHeight > a4.clientHeight + 1 && k > 0.3) { k -= 0.05; size(); }
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
    a4.querySelector(".dua-a4-banner").addEventListener("load", fit);
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
  const a4 = posterPage(sheet, posterOpt);
  host.appendChild(a4);
  document.body.appendChild(host);
  document.body.classList.add("dua-printing");
  const done = () => { document.body.classList.remove("dua-printing"); host.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  const img = a4.querySelector("img");
  const go = () => { fitPoster(a4); window.print(); };
  if (img.complete) requestAnimationFrame(go); else { img.addEventListener("load", go, { once: true }); img.addEventListener("error", go, { once: true }); }
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
/** D14: the poster as a picture. Resolves to a canvas; the text shrinks until it fits above the banner. */
export async function drawPoster(sheet, opt) {
  const can = available(sheet);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const banner = await loadImage(BANNER_URL);
  try { await document.fonts?.ready; } catch { /* system fonts */ }
  const arFont = quranFontStack();
  const blocks = [];
  if (opt.ar && can.ar) blocks.push({ text: arText(sheet.ar, opt), font: arFont, size: 64, color: "#0f3a28", rtl: true, lh: 1.8 });
  if (opt.wbw && can.wbw) blocks.push({ text: sheet.words.map((w) => `${arText(w[0], opt)} = ${wordMeaning(w, lang()) || "·"}`).join("   ·   "), font: "system-ui, sans-serif", size: 30, color: "#3b3426", rtl: false, lh: 1.5 });
  for (const k of ["en", "bn"]) if (opt[k] && can[k]) blocks.push({ text: sheet[k], font: k === "bn" ? "'Hind Siliguri', system-ui, sans-serif" : "Georgia, 'Times New Roman', serif", size: 38, color: "#22201a", rtl: false, lh: 1.45 });
  const bannerH = banner ? Math.round((W - 120) * banner.height / banner.width) : 0;
  const top = 330, bottom = H - 60 - bannerH - 70, textW = W - 220;
  let k = MAX_SCALE, laid, end;
  for (;;) {
    let y = top;
    laid = blocks.map((b) => {
      ctx.font = `${Math.round(b.size * k)}px ${b.font}`;
      ctx.direction = b.rtl ? "rtl" : "ltr";
      const lines = wrapLines(ctx, b.text, textW);
      const lh = b.size * k * b.lh;
      const at = y; y += lines.length * lh + 30 * k;
      return { ...b, lines, lh, at, px: Math.round(b.size * k) };
    });
    end = y;
    if (y <= bottom || k <= 0.3) break;
    k -= 0.05;
  }
  // What is left over is shared above and below, so the dua sits in the middle of the page.
  const shift = Math.max(0, (bottom - end) / 2);
  laid.forEach((b) => { b.at += shift; });
  // Paper, frame and the arch (D12).
  ctx.fillStyle = "#fbf6ea"; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 36; ctx.strokeStyle = "#123f2c"; ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.lineWidth = 5; ctx.strokeStyle = "#e2662b"; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.fillStyle = "#123f2c";
  ctx.beginPath(); ctx.moveTo(220, 36); ctx.lineTo(W - 220, 36); ctx.lineTo(W - 220, 150);
  ctx.quadraticCurveTo(W / 2, 215, 220, 150); ctx.closePath(); ctx.fill();
  ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillStyle = "#f6e7b6";
  ctx.font = `52px 'Amiri', 'Traditional Arabic', serif`; ctx.fillText(BISMILLAH, W / 2, 110);
  // Title.
  ctx.direction = sheet.title ? "ltr" : "rtl"; ctx.fillStyle = "#123f2c";
  ctx.font = `bold 44px ${sheet.title ? "Georgia, 'Times New Roman', serif" : arFont}`;
  wrapLines(ctx, sheet.title || sheet.titleAr || "", textW).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 260 + i * 54));
  // The blocks.
  for (const b of laid) {
    ctx.font = `${b.px}px ${b.font}`; ctx.fillStyle = b.color; ctx.direction = b.rtl ? "rtl" : "ltr";
    b.lines.forEach((l, i) => ctx.fillText(l, W / 2, b.at + (i + 0.8) * b.lh));
  }
  if (opt.src && sheet.ref) {
    ctx.font = "28px system-ui, sans-serif"; ctx.fillStyle = "#6b5f45"; ctx.direction = "ltr";
    ctx.fillText(sheet.ref, W / 2, H - 60 - bannerH - 30);
  }
  if (banner) ctx.drawImage(banner, 60, H - 60 - bannerH, W - 120, bannerH);
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
