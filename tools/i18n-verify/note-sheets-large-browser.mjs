// v13.10 (audit part 145, issue #1382): the v13 Note's sheets at large text, with real-length data -- the four defects
// the Architect found and fixed, and the J109 arrow. Surface: the Hadith page's 📝 -> the shared Note window (a long
// Arabic + English + Bangla hadith attached; a 6-deep path of long English / Bangla folders), at 360 390 768 820 1024
// 1180 1440, English and Bangla, text 100 / 150 / 200% (html{font-size:N%}, as parts 144-145 did).
//   D1  🗂 Folders: the folder list keeps at least two rows (or all of them) and the sheet scrolls to its last control.
//   D2  📎 Attach: the wording is a visible label inside the box; the box's own placeholder is never cut.
//   D3  🗂 Folders → Tags: the "New tag name" placeholder is never cut (the row wraps).
//   D4  🗂 Folders: a search placeholder too long for its box ends in "…" (text-overflow: ellipsis).
//   J109 the Āyah/Hadith block's show/hide text carries no ▾ / ▸ arrow.
// Expected values are written by hand. Run from the repository root with node serve.js on 8080:
//   node tools/i18n-verify/note-sheets-large-browser.mjs [--width=390] [--lang=bn] [--scale=200]
//   --mutate=listzero | attachlong | notagwrap | noellipsis | arrow   (each must FAIL its own check)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const MUTATIONS = {
  listzero: [["journey-map.html", "min-height: min(9em, 40vh); }", "min-height: 0; }"], ["journey-map.html", "  .folder-picker { overflow-y: auto; }", ""]],
  attachlong: [["js/note-opener.js", "input.placeholder = attachKind === \"ayah\" ? `${num(2)}:${num(255)}` : num(3062);", "input.placeholder = q(\"[data-no-attach-label]\").textContent; q(\"[data-no-attach-label]\").textContent = \"\";"]],
  notagwrap: [["css/note-window.css", "align-items: center; flex-wrap: wrap; }", "align-items: center; }"], ["css/note-window.css", ".tag-picker-new input { flex: 1 1 10em; width: auto; }", ""]],
  noellipsis: [["journey-map.html", "text-overflow: ellipsis; } /* v13.10 (audit 145 D4)", "} /* v13.10 (audit 145 D4)"]],
  arrow: [["js/note-ref-ui.js", "${esc(t(s.flags.on ? \"hide\" : \"show\"))}", "${esc(s.flags.on ? \"▾ \" + t(\"hide\") : \"▸ \" + t(\"show\"))}"]],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error("unknown mutation " + MUTATE);
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 150, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;
const EN_NAMES = ["Reflections on patience and gratitude across the whole of the Qur'an", "Hadith studies with commentary from the classical scholars of every school", "Personal notes written during the long weekly circle of study at the masjid", "Questions to ask my teacher about the meaning of intention and sincerity", "Things to revisit after Ramadan when there is more time for slow reading", "Sixth level folder with an even longer name than every one above it, for measure"];
const BN_NAMES = ["কুরআনজুড়ে ধৈর্য ও কৃতজ্ঞতা নিয়ে ভাবনাসমূহ এবং আরও অনেক দীর্ঘ কথা", "সকল মাযহাবের প্রাচীন আলেমদের ব্যাখ্যাসহ হাদীস অধ্যয়নের নোট", "মসজিদে সাপ্তাহিক দীর্ঘ অধ্যয়ন চক্রের সময় লেখা ব্যক্তিগত নোট", "নিয়ত ও ইখলাসের অর্থ নিয়ে শিক্ষককে জিজ্ঞাসা করার প্রশ্নসমূহ", "রমযানের পর ধীরে পড়ার জন্য আবার দেখার বিষয়গুলো", "ষষ্ঠ স্তরের ফোল্ডার যার নাম উপরের সবগুলোর চেয়েও দীর্ঘ পরিমাপের জন্য"];
const LONG = {
  ar: "حَدَّثَنَا " + "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ قَالَ قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ".repeat(6),
  en: "Narrated by Abu Hurayrah, may Allah be pleased with him: the Messenger of Allah, peace be upon him, said a very long saying to measure with. ".repeat(6),
  bn: "আবূ হুরায়রা রাদিয়াল্লাহু আনহু থেকে বর্ণিত, আল্লাহর রাসূল সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম পরিমাপের জন্য একটি খুব দীর্ঘ কথা বলেছেন। ".repeat(6),
};
const seedFor = (lang) => {
  const names = lang === "bn" ? BN_NAMES : EN_NAMES;
  return `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;localStorage.setItem("mm_card_look","night");window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(){return{toDate:function(){return new Date("2026-09-01T10:00:00Z")},toMillis:function(){return new Date("2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
var names=${JSON.stringify(names)};
names.forEach(function(n,i){DATA.noteFolders.push(Object.assign({_id:"t1__f"+i,folderId:"f"+i,name:n,parentFolderId:i?"f"+(i-1):null,semanticRole:"user",order:0,status:"active",updatedAt:ts()},own))});
})();`;
};
// The width a placeholder needs against the width its box gives it, read with the box's own computed font and padding.
const PH = (sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const cs = getComputedStyle(e), c = document.createElement("canvas").getContext("2d");
  c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const need = c.measureText(e.placeholder || "").width;
  const have = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  return { ph: e.placeholder, need: Math.round(need), have: Math.round(have), ellipsis: cs.textOverflow === "ellipsis", w: e.getBoundingClientRect().width };
};
async function frameOf(P) {
  const el = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 15000 });
  let f = null;
  for (let i = 0; i < 150 && !f; i++) { const c = await el.contentFrame(); if (c && /new=1/.test(c.url())) f = c; else await P.waitForTimeout(100); }
  if (!f) throw new Error("Note frame did not load");
  await f.waitForSelector("[data-nn-tool]", { timeout: 25000 });
  await P.waitForTimeout(700);
  return f;
}
async function openHadith(P, long) {
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 20000 });
  await P.click('[data-hadeethenc-category="3"]');
  await P.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
  await P.click('[data-hadeethenc-hadith="4563"]');
  await P.waitForSelector('[data-hadeethenc-note-link="4563"][aria-disabled="false"]', { timeout: 15000 }).catch(() => {});
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!long) { await P.click('[data-hadeethenc-note-link="4563"]'); return; }
  await P.evaluate(async (L) => {
    const m = await import("/app/js/note-opener.js");
    const ref = await m.hadithRefById("4563", { unitKey: "hadith:hadeethenc:4563", label: "Sahih al-Bukhari 1 · a long hadith" });
    ref.text = { ar: L.ar, en: L.en, bn: L.bn };
    m.openNewNote({ ref, unitKey: "hadith:hadeethenc:4563", unitLabel: "Sahih al-Bukhari 1", title: "Sahih al-Bukhari 1 - a long hadith:", backLabel: "Back to the hadith", count: 2, onOpenExisting: () => {} });
  }, LONG);
}

async function openLongHadithNote(P) {
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 20000 });
  await P.click('[data-hadeethenc-category="3"]');
  await P.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
  await P.click('[data-hadeethenc-hadith="4563"]');
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.evaluate(async (L) => {
    const m = await import("/app/js/note-opener.js");
    const ref = await m.hadithRefById("4563", { unitKey: "hadith:hadeethenc:4563", label: "Sahih al-Bukhari 1 · a long hadith" });
    ref.text = { ar: L.ar, en: L.en, bn: L.bn };
    m.openNewNote({ ref, unitKey: "hadith:hadeethenc:4563", unitLabel: "Sahih al-Bukhari 1", title: "Sahih al-Bukhari 1 - a long hadith:", backLabel: "Back to the hadith", count: 2, onOpenExisting: () => {} });
  }, LONG);
}

// ---- positive controls, correct by construction ----
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
  const { page: P } = await openPage(ctx, "/app/notes.html"); await P.waitForTimeout(800);
  await P.evaluate(() => { document.body.innerHTML = '<input id="a" style="width:300px;padding:0 8px;font:16px sans-serif" placeholder="Short"><input id="b" style="width:80px;padding:0 8px;font:16px sans-serif" placeholder="A placeholder far too long for this box">'; });
  const a = await P.evaluate(PH, "#a"), b = await P.evaluate(PH, "#b");
  check("positive control (placeholder): a short one fits, a long one in an 80px box is reported cut", a.need <= a.have && b.need > b.have + 50, JSON.stringify([a, b]));
  await ctx.close();
}

for (const lang of LANGS) for (const [w, h] of WIDTHS) for (const scale of SCALES) {
  const tag = `${w} / ${lang} / ${scale}%`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h }, extraSeedJs: seedFor(lang) });
  // One route per FILE, applying every edit of the mutation to it: Playwright runs only the newest handler for a request,
  // so two routes on one file would apply only the last edit.
  if (MUTATE) for (const file of new Set(MUTATIONS[MUTATE].map(([f]) => f))) await ctx.route((u) => new URL(u).pathname === "/app/" + file, async (r) => {
    const res = await r.fetch(); let s = await res.text();
    for (const [f, a, b] of MUTATIONS[MUTATE]) { if (f !== file) continue; if (!s.includes(a)) throw new Error("mutation target not found: " + MUTATE + " in " + file); s = s.split(a).join(b); }
    await r.fulfill({ response: res, body: s });
  });
  const { page: P, errors } = await openPage(ctx, "/app/hadith-study.html");
  try {
    await P.waitForTimeout(1200);
    await openLongHadithNote(P);
    const F = await frameOf(P);
    const css = "html{font-size:" + scale + "% !important}";
    await P.addStyleTag({ content: css });
    await F.evaluate((c) => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); }, css);
    await F.waitForSelector("[data-edit-body] .mm-ref", { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    // J109: the block's show/hide text, no arrow
    const sh = await F.evaluate(() => [...document.querySelectorAll(".mm-ref-showhide")].map((b) => b.textContent));
    check(`${tag} J109: the Hadith block's show/hide text has no ▾/▸ arrow (and it is there: positive control)`, sh.length > 0 && sh.every((x) => !/[▾▸▶◀▼▲]/.test(x)), JSON.stringify(sh));
    // D1-D4: 🗂 Folders
    await F.evaluate(() => document.querySelector('[data-nn-tool="folders"]')?.click());
    await F.waitForSelector(".folder-picker [data-picker-list] .folder-picker-row", { timeout: 10000 }).catch(() => {});
    await P.waitForTimeout(600);
    const L = await F.evaluate(() => { const l = document.querySelector(".folder-picker [data-picker-list]"); const rows = l ? [...l.querySelectorAll(".folder-picker-row")] : []; return l ? { h: l.clientHeight, sh: l.scrollHeight, rows: rows.length, row: rows[0]?.getBoundingClientRect().height || 0 } : null; });
    check(`${tag} D1: 🗂 the folder list shows at least two rows, or all of them (${L ? L.rows : 0} rows, 8 seeded)`, !!L && L.rows >= 8 && (L.h >= 2 * L.row - 2 || L.sh <= L.h + 1), JSON.stringify(L));
    const end = await F.evaluate(() => { const pk = document.querySelector(".folder-picker"); if (!pk) return null; pk.scrollTop = pk.scrollHeight; const ctl = [...pk.querySelectorAll("button, input")].filter((e) => e.getBoundingClientRect().width > 1).pop(); const r = ctl.getBoundingClientRect(), pr = pk.getBoundingClientRect(); return { last: ctl.textContent?.trim() || ctl.placeholder, inside: r.top >= pr.top - 1 && r.bottom <= Math.min(pr.bottom, innerHeight) + 1 }; });
    check(`${tag} D1: 🗂 scrolled to its end, the sheet's last control is on screen`, !!end && end.inside, JSON.stringify(end));
    await F.evaluate(() => { const pk = document.querySelector(".folder-picker"); if (pk) pk.scrollTop = 0; });
    const tg = await F.evaluate(PH, ".folder-picker .tag-picker-new input");
    if (process.env.NSL_DEBUG) console.log("DBG", tag, JSON.stringify({ L, tg, wrap: await F.evaluate(() => getComputedStyle(document.querySelector(".folder-picker .tag-picker-new")).flexWrap) }));
    check(`${tag} D3: 🗂 Tags: "New tag name" fits its box`, !!tg && tg.need <= tg.have + 1, JSON.stringify(tg));
    const se = await F.evaluate(PH, ".folder-picker .folder-search-input");
    check(`${tag} D4: 🗂 the search placeholder fits, or its cut ends in "…"`, !!se && (se.need <= se.have + 1 || se.ellipsis), JSON.stringify(se));
    await P.keyboard.press("Escape"); await F.evaluate(() => document.querySelector("[data-picker-cancel], [data-picker-done]")?.click()).catch(() => {});
    await P.waitForTimeout(400);
    // D2: 📎 Attach
    await F.evaluate(() => document.querySelector('[data-nn-tool="attach"]')?.click());
    await P.waitForSelector("#noteOpener [data-no-attach-input]", { timeout: 8000 }).catch(() => {});
    await P.waitForTimeout(300);
    const at = await P.evaluate(() => { const box = document.querySelector("#noteOpener .no-attach-box"), lb = box?.querySelector("[data-no-attach-label]"), inp = box?.querySelector("[data-no-attach-input]"); if (!lb) return null; const br = box.getBoundingClientRect(), r = lb.getBoundingClientRect(); return { label: lb.textContent, inside: r.left >= br.left - 1 && r.right <= br.right + 1, whole: lb.scrollWidth <= lb.clientWidth + 1, named: inp?.labels?.[0] === lb }; });
    const want = lang === "bn" ? /২:২৫৫/ : /Surah:Āyah, e\.g\. 2:255/;
    check(`${tag} D2: 📎 Attach: the wording is a whole, visible label inside the box, naming the field`, !!at && want.test(at.label) && at.inside && at.whole && at.named, JSON.stringify(at));
    const ap = await P.evaluate(PH, "#noteOpener [data-no-attach-input]");
    check(`${tag} D2: 📎 Attach: the field's placeholder fits its box`, !!ap && !!ap.ph && ap.need <= ap.have + 1, JSON.stringify(ap));
    const pe = errors.filter((e) => !NOISE.test(e));
    check(`${tag} no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
  } catch (e) { check(`${tag} the Note window opened (positive control)`, false, String(e.message).slice(0, 200)); }
  await ctx.close();
}
console.log(`\n==== The v13 Note's sheets at large text (audit part 145, v13.10): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
