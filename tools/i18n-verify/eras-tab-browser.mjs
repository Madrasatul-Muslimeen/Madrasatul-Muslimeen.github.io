// PCF MSA J115 round 2: the Eras tab of Study Next, in a real browser. The tab joins the existing row (the Āyah card: Dictionary, Scholars, Tafsīr, Eras) and is
// drawn only when a card gives `eras`. At 320/390/768/1280 in English and Bangla: the row is tidy (every tab >= 40px,
// nothing cut, no sideways scroll), the panel opens on the first era with two views side by side where room allows,
// the three era tabs switch, a source opens its verbatim Arabic, 2:228 vs an āyah with no data says so in words.
// Run from the repository root with serve.js on :8080 (node_modules -> playwright). Screenshots: /tmp/eras-<lang>-<w>.png
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`promise in ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch();
for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1280]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  const { page } = await openPage(ctx, "/app/about.html");
  await page.evaluate(async () => {
    const { renderReadNext } = await import("/app/js/read-next-ui.js");
    const rows = [{ id: "a28", name: { en: "Sahaba" } }, { id: "a30", name: { en: "Tabi al-Tabiin" } }];
    const host = document.createElement("div"); host.id = "probe"; host.style.cssText = "max-width:100%;padding:8px";
    document.body.prepend(host);
    renderReadNext(host, { lemmas: ["شمس"], scholars: "tafsir", tafsir: { ayat: ["2:228"] }, eras: () => ({ ref: "2:228", rows }) });
    const h2 = document.createElement("div"); h2.id = "probe2"; document.body.prepend(h2);
    renderReadNext(h2, { eras: () => ({ ref: "1:1", rows: [] }) });
  });
  const bar = await page.evaluate(() => [...document.querySelectorAll("#probe .read-next-tabs > button")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, h: Math.round(r.height), w: Math.round(r.width), cut: b.scrollWidth > b.clientWidth + 1, r: r.right }; }));
  check(`${tag} four tabs (the Āyah card's three + Eras), Eras last`, bar.length === 4 && bar[3].t === (lang === "bn" ? "যুগ" : "Eras"), JSON.stringify(bar.map((b) => b.t)));
  check(`${tag} every tab >= 40px tall and not cut`, bar.every((b) => b.h >= 40 && !b.cut), JSON.stringify(bar));
  await page.locator('#probe [data-read-next-tab="eras"]').click();
  await page.waitForSelector("#probe [data-read-next-eras]");
  const p = await page.evaluate(() => {
    const pn = document.querySelector("#probe [data-read-next-panel='eras']");
    const cols = [...pn.querySelectorAll(".rn-era-cols > div")].map((c) => c.getBoundingClientRect());
    const btn = [...pn.querySelectorAll(".rn-era-tabs > button")].map((b) => ({ t: b.textContent, h: Math.round(b.getBoundingClientRect().height), pressed: b.getAttribute("aria-pressed") }));
    return { text: pn.textContent, cols: cols.map((r) => ({ l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width) })), btn, sw: document.documentElement.scrollWidth <= innerWidth + 1, inside: pn.getBoundingClientRect().right <= innerWidth + 1 };
  });
  check(`${tag} two views, first era pressed, 4 + 12 names`, p.cols.length === 2 && p.btn.length === 3 && p.btn[0].pressed === "true" && /\(4\)/.test(p.text) && /\(12\)/.test(p.text), JSON.stringify(p.btn));
  check(`${tag} era tabs >= 40px`, p.btn.every((b) => b.h >= 40));
  check(`${tag} two columns side by side from 768 up, stacked below 480`, width >= 768 ? p.cols[0].t === p.cols[1].t : width < 480 ? p.cols[0].t < p.cols[1].t : true, JSON.stringify(p.cols));
  check(`${tag} no sideways scroll, panel inside the screen`, p.sw && p.inside);
  await page.locator("#probe [data-read-next-era='tabiun']").click();
  const t2 = await page.evaluate(() => document.querySelector("#probe [data-read-next-panel='eras']").textContent);
  check(`${tag} the Tābiʿūn tab says its Approach is not in the catalogue`, /Tābiʿūn/.test(t2) && (lang === "bn" ? /ক্যাটালগে/.test(t2) : /not in your catalogue/.test(t2)), t2.slice(0, 160));
  const links = [];
  for (const era of ["sahabah", "tabiun", "tabi-tabiin"]) {
    await page.locator(`#probe [data-read-next-era='${era}']`).click();
    links.push(...await page.evaluate(() => [...document.querySelectorAll("#probe [data-read-next-panel='eras'] a[data-read-next-scholar-link]")].map((a) => ({ id: a.dataset.readNextScholarLink, href: a.href, blank: a.target === "_blank", h: Math.round(a.getBoundingClientRect().height) }))));
  }
  check(`${tag} the five imams' names link to their Scholars Database row, nobody else`, ["s001", "s002", "s005", "s006", "s007"].every((id) => links.some((l) => l.id === id && l.blank && l.href.includes(`?s=${id}&back=1`))) && links.length === 5, JSON.stringify(links.map((l) => l.id)));
  check(`${tag} still no sideways scroll with the links`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator("#probe [data-read-next-era='sahabah']").click();
  const src = await page.evaluate(() => { const d = document.querySelector("#probe details.read-next-group"); d.open = true; return d.querySelector(".rn-era-quote")?.textContent.length ?? 0; });
  check(`${tag} a source opens its verbatim Arabic`, src > 20);
  await page.locator('#probe2 [data-read-next-tab="eras"]').click();
  await page.waitForTimeout(400);
  const none = await page.evaluate(() => document.querySelector("#probe2 [data-read-next-panel='eras']").textContent);
  check(`${tag} an āyah with no reports says so in words`, lang === "bn" ? /এখনো অ্যাপে নেই/.test(none) : /No reports by era/.test(none), none);
  await page.screenshot({ path: `/tmp/eras-${lang}-${width}.png` });
  await ctx.close();
}
await browser.close();
console.log(`\n==== Eras tab, browser: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
