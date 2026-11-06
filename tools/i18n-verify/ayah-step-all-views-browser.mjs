// PCF MSA J114 (the Owner, 6 Nov 2026): "Place these three buttons under one, and place nav buttons for next / prev Ayah in all 3 views."
//   1. English / Bangla / WbW sit behind ONE "Show ▾" button below 900px (a 600px tablet included); open bar from 900px.
//   2. ◂ ▸ (#prevAyahBtn / #nextAyahBtn) are on the bar in the Reading View and the Mushaf, and move along the page:
//      Reading View -> the next / previous āyah row comes to the top; Mushaf -> the next / previous end marker is brought into view.
// At 360, 600, 768, 1280. --mutate=hidden keeps the old "hidden in a flow" rule -> FAIL.   Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=hidden");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const box = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); if (!e) return null; const r = e.getBoundingClientRect(); const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; return { w: Math.round(r.width), h: Math.round(r.height), hidden: e.hidden, disabled: e.disabled, inView: r.left >= 0 && r.right <= innerWidth, hit: !!hit && e.contains(hit) }; }, id);
for (const width of [360, 600, 768, 1280]) {
  const tag = `[${width}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = "prevAyahBtn.hidden = usesFlow ? false : duplicatesUnitNav;"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, "prevAyahBtn.hidden = duplicatesUnitNav || usesFlow;") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(600);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  // ---- Reading View
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)) break; await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  await page.waitForSelector(".meaning-ayah", { timeout: 15000 }).catch(() => {});
  const slot = await page.evaluate(() => { const s = document.getElementById("readMeaningLayersSlot"); const mb = s?.querySelector("[data-ml-menu]"); const lab = [...(s?.querySelectorAll("label") ?? [])].map((l) => l.getBoundingClientRect().width); return { btn: !!mb && mb.getBoundingClientRect().width > 0, labelsShown: lab.filter((w) => w > 0).length }; });
  if (width < 900) check(`${tag} the three layer switches are folded under ONE "Show ▾" button`, slot.btn && slot.labelsShown === 0, JSON.stringify(slot));
  else check(`${tag} from 900px the three stand open on the bar, no "Show" button`, !slot.btn && slot.labelsShown === 3, JSON.stringify(slot));
  const nb = await box(page, "nextAyahBtn"), pb = await box(page, "prevAyahBtn");
  check(`${tag} Reading View: ◂ ▸ are on the bar, ≥ 36px, on screen and really under the finger`, !!nb && !!pb && !nb.hidden && !pb.hidden && nb.w >= 36 && pb.w >= 36 && nb.inView && pb.inView && nb.hit && pb.hit, JSON.stringify({ nb, pb }));
  const topKey = () => page.evaluate(() => { const items = [...document.querySelectorAll("#pageViewContainer .meaning-ayah")]; const root = document.getElementById("readScroll"); const t = root.getBoundingClientRect().top; return ([...items].reverse().find((e) => e.getBoundingClientRect().top <= t + 120) ?? items[0])?.dataset.meaningKey; });
  const k0 = await topKey();
  await page.click("#nextAyahBtn"); await page.waitForTimeout(1500);
  const k1 = await topKey();
  await page.click("#nextAyahBtn"); await page.waitForTimeout(1500);
  const k2 = await topKey();
  await page.click("#prevAyahBtn"); await page.waitForTimeout(1500);
  const k3 = await topKey();
  const n = (k) => Number(String(k).split(":")[1]);
  check(`${tag} Reading View: ▸ brings the next āyah to the top (twice), ◂ goes back one`, n(k1) === n(k0) + 1 && n(k2) === n(k0) + 2 && n(k3) === n(k0) + 1, JSON.stringify({ k0, k1, k2, k3 }));
  // ---- Mushaf
  await page.click("#readMeaningBtn"); await page.waitForTimeout(1300);
  for (let i = 0; i < 3 && !(await page.evaluate(() => document.getElementById("mushafToggle")?.checked)); i++) { await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  const isM = await page.evaluate(() => !!document.getElementById("mushafToggle")?.checked);
  check(`${tag} reached the Mushaf`, isM);
  if (isM) {
    await page.waitForSelector("#pageViewContainer [data-ayah-marker]", { timeout: 15000 }).catch(() => {});
    const mb2 = await box(page, "nextAyahBtn");
    check(`${tag} Mushaf: ◂ ▸ are on the bar and under the finger`, !!mb2 && !mb2.hidden && mb2.hit && mb2.inView, JSON.stringify(mb2));
    await page.evaluate(() => document.getElementById("readScroll")?.scrollTo(0, 0));
    await page.click("#nextAyahBtn"); await page.waitForTimeout(250);
    const hit = await page.evaluate(() => { const m = document.querySelector("#pageViewContainer .mushaf-step-hit"); if (!m) return null; const r = m.getBoundingClientRect(); return { key: m.dataset.ayahMarker, inView: r.bottom > 0 && r.top < innerHeight }; });
    check(`${tag} Mushaf: ▸ lights an āyah-end marker and brings it into view`, !!hit && hit.inView, JSON.stringify(hit));
    await page.waitForTimeout(1800);
    await page.click("#nextAyahBtn"); await page.waitForTimeout(250);
    const hit2 = await page.evaluate(() => document.querySelector("#pageViewContainer .mushaf-step-hit")?.dataset.ayahMarker ?? null);
    check(`${tag} Mushaf: a second ▸ moves to a different marker`, !!hit2 && hit2 !== hit?.key, JSON.stringify({ hit, hit2 }));
  }
  check(`${tag} no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
