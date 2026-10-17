// QR J02 S4: every link on every QR page goes somewhere real. Signed in through MMSA's harness (Firebase faked at the
// network layer, so the copied pages draw their full menus), with QR's one worker running, at 390 wide.
//   - every link a page shows leads to a page this site has (asked of the server: no 404) or to
//     madrasatul-muslimeen.github.io; any other site is listed (not failed);
//   - switch "mmsa" (app/js/qr-links.js QR_OTHER_SUBJECTS): links to pages QR does not hold open them in the full
//     Madrasah, the Asma module's link opens QR's own Asma, nothing is hidden;
//   - switch "hide" (served with the switch flipped; the file on disk is untouched): those links are hidden, and so is
//     a menu group or the Continue strip left with nothing in it;
//   - the site's 404.html, for an address typed or opened before the worker runs: such a page opens in the full
//     Madrasah ("mmsa"), or a calm note with the way home ("hide", and for any other missing address);
//   - QR_PAGES in qr-links.js is exactly the list of pages in app/.
//
//   node tools/apps/qr-verify/links-browser.mjs           (its own server, on PORT, default 8102)
//   --mutate=inject   the worker does not add qr-links.js to the copied pages: the suite must FAIL
//   --mutate=hide     the "hide" switch hides nothing: the suite must FAIL
//   --mutate=away     the one-time note before leaving for MMSA never shows (J02 S1e): the suite must FAIL
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const PORT = Number(process.env.PORT) || 8102;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const MMSA = "https://madrasatul-muslimeen.github.io";
const overrides = new Map();
const MUTATIONS = {
  inject: ["/app/sw.js", (t) => t.replace('if (req.mode !== "navigate" || !url.pathname.startsWith("/app/")) return false;', "return false;")],
  hide: ["/app/js/qr-links.js", (t) => t.replace('    a.setAttribute(HIDDEN, "");\n', "")],
  away: ["/app/js/qr-links.js", (t) => t.replace('try { return localStorage.getItem(AWAY_NOTE_KEY) === "1"; } catch { return false; }', "return true;")],
};
const edits = (p) => overrides.get(p) ?? [];
const addEdit = (p, fn) => overrides.set(p, [...edits(p), fn]);
if (MUTATE) {
  const [p, edit] = MUTATIONS[MUTATE] ?? [];
  if (!p) throw new Error(`Unknown mutation "${MUTATE}"`);
  const src = fs.readFileSync(path.join(ROOT, p), "utf8");
  if (edit(src) === src) throw new Error(`Mutation "${MUTATE}" did not apply`);
  addEdit(p, edit);
}
let mode = "mmsa";
const SWITCH = 'export const QR_OTHER_SUBJECTS = "mmsa";';
if (!fs.readFileSync("app/js/qr-links.js", "utf8").includes(SWITCH)) throw new Error("qr-links.js: the switch line is not as expected");

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": MIME[".html"] }); res.end(fs.readFileSync(path.join(ROOT, "404.html"))); return; }
    let body = data;
    const list = [...edits(p), ...(p === "/app/js/qr-links.js" && mode === "hide" ? [(t) => t.replace(SWITCH, 'export const QR_OTHER_SUBJECTS = "hide";')] : [])];
    if (list.length) body = list.reduce((t, fn) => fn(t), data.toString("utf8"));
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  });
});
await new Promise((r) => server.listen(PORT, r));
process.env.QR_BASE = `http://localhost:${PORT}`;
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const status = (url) => new Promise((r) => http.get(url, (res) => { res.resume(); r(res.statusCode); }).on("error", () => r(0)));
const LDOG_SEED = `
DATA.subjects.push(
  { _id: TENANT_ID + "__ldog", tenantId: TENANT_ID, subjectId: "ldog", parentId: null, name: lang("Learn Deen On-the-Go"), moduleIds: ["ldog"], ancestorIds: [], status: "active", order: 9 },
  { _id: TENANT_ID + "__daily_deen_habit", tenantId: TENANT_ID, subjectId: "daily_deen_habit", parentId: "ldog", name: lang("Daily Deen Learning Habit for Life"), moduleIds: ["ldog"], ancestorIds: ["ldog"], status: "active", order: 1, isTrackable: true }
);`;

// Every QR page: the front page, Asma's two, and the eleven copied ones.
const QR_PAGES = JSON.parse(fs.readFileSync("app/js/qr-links.js", "utf8").match(/QR_PAGES = Object\.freeze\((\[[\s\S]*?\])\)/)[1].replace(/,\s*\]$/, "]"));
const onDisk = fs.readdirSync("app").filter((f) => f.endsWith(".html")).sort();
check(JSON.stringify([...QR_PAGES].sort()) === JSON.stringify(onDisk), `qr-links.js QR_PAGES is exactly the pages in app/ (${onDisk.length})`);
const PAGES = ["/", ...onDisk.map((f) => `/app/${f}`)];
const others = new Map();

const browser = await chromium.launch();
try {
  for (const m of ["mmsa", "hide"]) {
    mode = m;
    try { await walk(m); } catch (err) { check(false, `${m}: stopped early: ${String(err.message).split("\n")[0]}`); }
    try { await notFound(m); } catch (err) { check(false, `${m}: 404 page stopped early: ${String(err.message).split("\n")[0]}`); }
  }
  for (const width of [390, 1400]) for (const lang of ["en", "bn"]) {
    mode = "mmsa";
    try { await awayNote(width, lang); } catch (err) { check(false, `away note @${width} ${lang} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server.close();
}
if (others.size) console.log(`\nLinks to other sites (listed, not failed):\n${[...others].map(([k, v]) => `  ${k}  (${[...v].join(", ")})`).join("\n")}`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function walk(m) {
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, allowServiceWorker: true, extraSeedJs: LDOG_SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(`${MMSA}/**`, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>MMSA</title><p>The full Madrasah</p>" }));
  await routeMmsaHadith(ctx); // after the catch-all: the newest route wins
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${page.url().replace(base, "")}: ${e.message}`));
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 });
  let rewrote = 0, hid = 0, toOwnAsma = 0, broken = [], shownOther = [], emptyHolders = [], away = 0, awayBad = [];
  for (const p of PAGES) {
    await page.goto(base + p, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const holders = [...document.querySelectorAll(".nav-cat-group, .nav-cat, .continue-strip")].filter((h) => !h.closest("[data-qr-hidden]"));
      return {
        controlled: !!navigator.serviceWorker.controller,
        links: [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.href, raw: a.getAttribute("href"), qrHidden: !!a.closest("[data-qr-hidden]"), mmsa: a.hasAttribute("data-qr-mmsa"), own: a.hasAttribute("data-qr-own"), away: a.hasAttribute("data-qr-away"), mark: !!a.querySelector(".qr-away-mark"), title: a.title })),
        empty: holders.filter((h) => h.querySelector("a[href]") && ![...h.querySelectorAll("a[href], button, select, input")].some((c) => !c.closest("[data-qr-hidden]") && !c.closest("summary"))).length,
      };
    });
    if (p.startsWith("/app/") && !["/app/asma.html", "/app/asma-about.html", "/app/index.html"].includes(p) && !r.controlled) check(false, `${m}: ${p} is served by QR's worker`);
    emptyHolders.push(...(r.empty ? [`${p} (${r.empty})`] : []));
    for (const l of r.links) {
      if (l.qrHidden) { hid++; continue; }
      if (l.mmsa) rewrote++;
      if (l.own && /\/app\/asma\.html/.test(l.href)) toOwnAsma++;
      const u = new URL(l.href);
      if (!/^https?:$/.test(u.protocol)) continue; // javascript:, mailto:, blob:
      if (u.origin === base) {
        if (u.pathname === new URL(page.url()).pathname && l.raw?.startsWith("#")) continue;
        const s = await status(`${base}${u.pathname}`);
        if (s !== 200) broken.push(`${p} → ${u.pathname} (${s})`);
      } else if (u.origin === MMSA) {
        if (l.away) { away++; if (!l.mark || !/Madrasah app|মাদ্রাসা অ্যাপে/.test(l.title) || !/^\/app\/[a-z-]+\.html$/.test(u.pathname)) awayBad.push(`${p} → ${u.pathname}`); }
        else if (m === "hide" && l.mmsa) shownOther.push(`${p} → ${u.pathname}`);
      } else {
        const k = u.origin; if (!others.has(k)) others.set(k, new Set()); others.get(k).add(p);
      }
    }
  }
  check(broken.length === 0, `${m}: every link on every QR page leads to a page this site has, or to the full Madrasah (${PAGES.length} pages${broken.length ? `; broken: ${[...new Set(broken)].slice(0, 12).join("; ")}` : ""})`);
  if (m === "mmsa") {
    check(rewrote > 0 && hid === 0, `mmsa: links to pages QR does not hold open them in the full Madrasah (${rewrote} links), none hidden (${hid})`);
  } else {
    check(hid > 0 && shownOther.length === 0, `hide: links to pages QR does not hold are hidden (${hid}), none left pointing away (${shownOther.length}${shownOther.length ? ": " + shownOther.slice(0, 6).join("; ") : ""})`);
    check(emptyHolders.length === 0, `hide: no menu group or Continue strip is left showing with nothing in it${emptyHolders.length ? ` (${emptyHolders.join("; ")})` : ""}`);
  }
  // J02 S1e: Notes, Bookmarks, Records... live in MMSA: in either mode their links go to MMSA's address, marked ↗.
  check(away > 0 && awayBad.length === 0, `${m}: links to the pages whose home is MMSA (Notes, Bookmarks, About...) go to MMSA's address with ↗ and the sign-in words (${away} links${awayBad.length ? "; not marked: " + awayBad.slice(0, 4).join("; ") : ""})`);
  check(toOwnAsma > 0, `${m}: the menu's "Asma ul Husna" opens QR's own Asma app (${toOwnAsma} links)`);
  // The Modules menu, as the reader sees it on Quran Study.
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const modules = await page.evaluate(() => {
    const d = [...document.querySelectorAll(".nav-cat")].find((x) => /Modules/.test(x.querySelector("summary")?.textContent ?? ""));
    return d ? [...d.querySelectorAll("a[href]")].filter((a) => !a.closest("[data-qr-hidden]")).map((a) => `${a.textContent.trim()}=${a.href.replace(location.origin, "")}`) : [];
  });
  const want = m === "mmsa"
    ? modules.some((s) => s.startsWith("Deen Study=https://madrasatul-muslimeen.github.io/app/deen-study.html")) && modules.some((s) => s === "Quran Study=/app/quranrevival.html")
    : modules.length > 0 && modules.every((s) => /=\/app\/(quranrevival|ldog-study|asma)\.html/.test(s));
  check(want, `${m}: Quran Study's Modules menu (${modules.join(", ")})`);
  // A Continue strip drawn after load, the way continue-strip.js draws it (the harness seeds no resume places).
  const strip = await page.evaluate(async () => {
    const host = document.createElement("div");
    host.innerHTML = '<div class="continue-strip"><a class="continue-chip" href="deen-study.html?resume=s1"><span class="continue-chip-label">Continue: Deen Study</span></a><a class="continue-chip" href="hadith-study.html?resume=s2"><span class="continue-chip-label">Continue: Hadith</span></a></div>';
    document.body.prepend(host);
    await new Promise((r) => setTimeout(r, 50));
    const el = host.querySelector(".continue-strip");
    return { hidden: getComputedStyle(el).display === "none", hrefs: [...el.querySelectorAll("a")].map((a) => a.href) };
  });
  check(m === "mmsa" ? !strip.hidden && strip.hrefs[0] === `${MMSA}/app/deen-study.html?resume=s1` : strip.hidden,
    `${m}: a Continue strip drawn later ${m === "mmsa" ? "opens the full Madrasah" : "is hidden when all its chips are"} (${JSON.stringify(strip)})`);
  check(errors.length === 0, `${m}: no page errors${errors.length ? ": " + errors.slice(0, 4).join(" | ") : ""}`);
  await ctx.close();
}

/** The site's 404.html, in a browser with no worker yet (the way a link opened before the worker runs lands). */
async function notFound(m) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_service_worker", "1"); } catch {} });
  await ctx.route(`${MMSA}/**`, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>MMSA</title><p>The full Madrasah</p>" }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/app/deen-study.html?resume=x#top`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  if (m === "mmsa") check(page.url() === `${MMSA}/app/deen-study.html?resume=x#top`, `mmsa: 404.html opens a page QR does not hold in the full Madrasah (${page.url()})`);
  else check(page.url().startsWith(base) && await page.locator("#qrNotHere").isVisible(), `hide: 404.html shows its note for a page QR does not hold (${page.url().replace(base, "")})`);
  await page.goto(`${base}/app/asma-study.html#v=names`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  check(page.url() === `${base}/app/asma.html#v=names`, `${m}: 404.html opens QR's own Asma for MMSA's asma-study.html (${page.url().replace(base, "")})`);
  await page.goto(`${base}/no-such-page.html`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const note = await page.evaluate(() => ({ shown: !document.getElementById("qrNotHere").hidden, home: document.querySelector("#qrNotHere .home")?.getAttribute("href"), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(note.shown && note.home === "/" && note.sw <= note.cw, `${m}: any other missing address: a calm note and the way home (${JSON.stringify(note)})`);
  check(errors.length === 0, `${m}: 404.html no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

/** J02 S1e: the calm one-time note before a reader first leaves for a page whose home is MMSA: on a tapped link (the menu's
 *  "Manage bookmarks…") and on a page opened by script (404.html: "Make a poster" goes to notes.html). */
async function awayNote(width, lang) {
  const tag = `away note @${width} ${lang}`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width < 600 ? 844 : 900 }, allowServiceWorker: true });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(`${MMSA}/**`, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>MMSA</title><p>The full Madrasah</p>" }));
  await routeMmsaHadith(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('a[data-qr-away][href$="/app/bookmarks.html"]', { state: "attached" });
  await page.waitForTimeout(800);
  const words = lang === "bn" ? /মাদ্রাসা অ্যাপে খুলবে/ : /This opens in the Madrasah app\. If it asks, sign in once with the same Google account; your notes are the same\./;
  const note = async () => page.evaluate(() => {
    const box = document.getElementById("qrAwayNote");
    if (!box) return null;
    const btns = [...box.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, w: r.width, in: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
    return { text: box.textContent.trim(), btns, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
  });
  await page.evaluate(() => document.querySelector('a[data-qr-away][href$="/app/bookmarks.html"]').click());
  await page.waitForSelector("#qrAwayNote");
  const n1 = await note();
  const want = lang === "bn" ? ["বাতিল", "চালিয়ে যান"] : ["Cancel", "Continue"];
  check(!!n1 && words.test(n1.text) && JSON.stringify(n1.btns.map((b) => b.t)) === JSON.stringify(want), `${tag}: tapping "Manage bookmarks…" first shows the note, in the reader's language (${n1?.btns.map((b) => b.t).join(" / ")})`);
  check(n1 && n1.btns.every((b) => b.h >= 40 && b.in) && n1.sw <= n1.cw, `${tag}: its buttons are 40px or taller and on screen (${n1?.btns.map((b) => Math.round(b.h)).join(", ")}), no sideways scroll`);
  if (process.env.SHOTS && width === 390) await page.screenshot({ path: `${process.env.SHOTS}/away-note-390-${lang}.png` });
  await page.click("#qrAwayNote .qan-stay");
  check(page.url().startsWith(`${base}/app/quranrevival.html`) && !(await note()), `${tag}: Cancel stays on Quran Study`);
  await page.evaluate(() => document.querySelector('a[data-qr-away][href$="/app/bookmarks.html"]').click());
  await page.waitForURL(`${MMSA}/**`);
  check(page.url() === `${MMSA}/app/bookmarks.html`, `${tag}: the second time there is no note; it opens MMSA's page (${page.url()})`);
  // By script, in a browser that has not seen the note yet: 404.html shows it, then Continue goes on.
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("qr_mmsa_away_note_seen"));
  await page.goto(`${base}/app/notes.html?unit=ayah%3A1%3A1&back=1`, { waitUntil: "load" });
  await page.waitForSelector("#qrAwayNote");
  check(words.test((await note())?.text ?? ""), `${tag}: a Notes page opened by script shows the same note first`);
  await page.click("#qrAwayNote .qan-go");
  await page.waitForURL(`${MMSA}/**`);
  check(page.url() === `${MMSA}/app/notes.html?unit=ayah%3A1%3A1&back=1`, `${tag}: Continue opens it in MMSA, address kept (${page.url()})`);
  check(errors.length === 0, `${tag}: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}
