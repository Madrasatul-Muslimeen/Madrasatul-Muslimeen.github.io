// Owner decision 85 (7 Oct 2026) -- the Asmaul Husna poster, a TRUE COPY of the Owner's own template
// (docs/reference/2026-10-07-asma-poster-template-al-witr.png): "You must keep the same font and design. You must
// Reproduce the true copy of this. Then, Enable the references to open the particular Ayah or Hadith inside the app."
//
// How it stays a true copy: the frame is the template image itself (app/img/asma-poster-frame.webp), with only the
// six places that change per Name painted over in the template's own cream (tools/asma-poster/README.md). The Name,
// its meaning, its Arabic, its description and the two references are then set over it, at the template's measured
// positions, in the template's faces: Tinos (the template's Times-style serif) and Noto Naskh Arabic Bold. Every size
// is in container-width units (cqw), so the poster is the same picture at every width: 100cqw = the template's 1055px.
//
// The references: a Qur'an citation opens that Ayah (the caller's onQuran), a Hadith citation opens that narration in
// the Hadith library (POSTER_HADITH below: each found by its own words, because the library's editions do not all
// use the usual numbers -- the usual number is what the poster shows). A citation the library does not hold says so.
//
// I2: a renderer. It reads the Name it is handed, its own data file and the reference parser; it fetches nothing.

import { POSTER_ARABIC, POSTER_DESCRIPTIONS, POSTER_MEANINGS, POSTER_SURAH_NAMES } from "./asma-poster-data.js";
import { parseAsmaRef } from "./asma-ref-parser.js";

export const POSTER_FRAME_URL = new URL("../img/asma-poster-frame.webp", import.meta.url).href;
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Tinos&family=Noto+Naskh+Arabic:wght@700&display=swap";

/** The reference parser's collection names (as the Name data writes them) -> the library key and the English title. */
const COLLECTIONS = {
  "সহীহ বুখারী": { key: "bukhari", title: "Sahih al-Bukhari" },
  "সহীহ মুসলিম": { key: "muslim", title: "Sahih Muslim" },
  "তিরমিযী": { key: "tirmidhi", title: "Jami' at-Tirmidhi" },
  "সুনানে নাসাঈ": { key: "nasai", title: "Sunan an-Nasa'i" },
  "আবু দাউদ": { key: "abudawud", title: "Sunan Abi Dawud" },
  "ইবনে মাজাহ": { key: "ibnmajah", title: "Sunan Ibn Majah" },
  "সহীহুল জামি'": { key: "sahihjami", title: "Sahih al-Jami'" },
};

/**
 * Where each Hadith the posters cite sits in the app's Hadith library (OpenITI, tools/hadith-data-pull/output/
 * openiti-release), as `openiti` = { versionUri, n } (n = the passage's permanent position). Found by searching the
 * library for the narration's own words (`words`, diacritics ignored) and checked by reading the passage: the
 * Bukhari edition numbers differently (its own number is `edition`), Muslim's edition has paragraphs, not numbers.
 * Architect, 7 Oct 2026. A key with no entry (Sahih al-Jami', not in the library) shows its reference, unlinked.
 */
export const POSTER_HADITH = Object.freeze({
  "tirmidhi:3507": { openiti: { versionUri: "0279Tirmidhi.Sunan.JK000140-ara1", n: 3560 }, edition: 3507, words: "إن لله تعالى تسعة وتسعين اسما من أحصاها دخل الجنة هو الله الذي لا إله إلا هو" },
  "tirmidhi:1314": { openiti: { versionUri: "0279Tirmidhi.Sunan.JK000140-ara1", n: 1331 }, edition: 1314, words: "إن الله هو المسعر القابض الباسط الرزاق" },
  "nasai:5387": { openiti: { versionUri: "0303Nasai.SunanSughra.JK000130-ara1", n: 5405 }, edition: 5387, words: "إن الله هو الحكم" },
  "abudawud:4806": { openiti: { versionUri: "0275AbuDawudSijistani.Sunan.JK000142-ara1", n: 4815 }, edition: 4806, words: "السيد الله تبارك وتعالى" },
  "ibnmajah:3858": { openiti: { versionUri: "0273IbnMaja.Sunan.JK000141-ara1", n: 3858 }, edition: 3858, words: "المنان بديع السماوات والأرض" },
  "bukhari:844": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 882 }, edition: 808, words: "لا مانع لما أعطيت ولا معطي لما منعت" },
  "bukhari:3116": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 3267 }, edition: 2948, words: "والله المعطي وأنا القاسم" },
  "bukhari:6382": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 6653 }, edition: 6019, words: "وأنت علام الغيوب" },
  "bukhari:6410": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 6682 }, edition: 6047, words: "وهو وتر يحب الوتر" },
  "bukhari:6927": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 7214 }, edition: 6528, words: "إن الله رفيق يحب الرفق" },
  "muslim:91": { openiti: { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", n: 374 }, edition: null, words: "إن الله جميل يحب الجمال" },
  "muslim:487": { openiti: { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", n: 1913 }, edition: null, words: "سبوح قدوس رب الملائكة والروح" },
  "muslim:771": { openiti: { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", n: 3218 }, edition: null, words: "أنت المقدم وأنت المؤخر" },
  "muslim:1015": { openiti: { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", n: 4203 }, edition: null, words: "إن الله طيب لا يقبل إلا طيبا" },
});

/** The Hadith library's own address for one narration (hadith-collections.html reads it). */
export function posterHadithHref(link, base = "./hadith-collections.html") {
  return `${base}?openiti=${encodeURIComponent(link.openiti.versionUri)}&passage=${link.openiti.n}`;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** What a poster shows, worked out from the Name (pure). */
export function asmaPosterModel(entry) {
  const cites = parseAsmaRef(entry?.ref ?? "");
  // The template's form for the first ("Quran 112:1, Surah Al-Ikhlaas"); any more follow it on the same line as just
  // "· 55:1", each its own button, so the box keeps one readable line.
  const quran = cites.filter((c) => c.kind === "quran").map((c, i) => ({
    surah: c.surah, ayah: c.ayah,
    text: i === 0 ? `Quran ${c.surah}:${c.ayah}, Surah ${POSTER_SURAH_NAMES[c.surah - 1] ?? c.surah}` : `· ${c.surah}:${c.ayah}`,
    full: `Quran ${c.surah}:${c.ayah}, Surah ${POSTER_SURAH_NAMES[c.surah - 1] ?? c.surah}`,
  }));
  const hadith = cites.filter((c) => c.kind === "hadith").map((c) => {
    const col = COLLECTIONS[c.collection] ?? { key: null, title: c.collection };
    const key = col.key ? `${col.key}:${c.number}` : null;
    return { key, text: `${col.title} - ${c.number}`, link: key ? POSTER_HADITH[key] ?? null : null };
  });
  return {
    number: entry?.number,
    title: entry?.transliteration ?? "",
    // Decision 49, in the template's form: "Lord" is RABB on the poster.
    meaning: String(POSTER_MEANINGS[entry?.number] ?? entry?.meaning?.en ?? "").replace(/\bLord\b/g, "RABB"),
    arabic: POSTER_ARABIC[entry?.number] ?? entry?.arabic ?? "",
    description: POSTER_DESCRIPTIONS[entry?.number] ?? "",
    quran, hadith,
  };
}

const CSS = `
.ahp{container-type:inline-size;position:relative;aspect-ratio:1055/1491;background:#fdfdf6 url("${POSTER_FRAME_URL}") center/100% 100% no-repeat;color:#111;overflow:hidden;font-family:'Tinos','Times New Roman',Times,serif;text-align:center;line-height:1.15;box-sizing:border-box}
.ahp *{box-sizing:border-box}
.ahp-explore{width:100%}
.asmax-poster-panel .ahp-explore{display:block}
.ahp-standalone{width:min(94vw,calc(94vh * 1055 / 1491))}
.ahp-screensaver{width:min(90vw,420px)}
.ahp-title{position:absolute;left:40%;right:40%;top:22.95%;display:flex;justify-content:center;white-space:nowrap;font-size:4.85cqw;color:#141414}
.ahp-title span,.ahp-mean span{display:inline-block;transform-origin:center}
.ahp-mean{position:absolute;left:36%;right:36%;top:26.4%;display:flex;justify-content:center;white-space:nowrap;font-size:3.13cqw;color:#f4501a}
.ahp-ar{position:absolute;left:31.5%;right:31.5%;top:31.6%;height:13.4%;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:'Noto Naskh Arabic','Amiri',serif;font-weight:700;color:#0d3b29;font-size:14.3cqw;line-height:1;white-space:nowrap;-webkit-text-stroke:.3cqw #0d3b29;paint-order:stroke fill;text-shadow:0 .25cqw .5cqw rgba(13,59,41,.25)}
.ahp-desc{position:absolute;left:21.2%;width:57.9%;top:46.95%;height:27%;text-align:justify;text-align-last:left;hyphens:manual;word-spacing:0;font-size:3.28cqw;line-height:1.15;color:#111;overflow:hidden}
.ahp-desc.ahp-none{color:#8a8473;font-style:italic;text-align:center;text-align-last:center}
.ahp-ref{position:absolute;top:77.1%;height:4%;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 .3cqw;font-size:3cqw;line-height:1.1;color:#1a1a1a}
.ahp-ref>*{display:inline-block;transform-origin:center}
.ahp-ref-q{left:11.2%;width:35.2%}
.ahp-ref-h{left:53.5%;width:35.4%}
.ahp-ref button,.ahp-ref a{font:inherit;color:inherit;background:none;border:0;padding:.3cqw .2cqw;margin:0;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(242,84,26,.55);text-underline-offset:.35cqw;white-space:nowrap}
.ahp-ref button:focus-visible,.ahp-ref a:focus-visible{outline:2px solid #f4501a;outline-offset:1px;border-radius:3px}
.ahp-ref .ahp-unlinked{white-space:nowrap}
.ahp-ref .ahp-none{color:#8a8473;font-style:italic}
`;
let cssDone = false;
/** The poster's own stylesheet and fonts, added once to the page. */
export function ensureAsmaPosterStyles(doc = document) {
  if (cssDone || !doc?.head) return;
  cssDone = true;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = FONTS_URL;
  doc.head.appendChild(link);
  const style = doc.createElement("style");
  style.dataset.asmaPoster = "";
  style.textContent = CSS;
  doc.head.appendChild(style);
}

/**
 * The poster's HTML. `interactive` makes each reference its own button (data-poster-quran="s:a") or link to the
 * Hadith library; leave it off where the whole poster is itself one button (Explore's panel), since a button cannot
 * hold another.
 */
export function renderAsmaPoster(entry, variant = "standalone", { interactive = false } = {}) {
  ensureAsmaPosterStyles();
  const m = asmaPosterModel(entry);
  const q = m.quran.length
    ? m.quran.map((c) => (interactive
      ? `<button type="button" data-poster-quran="${c.surah}:${c.ayah}" aria-label="Open ${esc(c.full)}">${esc(c.text)}</button>`
      : `<span class="ahp-unlinked">${esc(c.text)}</span>`)).join("")
    : `<span class="ahp-none">None given</span>`;
  const h = m.hadith.length
    ? m.hadith.map((c) => (interactive && c.link
      ? `<a href="${esc(posterHadithHref(c.link))}" data-poster-hadith="${esc(c.key)}" aria-label="Open ${esc(c.text)}">${esc(c.text)}</a>`
      : `<span class="ahp-unlinked"${c.link ? "" : ` data-poster-hadith-unlinked="${esc(c.key ?? "")}" title="Not in the app's Hadith library yet"`}>${esc(c.text)}</span>`)).join("")
    : `<span class="ahp-none">None given</span>`;
  const desc = m.description
    ? `<div class="ahp-desc" data-poster-desc lang="en">${esc(m.description)}</div>`
    : `<div class="ahp-desc ahp-none" data-poster-desc lang="en">Description to come.</div>`;
  return `<div class="ahp ahp-${esc(variant)}" data-asma-poster="${esc(m.number)}" lang="en">
    <div class="ahp-title"><span data-poster-title>${esc(m.title)}</span></div>
    <div class="ahp-mean"><span data-poster-meaning>${esc(m.meaning)}</span></div>
    <div class="ahp-ar" lang="ar"><span data-poster-arabic>${esc(m.arabic)}</span></div>
    ${desc}
    <div class="ahp-ref ahp-ref-q" data-poster-ref="quran">${q}</div>
    <div class="ahp-ref ahp-ref-h" data-poster-ref="hadith">${h}</div>
  </div>`;
}

/**
 * Shrinks whatever would spill out of its place: a long Name or meaning (narrowed, like the template's own condensed
 * lettering), a wide Arabic Name, a long description (smaller type) and a long list of references. Run after the
 * poster is on screen; a poster not yet laid out is left for the next call. Safe to call again.
 */
export function fitAsmaPosters(root = document) {
  const posters = root.matches?.(".ahp") ? [root] : [...root.querySelectorAll(".ahp")];
  for (const p of posters) {
    if (!p.getBoundingClientRect().width) continue;
    // Inside the arch, measured on the template: at the Name's height the arch is 25% of the poster wide, at the
    // meaning's 31%, less the arch's own line. A longer line first gets smaller type (to three quarters), then narrower lettering.
    for (const [sel, share, base] of [[".ahp-title", 0.22, 4.85], [".ahp-mean", 0.29, 3.13]]) {
      const box = p.querySelector(sel), span = box?.firstElementChild;
      if (!span) continue;
      span.style.transform = ""; box.style.fontSize = "";
      const room = p.clientWidth * share;
      let w = span.getBoundingClientRect().width;
      if (w <= room) continue;
      const f = Math.max(0.75, room / w);
      box.style.fontSize = `${(base * f).toFixed(2)}cqw`;
      w = span.getBoundingClientRect().width;
      if (w > room) span.style.transform = `scaleX(${(room / w).toFixed(3)})`;
    }
    const ar = p.querySelector(".ahp-ar"), arText = ar?.firstElementChild;
    if (arText) {
      ar.style.fontSize = "";
      const room = ar.clientWidth * 0.96, w = arText.getBoundingClientRect().width;
      if (w > room) ar.style.fontSize = `${(14.3 * room / w).toFixed(2)}cqw`;
    }
    const d = p.querySelector(".ahp-desc");
    if (d) {
      let size = 3.28;
      d.style.fontSize = "";
      while (d.scrollHeight > d.clientHeight + 1 && size > 1.6) { size -= 0.05; d.style.fontSize = `${size.toFixed(2)}cqw`; }
    }
    // The template sets its references in narrow lettering (its "Quran [Surah:Ayah], Surah [Name]" is 0.78 of
    // Tinos's natural width at the same height): each one is narrowed the same way, more if the box needs it, and
    // its margins take back the width the narrowing frees, so the line stays centred and wraps on what it shows.
    for (const r of p.querySelectorAll(".ahp-ref")) {
      const items = [...r.children];
      items.forEach((it) => { it.style.transform = ""; it.style.marginInline = ""; });
      r.style.fontSize = "";
      let size = 3, k = 0.78;
      const squeeze = () => items.forEach((it) => {
        it.style.transform = `scaleX(${k})`;
        const w = it.getBoundingClientRect().width / k;
        it.style.marginInline = `${(-w * (1 - k) / 2).toFixed(1)}px`;
      });
      squeeze();
      const lines = () => new Set(items.map((it) => Math.round(it.offsetTop))).size;
      while ((r.scrollHeight > r.clientHeight + 1 || lines() > 1) && size > 1.6) {
        size -= 0.1; r.style.fontSize = `${size.toFixed(2)}cqw`;
        items.forEach((it) => { it.style.transform = ""; it.style.marginInline = ""; });
        squeeze();
      }
    }
  }
}

/** Wires a poster's reference buttons: `onQuran(surah, ayah)` for an Ayah; a Hadith link is an ordinary link. */
export function wireAsmaPosterRefs(root, { onQuran } = {}) {
  root.querySelectorAll("[data-poster-quran]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const [s, a] = b.dataset.posterQuran.split(":").map(Number);
      onQuran?.(s, a);
    });
  });
}
