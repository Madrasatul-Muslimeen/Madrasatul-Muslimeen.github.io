// Dua module, build round R2 (PCF MSA J104) on the Dua page app/dua-study.html:
//   D22 on the Dua Card only the Dua itself and the progress stay open; meaning, source, the whole narration and
//       ✓ Check open from the card's menu as pop-up cards with ✕ back to the Dua (focus returns to the menu button);
//   D11 the Asma ul Husna poster's bottom banner under every Dua Card, D12 the top banner frame above it;
//   D05 the Dua's title, English and Bangla (groups.json `titles`), on the card and on its list row.
// Phone (320, 390) and computer (1280) widths, English and Bangla. Hadith Study's own Dua tab is
// dua-tab-browser.mjs's, and must stay unchanged.
//
// The expected words are read out of groups.json and bn.js, not retyped. --mutate=<name> serves dua-study.js with one
// deliberate break; each must fail at least one check (--mutate=all proves them all).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/dua-card-r2-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const SRC = fs.readFileSync("app/js/dua-study.js", "utf8");
const BN = fs.readFileSync("app/js/i18n/bn.js", "utf8");
const DATA = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/groups.json", "utf8"));
const BANNER = "app/img/dua-banner-bottom.webp";
const MUTATIONS = {
  // D22: the blocks stay on the card (nothing moves into the menu's stash).
  stash: ["      for (const n of s.nodes) stash.appendChild(n);\n", ""],
  // D22: ✕ loses the block (it is not put back, so it is gone from the card for good).
  putback: ["    for (const n of nodes) stash.appendChild(n);\n", ""],
  // D22: ✕ leaves the reader's focus nowhere.
  focus: ["    if (from?.isConnected) from.focus();\n", ""],
  // D22: Meaning opens with its translation still folded shut.
  openfirst: ["    if (openFirst) {", "    if (false) {"],
  // D11: no bottom banner.
  banner: ["    host.appendChild(img);\n", ""],
  // D12: no top banner frame.
  arch: ["    host.appendChild(arch);\n", ""],
  // D05: a Hadith-book dua's title never read.
  title: ["  const x = pick(data.titles?.[e.n]);", "  const x = null;"],
  // D05: a Bangla reader gets the English title.
  bntitle: ['(lang === "bn" && tt.bn) || tt.en', "tt.en"],
};
const arg = process.argv.find((a) => a.startsWith("--mutate="))?.slice(9) ?? null;

function bnValue(key) {
  const i = BN.indexOf(JSON.stringify(key) + ":");
  if (i < 0) throw new Error(`no bn key ${key}`);
  const m = /^\s*"((?:[^"\\]|\\.)*)"/.exec(BN.slice(i + JSON.stringify(key).length + 1));
  return JSON.parse(`"${m[1]}"`);
}
const group = (id) => DATA.groups.find((g) => g.id === id);
// The Dua the walk opens: the most narrated one with a title in both languages and a HadeethEnc meaning.
const TITLED = DATA.duas.find((r) => DATA.titles[r[0]]?.bn)?.[0];
// Rasulullah's list position of a dua (the list is DATA.duas in order).
const posOf = (n) => DATA.duas.findIndex((r) => r[0] === n) + 1;
const UNTITLED_HEADING = DATA.duas.find((r) => !DATA.titles[r[0]] && Array.isArray(r[3]));

async function run(mutation) {
  let passed = 0, failed = 0;
  const check = async (name, fn) => {
    try { await fn(); passed++; if (!mutation) console.log(`  PASS  ${name}`); }
    catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
  };
  let src = SRC;
  if (mutation) {
    const [a, b] = MUTATIONS[mutation];
    const n = src.split(a).length - 1;
    if (n !== 1) throw new Error(`mutation ${mutation}: its text occurs ${n} times`);
    src = src.replace(a, b);
  }

  if (!mutation) {
    console.log("\n===== the data (groups.json titles, the banner file) =====");
    const ns = new Set(DATA.duas.map((r) => r[0]));
    const entries = Object.entries(DATA.titles ?? {});
    await check("positive control: there are titles, and the walk's Dua has one in both languages", () => { if (!entries.length || !TITLED) throw new Error(`${entries.length} ${TITLED}`); });
    await check("every title names a real Dua card", () => { const bad = entries.find(([n]) => !ns.has(Number(n))); if (bad) throw new Error(bad[0]); });
    await check("every title is short (English ≤ 90, Bangla ≤ 110) and has no stray quotation mark or end stop", () => {
      const bad = entries.find(([, x]) => !x.en || x.en.length > 90 || (x.bn && x.bn.length > 110) || [x.en, x.bn ?? "x"].some((s) => /^[“”‘’"'«»]|[“”‘’"'«»,،:;।.]$/u.test(s)));
      if (bad) throw new Error(JSON.stringify(bad));
    });
    await check("no Bangla title ends on a dangling \"is\" (হচ্ছে / হলো / হল), as dua 2's once did", () => {
      const bad = entries.find(([, x]) => /\s(?:হচ্ছে|হলো|হল)$/u.test(x.bn ?? ""));
      if (bad) throw new Error(JSON.stringify(bad));
    });
    await check("cleanTitle drops a dangling Bangla \"is\" and keeps one inside a title", async () => {
      const { cleanTitle } = await import("../hadith-data-pull/dua-groups.mjs");
      const got = [cleanTitle("সাইয়্যেদুল ইস্তেগফার হচ্ছে"), cleanTitle("“এটা হলো দুআ”,"), cleanTitle("যা হল ভালো")];
      const want = ["সাইয়্যেদুল ইস্তেগফার", "এটা হলো দুআ", "যা হল ভালো"];
      if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(JSON.stringify(got));
    });
    await check("Prophets keep their titles in both languages", () => { if (group("prophets").items.some((p) => !p.title?.en || !p.title?.bn)) throw new Error("missing"); });
    await check("the data file credits HadeethEnc for the titles", () => { if (!DATA.credits.some((c) => /titles.*HadeethEnc/i.test(c))) throw new Error("no credit"); });
    await check("the bottom banner is a Dua-owned WebP file", () => { const b = fs.readFileSync(BANNER); if (b.toString("latin1", 8, 12) !== "WEBP") throw new Error("not webp"); });
  }

  const browser = await chromium.launch();
  for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280], ["en", 320]]) {
    if (!mutation) console.log(`\n===== the Dua Card (${lang}, ${width}px) =====`);
    const L = (k) => (lang === "bn" ? bnValue(k) : k);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    await ctx.route(/\/app\/js\/dua-study\.js(\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: src }));
    try {
      const { page } = await openPage(ctx, `/app/dua-study.html?g=rasul&open=${posOf(TITLED)}`);
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.waitForSelector("[data-dua-card] [data-dua-progress]", { timeout: 20000 }).catch(() => {});
      const shown = (sel) => page.$$eval(sel, (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const box = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { t: r.top + scrollY, b: r.bottom + scrollY, l: r.left, r: r.right, w: r.width, h: r.height }; }).catch(() => null);

      // D12, D05, D11: the frame.
      const arch = await page.$eval("[data-dua-top-banner]", (e) => e.textContent).catch(() => null);
      await check("D12 the top banner frame shows Bismillah and says its text is to come, in this language", () => { if (!arch?.includes("بِسْمِ ٱللَّهِ") || !arch.includes(L("Top banner · text to come"))) throw new Error(arch); });
      const title = await page.$eval("[data-dua-title]", (e) => e.textContent).catch(() => null);
      const want = lang === "bn" ? DATA.titles[TITLED].bn : DATA.titles[TITLED].en;
      await check(`D05 Dua ${TITLED}'s card carries its title in this language`, () => { if (title !== want) throw new Error(title); });
      const [a, c, ban] = [await box("[data-dua-top-banner]"), await box("[data-dua-card]"), await box("[data-dua-bottom-banner]")];
      await check("D12 above the card, D11 below it", () => { if (!a || !c || !ban || a.b > c.t || ban.t < c.b) throw new Error(JSON.stringify({ a, c, ban })); });
      const loaded = await page.$eval("[data-dua-bottom-banner]", async (img) => { if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; }); return img.naturalWidth; }).catch(() => 0);
      await check("D11 the bottom banner picture loads and fits the screen", () => { if (!loaded || !ban || ban.l < 0 || ban.r > width) throw new Error(`${loaded} ${JSON.stringify(ban)}`); });

      // D22: what stays open on the card, and what moved into its menu.
      await check("D22 the Dua's words and its progress stay open on the card", async () => { if ((await shown("[data-dua-card] .dua-words")) < 1 || (await shown("[data-dua-card] [data-dua-progress]")) < 1) throw new Error("hidden"); });
      await check("D22 meaning, source and the whole narration are not open on the card", async () => {
        const n = await shown("[data-dua-card] .dua-also, [data-dua-card] .hadeethenc-explanation, [data-dua-card] details.dua-narration, [data-dua-card] .openiti-standard-number");
        if (n) throw new Error(`${n} shown`);
      });
      const menu = await page.$$eval("[data-dua-menu]", (b) => b.map((x) => { const r = x.getBoundingClientRect(); return { k: x.dataset.duaMenu, label: x.textContent, h: r.height, l: r.left, r: r.right }; }));
      await check("D22 the card's menu offers Meaning, Source and The whole narration, in this language", () => {
        const got = Object.fromEntries(menu.map((m) => [m.k, m.label]));
        if (got.meaning !== L("Meaning") || got.source !== L("Source") || got.narration !== L("The whole narration")) throw new Error(JSON.stringify(got));
      });
      await check("D22 each menu button is finger-sized (44px) and on screen", () => { if (!menu.length || menu.some((m) => m.h < 44 || m.l < 0 || m.r > width)) throw new Error(JSON.stringify(menu[0])); });
      await check("D22 the menu sits between the Dua's words and its progress", async () => {
        const [w, m, p] = [await box("[data-dua-card] .dua-words"), await box(".dua-card-menu"), await box("[data-dua-card] [data-dua-progress]")];
        if (!w || !m || !p || !(w.b <= m.t && m.b <= p.t)) throw new Error(JSON.stringify({ w, m, p }));
      });

      // Source pop-up, ✕ back to the Dua.
      await page.click('[data-dua-menu="source"]');
      const pop = await box('[data-dua-pop="source"] .dua-popcard');
      await check("D22 Source opens a pop-up card holding the narrations, inside the screen", async () => {
        if (!pop || pop.l < 0 || pop.r > width || (await shown('[data-dua-pop="source"] .dua-also')) < 1) throw new Error(JSON.stringify(pop));
      });
      const head = await page.$eval('[data-dua-pop="source"] h3', (e) => e.textContent).catch(() => null);
      await check("the pop-up is named in this language, and its ✕ says Close", async () => {
        const x = await page.$eval("[data-dua-pop-close]", (e) => e.textContent).catch(() => null);
        if (head !== L("Source") || x !== `✕ ${L("Close")}`) throw new Error(`${head} ${x}`);
      });
      await page.click("[data-dua-pop-close]");
      await check("✕ closes it, and the narrations are kept in the card, still folded away", async () => {
        if (await page.$("[data-dua-pop]")) throw new Error("still open");
        if ((await page.$$("[data-dua-card] .dua-also")).length !== 1 || (await shown("[data-dua-card] .dua-also"))) throw new Error("lost or open");
      });
      await check("✕ puts the reader's focus back on the menu button", async () => { const f = await page.evaluate(() => document.activeElement?.dataset?.duaMenu ?? null); if (f !== "source") throw new Error(f); });
      await page.click('[data-dua-menu="source"]');
      await page.keyboard.press("Escape");
      await check("Esc closes the pop-up too", async () => { if (await page.$("[data-dua-pop]")) throw new Error("still open"); });
      await page.click('[data-dua-menu="source"]');
      await page.mouse.click(4, 450);
      await check("a tap outside the pop-up card closes it", async () => { if (await page.$("[data-dua-pop]")) throw new Error("still open"); });

      // Meaning opens with its translation unfolded.
      await page.click('[data-dua-menu="meaning"]');
      await check("D22 Meaning opens with its first translation already unfolded", async () => { const o = await page.$eval('[data-dua-pop="meaning"] details', (d) => d.open).catch(() => null); if (o !== true) throw new Error(String(o)); });
      await page.click("[data-dua-pop-close]");
      await check("nothing sticks out past the screen's right edge", async () => { const o = await overflow(); if (o > 0) throw new Error(`${o}px`); });

      // D05 on the list row: back to the list, the row carries the title.
      await page.click("[data-dua-card-back]");
      await page.waitForSelector(`[data-dua-no="${posOf(TITLED)}"]`);
      const rowTitle = await page.$eval(`[data-dua-no="${posOf(TITLED)}"] [data-dua-row-title]`, (e) => e.textContent).catch(() => null);
      await check("D05 the Dua's list row carries its title too", () => { if (rowTitle !== want) throw new Error(rowTitle); });

      // A Dua with no title: its book's chapter heading stands in, in Arabic.
      await page.goto(new URL(`/app/dua-study.html?g=rasul&open=${posOf(UNTITLED_HEADING[0])}`, page.url()).href);
      await page.waitForSelector("[data-dua-card]", { timeout: 20000 }).catch(() => {});
      await check("D05 a Dua with no title shows its book's chapter heading as its title, in Arabic", async () => {
        const t = await page.$eval("[data-dua-title]", (e) => ({ k: e.dataset.duaTitle, t: e.textContent, lang: e.lang })).catch(() => null);
        if (t?.k !== "ar" || t.t !== UNTITLED_HEADING[3][0] || t.lang !== "ar") throw new Error(JSON.stringify(t));
      });

      // A Hisn dhikr: its reference in Source; the frame around it.
      await page.goto(new URL("/app/dua-study.html?g=occasions&part=wake&open=1", page.url()).href);
      await page.waitForSelector("[data-dua-hisn]", { timeout: 20000 }).catch(() => {});
      await check("a Hisn dhikr sits in the same frame (top and bottom banners)", async () => { if (!(await page.$("[data-dua-hisn]")) || (await shown("[data-dua-top-banner], [data-dua-bottom-banner]")) !== 2) throw new Error("no frame"); });
      await check("D22 a Hisn dhikr's reference is in its Source pop-up, not open on the card", async () => {
        if (await shown("[data-dua-hisn] .dua-hisn-ref")) throw new Error("open on the card");
        await page.click('[data-dua-menu="source"]');
        if ((await shown('[data-dua-pop="source"] .dua-hisn-ref')) !== 1) throw new Error("not in the pop-up");
        await page.click("[data-dua-pop-close]");
      });

      // A Prophet's dua: its title in the frame, its meaning in the Meaning pop-up.
      await page.goto(new URL("/app/dua-study.html?g=prophets&open=1", page.url()).href);
      await page.waitForSelector("[data-dua-quran]", { timeout: 20000 }).catch(() => {});
      const p0 = group("prophets").items[0];
      await check("D05 a Prophet's dua carries its title in this language", async () => { const t = await page.$eval("[data-dua-title]", (e) => e.textContent).catch(() => null); if (t !== p0.title[lang]) throw new Error(t); });
      await check("D22 its meaning opens from the menu, in this language", async () => {
        if (await shown("[data-dua-quran] .dua-quran-meaning")) throw new Error("open on the card");
        await page.click('[data-dua-menu="meaning"]');
        const m = await page.$eval('[data-dua-pop="meaning"] .dua-quran-meaning', (e) => e.textContent).catch(() => null);
        if (m !== p0[lang]) throw new Error(m?.slice(0, 40));
        await page.click("[data-dua-pop-close]");
      });
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
console.log(`\n==== Dua Card R2 (D22, D11, D12, D05): ${r.passed} passed, ${r.failed} failed ====`);
process.exit(r.failed ? 1 : 0);
