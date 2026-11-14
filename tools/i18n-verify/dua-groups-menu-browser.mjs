// PCF MSA J104 (the Owner, 14 Nov 2026) -- the madrasah's groups ("Admin's groups"), a person's own ("My groups") and the editing of a Dua's
// title and groups, INSIDE the Dua groups menu and the Dua card's Keep tab (app/js/dua-groups-menu.js, wired in dua-study.js).
// Rendered checks on the real Dua page, English at 1280 and Bangla at 390, plus a student preview: the old separate button is gone, both group
// trees sit in the Dua groups menu, a group opens like a built-in one, a Dua is put in groups and taken out of a list (never removed), the admin's
// title is saved, a student cannot change the madrasah's groups. Run from the repository root with serve.js on :8080.
//   --mutate=button     the old separate Groups button comes back      --mutate=wrongdoc   My groups save under the admin's document
//   --mutate=anyone     a non-admin may edit Admin's groups and titles   --mutate=nolist    a group opens with an empty list
//   --mutate=hideit     "Remove from this list" HIDES the Dua instead of taking it out of the list
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  button: ["app/js/dua-study.js", 'const bkw = el("div", "dua-pd-wrap");', 'const gp0 = el("button", "dua-pd"); gp0.dataset.duaPd = "mygroups"; gp0.textContent = "Groups"; menu.appendChild(gp0); const bkw = el("div", "dua-pd-wrap");'],
  wrongdoc: ["app/js/dua-groups-menu.js", 'ownerKey: which === "admin" ? ADMIN_GROUP_KEY : S.session.personId', "ownerKey: ADMIN_GROUP_KEY"],
  anyone: ["app/js/dua-groups-menu.js", "const canAdmin = () => !!S.session?.canCheck;", "const canAdmin = () => true;"],
  nolist: ["app/js/dua-groups-menu.js", "data.groups.set(n.id, { id: n.id, custom: \"admin\", items });", "data.groups.set(n.id, { id: n.id, custom: \"admin\", items: [] });"],
  noadded: ["app/js/dua-groups-menu.js", "placements: groupId ? [{ group: groupId, order }] : [], added });", "placements: groupId ? [{ group: groupId, order }] : [], added: undefined });"],
  hideit: ["app/js/dua-groups-menu.js", "const r = await saveDuaEdit(S.db, S.ctx, { duaKey: key, placements: [...keep, ...add] });", "const r = await saveDuaEdit(S.db, S.ctx, { duaKey: key, placements: [...keep, ...add], hidden: !ticks.admin.size });"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `
DATA.duaGroups = [{ _id: TENANT_ID + "__admin", tenantId: TENANT_ID, ownerKey: "admin", schemaVersion: 1, nodes: [
  { id: "g-adminaa1", name: { en: "Madrasah morning", bn: "সকালের দুআ" }, kids: [{ id: "g-adminaa2", name: { en: "Waking" }, kids: [] }] }] }];
DATA.duaEdits = [{ _id: TENANT_ID + "__2", tenantId: TENANT_ID, duaKey: "2", title: {}, placements: [{ group: "g-adminaa1", order: 1 }], hidden: false, schemaVersion: 1 }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(width, lang, role, url = "/app/dua-study.html?g=rasul") {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [f, a, b] = MUT[MUTATE]; await ctx.route(`**/${f}*`, async (r) => { const s = fs.readFileSync(f, "utf8"); if (!s.includes(a)) throw new Error(`mutation anchor missing in ${f}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: s.replace(a, b) }); }); }
  const { page: P } = await openPage(ctx, url);
  await P.waitForSelector('[data-dua-pd="groups"]', { timeout: 20000 });
  if (role) { await P.evaluate((r) => { const c = JSON.parse(localStorage.getItem("qr.sessionContext") || "null"); if (c) { c.viewAsRole = r; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); } }, role); await P.reload(); await P.waitForSelector('[data-dua-pd="groups"]', { timeout: 20000 }); }
  P.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Evening" : undefined));
  return { ctx, P };
}
const writes = (P) => P.evaluate(() => window.__stubWriteData || []);
const openMenu = async (P) => { await P.click('[data-dua-pd="groups"]'); await P.waitForSelector(".dua-pull-section", { timeout: 20000 }); };
const treeNames = (P, which) => P.$$eval(`[data-dua-pull-section="${which}"] .dua-gt-name`, (b) => b.map((x) => x.firstChild.textContent));
const openKeep = async (P) => { await P.click("[data-dua-menu-toggle]"); await P.waitForSelector("[data-dua-keep-edit]", { timeout: 20000 }); await P.evaluate(() => document.querySelector('[data-dua-tab="keep"], .dua-menu-tab[data-tab="keep"]')?.click()); };

for (const [width, lang] of [[1280, "en"], [390, "bn"]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, P } = await open(width, lang);
  check(`${tag} the old separate "Admin's and my groups" button is gone`, (await P.$$('[data-dua-pd="mygroups"]')).length === 0);
  await openMenu(P);
  const adminNames = await treeNames(P, "admin");
  check(`${tag} the Dua groups menu holds Admin's groups (with the Bangla name in Bangla)`, adminNames.join().includes(lang === "bn" ? "সকালের দুআ" : "Madrasah morning"), adminNames.join());
  const heads = await P.$$eval(".dua-pull-h", (h) => h.map((x) => x.textContent));
  check(`${tag} both sections are named, in the reader's language`, heads.length === 2 && (lang === "bn" ? !/Admin|My groups/.test(heads.join()) : heads.join() === "Admin's groups,My groups"), heads.join());
  check(`${tag} the built-in groups are still in the same menu`, (await P.$$("[data-dua-group]")).length === 7);
  // add a group of my own
  await P.click('[data-dua-pull-section="mine"] .dua-pull-add');
  await P.waitForFunction(() => document.querySelectorAll('[data-dua-pull-section="mine"] .dua-gt-name').length === 1);
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "duaGroups"));
  const w1 = (await writes(P)).filter((w) => w.col === "duaGroups");
  check(`${tag} a new group of my own is saved under MY document, not the admin's`, w1.length >= 1 && w1.every((w) => !/__admin$/.test(w.id)) && w1.at(-1).data?.nodes?.[0]?.name?.en === "Evening", JSON.stringify(w1.map((w) => w.id)));
  // open an admin group: it lists like a built-in group
  await P.click('[data-dua-pull-section="admin"] .dua-gt-name');
  await P.waitForSelector("[data-dua-open-btn], .dua-row, .hadith-row, [data-dua-row]", { timeout: 20000 }).catch(() => {});
  const url = new URL(P.url());
  check(`${tag} choosing an admin group opens its list and the address names it`, url.searchParams.get("g") === "g-adminaa1", P.url());
  const rows = await P.$$eval("#duaBody button, #duaBody a", (b) => b.map((x) => x.textContent.trim()).filter((x) => /2\b|২/.test(x)));
  check(`${tag} the group lists the Dua the admin put in it (Dua 2)`, rows.length >= 1, JSON.stringify(rows.slice(0, 3)));
  // reload keeps the place
  await P.reload();
  await P.waitForSelector("#duaBody button", { timeout: 20000 });
  check(`${tag} reloading the address reopens the same group`, new URL(P.url()).searchParams.get("g") === "g-adminaa1");
  await ctx.close();
}

// the Keep tab: put a Dua in groups, save its title, take it out of a list
{
  const { ctx, P } = await open(1280, "en", null, "/app/dua-study.html?g=g-adminaa1&open=1");
  await P.waitForSelector("[data-dua-menu-toggle]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForSelector("[data-dua-keep-edit]", { state: "attached", timeout: 25000 });
  const reveal = () => P.evaluate(() => { for (const b of document.querySelectorAll(".dua-menu-tab")) if (/keep/i.test(b.textContent)) b.click(); });
  await reveal();
  const ticked = await P.$$eval('[data-dua-keep-groups="admin"] input', (i) => i.map((x) => `${x.dataset.duaGroupId}:${x.checked}`));
  check("[keep] the admin sees the madrasah's groups with this Dua's current groups ticked", ticked.includes("g-adminaa1:true") && ticked.includes("g-adminaa2:false"), ticked.join());
  await P.check('[data-dua-keep-groups="admin"] input[data-dua-group-id="g-adminaa2"]');
  await P.click('[data-dua-keep-save="groups"]');
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "duaEdits"));
  const w2 = (await writes(P)).filter((w) => w.col === "duaEdits" && /__2$/.test(w.id));
  const groups2 = (w2.at(-1)?.data?.placements ?? []).map((p) => p.group).sort().join();
  check("[keep] saving puts the Dua in BOTH groups (one note on that Dua only)", groups2 === "g-adminaa1,g-adminaa2", groups2);
  await P.fill('[data-dua-title="en"]', "Good in both worlds");
  await P.fill('[data-dua-title="bn"]', "দুই জগতের কল্যাণ");
  await P.click('[data-dua-keep-save="title"]');
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "duaEdits" && w.data?.title?.en === "Good in both worlds"));
  const wt = (await writes(P)).filter((w) => w.col === "duaEdits").at(-1);
  check("[keep] the admin's title is saved in English and Bangla", wt.data.title.en === "Good in both worlds" && wt.data.title.bn === "দুই জগতের কল্যাণ", JSON.stringify(wt.data.title));
  check("[keep] a title save does not touch the Dua's groups or hide it", !("hidden" in wt.data) || wt.data.hidden === false);
  // delete = take out of THIS list
  const before = (await writes(P)).length;
  await P.click("[data-dua-keep-remove]");
  await P.waitForFunction((n) => (window.__stubWriteData || []).length > n, before);
  const wr = (await writes(P)).filter((w) => w.col === "duaEdits").at(-1);
  const left = (wr.data.placements ?? []).map((p) => p.group);
  check("[keep] Remove from this list takes the Dua out of THAT group only", !left.includes("g-adminaa1") && left.includes("g-adminaa2"), left.join());
  check("[keep] and the Dua is not hidden or removed (Delete means off the list, never out of the database)", wr.data.hidden !== true && wr.kind !== "delete", JSON.stringify(wr.data.hidden));
  await ctx.close();
}

// delete from the Dua's ONLY list: it leaves that list, and is neither hidden nor removed
{
  const { ctx, P } = await open(1280, "en", null, "/app/dua-study.html?g=g-adminaa1&open=1");
  await P.waitForSelector("[data-dua-menu-toggle]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForSelector("[data-dua-keep-edit]", { state: "attached", timeout: 25000 });
  await P.evaluate(() => { for (const b of document.querySelectorAll(".dua-menu-tab")) if (/keep/i.test(b.textContent)) b.click(); });
  await P.click("[data-dua-keep-remove]");
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "duaEdits"));
  const wo = (await writes(P)).filter((w) => w.col === "duaEdits").at(-1);
  check("[keep] removing the Dua from its only list leaves it in NO group, still shown in the Rasulullah list (not hidden)", (wo.data.placements ?? []).length === 0 && wo.data.hidden !== true && wo.kind !== "delete", JSON.stringify({ p: wo.data.placements, h: wo.data.hidden }));
  await P.waitForSelector("#duaBody", { timeout: 20000 });
  check("[keep] and the page goes back to the (now shorter) list", new URL(P.url()).searchParams.get("open") === null);
  await ctx.close();
}

// the admin adds a new Dua of the madrasah's own text to a group; a student cannot
{
  const { ctx, P } = await open(1280, "en", null, "/app/dua-study.html?g=g-adminaa1");
  await P.waitForSelector("[data-dua-add-open]", { timeout: 25000 });
  await P.click("[data-dua-add-open]");
  await P.fill('[data-dua-add="ar"]', "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ");
  await P.fill('[data-dua-add="en"]', "In the name of Allah, I rely on Allah.");
  await P.fill('[data-dua-add="titleEn"]', "Leaving home");
  await P.click('[data-dua-add-form] button[type="submit"]');
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "duaEdits" && /^t1__new-/.test(w.id)));
  const wn = (await writes(P)).filter((w) => w.col === "duaEdits" && /__new-/.test(w.id)).at(-1);
  check("[add] a new Dua is saved as ONE new note with a permanent new- key, its own text and the group it was added in", /^new-[a-z0-9]{10}$/.test(wn.data.duaKey) && wn.data.added?.ar?.includes("بِسْمِ") && wn.data.added?.en?.startsWith("In the name") && wn.data.placements?.[0]?.group === "g-adminaa1" && wn.data.hidden === false, JSON.stringify(wn.data));
  await P.waitForSelector("#duaBody .dua-row", { timeout: 20000 });
  const titles = await P.$$eval("#duaBody .dua-row-title", (x) => x.map((y) => y.textContent));
  check("[add] it shows in the group's list with its title", titles.includes("Leaving home"), titles.join());
  await P.click("#duaBody .dua-row >> nth=-1");
  await P.waitForSelector("[data-dua-added-card]", { timeout: 20000 });
  const txt = await P.$eval("[data-dua-added-card]", (c) => c.innerText);
  check("[add] its card shows the Arabic and the English the admin wrote", txt.includes("تَوَكَّلْتُ") && txt.includes("I rely on Allah"), txt.slice(0, 120));
  await ctx.close();
}
{
  const { ctx, P } = await open(1280, "en", "student", "/app/dua-study.html?g=g-adminaa1");
  await P.waitForSelector("#duaBody .dua-row", { timeout: 25000 });
  await P.waitForTimeout(500);
  check("[student preview] no Add a new Dua button", (await P.$$("[data-dua-add-open]")).length === 0);
  await ctx.close();
}

// a student: the madrasah's groups are read-only, no title editing, My groups still editable
{
  const { ctx, P } = await open(1280, "en", "student");
  await openMenu(P);
  const ro = await P.evaluate(() => ({ adminRo: document.querySelector('[data-dua-pull-section="admin"] .dua-gt')?.classList.contains("dua-gt-ro"), adminAdd: !!document.querySelector('[data-dua-pull-section="admin"] .dua-pull-add'), mineAdd: !!document.querySelector('[data-dua-pull-section="mine"] .dua-pull-add') }));
  check("[student preview] Admin's groups are read-only (no Add a group), My groups can still be added to", ro.adminRo && !ro.adminAdd && ro.mineAdd, JSON.stringify(ro));
  await ctx.close();
}
{
  const { ctx, P } = await open(1280, "en", "student", "/app/dua-study.html?g=rasul&open=1");
  await P.waitForSelector("[data-dua-menu-toggle]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForSelector("[data-dua-keep-edit]", { state: "attached", timeout: 25000 });
  const st = await P.evaluate(() => ({ title: document.querySelectorAll("[data-dua-title]").length, admin: document.querySelectorAll('[data-dua-keep-groups="admin"]').length }));
  check("[student preview] no title fields and no Admin's groups ticks in the Keep tab", st.title === 0 && st.admin === 0, JSON.stringify(st));
  await ctx.close();
}
await browser.close();
console.log(`==== Dua groups menu: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
