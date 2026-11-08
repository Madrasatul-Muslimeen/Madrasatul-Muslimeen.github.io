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
  // The Owner, 7 Nov: Share and Keep sit straight under the selections (Keep is put back at the foot).
  order: ["    panel.insertBefore(keep, listen);\n", "    panel.appendChild(keep);\n"],
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
      // Build 2 (7 Nov 2026, demo v1.06): the menu now lives under the card's top bar; open it first.
      await check("build 2 the card's top bar holds Play (not yet working), ‹ n of N ›, Menu and the pop-up button", async () => {
        const got = await page.$eval("[data-dua-topbar]", (t) => ({ play: t.querySelector("[data-dua-play]")?.disabled, prev: !!t.querySelector("[data-dua-card-prev]"), next: !!t.querySelector("[data-dua-card-next]"), pos: !!t.querySelector("[data-dua-card-pos]"), menu: !!t.querySelector("[data-dua-menu-toggle]"), pop: !!t.querySelector("[data-dua-popout]") }));
        if (!(got.play === true && got.prev && got.next && got.pos && got.menu && got.pop)) throw new Error(JSON.stringify(got));
      });
      await check("build 2 the Menu starts closed, and the progress stays open on the card", async () => {
        if ((await shown(".dua-menu-panel")) !== 0 || (await shown("[data-dua-card] [data-dua-progress]")) < 1) throw new Error("menu open or progress hidden");
      });
      await check("build 1 Home is one tap to the MSA home, and a Menu button beside it holds My account", async () => {
        const got = await page.evaluate(() => ({ href: document.querySelector("#duaHomeLink")?.getAttribute("href"), beside: document.querySelector(".dua-topnav #duaHomeLink ~ #accountHomeMenu summary")?.textContent, acct: !!document.querySelector("#accountHomeMenu [data-open-account-card]") }));
        if (got.href !== "./index.html" || !/Menu|মেনু/.test(got.beside || "") || !got.acct) throw new Error(JSON.stringify(got));
      });
      await check("Home bar: a Bookmarks link (shared by every subject) sits between Home and Menu, and returns here with back=1", async () => {
        const got = await page.evaluate(() => ({ href: document.querySelector(".dua-topnav #duaHomeLink + #duaBookmarksLink + #accountHomeMenu") ? document.querySelector("#duaBookmarksLink").getAttribute("href") : null }));
        if (got.href !== "./bookmarks.html?back=1") throw new Error(JSON.stringify(got));
      });
      await check("build 2 the Person box and 'Signed in as' are off the page (under My account); the 'For <person>' chip is gone too (the Owner, 7 Nov)", async () => {
        const got = await page.evaluate(() => ({ who: document.querySelector("#who")?.hidden, chip: !!document.querySelector("#forPersonChip"), personInPage: !!document.querySelector("#contextBar #personSelect") }));
        if (!got.who || got.chip || got.personInPage) throw new Error(JSON.stringify(got));
      });
      await page.click("[data-dua-menu-toggle]");
      await check("build 2 the open Menu holds the selections, then Share and Keep (My Notes, Bookmark) moved UP at the Owner's word 7 Nov, then Listen (Owner chose B: audio lives in the Menu, dimmed until D16/D17) and Study", async () => {
        const got = await page.$eval(".dua-menu-panel", (m) => ({ sel: !!m.querySelector("[data-dua-sel]"), groups: [...m.querySelectorAll("[data-dua-menu-group]")].map((g) => g.dataset.duaMenuGroup), keep: !!m.querySelector('[data-dua-menu-group="keep"] [data-dua-note-bookmark]'), listenOff: [...m.querySelectorAll("[data-dua-listen]")].length === 4 && [...m.querySelectorAll("[data-dua-listen]")].every((b) => b.disabled), exp: document.querySelector("[data-dua-menu-toggle]").getAttribute("aria-expanded") }));
        if (!(got.sel && got.groups.join() === "share,keep,listen,study" && got.listenOff && got.keep && got.exp === "true")) throw new Error(JSON.stringify(got));
      });
      const menu = await page.$$eval("[data-dua-menu]", (b) => b.map((x) => { const r = x.getBoundingClientRect(); return { k: x.dataset.duaMenu, label: x.textContent, h: r.height, l: r.left, r: r.right }; }));
      await check("D22 the card's menu offers Meaning and Source, in this language; The whole narration now lives inside Full text (the Owner, 7 Nov)", () => {
        const got = Object.fromEntries(menu.map((m) => [m.k, m.label]));
        if (got.meaning !== L("Meaning") || got.source !== L("Source") || "narration" in got || !got.fulltext) throw new Error(JSON.stringify(got));
      });
      await check("D22 each menu chip is small but still pressable (40px or more; the Owner, 7 Nov) and on screen", () => { if (!menu.length || menu.some((m) => m.h < 40 || m.l < 0 || m.r > width)) throw new Error(JSON.stringify(menu[0])); });
      await check("build 2 (was D22) the Menu panel sits under the top bar, above the Dua's words and its progress", async () => {
        const [w, m, p, b] = [await box("[data-dua-card] .dua-words"), await box(".dua-menu-panel"), await box("[data-dua-card] [data-dua-progress]"), await box("[data-dua-topbar]")];
        if (!w || !m || !p || !b || !(b.b <= m.t && m.b <= w.t && w.b <= p.t)) throw new Error(JSON.stringify({ b, m, w, p }));
      });

      // D23: 📖 Full text opens the dua's whole text; the one Vowels switch decides the marks.
      await check("D23 the menu offers 📖 Full text, and it opens the Arabic, the words with meanings, and closes with ✕", async () => {
        await clickMenu(page, '[data-dua-menu="fulltext"]');
        await page.waitForSelector('[data-dua-pop="fulltext"] [data-dua-fulltext]', { timeout: 8000 });
        const got = await page.$eval('[data-dua-pop="fulltext"]', (p) => ({ ar: p.querySelector(".dua-ft-ar")?.textContent.length ?? 0, marks: (p.querySelector(".dua-ft-ar")?.textContent.match(/[\u064B-\u0652\u0670]/g) || []).length, wbw: !!p.querySelector('[data-dua-ft-sec="wbw"]'), cells: p.querySelectorAll(".dua-ft-w").length }));
        if (got.ar < 5 || got.marks < 1 || !got.wbw || got.cells < 2) throw new Error(JSON.stringify(got));
        await page.click("[data-dua-pop-close]");
        await page.waitForSelector("[data-dua-pop]", { state: "detached", timeout: 5000 });
      });
      await check("D23 Full text follows the Vowels switch (off: no vowel marks in its Arabic)", async () => {
        await page.click('[data-dua-switch="vow"]');
        await clickMenu(page, '[data-dua-menu="fulltext"]');
        await page.waitForSelector('[data-dua-pop="fulltext"] .dua-ft-ar', { timeout: 8000 });
        const marks = await page.$eval('[data-dua-pop="fulltext"] .dua-ft-ar', (a) => (a.textContent.match(/[\u064B-\u0652\u0670]/g) || []).length);
        await page.click("[data-dua-pop-close]");
        await page.waitForSelector("[data-dua-pop]", { state: "detached", timeout: 5000 });
        await page.click('[data-dua-switch="vow"]'); // back on, for what follows
        if (marks !== 0) throw new Error(`${marks} marks`);
      });

      // Source pop-up, ✕ back to the Dua.
      await clickMenu(page, '[data-dua-menu="source"]');
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
      await clickMenu(page, '[data-dua-menu="source"]');
      await page.keyboard.press("Escape");
      await check("Esc closes the pop-up too", async () => { if (await page.$("[data-dua-pop]")) throw new Error("still open"); });
      await clickMenu(page, '[data-dua-menu="source"]');
      await page.mouse.click(4, 450);
      await check("a tap outside the pop-up card closes it", async () => { if (await page.$("[data-dua-pop]")) throw new Error("still open"); });

      // Meaning opens with its translation unfolded.
      await clickMenu(page, '[data-dua-menu="meaning"]');
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
        await clickMenu(page, '[data-dua-menu="source"]');
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
        await clickMenu(page, '[data-dua-menu="meaning"]');
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

/** Build 2 (7 Nov 2026): the card's menu sits under its Menu button; open it (when closed) and press the entry. */
async function clickMenu(page, selector) {
  const toggle = await page.$("[data-dua-menu-toggle]");
  if (toggle && (await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
  await page.click(selector);
}
