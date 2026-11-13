// PCF MSA J104 item 25 (13 Nov 2026), step 6b -- app/js/dua-groups-page.js on the real Dua page: the Admin's groups / My groups pop-up.
// Rendered checks: the button, the lazy load (no groups read before the press), the two switches, add / delete saved to the right
// document, a dua added to a personal group, read-only for a non-admin, Bangla, full screen on a phone. Run from the repository root.
//   --mutate=eager    the groups are read when the page opens        --mutate=wrongdoc  My groups saves under the admin document
//   --mutate=nodelete a delete is not saved                           --mutate=anyone    a non-admin may edit Admin's groups
//   --mutate=badkey   any text is accepted as a dua number
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  eager: ["js/dua-study.js", 'gp.addEventListener("click", async () => {', 'Promise.all([import("./dua-saving-data.js"), import("./firebase-init.js"), import("./dua-check-data.js")]).then(([m, f, c]) => { const q = c.getDuaCheckSession(); if (q) m.loadDuaGroups(f.db, { tenantId: q.tenantId, personId: q.personId ?? "x", uid: q.uid }); }); gp.addEventListener("click", async () => {'],
  wrongdoc: ["js/dua-groups-page.js", "which === ADMIN_GROUP_KEY ? ADMIN_GROUP_KEY : session.personId", "ADMIN_GROUP_KEY"],
  nodelete: ["js/dua-groups-page.js", "onChange: (next) => save(which, next),", "onChange: () => {},"],
  anyone: ["js/dua-groups-page.js", "which === ADMIN_GROUP_KEY ? !!session.canCheck : !!session.personId", "true"],
  stale: ["js/dua-groups-page.js", "      tree?.render(nextTree);", "      // stale"],
  badkey: ["js/dua-groups-page.js", "if (!isDuaKey(k)) {", "if (false) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `DATA.duaGroups = [{ _id: TENANT_ID + "__admin", tenantId: TENANT_ID, ownerKey: "admin", schemaVersion: 1, nodes: [{ id: "g-adminaa1", name: { en: "Madrasah morning", bn: "সকালের দুআ" }, kids: [] }] }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(width, lang, role) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [f, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${f}*`, async (r) => { const s = fs.readFileSync(`app/${f}`, "utf8"); if (!s.includes(a)) throw new Error(`mutation anchor missing in ${f}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: s.replace(a, b) }); }); }
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul");
  await P.waitForSelector('[data-dua-pd="mygroups"]', { timeout: 20000 });
  if (role) { await P.evaluate((r) => { const c = JSON.parse(localStorage.getItem("qr.sessionContext") || "null"); if (c) { c.viewAsRole = r; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); } }, role); await P.reload(); await P.waitForSelector('[data-dua-pd="mygroups"]', { timeout: 20000 }); }
  return { ctx, P };
}
const groupReads = (P) => P.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "duaGroups").length);
const writes = (P) => P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "duaGroups"));
const tabText = (P) => P.$$eval("[data-gp-tab]", (b) => b.map((x) => x.textContent));
const treeNames = (P) => P.$$eval(".dua-gp-tree .dua-gt-name", (b) => b.map((x) => x.firstChild.textContent));

for (const [width, lang] of [[1280, "en"], [390, "bn"]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, P } = await open(width, lang);
  P.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Evening" : undefined));
  check(`${tag} NOTHING reads the groups before the button is pressed (I9)`, (await groupReads(P)) === 0);
  await P.click('[data-dua-pd="mygroups"]');
  await P.waitForSelector(".dua-gw .dua-gt-name", { timeout: 15000 });
  const tabs = await tabText(P);
  check(`${tag} two switches, in the reader's language`, tabs.length === 2 && (lang === "bn" ? !/Admin|My groups/.test(tabs.join()) : tabs.join() === "Admin's groups,My groups"), tabs.join());
  check(`${tag} Admin's groups shows the madrasah's group (${lang === "bn" ? "Bangla name" : "English name"})`, (await treeNames(P)).join().includes(lang === "bn" ? "সকালের দুআ" : "Madrasah morning"), (await treeNames(P)).join());
  const full = await P.evaluate(() => document.querySelector(".dua-gw").classList.contains("dua-gw-full"));
  check(`${tag} the pop-up is ${width < 1000 ? "FULL SCREEN" : "a window"}`, full === (width < 1000));
  check(`${tag} the groups were read once, by id`, (await groupReads(P)) === 1, String(await groupReads(P)));
  // My groups: empty, then add one
  await P.click('[data-gp-tab="mine"]');
  await P.waitForFunction(() => document.querySelector(".dua-gp-add") && !document.querySelector(".dua-gp-add").hidden);
  check(`${tag} My groups starts empty`, (await treeNames(P)).length === 0);
  await P.click(".dua-gp-add");
  await P.waitForFunction(() => [...document.querySelectorAll(".dua-gp-tree .dua-gt-name")].length === 1);
  await P.waitForFunction(() => /./.test(document.querySelector(".dua-gp-status")?.textContent || ""));
  const w1 = await writes(P);
  const mineDoc = w1.find((w) => w.data?.nodes?.[0]?.name?.en === "Evening");
  check(`${tag} the new group is SAVED, under the person's own document (not the admin's)`, !!mineDoc && !/__admin$/.test(mineDoc.id), JSON.stringify(w1.map((w) => w.id)));
  // open it, add a dua number, then a bad one
  await P.click(".dua-gp-tree .dua-gt-name");
  await P.waitForSelector(".dua-gp-addform input");
  await P.fill(".dua-gp-addform input", "5"); await P.press(".dua-gp-addform input", "Enter");
  await P.waitForSelector(".dua-gp-list li");
  const w2 = await writes(P);
  check(`${tag} a dua added to the group is saved in its list`, w2.some((w) => JSON.stringify(w.data?.nodes?.[0]?.duas) === '["5"]'), JSON.stringify(w2.map((w) => w.data?.nodes?.[0]?.duas)));
  const before = (await writes(P)).length;
  await P.fill(".dua-gp-addform input", "not a dua!"); await P.press(".dua-gp-addform input", "Enter");
  await P.waitForTimeout(300);
  check(`${tag} text that is not a dua number is refused (nothing saved, nothing listed)`, (await writes(P)).length === before && (await P.$$eval(".dua-gp-list li", (l) => l.length)) === 1);
  // a change made AFTER a dua was added (a rename) must not lose the dua list
  await P.evaluate(() => [...document.querySelectorAll(".dua-gw")].at(-1).querySelector(".dua-gw-close").click());
  await P.click(".dua-gp-tree .dua-gt-more");
  await P.click(".dua-gp-tree .dua-gt-menu button:nth-child(2)");
  await P.waitForTimeout(400);
  const w2b = await writes(P);
  check(`${tag} a rename after adding a dua keeps the dua list (the drawn tree and the saved one agree)`, w2b.length > w2.length && JSON.stringify(w2b.at(-1).data?.nodes?.[0]?.duas) === '["5"]', JSON.stringify(w2b.at(-1)?.data?.nodes));
  // delete (real), on the madrasah's saved group: the update carries a tree WITHOUT it (the document itself is never deleted: D6)
  await P.click('[data-gp-tab="admin"]');
  await P.waitForSelector(".dua-gp-tree .dua-gt-more");
  await P.click(".dua-gp-tree .dua-gt-more");
  await P.click(".dua-gp-tree .dua-gt-danger");
  await P.waitForFunction(() => document.querySelectorAll(".dua-gp-tree .dua-gt-name").length === 0);
  await P.waitForTimeout(400);
  const w3 = await P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "duaGroups" && /__admin$/.test(w.id)));
  check(`${tag} deleting a saved group saves the madrasah's tree WITHOUT it (and deletes no document)`, w3.length === 1 && w3[0].kind !== "delete" && w3[0].data?.nodes?.length === 0, JSON.stringify(w3));
  await ctx.close();
}

// a non-admin cannot change Admin's groups
{
  const { ctx, P } = await open(1280, "en", "student");
  await P.click('[data-dua-pd="mygroups"]');
  await P.waitForSelector(".dua-gw .dua-gt-name", { timeout: 15000 });
  const ro = await P.evaluate(() => ({ ro: document.querySelector(".dua-gp-tree").classList.contains("dua-gt-ro"), add: !document.querySelector(".dua-gp-add").hidden && getComputedStyle(document.querySelector(".dua-gp-add")).display !== "none", more: document.querySelectorAll(".dua-gp-tree .dua-gt-more").length }));
  check("[student preview] Admin's groups are read-only: no add button, no ⋯ edit menu", ro.ro && !ro.add, JSON.stringify(ro));
  await ctx.close();
}
await browser.close();
console.log(`==== Dua groups page: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
