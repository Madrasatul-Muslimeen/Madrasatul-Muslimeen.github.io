// PCF MSA J104 item 25 (13 Nov 2026) -- app/js/dua-group-ui.js: the Dua groups tree (drag to any level, one menu per group) and a
// group's pop-up (full screen on tablet and phone; window on a computer, dragged by its title, resized from all 8 handles). Rendered
// checks. The module is wired to no page yet, so the suite loads it with a dynamic import() on an ordinary Dua page; the NOT-WIRED
// check proves that no page imports it statically. Run from the repository root, serve.js on :8080.
//   --mutate=nodrag     a drop never lands (zone never set)        --mutate=ro        canEdit is ignored (read-only groups edit)
//   --mutate=nowest     the west handle does not resize            --mutate=nofull    a phone gets the window, not full screen
//   --mutate=nofilter   Move… offers places the rules refuse      --mutate=notrap    the pop-up does not trap Tab / return focus
//   --mutate=leak       destroy() leaves the document click listener on
import fs from "node:fs";
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nodrag: ["js/dua-group-ui.js", "drag.target = id; drag.zone = z; row.classList.add(z);", "drag.target = null; drag.zone = null;"],
  ro: ["js/dua-group-ui.js", "if (!g || !opts.canEdit) return;", "if (!g) return;"],
  nowest: ["js/dua-group-ui.js", 'if (d.includes("w")) { const nw', 'if (false) { const nw'],
  nofull: ["js/dua-group-ui.js", 'matchMedia("(min-width:1000px) and (pointer:fine)")', 'matchMedia("(min-width:1px)")'],
  nofilter: ["js/dua-group-ui.js", "if (g.id === n.id) continue; if (positions.some(([z]) => moveGroup(tree, n.id, g.id, z).ok)) ", ""],
  notrap: ["js/dua-group-ui.js", "release.set(trapModal(win));", "release.set(() => {});"],
  leak: ["js/dua-group-ui.js", 'document.removeEventListener("click", closeMenus); end(true);', "end(true);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// NOT WIRED
const appDir = path.join(process.cwd(), "app"), appJs = path.join(appDir, "js");
const importsOf = (f) => [...fs.readFileSync(f, "utf8").matchAll(/(?:from\s*|import\s+)["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
const entriesOf = (h) => [...fs.readFileSync(h, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
function reaches(target) { const out = []; for (const e of fs.readdirSync(appDir).filter((x) => x.endsWith(".html"))) { const seen = new Set(), q = entriesOf(path.join(appDir, e)).map((m) => [m]); while (q.length) { const c = q.shift(), h = c[c.length - 1]; if (seen.has(h)) continue; seen.add(h); if (h === target) { out.push(e); break; } const f = path.join(appJs, h); if (fs.existsSync(f)) for (const n of importsOf(f)) q.push([...c, n]); } } return out; }
check("POSITIVE CONTROL: the walker finds a wired module (records.js)", reaches("records.js").length > 0);
check("NOT WIRED AT START-UP (I9): no STATIC chain from a page reaches dua-group-ui.js; only the lazy door in dua-study.js does", reaches("dua-group-ui.js").length === 0, reaches("dua-group-ui.js").join());

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(width, lang, pointer = "fine") {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, hasTouch: pointer === "coarse" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [f, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${f}*`, async (r) => { const s = fs.readFileSync(`app/${f}`, "utf8"); if (!s.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: s.split(a).join(b) }); }); }
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul");
  await P.waitForSelector("[data-dua-topbar], .hadith-card, body", { timeout: 20000 });
  return { ctx, P };
}
const SAMPLE = `[{id:"g-aaaaaaa1",name:{en:"Morning",bn:"সকাল"},kids:[{id:"g-aaaaaaa2",name:{en:"Hisn"},kids:[{id:"g-aaaaaaa3",name:{en:"Waking"},kids:[]}]},{id:"g-aaaaaaa4",name:{en:"Short"},kids:[]}]},{id:"g-aaaaaaa5",name:{en:"Sahaba"},kids:[]},{id:"g-aaaaaaa6",name:{en:"Mine"},kids:[]}]`;
const MOUNT = (canEdit) => `(async () => { const m = await import("/app/js/dua-group-ui.js"); window.__m = m; const host = document.createElement("div"); host.id = "gt-host"; document.body.prepend(host); window.__changes = []; window.__copied = []; window.__answers = []; window.__texts = []; window.__ui = m.mountGroupTree(host, { tree: ${SAMPLE}, canEdit: ${canEdit}, lang: window.__lang || "en", onChange: (t, r) => window.__changes.push({ tree: t, removed: r.removed || null }), onOpen: (n) => (window.__opened = n.id), onCopy: (n) => window.__copied.push(n.id), ask: async (kind, text, preset) => { window.__answers.push(kind); window.__texts.push(text); return kind === "confirm" ? true : "NewName"; } }); })()`;
const names = (P) => P.$$eval(".dua-gt-row", (rs) => rs.map((r) => r.dataset.groupId + ":" + (r.querySelector(".dua-gt-name").firstChild.textContent)));
const dragRow = async (P, fromId, toId, where) => { // where: top | mid | bottom of the target row
  const g = await (await P.$(`.dua-gt-row[data-group-id="${fromId}"] .dua-gt-grip`)).boundingBox(), t = await (await P.$(`.dua-gt-row[data-group-id="${toId}"]`)).boundingBox();
  const y = where === "top" ? t.y + t.height * 0.1 : where === "bottom" ? t.y + t.height * 0.9 : t.y + t.height / 2;
  await P.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await P.mouse.down(); await P.mouse.move(t.x + 80, y, { steps: 8 }); await P.mouse.up();
};
for (const [width, lang] of [[1280, "en"], [390, "en"], [390, "bn"]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, P } = await open(width, lang);
  if (lang === "bn") await P.evaluate(() => { window.__lang = "bn"; });
  await P.evaluate(MOUNT(true));
  await P.waitForSelector(".dua-gt-row");
  const n0 = await names(P);
  check(`${tag} the tree shows every group, kids under their parent, with its level`, n0.length === 6 && (await P.$$eval(".dua-gt-level", (l) => l.map((x) => x.textContent.trim().split(" ").pop()).join())) === "1,2,3,2,1,1", JSON.stringify(n0));
  if (lang === "bn") check(`${tag} a group shows its Bangla name when it has one, the English when it has none`, n0[0].endsWith("সকাল") && n0[1].endsWith("Hisn"), JSON.stringify(n0.slice(0, 2)));
  check(`${tag} each row has a drag handle and ONE ⋯ menu, finger-sized`, (await P.$$eval(".dua-gt-row", (rs) => rs.every((r) => r.querySelectorAll(".dua-gt-grip").length === 1 && r.querySelectorAll(".dua-gt-more").length === 1 && r.querySelector(".dua-gt-more").getBoundingClientRect().height >= 40 && r.querySelector(".dua-gt-grip").getBoundingClientRect().height >= 40))));
  // menu
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa2"] .dua-gt-more');
  const MV = lang === "bn" ? "সরান" : "Move", AD = lang === "bn" ? "ভেতরে একটি" : "Add";
  const m2 = await P.$$eval('.dua-gt-row[data-group-id="g-aaaaaaa2"] .dua-gt-menu button', (b) => b.map((x) => x.textContent));
  check(`${tag} a level-2 group's menu: Open, Rename, Add a group inside, Move…, Delete`, m2.length === 5 && m2[3].startsWith(MV), JSON.stringify(m2));
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa2"] .dua-gt-menu button >> nth=1'); // Rename
  check(`${tag} Rename asks for a name and the tree is changed, id and kids kept`, (await P.evaluate(() => window.__changes.length)) === 1 && (await names(P)).includes("g-aaaaaaa2:NewName"), JSON.stringify(await names(P)));
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa3"] .dua-gt-more');
  const m3 = await P.$$eval('.dua-gt-row[data-group-id="g-aaaaaaa3"] .dua-gt-menu button', (b) => b.map((x) => x.textContent));
  check(`${tag} a level-3 group's menu has NO "Add a group inside" (3 levels at most) but still Move…`, m3.length === 4 && !m3.some((x) => x.startsWith(AD)) && m3.some((x) => x.startsWith(MV)), JSON.stringify(m3));
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa3"] .dua-gt-more');
  // keyboard / screen-reader route: ⋯ → Move… (no pointer), only places the same rules accept
  const snap = await P.evaluate(() => JSON.stringify(window.__ui.tree()));
  const openMove = async (id) => {
    await P.focus(`.dua-gt-row[data-group-id="${id}"] .dua-gt-more`); await P.keyboard.press("Enter");
    const idx = await P.$$eval(`.dua-gt-row[data-group-id="${id}"] .dua-gt-menu button`, (b, mv) => b.findIndex((x) => x.textContent.startsWith(mv)), MV);
    for (let i = 0; i <= idx; i++) await P.keyboard.press("Tab");
    await P.keyboard.press("Enter"); await P.waitForSelector(".dua-gt-move select", { timeout: 5000 });
  };
  await openMove("g-aaaaaaa1");
  const where = await P.$$eval(".dua-gt-move select:nth-of-type(1) option", (o) => o.map((x) => x.value));
  check(`${tag} Move… (keyboard) offers only places the rules accept: never the group itself or its own kids, but its other places`, !["g-aaaaaaa1", "g-aaaaaaa2", "g-aaaaaaa3", "g-aaaaaaa4"].some((i) => where.includes(i)) && where.includes("g-aaaaaaa5") && where.includes("g-aaaaaaa6"), JSON.stringify(where));
  await P.selectOption(".dua-gt-move select:nth-of-type(1)", "g-aaaaaaa5");
  const hows = await P.$$eval(".dua-gt-move select:nth-of-type(2) option", (o) => o.map((x) => x.value));
  check(`${tag} a 3-level group can go before or after a top-level group, but NOT inside it (that would be 4 levels)`, hows.join() === "before,after", JSON.stringify(hows));
  await P.keyboard.press("Escape");
  check(`${tag} Escape closes the Move panel and puts focus back on the ⋯ button`, (await P.locator(".dua-gt-move").count()) === 0 && (await P.evaluate(() => document.activeElement?.className)) === "dua-gt-more");
  await P.evaluate(() => { window.__changes.length = 0; });
  await openMove("g-aaaaaaa6");
  await P.selectOption(".dua-gt-move select:nth-of-type(1)", "g-aaaaaaa5"); await P.selectOption(".dua-gt-move select:nth-of-type(2)", "inside");
  await P.focus(".dua-gt-move-go"); await P.keyboard.press("Enter");
  const kbTree = await P.evaluate(() => window.__ui.tree().map((n) => n.id + (n.kids.length ? "(" + n.kids.map((k) => k.id).join() + ")" : "")).join());
  check(`${tag} Move… by keyboard really moves the group (Mine inside Sahaba) through the same rules, one onChange`, kbTree.includes("g-aaaaaaa5(g-aaaaaaa6)") && (await P.evaluate(() => window.__changes.length)) === 1, kbTree);
  await P.evaluate((j) => { window.__ui.render(JSON.parse(j)); window.__changes.length = 0; }, snap);
  // drag: Mine (6) inside Sahaba (5)
  await dragRow(P, "g-aaaaaaa6", "g-aaaaaaa5", "mid");
  const afterInside = await P.evaluate(() => window.__ui.tree().map((n) => n.id + (n.kids.length ? "(" + n.kids.map((k) => k.id).join() + ")" : "")).join());
  check(`${tag} DRAG a group onto the middle of another puts it INSIDE`, afterInside.includes("g-aaaaaaa5(g-aaaaaaa6)") && (await P.evaluate(() => window.__changes.length)) === 1, afterInside);
  // drag: Sahaba (with kid) above Morning
  await dragRow(P, "g-aaaaaaa5", "g-aaaaaaa1", "top");
  const afterTop = await P.evaluate(() => window.__ui.tree().map((n) => n.id).join());
  check(`${tag} DRAG onto the top edge of another puts it BEFORE it`, afterTop.startsWith("g-aaaaaaa5,g-aaaaaaa1"), afterTop);
  // refused drops: Morning (height 3) inside Hisn's level-3 kid: must not change
  const before = await P.evaluate(() => JSON.stringify(window.__ui.tree())), nch = await P.evaluate(() => window.__changes.length);
  await dragRow(P, "g-aaaaaaa1", "g-aaaaaaa3", "mid");
  check(`${tag} a drop that would make 4 levels, or put a group into its own kids, changes nothing`, (await P.evaluate(() => JSON.stringify(window.__ui.tree()))) === before && (await P.evaluate(() => window.__changes.length)) === nch);
  // delete
  await P.evaluate(() => { window.__changes.length = 0; });
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa1"] .dua-gt-more'); await P.click('.dua-gt-row[data-group-id="g-aaaaaaa1"] .dua-gt-menu .dua-gt-danger');
  const del = await P.evaluate(() => ({ kinds: window.__answers.slice(-1)[0], text: window.__texts.slice(-1)[0], c: window.__changes[0], ids: window.__ui.tree().map((n) => n.id) }));
  check(`${tag} Delete asks for a yes/no, then takes the group and the groups inside it out (removed: 4 ids)`, del.kinds === "confirm" && del.c?.removed?.length === 4 && !del.ids.includes("g-aaaaaaa1"), JSON.stringify(del));
  check(`${tag} the Delete question is ONE whole sentence with the group's name in it and says it is gone for good (and "the groups inside it" when it has kids)`, typeof del.text === "string" && del.text.includes(lang === "bn" ? "সকাল" : "Morning") && (lang === "bn" ? del.text.includes("চিরতরে") && del.text.includes("এর ভেতরের গ্রুপগুলো") : del.text.includes("for good") && del.text.includes("and the groups inside it")), JSON.stringify(del.text));
  await ctx.close();
}
// read-only
{
  const { ctx, P } = await open(1280, "en");
  await P.evaluate(MOUNT(false)); await P.waitForSelector(".dua-gt-row");
  await dragRow(P, "g-aaaaaaa6", "g-aaaaaaa5", "mid");
  check("[read-only] dragging does nothing and calls no onChange", (await P.evaluate(() => window.__changes.length)) === 0 && (await P.evaluate(() => window.__ui.tree().length)) === 3);
  await P.click('.dua-gt-row[data-group-id="g-aaaaaaa5"] .dua-gt-more');
  const ro = await P.$$eval('.dua-gt-row[data-group-id="g-aaaaaaa5"] .dua-gt-menu button', (b) => b.map((x) => x.textContent));
  check("[read-only] the menu offers Open and Copy to My groups only (no Rename, Add, Move, Delete)", ro.length === 2 && ro[0] === "Open" && ro[1] === "Copy to My groups", JSON.stringify(ro));
  await ctx.close();
}
// pop-up: computer = window, drag + resize from every side and corner
{
  const { ctx, P } = await open(1280, "en");
  await P.evaluate(() => { const b = document.createElement("div"); b.textContent = "sample"; return import("/app/js/dua-group-ui.js").then((m) => { window.__gw = m.openGroupWindow({ title: "Morning", body: b, onClose: () => (window.__closed = true) }); }); });
  const box = () => P.evaluate(() => { const r = document.querySelector(".dua-gw").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), full: document.querySelector(".dua-gw").classList.contains("dua-gw-full") }; });
  const b0 = await box();
  check("[1280] on a computer the pop-up is a WINDOW (not full screen) with eight resize handles", !b0.full && b0.w === 460 && (await P.locator(".dua-gw-h").count()) === 8, JSON.stringify(b0));
  const hd = await (await P.$(".dua-gw-head")).boundingBox();
  await P.mouse.move(hd.x + 20, hd.y + 10); await P.mouse.down(); await P.mouse.move(hd.x + 120, hd.y + 70, { steps: 5 }); await P.mouse.up();
  const b1 = await box();
  check("[1280] dragging the title bar moves the window (+100, +60), size unchanged", b1.x - b0.x === 100 && b1.y - b0.y === 60 && b1.w === b0.w && b1.h === b0.h, JSON.stringify([b0, b1]));
  const drag = async (dir, dx, dy) => { const h = await (await P.$(`.dua-gw-h-${dir}`)).boundingBox(); const cx = h.x + h.width / 2, cy = h.y + h.height / 2; await P.mouse.move(cx, cy); await P.mouse.down(); await P.mouse.move(cx + dx, cy + dy, { steps: 5 }); await P.mouse.up(); };
  let c = await box();
  const cases = [["e", 60, 0, (a, b) => b.w - a.w === 60 && b.x === a.x && b.h === a.h], ["s", 0, 50, (a, b) => b.h - a.h === 50 && b.y === a.y && b.w === a.w], ["w", -40, 0, (a, b) => b.w - a.w === 40 && b.x - a.x === -40 && b.y === a.y], ["n", 0, -30, (a, b) => b.h - a.h === 30 && b.y - a.y === -30 && b.x === a.x], ["se", 20, 20, (a, b) => b.w - a.w === 20 && b.h - a.h === 20 && b.x === a.x && b.y === a.y], ["nw", -20, -20, (a, b) => b.w - a.w === 20 && b.h - a.h === 20 && b.x - a.x === -20 && b.y - a.y === -20], ["ne", 20, -20, (a, b) => b.w - a.w === 20 && b.h - a.h === 20 && b.y - a.y === -20 && b.x === a.x], ["sw", -20, 20, (a, b) => b.w - a.w === 20 && b.h - a.h === 20 && b.x - a.x === -20 && b.y === a.y]];
  for (const [dir, dx, dy, ok] of cases) { const a = c; await drag(dir, dx, dy); c = await box(); check(`[1280] the ${dir} handle resizes the right edge(s) only (${a.w}x${a.h} -> ${c.w}x${c.h})`, ok(a, c), JSON.stringify([a, c])); }
  await drag("w", 1500, 0); const tiny = await box();
  check("[1280] the window never shrinks below 280 x 200", tiny.w >= 280 && tiny.h >= 200, JSON.stringify(tiny));
  check("[1280] the pop-up is role=dialog and aria-modal=true", (await P.getAttribute(".dua-gw", "role")) === "dialog" && (await P.getAttribute(".dua-gw", "aria-modal")) === "true");
  await P.keyboard.press("Escape");
  check("[1280] Escape closes the pop-up and tells its owner", (await P.locator(".dua-gw").count()) === 0 && (await P.evaluate(() => window.__closed)) === true);
  await ctx.close();
}
// pop-up: focus is trapped inside while open, and goes back to the opener when it closes
{
  const { ctx, P } = await open(1280, "en");
  await P.evaluate(() => { const o = document.createElement("button"); o.id = "opener"; o.textContent = "open"; document.body.prepend(o); o.focus(); return import("/app/js/dua-group-ui.js").then((m) => { const b = document.createElement("div"); const i = document.createElement("button"); i.textContent = "inner"; b.append(i); window.__gw = m.openGroupWindow({ title: "Morning", body: b }); }); });
  const inside = [];
  for (let i = 0; i < 9; i++) { await P.keyboard.press("Tab"); inside.push(await P.evaluate(() => !!document.activeElement?.closest(".dua-gw"))); }
  check("[1280] Tab pressed 9 times never leaves the pop-up (focus is trapped)", inside.every(Boolean), JSON.stringify(inside));
  const back = []; await P.keyboard.press("Shift+Tab"); back.push(await P.evaluate(() => !!document.activeElement?.closest(".dua-gw")));
  check("[1280] Shift+Tab stays inside too", back.every(Boolean));
  await P.click(".dua-gw-close");
  check("[1280] closing the pop-up puts focus back on the button that opened it", (await P.evaluate(() => document.activeElement?.id)) === "opener");
  await ctx.close();
}
// destroy(): the document click listener is registered once per mount and removed with destroy()
{
  const { ctx, P } = await open(1280, "en");
  const net = await P.evaluate(async () => {
    let adds = 0, removes = 0; const a = document.addEventListener.bind(document), r = document.removeEventListener.bind(document);
    document.addEventListener = (t, f, o) => { if (t === "click") adds++; return a(t, f, o); }; document.removeEventListener = (t, f, o) => { if (t === "click") removes++; return r(t, f, o); };
    const m = await import("/app/js/dua-group-ui.js"); const mk = () => { const h = document.createElement("div"); document.body.append(h); return m.mountGroupTree(h, { tree: [{ id: "g-aaaaaaa1", name: { en: "A" }, kids: [] }], canEdit: true }); };
    const t1 = mk(), t2 = mk(); const open2 = adds - removes; t1.destroy(); const after1 = adds - removes; t2.destroy(); const after2 = adds - removes;
    document.addEventListener = a; document.removeEventListener = r;
    return { open2, after1, after2 };
  });
  check("[1280] two mounts register two click listeners; destroy() takes each one off again (none left)", net.open2 === 2 && net.after1 === 1 && net.after2 === 0, JSON.stringify(net));
  await ctx.close();
}
// pop-up: phone = full screen
for (const [w, kind] of [[390, "coarse"], [820, "coarse"]]) {
  const { ctx, P } = await open(w, "en", kind);
  await P.evaluate(() => import("/app/js/dua-group-ui.js").then((m) => { const b = document.createElement("div"); b.textContent = "x"; window.__gw = m.openGroupWindow({ title: "Morning", body: b }); }));
  const r = await P.evaluate(() => { const g = document.querySelector(".dua-gw").getBoundingClientRect(); return { w: Math.round(g.width), h: Math.round(g.height), l: Math.round(g.left), t: Math.round(g.top), iw: innerWidth, ih: innerHeight, handles: [...document.querySelectorAll(".dua-gw-h")].every((h) => getComputedStyle(h).display === "none") }; });
  check(`[${w} touch] the pop-up is FULL SCREEN (the whole viewport) and its resize handles are off`, r.w === r.iw && r.h === r.ih && r.l === 0 && r.t === 0 && r.handles, JSON.stringify(r));
  check(`[${w} touch] the ✕ is finger-sized and closes it`, await (async () => { try { const bb = await (await P.$(".dua-gw-close")).boundingBox(); await P.click(".dua-gw-close", { timeout: 3000 }); return bb.height >= 40 && (await P.locator(".dua-gw").count()) === 0; } catch (e) { return false; } })());
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua group screen (25): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
