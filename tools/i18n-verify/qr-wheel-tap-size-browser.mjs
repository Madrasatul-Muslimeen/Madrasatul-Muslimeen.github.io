// QR Lead (audit part 44, QR as a student, via the MSA Architect, 23 Oct 2026): two of the Approach screen's buttons
// were measured below a finger's 40px: #wheelListCollapseBtn (24px, at 1280) and #wheelCtaBtn (27-31px).
//   - #wheelListCollapseBtn: the drawn circle stays 24px (it sits in the 16px splitter); an invisible ::after gives it
//     a 40px tap area. FIXED here.
//   - #wheelCtaBtn: already a 40px tap area (.wheel-cta-btn::before, J29 item 16, v10.66, which took back a
//     min-height: 40px that pushed the pill out of the circle on a small phone). Checked, not changed.
// A tap 18px from the centre (up, down, left, right) must land on the button: a 40px target, measured by the page's
// own hit-testing, not by the drawn box.
//   node tools/i18n-verify/qr-wheel-tap-size-browser.mjs [--mutate=no-tap]    (serve.js on :8080, or QR_BASE)
//   --mutate=no-tap   the collapse button's tap area removed -> its checks FAIL
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { "no-tap": ['  .list-collapse-btn::after { content: ""; position: absolute; inset: -10px; } /* qr-lead tap: 20px inside the 2px border + 2 x 10 = 40px */\n', ""] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const reach = (page, id) => page.evaluate((id) => {
  const b = document.getElementById(id); if (!b) return null;
  const r = b.getBoundingClientRect(); if (!r.width) return { shown: false };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hits = [[0, 0], [0, -18], [0, 18], [-18, 0], [18, 0]].map(([dx, dy]) => { const e = document.elementFromPoint(cx + dx, cy + dy); return !!e && b.contains(e); });
  return { shown: true, w: Math.round(r.width), h: Math.round(r.height), hits };
}, id);

for (const [w, h, lang] of [[1280, 800, "en"], [1280, 800, "bn"], [390, 844, "en"], [360, 740, "bn"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelCtaBtn", { state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const cta = await reach(page, "wheelCtaBtn");
  check(`${tag} POSITIVE CONTROL: the wheel's button is on screen`, cta?.shown, JSON.stringify(cta));
  if (cta?.shown) check(`${tag} #wheelCtaBtn (drawn ${cta.w}×${cta.h}): a tap 18px above / below its centre still reaches it (40px tall)`, cta.hits[0] && cta.hits[1] && cta.hits[2], JSON.stringify(cta));
  if (w >= 900) {
    const col = await reach(page, "wheelListCollapseBtn");
    check(`${tag} POSITIVE CONTROL: the list's collapse button is on screen at ${w}`, col?.shown, JSON.stringify(col));
    if (col?.shown) check(`${tag} #wheelListCollapseBtn (drawn ${col.w}×${col.h}): a tap 18px from its centre, every way, reaches it (40px)`, col.hits.every(Boolean), JSON.stringify(col));
    if (col?.shown) {
      const before = await page.evaluate(() => document.getElementById("wheelListCollapseBtn").getAttribute("aria-pressed"));
      const box = await page.locator("#wheelListCollapseBtn").boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 18); await page.waitForTimeout(300);
      const after = await page.evaluate(() => document.getElementById("wheelListCollapseBtn").getAttribute("aria-pressed"));
      check(`${tag} ...and that tap really works the button (aria-pressed ${before} → ${after})`, before !== after);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR wheel tap sizes${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
