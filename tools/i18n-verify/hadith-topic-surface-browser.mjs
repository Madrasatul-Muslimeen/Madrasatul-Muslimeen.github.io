// PCF MSA J106 S2 (the Owner, 14 Nov 2026, tick 5B): the Hadith module's card list is gone from hadith-study.html.
// The list is the SHARED topic surface (topic-study.js), which the Hadith Lead must not change, so the page hides ONLY its
// two list surfaces (#breadcrumbContainer, #listContainer) with its own class, and never #detailContainer. Rendered checks
// (computed display + a measured box, en and bn, phone and desktop):
//   - by default both list surfaces are NOT shown, while the page is otherwise normal (the Hadith bar is drawn);
//   - a topic someone is SENT to (a Continue chip, a bookmark, a Notes way-back: ?resume=<topic>) still opens: its detail
//     is shown, measured, with its Track my progress button;
//   - ?topicTree=1 (an unlinked page-own switch for the suites that test the shared tree) shows the list again, and is OFF
//     by default (the same page without it hides them);
//   - an id or class display rule cannot beat the hide (the [hidden] override), checked by forcing `hidden` off.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nohide: ["hadith-study.html", "#app.hadith-tree-off #breadcrumbContainer, #app.hadith-tree-off #listContainer { display: none; }", ""],
  hidedetail: ["hadith-study.html", "#app.hadith-tree-off #breadcrumbContainer, #app.hadith-tree-off #listContainer { display: none; }", "#app.hadith-tree-off #breadcrumbContainer, #app.hadith-tree-off #listContainer, #app.hadith-tree-off #detailContainer { display: none; }"],
  switchdead: ["hadith-study.html", "?.classList.remove(\"hadith-tree-off\");", "?.classList.add(\"hadith-tree-off\");"],
  defaultoff: ["hadith-study.html", "<div id=\"app\" class=\"hadith-tree-off\"", "<div id=\"app\" class=\"\""],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-topic-surface mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// One Hadith topic that can be tracked (a leaf with a resource), as the shared-pages audit seeds it.
const SEED = `(function () {
  window.__stubApplyBatches = true;
  const id = (s) => TENANT_ID + "__" + s;
  DATA.trackables = DATA.trackables.filter((t) => t._id !== id("studied_hadith"));
  DATA.trackables.push({ _id: id("studied_hadith"), tenantId: TENANT_ID, subjectId: "hadith", order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"), groupName: lang("Understanding", "অনুধাবন"), guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") }, panels: ["text"] });
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes("hadith"));
  const node = (sid, parent, anc, en, bn, order, leaf) => DATA.subjects.push({ _id: id(sid), tenantId: TENANT_ID, subjectId: sid, parentId: parent, name: lang(en, bn), moduleIds: ["hadith"], ancestorIds: anc, status: "active", order, ...(leaf ? { isTrackable: true, resourceIds: ["r1"] } : {}) });
  node("hadith", null, [], "hadith", "hadith", 1, false);
  node("synthetic-topic-audit-leaf", "hadith", ["hadith"], "Synthetic audit topic", "কৃত্রিম নিরীক্ষা বিষয়", 1, true);
})();`;
const probe = (P) => P.evaluate(() => {
  const box = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { disp: cs.display, w: Math.round(r.width), h: Math.round(r.height), shown: cs.display !== "none" && r.width > 0 && r.height > 0 }; };
  return { app: box("app"), crumb: box("breadcrumbContainer"), list: box("listContainer"), detail: box("detailContainer"), bar: !!document.querySelector(".hadith-menubar"), track: box("trackTopicBtn"), leafRow: !!document.querySelector('.topic-row-leaf[data-id="synthetic-topic-audit-leaf"]'), cls: document.getElementById("app")?.className };
});

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const open = async (path) => {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 844 }, extraSeedJs: SEED });
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fs.readFileSync(`app/${file}`, "utf8").split(a).join(b) }));
    }
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page, errors } = await openPage(ctx, path);
    await page.waitForSelector(".hadith-menubar", { timeout: 25000 });
    return { ctx, page, errors };
  };
  const tag = `[${lang} ${width}]`;

  // 1: the default page
  {
    const { ctx, page: P, errors } = await open("/app/hadith-study.html");
    await P.waitForFunction(() => getComputedStyle(document.getElementById("app")).display !== "none", null, { timeout: 25000 }).catch(() => {});
    await P.waitForTimeout(1500);
    const d = await probe(P);
    check(`${tag} positive control: the shared page is up (#app drawn, the Hadith bar drawn, the topic row exists in the DOM)`, d.app?.disp !== "none" && d.bar && d.leafRow, JSON.stringify(d));
    check(`${tag} by default the card list and its breadcrumb are NOT shown (computed display none, no box)`, d.list && !d.list.shown && d.crumb && !d.crumb.shown, JSON.stringify([d.list, d.crumb]));
    // an id or class display rule must not beat the hide: force `hidden` off on both and look again
    const forced = await P.evaluate(() => { for (const id of ["breadcrumbContainer", "listContainer"]) document.getElementById(id).hidden = false; return ["breadcrumbContainer", "listContainer"].map((id) => getComputedStyle(document.getElementById(id)).display); });
    check(`${tag} un-hiding the attribute does not bring the list back (the class rule holds)`, forced.every((x) => x === "none"), JSON.stringify(forced));
    check(`${tag} the page's own #detailContainer is not hidden by the rule (it is just empty until a topic opens)`, d.detail?.disp !== "none", JSON.stringify(d.detail));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  // 2: a topic someone is SENT to still opens (Continue chip / bookmark / Notes way-back use ?resume=<topic>)
  {
    const { ctx, page: P } = await open("/app/hadith-study.html?resume=synthetic-topic-audit-leaf&back=1");
    await P.waitForSelector("#detailContainer .topic-detail #trackTopicBtn", { timeout: 25000 }).catch(() => {});
    const d = await probe(P);
    check(`${tag} a topic opened by ?resume= SHOWS its detail (measured) with Track my progress, while the list stays hidden`, d.detail?.shown && d.track?.shown && d.list && !d.list.shown, JSON.stringify([d.detail, d.track, d.list]));
    await ctx.close();
  }
  // 3: the unlinked switch shows the list, and it is off by default
  {
    const { ctx, page: P } = await open("/app/hadith-study.html?topicTree=1");
    await P.waitForFunction(() => document.querySelector('.topic-row-leaf[data-id="synthetic-topic-audit-leaf"]'), null, { timeout: 25000 }).catch(() => {});
    const d = await probe(P);
    check(`${tag} ?topicTree=1 shows the card list again (measured) and the breadcrumb`, d.list?.shown && d.crumb?.shown && !/hadith-tree-off/.test(d.cls), JSON.stringify([d.list, d.crumb, d.cls]));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== hadith-topic-surface: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
