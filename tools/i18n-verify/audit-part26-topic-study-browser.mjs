// Audit part 26 (PCF MSA J29): Topic study (Deen Study, Arabic, Hadith), each feature WORKING, start to end.
//   tree      a branch drills into its children (breadcrumb shows where you are, its first crumb returns), a topic opens with its
//             resource; long names stay inside the screen; every row a finger presses is 40px or more
//   person    the Person picker decides who a claim is for: the stored records write names that person, unit key topic:<id> (I5),
//             pending confirmation, the I17 stamps; switching person shows THAT person's status chips, not the last person's
//   na        Not Applicable is left out of the Breakdown tab's totals (I7), and its note is in the reader's language
//   bookmark  Bookmark this writes the place; a ?resume= link lands on the same topic; the star reads filled on reopening, and a
//             second tap removes it
//   sheet     the "— Studied" sheet, and the bookmark pop-over, open inside the screen, clear of the nav row; controls are 40px
// Mutations (each must fail the suite):
//   --mutate=wrongperson  the claim is written for the first person, not the picked one
//   --mutate=nacounted    Not Applicable entries are counted in the breakdown
//   --mutate=noresume     a ?resume= link is ignored
//   --mutate=flatlist     branches show no children when opened
//   --mutate=ennote       the Breakdown note is hard-coded English again (fixed in this round)
//   --mutate=notab40     the sheet's tabs lose their 40px (fixed in this round: they were 29px)
//   --mutate=nosave40     the bookmark pop-over's buttons lose their 40px (fixed in this round: they were 36px)
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part26-topic-study-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
const TS = "app/js/topic-study.js", WM = "app/js/way-modal.js";
const MUTATIONS = {
  wrongperson: [TS, "**/js/topic-study.js*", "personId: a.id,\n            subjectId: chunkSubjectId,", "personId: roster[0].id,\n            subjectId: chunkSubjectId,"],
  nacounted: ["app/js/unit-keys.js", "**/js/unit-keys.js*", 'const counted = statusIds.filter((s) => s !== "not_applicable");', "const counted = statusIds;"],
  noresume: [TS, "**/js/topic-study.js*", 'if (resumeNode) await openTopicDetail(resumeId);', ""],
  ennote: [WM, "**/js/way-modal.js*", '${t("{n} counted", { n: num(summary.countedTotal) })}${summary.excludedNotApplicable ? ` · ${t("{n} Not Applicable (excluded)", { n: num(summary.excludedNotApplicable) })}` : ""}', '${summary.countedTotal} counted${summary.excludedNotApplicable ? ` · ${summary.excludedNotApplicable} Not Applicable (excluded)` : ""}'],
  notab40: ["@PAGE", "**/@FILE*", "  .way-tab-btn { min-height: 40px; }\n", ""],
  nosave40: ["@PAGE", "**/@FILE*", "  .bm-popover .bm-popover-actions button { min-height: 40px; }\n", ""],
  flatlist: [TS, "**/js/topic-study.js*", '.filter((n) => n.parentId === currentParentId)', '.filter((n) => n.parentId === rootSubjectId)'],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const ALLOWED = /https?:\/\/\S+|QuranRevival|MMSA|Qur'?an|Madrasatul|Muslimeen|Hadith|hadith|Google|Legacy|App|v\d+|Deen|Arabic|English|Bangla|smahk|gmail|example|org/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

// Names the length a real tenant has.
const LONG_BRANCH_EN = "Foundations of Seeking Knowledge and the Etiquette Owed to Teachers and Fellow Students";
const LONG_BRANCH_BN = "জ্ঞান অন্বেষণের মূলনীতি এবং শিক্ষক ও সহপাঠীদের প্রতি আদবের বিস্তারিত আলোচনা";
const LONG_LEAF_EN = "The Complete Etiquette of Honouring One's Teachers in Everyday Life at Home and Abroad";
const LONG_LEAF_BN = "দৈনন্দিন জীবনে ঘরে ও বাইরে শিক্ষকদের সম্মান করার পূর্ণাঙ্গ আদব ও শিষ্টাচার";
const MODULES = [
  { id: "deen", root: "deen_study", page: "/app/deen-study.html", trackable: "studied_deen" },
  { id: "arabic", root: "arabic_language", page: "/app/arabic-study.html", trackable: "studied_arabic" },
  { id: "hadith", root: "hadith", page: "/app/hadith-study.html", trackable: "studied_hadith" },
];
// A root, a branch with a long name holding a long-named topic, a plain topic, and a topic with no resource yet. p2 has one
// claimed topic and one Not Applicable one.
const seedOf = (m, extra = "") => `
(function () {
  window.__stubApplyBatches = true;
  const root = "${m.root}", mod = "${m.id}", id = (s) => TENANT_ID + "__" + s;
  DATA.trackables = DATA.trackables.filter((t) => t._id !== id("${m.trackable}"));
  DATA.trackables.push({ _id: id("${m.trackable}"), tenantId: TENANT_ID, subjectId: root, order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"), groupName: lang("Understanding", "অনুধাবন"), guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") }, panels: ["text"] });
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes(mod));
  const node = (sid, parent, anc, en, bn, order, leaf, res) => DATA.subjects.push({ _id: id(sid), tenantId: TENANT_ID, subjectId: sid, parentId: parent, name: lang(en, bn), moduleIds: [mod], ancestorIds: anc, status: "active", order, ...(leaf ? { isTrackable: true, resourceIds: res ? ["r1"] : [] } : {}) });
  node(root, null, [], "${m.id}", "${m.id}", 1, false, false);
  node("branch_a", root, [root], ${JSON.stringify(LONG_BRANCH_EN)}, ${JSON.stringify(LONG_BRANCH_BN)}, 1, false, false);
  node("leaf_a1", "branch_a", [root, "branch_a"], ${JSON.stringify(LONG_LEAF_EN)}, ${JSON.stringify(LONG_LEAF_BN)}, 1, true, true);
  node("leaf_b", root, [root], "Short topic", "ছোট বিষয়", 2, true, true);
  node("leaf_c", root, [root], "Topic without a resource", "সংস্থানহীন বিষয়", 3, true, false);
  const ent = (u, st) => ({ unitType: "topic", subjectId: root, trackableId: "${m.trackable}", claimedStatus: st, claimedByPersonId: "p2", confirmedStatus: null, confirmState: "pending", domainIds: [], notes: "" });
  DATA.records.push({ _id: TENANT_ID + "__p2__subject_" + root, tenantId: TENANT_ID, personId: "p2", subjectId: root, chunkKey: "subject_" + root, entries: { ["topic:leaf_a1::${m.trackable}"]: ent("a1", "learning"), ["topic:leaf_b::${m.trackable}"]: ent("b", "not_applicable") } });
  ${extra}
})();`;

async function open(lang, width, m, query, extra) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seedOf(m, extra || "") });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE) {
    let [file, glob, from, to] = MUTATIONS[MUTATE];
    file = file.replace("@PAGE", m.page.slice(1));
    glob = glob.replace("@FILE", m.page.split("/").pop());
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, m.page + (query || ""));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, m, fn, { query = "", extra = "" } = {}) {
  const full = `${name}-${m.id}`;
  if (ONLY && !ONLY.split(",").some((o) => full.includes(o))) return;
  const tag = `${lang} ${width}px ${full}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, m, query, extra), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const rectOf = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; }, sel);
const inside = (r, vw, vh) => !!r && r.l >= -1 && r.r <= vw + 1 && r.t >= -1 && r.b <= vh + 1;
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const MINE = ["branch_a", "leaf_a1", "leaf_b", "leaf_c"]; // the catalogue repair may add the module's template topics beside the seeded ones
const names = (page) => ev(page, (mine) => [...document.querySelectorAll("#listContainer .topic-row")].filter((b) => mine.includes(b.dataset.id)).map((b) => ({ id: b.dataset.id, leaf: b.classList.contains("topic-row-leaf"), name: b.querySelector(".topic-row-name").textContent.trim(), h: Math.round(b.getBoundingClientRect().height), l: b.getBoundingClientRect().left, r: b.getBoundingClientRect().right, chip: b.querySelector(".topic-status-chip")?.textContent.trim() ?? null })), MINE);
const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) for (const width of WIDTHS) for (const m of MODULES) {
  const bn = lang === "bn", vh = width > 600 ? 900 : 844;
  const BRANCH = bn ? LONG_BRANCH_BN : LONG_BRANCH_EN, LEAF = bn ? LONG_LEAF_BN : LONG_LEAF_EN;
  await flow("tree", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#listContainer .topic-row", { timeout: 20000 });
    let rows = await names(page);
    check(`${t}: POSITIVE CONTROL the root lists its branch and two topics`, rows.length === 3 && rows[0].id === "branch_a" && !rows[0].leaf && rows.filter((r) => r.leaf).length === 2, JSON.stringify(rows));
    check(`${t}: the long branch name is shown whole, inside the screen`, rows[0].name === BRANCH && rows.every((r) => r.l >= -1 && r.r <= width + 1), JSON.stringify(rows.map((r) => [r.l, r.r])));
    check(`${t}: every row a finger presses is 40px or more`, rows.every((r) => r.h >= 40), JSON.stringify(rows.map((r) => r.h)));
    await page.click('.topic-row-branch[data-id="branch_a"]'); await settle(page, 300);
    rows = await names(page);
    check(`${t}: opening the branch lists ITS topic (the long one), not the root's`, rows.length === 1 && rows[0].id === "leaf_a1" && rows[0].name === LEAF, JSON.stringify(rows));
    const crumbs = await ev(page, () => ({ text: document.getElementById("breadcrumbContainer").innerText, btns: document.querySelectorAll("#breadcrumbContainer .topic-crumb-btn").length }));
    check(`${t}: the breadcrumb names the branch and offers a way back to the top`, crumbs.text.includes(BRANCH) && crumbs.btns >= 1, JSON.stringify(crumbs));
    await page.click("#breadcrumbContainer .topic-crumb-btn"); await settle(page, 300);
    check(`${t}: the first crumb returns to the root list`, (await names(page)).length === 3);
    await page.click('.topic-row-branch[data-id="branch_a"]'); await settle(page, 200);
    await page.click(".topic-row-leaf"); await settle(page, 1000);
    const det = await ev(page, () => ({ h2: document.querySelector("#detailContainer h2")?.childNodes[0]?.textContent.trim(), link: document.querySelector("#detailContainer a")?.getAttribute("href") ?? null, text: document.getElementById("detailContainer").innerText }));
    check(`${t}: opening a topic shows its name and its resource`, det.h2 === LEAF && det.link === "https://example.org/lesson", JSON.stringify(det));
    if (bn) check(`${t}: the topic detail has no English left`, englishLeft(det.text).length === 0, englishLeft(det.text).join(", "));
    await page.click("#breadcrumbContainer .topic-crumb-btn"); await settle(page, 300);
    await page.click('.topic-row-leaf[data-id="leaf_c"]'); await settle(page, 800);
    check(`${t}: a topic with no resource cannot be tracked (Track my progress is disabled)`, await ev(page, () => document.getElementById("trackTopicBtn").disabled === true));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  await flow("person", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#listContainer .topic-row", { timeout: 20000 });
    const persons = await ev(page, () => [...document.querySelectorAll("#personSelect option")].map((o) => o.value));
    check(`${t}: POSITIVE CONTROL the Person picker offers p1 and p2`, persons.includes("p1") && persons.includes("p2"), JSON.stringify(persons));
    await page.selectOption("#personSelect", "p1"); await settle(page, 800);
    let rows = await names(page);
    const p1chip = rows.find((r) => r.id === "leaf_b")?.chip;
    check(`${t}: POSITIVE CONTROL p1 has not started the short topic`, !!p1chip, JSON.stringify(rows.map((r) => r.chip)));
    await page.selectOption("#personSelect", "p2"); await settle(page, 800);
    rows = await names(page);
    check(`${t}: switching to p2 shows p2's own status chip on the claimed topic (leaf_b is Not Applicable)`, !!rows.find((r) => r.id === "leaf_b")?.chip && rows.find((r) => r.id === "leaf_b").chip !== p1chip, JSON.stringify(rows.map((r) => [r.id, r.chip])));
    await page.selectOption("#personSelect", "p1"); await settle(page, 800);
    rows = await names(page);
    check(`${t}: switching back to p1 drops p2's chip again`, rows.find((r) => r.id === "leaf_b")?.chip === p1chip, JSON.stringify(rows.map((r) => r.chip)));
    await page.selectOption("#personSelect", "p2"); await settle(page, 800); // not the first person, so a claim for "whoever is first" shows
    await page.click('.topic-row-leaf[data-id="leaf_b"]'); await settle(page, 800);
    await page.click("#trackTopicBtn"); await settle(page, 600);
    await page.selectOption(".way-status-select", "learning");
    const w0 = await writeCount(page);
    await page.click(".way-claim-btn"); await settle(page, 1000);
    const rec = (await writes(page, w0)).find((x) => x.col === "records");
    // An existing chunk is updated by dotted field path; a new one is created whole.
    const entry = rec?.data?.entries?.["topic:leaf_b::" + m.trackable] ?? rec?.data?.["entries.topic:leaf_b::" + m.trackable] ?? null;
    check(`${t}: the claim is written for the picked person (p2), under unit key topic:leaf_b`, !!rec && rec.id.includes("__p2__") && !!entry && entry.claimedByPersonId !== undefined && !!entry && entry.unitType === "topic" && entry.claimedStatus === "learning", JSON.stringify(rec)?.slice(0, 400));
    check(`${t}: it waits for confirmation (pending) and carries the I17 stamps`, !!entry && ["pending", "confirmed"].includes(entry.confirmState) && entry.unitType === "topic" && rec.data.updatedAt !== undefined, JSON.stringify(entry));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    const none = (await writes(page, w0)).filter((x) => x.col === "records" && x.id.includes("__p1__"));
    check(`${t}: nothing was written to p1's records`, none.length === 0, JSON.stringify(none).slice(0, 200));
  });

  await flow("na", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#listContainer .topic-row", { timeout: 20000 });
    await page.selectOption("#personSelect", "p2"); await settle(page, 800);
    await page.click('.topic-row-branch[data-id="branch_a"]'); await settle(page, 200);
    await page.click(".topic-row-leaf"); await settle(page, 900);
    await page.click("#trackTopicBtn"); await settle(page, 600);
    await page.click('.way-tab-btn:nth-child(3)'); await settle(page, 300);
    const txt = await ev(page, () => document.querySelector(".way-breakdown")?.innerText ?? "");
    check(`${t}: POSITIVE CONTROL the Breakdown tab shows p2's one counted claim`, /\b1\b|১/.test(txt), JSON.stringify(txt));
    const note = await ev(page, () => document.querySelector(".breakdown-note")?.textContent ?? "");
    check(`${t}: Not Applicable is left out of the counted total (one counted, one excluded)`, bn ? /^১টি গণনা করা হয়েছে · ১টি প্রযোজ্য নয় \(বাদ\)$/.test(note.trim()) : /^1 counted · 1 Not Applicable \(excluded\)$/.test(note.trim()), JSON.stringify(note));
    if (bn) check(`${t}: the Breakdown note has no English left`, englishLeft(txt).length === 0, englishLeft(txt).join(", "));
  });

  await flow("bookmark", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#listContainer .topic-row", { timeout: 20000 });
    await page.click('.topic-row-leaf[data-id="leaf_b"]'); await settle(page, 900);
    const w0 = await writeCount(page);
    await page.click("#bookmarkTopicBtn"); await settle(page, 600);
    const pop = await rectOf(page, "[data-bm-pop-save]");
    check(`${t}: POSITIVE CONTROL the bookmark pop-over opened, with a Save button inside the screen`, inside(pop, width, vh), JSON.stringify(pop));
    check(`${t}: the pop-over's Save is 40px or more`, !!pop && pop.h >= 39.5, JSON.stringify(pop));
    await page.click("[data-bm-pop-save]"); await settle(page, 900);
    const bw = (await writes(page, w0)).find((x) => x.col === "bookmarks");
    check(`${t}: Bookmark this saves the place (a bookmarks write naming leaf_b in ${m.id})`, !!bw && JSON.stringify(bw.data).includes('"leaf_b"') && JSON.stringify(bw.data).includes(`"${m.id}"`), JSON.stringify(bw)?.slice(0, 300));
    check(`${t}: the star turns filled`, (await ev(page, () => document.getElementById("bookmarkTopicBtn").textContent.trim())) === "★");
    const w1 = await writeCount(page);
    await page.click("#bookmarkTopicBtn"); await settle(page, 900);
    const rm = (await writes(page, w1)).find((x) => x.col === "bookmarks");
    check(`${t}: a second tap removes it (a bookmarks write) and the star empties`, !!rm && (await ev(page, () => document.getElementById("bookmarkTopicBtn").textContent.trim())) === "☆", JSON.stringify(rm)?.slice(0, 300));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  const SAVED = `DATA.bookmarks[0].saved = [{ id: "bk1", moduleId: "${m.id}", subjectId: "leaf_b", name: "Short topic", position: "leaf_b", folderId: null, createdAt: "2026-10-01T00:00:00.000Z" }];`;
  await flow("resume", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#detailContainer .topic-detail h2", { timeout: 20000 });
    const there = await ev(page, () => ({ h2: document.querySelector("#detailContainer h2")?.childNodes[0]?.textContent.trim(), star: document.getElementById("bookmarkTopicBtn")?.textContent.trim() }));
    check(`${t}: a ?resume= link lands on the same topic's detail`, there.h2 === (bn ? "ছোট বিষয়" : "Short topic"), JSON.stringify(there));
    check(`${t}: reopening shows the star filled (the place is saved)`, there.star === "★", JSON.stringify(there));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { query: "?resume=leaf_b", extra: SAVED });

  await flow("sheet", lang, width, m, async (t, page, errors) => {
    await page.waitForSelector("#listContainer .topic-row", { timeout: 20000 });
    await page.click('.topic-row-branch[data-id="branch_a"]'); await settle(page, 200);
    await page.click(".topic-row-leaf"); await settle(page, 900);
    await page.click("#trackTopicBtn"); await settle(page, 700);
    const s = await ev(page, () => { const r = document.querySelector("#wayModalMount > *").getBoundingClientRect(); const nav = document.getElementById("navBar").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, navB: nav.bottom, title: document.querySelector("#wayModalMount h3").textContent.trim() /* the heading itself: since v12.23 (J72) the header starts with ← Back */, tabs: [...document.querySelectorAll(".way-tab-btn")].map((b) => Math.round(b.getBoundingClientRect().height)), claim: document.querySelector(".way-claim-btn").getBoundingClientRect().height }; });
    check(`${t}: the sheet opens as "… — ${bn ? "অধ্যয়ন করা হয়েছে" : "Studied"}", inside the screen`, s.title.endsWith(bn ? "— অধ্যয়ন করা হয়েছে" : "— Studied") && inside(s, width, vh), JSON.stringify(s));
    check(`${t}: the sheet is covered by its dim layer, so it sits over the nav row, not behind it (nav row is not above the sheet's top edge)`, s.t >= -1, JSON.stringify(s));
    check(`${t}: its tabs and Claim button are 40px or more`, s.tabs.length === 3 && s.tabs.every((h) => h >= 39.5) && s.claim >= 39.5, JSON.stringify(s));
    await page.click(".way-close-btn"); await settle(page, 300);
    check(`${t}: the close × closes it`, !(await ev(page, () => document.getElementById("wayModalOverlay").classList.contains("open"))));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n==== audit-part26${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
