// Keys to Understanding K1 Part A (PCF MSA J03): the Hadith Word Card, checked on the real HadeethEnc card 65070
// (Bukhari 3199, the demo's hadith). Roots come from the Qur'an data (tools/hadith-data-pull/hadith-word-roots.mjs).
//   - "Words" is a switch on the card; NOTHING is fetched until it is pressed (I9);
//   - every Arabic word becomes a button; a word with a root in the Qur'an is a link into QR's Word card with back=1,
//     any other word opens the five-level sheet; particles (عن, من, حتى) never pose as a rooted word;
//   - the sheet has the five levels, says plainly where there is no data, closes with ← Back (focus returns to the word)
//     and with Esc; and fits 360-1440px in English and Bangla at 100/150/200% text.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  noroot: ["js/hadith-word-card.js", "const hit = quranRootOf(forms, tok.norm);", "const hit = null;"],
  alwaysroot: ["js/hadith-word-card.js", "const hit = quranRootOf(forms, tok.norm);", "const hit = { root: \"x\", ref: \"1:1:1\", via: \"exact\" };"],
  noback: ["js/hadith-word-card.js", "node.href = qrWordHref(hit.ref, id);", "node.href = qrWordHref(hit.ref, id).replace(\"&back=1\", \"\");"],
  eager: ["js/hadith-word-card.js", "  const list = el(\"div\", \"hwc-list\"); list.hidden = true;", "  const list = el(\"div\", \"hwc-list\"); list.hidden = true; getForms().catch(() => {});"],
  nofocus: ["js/hadith-word-card.js", "onClose: () => node.focus() }", "onClose: () => {} }"],
  noesc: ["js/hadith-word-card.js", "if (e.key === \"Escape\") close();", ""],
  nodatamsg: ["js/hadith-word-card.js", "t(\"Relatives of this word in other hadith are not listed yet.\")", "\"\""],
  qgreen: ["css/hadith.css", "[data-card-look=\"night\"] .hwc-chip.hwc-q { border-color: #7fd3b8; color: #7fd3b8; }", "[data-card-look=\"night\"] .hwc-chip.hwc-q { border-color: #1F6E5A; color: #1F6E5A; }"],
  inkchip: ["css/hadith.css", "color: var(--card-text, var(--hadith-ink)); font: inherit; font-size: 1.15rem;", "color: var(--hadith-ink); font: inherit; font-size: 1.15rem;"],
  inkswitch: ["css/hadith.css", "color: var(--card-text, var(--hadith-ink)); font: inherit; font-weight: 600;", "color: var(--hadith-ink); font: inherit; font-weight: 600;"],
  smallchip: ["css/hadith.css", ".hwc-chip { min-height: 40px; min-width: 40px;", ".hwc-chip { min-height: 20px; min-width: 20px;"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim(); const ff = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-word-card mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(lang, width, zoom = 1) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const formsFetched = { n: 0 };
  ctx.on("request", (rq) => { if (rq.url().includes("quran-forms.json")) formsFetched.n++; });
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
  if (zoom !== 1) await page.evaluate((z) => { document.documentElement.style.fontSize = `${16 * z}px`; }, zoom);
  await page.waitForSelector('[data-hwc-words="65070"]', { timeout: 25000 }).catch(() => {});
  return { ctx, page, errors, formsFetched };
}
const noSideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const kinds = (p) => p.$$eval("[data-hwc-kind]", (ns) => ns.map((n) => ({ k: n.dataset.hwcKind, text: n.textContent.replace(/[\s↗]+/g, " ").trim(), href: n.getAttribute("href") || "", h: n.getBoundingClientRect().height, w: n.getBoundingClientRect().width })));

for (const [lang, width, zoom] of [["en", 1280, 1], ["bn", 390, 1], ["en", 360, 2], ["bn", 360, 1.5]]) {
  const tag = `[${lang} ${width}px x${zoom}]`;
  console.log(`\n===== hadith word card ${tag} =====`);
  const { ctx, page: P, errors, formsFetched } = await open(lang, width, zoom);
  check(`${tag} the card has a Words switch`, !!(await P.$('[data-hwc-words="65070"] .hwc-switch')));
  check(`${tag} nothing is fetched until it is pressed (I9)`, formsFetched.n === 0, `fetches ${formsFetched.n}`);
  const label = await P.$eval(".hwc-switch", (b) => b.textContent.trim()).catch(() => "");
  if (lang === "bn") check(`${tag} the switch reads in Bangla`, label.startsWith("শব্দ"), label);
  await P.click(".hwc-switch");
  await P.waitForSelector("[data-hwc-kind]", { timeout: 15000 }).catch(() => {});
  const ks = await kinds(P);
  check(`${tag} one button per Arabic word (66)`, ks.length === 66, String(ks.length));
  check(`${tag} the form index was fetched once`, formsFetched.n === 1, String(formsFetched.n));
  const byText = (s) => ks.filter((x) => x.text === s);
  check(`${tag} الشمس (root شمس) is a link into QR's Word card`, byText("الشمس")[0]?.k === "q" && /quranrevival\.html\?word=\d+:\d+:\d+&back=1/.test(byText("الشمس")[0].href), JSON.stringify(byText("الشمس")[0]));
  check(`${tag} every Qur'an link carries back=1 (the way back)`, ks.filter((x) => x.k === "q").every((x) => x.href.includes("&back=1")) && ks.some((x) => x.k === "q"));
  for (const particle of ["عن", "من", "حتى", "أتدري"]) check(`${tag} ${particle} opens the Hadith Word Card, not the Qur'an`, byText(particle).length > 0 && byText(particle).every((x) => x.k === "h"), JSON.stringify(byText(particle)[0]));
  // Rendered contrast against the REAL background (the Hadith card's own face), in each card look (a palette belongs to a surface).
  for (const look of ["default", "night", "light"]) {
    if (look !== "default") await P.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
    const ratios = await P.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (n) => { for (let e = n; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
      const ratio = (n) => { const f = parse(getComputedStyle(n).color), b = bgOf(n.parentElement); const [x, y] = [lum(f), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
      const one = (sel) => { const n = document.querySelector(sel); return n ? ratio(n) : 0; };
      return { q: one(".hwc-chip.hwc-q"), h: one(".hwc-chip.hwc-h"), sw: one(".hwc-switch"), key: one(".hwc-key") };
    });
    for (const [what, r] of Object.entries(ratios)) check(`${tag} [${look} look] ${what === "q" ? "a Qur'an chip" : what === "h" ? "a Hadith chip" : what === "sw" ? "the Words switch" : "the key line"} reads on the card (>= 4.5:1)`, r >= 4.5, String(r));
  }
  await P.evaluate(() => document.documentElement.removeAttribute("data-card-look"));
  check(`${tag} chips are at least 40px tall`, ks.every((x) => x.h >= 39.5), String(Math.min(...ks.map((x) => x.h))));
  check(`${tag} no sideways scroll`, (await noSideways(P)) <= 0, String(await noSideways(P)));
  // the sheet, on ويوشك (HadeethEnc glosses يوشك)
  await P.click('[data-hwc-kind="h"]:has-text("ويوشك")', { timeout: 8000 }).catch(() => {});
  const opened = await P.waitForSelector("[data-hwc-sheet]", { timeout: 8000 }).then(() => true).catch(() => false);
  check(`${tag} a non-Qur'an word opens the sheet`, opened);
  if (opened) {
    check(`${tag} five levels`, (await P.$$(".hwc-tab")).length === 5);
    check(`${tag} WbW shows HadeethEnc's gloss (يقرب), sourced`, /يقرب/.test(await P.$eval(".hwc-host", (n) => n.textContent)), await P.$eval(".hwc-host", (n) => n.textContent.slice(0, 80)));
    check(`${tag} the card says it is a draft`, await P.$eval(".hwc-draft", (n) => n.textContent.length > 10));
    for (const [i, why] of [[1, "root"], [2, "relatives"], [3, "forms"]]) {
      await P.click(`.hwc-tab[data-level="${i}"]`);
      check(`${tag} level ${i} (${why}) says plainly what is missing`, (await P.$$eval(".hwc-nodata", (ns) => ns.length > 0 && ns.every((n) => n.textContent.trim().length > 15))));
    }
    await P.click('.hwc-tab[data-level="4"]');
    check(`${tag} Depth marks the word in its sentence`, (await P.$$(".hwc-here")).length === 1);
    const box = await P.$eval(".hwc-sheet", (n) => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, w: document.documentElement.clientWidth }; });
    check(`${tag} the sheet fits the screen`, box.l >= -0.5 && box.r <= box.w + 0.5, JSON.stringify(box));
    check(`${tag} the sheet does not scroll sideways`, await P.$eval(".hwc-sheet", (n) => n.scrollWidth <= n.clientWidth + 1));
    const tabH = await P.$$eval(".hwc-tab, .hwc-back", (ns) => Math.min(...ns.map((n) => n.getBoundingClientRect().height)));
    check(`${tag} tabs and ← Back are at least 40px tall`, tabH >= 39.5, String(tabH));
    await P.screenshot({ path: `${process.env.SHOTS || "."}/hwc-${lang}-${width}-${zoom}.png` }).catch(() => {});
    await P.click(".hwc-back");
    check(`${tag} ← Back closes the sheet`, !(await P.$("[data-hwc-sheet]")));
    check(`${tag} ...and focus returns to the word`, await P.evaluate(() => document.activeElement?.dataset?.hwcKind === "h" && /ويوشك/.test(document.activeElement.textContent)));
    await P.click('[data-hwc-kind="h"]:has-text("ويوشك")');
    await P.waitForSelector("[data-hwc-sheet]");
    await P.keyboard.press("Escape");
    check(`${tag} Esc closes it too`, !(await P.$("[data-hwc-sheet]")));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-word-card: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
