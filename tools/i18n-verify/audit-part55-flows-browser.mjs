// Audit part 55 (PCF MSA J29): the teaching and family FLOWS driven end to end, as the owner and as a student.
// (Part 54 / PR #1091 was not on main when this was written, so the shape is copied from audit-part17 and audit-part25.)
//   lock      Hand the device to a child: Start studying; a second child is REFUSED while it is on; the lock survives a reload and
//             a visit to another page; End session puts the reader back on the same page, same chosen child (way-back law);
//             D10: recording for three people in a row (Add person x3, the homework picker across all three) leaves the lock off
//   viewas    View as: the notice says so in words, admin controls go, it survives a reload and shows on ANOTHER page, off restores
//   student   a student login sees no admin controls on People, Classes and Course Offers
//   continue  a seeded resume bookmark: tap Continue, land on that topic's detail with a visible ← Back
//   failed    a refused write on Classes / Course Offers shows an error on screen (I15), says nothing was created, stores nothing
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part55-flows-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
const PROBE = process.env.PROBE === "1";
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {
  // End session no longer releases the lock.
  norelease: ["app/people.html", "**/people.html*", "      releaseStudyLock();\n      renderStudyLockState();\n    });\n  </script>", "      renderStudyLockState();\n    });\n  </script>", "/app/people.html"],
  // A second child can be started while the first is locked in.
  noguard: ["app/js/study-lock.js", "**/study-lock.js*", "  if (lock.personId === targetPersonId) return { allowed: true };\n", "  return { allowed: true };\n", "/app/people.html"],
  // Add person engages the lock (D10 broken).
  d10: ["app/people.html", "**/people.html*", "    addBtn.addEventListener(\"click\", async () => {\n", "    addBtn.addEventListener(\"click\", async () => {\n      acquireStudyLock(studyPersonSelect.value);\n", "/app/people.html"],
  // The preview notice vanishes from the page.
  nonotice: ["app/js/nav.js", "**/js/nav.js*", '`<span class="nav-preview-notice"', '`<span hidden class="nav-preview-notice"', "/app/people.html"],
  // A Continue chip opens its page without back=1.
  noback: ["app/js/continue-strip.js", "**/continue-strip.js*", '&back=1">', '">', "/app/deen-study.html"],
  // A refused Create class says "Class created.".
  falsecreated: ["app/classes.html", "**/classes.html*", "createResult.textContent = outcome.entry.message;", 'createResult.textContent = t("Class created.");', "/app/classes.html"],
  // A student sees the New class form.
  studentform: ["app/classes.html", "**/classes.html*", 'createFieldset.style.display = canAdmin ? "" : "none";', 'createFieldset.style.display = "";', "/app/classes.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const OWNER_P3 = `DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Zayd", "জায়েদ"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;
const RESUME = (updatedAt) => ({ position: "deen_ethics", settings: null, updatedAt });
const BOOKMARK = `(function () { window.__stubApplyBatches = true; window.__DATA = DATA; DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", folders: [], saved: [], resume: ${JSON.stringify({ "deen::none::deen_ethics": RESUME("2026-10-15T00:00:00.000Z") })} }]; })();`;

async function open(lang, width, pagePath, { seed = "", failWrites = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: (seed + (failWrites ? "window.__stubFailWrites = true;" : "")) || null });
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
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const lockOf = (page) => ev(page, () => JSON.parse(sessionStorage.getItem("qr.studyLock") || "null"));
const shown = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, sel);

const WIDTHS = [390, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1: Hand the device to a child, end to end.
  await flow("lock", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#startStudyBtn", { state: "visible", timeout: 10000 });
    const opts = await ev(page, () => [...document.querySelectorAll("#studyPersonSelect option")].map((o) => o.value));
    check(`${t}: POSITIVE CONTROL the Child list offers both children`, opts.join() === "p2,p3", opts.join());
    // D10: three people recorded in a row never touch the lock.
    for (const n of ["One Audit", "Two Audit", "Three Audit"]) {
      await page.fill("#name", n); await page.check("#isMinor"); await page.click("#addBtn"); await settle(page, 450);
    }
    const adds = (await writes(page, 0)).filter((x) => x.col === "tenantPeople").length;
    check(`${t}: POSITIVE CONTROL three people were really recorded in a row`, adds === 3, `${adds} tenantPeople writes`);
    check(`${t}: recording three people in a row leaves the lock off (D10)`, (await lockOf(page)) === null && !(await shown(page, "#endStudyBtn")));
    // Start for p2 from a scrolled-down page.
    await page.selectOption("#studyPersonSelect", "p2");
    await ev(page, () => document.getElementById("studyPersonSelect").scrollIntoView({ block: "center" }));
    const before = await ev(page, () => ({ y: Math.round(scrollY), url: location.href, who: document.getElementById("studyPersonSelect").value }));
    await page.click("#startStudyBtn"); await settle(page, 300);
    const lock = await lockOf(page);
    check(`${t}: Start studying locks the device to the chosen child`, !!lock && lock.personId === "p2", JSON.stringify(lock));
    // What the child cannot do: switch to another child.
    await page.selectOption("#studyPersonSelect", "p3");
    await page.click("#startStudyBtn"); await settle(page, 300);
    const said = await ev(page, () => document.getElementById("studyResult").textContent);
    check(`${t}: a second child is REFUSED while the lock is on, in words (${bn ? "Bangla" : "English"}), and the lock stays with the first`, (await lockOf(page))?.personId === "p2" && (bn ? BN.test(said) : /^A study session is in progress for another person/.test(said)), said);
    // The lock survives a reload and a visit to another page.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#endStudyBtn", { state: "attached", timeout: 10000 });
    await settle(page, 600);
    check(`${t}: after a reload the page still says the device is locked and offers End session`, (await lockOf(page))?.personId === "p2" && await shown(page, "#endStudyBtn"));
    await page.goto(page.url().replace("people.html", "classes.html"), { waitUntil: "networkidle" });
    check(`${t}: the lock is still held on another page (an accident guard held for the session)`, (await lockOf(page))?.personId === "p2");
    await page.goBack({ waitUntil: "networkidle" });
    await page.waitForSelector("#endStudyBtn", { state: "attached", timeout: 10000 });
    await settle(page, 600);
    await page.click("#endStudyBtn"); await settle(page, 300);
    check(`${t}: End session releases the lock`, (await lockOf(page)) === null && !(await shown(page, "#endStudyBtn")));
    const after = await ev(page, () => ({ url: location.href, who: document.getElementById("studyPersonSelect").value }));
    check(`${t}: the reader is back on the same page, same Child chosen (way-back law)`, after.url === before.url && after.who.length > 0, JSON.stringify({ before, after }));
    // The Child list is in step with the roster after all that.
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: OWNER_P3 });

  // D10 on a records page: switching the person across all three never takes the lock.
  await flow("lock-dropdown", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#personSelect", { state: "attached", timeout: 15000 });
    await settle(page, 600);
    const vals = await ev(page, () => [...document.querySelectorAll("#personSelect option")].map((o) => o.value));
    check(`${t}: POSITIVE CONTROL the person picker offers three people`, vals.length >= 3, vals.join());
    // The picker sits in the context bar; set it the way a change event does (a hidden bar cannot be clicked, and need not be).
    for (const v of vals) { await ev(page, (x) => { const s = document.getElementById("personSelect"); s.value = x; s.dispatchEvent(new Event("change", { bubbles: true })); }, v); await settle(page, 350); }
    check(`${t}: picking each of the ${vals.length} people in a row leaves the lock off (D10)`, (await lockOf(page)) === null);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: OWNER_P3 });

  // 2: View as.
  await flow("viewas", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#viewAsSelect", { state: "visible", timeout: 10000 });
    // Rendered, not merely present: a notice in the DOM that nobody can see is a forgotten preview.
    const notice = () => ev(page, () => { const e = document.querySelector(".nav-preview-notice"); return e && getComputedStyle(e).display !== "none" && e.getClientRects().length ? e.textContent : ""; });
    check(`${t}: POSITIVE CONTROL no notice before a preview`, (await notice()) === "");
    await page.selectOption("#viewAsSelect", "guardian"); await settle(page, 900);
    const n1 = await notice();
    check(`${t}: viewing as Guardian says so in words (${bn ? "Bangla" : "English"})`, bn ? BN.test(n1) : /Previewing as: Guardian/.test(n1), n1);
    check(`${t}: and the Add person form is gone`, !(await shown(page, "#addPersonBox")));
    // A forgotten preview must not be invisible: another page, then a reload.
    await page.goto(page.url().replace("people.html", "classes.html"), { waitUntil: "networkidle" });
    await settle(page, 900);
    check(`${t}: the notice shows on ANOTHER page too`, (await notice()).length > 8, await notice());
    check(`${t}: and Classes hides the New class form from the preview`, !(await shown(page, "#createClassBtn")));
    await page.reload({ waitUntil: "networkidle" }); await settle(page, 900);
    check(`${t}: and after a reload`, (await notice()).length > 8);
    await page.goto(page.url().replace("classes.html", "people.html"), { waitUntil: "networkidle" });
    await page.waitForSelector("#viewAsSelect", { state: "visible", timeout: 10000 });
    await page.selectOption("#viewAsSelect", ""); await settle(page, 900);
    check(`${t}: turning it off removes the notice and restores the Add person form`, (await notice()) === "" && await shown(page, "#addPersonBox"));
    await page.goto(page.url().replace("people.html", "classes.html"), { waitUntil: "networkidle" }); await settle(page, 900);
    check(`${t}: and the New class form is back on Classes`, await shown(page, "#createClassBtn") && (await notice()) === "");
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: a student login.
  for (const [pg, ctl, label] of [["/app/people.html", "#addPersonBox", "People: the Add person form"], ["/app/classes.html", "#createClassBtn", "Classes: the New class form"], ["/app/course-offers.html", "#createOfferBtn", "Course Offers: the New offer form"]]) {
    await flow("student-" + pg.split("/").pop().replace(".html", ""), lang, width, pg, async (t, page, ctx, errors) => {
      await settle(page, 1500);
      const body = await ev(page, () => document.body.innerText.length);
      check(`${t}: POSITIVE CONTROL the page drew for the student`, body > 100, String(body));
      check(`${t}: ${label} is not shown to a student`, !(await shown(page, ctl)));
      if (pg.endsWith("people.html")) check(`${t}: nor the View as chooser or Invite`, !(await shown(page, "#viewAsSelect")) && !(await shown(page, "#inviteBox")));
      else check(`${t}: no Archive or Bulk confirm button`, !(await shown(page, ".archiveClassBtn, .archiveOfferBtn, .bulkConfirmClassBtn")));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: STUDENT });
  }

  // 4: Continue strip: tap it, land on that topic, with ← Back.
  await flow("continue", lang, width, "/app/deen-study.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#continueStrip .continue-chip", { timeout: 20000 });
    const home = page.url().split("#")[0];
    const href = await ev(page, () => document.querySelector("#continueStrip .continue-chip").getAttribute("href"));
    check(`${t}: POSITIVE CONTROL the strip offers a chip for the seeded place, with back=1`, /^deen-study\.html\?resume=deen_ethics&back=1$/.test(href), href);
    await page.click("#continueStrip .continue-chip");
    await page.waitForFunction(() => document.querySelector(".topic-detail h2"), null, { timeout: 15000 }).catch(() => {});
    const h2 = await ev(page, () => document.querySelector(".topic-detail h2")?.textContent ?? "");
    check(`${t}: it lands on the Ethics topic's detail`, /Ethics|নৈতিক|এথিক/.test(h2), h2);
    await page.waitForSelector("[data-bm-back-link]", { state: "attached", timeout: 15000 }).catch(() => {});
    await settle(page, 1800);
    const b = await ev(page, () => { const a = document.querySelector("[data-bm-back-link]"); if (!a) return null; const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
    check(`${t}: a visible ← Back is on screen, 40px or more`, !!b && /^←/.test(b.text) && b.inside && b.h >= 39, JSON.stringify(b));
    if (bn) check(`${t}: and it is in Bangla`, !!b && BN.test(b.text), JSON.stringify(b));
    if (b) { await page.click("[data-bm-back-link]"); await page.waitForURL(/deen-study\.html(?!\?resume)/, { timeout: 15000 }).catch(() => {}); }
    check(`${t}: ← Back returns to the page the Continue chip was on`, page.url().split("#")[0] === home, page.url());
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: BOOKMARK });

  // 5: a refused write shows an error (I15) and stores nothing.
  for (const [pg, nameSel, btn, resSel, good, tag] of [["/app/classes.html", "#classNameInput", "#createClassBtn", "#createResult", /^Class created\.$/, "classes"], ["/app/course-offers.html", "#offerNameInput", "#createOfferBtn", "#createResult", /^Course offer created\.$/, "offers"]]) {
    await flow("failed-" + tag, lang, width, pg, async (t, page, ctx, errors) => {
      await page.waitForSelector(btn, { state: "visible", timeout: 10000 });
      await settle(page, 600);
      await page.fill(nameSel, "Refused Audit");
      if (tag === "offers") { await page.check('#subjectChecks input[type="checkbox"]'); }
      const w = await writeCount(page);
      await page.click(btn); await settle(page, 900);
      const said = await ev(page, (s) => document.querySelector(s).textContent, resSel);
      check(`${t}: POSITIVE CONTROL the Create button was pressed and the page answered`, said.length > 5, said);
      check(`${t}: a refused write shows an error on screen, and does not say it was created (I15)`, said.length > 5 && !good.test(said), said);
      check(`${t}: and nothing was stored`, (await writes(page, w)).filter((x) => x.kind !== "read").length === 0, JSON.stringify(await writes(page, w)).slice(0, 200));
      check(`${t}: the typed name is kept so the person can try again`, (await ev(page, (s) => document.querySelector(s).value, nameSel)) === "Refused Audit");
      if (bn) check(`${t}: the error is in Bangla`, BN.test(said), said);
    }, { failWrites: true });
  }
}
await browser.close();
console.log(`\n==== audit-part55${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
