// Note pane Part C, item 43 (decisions 72, 81; issue #619) -- link preview cards through Microlink: opt-in, per device, shown and never stored.
// Real clicks, en + bn, 390 / 820 / 1440. The sandbox cannot reach Microlink, so api.microlink.io is answered with page.route fixtures.
// MUTATE=on-by-default | no-confirm | title-innerhtml | http-picture | cache-ignored | no-limit | card-after-section  runs a deliberately broken build.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] === "none" ? "" : (process.argv[2] || process.env.MUTATE || "");
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const links = (n) => Array.from({ length: n }, (_, i) => `<p>Link ${i + 1}: <a href="https://site${i + 1}.example.com/page?x=1">site ${i + 1}</a></p>`).join("");
const BODIES = {
  n1: `<p>Plain: <a href="http://plain.example.com/">not secure</a></p><p>Mail: <a href="mailto:a@b.example.com">mail</a></p>${links(7)}`,
  n2: `<p>Evil: <a href="https://hostile1.example.com/">one</a></p><p>Pic: <a href="https://hostile2.example.com/">two</a></p>`,
  n3: `<p>Refused: <a href="https://refuse.example.com/">r</a></p>`,
  n4: `<p>Offline: <a href="https://offline.example.com/">o</a></p>`,
  // Architect review: a Note WITH headings, so the link sits inside a section body (the other fixtures have none).
  n5: `<h1>First</h1><p>Sec: <a href="https://secsite.example.com/">s</a></p><p>Second paragraph.</p><h1>Next</h1><p>Other.</p>`,
};
const seedJs = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.userPrefs = [{ _id: "test-uid" }];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2026-09-01T10:00:00Z") }, own));
  var B = ${JSON.stringify(BODIES)}, i = 0;
  Object.keys(B).forEach(function (id) { i++;
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: "Note " + id, bodyHtml: B[id], currentRevisionId: "r-" + id, status: "active", createdAt: ts("2026-08-01T09:00:00Z"), updatedAt: ts("2026-09-0" + i + "T10:00:00Z") }, own));
    DATA.notePlacements.push(Object.assign({ _id: "t1__p" + id, placementId: "p" + id, noteId: id, folderId: "fA", order: i, status: "active" }, own));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__r-" + id, revisionId: "r-" + id, noteId: id, previousRevisionId: null, title: "Note " + id, bodyHtml: B[id], revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-01T01:00:00Z") }, own));
  });
})();`;

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const HEIGHT = 900;
const W = (id) => `.note-win[data-note-id="${id}"]`;
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const leafToggle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).slice());
const cards = (page, id) => page.$$eval(`${W(id)} [data-link-preview]`, (els) => els.length);

async function openWindowFor(page, id, sheet, width) {
  if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT });
  await page.evaluate((s) => document.querySelector(s).click(), leafToggle(id));
  await page.evaluate((s) => document.querySelector(s).click(), leafWindowBtn(id));
  await page.waitForSelector(W(id));
  if (sheet) await page.setViewportSize({ width, height: HEIGHT });
  await page.waitForTimeout(250);
}
async function openPageWith(ctx) {
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 4, null, { timeout: 15000 });
  return { page, errors };
}
async function routeMutations(ctx) {
  if (!MUTATE) return;
  await ctx.route("**/*", async (route) => {
    const url = route.request().url();
    const edits = [];
    if (/note-link-preview\.js/.test(url)) {
      if (MUTATE === "on-by-default") edits.push(['storage.getItem(SETTING_KEY) === "1"', 'storage.getItem(SETTING_KEY) !== "0"']);
      if (MUTATE === "http-picture") edits.push(["!/^https:\\/\\/[^", "!/^https?:\\/\\/[^"], ['new URL(s).protocol === "https:" ? s : ""', "s"]);
      if (MUTATE === "cache-ignored") edits.push(["if (!e || typeof e.at", "if (true || !e || typeof e.at"]);
      if (MUTATE === "no-limit") edits.push(["if (out.length >= LIMITS.perNote) break;", ""]);
    }
    if (/note-window\.js/.test(url)) {
      if (MUTATE === "no-confirm") edits.push(["if (previewsOn(localStorage)) { setPreviewsOn(localStorage, false);", "if (true) { setPreviewsOn(localStorage, !previewsOn(localStorage));"]);
      if (MUTATE === "title-innerhtml") edits.push(["el.textContent = p.title;", "el.innerHTML = p.title;"]);
      if (MUTATE === "card-after-section") edits.push(['.matches(".note-sec, .note-sec-body, [data-pane-body]")', '.matches(".note-sec, [data-pane-body]")']);
    }
    if (!edits.length) return route.fallback();
    const res = await route.fetch();
    let body = await res.text();
    for (const [a, b] of edits) { if (!body.includes(a)) console.log(`  (mutation ${MUTATE} did not apply: ${a.slice(0, 40)})`); body = body.replace(a, b); }
    await route.fulfill({ response: res, body });
  });
}
const HOSTILE_TITLE = '<script>window.__pwned=1</script><img src=x onerror="window.__pwned=2">';
async function routeMicrolink(ctx, log) {
  await ctx.route(/^https?:\/\/img\.example\//, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG })); // http too, so a kept http: picture would really show
  await ctx.route("**/api.microlink.io/**", (route) => {
    const target = decodeURIComponent(new URL(route.request().url()).searchParams.get("url") || "");
    log.push(target);
    const json = (b, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(b) });
    if (target.includes("offline.")) return route.abort("internetdisconnected");
    if (target.includes("refuse.")) return json({ status: "fail", message: "rate limit" }, 429);
    if (target.includes("hostile1.")) return json({ status: "success", data: { title: HOSTILE_TITLE, description: "d".repeat(5000), image: { url: "javascript:window.__pwned=3" } } });
    if (target.includes("hostile2.")) return json({ status: "success", data: { title: "Plain title two", description: "ok", image: { url: "http://img.example/insecure.png" }, publisher: "FAKE SITE NAME" } });
    const host = new URL(target).hostname;
    return json({ status: "success", data: { title: `Title of ${host}`, description: `About ${host}`, image: { url: "https://img.example/a.png" }, publisher: "FAKE SITE NAME" } });
  });
}

for (const lang of (process.argv[3] || "en,bn").split(",")) { // argv: [mutation|none] [langs] [widths]
  for (const width of (process.argv[4] || "390,820,1440").split(",").map(Number)) {
    const tag = `${lang} ${width}px`;
    const sheet = width < 640;
    const reqs = [];
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: seedJs });
    await routeMutations(ctx);
    await routeMicrolink(ctx, reqs);
    const { page, errors } = await openPageWith(ctx);

    // ---- off by default ----
    await openWindowFor(page, "n1", sheet, width);
    await page.waitForTimeout(500);
    check(`${tag}: off by default: no card and no request to Microlink`, (await cards(page, "n1")) === 0 && reqs.length === 0, `${await cards(page, "n1")} cards, ${reqs.length} requests`);
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    const offLabel = await page.textContent(`${W("n1")} [data-pane-previews]`);
    check(`${tag}: the menu item reads Off${lang === "bn" ? " (in Bangla)" : ""}`, lang === "bn" ? hasBn(offLabel) && offLabel.includes("বন্ধ") : /Show link previews: Off/.test(offLabel), offLabel);
    await page.click(`${W("n1")} [data-pane-previews]`);
    await page.waitForSelector('[data-note-dialog="previews"]');
    const notice = await page.textContent('[data-note-dialog="previews"] p:not([data-dlg-msg])');
    check(`${tag}: the notice says what is sent, in words`, lang === "bn" ? hasBn(notice) && notice.includes("microlink.io") : notice === "Each link's address is sent to Microlink (microlink.io) to fetch its title, description and picture. Nothing else from your Note is sent.", notice);
    check(`${tag}: the notice buttons are 40px or taller and it does not overflow`, await page.evaluate(() => [...document.querySelectorAll('[data-note-dialog="previews"] button')].filter((b) => b.offsetParent && !b.matches("[data-dlg-close]")).every((b) => b.getBoundingClientRect().height >= 40)) && (await noSideways(page)));
    await page.waitForTimeout(300);
    check(`${tag}: asking does not send anything`, reqs.length === 0 && (await cards(page, "n1")) === 0);
    await page.click('[data-note-dialog="previews"] [data-preview-no]');
    await page.waitForTimeout(300);
    check(`${tag}: Cancel leaves it off and sends nothing`, reqs.length === 0 && (await cards(page, "n1")) === 0 && (await page.evaluate(() => localStorage.getItem("mmsa.linkPreviews.v1"))) === null);

    // ---- on ----
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    await page.click(`${W("n1")} [data-pane-previews]`);
    await page.waitForSelector('[data-note-dialog="previews"]');
    await page.click('[data-note-dialog="previews"] [data-preview-yes]');
    await until(page, (sel) => document.querySelectorAll(`${sel} [data-link-preview][data-preview-ready]`).length >= 1, W("n1"));
    await page.waitForTimeout(700);
    const n = await cards(page, "n1");
    check(`${tag}: five cards for seven https links, none for http: or mailto:`, n === 5 && reqs.length === 5 && reqs.every((u) => u.startsWith("https://site")), `${n} cards, requests ${JSON.stringify(reqs)}`);
    const c0 = await page.$eval(`${W("n1")} [data-link-preview]`, (c) => ({
      href: c.getAttribute("href"), target: c.target, rel: c.rel, h: c.getBoundingClientRect().height, title: c.querySelector("[data-preview-title]")?.textContent, host: c.querySelector("[data-preview-host]")?.textContent,
      desc: c.querySelector("[data-preview-desc]")?.textContent, img: c.querySelector("img") ? { rp: c.querySelector("img").referrerPolicy, lazy: c.querySelector("img").loading, src: c.querySelector("img").src } : null,
      after: c.previousElementSibling?.textContent, afterTag: c.previousElementSibling?.tagName,
    }));
    check(`${tag}: the card has the picture, title, description and the link's own host (not the answer's)`, c0.title === "Title of site1.example.com" && c0.desc === "About site1.example.com" && c0.host === "site1.example.com" && c0.img?.src === "https://img.example/a.png", JSON.stringify(c0));
    check(`${tag}: the picture is no-referrer and lazy`, c0.img?.rp === "no-referrer" && c0.img?.lazy === "lazy");
    check(`${tag}: the card opens the link in a new tab, safely, and sits under the link's paragraph`, c0.href === "https://site1.example.com/page?x=1" && c0.target === "_blank" && /noopener/.test(c0.rel) && /noreferrer/.test(c0.rel) && c0.afterTag === "P" && /^Link 1/.test(c0.after || ""), JSON.stringify(c0));
    check(`${tag}: the card is 40px or taller`, c0.h >= 40, `${c0.h}`);
    check(`${tag}: no sideways overflow with the cards on`, await noSideways(page));
    check(`${tag}: no text of the Note was changed (the link itself still there, unchanged)`, await page.evaluate((s) => document.querySelector(`${s} .note-sec, ${s} [data-pane-body]`).querySelectorAll('a[href="https://site1.example.com/page?x=1"]:not([data-link-preview])').length === 1, W("n1")));
    check(`${tag}: the setting is on this device only`, (await page.evaluate(() => localStorage.getItem("mmsa.linkPreviews.v1"))) === "1");
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    const onLabel = await page.textContent(`${W("n1")} [data-pane-previews]`);
    check(`${tag}: the menu item now reads On`, lang === "bn" ? onLabel.includes("চালু") : /: On/.test(onLabel), onLabel);
    await page.click(`${W("n1")} [data-pane-previews]`); // turning OFF is immediate
    await page.waitForTimeout(300);
    check(`${tag}: turning it off removes the cards at once, with no question`, (await cards(page, "n1")) === 0 && !(await page.$('[data-note-dialog="previews"]')));
    await page.evaluate(() => document.querySelector('.note-win[data-note-id="n1"] [data-win-close]')?.click());

    // ---- hostile answers ----
    await page.evaluate(() => localStorage.setItem("mmsa.linkPreviews.v1", "1"));
    await openWindowFor(page, "n2", sheet, width);
    await until(page, (sel) => document.querySelectorAll(`${sel} [data-link-preview][data-preview-ready]`).length >= 2, W("n2"));
    const hs = await page.$$eval(`${W("n2")} [data-link-preview]`, (els) => els.map((c) => ({
      title: c.querySelector("[data-preview-title]")?.textContent, desc: c.querySelector("[data-preview-desc]")?.textContent.length, imgs: [...c.querySelectorAll("img")].map((i) => i.src),
      inner: [...c.querySelectorAll("script, [onerror]")].length, host: c.querySelector("[data-preview-host]")?.textContent,
    })));
    check(`${tag}: a <script>/<img onerror> title is shown as plain words, never run or made into elements`, hs[0].title === HOSTILE_TITLE.slice(0, 120) && hs[0].inner === 0 && (await page.evaluate(() => window.__pwned === undefined)), JSON.stringify(hs[0]));
    check(`${tag}: a javascript: picture is dropped`, hs[0].imgs.length === 0);
    check(`${tag}: a 5,000-character description is cut to 240`, hs[0].desc === 240, `${hs[0].desc}`);
    check(`${tag}: an http: picture is dropped`, hs[1].imgs.length === 0 && hs[1].title === "Plain title two", JSON.stringify(hs[1]));
    check(`${tag}: the site name is the link's host, not the answer's`, hs[1].host === "hostile2.example.com" && !(await page.evaluate(() => document.body.textContent.includes("FAKE SITE NAME"))));
    check(`${tag}: no sideways overflow with a hostile answer`, await noSideways(page));
    await page.evaluate(() => document.querySelector('.note-win[data-note-id="n2"] [data-win-close]')?.click());

    // ---- refused and offline, in words ----
    for (const [id, kind, en] of [["n3", "refused", /could not be fetched: the preview service said no/], ["n4", "network", /could not be fetched: no connection/]]) {
      await openWindowFor(page, id, sheet, width);
      await until(page, (sel) => document.querySelector(`${sel} [data-link-preview][data-preview-failed]`), W(id));
      const say = await page.textContent(`${W(id)} [data-link-preview] [data-preview-status]`);
      check(`${tag}: ${kind} says so in words${lang === "bn" ? " (Bangla)" : ""}, and the link is unchanged`, (lang === "bn" ? hasBn(say) && !/could not/.test(say) : en.test(say)) && (await page.$$eval(`${W(id)} a[href]:not([data-link-preview])`, (a) => a.length)) === 1, say);
      check(`${tag}: ${kind}: no sideways overflow`, await noSideways(page));
      await page.evaluate((s) => document.querySelector(`${s} [data-win-close]`)?.click(), W(id));
    }
    check(`${tag}: a failure is not cached`, await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("mmsa.linkPreviewCache.v1") || "{}"); return !Object.keys(c).some((k) => /refuse|offline/.test(k)); }));

    // ---- Architect review: in a Note with headings, the card is under its paragraph, inside the section, and folds with it ----
    await openWindowFor(page, "n5", sheet, width);
    await until(page, (sel) => document.querySelector(`${sel} [data-link-preview][data-preview-ready]`), W("n5"));
    const sec = await page.$eval(`${W("n5")} [data-link-preview]`, (c) => ({ prevTag: c.previousElementSibling?.tagName, prev: c.previousElementSibling?.textContent, next: c.nextElementSibling?.textContent, inBody: !!c.parentElement?.matches(".note-sec-body") }));
    check(`${tag}: with headings, the card sits right under the link's paragraph, inside its section`, sec.prevTag === "P" && /^Sec:/.test(sec.prev || "") && sec.next === "Second paragraph." && sec.inBody, JSON.stringify(sec));
    await page.click(`${W("n5")} [data-sec-toggle="0"]`);
    await page.waitForTimeout(200);
    check(`${tag}: folding the section hides its card`, await page.$eval(`${W("n5")} [data-link-preview]`, (c) => c.getBoundingClientRect().height === 0));
    await page.click(`${W("n5")} [data-sec-toggle="0"]`);
    await page.evaluate((s) => document.querySelector(`${s} [data-win-close]`)?.click(), W("n5"));

    // ---- the cache: a second open (after a reload) makes no new request ----
    const before = reqs.length;
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 4 || document.querySelector("[data-folder-tree] .folder-row"), null, { timeout: 15000 });
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]').catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 4, null, { timeout: 15000 });
    await openWindowFor(page, "n2", sheet, width);
    await until(page, (sel) => document.querySelectorAll(`${sel} [data-link-preview][data-preview-ready]`).length >= 2, W("n2"));
    check(`${tag}: a second open uses the cache and makes no new request`, reqs.length === before, `${reqs.length - before} new requests`);

    // ---- nothing is ever written ----
    const w = await writes(page);
    check(`${tag}: no notes, noteRevisions or userPrefs write at any point`, !w.some((x) => ["notes", "noteRevisions", "userPrefs"].includes(x.col)), JSON.stringify(w.map((x) => x.col)));
    const real = errors.filter((e) => !/ERR_CERT|net::ERR|Failed to load resource|microlink|img\.example/i.test(String(e)));
    check(`${tag}: no page errors`, real.length === 0, real.slice(0, 3).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
