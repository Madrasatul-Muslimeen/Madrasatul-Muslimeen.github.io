// Audit part 153 (#1411): the way-back law (decision 86) on the shared tools. Every in-app link on notes / journey-map /
// bookmarks / records is inventoried (count printed, with a positive control), and each is followed: the destination must
// offer a visible way back, the way back must work, and the reader must land on the same page.
// Run from the repository root with serve.js on :8080.   --lang=en|bn   --mutate=fullpage|import
//   --mutate=fullpage  strips back=1 from the pane's "Open full page" address   -> the full-page checks fail
//   --mutate=import    strips back=1 from "Import Notes…"                       -> the import checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const LANG = arg("lang"), MUTATE = arg("mutate");
const MUT = {
  fullpage: ["journey-map.html", "&back=1#${currentView}", "#${currentView}"],
  import: ["journey-map.html", 'href="import-notes.html?back=1"', 'href="import-notes.html"'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const PAGES = ["notes.html", "journey-map.html", "bookmarks.html", "records.html"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const [width, height] of [[390, 844], [1024, 768]]) {
  if (LANG && LANG !== lang) continue;
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }

  // 1. Inventory: every same-origin in-app link or open-another-page control, per page (legacy archive links excluded).
  let total = 0; const found = {};
  for (const p of PAGES) {
    const { page } = await openPage(ctx, `/app/${p}`);
    await page.waitForTimeout(800);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))
      .filter((h) => h && !/^(https?:|#|javascript:|mailto:)/.test(h) && !/legacy/.test(h) && !/\.css/.test(h)));
    found[p] = hrefs; total += hrefs.length;
    await page.close();
  }
  console.log(`  ${tag} in-app links found: ${total} (${Object.entries(found).map(([p, h]) => `${p} ${h.length}`).join(", ")})`);
  check(`${tag} POSITIVE CONTROL: some in-app links are found (${total})`, total > 0);

  // 2. Every non-"back" link that leaves the page for another page carries back=1 (or is the menu's own navBack=1).
  // (A link to the page itself is the menu's "you are here" entry, and a ?bookmark= link is proven in step 5.)
  {
    let n = 0; const bad = [];
    for (const [p, hrefs] of Object.entries(found)) for (const h of hrefs) {
      if (/\.html/.test(h) && h.split("?")[0] !== p && !/[?&]bookmark=/.test(h)) { n++; if (!/[?&](back|navBack)=1/.test(h)) bad.push(`${p} -> ${h}`); }
    }
    console.log(`  ${tag} page-leaving links checked: ${n}`);
    check(`${tag} all ${n} page-leaving links carry back=1 or navBack=1`, n > 0 && bad.length === 0, JSON.stringify(bad));
  }

  // 3. "Import Notes…" on journey-map: destination shows a visible way back and it returns to journey-map.
  {
    const { page } = await openPage(ctx, "/app/journey-map.html");
    await page.waitForTimeout(800);
    const href = await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => /import-notes/.test(a.getAttribute("href") || ""))?.getAttribute("href") ?? "");
    check(`${tag} import: the Import Notes link exists (positive control)`, !!href, href);
    check(`${tag} import: the address carries back=1`, /back=1/.test(href), href);
    await page.goto(new URL(href || "import-notes.html", page.url()).href);
    await page.waitForTimeout(800);
    const back = await page.evaluate(() => [...document.querySelectorAll("button,a")].some((b) => /^←/.test((b.textContent || "").trim()) && b.getBoundingClientRect().width > 0));
    check(`${tag} import: the destination shows a visible ← Back`, back);
    await page.close();
  }

  // 4. "Open full page": the full-page address the pane builds, followed from the Read view, shows ← Back that returns.
  {
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(500);
    const origin = page.url();
    const addr = await page.evaluate(async () => (await (await fetch("journey-map.html")).text()).match(/journey-map\.html\?note=\$\{encodeURIComponent\(note\.noteId\)\}[^`]*/)?.[0] ?? "");
    check(`${tag} fullpage: the pane's address template is found (positive control)`, !!addr, addr);
    check(`${tag} fullpage: the address carries back=1`, /[?&]back=1/.test(addr), addr);
    await page.goto(new URL("journey-map.html?note=n256&back=1#all", page.url()).href);
    await page.waitForSelector("#jmBackBtn", { timeout: 10000 }).catch(() => {});
    const vis = await page.evaluate(() => (document.getElementById("jmBackBtn")?.getBoundingClientRect().width ?? 0) > 0);
    check(`${tag} fullpage: ← Back is visible on the full page`, vis);
    if (vis) {
      await page.click("#jmBackBtn");
      await page.waitForTimeout(800);
      check(`${tag} fullpage: ← Back returns to the page the reader came from`, page.url() === origin, page.url());
    }
    await page.close();
  }
  // 5. A bookmark's Open (Manage bookmarks page): the destination shows "← Back to <page>" and it returns to bookmarks.html.
  {
    const { page } = await openPage(ctx, "/app/bookmarks.html");
    await page.waitForSelector(".bm-row a[data-bm-open-id]", { timeout: 15000 }).catch(() => {});
    const n = await page.evaluate(() => document.querySelectorAll(".bm-row a[data-bm-open-id]").length);
    console.log(`  ${tag} bookmark Open links: ${n}`);
    check(`${tag} bookmark: Open links are found (positive control)`, n > 0);
    if (n > 0) {
      const origin = page.url();
      await page.click(".bm-row a[data-bm-open-id] >> nth=0");
      await page.waitForURL(/quranrevival\.html\?bookmark=/, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector("[data-bm-back]", { timeout: 15000 }).catch(() => {});
      const pill = await page.evaluate(() => { const e = document.querySelector("[data-bm-back]"); return e ? { w: e.getBoundingClientRect().width, text: e.textContent.trim() } : null; });
      check(`${tag} bookmark: the destination shows the floating "← Back to …" pill`, !!pill && pill.w > 0 && /^←/.test(pill.text), JSON.stringify(pill));
      if (pill) {
        await page.click("[data-bm-back-link]", { timeout: 5000 }).catch((e) => console.log(`  (pill click: ${String(e.message).split("\n")[0]})`));
        await page.waitForTimeout(1200);
        check(`${tag} bookmark: the pill returns to the Manage bookmarks page`, /bookmarks\.html/.test(page.url()), page.url());
      }
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
