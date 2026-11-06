// The Owner, 6 Nov 2026: with Page as the unit and a sūrah chosen, the page-number list holds only the pages of THAT sūrah.
// Al-Kahf (18) = pages 293-304, Al-Fātiḥah = [1], Al-Baqarah = 2-49; the Read bar's copy of the picker matches; changing the sūrah
// changes the list; the page shown is in it; at 360 / 768 / 1440. --mutate=all restores the 604-page list -> FAIL.
// Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=all");
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const opts = (page, id) => page.evaluate((i) => [...document.getElementById(i).options].map((o) => Number(o.value)), id);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const width of [360, 768, 1440]) {
  const tag = `[${width}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = "if (only.length) numbers = only;"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, "") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "unitTypeSelect", "page"); await page.waitForTimeout(600);
  await setSel(page, "surahSelect", "18"); await page.waitForTimeout(1500);
  await page.waitForFunction(() => document.getElementById("unitNumSelect").options.length > 0, null, { timeout: 15000 }).catch(() => {});
  let o = await opts(page, "unitNumSelect");
  check(`${tag} Al-Kahf: the page list is 293-304`, o.length === 12 && o[0] === 293 && o[o.length - 1] === 304, JSON.stringify(o.slice(0, 5)) + ` n=${o.length}`);
  const cur = await page.evaluate(() => Number(document.getElementById("unitNumSelect").value));
  check(`${tag} the page shown (${cur}) is in the list`, o.includes(cur));
  const read = await opts(page, "readUnitNumSelect");
  check(`${tag} the Read bar's picker holds the same list`, JSON.stringify(read) === JSON.stringify(o), `n=${read.length}`);
  await setSel(page, "surahSelect", "1"); await page.waitForTimeout(1500);
  o = await opts(page, "unitNumSelect");
  check(`${tag} Al-Fātiḥah: the list is just [1]`, JSON.stringify(o) === "[1]", JSON.stringify(o));
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  o = await opts(page, "unitNumSelect");
  check(`${tag} Al-Baqarah: pages 2-49`, o.length === 48 && o[0] === 2 && o[o.length - 1] === 49, `n=${o.length} ${o[0]}..${o[o.length - 1]}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
