// QR J01 R1: the Asma ul Husna app (app/asma.html), checked in a real browser on a phone (390 wide) and a computer
// (1400 wide), in English and Bangla. No sign-in, and NO request to any Firebase / Google host.
//
//   node tools/apps/qr-verify/asma-browser.mjs                 (serves itself on PORT, default 8092)
//   QR_BASE=http://localhost:8080 node tools/apps/qr-verify/asma-browser.mjs
//   --width=390 --lang=bn                                  (one width / one language only)
//   --mutate=<name>                                        (breaks one thing in the page as served; the suite must FAIL)
//       nav       ‹ › do nothing
//       firebase  the page imports the Firebase SDK from www.gstatic.com
//       studied   "Studied" is not kept (localStorage is not written)
//       back      the poster's ← Back does nothing
//       inline    POSTER_INLINE back to false (the poster behind its 🖼 button)
//       cardlabel the room above a Name's Arabic is taken away (its "N of 99" label sits on the marks again)
//       wheel     the QR-only wheel-label fitting is off (MMSA's two-line wrap, nothing shrunk to its slice)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1400];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const MUTATE = arg("mutate") ?? null;
const FORBIDDEN = /(^|\.)(gstatic\.com|googleapis\.com|firebaseapp\.com|firebaseio\.com|firebase\.google\.com|firebasestorage\.app|web\.app)$/i;
const PORT = Number(process.env.PORT) || 8092;
let base = process.env.QR_BASE, server;

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

// ---- 1. Static: the page's import closure carries no Firebase (walks app/asma.html like import-walk.mjs). ----
// QR J02 S1: MMSA's asma-screensaver.js (Firebase, through session-context.js) is now in QR for Quran Study, and
// screensaver-idle.js (copied unchanged, used by Asma for its settings only) names it in its startScreensaver(),
// which the Asma app never calls. That one edge is skipped here, and the check below proves nothing in Asma calls it.
export const UNCALLED = new Set(["app/js/screensaver-idle.js -> app/js/asma-screensaver.js"]);
{
  const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+\.js|https?:\/\/[^"']+)["']/g;
  const seen = new Set(), remote = [];
  const walk = (file) => {
    if (seen.has(file)) return; seen.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(re)) {
      if (/^https?:/.test(m[1])) { remote.push(`${file} -> ${m[1]}`); continue; }
      const p = path.normalize(path.join(path.dirname(file), m[1]));
      if (UNCALLED.has(`${file} -> ${p}`)) continue;
      if (fs.existsSync(p)) walk(p);
    }
  };
  walk("app/asma.html");
  const callers = [...seen].filter((f) => !f.endsWith("screensaver-idle.js") && /\b(startScreensaver|openScreensaverSettings|armScreensaver)\b[^;]*from\s*["']\.\/screensaver-idle\.js["']/s.test(fs.readFileSync(f, "utf8")));
  check(callers.length === 0, `static: nothing in Asma imports screensaver-idle.js's own start (which would load MMSA's Firebase screensaver)${callers.length ? ": " + callers.join(", ") : ""}`);
  check(seen.size > 10, `static: app/asma.html reaches ${seen.size - 1} scripts`);
  check(remote.length === 0, `static: no script in the closure imports from another site${remote.length ? ": " + remote.join(", ") : ""}`);
  const named = [...seen].filter((f) => /firebase-init\.js$|(^|\/)asma-collections\.js$|(^|\/)sw-register\.js$/.test(f));
  check(named.length === 0, `static: no firebase-init.js, asma-collections.js or MMSA's sw-register.js in the closure${named.length ? ": " + named.join(", ") : ""}`);
}

// ---- 2. The manifest and its icons. ----
const browser = await chromium.launch();
const outsideHosts = new Map(); // host -> count, every width/lang
try {
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_service_worker", "1"); localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
    const page = await ctx.newPage();
    const res = await page.goto(`${base}/app/asma.webmanifest`);
    check(res.ok(), `manifest loads (${res.status()})`);
    const m = JSON.parse(await res.text());
    check(m.name === "Asma ul Husna" && m.short_name === "Asma", `manifest name "${m.name}", short_name "${m.short_name}"`);
    check(m.start_url === "./asma.html" && m.scope === "./" && m.display === "standalone", "manifest start_url ./asma.html, scope ./, display standalone");
    check(/^#/.test(m.theme_color ?? "") && /^#/.test(m.background_color ?? ""), "manifest theme and background colours");
    for (const want of [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]]) {
      const icon = m.icons.find((i) => i.sizes === want[0] && i.purpose === want[1]);
      const r = icon && await page.goto(`${base}/app/${icon.src}`);
      const size = r && await page.evaluate(() => { const i = document.querySelector("img"); return i ? `${i.naturalWidth}x${i.naturalHeight}` : ""; });
      check(!!r && r.ok() && size === want[0], `icon ${want[0]} ${want[1]} loads at its size (${size})`);
    }
    await page.goto(`${base}/app/asma.html`);
    const links = await page.evaluate(() => ({ manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"), apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") }));
    check(links.manifest === "./asma.webmanifest" && !!links.apple, "asma.html links the manifest and an apple-touch-icon");
    const apple = await page.goto(`${base}/app/${links.apple.replace("./", "")}`);
    check(apple.ok(), `apple-touch-icon loads (${apple.status()})`);
    const sw = await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations?.() ?? []).length);
    check(sw === 0, "with mm_disable_service_worker=1 no service worker is registered (the offline suite covers the worker)");
    await ctx.close();
  }

  // ---- 3. In the browser: each width, each language. ----
  for (const width of WIDTHS) for (const lang of LANGS) {
    try { await runOne(width, lang); } catch (err) { check(false, `@${width} ${lang} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
  async function runOne(width, lang) {
    const tag = `@${width} ${lang}`;
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await ctx.addInitScript((l) => {
      if (!sessionStorage.getItem("qr-test-seeded")) {
        localStorage.clear();
        localStorage.setItem("mm_app_lang", l);
        localStorage.setItem("mm_disable_service_worker", "1"); localStorage.setItem("mm_disable_screensaver", "1");
        sessionStorage.setItem("qr-test-seeded", "1");
      }
    }, lang);
    if (MUTATE) await mutate(ctx, MUTATE);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    const errors = [], requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(`${base}/app/asma.html`, { waitUntil: "load" });
    await page.waitForSelector("[data-qa-grid] .qa-card");

    // 99 Names
    const cards = await page.locator(".qa-card").count();
    check(cards === 99, `${tag} the grid shows 99 Names (${cards})`);
    const first = await page.locator('.qa-card[data-qa-name="1"]').innerText();
    check(first.includes("الرَّحْمَٰن"), `${tag} Name 1's card shows its Arabic`);
    if (lang === "bn") {
      check(first.includes("আর-রহমান") && first.includes("১"), `${tag} Name 1's card is in Bangla (name and digits)`);
      check((await page.locator('[data-qa-tab="names"]').innerText()).includes("৯৯"), `${tag} the tabs are in Bangla`);
    } else {
      check(first.includes("Ar-Rahman") && first.includes("The Most Merciful"), `${tag} Name 1's card is in English`);
    }
    await noSideways(page, `${tag} grid`);

    // Night and Light
    const nightBg = await bodyBg(page);
    check(await page.evaluate(() => document.documentElement.dataset.cardLook) === "night", `${tag} starts in Night`);
    await page.click('[data-qa-look="light"]');
    const lightBg = await bodyBg(page);
    check(lightBg !== nightBg && await page.evaluate(() => document.documentElement.dataset.cardLook) === "light", `${tag} Light changes the look (${nightBg} -> ${lightBg})`);
    await page.click('[data-qa-look="night"]');
    check(await bodyBg(page) === nightBg, `${tag} Night brings it back`);

    // The group wheel
    await page.click('[data-qa-tab="groups"]');
    await page.waitForSelector("[data-qa-wheel] svg.mastery-wheel");
    const slices = await page.locator("[data-qa-wheel] .wheel-seg").count();
    const rows = await page.locator("[data-qa-group]").count();
    check(slices === 19 && rows === 19, `${tag} the wheel of groups renders 19 slices and 19 rows (${slices}, ${rows})`);
    const wheelBox = await page.locator("[data-qa-wheel] svg").boundingBox();
    check(wheelBox && wheelBox.width >= 250 && wheelBox.x >= 0 && wheelBox.x + wheelBox.width <= width, `${tag} the wheel fits the screen (${Math.round(wheelBox?.width ?? 0)}px wide)`);
    await noSideways(page, `${tag} groups`);
    await wheelLabelsCalm(page, `${tag} groups wheel`);
    // Group 19's seed title is the owner's editing note: the app shows "Other Names" instead.
    const g19 = (await page.locator('[data-qa-group="asmacat_19"] .qa-row-title').innerText()).trim();
    check(g19 === (lang === "bn" ? "অন্যান্য নাম" : "Other Names"), `${tag} group 19 is titled "${g19}"`);
    check(!(await noteVisible(page)), `${tag} the groups never show the editing note "Not yet placed…"`);
    for (const gid of ["asmacat_19", "asmacat_06"]) {
      await page.goto(`${base}/app/asma.html#v=group&g=${gid}`, { waitUntil: "load" });
      await page.waitForSelector("[data-qa-wheel] .wheel-seg");
      await wheelLabelsCalm(page, `${tag} ${gid} Names wheel`);
      if (gid === "asmacat_19") check(!(await noteVisible(page)), `${tag} group 19's own page never shows the editing note`);
    }
    await page.goto(`${base}/app/asma.html#v=name&n=4`, { waitUntil: "load" });
    await page.waitForSelector('[data-qa-detail="4"]');
    const belongs = (await page.locator(".asma-belongs-row").innerText()).trim();
    check(belongs.includes(lang === "bn" ? "অন্যান্য নাম" : "Other Names") && !(await noteVisible(page)), `${tag} Name 4's "Belongs to" says "${belongs}"`);
    await page.goto(`${base}/app/asma.html#v=groups`, { waitUntil: "load" });
    await page.waitForSelector("[data-qa-wheel] .wheel-seg");
    await page.locator("[data-qa-wheel] .wheel-seg").first().dispatchEvent("click");
    await page.waitForSelector("[data-qa-wheel] .wheel-seg-label-ar");
    const groupNames = await page.locator("[data-qa-wheel] .wheel-seg").count();
    check(groupNames === 4 && /v=group/.test(page.url()), `${tag} a slice opens its group's own wheel of Names (${groupNames})`);
    await page.click("[data-qa-back]");
    await page.waitForSelector("[data-qa-group]");
    check(/v=groups/.test(page.url()), `${tag} ← Back returns to the groups`);

    // Name 1
    await page.click('[data-qa-tab="names"]');
    await page.locator('.qa-card[data-qa-name="1"]').click();
    await page.waitForSelector('[data-qa-detail="1"]');
    check((await page.locator("[data-qa-arabic]").innerText()).trim() === "الرَّحْمَٰن", `${tag} Name 1 opens with its Arabic`);
    const meaning = (await page.locator("[data-qa-meaning]").innerText()).trim();
    check(lang === "bn" ? /[ঀ-৿]/.test(meaning) : meaning === "The Most Merciful", `${tag} Name 1's meaning shows ("${meaning}")`);
    await page.waitForSelector("#qaCitedAyat .asmax-cited-ayah .asmax-cited-words", { timeout: 15000 }).catch(() => {});
    const ayat = await page.locator("#qaCitedAyat .asmax-cited-ayah").count();
    const ayahText = ayat ? (await page.locator("#qaCitedAyat .asmax-cited-words").first().innerText()).trim() : "";
    const ayahTr = ayat ? (await page.locator("#qaCitedAyat .asmax-cited-tr").first().innerText()).trim() : "";
    check(ayat >= 1 && /[؀-ۿ]/.test(ayahText) && ayahTr.length > 20, `${tag} Name 1's cited āyāt are written out (${ayat}, translation ${ayahTr.length} chars)`);
    if (lang === "bn") check(/[ঀ-৿]/.test(ayahTr), `${tag} the āyah's translation is Bangla`);
    await page.locator("#qaCitedAyat .asmax-cited-word").first().click();
    check((await page.locator("#qaCitedAyat .qa-gloss").first().innerText().catch(() => "")).includes("—"), `${tag} tapping a word shows its meaning`);
    await noSideways(page, `${tag} Name 1`);
    await tapTargets(page, `${tag} Name 1`);
    await labelClearOfArabic(page, `${tag} Name 1`);
    await inlinePosterCalm(page, `${tag} Name 1`, width);

    // ‹ ›
    await page.click("[data-qa-next]");
    await page.waitForSelector('[data-qa-detail="2"]', { timeout: 3000 }).catch(() => {});
    check(await page.locator('[data-qa-detail="2"]').count() === 1 && (await page.locator("[data-qa-arabic]").innerText()).trim() === "الرَّحِيم", `${tag} › goes to Name 2`);
    await labelClearOfArabic(page, `${tag} Name 2`);
    await inlinePosterCalm(page, `${tag} Name 2`, width);
    await page.click("[data-qa-prev]");
    await page.waitForSelector('[data-qa-detail="1"]', { timeout: 3000 }).catch(() => {});
    check(await page.locator('[data-qa-detail="1"]').count() === 1, `${tag} ‹ comes back to Name 1`);
    check(await page.locator("[data-qa-prev]").isDisabled(), `${tag} ‹ is off on the first Name`);

    // The poster, full size, and its way back
    await page.click(".qa-poster-inline");
    await page.waitForSelector("#qaPosterOverlay:not([hidden]) .ahp[data-asma-poster='1']", { timeout: 5000 }).catch(() => {});
    check(await page.locator("#qaPosterOverlay:not([hidden]) .ahp[data-asma-poster='1']").count() === 1 && /v=poster/.test(page.url()), `${tag} one tap on the poster opens it full size`);
    const desc = (await page.locator("#qaPosterMount [data-poster-desc]").innerText().catch(() => "")).trim();
    check(desc.length > 40, `${tag} the poster shows Name 1's description (${desc.length} chars)`);
    const sources = await page.locator("#qaPosterMount [data-asma-desc-strip] [data-asma-desc-src]:visible").evaluateAll((bs) => bs.map((b) => b.dataset.asmaDescSrc));
    check(sources.join(",") === "poster,suggested", `${tag} the description strip offers the poster's and the suggested description only (${sources.join(", ")})`);
    await overlayCovers(page, `${tag} poster`);
    await page.click('#qaPosterMount [data-asma-desc-src="suggested"]');
    check(await page.evaluate(() => localStorage.getItem("mmsa.asmaDescriptionSource")) === "suggested", `${tag} the description choice is kept on this device`);
    await page.click('#qaPosterMount [data-asma-desc-src="poster"]');
    const backBtn = page.locator("#qaPosterBack");
    check(await backBtn.isVisible() && (await backBtn.innerText()).startsWith("←"), `${tag} the poster shows a visible ← Back`);
    const pb = await backBtn.boundingBox();
    check(pb && pb.height >= 40, `${tag} ← Back is finger-sized (${Math.round(pb?.height ?? 0)}px)`);
    const posterBox = await page.locator("#qaPosterMount .ahp").boundingBox();
    check(posterBox && posterBox.x >= 0 && posterBox.x + posterBox.width <= width + 1, `${tag} the poster fits the screen (${Math.round(posterBox?.width ?? 0)}px)`);
    await backBtn.click();
    await page.waitForSelector("#qaPosterOverlay[hidden]", { state: "attached", timeout: 3000 }).catch(() => {});
    check(await page.locator("#qaPosterOverlay[hidden]").count() === 1 && await page.locator('[data-qa-detail="1"]').count() === 1 && /v=name&n=1/.test(page.url()), `${tag} ← Back returns to the same Name`);

    // Studied, kept on this device
    await page.click("[data-qa-studied]");
    check(await page.getAttribute("[data-qa-studied]", "aria-pressed") === "true", `${tag} Studied ticks`);
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[data-qa-detail="1"]');
    check(await page.getAttribute("[data-qa-studied]", "aria-pressed") === "true", `${tag} Studied survives a reload`);
    await page.click("[data-qa-back]");
    await page.waitForSelector("[data-qa-grid]");
    check(await page.locator('.qa-card[data-qa-name="1"] .qa-card-tick').count() === 1, `${tag} the grid marks Name 1 studied`);
    const inView = await page.locator('.qa-card[data-qa-name="1"]').evaluate((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    check(inView, `${tag} ← Back from a Name lands on its card`);

    // A Name with a cited hadith
    await page.goto(`${base}/app/asma.html#v=name&n=20`, { waitUntil: "load" });
    await page.waitForSelector("#qaCitedHadith .asmax-cited-hadith-ar", { timeout: 15000 }).catch(() => {});
    const had = (await page.locator("#qaCitedHadith .asmax-cited-hadith-ar").first().innerText().catch(() => "")).trim();
    check(/[؀-ۿ]{20}/.test(had.replace(/\s/g, "")), `${tag} Name 20's cited hadith is written out (${had.length} chars)`);
    const open = page.locator("#qaCitedHadith a[data-asmax-hadith-open]").first();
    const href = await open.getAttribute("href").catch(() => "");
    check(href?.startsWith("https://madrasatul-muslimeen.github.io/app/hadith-collections.html?openiti=") && await open.getAttribute("target") === "_blank", `${tag} "Open in Hadith ↗" goes to MMSA's Hadith library in a new tab`);
    const hadTr = (await page.locator("#qaCitedHadith [data-asmax-hadith-tr]").first().getAttribute("data-asmax-hadith-tr").catch(() => ""));
    check(hadTr === lang, `${tag} the hadith's translation is in the reader's language (${hadTr})`);
    await noSideways(page, `${tag} Name 20`);
    await page.goto(`${base}/app/asma.html#v=name&n=99`, { waitUntil: "load" });
    await page.waitForSelector('[data-qa-detail="99"]');
    await labelClearOfArabic(page, `${tag} Name 99`);

    check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    const bad = requests.filter((u) => { try { return FORBIDDEN.test(new URL(u).hostname); } catch { return false; } });
    check(bad.length === 0, `${tag} ZERO requests to Firebase/Google hosts (${requests.length} requests in all)${bad.length ? ": " + bad.join(", ") : ""}`);
    for (const u of requests) { try { const h = new URL(u).host; if (!h.startsWith("localhost")) outsideHosts.set(h, (outsideHosts.get(h) ?? 0) + 1); } catch {} }
    await ctx.close();
  }

  // ---- 4. The old way (POSTER_INLINE = false, MMSA's today): the poster behind a 🖼 button. ----
  if (!MUTATE) for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await ctx.route("**/app/js/asma-app.js", async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      if (!text.includes("export const POSTER_INLINE = true;")) throw new Error("POSTER_INLINE is not true in asma-app.js");
      await route.fulfill({ response: res, body: text.replace("export const POSTER_INLINE = true;", "export const POSTER_INLINE = false;") });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/app/asma.html#v=name&n=7`, { waitUntil: "load" });
    await page.waitForSelector('[data-qa-detail="7"]');
    check(await page.locator(".qa-namecard .qa-poster-inline").count() === 0 && await page.locator(".qa-namecard .qa-btn[data-qa-poster]").isVisible(), `@${width} POSTER_INLINE=false: no poster on the Name, a 🖼 Poster button instead`);
    await page.click(".qa-btn[data-qa-poster]");
    await page.waitForSelector("#qaPosterOverlay:not([hidden]) .ahp", { timeout: 3000 }).catch(() => {});
    check(await page.locator("#qaPosterOverlay:not([hidden]) .ahp[data-asma-poster='7']").count() === 1, `@${width} POSTER_INLINE=false: the button opens the poster full size`);
    await noSideways(page, `@${width} POSTER_INLINE=false`);
    check(errors.length === 0, `@${width} POSTER_INLINE=false: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill();
}

const hosts = [...outsideHosts].map(([h, n]) => `${h} (${n})`).join(", ");
console.log(`\nOther sites the page asked for: ${hosts || "none"}${outsideHosts.has("archive.org") ? " (archive.org is unreachable in this sandbox; not a failure)" : ""}`);
console.log(`${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

// ---- helpers ----
async function bodyBg(page) { return page.evaluate(() => getComputedStyle(document.body).backgroundColor); }
async function noSideways(page, what) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${what}: no sideways scroll (${sw} <= ${cw})`);
}
/** Every button and link a finger presses is at least 40px tall (the cited words and chips included). */
async function tapTargets(page, what) {
  const small = await page.evaluate(() => [...document.querySelectorAll("button, a")]
    .filter((el) => el.offsetParent !== null && !el.closest(".qa-foot") && !el.closest(".ahp"))
    .map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) }))
    .filter((x) => x.h < 39.5));
  check(small.length === 0, `${what}: every control is at least 40px tall${small.length ? ": " + small.map((x) => `${x.t} ${Math.round(x.h)}px`).join(", ") : ""}`);
}
/** The poster on the Name page itself (POSTER_INLINE = true, the owner's Q4 = A): there straight away, after the
 *  Arabic, name, meaning and the Studied button (nothing crowded ahead of them), whole, and inside the screen. */
async function inlinePosterCalm(page, what, width) {
  await page.waitForSelector(".qa-namecard .qa-poster-inline .ahp", { timeout: 3000 }).catch(() => {});
  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getBoundingClientRect();
    const order = [".qa-ar", ".qa-name", ".qa-mean", ".qa-actions", ".qa-poster-inline"].map((s) => q(s));
    const poster = q(".qa-poster-inline .ahp");
    return {
      shown: !!poster && poster.height > 100,
      inOrder: order.every(Boolean) && order.every((b, i) => i === 0 || b.top >= order[i - 1].bottom - 1),
      button: !!document.querySelector(".qa-namecard .qa-btn[data-qa-poster]"),
      left: poster?.left ?? -1, right: poster?.right ?? 1e9, w: poster?.width ?? 0,
      gap: poster && order[3] ? poster.top - order[3].bottom : -1,
    };
  });
  check(r.shown && !r.button, `${what}: the poster shows on the Name straight away (no 🖼 button needed)`);
  check(r.inOrder && r.gap >= 8, `${what}: Arabic, name, meaning and buttons come first, then the poster (${Math.round(r.gap)}px clear)`);
  check(r.left >= 0 && r.right <= width && r.w >= Math.min(280, width - 80), `${what}: the poster fits the screen (${Math.round(r.w)}px wide)`);
  await noSideways(page, `${what} with the poster`);
}
/** A Name's "N of 99" label must end above the INK of its Arabic (the marks Amiri draws above the line box too). */
async function labelClearOfArabic(page, what) {
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const ar = document.querySelector("[data-qa-arabic]"), label = document.querySelector(".qa-num");
    const cs = getComputedStyle(ar);
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.direction = "rtl";
    const ink = ctx.measureText(ar.textContent.trim());
    const mark = document.createElement("span");
    mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    ar.appendChild(mark);
    const baseline = mark.getBoundingClientRect().top;
    mark.remove();
    const l = label.getBoundingClientRect(), a = ar.getBoundingClientRect();
    return { labelBottom: l.bottom, labelLeft: l.left, labelRight: l.right, inkTop: baseline - ink.actualBoundingBoxAscent, arLeft: a.left, arRight: a.right };
  });
  check(m.labelBottom <= m.inkTop, `${what}: the "N of 99" label (bottom ${m.labelBottom.toFixed(1)}) clears the Arabic's ink (top ${m.inkTop.toFixed(1)})`);
}
/** Every slice label and every outer number on the wheel: inside its own slice, and no two overlapping
 *  (each one's real turned box, compared with the separating-axis test, not just its upright bounding box). */
async function wheelLabelsCalm(page, what) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(50);
  const r = await page.evaluate(() => {
    const svg = document.querySelector("[data-qa-wheel] svg");
    const n = svg.querySelectorAll(".wheel-seg").length;
    const per = 360 / n, half = (per - Math.min(1.2, per * 0.08)) / 2;
    const toSvg = svg.getScreenCTM().inverse();
    const quads = [], outside = [];
    for (const el of svg.querySelectorAll("text.wheel-seg-label, text.wheel-seg-num")) {
      const b = el.getBBox();
      if (!b.width) continue;
      const m = el.getScreenCTM();
      const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      quads.push({ label: el.textContent.trim().slice(0, 24), pts: corners.map((p) => [p.x, p.y]) });
      if (el.classList.contains("wheel-seg-label")) {
        const px = Number(el.getAttribute("x")) - 180, py = Number(el.getAttribute("y")) - 180;
        const mid = Math.atan2(py, px) * 180 / Math.PI + 90;
        const ok = corners.every((p) => {
          const q = p.matrixTransform(toSvg), X = q.x - 180, Y = q.y - 180, rr = Math.hypot(X, Y);
          const d = Math.abs((((Math.atan2(Y, X) * 180 / Math.PI + 90 - mid) % 360) + 540) % 360 - 180);
          return rr >= 88 - 0.5 && rr <= 176 + 0.5 && d <= half + 0.05;
        });
        if (!ok) outside.push(el.textContent.trim().slice(0, 24));
      }
    }
    const axes = (pts) => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return [-(q[1] - p[1]), q[0] - p[0]]; });
    const proj = (pts, a) => { const v = pts.map((p) => p[0] * a[0] + p[1] * a[1]); return [Math.min(...v), Math.max(...v)]; };
    const overlap = (A, B) => [...axes(A), ...axes(B)].every((a) => { const [a0, a1] = proj(A, a), [b0, b1] = proj(B, a); return a1 > b0 + 0.5 && b1 > a0 + 0.5; });
    const clashes = [];
    for (let i = 0; i < quads.length; i++) for (let j = i + 1; j < quads.length; j++) {
      if (overlap(quads[i].pts, quads[j].pts)) clashes.push(`${quads[i].label} / ${quads[j].label}`);
    }
    return { count: quads.length, clashes, outside };
  });
  check(r.count > 0 && r.clashes.length === 0, `${what}: no two of its ${r.count} labels and numbers overlap${r.clashes.length ? ": " + r.clashes.slice(0, 4).join("; ") : ""}`);
  check(r.outside.length === 0, `${what}: every slice label stays inside its own slice${r.outside.length ? ": " + r.outside.slice(0, 4).join("; ") : ""}`);
}
/** The owner's editing note for group 19 is never on screen, in either language. */
async function noteVisible(page) {
  return page.evaluate(() => /Not yet placed|organize these yourself|সংগঠিত করা বাকি/.test(document.body.innerText));
}
/** The full poster covers the page: an opaque backdrop, and every point of the screen belongs to the overlay. */
async function overlayCovers(page, what) {
  const r = await page.evaluate(() => {
    const o = document.getElementById("qaPosterOverlay");
    const bg = getComputedStyle(o).backgroundColor;
    const alpha = /rgba\(/.test(bg) ? Number(bg.split(",")[3]) : 1;
    const leaks = [];
    for (let y = 2; y < innerHeight; y += 16) for (let x = 2; x < innerWidth; x += 16) {
      const el = document.elementFromPoint(x, y);
      if (!el || !o.contains(el)) leaks.push(`${x},${y}`);
    }
    return { bg, alpha, leaks };
  });
  check(r.alpha === 1, `${what}: the backdrop is opaque (${r.bg})`);
  check(r.leaks.length === 0, `${what}: nothing of the page behind shows through${r.leaks.length ? ` (${r.leaks.length} points, e.g. ${r.leaks.slice(0, 3).join(" ")})` : ""}`);
}
/** The page as served, with one thing broken (the files on disk are never touched). */
async function mutate(ctx, name) {
  const edits = {
    nav: [/nav\(\{ v: "name", n: (next|prev), g: groupId \}, \{ replace: true \}\)/g, "void 0"],
    firebase: [/^/, 'import "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";\n'],
    studied: [/localStorage\.setItem\(STUDIED_KEY,[^;]+;/, "void 0;"],
    back: [/overlayBack\.onclick = \(\) => backTo\(\{ v: "name", n, g: groupId \}\);/, "overlayBack.onclick = () => {};"],
    inline: [/export const POSTER_INLINE = true;/, "export const POSTER_INLINE = false;"],
    cardlabel: [/(\.qa-ar \{[^}]*?)padding-top: 0\.4em; /, "$1", "**/app/css/asma.css"],
    wheel: [/export function fitWheelLabels\(svg\) \{/, `export function chooseSliceLines(text, i, n, { lead = [] } = {}) {
  const s = String(text ?? "").trim(), mid = Math.floor(s.length / 2);
  let at = -1; for (let d = 0; d < mid && at < 0; d++) { if (s[mid - d] === " ") at = mid - d; else if (s[mid + d] === " ") at = mid + d; }
  return [...lead, ...(s.length <= 7 || at < 0 ? [s] : [s.slice(0, at), s.slice(at + 1)])];
}
export function fitWheelLabels(svg) { return;`, "**/app/js/asma-wheel-fit.js"],
  };
  if (!edits[name]) throw new Error(`Unknown mutation "${name}"`);
  await ctx.route(edits[name][2] ?? "**/app/js/asma-app.js", async (route) => {
    const res = await route.fetch();
    let text = await res.text();
    if (name === "wheel") text = text.replace(/export function chooseSliceLines\(/, "function chooseSliceLinesOff(");
    const out = text.replace(edits[name][0], edits[name][1]);
    if (out === text) throw new Error(`Mutation "${name}" did not apply`);
    await route.fulfill({ response: res, body: out });
  });
}
