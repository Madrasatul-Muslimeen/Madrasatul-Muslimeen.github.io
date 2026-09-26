// Ayah Card section C part 2 -- "Connected āyāt", in a real browser (issue
// #318). The Owner's decision (recorded on issue #295 and
// docs/governance/2026-09-26-owner-decisions.md): Connected = the reader's
// OWN Notes and Mapping folders that connect this āyah to others, each
// marked studied or not.
//
// Written here, NOT run here -- this sandbox has no Playwright browser
// binaries installed, the same documented, repeated environment gap
// CLAUDE.md records for every browser-driven suite in this directory. The
// Architect/CI should run this for real before it is trusted.
//
// Fixture: a Note ("My reflection") anchored to BOTH 2:255 and 2:256 (via a
// Note); a folder ("Tafsir folder") filing that same Note (on 2:255) AND a
// second Note anchored to 3:2 (via a folder). 3:2 also carries a seeded,
// claimed Approach -- shown as "Studied" once the reader has visited Explore
// this session (which is what actually populates the page's own per-surah
// records cache the Connected feature reads from -- see quranrevival.html's
// own studiedStatusForConnectedAyah()/ayah-related.js's own comment on
// "not checked" vs. "not studied"). A separate, fresh-session scenario at
// the bottom proves 3:2 reads "Not checked" when that cache was never
// warmed.
// Run from the repository root with serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const TENANT_ID = "t1", OWNER = "p1", UID = "test-uid";
const TS = "2026-01-01T00:00:00.000Z";
const noteRow = (noteId, title) => ({
  _id: `${TENANT_ID}__${noteId}`, noteId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
  title, bodyHtml: `<p>${title}</p>`, status: "active", visibility: "private", currentRevisionId: `${noteId}-r1`,
  schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID,
});
const sourceRow = (sourceLinkId, noteId, sourceKey, relationshipKind = "origin") => ({
  _id: `${TENANT_ID}__${sourceLinkId}`, sourceLinkId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
  noteId, sourceKey, sourceKind: "quran-unit", relationshipKind, approachId: null, provenanceKind: "study-note",
  status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID,
});
const folderRow = (folderId, name) => ({
  _id: `${TENANT_ID}__${folderId}`, folderId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
  name, parentFolderId: null, semanticRole: "user", order: 1, status: "active",
  schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID,
});
const placementRow = (placementId, noteId, folderId, order = 0) => ({
  _id: `${TENANT_ID}__${placementId}`, placementId, tenantId: TENANT_ID, ownerPersonId: OWNER, ownerUid: UID,
  noteId, folderId, order, status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: UID,
});

const FOLDER_LABEL = "Tafsir folder";
const NOTE_TITLE = "My reflection";
const SEED = `
DATA.notes = ${JSON.stringify([noteRow("n-home", NOTE_TITLE), noteRow("n-other", "3:2 note")])};
DATA.noteSources = ${JSON.stringify([
  sourceRow("s-home-255", "n-home", "ayah:2:255", "origin"),
  sourceRow("s-home-256", "n-home", "ayah:2:256", "reference"),
  sourceRow("s-other-302", "n-other", "ayah:3:2", "origin"),
])};
DATA.noteFolders = ${JSON.stringify([folderRow("f-test", FOLDER_LABEL)])};
DATA.notePlacements = ${JSON.stringify([
  placementRow("pl-home", "n-home", "f-test", 0),
  placementRow("pl-other", "n-other", "f-test", 1),
])};
DATA.records = [{
  _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1",
  entries: { "ayah:3:2::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", confirmedStatus: "achieved", confirmState: "confirmed" } },
}];
`;

async function openStudy(page, which) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const reachable = await page.evaluate((id) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) > 0, which);
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click(`#${which}`);
  await page.waitForTimeout(700);
}

async function goToSurah2Ayah255(page) {
  await openStudy(page, "tabReadBtn");
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const u = document.getElementById("unitTypeSelect"); u.value = "ayah"; u.dispatchEvent(new Event("change", { bubbles: true }));
    const a = document.getElementById("ayahSelect"); a.value = "255"; a.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(600);
}

function noteFoundationReads(fsLog) {
  return (fsLog || []).filter((r) => /^notes$|^noteSources$|^noteFolders$|^notePlacements$/.test(r.col || ""));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// =============================================================================
// Scenario A: the Owner's own spec -- both connections shown, 3:2 already
// "Studied" because the reader visited Explore this session (which is what
// legitimately warms the page's own per-surah cache Connected reads from,
// without Connected ever fetching a chunk of its own -- see
// studiedStatusForConnectedAyah()'s own comment).
// =============================================================================
for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 800 }]) {
  for (const lang of ["en", "bn"]) {
    const label = `${lang} ${viewport.width}px`;
    console.log(`\n=== Connected āyāt, ${label} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport, extraSeedJs: SEED });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

    await goToSurah2Ayah255(page);
    const rawBeforeCard = await page.evaluate(() => window.__fsLog || []);
    check(`${label} I9: no Note-Foundation collection is read before the card opens`,
      noteFoundationReads(rawBeforeCard).length === 0, JSON.stringify(rawBeforeCard.map((r) => r.col)));

    // Warm the per-surah cache for surah 3 the same way a real reader would
    // -- by visiting Explore, which loads every surah's own records chunk
    // once per "open" (an existing, accepted cost, not something this
    // feature itself triggers).
    await page.click("#tabExploreBtn");
    await page.waitForTimeout(2000);
    await goToSurah2Ayah255(page);

    await page.click('#readView [data-ayah-num-badge="2:255"]');
    const loading = await page.evaluate(() => document.querySelector("[data-ayah-sheet-connected]")?.textContent ?? "");
    check(`${label} the Connected block exists as soon as the card opens`, loading.length > 0);
    await page.waitForFunction(
      () => document.querySelectorAll('[data-ayah-sheet-connected] [data-ayah-related-jump]').length >= 2,
      null, { timeout: 8000 },
    ).catch(() => {});

    const state = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-ayah-sheet-connected] [data-ayah-related-jump]')];
      const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const contrast = (el) => { const cs = getComputedStyle(el); const a = lum(cs.color), b = lum(cs.backgroundColor); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const studiedContrast = (el) => { const cs = getComputedStyle(el); const a = lum(cs.color); const bg = getComputedStyle(el.closest(".ayah-related-item")).backgroundColor; const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      return {
        rows: rows.map((r) => ({
          key: r.dataset.ayahRelatedJump,
          why: r.querySelector(".ayah-related-why")?.textContent ?? "",
          studied: r.querySelector(".ayah-connected-studied")?.textContent ?? "",
          studiedClass: r.querySelector(".ayah-connected-studied")?.className ?? "",
        })),
        minH: rows.length ? Math.min(...rows.map((r) => r.getBoundingClientRect().height)) : null,
        minContrast: rows.length ? Math.min(...rows.map(contrast)) : null,
        minStudiedContrast: rows.length ? Math.min(...rows.map(studiedContrast)) : null,
        sw: document.documentElement.scrollWidth - innerWidth,
      };
    });

    const viaNote = state.rows.find((r) => r.key === "2:256");
    const viaFolder = state.rows.find((r) => r.key === "3:2");
    check(`${label} 2:256 appears, via the shared Note, naming its title`, !!viaNote && new RegExp(NOTE_TITLE).test(viaNote.why), JSON.stringify(viaNote));
    check(`${label} 3:2 appears, via the shared folder, naming its name`, !!viaFolder && new RegExp(FOLDER_LABEL).test(viaFolder.why), JSON.stringify(viaFolder));
    check(`${label} 3:2 is marked Studied (its seeded claimed Approach, read from the warmed cache)`,
      !!viaFolder && viaFolder.studiedClass.includes("is-studied"), JSON.stringify(viaFolder));
    check(`${label} 2:256 is marked Not studied yet (same surah as the card, no claim seeded)`,
      !!viaNote && viaNote.studiedClass.includes("is-not-studied"), JSON.stringify(viaNote));
    check(`${label} every connected row is a real tap target (>= 40px tall)`, state.minH >= 40, String(state.minH));
    check(`${label} every connected row is readable (contrast >= 4.5:1)`, state.minContrast >= 4.5, state.minContrast?.toFixed(2));
    check(`${label} the studied marker text is readable against the row (contrast >= 4.5:1)`, state.minStudiedContrast >= 4.5, state.minStudiedContrast?.toFixed(2));
    check(`${label} no sideways scroll with the card open`, state.sw <= 1, `${state.sw}px`);

    await page.click('[data-ayah-related-jump="3:2"]');
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({
      open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
      surah: document.getElementById("surahSelect")?.value,
      ayah: document.getElementById("ayahSelect")?.value,
    }));
    check(`${label} tapping 3:2 closes the card and jumps to Surah 3, āyah 2`, !after.open && after.surah === "3" && after.ayah === "2", JSON.stringify(after));

    const real = errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e));
    check(`${label} no page errors`, real.length === 0, real.join(" | "));
    await ctx.close();
  }
}

// =============================================================================
// Scenario B: a FRESH session that never visits Explore -- 3:2's surah is
// never in memory, so the same seeded claim reads "Not checked", not
// guessed either way.
// =============================================================================
{
  const label = "en 390px, fresh session";
  console.log(`\n=== Connected āyāt -- "not checked" without a warmed cache, ${label} ===`);
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await goToSurah2Ayah255(page);
  await page.click('#readView [data-ayah-num-badge="2:255"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-ayah-sheet-connected] [data-ayah-related-jump]').length >= 2,
    null, { timeout: 8000 },
  ).catch(() => {});
  const row = await page.evaluate(() => {
    const r = [...document.querySelectorAll('[data-ayah-sheet-connected] [data-ayah-related-jump]')].find((el) => el.dataset.ayahRelatedJump === "3:2");
    return r ? { studied: r.querySelector(".ayah-connected-studied")?.textContent, studiedClass: r.querySelector(".ayah-connected-studied")?.className } : null;
  });
  check(`${label} 3:2 reads "Not checked" -- its surah's records were never loaded this session`,
    !!row && row.studiedClass.includes("is-unchecked"), JSON.stringify(row));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Ayah Card Connected āyāt, browser (issue #318): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
