// Audit part 95 (PCF MSA J29): the Owner's way-back law (decision 86) across every link that leaves the 23 shared pages.
//
// For each page, at 1440x900 and 390x844 (English; Bangla too for the 5 pages with the most links):
//   1. collect every visible control that leaves the page: same-origin <a href> (not #..., not the page itself) and buttons whose
//      click navigates the main frame (found by clicking and watching for a navigation). Listed, never failed: the app's main menu
//      links (nav), mailto:/external/target=_blank links. Sign-out is skipped.
//   2. for each: put it mid-screen (opening the <details> it lives in), note scrollY and the open <details>, click it, then on the
//      destination look for a visible, in-screen "Back" control (a) and press it (b): it must land on the SAME path and query as
//      the source, scrollY within 80px, and the same <details> open again.
//   OK / NO BACK (fails a) / WRONG PLACE (fails b: wrong page, scroll or pop-up lost) / MENU / EXTERNAL (listed).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-way-back-audit-browser.mjs
//   --page=<file>   one page only      --list  print every control      --verbose  print passes
//   --max=<n>       distinct controls per page/viewport (default 12)    --no-bn  skip the Bangla pass
//   --mutate=noback       strip back=1 / navBack=1 from every link on about.html before clicking (NO BACK must appear)
//   --mutate=no-place-restore  switch off bookmark-nav.js's late place restore (Bookmarks / 390 / bn must FAIL; audit part 115)
//   --mutate=lose-scroll on the destination, rewrite Back to location.href = source path + query with no scroll or pop-up restore
// Findings are written to tools/i18n-verify/out/way-back-audit.json (git-ignored) for the report.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list");
const MAX = +arg("max") || 12, NO_BN = process.argv.includes("--no-bn");

// Copied from shared-pages-keyboard-audit-browser.mjs (not edited there).
const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
  ["Monitor", "monitor.html"], ["Homework", "homework.html"], ["People", "people.html"], ["Records", "records.html"],
  ["Catalogue", "catalogue.html"], ["About", "about.html"], ["Bookmarks", "bookmarks.html"],
  ["Hadith collections", "hadith-collections.html"],
  ["Landing", "index.html"], ["Notes", "notes.html"], ["Journey map", "journey-map.html"], ["Deen study", "deen-study.html"],
  ["Arabic study", "arabic-study.html"], ["Self-check", "admin-self-check.html"], ["Taglines", "taglines.html"],
];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.bookmarks[0].saved[0].name = "Ayat al-Kursi and the last two āyāt of Al-Baqarah";
// Audit part 114 (PCF MSA J29): the links a real tenant sees. Built here, never in firebase-stub.mjs's shared DATA.
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: TENANT_ID, ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  function hx(l) { return l.slice(1).repeat(32); }
  DATA.noteFolders = [Object.assign({ _id: TENANT_ID + "__fA", folderId: "fA", name: "Reflections", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts() }, own)];
  DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = []; DATA.noteLinks = [];
  [["n1", "A note filed to Ayat al-Kursi", "ayah:2:255", "quran-unit"], ["n2", "A note filed to a hadith", "hadith:synthetic-collection-1:1", "hadith-unit"]].forEach(function (r, i) {
    var id = hx(r[0]);
    DATA.notes.push(Object.assign({ _id: TENANT_ID + "__" + id, noteId: id, title: r[1], bodyHtml: "<p>Body</p>", currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: ts(), updatedAt: ts() }, own));
    DATA.noteSources.push(Object.assign({ _id: TENANT_ID + "__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: r[2], sourceKind: r[3], relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: ts(), updatedAt: ts() }, own));
    DATA.notePlacements.push(Object.assign({ _id: TENANT_ID + "__p" + i, placementId: "p" + i, noteId: id, folderId: "fA", order: i, status: "active" }, own));
  });
  function BM(id, mod, subj, name, pos, folder, extra) { return Object.assign({ id: id, programId: "none", moduleId: mod, subjectId: subj, name: name, position: pos, folderId: folder, removed: false, createdAt: "2026-09-01T00:00:00.000Z" }, extra || {}); }
  var b = DATA.bookmarks[0];
  b.folders = [{ id: "bA", name: "Daily reading", parentId: null, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" }];
  b.saved.push(BM("b2", "hadith", "hadith", "A saved hadith", "hadith:synthetic-collection-1:1", "bA"));
  b.saved.push(BM("b3", "dua", "dua", "A saved dua", "dua:1", "bA"));
  DATA.assignments[0].unitKeys = ["ayah:1:1", "ayah:1:2"];
  DATA.resources[0].url = "https://example.org/lesson";
})();
`;
const VIEWPORTS = [[1440, 900], [390, 844]];
const TOL = 80;
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

// ---- in-page code ----
// Candidates: every a[href] and button on the page, whether or not it sits in a closed <details>. The page decides what is a
// menu control, an external link, a skip. Returned in document order with a stable index, so a fresh load can find the same one.
const COLLECT = () => {
  const MENU = "nav, #navBar, .nav-bar, .nav-cat, .nav-link, .nav-cat-links, [class*='nav-bm'], .bm-back-row, #accountCard, [data-open-account-card]";
  const visIgnoringDetails = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    }
    return true;
  };
  const inClosedDetails = (el) => { for (let d = el.parentElement?.closest("details"); d; d = d.parentElement?.closest("details")) if (!d.open) return true; return false; };
  const text = (el) => ((el.getAttribute("aria-label") || el.textContent || el.value || "") + "").replace(/\s+/g, " ").trim().slice(0, 50);
  const out = [];
  [...document.querySelectorAll("a[href], button")].forEach((el, idx) => {
    if (el.disabled || el.closest("[hidden]")) return;
    if (!visIgnoringDetails(el)) return;
    // a control in a closed <details> that is not ITS OWN summary is reachable by opening the details
    const r = el.getBoundingClientRect();
    const sized = r.width > 1 && r.height > 1;
    if (!sized && !inClosedDetails(el)) return;
    const isA = el.tagName === "A";
    let kind = "page", href = "";
    if (isA) {
      const raw = el.getAttribute("href") || "";
      if (raw.startsWith("#") || /^javascript:/i.test(raw)) return;
      if (/^mailto:|^tel:/i.test(raw)) kind = "external";
      else {
        let u; try { u = new URL(el.href, location.href); } catch { return; }
        if (u.origin !== location.origin) kind = "external";
        else if (el.target === "_blank") kind = "external";
        else if (u.pathname === location.pathname && u.search === location.search) return;
        else if (el.hasAttribute("download")) return;
        href = u.pathname + u.search;
      }
    }
    const t = text(el);
    if (/sign.?out|log.?out|সাইন আউট|লগ আউট/i.test(t + " " + (el.id || ""))) return;
    // a page's own "Go back" / "← Back" link is a way back, not a way out to be audited
    if (/^(←\s*)?(go back|back|ফিরে যান|পেছনে)/i.test(t)) return;
    if (el.closest(MENU) && !(el.closest(MENU).matches(".bm-back-row"))) { out.push({ idx, tag: el.tagName, text: t, href, menu: true, kind }); return; }
    if (el.closest(".bm-back-row")) return;
    out.push({ idx, tag: el.tagName, text: t, href, menu: false, kind, id: el.id || "" });
  });
  return out;
};

// Put control idx mid-screen (opening the <details> around it) and record the state a reader would expect back.
const PREPARE = (idx) => {
  const el = [...document.querySelectorAll("a[href], button")][idx];
  if (!el) return null;
  const opened = [];
  for (let d = el.parentElement?.closest("details"); d; d = d.parentElement?.closest("details")) { d.open = true; }
  const dets = [...document.querySelectorAll("details")].filter((d) => !d.closest("nav, #navBar, .nav-bar, .nav-cat"));
  dets.forEach((d, i) => { if (d.open) opened.push(i); });
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  const onScreen = r.width > 1 && r.height > 1 && r.top >= 0 && r.bottom <= innerHeight + 2;
  return { scrollY: Math.round(scrollY), opened, onScreen, pageLen: document.documentElement.scrollHeight };
};

// A visible, in-screen Back control. Returns a handle (data attribute) or null.
const FIND_BACK = () => {
  const re = /^(←|‹|<|⬅|←\s)?\s*(back|ফিরে যান|পেছনে|ফিরে)/i;
  const cands = [...document.querySelectorAll("[data-bm-back-link], a, button, [role=button]")].filter((el) => {
    const label = ((el.getAttribute("aria-label") || "") + " " + (el.textContent || "")).replace(/\s+/g, " ").trim();
    return el.matches("[data-bm-back-link]") || re.test(label.replace(/^[^\p{L}←]+/u, (m) => (m.includes("←") ? "←" : "")).trim()) || re.test(label) || /^←/.test(label);
  }).filter((el) => {
    if (el.closest("nav, #navBar, .nav-bar, .nav-cat")) return false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (e.hidden || cs.display === "none" || cs.visibility === "hidden") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  });
  document.querySelectorAll("[data-wb-back]").forEach((x) => x.removeAttribute("data-wb-back"));
  if (!cands.length) return null;
  const pick = cands.find((c) => c.matches("[data-bm-back-link]")) || cands[0];
  pick.setAttribute("data-wb-back", "1");
  return { label: (pick.getAttribute("aria-label") || pick.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), href: pick.getAttribute("href") || "" };
};

const STATE_NOW = () => {
  const dets = [...document.querySelectorAll("details")].filter((d) => !d.closest("nav, #navBar, .nav-bar, .nav-cat"));
  return { scrollY: Math.round(scrollY), opened: dets.map((d, i) => (d.open ? i : -1)).filter((i) => i >= 0) };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = [];
const summary = [];

async function open(ctx, path, lang) {
  const sep = path.includes("?") ? "&" : "?";
  const { page, errors } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"));
  await page.waitForTimeout(900);
  return { page, errors };
}
const norm = (u) => { const x = new URL(u); return x.pathname + x.search; };
// navBack=1/back=1 are the markers the source was opened WITH; a way back to the source need not repeat them
const stripMarks = (s) => s.replace(/([?&])(navBack|back)=1(&|$)/g, (m, a, b) => (b ? a : "")).replace(/[?&]$/, "");

async function runPage(name, path, w, h, lang) {
  const tag = `${name} / ${w} / ${lang}`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED, appLang: lang === "bn" ? "bn" : null });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "no-place-restore") await ctx.addInitScript(() => { window.__mmsaNoPlaceRestore = true; });
  try {
    let { page: P } = await open(ctx, path, lang);
    const mutateAbout = MUTATE === "noback" && path.startsWith("about.html");
    const stripLinks = async (pg) => { if (mutateAbout) await pg.evaluate(() => document.querySelectorAll("a[href]").forEach((a) => { const h = a.getAttribute("href"); if (/(navBack|back)=1/.test(h)) a.setAttribute("href", h.replace(/([?&])(navBack|back)=1(&|$)/g, (m, x, y) => (y ? x : "")).replace(/[?&]$/, "")); })); };
    await stripLinks(P);
    const cands = await P.evaluate(COLLECT);
    const sourceUrl = P.url();
    const sourceKey = norm(sourceUrl);
    const menu = cands.filter((c) => c.menu), external = cands.filter((c) => !c.menu && c.kind === "external");
    // distinct page links by href (first one wins), plus buttons
    const seenHref = new Set(), links = [], buttons = [];
    for (const c of cands) {
      if (c.menu || c.kind === "external") continue;
      if (c.tag === "A") { if (seenHref.has(c.href)) continue; seenHref.add(c.href); links.push(c); }
      else buttons.push(c);
    }
    const total = links.length;
    // buttons: click each, watch for a main-frame navigation; a button that does not navigate is not a way out
    const navButtons = [];
    const bcap = buttons.slice(0, 60);
    for (const b of bcap) {
      const prep = await P.evaluate(PREPARE, b.idx).catch(() => null);
      if (!prep || !prep.onScreen) continue;
      const before = P.url();
      const box = await P.evaluate((i) => { const r = [...document.querySelectorAll("a[href], button")][i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, b.idx).catch(() => null);
      if (!box) continue;
      await P.mouse.click(box.x, box.y).catch(() => {});
      await P.waitForTimeout(350);
      if (P.url() !== before) {
        if (new URL(P.url()).origin === new URL(before).origin && norm(P.url()) !== norm(before)) navButtons.push(b);
        await P.goto(sourceUrl).catch(() => {}); await P.waitForTimeout(700); await stripLinks(P);
      } else {
        // state may have changed (a dialog opened): reload for a clean page and re-find nothing — indexes are by document order of a fresh load
        await P.keyboard.press("Escape").catch(() => {});
        const changed = await P.evaluate(() => document.querySelectorAll("dialog[open], [role=dialog], .modal").length).catch(() => 0);
        if (changed) { await P.goto(sourceUrl).catch(() => {}); await P.waitForTimeout(700); await stripLinks(P); }
      }
    }
    const todo = [...links.map((c) => ({ ...c, via: "link" })), ...navButtons.map((c) => ({ ...c, via: "button" }))].slice(0, MAX);
    // Positive controls, on About only (it has no in-page link of its own): a MAIN-MENU link to Catalogue, which carries navBack=1
    // and must show ← Back. Run once with the source at the top (expected OK) and once with the source scrolled 500px, which is the
    // way-back law's "exactly where they were" (expected WRONG PLACE today: the shared ← Back is a plain link, so the source reloads
    // at the top). They are what the mutations act on, and are counted in About's totals, marked [control].
    if (path.startsWith("about.html") && lang === "en") {
      const m = menu.find((x) => x.tag === "A" && /catalogue\.html/.test(x.href));
      if (m) { todo.push({ ...m, via: "menu link [control: source at top]", control: "top" }); todo.push({ ...m, via: "menu link [control: source scrolled 500px]", control: "scrolled" }); }
    }
    let n = { ok: 0, noback: 0, wrong: 0 };
    const rowsHere = [];
    for (const c of todo) {
      const label = `${c.via} "${c.text}"${c.href ? " -> " + c.href : ""}`;
      await P.goto(sourceUrl).catch(() => {});
      await P.waitForTimeout(700);
      await stripLinks(P);
      let st;
      if (c.control) {
        // menu opened, source optionally scrolled; the click is made in the page (the menu sits at the top of a scrolled page)
        st = await P.evaluate((scrolled) => { document.querySelectorAll(".nav-cat").forEach((d) => { d.open = true; }); if (scrolled) window.scrollTo(0, 500); return null; }, c.control === "scrolled");
        await P.waitForTimeout(300);
        st = await P.evaluate(STATE_NOW);
        await P.evaluate((i) => [...document.querySelectorAll("a[href], button")][i].click(), c.idx);
      } else {
        const prep = await P.evaluate(PREPARE, c.idx).catch(() => null);
        if (!prep) { rowsHere.push({ label, status: "SKIPPED", why: "control not found on fresh load" }); continue; }
        await P.waitForTimeout(250);
        st = await P.evaluate(STATE_NOW);
        const box = await P.evaluate((i) => { const r = [...document.querySelectorAll("a[href], button")][i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, c.idx);
        await P.mouse.click(box.x, box.y);
      }
      await P.waitForTimeout(1300);
      let landed = P.url();
      if (norm(landed) === norm(sourceUrl)) { rowsHere.push({ label, status: "SKIPPED", why: "did not leave the page" }); continue; }
      // (a) a visible Back control inside the screen
      let back = null;
      for (let tries = 0; tries < 5 && !back; tries++) { back = await P.evaluate(FIND_BACK).catch(() => null); if (!back) await P.waitForTimeout(700); }
      if (!back) { n.noback++; rowsHere.push({ label, status: "NO BACK", dest: norm(landed) }); check(`${tag} / ${label} has a visible ← Back`, false, `lands on ${norm(landed)}`); continue; }
      // (b) pressing it returns to the source page, with scroll and pop-ups
      // the chip settles for ~1.5s after it mounts (it lifts itself clear of fixed bars): measure it once it has, and require that a
      // finger can actually reach it (nothing else painted over its centre)
      await P.waitForTimeout(1600);
      back = await P.evaluate(FIND_BACK).catch(() => null);
      const hit = back ? await P.evaluate(() => { const b = document.querySelector("[data-wb-back]"); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === b || b.contains(e) || e.contains(b)); }) : false;
      if (!back || !hit) { n.noback++; rowsHere.push({ label, status: "NO BACK", dest: norm(landed), why: back ? "Back is on the page but covered by another element" : "no Back control" }); check(`${tag} / ${label} has a visible ← Back`, false, back ? `covered: ${back.label}` : "none"); continue; }
      if (MUTATE === "lose-scroll") {
        await P.evaluate((src) => { const b = document.querySelector("[data-wb-back]"); const k = b.cloneNode(true); k.removeAttribute("href"); k.setAttribute("data-wb-back", "1"); b.replaceWith(k); k.addEventListener("click", () => { location.href = src; }); }, sourceKey);
      }
      if (MUTATE === "history-back") { // a positive control for the scroll check: the browser's own history step restores scroll
        await P.evaluate(() => { const b = document.querySelector("[data-wb-back]"); const k = b.cloneNode(true); k.removeAttribute("href"); k.setAttribute("data-wb-back", "1"); b.replaceWith(k); k.addEventListener("click", () => history.back()); });
      }
      const bb = await P.evaluate(() => { const r = document.querySelector("[data-wb-back]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (process.argv.includes("--debug")) console.log("   back control:", JSON.stringify(back), JSON.stringify(bb), await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + e.className : "none"; }, [bb.x, bb.y]));
      await P.mouse.click(bb.x, bb.y);
      await P.waitForTimeout(1500);
      const backUrl = P.url();
      const now = await P.evaluate(STATE_NOW).catch(() => ({ scrollY: -1, opened: [] }));
      const samePlace = stripMarks(norm(backUrl)) === stripMarks(sourceKey);
      const scrollOk = Math.abs(now.scrollY - st.scrollY) <= TOL;
      const popOk = st.opened.every((i) => now.opened.includes(i));
      const why = [!samePlace && `went to ${norm(backUrl)}`, samePlace && !scrollOk && `scrollY ${now.scrollY}, was ${st.scrollY}`, samePlace && !popOk && `pop-up ${st.opened.join(",")} not open again (open: ${now.opened.join(",") || "none"})`].filter(Boolean).join("; ");
      if (samePlace && scrollOk && popOk) { n.ok++; rowsHere.push({ label, status: "OK" }); check(`${tag} / ${label} returns to where it was`, true); }
      else { n.wrong++; rowsHere.push({ label, status: "WRONG PLACE", why, back: back.label }); check(`${tag} / ${label} returns to where it was`, false, why); }
    }
    const errs = quiet([]).length;
    summary.push({ page: name, path, w, lang, found: total + navButtons.length, links: total, buttons: navButtons.length, checked: todo.length, ok: n.ok, noback: n.noback, wrong: n.wrong, menu: menu.length, external: external.length });
    findings.push({ page: name, path, w, lang, rows: rowsHere, menu: menu.map((m) => m.href || m.text), external: external.map((m) => m.href || m.text) });
    // Audit part 114: always printed, so a page that still finds 0 in-page controls is visible
    console.log(`   ${tag}: ${total} links, ${navButtons.length} navigating buttons${total + navButtons.length === 0 ? " (NO IN-PAGE CONTROLS FOUND)" : ""}, ${menu.length} menu, ${external.length} external; ok ${n.ok}, no back ${n.noback}, wrong place ${n.wrong}`);
    return total;
  } finally { await ctx.close(); }
}

const linkCounts = [];
for (const [name, path] of PAGES) {
  if (ONLY && !ONLY.split(",").some((p) => path.startsWith(p))) continue;
  console.log(`\n== ${name} (${path}) ==`);
  for (const [w, h] of VIEWPORTS) {
    const total = await runPage(name, path, w, h, "en");
    if (w === 1440) linkCounts.push([name, path, total]);
  }
}
if (!NO_BN) {
  const top = linkCounts.sort((a, b) => b[2] - a[2]).slice(0, 5);
  console.log(`\n== Bangla pass: ${top.map((t) => t[0]).join(", ")} ==`);
  for (const [name, path] of top) for (const [w, h] of VIEWPORTS) await runPage(name, path, w, h, "bn");
}
await browser.close();

fs.mkdirSync("tools/i18n-verify/out", { recursive: true });
fs.writeFileSync("tools/i18n-verify/out/way-back-audit" + (MUTATE ? "-" + MUTATE : "") + (ONLY ? "-" + ONLY.replace(/\W/g, "") : "") + ".json", JSON.stringify({ summary, findings }, null, 1));
for (const s of summary) console.log(JSON.stringify(s));
const sum = (k) => summary.reduce((a, s) => a + s[k], 0);
console.log(`\n==== Way-back audit${MUTATE ? " (mutate=" + MUTATE + ")" : ""}: ${sum("ok")} OK, ${sum("noback")} NO BACK, ${sum("wrong")} WRONG PLACE of ${sum("checked")} checked; ${sum("menu")} menu + ${sum("external")} external listed ====`);
console.log(`==== Shared pages way-back audit: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
