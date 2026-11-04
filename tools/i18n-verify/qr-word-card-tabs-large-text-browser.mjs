// QR Lead, 31 Oct 2026 (Word card at large text, handover D item 2a): the five level tabs. Measured on main v13.03 with this
// suite's probe: below 600px the five shared one row as equal cells with overflow-wrap:anywhere, so at 150/200% on a phone
// the names broke INSIDE the word ("Fa / mily", "De / pth", "তাস / রীফ"; at 320x640 200% all five); from 600px the small
// line under each name was cut at 150/200% ("Root where it c…" 196px in 136 at 768x1024 200%). Now a tab is never narrower
// than its longest word and the row wraps only when the words cannot share one line; under an 11.5rem card (a phone at
// 200%) the rows are three and two; the small line may take two lines. At ordinary text nothing moves.
//   node tools/i18n-verify/qr-word-card-tabs-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE; repo root)
//   no-minw   tabs may shrink below their longest word -> "no name breaks inside a word" FAILS at 150/200% on phones
//   no-sub    the small line cannot wrap               -> "the small line is not cut" FAILS at 768/740 150/200%
//   no-three  no three-and-two rows                    -> "three and two" FAILS at 360/390 200% (four and one)
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-minw": ['    .quran-word-card [role="tab"] { min-width: min-content; overflow-wrap: normal; }\n', "", 1],
  "no-sub": ["  .word-card-tab-sub { white-space: normal; overflow-wrap: normal; }\n", "", 1],
  "no-three": ['  @container wordcard (max-width: 11.5rem) { .quran-word-card [role="tab"] { flex-basis: 28%; } }\n', "", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// Recorded on unfixed main v13.03 at 100%: one row of five equal tabs, this wide (en and bn alike).
const PLAIN = { 320: 57, 360: 65, 390: 71, 414: 76, 768: 145, 740: 139, 1280: 234 };
const browser = await chromium.launch();
const VIEWS = [[320, 640], [360, 740], [390, 844], [414, 896], [768, 1024], [740, 360], [1280, 800]];
const seen = { broken: 0, sub: 0 };
for (const lang of ["en", "bn"]) for (const [w, h] of VIEWS) for (const size of ["100%", "150%", "200%"]) {
  const tag = `${lang} ${w}x${h} ${size}`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const res = await r.fetch(); let body = await res.text(); const [from, to, n] = MUT[MUTATE];
    const c = body.split(from).length - 1; if (c !== n) throw new Error(`mutation ${MUTATE}: anchor found ${c} times, not ${n}`);
    r.fulfill({ response: res, body: body.split(from).join(to) });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m.checked) { m.checked = false; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector("#readView [data-word-occurrence]")?.click());
  await page.waitForFunction(() => document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const list = document.querySelector('#quranWordCardMount [role="tablist"]'); if (!list) return null;
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const tabs = [...list.querySelectorAll('[role="tab"]')].map((t) => {
      const nm = t.querySelector(".word-card-tab-name"), sub = t.querySelector(".word-card-tab-sub");
      // a word is broken when its own range has more than one line box
      const broken = []; const tn = nm.firstChild; const txt = tn ? tn.textContent : "";
      let i = 0; for (const word of txt.split(/(\s+)/)) { if (word.trim()) { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + word.length); const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top))); if (tops.size > 1) broken.push(word); } i += word.length; }
      const subCut = sub && sub.getClientRects().length ? (sub.scrollWidth > sub.clientWidth + 1 || R(sub).right > R(t).right + 1 || R(sub).left < R(t).left - 1) : false;
      return { n: txt, w: Math.round(R(t).width), top: Math.round(R(t).top), broken, subCut, sub: sub && sub.getClientRects().length ? `${sub.scrollWidth}/${sub.clientWidth}` : "" };
    });
    const card = list.closest(".quran-word-card") || list.parentElement;
    return { cardW: Math.round(R(list).width), cardRem: +(R(list).width / fs).toFixed(1), rows: new Set(tabs.map((t) => t.top)).size, tabs };
  });
  check(`${tag}: POSITIVE CONTROL the five level tabs are shown, and the word-break probe reads their names`, !!m && m.tabs.length === 5 && m.tabs.every((t) => t.n.length > 1), JSON.stringify(m));
  if (!m) { await ctx.close(); continue; }
  const broken = m.tabs.filter((t) => t.broken.length), cut = m.tabs.filter((t) => t.subCut), right = Math.max(...m.tabs.map((t) => t.w));
  check(`${tag}: no tab name breaks inside a word`, broken.length === 0, JSON.stringify(broken));
  check(`${tag}: the small line under a name is not cut`, cut.length === 0, JSON.stringify(cut));
  check(`${tag}: the tabs stay inside the card`, m.tabs.every((t) => t.w <= m.cardW + 1), `${right} in ${m.cardW}`);
  if (size === "100%") check(`${tag}: nothing moves at ordinary text (one row of five, ${PLAIN[w]}px each)`, m.rows === 1 && m.tabs.every((t) => Math.abs(t.w - PLAIN[w]) <= 1), `${m.rows} rows ${m.tabs.map((t) => t.w)}`);
  if (m.rows > 1) { const tops = m.tabs.map((t) => t.top); check(`${tag}: two rows wrap as three and two`, m.rows === 2 && tops[0] === tops[2] && tops[3] === tops[4] && tops[3] > tops[2], `${m.rows} rows ${tops}`); }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
