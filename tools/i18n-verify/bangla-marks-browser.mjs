// The Owner, 13 Nov 2026 (the Word Card): a third marking below "Word Progress" and "Mark the Word", titled "Quranic/ Arabic word in Bangla
// Language:", with three chips (In Bangla Names, In Rituals, In Daily Use; one, two or all three), reflected in the Bangla list's categories and
// the Wheel; the old "Also in Bangla" button and "Also in Bangla: word" tag are gone from the ☰ menu (the Admin's/Mine choice and the counts stay);
// the "Learn next" bar follows the Bangla marking, is titled "Learn the Next Word", says "You already know N words", and its Arabic is 30% less.
// Run from the repository root with serve.js up:  node tools/i18n-verify/bangla-marks-browser.mjs [--mutate=NAME] [--lang=en|bn] [--width=390]
//   nobnk       the page hands the card no Bangla marking                          -> the marking checks fail
//   oldmark     the menu's "Also in Bangla" button is drawn again                  -> the "gone from the menu" check fails
//   noknown     the bar never says how many words are known                        -> the known-count checks fail
//   bigarabic   the bar's Arabic is back at the Word Card's other small Arabic     -> the 44%-less check fails (UPDATED IN PLACE 15 Nov 2026: 30% less became 44% less when the Owner took another 20% off)
//   oldorder    the Learn next bar is back inside the totals box                   -> the "after the Bangla marking" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html", CARD = "app/js/quran-word-card.js", UI = "app/js/bangla-words-ui.js";
const MUT = {
  nobnk: [PAGE, "banglaMarkHtml: banglaMarkHtmlFor(word), menuOpen: wordCardMenuOpen,", "banglaMarkHtml: \"\", menuOpen: wordCardMenuOpen,"],
  oldmark: [UI, '  return `<div class="bnw" data-bangla-block>\n', '  return `<div class="bnw" data-bangla-block>\n    <button type="button" class="bnw-mark" data-bangla-word="${esc(lemma)}">Also in Bangla</button>\n'],
  noknown: [PAGE, "return row ? { word: row.l, meaning: learnNextMeaning(row), count: row.n, rank: row.r, known } : null;", "return row ? { word: row.l, meaning: learnNextMeaning(row), count: row.n, rank: row.r } : null;"],
  bigarabic: [PAGE, "  .quran-word-card .word-card-learnnext .word-card-learnnext-ar { font-size: calc(var(--wc-small-ar) * 0.56); }", ""],
  oldorder: [CARD, "    ${markLearnRowHtml}\n    ${banglaMarkHtml}\n    ${learnNextBarHtml(wbw.learnNext, text, formatNumber)}\n", "    ${markLearnRowHtml}\n    ${learnNextBarHtml(wbw.learnNext, text, formatNumber)}\n    ${banglaMarkHtml}\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 1280];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const L = { en: { title: "Quranic/ Arabic word in Bangla Language:", chips: ["In Bangla Names", "In Rituals", "In Daily Use"], bar: /Learn the Next Word/i, known: /You already know\s+([\d,]+)\s+words/ },
            bn: { title: "কুরআনি/ আরবি শব্দ বাংলা ভাষায়:", chips: ["বাংলা নামে", "ইবাদত-অনুষ্ঠানে", "দৈনন্দিন ব্যবহারে"], bar: /পরবর্তী শব্দ শিখুন/, known: /ইতোমধ্যে\s+([\d,০-৯]+)\s*টি শব্দ জানেন/ } };
// UPDATED IN PLACE (18 Nov 2026, the Owner: "Place this as a group in Word Card titled 'Already Known' ... sync the categories whatever is in the Vocab List"):
// the three Bangla chips are now the Vocab List's own categories under the group "Already Known". The tappable ones keep the stored kinds
// (rituals / bangla / names) and the handler; their titles are the groups' titles (read from the data file, not retyped) and their order is the Vocab List's.
const KG = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-known-groups.json", "utf8")).groups;
const kgTitle = (k, lang) => { const g = KG.find((x) => x.k === k); return lang === "bn" ? g.bn : g.en; };
const bnDigits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/,/g, "");

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`, W = { ...L[lang], title: lang === "bn" ? "আগে থেকেই জানা" : "Already Known", chips: ["ibadah", "daily", "bnnames"].map((k) => kgTitle(k, lang)) };
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 1100 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  // UPDATED IN PLACE 16 Nov 2026 (Architect 114L, v15.13): the banglaWords gate is ON as shipped, so a signed-in reader's marks now go to the
  // account (proved by bangla-words-account-browser.mjs). This suite proves the DEVICE path, which stays the way back, so it closes the
  // gate in memory (the repository is not changed) and throws if it cannot.
  await ctx.route("**/app/js/bangla-words-readiness.js*", async (r) => { const res = await r.fetch(); const src = await res.text(); const out = src.replace(/  ready: true,\n  decision: Object\.freeze\(\{[\s\S]*?\n  \}\),/, "  ready: false,\n  decision: null,"); if (!/\n  ready: false,\n  decision: null,/.test(out)) throw new Error("could not close the banglaWords gate in memory"); r.fulfill({ response: res, body: out }); });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const glob = file === PAGE ? "**/app/quranrevival.html*" : `**/${file.replace("app/", "")}*`;
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file === PAGE ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.waitForTimeout(700);
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(200); }
  await P.click("#tabReadBtn");
  await P.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  const occ = "quran-word-occurrence:v1:1:1:2";
  await P.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 12000 });
  await P.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
  await P.waitForSelector(".quran-word-card [data-learn-next-open]", { timeout: 15000 }).catch(() => {});
  await P.waitForTimeout(800);
  const ev = (f, a) => P.evaluate(f, a);

  // ---- the order, top to bottom: Word Progress, Mark the Word, the Bangla marking, the Learn next bar
  const lay = await ev(() => {
    const c = document.querySelector(".quran-word-card"), top = (s) => { const e = c.querySelector(s); return e && e.getClientRects().length ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
    return { states: top(".word-progress-states"), marks: top("[data-word-marks-row]"), bn: top("[data-bangla-marks]"), next: top(".word-card-learnnext") };
  });
  check(`${tag} MUTATION TARGET (nobnk): the card has the Bangla marking`, lay.bn !== null, JSON.stringify(lay));
  check(`${tag} MUTATION TARGET (oldorder): Word Progress, then Mark the Word, then the Bangla marking, then the Learn next bar, top to bottom`, [lay.states, lay.marks, lay.bn, lay.next].every((v) => v !== null) && lay.states < lay.marks && lay.marks < lay.bn && lay.bn < lay.next, JSON.stringify(lay));
  const mk = await ev(() => { const r = document.querySelector("[data-bangla-marks]"); if (!r) return null; const c = document.querySelector(".quran-word-card").getBoundingClientRect(); return { title: r.querySelector("[data-bangla-marks-title]")?.textContent.trim(), chips: [...r.querySelectorAll("[data-bangla-kind]")].map((b) => { const q = b.getBoundingClientRect(); return { text: b.textContent.trim(), kind: b.dataset.banglaKind, h: Math.round(q.height), top: Math.round(q.top), left: Math.round(q.left), right: Math.round(q.right), on: b.getAttribute("aria-pressed") === "true", off: b.disabled, cut: b.scrollWidth > b.clientWidth + 1 }; }), cardL: Math.round(c.left), cardR: Math.round(c.right) }; });
  check(`${tag} the group is titled "${W.title}"`, mk?.title === W.title, JSON.stringify(mk?.title));
  check(`${tag} the tappable chips are the Vocab List's Ebadah, Daily Life and Names in My Language groups, in its order: ${W.chips.join(" · ")}`, !!mk && mk.chips.map((c) => c.text).join("|") === W.chips.join("|") && mk.chips.map((c) => c.kind).join() === "rituals,bangla,names", JSON.stringify(mk?.chips.map((c) => c.text)));
  check(`${tag} the chips are at least 40px tall, inside the card, nothing cut (they wrap: the Vocab List titles are long)`, !!mk && mk.chips.every((c) => c.h >= 40 && c.left >= mk.cardL - 1 && c.right <= mk.cardR + 1 && !c.cut), JSON.stringify(mk?.chips));
  check(`${tag} none is pressed for a word nobody marked`, !!mk && mk.chips.every((c) => !c.on), JSON.stringify(mk?.chips));
  const all = await ev(() => [...document.querySelectorAll("[data-known-marks] [data-known-group]")].map((b) => ({ k: b.dataset.knownGroup, on: b.getAttribute("aria-pressed") === "true", tap: b.hasAttribute("data-bangla-kind") })));
  check(`${tag} the group holds the Vocab List's seven categories in its order; Allah's Names is lit for this word; only Ebadah, Daily Life and Names in My Language can be tapped`, all.map((c) => c.k).join() === "allah,prophets,people,ibadah,daily,language,bnnames" && all.find((c) => c.k === "allah")?.on === true && all.filter((c) => c.tap).map((c) => c.k).join() === "ibadah,daily,bnnames", JSON.stringify(all));

  // ---- the Learn the Next Word bar
  const bar = await ev(() => { const b = document.querySelector(".word-card-learnnext"); return b ? { text: b.innerText, title: b.querySelector(".word-card-learnnext-title")?.textContent, known: b.querySelector("[data-learn-next-known]")?.textContent ?? "" } : null; });
  check(`${tag} the bar is titled "Learn the Next Word"`, !!bar && W.bar.test(bar.title), JSON.stringify(bar));
  const k0 = bar ? W.known.exec(bar.known) : null;
  check(`${tag} MUTATION TARGET (noknown): it says "You already know N words" after the title`, !!k0, JSON.stringify(bar?.known));
  const wasKnown = k0 ? Number(bnDigits(k0[1])) : NaN;
  const ar = await ev(() => {
    const c = document.querySelector(".quran-word-card"), a = c.querySelector(".word-card-learnnext-ar");
    const probe = document.createElement("span"); probe.className = "word-card-family-who"; probe.innerHTML = '<span lang="ar">ك</span>'; c.appendChild(probe);
    const small = parseFloat(getComputedStyle(probe.querySelector("[lang=ar]")).fontSize); probe.remove();
    return { bar: a ? parseFloat(getComputedStyle(a).fontSize) : 0, small };
  });
  check(`${tag} MUTATION TARGET (bigarabic): the bar's Arabic is 44% less than the Word Card's other small Arabic -- the 13 Nov 30% less, then 20% smaller again on 15 Nov (0.7 x 0.8 = 0.56) (${ar.bar}px of ${ar.small}px)`, ar.small > 0 && Math.abs(ar.bar / ar.small - 0.56) < 0.02, JSON.stringify(ar));

  // ---- the chips save, one, two or all three, and a word with none leaves the list
  const saved = () => ev(() => { try { return JSON.parse(localStorage.getItem("mm_bangla_words.v2")); } catch { return null; } });
  const pressed = () => ev(() => [...document.querySelectorAll("[data-bangla-marks] [data-bangla-kind]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.banglaKind).join());
  const tap = async (kind) => { await P.evaluate((k) => document.querySelector(`[data-bangla-marks] [data-bangla-kind="${k}"]`)?.click(), kind); await P.waitForTimeout(350); };
  if (mk) {
    await tap("rituals");
    let s = await saved(); const lemma = Object.keys(s?.kinds?.admin ?? {})[0];
    check(`${tag} In Rituals saves the word with the kind "rituals" and shows it pressed`, !!lemma && s.kinds.admin[lemma].join() === "rituals" && (await pressed()) === "rituals", JSON.stringify(s));
    await tap("names"); await tap("bangla");
    s = await saved();
    check(`${tag} all three can be on at once (names, rituals, bangla)`, !!lemma && s.kinds.admin[lemma].join() === "names,rituals,bangla" && (await pressed()) === "rituals,bangla,names", JSON.stringify(s?.kinds));
    const bar2 = await ev(() => document.querySelector("[data-learn-next-known]")?.textContent ?? "");
    const k1 = W.known.exec(bar2);
    check(`${tag} the known count follows the vocabulary list: a Bangla word counts, ${wasKnown} -> ${k1 ? bnDigits(k1[1]) : "?"}`, !!k1 && Number(bnDigits(k1[1])) === wasKnown + 1, JSON.stringify(bar2));
    // the ☰ menu: the Admin's / Mine choice and the counts stay, the old button and tag are gone, the list is grouped by the three kinds
    await P.evaluate(() => { const m = document.querySelector("[data-word-card-menu-panel]"); if (m?.hidden) document.querySelector("[data-word-card-menu-toggle]").click(); });
    await P.waitForTimeout(300);
    const menu = await ev(() => { const b = document.querySelector("[data-word-card-menu-panel] [data-bangla-block]"); if (!b) return null; return { oldMark: !!b.querySelector(".bnw-mark"), oldTag: !!document.querySelector(".bnw-tag, [data-bangla-tag]"), oldText: [...document.querySelectorAll("[data-word-card-menu-panel] button, [data-word-card-menu-panel] span")].some((x) => /^(Also in Bangla|In Bangla|বাংলায়ও আছে|বাংলায়ও)$/.test(x.textContent.trim())), lists: [...b.querySelectorAll("[data-bangla-list]")].map((x) => x.dataset.banglaList), count: !!b.querySelector("[data-bangla-count]"), saved: !!b.querySelector("[data-bangla-saved-onoff]"), cats: [...b.querySelectorAll("[data-bangla-cat]")].map((x) => `${x.dataset.banglaCat}:${x.querySelector(".bnw-n")?.textContent}`) }; });
    check(`${tag} MUTATION TARGET (oldmark): the ☰ menu no longer has the "Also in Bangla" button or tag`, !!menu && !menu.oldMark && !menu.oldTag && !menu.oldText, JSON.stringify(menu));
    check(`${tag} ...but still has the Admin's / Mine choice, the word count and the "count as known" setting`, !!menu && menu.lists.join() === "admin,mine" && menu.count && menu.saved, JSON.stringify(menu));
    check(`${tag} ...and its list is grouped by the three kinds, the marked word under each (names:1, rituals:1, bangla:1)`, !!menu && menu.cats.join() === "names:1,rituals:1,bangla:1", JSON.stringify(menu?.cats));
    await P.evaluate(() => { const m = document.querySelector("[data-word-card-menu-panel]"); if (m && !m.hidden) document.querySelector("[data-word-card-menu-toggle]").click(); });
    await P.waitForTimeout(250);
    await tap("names"); await tap("rituals");
    check(`${tag} switching a kind off leaves the others`, (await pressed()) === "bangla" && (await saved())?.kinds?.admin?.[lemma]?.join() === "bangla", JSON.stringify(await saved()));
    await tap("bangla");
    s = await saved();
    check(`${tag} switching the last one off takes the word out of the list`, !s.admin.includes(lemma) && !(lemma in (s.kinds.admin ?? {})) && (await pressed()) === "", JSON.stringify(s));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Bangla marking, Learn the Next Word${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
