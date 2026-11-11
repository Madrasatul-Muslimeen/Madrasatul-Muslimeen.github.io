// Printed page view (the Owner, 11 Nov 2026): the Madinah Mushaf as the real printed page, a THIRD view in the Read switch
// (ONE Ayah View -> Mushaf -> Printed page -> ONE Ayah View). Expected values are written BY HAND: the page for 57:5 is 538
// (page-index.json: 57:4 to 57:11), the picture is 622 x 917.
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/mushaf-printed-view-browser.mjs [--width=390] [--lang=en] [--mutate=<name>]
//   --mutate=notthird   the switch never reaches the printed page (stays two views)         -> the "third view" checks fail
//   --mutate=badurl     the picture address is wrong                                         -> the "picture loaded" check fails
//   --mutate=nopagehook the drawn page carries no data-mushaf-page                           -> the page reference / ‹ › checks fail
//   --mutate=noerror    a picture that cannot be fetched leaves a broken image               -> the "not available" message check fails
//   --mutate=noback     "Open this page as text" sets no way back                             -> the way-back check fails
//   --mutate=nocredit   the credit line is not drawn                                         -> the credit check fails
//   --mutate=nozoom     Zoom does nothing                                                    -> the zoom check fails
//   --mutate=stuck      leaving the printed page leaves it remembered for next time           -> the "ONE Ayah View again" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  notthird: ["app/quranrevival.html", "if (!printedNow()) { printedOn = true; savePrintedOn(true); mushafToggle.dispatchEvent(new Event(\"change\")); return; }", "if (false) { return; }"],
  badurl: ["app/js/mushaf-printed.js", 'export const PRINTED_BASE = "/tools/quran-data-pull/output/mushaf-printed/ksu-madani/";', 'export const PRINTED_BASE = "/tools/quran-data-pull/output/mushaf-printed/nowhere/";'],
  nopagehook: ["app/js/mushaf-printed.js", "sec.dataset.mushafPage = String(p);", "sec.dataset.mushafPageX = String(p);"],
  noerror: ["app/js/mushaf-printed.js", 'img.addEventListener("error", () => {', 'img.addEventListener("error-x", () => {'],
  noback: ["app/quranrevival.html", "setAppReturn(t(\"Back to Printed page\"),", "void (t(\"Back to Printed page\"),"],
  nocredit: ["app/js/mushaf-printed.js", '<p class="printed-credit">', '<p class="printed-credit" hidden>'],
  nozoom: ["app/js/mushaf-printed.js", 'zoom.addEventListener("click", () => setZoom(!frame.classList.contains("zoomed")));', ""],
  stuck: ["app/quranrevival.html", "printedOn = false; savePrintedOn(false); // Printed page → ONE Ayah View", "printedOn = false; // Printed page → ONE Ayah View"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const PNG = fs.readFileSync("tools/quran-data-pull/output/mushaf-printed/ksu-madani/538.png");

async function start(lang, width, { offline = false } = {}) {
  const ctx = await newContext(browser, { legacyTools: true, appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (offline) await ctx.route("**/mushaf-printed/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return { ctx, ...(await openPage(ctx, "/app/quranrevival.html")) };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function openAyah(page) {
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await setSel(page, "ayahSelect", "5"); await page.waitForTimeout(800);
}
const view = (page) => page.evaluate(() => ({
  mushaf: document.getElementById("mushafToggle").checked,
  // visible ones only: the strip keeps its last drawing in the DOM, hidden, when the reader leaves the Mushaf
  printed: [...document.querySelectorAll(".mushaf-printed-page")].filter((e) => e.getClientRects().length).length,
  textPages: [...document.querySelectorAll(".hifz-page:not(.mushaf-printed-page)")].filter((e) => e.getClientRects().length).length,
  btn: document.getElementById("readMeaningBtn")?.getAttribute("aria-label"),
  next: document.getElementById("readMeaningBtn")?.dataset.readNext,
  ref: document.getElementById("mushafPageRef")?.dataset.page ?? null,
}));
const waitPrinted = (page) => page.waitForSelector(".mushaf-printed-page", { timeout: 8000 }).then(() => page.waitForTimeout(500)).catch(() => {});
const click = async (page) => { await page.click("#readMeaningBtn"); await page.waitForTimeout(900); };

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width);
  await ctx.route("**/mushaf-printed/ksu-madani/538.png", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await openAyah(page);
  let v = await view(page);
  check(`${tag} starts in the ONE Ayah View, the switch offering the Mushaf`, !v.mushaf && v.next === "mushaf", JSON.stringify(v));
  await click(page); await page.waitForSelector(".hifz-page:not(.mushaf-printed-page)", { timeout: 8000 }).catch(() => {}); v = await view(page);
  check(`${tag} 1st press: the text Mushaf, and the switch now offers the Printed page`, v.mushaf && v.printed === 0 && v.textPages > 0 && v.next === "printed", JSON.stringify(v));
  await click(page); await waitPrinted(page); v = await view(page);
  check(`${tag} 2nd press: the third view, the Printed page (no text page drawn)`, v.mushaf && v.printed >= 1 && v.textPages === 0 && v.next === "plain", JSON.stringify(v));
  const label = lang === "bn" ? /ছাপা পৃষ্ঠা|ONE Ayah|এক/ : /ONE Ayah/;
  check(`${tag} in the printed page the switch is named for where it leads`, label.test(v.btn || ""), v.btn);
  if (!(await page.$(".mushaf-printed-page"))) { check(`${tag} the printed page is drawn`, false, JSON.stringify(v)); await ctx.close(); continue; }
  const g = await page.evaluate(() => {
    const sec = document.querySelector('.mushaf-printed-page[data-mushaf-page="538"]'), img = sec?.querySelector(".printed-img");
    const R = (e) => e?.getBoundingClientRect(), host = document.getElementById("pageViewContainer") || sec?.parentElement, hr = R(host);
    const credit = sec?.querySelector(".printed-credit"), cr = R(credit);
    return { has538: !!sec, natural: img ? [img.naturalWidth, img.naturalHeight] : null, ok: !!img?.complete && img.naturalWidth > 0,
      imgR: R(img) && { l: R(img).left, r: R(img).right, w: R(img).width, h: R(img).height }, hostR: hr && { l: hr.left, r: hr.right },
      winW: document.documentElement.clientWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      creditText: credit?.textContent ?? "", creditShown: !!cr && cr.height > 0 && getComputedStyle(credit).display !== "none",
      btnH: sec ? Math.min(...[...sec.querySelectorAll(".printed-bar button")].map((b) => R(b).height)) : 0 };
  });
  check(`${tag} the page for 57:5 is 538, the real picture (622 x 917) loaded`, g.has538 && g.ok && g.natural?.join("x") === "622x917", JSON.stringify(g.natural));
  check(`${tag} the picture sits inside the screen and the page does not scroll sideways`, g.imgR && g.imgR.l >= -1 && g.imgR.r <= g.winW + 1 && g.over <= 0, JSON.stringify({ imgR: g.imgR, winW: g.winW, over: g.over }));
  check(`${tag} the picture keeps its shape (not squashed)`, g.imgR && Math.abs(g.imgR.h / g.imgR.w - 917 / 622) < 0.03, JSON.stringify(g.imgR));
  check(`${tag} the credit line names the King Fahd Complex and King Saud University`, g.creditShown && (lang === "bn" ? /ফাহদ/.test(g.creditText) && /সৌদ/.test(g.creditText) : /King Fahd/.test(g.creditText) && /King Saud/.test(g.creditText)), g.creditText);
  check(`${tag} Zoom and "Open this page as text" are at least 40px tall`, g.btnH >= 40, String(g.btnH));
  v = await view(page);
  check(`${tag} the Read bar names page 538`, v.ref === "538", String(v.ref));
  // zoom
  const z0 = await page.evaluate(() => document.querySelector(".mushaf-printed-page .printed-img")?.getBoundingClientRect().width ?? 0);
  if (!(await page.$(".mushaf-printed-page .printed-zoom:not([disabled])"))) { check(`${tag} the picture and its Zoom are on the page`, false); await ctx.close(); continue; }
  await page.click(".mushaf-printed-page .printed-zoom"); await page.waitForTimeout(250);
  const z1 = await page.evaluate(() => { const i = document.querySelector(".mushaf-printed-page .printed-img"), f = i.parentElement; return { w: i.getBoundingClientRect().width, fw: f.getBoundingClientRect().width, scroll: f.scrollWidth > f.clientWidth, pressed: document.querySelector(".printed-zoom").getAttribute("aria-pressed") }; });
  check(`${tag} Zoom doubles the picture inside its frame, which then scrolls (pressed state set)`, z1.w > z0 * 1.8 && z1.scroll && z1.pressed === "true", JSON.stringify({ z0, ...z1 }));
  await page.click(".mushaf-printed-page .printed-zoom"); await page.waitForTimeout(250);
  const z2 = await page.evaluate(() => document.querySelector(".mushaf-printed-page .printed-img").getBoundingClientRect().width);
  check(`${tag} Zoom again returns to the page width`, Math.abs(z2 - z0) < 2, `${z0} vs ${z2}`);
  // open as text, with the way back
  await page.click(".mushaf-printed-page .printed-as-text"); await page.waitForTimeout(1500);
  v = await view(page);
  const pill = await page.evaluate(() => { const p = document.getElementById("ayahCardBackPill"); return { shown: !!p && !p.hidden && p.getBoundingClientRect().width > 0, text: p?.textContent ?? "" }; });
  check(`${tag} "Open this page as text": the text Mushaf at page 538, no picture`, v.mushaf && v.printed === 0 && v.textPages > 0 && v.ref === "538", JSON.stringify(v));
  check(`${tag} ...and a way back to the Printed page is on screen`, pill.shown && (lang === "bn" ? /ছাপা/.test(pill.text) : /Printed page/.test(pill.text) || pill.text.length > 0), pill.text);
  await page.click("#ayahCardBackPill [data-ayah-card-back]"); await waitPrinted(page); v = await view(page);
  check(`${tag} the way back returns to the Printed page`, v.printed >= 1 && v.textPages === 0, JSON.stringify(v));
  // leave it: ONE Ayah View, and it is not remembered
  await click(page); v = await view(page);
  check(`${tag} 3rd press: back to the ONE Ayah View`, !v.mushaf && v.printed === 0, JSON.stringify(v));
  await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(500);
  const remembered = await page.evaluate(() => localStorage.getItem("qr.readPrinted"));
  check(`${tag} leaving the Printed page is remembered as OFF (ONE Ayah View again after a reload)`, remembered !== "1", String(remembered));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// offline / picture not on this device (one pass, 390)
{
  const lang = LANGS[0], width = WIDTHS.includes(390) ? 390 : WIDTHS[0], tag = `[${lang} ${width} no picture]`;
  const { ctx, page } = await start(lang, width, { offline: true });
  await openAyah(page); await click(page); await click(page);
  await page.waitForSelector(".mushaf-printed-page", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => { const e = document.querySelector(".mushaf-printed-page .printed-missing"); return { shown: !!e && e.getBoundingClientRect().height > 0, text: e?.textContent ?? "", asText: !!document.querySelector(".mushaf-printed-page .printed-as-text") }; });
  check(`${tag} a picture that cannot be fetched says so in words (not a broken image)`, m.shown && /Connect to the internet|ইন্টারনেট/.test(m.text), m.text);
  check(`${tag} "Open this page as text" is still offered`, m.asText);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
