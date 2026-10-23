// Audit part 56 (PCF MSA J29): the User Manual's "Getting started and moving around" and "Bookmarks", walked at 320 / 390 / 820 / 1280,
// signed out, as the owner and as a student, English and Bangla. Parts 18 and 23 proved the flows at 390 / 820 / 1440; this one adds
// the narrow widths, the signed-out and student viewers, finger size of every menu item, and the refused-write path (I15).
//   menus      the four menus: open, second tap closes, Esc closes, panel inside the screen, every item 40px or more, no sideways scroll
//   signedout  Home is the only menu; Sign in with Google is in it and finger-sized
//   student    a student's Bookmarks page lists their own bookmarks and offers no one else
//   rename     Manage bookmarks: Rename a bookmark stores the new name (the changed field is read from the stored write)
//   refused    a refused rename / retire / folder write shows an error on screen (I15) and the list keeps the old name
//   family     New bookmark for a child: stored in the CHILD's own document, the owner's folder matched by name
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part56-start-bookmarks-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {
  // The Home menu's Sign in button goes back to its own 27px height.
  signinsmall: ["app/css/shell.css", "**/css/shell.css*", ".nav-cat-links button#signOutBtn, .nav-cat-links button#signInBtn {", ".nav-cat-links button#signOutBtn {", "/app/deen-study.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const F = (id, name) => ({ id, name, parentId: null, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" });
const BM = (id, name, folderId, ayah) => ({ id, programId: "none", moduleId: "quranrevival", subjectId: "quran", name, position: `ayah:2:${ayah}`, folderId, removed: false,
  settings: { unitType: "ayah", surahNum: 2, ayahNum: ayah, trackableId: "tafsir" }, createdAt: "2026-09-01T00:00:00.000Z" });
const docFor = (pid, saved, folders) => `{ _id: TENANT_ID + "__${pid}", tenantId: TENANT_ID, personId: "${pid}", resume: {}, folders: ${JSON.stringify(folders)}, saved: ${JSON.stringify(saved)} }`;
const CHILD = `DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: "Zayd", managedByPersonId: "p1", isMinor: true, roles: ["student"] });`;
const SEED = `(function () { window.__stubApplyBatches = true; window.__DATA = DATA; ${CHILD}
  DATA.bookmarks = [${docFor("p1", [BM("b1", "Al-Baqarah 255", "fA", 255), BM("b2", "Unfiled 102", null, 102)], [F("fA", "Hifz")])}, ${docFor("p2", [BM("s1", "Student own 1", null, 1)], [])}]; })();`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;

async function open(lang, width, pagePath, { seed = "", signedOut = false, failWrites = false } = {}) {
  const extra = seed + (failWrites ? "window.__stubFailWrites = true;" : "");
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: extra || null });
  if (signedOut) {
    const full = stubFor({ banner: false, extraSeedJs: extra || null }).replace('cb({ uid: UID, email: "smahk9@gmail.com", displayName: "Owner" })', "cb(null)");
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: full }));
  }
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource|denied by the test|permission-denied/i.test(e));
const bmWrites = (page) => ev(page, () => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const isOpen = (page, i) => ev(page, (k) => document.querySelectorAll(".nav-cat")[k].open, i);

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1: the four menus, as the owner and as a student.
  for (const [who, seed] of [["owner", ""], ["student", STUDENT]]) {
    await flow("menus-" + who, lang, width, "/app/deen-study.html", async (t, page, errors) => {
      const n = await ev(page, () => document.querySelectorAll(".nav-cat").length);
      check(`${t}: POSITIVE CONTROL the menu bar has its four menus`, n === 4, String(n));
      for (let i = 0; i < n; i++) {
        const label = await ev(page, (k) => document.querySelectorAll(".nav-cat")[k].querySelector("summary").textContent.trim(), i);
        await page.click(`.nav-cat >> nth=${i} >> summary`); await settle(page, 350);
        const m = await ev(page, (k) => {
          const d = document.querySelectorAll(".nav-cat")[k]; const p = d.querySelector(".nav-cat-links").getBoundingClientRect();
          const small = [...d.querySelectorAll(".nav-cat-links a, .nav-cat-links button, .nav-cat-links select")].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 39.5).map((e) => `${e.textContent.trim().slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`);
          return { open: d.open, inside: p.left >= -0.5 && p.right <= innerWidth + 0.5, small };
        }, i);
        check(`${t}: ${label} opens, inside the screen, every item 40px or more`, m.open && m.inside && m.small.length === 0, JSON.stringify(m));
        if (i === 3) { // the Bookmark menu is a full-screen sheet: its own ✕ Close is the way out, and it is a finger-sized one
          const c = await ev(page, () => { const r = document.querySelector("[data-nav-bm-close]").getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
          check(`${t}: ${label}: ✕ Close is finger-sized (${c.w}x${c.h})`, c.h >= 39.5 && c.w >= 39.5, JSON.stringify(c));
          await page.click("[data-nav-bm-close]"); await settle(page, 250);
          check(`${t}: ${label}: ✕ Close closes it`, !(await isOpen(page, i)));
        } else {
          await page.click(`.nav-cat >> nth=${i} >> summary`); await settle(page, 250);
          check(`${t}: ${label}: a second tap closes it`, !(await isOpen(page, i)));
        }
        await page.click(`.nav-cat >> nth=${i} >> summary`); await settle(page, 250);
        await page.keyboard.press("Escape"); await settle(page, 250);
        check(`${t}: ${label}: Esc closes it`, !(await isOpen(page, i)));
      }
      check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
      if (bn) check(`${t}: the menu names are Bangla`, BN.test(await ev(page, () => document.getElementById("navBar").innerText)));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed });
  }

  // 2: signed out.
  await flow("signedout", lang, width, "/app/deen-study.html", async (t, page, errors) => {
    const n = await ev(page, () => document.querySelectorAll(".nav-cat").length);
    check(`${t}: Home is the only menu`, n === 1, String(n));
    await page.click(".nav-cat >> nth=0 >> summary"); await settle(page, 350);
    const b = await ev(page, () => { const e = document.getElementById("signInBtn"); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), shown: getComputedStyle(e).display !== "none", inside: r.left >= 0 && r.right <= innerWidth }; });
    check(`${t}: POSITIVE CONTROL Sign in with Google is in the Home menu`, b.shown && b.w > 0, JSON.stringify(b));
    check(`${t}: and it is finger-sized (${b.h}px) and inside the screen`, b.h >= 39.5 && b.inside, JSON.stringify(b));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
  }, { signedOut: true });

  // 3: Manage bookmarks: rename stored; a refused write is shown on screen and the old name stays (I15).
  for (const refused of [false, true]) {
    await flow(refused ? "refused" : "rename", lang, width, "/app/bookmarks.html", async (t, page, errors) => {
      await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 2, null, { timeout: 15000 });
      const small = await ev(page, () => [...document.querySelectorAll("[data-bm-rename], [data-bm-toggle]")].filter((e) => e.getBoundingClientRect().width > 0 && (e.getBoundingClientRect().height < 39.5)).map((e) => Math.round(e.getBoundingClientRect().height)));
      check(`${t}: POSITIVE CONTROL two bookmarks listed; Rename and Retire are finger-sized`, small.length === 0, small.join());
      check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
      await ev(page, () => { window.__stubWriteData = []; });
      page.once("dialog", (d) => d.accept("Audit renamed"));
      await page.click('[data-bm-id="b1"] [data-bm-rename]'); await settle(page, 800);
      const w = await bmWrites(page);
      const nameNow = await ev(page, () => document.querySelector('[data-bm-id="b1"] [data-bm-name]')?.textContent.trim() ?? document.querySelector('[data-bm-id="b1"]').innerText);
      if (!refused) {
        check(`${t}: Rename stores the new name in the owner's own bookmarks document`, w.some((x) => x.id.endsWith("__p1") && (x.data?.saved || []).some((s) => s.id === "b1" && s.name === "Audit renamed")), JSON.stringify(w.at(-1)?.data || null).slice(0, 200));
        check(`${t}: and the list shows it`, nameNow.includes("Audit renamed"), nameNow);
      } else {
        const banner = await ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" && b.getClientRects().length ? b.textContent : ""; });
        check(`${t}: a refused rename shows an error on screen (I15)`, banner.length > 8, banner);
        check(`${t}: and the list keeps the old name`, !nameNow.includes("Audit renamed") && nameNow.includes("Al-Baqarah"), nameNow);
        if (bn) check(`${t}: the error is in Bangla`, BN.test(banner), banner);
      }
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: SEED, failWrites: refused });
  }

  // 4: a student sees only their own bookmarks.
  await flow("student", lang, width, "/app/bookmarks.html", async (t, page, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 1, null, { timeout: 15000 });
    const txt = await ev(page, () => document.getElementById("app").innerText);
    check(`${t}: POSITIVE CONTROL the student's own bookmark is listed`, /Student own 1/.test(txt));
    check(`${t}: the owner's bookmarks are not shown to the student`, !/Al-Baqarah 255/.test(txt));
    // (Who else the roster offers is limited by the Rules on the server, which the stub does not have: reported, not asserted.)
    const me = await ev(page, () => document.getElementById("personSelect").value);
    check(`${t}: the page opens on the student themself`, me === "p2", me);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: SEED + STUDENT });

  // 5: a bookmark for a child goes into the child's own document, in a folder of the same name.
  await flow("family", lang, width, "/app/bookmarks.html", async (t, page, errors) => {
    await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
    await page.click("#newBookmarkBtn");
    await page.waitForSelector("#nbName", { state: "visible", timeout: 10000 });
    await page.fill("#nbName", "For Zayd");
    await page.fill("#nbSurah", "2").catch(() => {});
    await page.fill("#nbAyah", "10").catch(() => {});
    const boxes = await ev(page, () => [...document.querySelectorAll("#nbAssignees input[type=checkbox]")].map((c) => c.value));
    check(`${t}: POSITIVE CONTROL Assign to offers the child`, boxes.includes("p3"), boxes.join());
    await page.check('#nbAssignees input[value="p3"]');
    await page.selectOption("#nbFolder", { label: "Hifz" }).catch(() => {});
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click("#nbCreateBtn"); await settle(page, 1000);
    const w = await bmWrites(page);
    const kid = w.filter((x) => x.id.endsWith("__p3"));
    const kidSaved = kid.flatMap((x) => x.data?.saved || []), kidFolders = kid.flatMap((x) => x.data?.folders || []);
    check(`${t}: the bookmark is stored in the child's own document`, kidSaved.some((s) => s.name === "For Zayd"), JSON.stringify(w).slice(0, 300));
    check(`${t}: in a folder of the same name as the owner's`, kidFolders.some((f) => f.name === "Hifz") && kidSaved.some((s) => s.name === "For Zayd" && kidFolders.some((f) => f.id === s.folderId && f.name === "Hifz")), JSON.stringify(kid.map((x) => ({ s: x.data?.saved, f: x.data?.folders }))).slice(0, 400));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: SEED });
}
await browser.close();
console.log(`\n==== audit-part56${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
