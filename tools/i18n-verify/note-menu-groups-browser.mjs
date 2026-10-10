// Issue 747 (Owner, 10 Oct 2026): the Note ⋯ menu is the same actions sorted under six headings -- Move between notes,
// Read, Mark, Organise, Change, Settings -- with Delete alone at the bottom. At 390px it is a bottom sheet; at 820 and
// 1280px it is the drop-down in two columns. Every action is reached through the REAL ⋯ control.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const SEED = `
(function () {
  window.__stubApplyBatches = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts() }, own));
  DATA.noteFolders.push(Object.assign({ _id: "t1__fB", folderId: "fB", name: "Beta", parentFolderId: null, semanticRole: "user", order: 1, status: "active", updatedAt: ts() }, own));
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-08-0" + day + "T09:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  N("n1", "Note One", "<h1>First heading</h1><p>Body one.</p><h2>Second</h2><p>Body two.</p>", 1);
  N("n2", "Note Two", "<p>Second body.</p>", 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const browser = await chromium.launch();
const ORDER = ["move", "read", "mark", "organise", "change", "settings", "danger"];
const IN_GROUP = {
  "data-pane-prev": "move", "data-pane-next": "move",
  "data-pane-find-toggle": "read", "data-pane-foldall": "read", "data-pane-versions": "read", "data-pane-popout": "read",
  "data-pane-flag": "mark",
  "data-pane-attach": "organise", "data-pane-copy": "organise", "data-pane-move": "organise", "data-pane-tags": "organise", "data-pane-link": "organise",
  "data-pane-rename": "change", "data-pane-duplicate": "change",
  "data-pane-mytools": "settings", "data-pane-previews": "settings",
  "data-pane-delete": "danger",
};

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 820], ["bn", 820], ["en", 1280], ["bn", 1280]]) {
  const tag = `${lang} ${width}px`;
  const phone = width < 600;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  {
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  }
  await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
  await page.click('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
  await page.waitForSelector("#notePane:not([hidden])");
  await page.waitForTimeout(500);
  await page.click("[data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu].open", { state: "visible" });

  const info = await page.evaluate(() => {
    const m = document.querySelector("[data-pane-menu]"), mr = m.getBoundingClientRect();
    const groups = [...m.querySelectorAll("[data-pane-menu-group]")].map((g) => ({
      key: g.dataset.paneMenuGroup, head: g.querySelector(".pane-menu-gl")?.textContent || "",
      top: g.getBoundingClientRect().top, attrs: [...g.querySelectorAll("button")].flatMap((b) => [...b.attributes].map((a) => a.name).filter((n) => n.startsWith("data-pane-") && n !== "data-pane-group")).map((n) => n),
    }));
    const tiles = [...m.querySelectorAll("[data-pane-flag]")].map((b) => b.getBoundingClientRect().top);
    const btns = [...m.querySelectorAll("button")].filter((b) => b.offsetParent !== null).map((b) => ({ n: [...b.attributes].map((a) => a.name).find((x) => x.startsWith("data-pane-")), h: b.getBoundingClientRect().height, r: b.getBoundingClientRect().right, l: b.getBoundingClientRect().left, cut: b.scrollWidth > b.clientWidth + 1 }));
    const last = [...m.querySelectorAll("button")].filter((b) => b.offsetParent !== null).pop();
    return {
      groups, tiles, btns, last: last && [...last.attributes].map((a) => a.name).find((x) => x.startsWith("data-pane-") && x !== "data-pane-group" && x !== "data-pane-full"),
      box: { l: mr.left, r: mr.right, w: mr.width, bottom: mr.bottom }, vw: window.innerWidth, vh: window.innerHeight, pos: getComputedStyle(m).position,
      sw: m.scrollWidth, cw: m.clientWidth, h: mr.height,
      pressed: m.querySelector('[data-pane-flag="pinned"]')?.getAttribute("aria-pressed"),
      switchPressed: m.querySelector("[data-pane-previews]")?.getAttribute("aria-pressed"),
    };
  });

  const keys = info.groups.map((g) => g.key);
  check(`${tag}: the groups appear in the order ${ORDER.join(" > ")}`, JSON.stringify(keys) === JSON.stringify(ORDER.filter((k) => keys.includes(k))) && keys.length >= 5, keys.join(","));
  check(`${tag}: the six headings are present and translated`, info.groups.filter((g) => g.key !== "danger").length === 6 && info.groups.filter((g) => g.key !== "danger").every((g) => g.head.trim() && (lang === "en" || /[ঀ-৿]/.test(g.head))), JSON.stringify(info.groups.map((g) => g.head)));
  let bad = [];
  for (const g of info.groups) for (const a of g.attrs) if (IN_GROUP[a] && IN_GROUP[a] !== g.key) bad.push(`${a} in ${g.key}`);
  check(`${tag}: each data-pane-* button sits in its own group`, !bad.length, bad.join("; "));
  check(`${tag}: (positive control) Mark, Organise and Delete groups hold buttons`, ["mark", "organise", "danger"].every((k) => info.groups.some((g) => g.key === k && g.attrs.length)));
  check(`${tag}: Pin, Favourite, Archive and Finalise are four tiles in one row`, info.tiles.length === 4 && info.tiles.every((t) => Math.abs(t - info.tiles[0]) < 1), JSON.stringify(info.tiles));
  check(`${tag}: Delete is the last button`, info.last === "data-pane-delete", String(info.last));
  check(`${tag}: every visible button is at least 40px high`, info.btns.every((b) => b.h >= 39.5), JSON.stringify(info.btns.filter((b) => b.h < 39.5)));
  check(`${tag}: no button is cut or leaves the menu sideways`, info.btns.every((b) => !b.cut && b.l >= info.box.l - 1 && b.r <= info.box.r + 1) && info.sw <= info.cw + 1, JSON.stringify(info.btns.filter((b) => b.cut || b.r > info.box.r + 1)));
  check(`${tag}: the menu stays inside the screen`, info.box.l >= -1 && info.box.r <= info.vw + 1, JSON.stringify(info.box));
  check(`${tag}: the page does not scroll sideways`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  if (phone) {
    check(`${tag}: the menu is a bottom sheet, full width, at most 82% of the screen high`, info.pos === "fixed" && Math.abs(info.box.w - info.vw) <= 1 && Math.abs(info.box.bottom - info.vh) <= 1 && info.h <= info.vh * 0.82 + 1, JSON.stringify(info));
    // Architect's review of #748: the title sat pale gold on a white row inside the navy sheet. It must be readable.
    const headC = await page.evaluate(() => {
      const h = document.querySelector(".pane-menu-head span"); if (!h) return 0;
      const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      let bgEl = h, bg = "rgba(0, 0, 0, 0)"; while (bgEl && (bg = getComputedStyle(bgEl).backgroundColor).endsWith(", 0)")) bgEl = bgEl.parentElement;
      const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const a = L(rgb(getComputedStyle(h).color)), b = L(rgb(bg)); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
    });
    check(`${tag}: the sheet's title can be read (at least 4.5:1 against its row)`, headC >= 4.5, headC);
    check(`${tag}: the sheet has its title row with a ×`, await page.evaluate(() => { const h = document.querySelector(".pane-menu-head"); return !!h && getComputedStyle(h).display !== "none" && !!h.querySelector(".pane-menu-x"); }));
    check(`${tag}: the backdrop is showing`, await page.evaluate(() => { const b = document.querySelector("[data-pane-menu-backdrop]"); return getComputedStyle(b).display === "block"; }));
  } else {
    check(`${tag}: the menu is a drop-down in two columns`, info.pos === "absolute" && await page.evaluate(() => { const c = document.querySelector(".pane-menu-cols"); return getComputedStyle(c).columnCount === "2" && getComputedStyle(document.querySelector(".pane-menu-head")).display === "none" && getComputedStyle(document.querySelector("[data-pane-menu-backdrop]")).display === "none"; }));
    // Architect's review of #748: the drop-down hung below the Notes pane (which scrolls), so Change and Delete were
    // reachable only by scrolling the pane behind it. It must end inside its scrolling ancestor and scroll itself.
    const fit = await page.evaluate(() => {
      const m = document.querySelector("[data-pane-menu]"), r = m.getBoundingClientRect();
      let bottom = innerHeight;
      for (let el = m.parentElement; el && el !== document.body; el = el.parentElement) { const cs = getComputedStyle(el); if (cs.overflowY !== "visible" || cs.overflow !== "visible") bottom = Math.min(bottom, el.getBoundingClientRect().bottom); }
      const del = m.querySelector("[data-pane-delete]");
      del?.scrollIntoView({ block: "nearest" });
      const d = del?.getBoundingClientRect(), mr = m.getBoundingClientRect();
      const hit = d && document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2);
      return { menuBottom: Math.round(r.bottom), clipBottom: Math.round(bottom), delInMenu: !!d && d.top >= mr.top - 1 && d.bottom <= mr.bottom + 1, delHit: !!hit && del.contains(hit) };
    });
    check(`${tag}: the drop-down ends inside its pane and scrolls itself; Delete is reachable and tappable inside it`, fit.menuBottom <= fit.clipBottom + 1 && fit.delInMenu && fit.delHit, JSON.stringify(fit));
  }

  // A Mark tile still toggles aria-pressed (the real handler, through the real tile).
  const was = info.pressed;
  await page.click('[data-pane-menu] [data-pane-flag="pinned"]');
  await page.waitForTimeout(500);
  let now = await page.evaluate(() => {
    const open = document.querySelector("[data-pane-menu].open");
    if (!open) return null;
    return document.querySelector('[data-pane-menu] [data-pane-flag="pinned"]').getAttribute("aria-pressed");
  });
  if (now === null) { await page.click("[data-pane-menu-btn]"); await page.waitForSelector("[data-pane-menu].open"); now = await page.getAttribute('[data-pane-menu] [data-pane-flag="pinned"]', "aria-pressed"); }
  check(`${tag}: tapping the Pin tile toggles aria-pressed (${was} -> ${now})`, was === "false" && now === "true");
  check(`${tag}: a lit tile keeps the short word and carries the full action in its label`, await page.evaluate(() => { const b = document.querySelector('[data-pane-menu] [data-pane-flag="pinned"]'); return b.querySelector(".pane-tile-lb").textContent.trim() !== b.getAttribute("aria-label") && b.getAttribute("title") === b.getAttribute("aria-label"); }));

  if (phone) {
    await page.click("[data-pane-menu-backdrop]", { position: { x: 20, y: 20 } });
    await page.waitForTimeout(200);
    check(`${tag}: tapping the backdrop closes the sheet`, await page.evaluate(() => !document.querySelector("[data-pane-menu]").classList.contains("open")));
    await page.click("[data-pane-menu-btn]");
    await page.waitForSelector("[data-pane-menu].open");
    await page.click(".pane-menu-x");
    await page.waitForTimeout(200);
    check(`${tag}: the × closes the sheet`, await page.evaluate(() => !document.querySelector("[data-pane-menu]").classList.contains("open")));
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
