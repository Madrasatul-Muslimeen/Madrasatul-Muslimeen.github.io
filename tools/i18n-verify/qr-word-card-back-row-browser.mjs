// QR Lead (the Owner, 23 Oct 2026, a Word card screenshot with "← Back to Learn next" alone on a line above the card's
// ‹ 🔍 This āyah ⓘ row): "one button takes the entire row. Bring it to the below row."
// The Word card's own way back ([data-word-card-app-back], decision 90) now sits IN the card's top row, after ⓘ and
// before the word. At 1280/768/390/360, en and bn, it fails unless:
//   - the way back is inside the card's header, on the same line as ‹ (on a 320px phone, whose first row is full, on the
//     word's line, the row below), never a line of its own: the header is no taller than without it;
//   - it is a 40px target that a tap reaches, inside the card, overlapping no other control of the row;
//   - on a narrow card (a phone) it is the ← alone, 40px square, beside ⓘ; on a wide card its words show ("Back to …",
//     cut with … if long);
//   - pressing it still goes back to the previous word's card.
// Route: a Word card (rank 2 of Learn next), then its purple "Learn next" line, which offers "Back to Word Card".
//   node tools/i18n-verify/qr-word-card-back-row-browser.mjs [--mutate=own-row]      (serve.js on :8080, or QR_BASE)
//   --mutate=own-row   the way back put above the card again (content.prepend)  -> the row checks FAIL
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { "own-row": ["if (head && before) head.insertBefore(back, before); else content.prepend(back);", "content.prepend(back);"] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8")).rows;
const first = rows[1];
const S = Math.floor(first.o / 1000000), A = Math.floor((first.o % 1000000) / 1000), P = first.o % 1000;
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

for (const [w, h, lang] of [[1280, 900, "en"], [1280, 900, "bn"], [768, 1000, "en"], [390, 844, "en"], [390, 844, "bn"], [360, 740, "en"], [320, 640, "bn"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", String(S)); await page.waitForTimeout(1200);
  await setSel(page, "ayahSelect", String(A)); await page.waitForTimeout(900);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [S, A, P]);
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount .word-card-learnnext"), null, { timeout: 15000 }).catch(() => {});
  const headWord = () => page.evaluate(() => document.querySelector("#quranWordCardMount .quran-word-card")?.dataset.occurrenceId ?? "");
  const before = await headWord();
  await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-app-back]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const card = document.querySelector("#quranWordCardMount .quran-word-card"), head = card?.querySelector(":scope > header");
    const b = document.querySelector("#quranWordCardMount [data-word-card-app-back]");
    if (!card || !head || !b) return { found: false, card: !!card, head: !!head, back: !!b };
    const r = b.getBoundingClientRect(), hr = head.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const prev = head.querySelector('[data-word-card-move="previous"]').getBoundingClientRect();
    const mid = (x) => (x.top + x.bottom) / 2;
    const word = head.querySelector(".word-card-head-word").getBoundingClientRect(), info = head.querySelector(".word-card-legend-btn")?.getBoundingClientRect();
    const others = [...head.children].filter((e) => e !== b && e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect());
    const overlaps = others.filter((o) => Math.min(o.right, r.right) - Math.max(o.left, r.left) > 0.5 && Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top) > 0.5).length;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const text = b.querySelector(".word-card-app-back-text");
    const out = { found: true, inHead: head.contains(b), sameLine: Math.abs(mid(r) - mid(prev)) < 4, wordLine: Math.abs(mid(r) - mid(word)) < 12, nextToInfo: !!info && Math.abs(mid(r) - mid(info)) < 4 && r.left - info.right >= 0 && r.left - info.right < 12, narrow: card.getBoundingClientRect().width <= 480, w: Math.round(r.width), h: Math.round(r.height), headH: Math.round(hr.height), inCard: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5, overlaps, hit: !!hit && b.contains(hit), textShown: !!text && text.getBoundingClientRect().width > 0, title: b.title, label: b.textContent.trim() };
    b.style.display = "none"; out.headWithout = Math.round(head.getBoundingClientRect().height); b.style.display = "";
    return out;
  });
  check(`${tag} POSITIVE CONTROL: after "Learn next" the Word card offers its way back`, m.found, JSON.stringify(m));
  if (m.found) {
    if (w > 340) check(`${tag} the way back is in the card's top row, on ‹'s line ("${m.label}")`, m.inHead && m.sameLine, JSON.stringify(m));
    else check(`${tag} on a 320px phone it is on the row below, beside the word ("${m.label}")`, m.inHead && m.wordLine, JSON.stringify(m));
    check(`${tag} ...and adds no line: header ${m.headH}px, ${m.headWithout}px without it`, m.headH <= m.headWithout + 1, JSON.stringify(m));
    check(`${tag} a 40px target, a tap reaches it, inside the card, over no other control`, m.h >= 40 && m.w >= 40 && m.hit && m.inCard && m.overlaps === 0, JSON.stringify(m));
    if (m.narrow) check(`${tag} on a narrow card it is the ← alone, 40px square (its tip keeps the words)${w > 340 ? ", right after ⓘ" : ""}`, m.w === 40 && !m.textShown && m.title.length > 3 && (w <= 340 || m.nextToInfo), JSON.stringify(m));
    else check(`${tag} on a computer its words show`, m.textShown, JSON.stringify(m));
    await page.click("#quranWordCardMount [data-word-card-app-back]");
    let now = await headWord();
    for (let i = 0; i < 80 && now !== before; i++) { await page.waitForTimeout(100); now = await headWord(); }
    check(`${tag} pressing it goes back to the previous word's card (${before})`, !!before && now === before, `${now} vs ${before}`);
  }
  if (w === 1280 && lang === "en" || w === 390 && lang === "bn" || w === 320) {
    await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-word-card-back-${lang}-${w}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR Word card way back in its top row${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
