// QR Lead, audit part 127 (the MSA Architect, 29 Oct 2026): on the Quran Study landing, with the "← ✕" way back showing,
// the floating chip lay over the bottom tabs and the Wheel / Legend / Unit buttons, so a finger could not reach them.
// Measured before the fix, a control counted covered when any of five points on it answers something else:
// Study and Explore covered at every width 320-1440 (en and bn), and Legend and Unit too at 320-390.
// Now the landing has its own place for the way back (#landingBackSlot, a row above the tabs) and the chip docks there.
// While a window covers the landing (Know Your Status), the place stops being a dock and the chip floats above the window.
// The chip is reached the real way: Read -> An-Naas -> Āyah card 114:1 -> a word (sets "Back to Āyah card") -> close.
//   node tools/i18n-verify/qr-landing-back-reach-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-slot        the landing slot removed          -> "docks in the landing's own row" and "covers nothing" FAIL
//   no-cover-watch the cover watcher not started     -> "floats ABOVE the window" FAILS (it docks under it)
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-slot": ['      <div id="landingBackSlot" class="landing-back-slot" data-back-dock></div>\n', ""],
  "no-cover-watch": ["    watchLandingBackDock();\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const VIEWS = [[320, 640, "en"], [360, 780, "en"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [768, 1024, "bn"],
  [820, 1180, "en"], [1024, 768, "en"], [1180, 820, "en"], [1440, 900, "en"]];
for (const [w, h, lang] of VIEWS) {
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
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  await page.click("#readContentsBtn");
  await page.waitForSelector('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]', { state: "attached" });
  await page.evaluate(() => document.querySelector('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]').click());
  await page.waitForFunction(() => !!document.querySelector('[data-ayah-marker="114:1"]'), null, { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-ayah-marker="114:1"]').click());
  await page.waitForSelector("#ayahActionSheetMount [data-word-occurrence]", { state: "attached", timeout: 10000 });
  await page.evaluate(() => document.querySelector("#ayahActionSheetMount [data-word-occurrence]").click());
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("readWinCloseBtn")?.click());
  await page.waitForFunction(() => { const t = document.getElementById("tabRow"); return t && t.getBoundingClientRect().width > 0; }, null, { timeout: 10000 });
  await page.waitForTimeout(700);

  const where = () => page.evaluate(() => { const p = document.getElementById("ayahCardBackPill"); return p && !p.hidden ? (p.parentElement?.id || p.parentElement?.tagName) : null; });
  const pillAt = await where();
  check(`${tag} POSITIVE CONTROL: the way back shows on the landing`, !!pillAt, String(pillAt));
  check(`${tag} it docks in the landing's own row above the tabs (#landingBackSlot)`, pillAt === "landingBackSlot", String(pillAt));

  for (const scroll of ["top", "bottom"]) {
    await page.evaluate((s) => { const el = document.scrollingElement; el.scrollTop = s === "top" ? 0 : el.scrollHeight; }, scroll);
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const pill = document.getElementById("ayahCardBackPill");
      const pts = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.2], [0.5, 0.8]];
      const reach = (el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom <= 0 || r.top >= innerHeight) return "off";
        const bad = pts.filter(([fx, fy]) => { const x = r.left + r.width * fx, y = r.top + r.height * fy; if (y < 0 || y >= innerHeight) return false; const e = document.elementFromPoint(x, y); return !(e && (e === el || el.contains(e))); });
        return bad.length ? `covered by ${document.elementFromPoint(r.left + r.width * bad[0][0], r.top + r.height * bad[0][1])?.closest("[id],[class]")?.id || "?"}` : "ok";
      };
      const controls = [...document.querySelectorAll("#tabRow button, #wheelDrawerRow button, #readContentsBtn")].filter((b) => b.getBoundingClientRect().width > 0);
      const out = controls.map((b) => ({ name: (b.textContent || "").trim().slice(0, 12) || b.id, r: reach(b) }));
      const pr = pill.getBoundingClientRect();
      const overlap = controls.filter((b) => { const r = b.getBoundingClientRect(); return pr.left < r.right && pr.right > r.left && pr.top < r.bottom && pr.bottom > r.top; }).map((b) => (b.textContent || "").trim().slice(0, 12));
      const own = [...pill.querySelectorAll("button")].map((b) => reach(b));
      return { out, overlap, own, n: controls.length };
    });
    const onScreen = m.out.filter((c) => c.r !== "off");
    check(`${tag} ${scroll}: POSITIVE CONTROL: the tabs, the drawer buttons and Read are measured (${m.n})`, m.n >= 8 && onScreen.length >= 4, JSON.stringify(m.out));
    check(`${tag} ${scroll}: the way back covers nothing a finger needs (${onScreen.length} on screen, all reachable)`, onScreen.every((c) => c.r === "ok"), JSON.stringify(onScreen.filter((c) => c.r !== "ok")));
    check(`${tag} ${scroll}: ...and lies over no tab or drawer button at all`, m.overlap.length === 0, JSON.stringify(m.overlap));
    check(`${tag} ${scroll}: its ← and × are reachable themselves`, m.own.length === 2 && m.own.every((r) => r === "ok"), JSON.stringify(m.own));
  }
  if ([360, 768, 1440].includes(w) || lang === "bn") await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-landing-back-${lang}-${w}.png` });

  // A window over the landing (Know Your Status, full screen): the way back floats ABOVE it, then docks again when it closes.
  if (w === 390 || w === 1024) {
    await page.evaluate(() => { document.scrollingElement.scrollTop = 0; });
    await page.locator("#myStatusBtn, button:has-text('Know Your Status'), button:has-text('আপনার অবস্থা জানুন')").first().click();
    await page.waitForFunction(() => { const m = document.getElementById("myStatusMount"); return m && !m.hidden && m.getBoundingClientRect().height > 100; }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const o = await page.evaluate(() => {
      const mount = document.getElementById("myStatusMount"), pill = document.getElementById("ayahCardBackPill");
      const r = pill.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { open: !!mount && !mount.hidden && mount.getBoundingClientRect().height > 100, parent: pill.parentElement?.id || pill.parentElement?.tagName, onTop: !!e && pill.contains(e), under: e?.closest("[id]")?.id };
    });
    check(`${tag} POSITIVE CONTROL: Know Your Status opens over the landing`, o.open, JSON.stringify(o));
    check(`${tag} with a window over the landing, the way back floats ABOVE it (not docked under it)`, o.parent === "BODY" && o.onTop, JSON.stringify(o));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => { const m = document.getElementById("myStatusMount"); return !m || m.hidden || !m.getBoundingClientRect().height; }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    check(`${tag} once the window closes, it docks in the landing's row again`, (await where()) === "landingBackSlot", String(await where()));
  }

  // The way back still works from its new place.
  if (w === 390 && lang === "en") {
    await page.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]").click());
    await page.waitForTimeout(1200);
    const back = await page.evaluate(() => { const c = document.querySelector("[data-ayah-sheet]"); return { open: !!c, text: (c?.textContent || "").includes("114") }; });
    check(`${tag} its ← still goes back to Āyah card 114:1`, back.open && back.text, JSON.stringify(back));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR landing: the way back covers nothing${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
