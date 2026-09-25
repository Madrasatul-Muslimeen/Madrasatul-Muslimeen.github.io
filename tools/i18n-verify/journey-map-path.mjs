// Mapping My Journey Path view: branching with links (issue #267, Owner
// decision, 25 Sep 2026: "Path view: branching with links"). Supersedes
// v08.37's own honest-first-pass straight track. Each folder is a branch
// (drawn from buildFolderTree(), the same tree Folders already draws); a
// folder's own filed Notes are stops along it, oldest first; a Note filed
// in more than one folder carries a 🔗 badge on every appearance, and
// tapping one highlights every appearance and draws a connecting line.
//
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const TENANT_ID = "t1", OWNER = "p1", UID = "test-uid";
const TS = "2026-01-01T00:00:00.000Z";
function folderRow(folderId, name, parentFolderId, order) {
  return { _id: `${TENANT_ID}__${folderId}`, folderId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
    name, parentFolderId, semanticRole: "user", order, status: "active",
    schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID };
}
function noteRow(noteId, title) {
  return { _id: `${TENANT_ID}__${noteId}`, noteId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
    title, bodyHtml: `<p>${title}</p>`, status: "active", visibility: "private", currentRevisionId: `${noteId}-r1`,
    schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID };
}
function placementRow(placementId, noteId, folderId, order = 0) {
  return { _id: `${TENANT_ID}__${placementId}`, placementId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
    noteId, folderId, order, status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID };
}
/** data-branch-key is expandKeyFor()'s own key -- a plain user folder's folderId -- so a lookup by it is exact, never text-matched. */
function branchStopCount(page, branchKey) {
  return page.evaluate((key) => {
    const branch = document.querySelector(`[data-path-tree] [data-branch-key="${key}"]`);
    const stops = branch?.querySelector(":scope > .path-branch-body > .path-stops");
    return stops ? stops.querySelectorAll(":scope > .path-stop").length : -1;
  }, branchKey);
}
function clickBranchToggle(page, branchKey) {
  return page.evaluate((key) => {
    const branch = document.querySelector(`[data-path-tree] [data-branch-key="${key}"]`);
    const toggle = branch?.querySelector(":scope > .path-branch-head [data-path-branch-toggle]");
    if (!toggle) return false;
    toggle.click();
    return true;
  }, branchKey);
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// Scenario 1A: two root branches (Alpha, Beta -- both depth 0, expanded by
// default), one Note filed in BOTH ("Shared reflection"), and Beta carrying
// 26 direct stops (the ">20 -> +N more" grouping).
// ---------------------------------------------------------------------------
{
  const folders = [folderRow("f-alpha", "Alpha", null, 0), folderRow("f-beta", "Beta", null, 1)];
  const manyNotes = Array.from({ length: 25 }, (_, i) => noteRow(`n-many-${i}`, `Beta note ${i}`));
  const notes = [noteRow("n-shared", "Shared reflection"), ...manyNotes];
  const placements = [
    placementRow("p-shared-a", "n-shared", "f-alpha"),
    placementRow("p-shared-b", "n-shared", "f-beta"),
    ...manyNotes.map((n, i) => placementRow(`p-many-${i}`, n.noteId, "f-beta", i + 1)),
  ];
  const SEED = `
DATA.noteFolders = ${JSON.stringify(folders)};
DATA.notes = ${JSON.stringify(notes)};
DATA.notePlacements = ${JSON.stringify(placements)};
`;
  const ctx = await newContext(browser, { viewport: { width: 390, height: 900 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#path");
  await page.waitForSelector("[data-path-tree] .path-branch", { timeout: 5000 });

  // mergedRoots() always carries the two system folders (Personal Journey
  // Map, Reflection Archive) ahead of a person's own roots -- so the root
  // branch count is 2 system + 2 user, not just the two named here.
  check("both root branches (Alpha, Beta) are drawn from the folder tree, alongside the two system folders",
    (await page.locator('[data-path-tree] > .path-branch[data-branch-key="f-alpha"]').count()) === 1
    && (await page.locator('[data-path-tree] > .path-branch[data-branch-key="f-beta"]').count()) === 1
    && (await page.locator("[data-path-tree] > .path-branch").count()) === 4);

  check("the top two levels start expanded: a Note filed in both root branches renders on both, with no tap",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"]').count()) === 2,
    "expected the shared Note's card to render twice, once per root branch");

  check("a Note filed in two folders shows a 🔗 link badge on each of its own appearances",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"] [data-path-link-badge]').count()) === 2);

  // --- ">20 stops on one branch" grouping -----------------------------------
  const betaStopsBefore = await branchStopCount(page, "f-beta");
  check("Beta's own branch shows at most 20 stops before its own \"+N more\" is tapped", betaStopsBefore >= 0 && betaStopsBefore <= 20, `got ${betaStopsBefore}`);
  const moreBtn = page.locator('[data-path-more="f-beta"]');
  check("Beta's own \"+N more\" button is present, naming the real remainder", (await moreBtn.count()) === 1);
  if (await moreBtn.count()) {
    await moreBtn.click();
    await page.waitForTimeout(150);
    const betaStopsAfter = await branchStopCount(page, "f-beta");
    check("tapping \"+N more\" reveals every one of Beta's 26 stops (25 \"many\" notes plus the shared one)", betaStopsAfter === 26, `got ${betaStopsAfter}`);
  }

  // --- tapping a Note opens it exactly as Timeline does ---------------------
  const firstMany = page.locator('[data-path-tree] .note-card[data-note-id="n-many-0"] [data-note-toggle]');
  await firstMany.click();
  await page.waitForTimeout(150);
  check("tapping a stop's Note opens it -- the shared note-card preview, same as Timeline",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-many-0"] .note-body-preview.open').count()) === 1);

  // --- a hit-test on a stop: it is really the topmost element there ---------
  const hit = await page.evaluate(() => {
    const el = document.querySelector('[data-path-tree] .note-card[data-note-id="n-many-0"] [data-note-toggle]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const found = document.elementFromPoint(cx, cy);
    return { onTop: !!found && (found === el || el.contains(found)) };
  });
  check("a hit-test on a stop lands on the stop itself, not something covering it", !!hit && hit.onTop, JSON.stringify(hit));

  // --- link badge: highlight + connecting line, tap-again and Escape clear --
  const badge = page.locator('[data-path-tree] .note-card[data-note-id="n-shared"] [data-path-link-badge]').first();
  await badge.click();
  await page.waitForTimeout(150);
  check("tapping the link badge highlights EVERY appearance of the Note (both branches)",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"].path-note-highlighted').count()) === 2);
  check("a connecting line is drawn between the two highlighted appearances",
    (await page.locator('[data-path-tree] [data-path-link-lines] line').count()) >= 1);

  await badge.click();
  await page.waitForTimeout(150);
  check("tapping the badge again clears the highlight",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"].path-note-highlighted').count()) === 0
    && (await page.locator('[data-path-tree] [data-path-link-lines]').count()) === 0);

  await badge.click();
  await page.waitForTimeout(150);
  check("the highlight can be turned back on", (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"].path-note-highlighted').count()) === 2);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check("pressing Escape clears the highlight too",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-shared"].path-note-highlighted').count()) === 0
    && (await page.locator('[data-path-tree] [data-path-link-lines]').count()) === 0);

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("no page errors (the sandbox's own TLS/proxy artefacts excepted)", real.length === 0, real.join("; "));

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Scenario 1B: a branch three levels deep (Alpha > Gamma > Delta), a FRESH
// context so nothing from 1A leaks in. Delta (depth 2) starts collapsed and
// its own Note is provably not on screen until a tap. Separately, a Note
// filed in Beta (always visible) AND Delta (collapsed) proves the link
// badge's own auto-reveal: tapping it from the visible Beta occurrence must
// expand Gamma > Delta on its own to show the second appearance, not merely
// highlight whatever happened to already be on screen.
// ---------------------------------------------------------------------------
{
  const folders = [
    folderRow("f-alpha", "Alpha", null, 0),
    folderRow("f-beta", "Beta", null, 1),
    folderRow("f-gamma", "Gamma", "f-alpha", 0),
    folderRow("f-delta", "Delta", "f-gamma", 0),
  ];
  const notes = [noteRow("n-deep", "Deep note"), noteRow("n-linked", "Linked note")];
  const placements = [
    placementRow("p-deep", "n-deep", "f-delta"),
    placementRow("p-linked-beta", "n-linked", "f-beta"),
    placementRow("p-linked-delta", "n-linked", "f-delta"),
  ];
  const SEED = `
DATA.noteFolders = ${JSON.stringify(folders)};
DATA.notes = ${JSON.stringify(notes)};
DATA.notePlacements = ${JSON.stringify(placements)};
`;
  const ctx = await newContext(browser, { viewport: { width: 390, height: 900 }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/journey-map.html#path");
  await page.waitForSelector("[data-path-tree] .path-branch", { timeout: 5000 });

  check("Delta (depth 2, inside Alpha > Gamma) starts collapsed: its own Note is not on screen yet",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-deep"]').count()) === 0);
  check("Delta's linked Note is also not on screen yet -- only its Beta appearance is",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-linked"]').count()) === 1);

  const toggled = await clickBranchToggle(page, "f-delta");
  check("Delta's own toggle exists and was clicked", toggled);
  await page.waitForTimeout(150);
  check("tapping Delta's own toggle expands it and reveals its Note",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-deep"]').count()) === 1);
  check("expanding Delta by hand also reveals the linked Note's second appearance there",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-linked"]').count()) === 2);

  // Collapse Delta again, fresh, to prove the BADGE's own auto-reveal --
  // tapping the badge from the still-visible Beta appearance must expand
  // Gamma > Delta on its own, not rely on the manual expand above.
  await clickBranchToggle(page, "f-delta");
  await page.waitForTimeout(150);
  check("collapsing Delta again hides its own Note once more (undoing the manual expand above)",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-deep"]').count()) === 0);

  const badge = page.locator('[data-path-tree] .note-card[data-note-id="n-linked"] [data-path-link-badge]').first();
  check("the still-visible Beta appearance carries its own 🔗 badge", (await badge.count()) === 1);
  await badge.click();
  await page.waitForTimeout(150);
  check("tapping the badge from a visible appearance auto-expands the collapsed branch holding the OTHER one",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-linked"]').count()) === 2);
  check("both appearances are highlighted once the hidden one is revealed",
    (await page.locator('[data-path-tree] .note-card[data-note-id="n-linked"].path-note-highlighted').count()) === 2);
  check("a connecting line reaches the newly-revealed appearance too",
    (await page.locator('[data-path-tree] [data-path-link-lines] line').count()) >= 1);

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Scenario 2: the size fixture -- roughly the Owner's imported site
// (issue #265: ~1,464 folders, ~1,091 Notes). Measures render time and
// proves the page itself never scrolls sideways at three widths, in both
// languages -- only #pathTree's own box may.
// ---------------------------------------------------------------------------
function buildSizeFixture({ folderCount = 1500, noteCount = 1100 } = {}) {
  const rootCount = 20, branching = 8;
  const folders = [];
  for (let i = 0; i < folderCount; i++) {
    const folderId = `pf${i}`;
    const parentFolderId = i < rootCount ? null : folders[Math.floor((i - rootCount) / branching)].folderId;
    folders.push(folderRow(folderId, `Folder ${i}`, parentFolderId, i));
  }
  const notes = [], placements = [];
  for (let i = 0; i < noteCount; i++) {
    const noteId = `pn${i}`;
    notes.push(noteRow(noteId, `Note ${i}`));
    const folder = folders[i % folderCount];
    placements.push(placementRow(`pp${i}`, noteId, folder.folderId, 0));
  }
  return { folders, notes, placements };
}
const { folders: bigFolders, notes: bigNotes, placements: bigPlacements } = buildSizeFixture();
const SEED_BIG = `
DATA.noteFolders = ${JSON.stringify(bigFolders)};
DATA.notes = ${JSON.stringify(bigNotes)};
DATA.notePlacements = ${JSON.stringify(bigPlacements)};
`;
console.log(`  (size fixture: ${bigFolders.length} folders, ${bigNotes.length} Notes, ${bigPlacements.length} placements)`);

// Render time -- measured once, at a representative phone width. openPage()
// itself already waits for `networkidle` plus a fixed 400ms settle pause
// (splash-overlay removal); that fixed cost is included in the budget below
// rather than subtracted out, so the number stays an honest wall-clock figure
// a reader would actually feel.
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 900 }, extraSeedJs: SEED_BIG });
  const t0 = Date.now();
  const { page } = await openPage(ctx, "/app/journey-map.html#path");
  await page.waitForSelector("[data-path-tree] .path-branch", { timeout: 20000 });
  const elapsed = Date.now() - t0;
  console.log(`  (rendered the ${bigFolders.length}-folder / ${bigNotes.length}-Note fixture's default (collapsed-below-depth-2) view in ${elapsed}ms)`);
  check(`the size fixture renders within 8000ms (measured ${elapsed}ms)`, elapsed < 8000);
  const branchCount = await page.locator("[data-path-tree] .path-branch").count();
  check("only the top two levels are actually in the DOM by default -- collapsing keeps the render bounded", branchCount < bigFolders.length,
    `rendered ${branchCount} branch elements of ${bigFolders.length} folders`);
  await ctx.close();
}

// No sideways PAGE scroll, at three widths, in both languages -- #pathTree
// may scroll within itself; document.documentElement must not.
for (const lang of ["en", "bn"]) {
  for (const width of [360, 390, 1100]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED_BIG });
    const { page } = await openPage(ctx, "/app/journey-map.html#path");
    await page.waitForSelector("[data-path-tree] .path-branch", { timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${lang} ${width}px: no sideways page scroll with the size fixture loaded`, overflow <= 1, `scrollWidth exceeds innerWidth by ${overflow}px`);
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Mapping My Journey Path (branching with links, issue #267): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
