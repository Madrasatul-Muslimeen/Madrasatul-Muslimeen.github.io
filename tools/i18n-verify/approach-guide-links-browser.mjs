// PCF J20 (the Owner, 12 Oct 2026, approved draft): Approach 1 (Reading with Tajweed) points self-learners to Shaykh
// Abdullah Basfar's tartil on Archive.org -- the recitation this app plays. The Approach card's Guide tab now turns
// each https:// address in a guide into a link that opens in a new tab (the Approach card stays where it was), while
// everything else in the text stays escaped.
// Run from the repository root with serve.js running (QR_BASE/BASE). Mutations (--mutate=NAME) must each FAIL:
//   nolink    the guide text escaped only, as before      -> the link checks fail
//   noescape  the guide text inserted raw                 -> "stays escaped" fails
//   punct     a trailing full stop kept inside the link   -> "href exact" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nolink: ["return escapeHtml(s).replace(", "return escapeHtml(s); (\"\").replace("],
  noescape: ["return escapeHtml(s).replace(", "return (s ?? \"\").replace("],
  punct: ['[^\\s<>"]+[^\\s<>".,;:)]/g', '[^\\s<>"]+/g'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// The template (for a new madrasah): the approved English line, after the original sentence, unchanged.
const t1 = APPROACH_TEMPLATES.find((t) => t.id === "approach_01");
check("template: approach_01 is still Reading (with Tajweed)", t1?.name?.en === "Reading (with Tajweed)", JSON.stringify(t1?.name));
check("template: the original How sentence is kept, word for word", t1?.guide?.how?.en?.startsWith("Read aloud from the mushaf, applying each tajweed rule as it appears; use the audio and repeat/loop tools to match a reciter. "));
check("template: the approved self-learning line follows it", t1?.guide?.how?.en?.endsWith("To learn on your own: listen to Shaykh Abdullah Basfar's tartīl, āyah by āyah (the recitation this app plays, from Archive.org: https://archive.org/details/abdullah-ali-basfar.ayahbyayah), then read the same āyah aloud and compare."));

const URL = "https://archive.org/details/abdullah-ali-basfar.ayahbyayah";
const SEED = `
DATA.records.push({ _id: TENANT_ID + "__p1__surah_1", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_1", entries: {} });
(function () { const m = DATA.trackables.find((t) => String(t._id).endsWith("__memorise"));
  m.guide = { what: { en: "What it is <b>bold</b>", bn: "এটি কী <b>bold</b>" },
    how: { en: "How to do it. Listen (from Archive.org: ${URL}), then read.", bn: "কীভাবে করবেন। শুনুন (Archive.org: ${URL}), তারপর পড়ুন।" },
    measure: { en: "How to measure. See ${URL}.", bn: "কীভাবে মাপবেন। দেখুন ${URL}." } }; })();`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, height] of [["en", 390, 844], ["bn", 390, 844], ["en", 1280, 800]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/js/way-modal.js*", async (r) => { const src = fs.readFileSync("app/js/way-modal.js", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  await page.waitForFunction(() => document.querySelector('#wheelContainer .wheel-seg[data-key="memorise"]'));
  await page.$eval('#wheelContainer .wheel-seg[data-key="memorise"]', (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForSelector('.rnp-track .way-tab-btn[data-tab="Guide"]', { timeout: 8000 });
  await page.click('.rnp-track .way-tab-btn[data-tab="Guide"]'); await page.waitForTimeout(200);
  const g = await page.evaluate(() => {
    const p = document.querySelector('.rnp-track .way-tab-panel[data-tab="Guide"]');
    const links = [...(p?.querySelectorAll("a") ?? [])].map((a) => { const r = a.getBoundingClientRect(); return { href: a.getAttribute("href"), text: a.textContent, target: a.target, rel: a.rel, inside: r.left >= 0 && r.right <= innerWidth + 0.5 && r.width > 0 }; });
    return { text: p?.textContent ?? "", links, bold: !!p?.querySelector("b"), over: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${tag} positive control: the Guide tab shows the seeded guide`, /Archive\.org/.test(g.text), g.text.slice(0, 120));
  check(`${tag} each address in How and Measure is a link (2)`, g.links.length === 2, JSON.stringify(g.links));
  check(`${tag} ...href exact, no trailing ")" or "." inside it`, g.links.length === 2 && g.links.every((l) => l.href === URL && l.text === URL), JSON.stringify(g.links));
  check(`${tag} ...opens in a new tab (target _blank, rel noopener), so the card stays where it was`, g.links.length === 2 && g.links.every((l) => l.target === "_blank" && /noopener/.test(l.rel)), JSON.stringify(g.links));
  check(`${tag} ...inside the screen, and no sideways scroll`, g.links.length === 2 && g.links.every((l) => l.inside) && g.over <= 0, JSON.stringify({ links: g.links, over: g.over }));
  check(`${tag} the rest of the text stays escaped (no <b> element made from the guide)`, !g.bold && g.text.includes("<b>bold</b>"), g.text.slice(0, 80));
  check(`${tag} the punctuation around the link is kept as text`, /\(.*Archive\.org: https:\/\/archive\.org\/details\/abdullah-ali-basfar\.ayahbyayah\)/.test(g.text) && g.text.includes(`${URL}.`), g.text);
  check(`${tag} no page errors`, errors.length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Approach guide links (PCF J20): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
