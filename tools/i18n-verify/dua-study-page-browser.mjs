// Dua module, build round R1 (PCF MSA J104): the Dua page app/dua-study.html (D19), its seven groups (D01) and their
// parts as pull-down menus (D21), numbers in every group (D02), and every Dua opening its Dua Card with ‹ › through its
// group and ← Back to the group (D04). Phone (320, 390) and computer (1280) widths, English and Bangla.
//
// The expected names are read out of groups.json and bn.js, not retyped. --mutate=<name> serves dua-study.js with one
// deliberate break; each named break must fail at least one check (run with --mutate=all to prove them all).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/dua-study-page-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const SRC = fs.readFileSync("app/js/dua-study.js", "utf8");
const BN = fs.readFileSync("app/js/i18n/bn.js", "utf8");
const DATA = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/groups.json", "utf8"));
const MUTATIONS = {
  // D02: every page of a list numbered from 1 again.
  numbers: ["const i = from + k + 1;", "const i = k + 1;"],
  // D21: the parts pull-down never drawn.
  parts: ["    if (g.parts) {\n      const cur = g.parts.find((p) => p.id === where.part);\n      const pw", "    if (false) {\n      const cur = g.parts.find((p) => p.id === where.part);\n      const pw"],
  // D04: › stays on the same Dua.
  step: ["where.open = i + 1; where.tie = null; render();", "where.tie = null; render();"],
  // D04: ← Back loses the reader's place in a long list (always page 1).
  back: ["where.lp = Math.ceil(i / PER_PAGE);", "where.lp = 1;"],
  // The way back from another page: the open Dua is not written into the address.
  address: ['if (where.open != null) u.searchParams.set("open", String(where.open));', ""],
  // D01: Rasulullah's name without Sallallahu A'laihi Wa Sallam (saw128).
  saw: ['rasul: t("Dua of Rasulullah Sallallahu A\'laihi Wa Sallam")', 'rasul: t("Dua of Rasulullah")'],
  // A Hisn dhikr's tied Dua card never opens.
  tie: ['b.addEventListener("click", () => { where.tie = e.card; render();', 'b.addEventListener("click", () => { render();'],
};
const arg = process.argv.find((a) => a.startsWith("--mutate="))?.slice(9) ?? null;

function bnValue(key) {
  const i = BN.indexOf(JSON.stringify(key) + ":");
  if (i < 0) throw new Error(`no bn key ${key}`);
  const m = /^\s*"((?:[^"\\]|\\.)*)"/.exec(BN.slice(i + JSON.stringify(key).length + 1));
  return JSON.parse(`"${m[1]}"`);
}
const digits = (s, lang) => (lang === "bn" ? String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(s));
const NAMES = ["Dua by Occasions", "Dua by Hadith Books", "Dua of Prophets", "Dua of Rasulullah Sallallahu A'laihi Wa Sallam", "Dua of the Sahaba", "Dua of the Salaf", "Dua of the Ulama"];
const group = (id) => DATA.groups.find((g) => g.id === id);

async function run(mutation) {
  let passed = 0, failed = 0;
  const check = async (name, fn) => {
    try { const r = await fn(); if (r && typeof r.then === "function") throw new Error("a promise"); passed++; if (!mutation) console.log(`  PASS  ${name}`); }
    catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
  };
  const acheck = async (name, fn) => {
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
    console.log("\n===== the data (groups.json) =====");
    await check("positive control: the seven groups, in order", () => { if (DATA.groups.map((g) => g.id).join() !== "occasions,books,prophets,rasul,sahaba,salaf,ulama") throw new Error(DATA.groups.map((g) => g.id).join()); });
    await check("Occasions: 15 parts holding all 302 Hisn al-Muslim adhkār", () => { const o = group("occasions"); if (o.parts.length !== 15 || o.parts.reduce((s, p) => s + p.items.length, 0) !== 302) throw new Error("count"); });
    await check("Hadith Books: the 11 books, each listing duas narrated in it", () => { const b = group("books"); if (b.parts.length !== 11 || b.parts.some((p) => !p.items.length)) throw new Error("count"); });
    await check("Rasulullah: all 3,126 Dua cards, most narrated first", () => { if (DATA.duas.length !== 3126 || DATA.duas.some((r, i) => i && r[2] > DATA.duas[i - 1][2])) throw new Error("order"); });
    await check("every Hisn tie names a real Dua card", () => { const ns = new Set(DATA.duas.map((r) => r[0])); for (const p of group("occasions").parts) for (const it of p.items) if (it.card && !ns.has(it.card)) throw new Error(it.h); });
    await check("Sahaba, Salaf and Ulama start empty (J104 tick 6)", () => { if (["sahaba", "salaf", "ulama"].some((id) => group(id).items.length)) throw new Error("not empty"); });
    await check("the data file credits Hisn al-Muslim's MIT licence", () => { if (!DATA.credits.some((c) => /HisnElMuslim, MIT/.test(c))) throw new Error("no credit"); });
  }

  const browser = await chromium.launch();
  for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280], ["en", 320]]) {
    if (!mutation) console.log(`\n===== the Dua page (${lang}, ${width}px) =====`);
    const L = (k) => (lang === "bn" ? bnValue(k) : k);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    await ctx.route(/\/app\/js\/dua-study\.js(\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: src }));
    // A step that cannot be taken (a button missing because of a break) stops this width's walk and counts as a failure.
    try {
    const { page } = await openPage(ctx, "/app/dua-study.html");
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForSelector("[data-dua-no]", { timeout: 20000 }).catch(() => {});
    const rows = () => page.$$eval("[data-dua-no]", (r) => r.map((b) => ({ no: b.querySelector(".dua-row-no").textContent, meta: b.querySelector(".dua-row-meta").textContent })));
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

    const first = await rows();
    await check("it opens on Rasulullah's group, numbered 1 to 50", () => { if (first.length !== 50 || first[0].no !== digits(1, lang) || first[49].no !== digits(50, lang)) throw new Error(JSON.stringify(first.slice(0, 2))); });
    await check("row 1 is Dua 1, row 2 Dua 2 (most narrated first)", () => { if (!first[0].meta.startsWith(L("Dua {n}").replace("{n}", digits(1, lang))) || !first[1].meta.startsWith(L("Dua {n}").replace("{n}", digits(2, lang)))) throw new Error(first[0].meta); });
    await check("nothing sticks out past the screen's right edge", async () => { const o = await overflow(); if (o > 0) throw new Error(`${o}px`); });

    await page.click("[data-dua-list-next]").catch(() => {});
    await page.waitForFunction(() => document.querySelector("[data-dua-no]")?.dataset.duaNo === "51", null, { timeout: 5000 }).catch(() => {});
    const second = await rows();
    await check("Next: the list goes on at 51, not 1 again", () => { if (second[0]?.no !== digits(51, lang)) throw new Error(second[0]?.no); });

    // D21: the groups pull-down.
    await page.click('[data-dua-pd="groups"]');
    const menu = await page.$$eval("[data-dua-group]", (b) => b.map((x) => { const r = x.getBoundingClientRect(); return { label: x.querySelector(".dua-pull-label").textContent, h: r.height, l: r.left, r: r.right }; }));
    await check("the groups pull-down lists the seven groups, in order, in this language", () => { if (menu.map((m) => m.label).join("|") !== NAMES.map(L).join("|")) throw new Error(menu.map((m) => m.label).join("|")); });
    await check("each group in the pull-down is finger-sized (44px) and on screen", () => { if (menu.some((m) => m.h < 44 || m.l < 0 || m.r > width)) throw new Error(JSON.stringify(menu[0])); });
    await page.keyboard.press("Escape");
    await check("Esc closes the pull-down", async () => { if (await page.$("[data-dua-group]")) throw new Error("still open"); });

    // Empty groups say why.
    await page.click('[data-dua-pd="groups"]');
    await page.click('[data-dua-group="sahaba"]');
    await check("an empty group says in words why it is empty", async () => { const t = await page.$eval("[data-dua-empty]", (e) => e.textContent).catch(() => ""); if (!/[a-zA-Zঀ-৿]{3}/.test(t)) throw new Error(t); });

    // D21 parts, D02 numbers, D04 the card.
    await page.click('[data-dua-pd="groups"]');
    await page.click('[data-dua-group="occasions"]');
    await page.waitForSelector('[data-dua-pd="parts"]', { timeout: 3000 }).catch(() => {});
    await page.click('[data-dua-pd="parts"]', { timeout: 3000 }).catch(() => {});
    const parts = await page.$$eval(".dua-pull [data-dua-part]", (b) => b.map((x) => x.dataset.duaPart));
    await check("Occasions has a second pull-down with its 15 parts", () => { if (parts.length !== 15) throw new Error(`${parts.length}`); });
    if (parts.length) await page.click('.dua-pull [data-dua-part="wake"]');
    else await page.click('[data-dua-part="wake"]');
    await page.waitForSelector("[data-dua-no]");
    const wake = group("occasions").parts.find((p) => p.id === "wake");
    const wakeRows = await rows();
    await check(`Waking and sleeping lists its ${wake.items.length} adhkār, numbered 1 to ${wake.items.length}`, () => { if (wakeRows.length !== wake.items.length || wakeRows.some((r, i) => r.no !== digits(i + 1, lang))) throw new Error(`${wakeRows.length}`); });
    await page.click('[data-dua-no="2"]');
    await page.waitForSelector("[data-dua-hisn]");
    await check("row 2 opens dhikr 2 in its card, '2 of n'", async () => { const p = await page.$eval("[data-dua-card-pos]", (e) => e.dataset.duaCardPos); const h = await page.$eval("[data-dua-hisn]", (e) => e.dataset.duaHisn); if (p !== `2/${wake.items.length}` || h !== wake.items[1].h) throw new Error(`${p} ${h}`); });
    await check("the open Dua is kept in the page's address (the way back from another page)", () => { const u = new URL(page.url()); if (u.searchParams.get("g") !== "occasions" || u.searchParams.get("part") !== "wake" || u.searchParams.get("open") !== "2") throw new Error(page.url()); });
    await page.click("[data-dua-card-next]");
    await check("› goes to the next dhikr of the group", async () => { const h = await page.$eval("[data-dua-hisn]", (e) => e.dataset.duaHisn); if (h !== wake.items[2].h) throw new Error(h); });
    await page.click("[data-dua-card-prev]");
    await page.click("[data-dua-card-prev]");
    await check("‹ goes back, and stops at the first", async () => { const d = await page.$eval("[data-dua-card-prev]", (e) => e.disabled); const h = await page.$eval("[data-dua-hisn]", (e) => e.dataset.duaHisn); if (!d || h !== wake.items[0].h) throw new Error(`${d} ${h}`); });
    const back = await page.$eval("[data-dua-card-back]", (e) => e.textContent);
    await check("← Back names the part it returns to, in this language", () => { if (back !== L("← Back to {name}").replace("{name}", lang === "bn" ? wake.bn : wake.en)) throw new Error(back); });
    // A tie: a dhikr whose dua is a Dua card.
    const tied = wake.items.findIndex((x) => x.card);
    if (tied >= 0) {
      for (let k = 0; k < tied; k++) await page.click("[data-dua-card-next]");
      await page.click("[data-dua-tie]");
      await page.waitForSelector("[data-dua-card]", { timeout: 20000 }).catch(() => {});
      await check("a dhikr's 'same dua in the Hadith books' opens that Dua card", async () => { const n = await page.$eval("[data-dua-card]", (e) => e.dataset.duaCard).catch(() => null); if (n !== String(wake.items[tied].card)) throw new Error(n); });
      await page.click("[data-dua-card-back]");
      await check("← Back returns to the very dhikr", async () => { const h = await page.$eval("[data-dua-hisn]", (e) => e.dataset.duaHisn).catch(() => null); if (h !== wake.items[tied].h) throw new Error(h); });
    }
    await page.click("[data-dua-card-back]");
    await check("← Back returns to the list", async () => { if (!(await page.$("[data-dua-no]"))) throw new Error("no list"); });

    // Back from deep in a long list lands on the same page of the list.
    await page.goto(new URL("/app/dua-study.html?g=rasul&open=73", page.url()).href);
    await page.waitForSelector("[data-dua-card]", { timeout: 20000 }).catch(() => {});
    await check("an address naming a Dua opens its card (Rasulullah's 73rd)", async () => { const p = await page.$eval("[data-dua-card-pos]", (e) => e.dataset.duaCardPos).catch(() => null); if (p !== "73/3126") throw new Error(p); });
    await page.click("[data-dua-card-back]").catch(() => {});
    await check("← Back from the 73rd lands on the list page holding it, with it focused", async () => { const f = await page.evaluate(() => document.activeElement?.dataset?.duaNo ?? null); if (f !== "73") throw new Error(f); });
    // The Word card's way back (decision 90): ?view=dua&duaPage=<p>&dua=<n>.
    await page.goto(new URL("/app/dua-study.html?view=dua&duaPage=1&dua=4", page.url()).href);
    await page.waitForSelector("[data-dua-card]", { timeout: 20000 }).catch(() => {});
    await check("the Word card's way back (?view=dua&dua=4) reopens Dua 4's card", async () => { const n = await page.$eval("[data-dua-card]", (e) => e.dataset.duaCard).catch(() => null); if (n !== "4") throw new Error(n); });
    await check("the Dua card's own progress row shows", async () => { if (!(await page.$("[data-dua-progress]"))) throw new Error("none"); });

    // Prophets: the āyah opens in Quran Study with ← Back.
    await page.goto(new URL("/app/dua-study.html?g=prophets&open=1", page.url()).href);
    await page.waitForSelector("[data-dua-quran]", { timeout: 20000 }).catch(() => {});
    await check("a Prophet's dua opens in Quran Study at its āyah, with ← Back", async () => { const h = await page.$eval(".dua-quran-open", (a) => a.getAttribute("href")).catch(() => ""); if (h !== `./quranrevival.html?goto=${group("prophets").items[0].ref}&back=1`) throw new Error(h); });
    await check("the card's controls are finger-sized (40px) and nothing sticks out", async () => {
      const b = await page.$$eval(".dua-card-bar button, .dua-quran-open", (x) => x.map((e) => e.getBoundingClientRect().height));
      if (b.some((h) => h < 40) || (await overflow()) > 0) throw new Error(JSON.stringify(b));
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
console.log(`\n==== Dua page (D19, D01, D21, D02, D04): ${r.passed} passed, ${r.failed} failed ====`);
process.exit(r.failed ? 1 : 0);
