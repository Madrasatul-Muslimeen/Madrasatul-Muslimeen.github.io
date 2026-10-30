// Dua module, build round R3 (PCF MSA J104) on the Dua page app/dua-study.html:
//   D07 the Dua Card as an A4 poster: Arabic / English / Bangla / word-by-word switches, the text sized so one page
//       holds everything (a short dua grows, a long one shrinks), and Print prints only the poster;
//   D14 copy and share: what to include, as text (Copy, or the text selected when copying is refused) or as a poster
//       picture (a PNG to save or share).
// Phone (320, 390) and computer (1280) widths, English and Bangla. The expected words are read out of groups.json and
// bn.js, not retyped. --mutate=<name> serves dua-study.js or dua-poster.js with one deliberate break; each must fail at
// least one check (--mutate=all proves them all).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/dua-poster-r3-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const FILES = { study: "app/js/dua-study.js", poster: "app/js/dua-poster.js" };
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
const BN = fs.readFileSync("app/js/i18n/bn.js", "utf8");
const DATA = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/groups.json", "utf8"));
const MUTATIONS = {
  // D07: the text never shrinks, so a long dua runs off the page.
  fit: ["poster", "  while (a4.scrollHeight > a4.clientHeight + 1 && k > 0.3) { k -= 0.05; size(); }\n", ""],
  // D07: a short dua never grows to fill the page.
  grow: ["poster", "  let k = MAX_SCALE;\n", "  let k = 1;\n"],
  // D07: the poster starts in English for every reader.
  langdefault: ["poster", 'en: lang() === "en", bn: lang() === "bn"', "en: true, bn: false"],
  // D07: a switch with nothing behind it can still be pressed.
  disabled: ["poster", "sw.appendChild(toggle(label, posterOpt[k], !can[k],", "sw.appendChild(toggle(label, posterOpt[k], false,"],
  // D07: after printing, the copy and the print state are left behind.
  printcleanup: ["poster", 'const done = () => { document.body.classList.remove("dua-printing"); host.remove(); ', "const done = () => { "],
  // D14: the source is never in the shared text.
  source: ["poster", "  if (opt.src && can.src) out.push(sheet.ref);\n", ""],
  // D14: Copy never reaches the clipboard.
  copy: ["poster", "try { await navigator.clipboard.writeText(text); status", "try { status"],
  // D07 / D14: a Hadith dua's words never take the Qur'an's word meanings.
  wbw: ["study", 'return [s.textContent, e?.[4] ?? "", e?.[5] ?? ""];', 'return [s.textContent, "", ""];'],
  // D07 / D14: a Hadith dua's card has no poster or share in its menu.
  menu: ["study", "      ...sheetSections(sheetOf),\n", ""],
};
const arg = process.argv.find((a) => a.startsWith("--mutate="))?.slice(9) ?? null;

function bnValue(key) {
  const i = BN.indexOf(JSON.stringify(key) + ":");
  if (i < 0) throw new Error(`no bn key ${key}`);
  const m = /^\s*"((?:[^"\\]|\\.)*)"/.exec(BN.slice(i + JSON.stringify(key).length + 1));
  return JSON.parse(`"${m[1]}"`);
}
const digits = (s, lang) => (lang === "bn" ? String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(s));
const prophets = DATA.groups.find((g) => g.id === "prophets").items;
// The shortest Prophet's dua (grows) and the longest Hisn dhikr (must shrink to fit).
const SHORT = prophets.reduce((a, p, i) => (p.ar.length < prophets[a].ar.length ? i : a), 0);
const occ = DATA.groups.find((g) => g.id === "occasions").parts;
let LONG = null;
for (const p of occ) p.items.forEach((it, i) => { if (!LONG || it.ar.length > LONG.ar.length) LONG = { part: p.id, i: i + 1, ar: it.ar }; });

async function run(mutation) {
  let passed = 0, failed = 0;
  const check = async (name, fn) => {
    try { await fn(); passed++; if (!mutation) console.log(`  PASS  ${name}`); }
    catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
  };
  const src = { ...SRC };
  if (mutation) {
    const [f, a, b] = MUTATIONS[mutation];
    const n = src[f].split(a).length - 1;
    if (n !== 1) throw new Error(`mutation ${mutation}: its text occurs ${n} times`);
    src[f] = src[f].replace(a, b);
  }
  if (!mutation) {
    console.log("\n===== the data =====");
    await check("every Prophet's dua carries its āyah word by word, each word with English and Bangla", () => {
      const bad = prophets.find((p) => !p.words?.length || p.words.some((w) => !w[0] || !w[1] || !w[2]));
      if (bad) throw new Error(bad.ref);
    });
    await check(`positive control: the longest Hisn dhikr is long (${LONG.ar.length} letters)`, () => { if (LONG.ar.length < 600) throw new Error(String(LONG.ar.length)); });
  }

  const browser = await chromium.launch();
  for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["en", 320]]) {
    if (!mutation) console.log(`\n===== poster and share (${lang}, ${width}px) =====`);
    const L = (k) => (lang === "bn" ? bnValue(k) : k);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    for (const [k, f] of Object.entries(FILES)) {
      const re = new RegExp(`/${f.replace(/[./]/g, (c) => `\\${c}`)}(\\?.*)?$`);
      await ctx.route(re, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: src[k] }));
    }
    try {
      const p0 = prophets[SHORT];
      const { page } = await openPage(ctx, `/app/dua-study.html?g=prophets&open=${SHORT + 1}`);
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.waitForSelector("[data-dua-quran]", { timeout: 20000 }).catch(() => {});
      const fits = () => page.$eval("[data-dua-a4]", (a) => ({ over: a.scrollHeight - a.clientHeight, k: Number(a.dataset.duaA4Scale), w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height, l: a.getBoundingClientRect().left, r: a.getBoundingClientRect().right }));
      const parts = () => page.$$eval("[data-dua-a4] [data-dua-a4-part]", (x) => x.map((e) => e.dataset.duaA4Part));
      const settle = () => page.waitForFunction(() => document.querySelector("[data-dua-a4]")?.dataset.duaA4Scale, null, { timeout: 5000 }).catch(() => {});

      const menu = await page.$$eval('[data-dua-menu="poster"], [data-dua-menu="share"]', (b) => b.map((x) => ({ t: x.textContent, h: x.getBoundingClientRect().height })));
      await check("the card's menu offers Poster and Copy / share, in this language, finger-sized", () => {
        if (menu.length !== 2 || !menu[0].t.includes(L("Poster")) || menu[1].t !== L("Copy / share") || menu.some((m) => m.h < 44)) throw new Error(JSON.stringify(menu));
      });

      // D07 the poster.
      await page.click('[data-dua-menu="poster"]');
      await settle();
      const f1 = await fits();
      await check("D07 the poster is an A4 page (210 × 297), inside the screen", () => { if (Math.abs(f1.h / f1.w - 297 / 210) > 0.02 || f1.l < 0 || f1.r > width) throw new Error(JSON.stringify(f1)); });
      await check("D07 it starts with Arabic and the reader's own language", async () => { const p = (await parts()).join(); if (p !== `ar,${lang}`) throw new Error(p); });
      await check("D07 a short dua grows to fill the page, and still fits", () => { if (!(f1.k > 1) || f1.over > 1) throw new Error(JSON.stringify(f1)); });
      const other = lang === "en" ? "bn" : "en";
      await page.click(`[data-dua-switch="${other}"]`);
      await page.click('[data-dua-switch="wbw"]');
      await settle();
      const wbw = await page.$$eval("[data-dua-a4] .dua-a4-wbw span", (x) => x.map((s) => [s.querySelector("b").textContent, s.querySelector("small").textContent]));
      await check("D07 word by word shows every word with its meaning in this language", () => {
        if (wbw.length !== p0.words.length || wbw.some((w, i) => w[0] !== p0.words[i][0] || w[1] !== p0.words[i][lang === "bn" ? 2 : 1])) throw new Error(JSON.stringify(wbw[0]));
      });
      await check("D07 the other language switches on too, and all four still fit one page", async () => { const p = (await parts()).sort().join(); const f = await fits(); if (p !== "ar,bn,en,wbw" || f.over > 1) throw new Error(`${p} ${f.over}`); });
      const sw = await page.$$eval("[data-dua-switch]", (x) => x.map((b) => ({ k: b.dataset.duaSwitch, t: b.textContent, h: b.getBoundingClientRect().height })));
      await check("D07 the switches are named in this language and finger-sized", () => {
        const want = { ar: L("Arabic"), en: L("English"), bn: L("Bangla"), wbw: L("Word by word") };
        if (sw.some((s) => s.t !== want[s.k] || s.h < 44)) throw new Error(JSON.stringify(sw));
      });

      // Print: only the poster, then everything put back.
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => { window.__printed = null; window.print = () => { window.__printed = { root: getComputedStyle(document.getElementById("duaRoot")).display, copy: getComputedStyle(document.getElementById("duaPrint")).display, a4: !!document.querySelector("#duaPrint [data-dua-a4]") }; setTimeout(() => dispatchEvent(new Event("afterprint")), 0); }; });
      await page.click("[data-dua-print]");
      await page.waitForFunction(() => window.__printed, null, { timeout: 5000 }).catch(() => {});
      const printed = await page.evaluate(() => window.__printed);
      await page.emulateMedia({ media: "screen" });
      await check("D07 Print prints only the poster (the page hidden, the poster shown)", () => { if (printed?.root !== "none" || printed?.copy !== "block" || !printed?.a4) throw new Error(JSON.stringify(printed)); });
      await page.waitForTimeout(50);
      await check("after printing, the copy and the print state are gone", async () => { const s = await page.evaluate(() => [!!document.getElementById("duaPrint"), document.body.classList.contains("dua-printing")]); if (s[0] || s[1]) throw new Error(JSON.stringify(s)); });
      await page.click("[data-dua-pop-close]");

      // D14 as text.
      await page.click('[data-dua-menu="share"]');
      const ref = `${L("Qur'an {ref}").replace("{ref}", digits(p0.ref, lang))} · ${p0.surah.en}`;
      const pv = await page.$eval("[data-dua-share-preview]", (e) => e.textContent).catch(() => null);
      await check("D14 the text starts as title, Arabic and source", () => { if (pv !== [p0.title[lang], p0.ar, ref].join("\n\n")) throw new Error(JSON.stringify(pv?.slice(0, 80))); });
      await page.click(`[data-dua-switch="${lang}"]`);
      const pv2 = await page.$eval("[data-dua-share-preview]", (e) => e.textContent).catch(() => "");
      await check("D14 adding this language adds the dua's meaning", () => { if (!pv2.includes(p0[lang])) throw new Error("missing"); });
      await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (s) => { window.__copied = s; } } }); });
      await page.click("[data-dua-copy]");
      await page.waitForFunction(() => window.__copied, null, { timeout: 3000 }).catch(() => {});
      await check("D14 Copy puts exactly that text on the clipboard and says so", async () => {
        const c = await page.evaluate(() => window.__copied); const s = await page.$eval(".dua-share-status", (e) => e.textContent);
        if (c !== pv2 || s !== L("Copied!")) throw new Error(`${s}`);
      });
      await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } }); });
      await page.click("[data-dua-copy]");
      await page.waitForTimeout(100);
      await check("D14 when copying is refused, the text is selected and the words say what to do", async () => {
        const sel = await page.evaluate(() => getSelection().toString()); const s = await page.$eval(".dua-share-status", (e) => e.textContent);
        if (sel.replace(/\s/g, "") !== pv2.replace(/\s/g, "") || s !== L("The text is selected: copy it with your device's Copy.")) throw new Error(s);
      });

      // D14 as a picture.
      await page.click('[data-dua-share-as="img"]');
      await page.waitForSelector(".dua-share-img", { timeout: 15000 }).catch(() => {});
      const pic = await page.$eval(".dua-share-img", async (i) => { if (!i.complete) await new Promise((r) => { i.onload = r; }); return { w: i.naturalWidth, h: i.naturalHeight, k: Number(i.dataset.duaScale) }; }).catch(() => null);
      const save = await page.$eval("[data-dua-save-picture]", (a) => ({ href: a.getAttribute("href")?.slice(0, 22), dl: a.download })).catch(() => null);
      await check("D14 the poster picture is an A4 PNG (1240 × 1754) to save", () => { if (pic?.w !== 1240 || pic?.h !== 1754 || save?.href !== "data:image/png;base64," || !save.dl.endsWith(".png")) throw new Error(JSON.stringify({ pic, save })); });
      await page.click("[data-dua-pop-close]");

      // A long Hisn dhikr: shrinks to fit; English, Bangla and word by word say why they are off.
      await page.goto(new URL(`/app/dua-study.html?g=occasions&part=${LONG.part}&open=${LONG.i}`, page.url()).href);
      await page.waitForSelector("[data-dua-hisn]", { timeout: 20000 }).catch(() => {});
      await page.click('[data-dua-menu="poster"]');
      await settle();
      const f2 = await fits();
      await check("D07 the longest Hisn dhikr shrinks until one page holds it", () => { if (!(f2.k < 1) || f2.over > 1) throw new Error(JSON.stringify(f2)); });
      await check("D07 switches with nothing behind them are off, and the page says why", async () => {
        const d = await page.$$eval("[data-dua-switch]", (x) => x.filter((b) => b.disabled).map((b) => b.dataset.duaSwitch).join());
        const n = await page.$eval(".dua-gap-note", (e) => e.textContent).catch(() => "");
        if (d !== "en,bn,wbw" || !n.includes(L("This dua's own meaning in English and Bangla is not in the app yet."))) throw new Error(`${d} | ${n}`);
      });
      await page.click("[data-dua-pop-close]");

      // A Hadith dua: its own words, the Qur'an's word meanings, and its source.
      await page.goto(new URL("/app/dua-study.html?g=rasul&open=2", page.url()).href);
      await page.waitForSelector("[data-dua-card] [data-dua-progress]", { timeout: 20000 }).catch(() => {});
      const words = await page.$$eval("[data-dua-card] .dua-words [data-dua-word]", (x) => x.map((s) => s.textContent).join(" "));
      const std = await page.$eval("[data-dua-card] .openiti-standard-number", (e) => e.textContent).catch(() => null);
      await page.click('[data-dua-menu="share"]');
      const pv3 = await page.$eval("[data-dua-share-preview]", (e) => e.textContent).catch(() => "");
      await check("D14 a Hadith dua's text holds its own words and its book and number", () => { if (!words || !pv3.includes(words) || !std || !pv3.endsWith(std)) throw new Error(pv3.slice(0, 60)); });
      await page.click('[data-dua-switch="wbw"]').catch(() => {});
      const pv4 = await page.$eval("[data-dua-share-preview]", (e) => e.textContent).catch(() => "");
      await check("D14 word by word gives the Qur'an's meaning of each matched word", () => { const lines = pv4.split("\n").filter((l) => / = /.test(l)); if (lines.length < 5 || !lines.some((l) => /[A-Za-zঀ-৿]/.test(l.split(" = ")[1]))) throw new Error(`${lines.length}`); });
      await page.click("[data-dua-pop-close]");
      await check("nothing sticks out past the screen's right edge", async () => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) throw new Error(`${o}px`); });
      await check("no page errors", () => { if (errors.length) throw new Error(errors.join(" | ")); });
    } catch (e) { failed++; console.log(`  FAIL  the walk at ${lang} ${width}px stopped -- ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
  await browser.close();
  return { passed, failed };
}

if (arg) {
  let unproven = 0;
  for (const m of arg === "all" ? Object.keys(MUTATIONS) : [arg]) {
    const r = await run(m);
    console.log(`mutation ${m}: ${r.failed ? `CAUGHT (${r.failed} failed)` : "UNPROVEN, nothing failed"}`);
    if (!r.failed) unproven++;
  }
  process.exit(unproven ? 1 : 0);
}
const r = await run(null);
console.log(`\n==== Dua poster and share R3 (D07, D14): ${r.passed} passed, ${r.failed} failed ====`);
process.exit(r.failed ? 1 : 0);
