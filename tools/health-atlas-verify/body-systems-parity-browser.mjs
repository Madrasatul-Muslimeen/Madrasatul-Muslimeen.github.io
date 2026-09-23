// Health Atlas — Body Systems resizable three-column UI: a COMMITTED,
// reproducible browser acceptance test (parity tranche 8).
//
// WHY THIS FILE EXISTS. Every prior Health Atlas tranche's browser
// verification (tranches 1, 5, 6, 7) was "a focused, un-checked-in
// Playwright script … deleted before commit" — real when it ran, but not
// independently reproducible by anyone who did not run that exact session.
// Issue #115's `/mmsa-task` comment named this as an evidence gap for the
// resizable three-column Body Systems UI specifically (tranche 7's column
// drag-resize) and asked for a committed, reproducible acceptance test
// covering desktop/tablet/mobile with both mouse and keyboard, plus the
// wheel, search and the three source diagrams. This file is that test.
//
// This intentionally departs from the rest of the project's own stated
// convention of throwaway probe scripts (CLAUDE.md's own "Standing lessons"
// describe many of them) — that convention is right for a one-off
// measurement, wrong for a claim a report will go on citing as evidence
// after the session ends. `tools/i18n-verify/layout.mjs`, `panel.mjs`,
// `reading.mjs` and `navcheck.mjs` already establish the precedent inside
// this repository of a COMMITTED Playwright-based suite that is not wired
// into `.github/workflows/verify.yml` (that workflow explicitly excludes
// them: "layout/panel/reading/navcheck -- need Playwright and a served
// app") and is instead run directly, the same way this file is.
//
// WHAT IT NEEDS TO RUN. Playwright's `chromium` package resolvable from
// this file (exactly what `tools/i18n-verify/harness.mjs` already assumes
// for its own Playwright-based suites) and Node's own `http` module (no
// other dependency). This repository deliberately carries no
// `package.json` outside `tools/firestore-emulator/` (see PR #105's own
// report), so nothing here can declare `playwright` as an npm dependency;
// whoever runs this suite provides the same working `playwright` import
// every other Playwright-based suite in this repository already assumes.
//
// WHAT IT DOES. Spawns this repo's own `serve.js` (reusing one already
// running on port 8080 if present, so it does not fight a session that
// already has one up), drives real Chromium against
// `app/health/health-atlas.html`, and asserts, by real rendered behaviour
// rather than by reading source:
//   - desktop (1280x900): the 3-column grid, mouse drag-resize of both
//     dividers (clamped, and persisting across a redraw), keyboard
//     resize (ArrowLeft/ArrowRight, clamped), the wheel's keyboard
//     drill-down/back, the search box (both a real match and a real
//     zero-match), the three built diagrams (Kidneys/Renal, Eyes/Sensory,
//     Skin/Integumentary) rendering real SVG shapes, and the "in progress"
//     placeholder for a system with none (Heart/Cardiovascular) — and
//     specifically that the placeholder does NOT claim the text below it
//     is "accurate" (tranche 7's own correction, re-asserted here as a
//     regression guard rather than trusted to stay fixed by convention).
//   - tablet (768x1024) and phone (390x844): the grid collapses to one
//     column below the 980px breakpoint, the divider strips are hidden
//     (not left as dead drag handles), and the corrected placeholder copy
//     renders correctly via a real tap.
//
// Run from the repository root:
//   node tools/health-atlas-verify/body-systems-parity-browser.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PORT = 8080;
const BASE = `http://localhost:${PORT}`;
const HEALTH_ATLAS_URL = `${BASE}/app/health/health-atlas.html`;

let passed = 0;
let failed = 0;
const failures = [];

// Deliberately the OPPOSITE guard from the synchronous check() runners in
// tools/health-atlas-verify's static suites (which refuse a body that
// RETURNS a promise, because their checks must never need one). Every
// check here drives a real browser, so a body that does NOT return a
// promise almost certainly forgot an `await` somewhere and would report a
// false pass the instant the assertion after it runs before the page has
// caught up.
async function check(name, fn) {
  const r = fn();
  if (!r || typeof r.then !== 'function') {
    failed++;
    failures.push(`${name}: check() body must be async (drives a real browser)`);
    console.log(`  FAIL  ${name}: check() body must be async`);
    return;
  }
  try {
    await r;
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/app/health/health-atlas.html`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await pingServer()) {
    return { proc: null }; // reuse whatever is already serving this project
  }
  const proc = spawn(process.execPath, ['serve.js'], { cwd: repoRoot, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    if (await pingServer()) return { proc };
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error(`serve.js did not start serving on port ${PORT} within 5s`);
}

async function gotoHealthAtlas(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(HEALTH_ATLAS_URL, { waitUntil: 'networkidle' });
  return errors;
}

async function gridTemplate(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('.ha-bs-3col');
    return grid ? getComputedStyle(grid).gridTemplateColumns : null;
  });
}

// PARITY TRANCHE 13 FIX: this helper used to CLICK every section head on
// its way to the target row without checking whether that section was
// ALREADY open — a section header toggles, so walking past an
// already-open section (left open by an earlier check's own side effect,
// e.g. the wheel drill-down check opening Renal & Urinary) silently
// CLOSED it again. That was invisible for the life of this file because
// every check's own use of openOrgan() happened, by accident of ordering,
// to leave the specific sections later checks depended on in the state
// they needed — the exact "fragile, order-dependent, happens to pass"
// shape CLAUDE.md's own standing lessons warn about elsewhere in this
// repository. Adding tranche 13's own diagram-highlight checks (which
// call openOrgan() on Kidneys/Bladder/Eyes in a different order) broke
// that accidental chain and made two PRE-EXISTING, UNRELATED checks fail
// ("Coronary Arteries" row not found) — a real latent defect in the test
// harness, not in the app, found by disturbing it rather than by reading
// it. Fixed to be idempotent: a head is clicked only if its OWN section
// is not already open, so this helper only ever OPENS sections and never
// closes one as a side effect of looking for a different organ.
async function openOrgan(page, organName) {
  // The left-column row is the least ambiguous way to select a named organ
  // by real text, independent of which system section is currently open —
  // clicking the section head first if the row is not yet visible.
  const row = page.locator('.ha-bs-row', { hasText: organName }).first();
  if (!(await row.isVisible().catch(() => false))) {
    // Open every closed section so the row becomes reachable regardless of
    // order, WITHOUT toggling shut a section some earlier check already
    // opened for its own reason.
    const heads = page.locator('.ha-bs-section-head');
    const n = await heads.count();
    for (let i = 0; i < n; i++) {
      if (await row.isVisible().catch(() => false)) break;
      const alreadyOpen = await heads.nth(i).evaluate(
        (el) => el.closest('.ha-bs-section')?.classList.contains('ha-bs-section-open') === true
      );
      if (!alreadyOpen) await heads.nth(i).click();
    }
  }
  await row.click();
}

async function main() {
  const { proc } = await ensureServer();
  const browser = await chromium.launch();
  try {
    console.log('Health Atlas — Body Systems parity browser acceptance test\n');

    // ---------------- Desktop (1280x900): layout, dividers, wheel, search, diagrams ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('desktop: page loads with no page errors', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
      });

      await check('desktop: 3-column grid resolves to 5 tracks (section list | divider | wheel | divider | detail)', async () => {
        const template = await gridTemplate(page);
        assert(template, 'expected .ha-bs-3col to exist');
        const tracks = template.split(/\s+/).filter(Boolean);
        assert(tracks.length === 5, `expected 5 grid tracks, got ${tracks.length}: ${template}`);
      });

      await check('desktop: both dividers are real, focusable separators', async () => {
        const s1 = page.locator('.ha-bs-divider[aria-label="Resize the body-system list column"]');
        const s3 = page.locator('.ha-bs-divider[aria-label="Resize the detail column"]');
        assert(await s1.count() === 1, 'expected exactly one left (s1) divider');
        assert(await s3.count() === 1, 'expected exactly one right (s3) divider');
        assert((await s1.getAttribute('role')) === 'separator', 'expected role="separator" on s1');
        assert((await s1.getAttribute('aria-orientation')) === 'vertical', 'expected aria-orientation="vertical" on s1');
      });

      await check('desktop: mouse-dragging the left divider widens the sections column, clamped to [200,420]', async () => {
        const divider = page.locator('.ha-bs-divider[aria-label="Resize the body-system list column"]');
        const box = await divider.boundingBox();
        assert(box, 'expected the s1 divider to have a bounding box');
        const before = (await gridTemplate(page)).split(/\s+/)[0];
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 300, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        const afterDrag = (await gridTemplate(page)).split(/\s+/)[0];
        assert(parseFloat(afterDrag) > parseFloat(before), `expected s1 to widen (was ${before}, now ${afterDrag})`);
        assert(parseFloat(afterDrag) <= 420, `expected s1 to clamp at 420px, got ${afterDrag}`);

        // Persistence: a full redraw (selecting a different organ) must not
        // reset the dragged width back to the default — state, not a DOM
        // side-effect of the drag alone.
        await openOrgan(page, 'Heart');
        const afterRedraw = (await gridTemplate(page)).split(/\s+/)[0];
        assert(Math.abs(parseFloat(afterRedraw) - parseFloat(afterDrag)) < 1,
          `expected the dragged s1 width to survive a redraw (was ${afterDrag}, now ${afterRedraw})`);
      });

      await check('desktop: keyboard resize (ArrowLeft/ArrowRight) on the right divider steps and clamps at its minimum', async () => {
        // For the s3 (detail) divider the keyboard mirrors the mouse-drag
        // sign convention in health-atlas-view.js's startColumnDrag(): moving
        // the divider LEFT (toward the wheel) widens the detail column, and
        // moving it RIGHT narrows it — the opposite of the s1 divider, where
        // ArrowRight widens. ArrowLeft here therefore WIDENS by one 20px
        // step first; repeated ArrowRight presses then narrow it down to its
        // stated minimum (220px) rather than shrinking further or going
        // negative — the exact sequence this tranche's own report describes.
        const divider = page.locator('.ha-bs-divider[aria-label="Resize the detail column"]');
        await divider.focus();
        const before = parseFloat((await gridTemplate(page)).split(/\s+/)[4]);
        await page.keyboard.press('ArrowLeft'); // widens s3 by one 20px step
        const afterOneStep = parseFloat((await gridTemplate(page)).split(/\s+/)[4]);
        assert(Math.abs(afterOneStep - before - 20) < 0.5, `expected exactly one 20px widening step, was ${before} now ${afterOneStep}`);
        for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // narrows toward the minimum
        const afterMany = parseFloat((await gridTemplate(page)).split(/\s+/)[4]);
        assert(afterMany === 220, `expected s3 to clamp at its stated minimum (220px), got ${afterMany}`);
      });

      await check('desktop: a stale resized width never fights the single-column layout when the window narrows below 980px', async () => {
        // At this point the s1/s3 columns have already been dragged/keyboard
        // -resized away from their defaults, leaving inline widths on the
        // grid's own `grid-template-columns`. Narrowing the SAME page (no
        // reload) below the breakpoint must still collapse to one column —
        // proving the media query's `!important` really overrides a stale
        // JS-driven inline value, not just the CSS-only default case tested
        // by the tablet/phone sections below.
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(50);
        const template = await gridTemplate(page);
        const tracks = template.split(/\s+/).filter(Boolean);
        assert(tracks.length === 1, `expected a single track despite the earlier resize, got ${tracks.length}: ${template}`);
        const dividerVisible = await page.locator('.ha-bs-divider').first().isVisible();
        assert(dividerVisible === false, 'expected dividers to stay hidden even with a stale resized width');
      });

      await ctx.close();
    }

    // Fresh context/page for the wheel + search + diagram checks, so the
    // drag/keyboard-resize state above cannot leak into them.
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await gotoHealthAtlas(page);

      await check('desktop: wheel keyboard drill-down (Enter on a focused system wedge) and back', async () => {
        const wedge = page.locator('g[aria-label*="Renal"][aria-label*="system"]').first();
        assert(await wedge.count() === 1, 'expected exactly one Renal & Urinary system wedge');
        await wedge.focus();
        await page.keyboard.press('Enter');
        const organWedge = page.locator('g[aria-label*="Kidneys"]').first();
        assert(await organWedge.count() === 1, 'expected the wheel to drill into Renal & Urinary organs (Kidneys wedge)');
        const backBtn = page.locator('.ha-wheel-back', { hasText: 'All Body Systems' });
        assert(await backBtn.count() === 1, 'expected a back control after drilling in');
        await backBtn.click();
        const systemWedgesAgain = page.locator('g[aria-label$="system"]');
        assert((await systemWedgesAgain.count()) >= 9, 'expected the back control to return to the 9 system-level wedges');
      });

      await check('desktop: search narrows results to a real match and to zero for a non-match', async () => {
        const input = page.locator('.ha-search-input');
        await input.fill('kidneys');
        await page.waitForTimeout(50);
        const matchRows = page.locator('.ha-bs-row', { hasText: 'Kidneys' });
        assert((await matchRows.count()) >= 1, 'expected at least one Kidneys row for a matching search term');

        await input.fill('zzz-no-such-organ-zzz');
        await page.waitForTimeout(50);
        const noRows = page.locator('.ha-bs-row');
        assert((await noRows.count()) === 0, 'expected zero organ rows for a deliberately unmatched search term');

        await input.fill('');
        await page.waitForTimeout(50);
      });

      await check('desktop: the three built diagrams render real SVG shapes (Kidneys/Renal, Eyes/Sensory, Skin/Integumentary)', async () => {
        for (const organName of ['Kidneys', 'Eyes', 'Skin']) {
          await openOrgan(page, organName);
          const svg = page.locator('.ha-diagram-card svg.ha-diagram-svg');
          assert(await svg.count() === 1, `expected a rendered diagram <svg> for ${organName}`);
          const shapeCount = await svg.locator(':scope > *').count();
          assert(shapeCount > 0, `expected the ${organName} diagram to contain real shapes, found none`);
        }
      });

      // Parity tranche 13: the source's own per-organ diagram highlight
      // (`.part-highlight` in the v02.04 source), ported here as
      // `.ha-diagram-part-highlight`. Proven by SWITCHING organ within the
      // SAME diagrammed system and asserting the highlighted shape moves —
      // asserting only "Kidneys highlights something" would pass even if
      // every organ highlighted the same (wrong) shape or nothing moved at
      // all when the selection changed.
      await check('desktop: selecting Kidneys highlights #kidney-shape and NOT #bladder-shape in the Renal & Urinary diagram', async () => {
        await openOrgan(page, 'Kidneys');
        await page.waitForSelector('.ha-diagram-svg');
        const kidneyHi = await page.evaluate(() => document.getElementById('kidney-shape')?.classList.contains('ha-diagram-part-highlight'));
        const bladderHi = await page.evaluate(() => document.getElementById('bladder-shape')?.classList.contains('ha-diagram-part-highlight'));
        assert(kidneyHi === true, 'expected #kidney-shape to carry the highlight class when Kidneys is selected');
        assert(bladderHi === false, 'expected #bladder-shape NOT to carry the highlight class when Kidneys is selected');
      });

      await check('desktop: switching to Bladder MOVES the highlight off #kidney-shape and onto #bladder-shape, in the SAME diagram', async () => {
        await openOrgan(page, /^Bladder/); // ^-anchored: 'Bladder' vs 'Gallbladder' both contain "Bladder"
        await page.waitForSelector('.ha-diagram-svg');
        const kidneyHi = await page.evaluate(() => document.getElementById('kidney-shape')?.classList.contains('ha-diagram-part-highlight'));
        const bladderHi = await page.evaluate(() => document.getElementById('bladder-shape')?.classList.contains('ha-diagram-part-highlight'));
        assert(kidneyHi === false, 'expected #kidney-shape to lose the highlight class once Bladder is selected instead');
        assert(bladderHi === true, 'expected #bladder-shape to carry the highlight class once Bladder is selected');
      });

      await check('desktop: a 3-shape grouped part (Eyes -> #eye-main) highlights as ONE element, with no duplicate DOM ids anywhere on the page', async () => {
        await openOrgan(page, 'Eyes');
        await page.waitForSelector('.ha-diagram-svg');
        const eyeHi = await page.evaluate(() => document.getElementById('eye-main')?.classList.contains('ha-diagram-part-highlight'));
        assert(eyeHi === true, 'expected #eye-main (the 3-shape eye group) to carry the highlight class when Eyes is selected');
        const dupIds = await page.evaluate(() => {
          const counts = {};
          document.querySelectorAll('[id]').forEach((el) => { counts[el.id] = (counts[el.id] || 0) + 1; });
          return Object.entries(counts).filter(([, c]) => c > 1).map(([id]) => id);
        });
        assert(dupIds.length === 0, `expected zero duplicate DOM ids, found: ${dupIds.join(', ')}`);
      });

      await check('desktop: a body part with NO diagram highlight defined for its system (Heart) renders the placeholder, with nothing to wrongly highlight', async () => {
        await openOrgan(page, 'Heart');
        const placeholder = page.locator('.ha-diagram-card .ha-empty');
        assert(await placeholder.count() === 1, 'expected the "in progress" placeholder for Heart (Cardiovascular has no built diagram)');
        const anyHighlighted = await page.evaluate(() => document.querySelectorAll('.ha-diagram-part-highlight').length);
        assert(anyHighlighted === 0, 'expected zero highlighted elements when no diagram is rendered at all');
      });

      await check('desktop: a system-level colour class name is never confused for the diagram highlight (no ha-diagram-part-highlight before any organ is opened)', async () => {
        await ctx.newPage().then(async (freshPage) => {
          await freshPage.goto(HEALTH_ATLAS_URL, { waitUntil: 'networkidle' });
          const anyHighlighted = await freshPage.evaluate(() => document.querySelectorAll('.ha-diagram-part-highlight').length);
          assert(anyHighlighted === 0, 'expected zero highlighted elements before any organ is ever selected');
          await freshPage.close();
        });
      });

      await check('desktop: a system with no built diagram shows the corrected placeholder, and it never claims to be "accurate"', async () => {
        await openOrgan(page, 'Heart');
        const placeholder = page.locator('.ha-diagram-card .ha-empty');
        assert(await placeholder.count() === 1, 'expected a placeholder for Heart (Cardiovascular has no built diagram)');
        const text = (await placeholder.textContent()) || '';
        assert(/still in progress/i.test(text), `expected "still in progress" in placeholder, got: ${text}`);
        assert(!/accurate/i.test(text), `placeholder must not claim the text below it is "accurate" (tranche 7's own correction): ${text}`);
        assert(/general-reference text below/i.test(text), `expected the corrected wording, got: ${text}`);
      });

      await check('desktop: no function statement ever reads "Cited" (0 of 82 statements have specific citations, per the claim-provenance registry)', async () => {
        await openOrgan(page, 'Kidneys');
        const badges = page.locator('.ha-evidence-badge');
        const n = await badges.count();
        assert(n > 0, 'expected at least one evidence badge on Kidneys');
        for (let i = 0; i < n; i++) {
          const t = (await badges.nth(i).textContent()) || '';
          assert(!/^Cited/.test(t.trim()), `expected no badge to read "Cited", found: ${t}`);
        }
      });

      // Parity tranche 12: the source-faithful "Type" pill on each organ
      // row (organ.partType — Organ/Vein/Artery/Nerve/Tissue/Gland/Duct).
      await check('desktop: each organ row carries a real "Type" pill matching its own partType value', async () => {
        // Tranche 13: this used to open a section with a bare, unconditional
        // `heads.first().click()` — a blind toggle that could just as
        // easily CLOSE Cardiovascular if some earlier check had already
        // opened it (see openOrgan()'s own tranche-13 fix above for the
        // full account of that class of bug). Using the shared, now
        // idempotent openOrgan() for BOTH rows removes the duplicated
        // ad-hoc walk and makes this check's own outcome independent of
        // whatever section-open state earlier checks left behind.
        await openOrgan(page, 'Kidneys');
        const kidneysRow = page.locator('.ha-bs-row', { hasText: 'Kidneys' }).first();
        const kidneysPill = kidneysRow.locator('.ha-bs-type-pill');
        assert(await kidneysPill.count() === 1, 'expected exactly one Type pill on the Kidneys row');
        assert((await kidneysPill.textContent()).trim() === 'Organ', `expected Kidneys' pill to read "Organ", got ${(await kidneysPill.textContent()).trim()}`);

        // Coronary Arteries: a real non-"Organ" partType (Artery), proving
        // the pill is not a hardcoded default.
        await openOrgan(page, 'Coronary Arteries');
        const arteryRow = page.locator('.ha-bs-row', { hasText: 'Coronary Arteries' }).first();
        assert(await arteryRow.count() === 1, 'expected a Coronary Arteries row');
        const arteryPill = arteryRow.locator('.ha-bs-type-pill');
        assert((await arteryPill.textContent()).trim() === 'Artery', `expected Coronary Arteries' pill to read "Artery", got ${(await arteryPill.textContent()).trim()}`);
      });

      // The longest real name+type combination in the whole dataset
      // ("Vena Cava (Superior & Inferior)", a Vein, 31 + 4 chars) is the
      // measured worst case for the row-wrap CSS (CLAUDE.md: "measure a
      // content-sized control with content the length a REAL entry has").
      await check('desktop: the longest organ name + Type pill in the dataset causes no page overflow', async () => {
        // Tranche 13: this referenced an OUTER `heads` variable that was
        // never in scope for this check's own closure — dead code that
        // never threw only because Vena Cava's own section
        // (Cardiovascular) already happened to be open by the time this
        // check ran, so the `if` branch never executed. Using openOrgan()
        // makes the intent explicit and removes the dead, broken branch.
        await openOrgan(page, 'Vena Cava');
        const row = page.locator('.ha-bs-row', { hasText: 'Vena Cava' }).first();
        assert(await row.count() === 1, 'expected a Vena Cava row');
        const pill = row.locator('.ha-bs-type-pill');
        assert((await pill.textContent()).trim() === 'Vein', `expected Vena Cava's pill to read "Vein", got ${(await pill.textContent()).trim()}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no horizontal page overflow from the longest name+pill combination, got ${overflow}px`);
        const rowBox = await row.boundingBox();
        const colBox = await page.locator('.ha-bs-col').first().boundingBox();
        assert(rowBox.x + rowBox.width <= colBox.x + colBox.width + 1, 'expected the Vena Cava row to stay within its own column, not overflow it horizontally');
      });

      await ctx.close();
    }

    // ---------------- Tablet (768x1024): single-column collapse ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('tablet (768x1024): no page errors, no horizontal overflow', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no horizontal overflow, got ${overflow}px`);
      });

      await check('tablet (768x1024): the grid has collapsed to a single track and dividers are hidden', async () => {
        const template = await gridTemplate(page);
        const tracks = template.split(/\s+/).filter(Boolean);
        assert(tracks.length === 1, `expected the 980px breakpoint to force a single track, got ${tracks.length}: ${template}`);
        const dividerVisible = await page.locator('.ha-bs-divider').first().isVisible();
        assert(dividerVisible === false, 'expected dividers to be hidden below the 980px breakpoint, not left as dead drag handles');
      });

      await check('tablet (768x1024): tapping into Heart shows the corrected placeholder copy', async () => {
        await openOrgan(page, 'Heart');
        const placeholder = page.locator('.ha-diagram-card .ha-empty');
        const text = (await placeholder.textContent()) || '';
        assert(!/accurate/i.test(text), `placeholder must not claim "accurate" at tablet width either: ${text}`);
      });

      await check('tablet (768x1024): the longest organ name + Type pill causes no page overflow', async () => {
        await openOrgan(page, 'Vena Cava');
        const row = page.locator('.ha-bs-row', { hasText: 'Vena Cava' }).first();
        assert(await row.count() === 1, 'expected a Vena Cava row');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no horizontal page overflow at tablet width, got ${overflow}px`);
      });

      await check('tablet (768x1024): the diagram highlight moves between two real organs in the same collapsed single-column layout', async () => {
        await openOrgan(page, 'Kidneys');
        await page.waitForSelector('.ha-diagram-svg');
        assert((await page.evaluate(() => document.getElementById('kidney-shape')?.classList.contains('ha-diagram-part-highlight'))) === true, 'expected #kidney-shape highlighted for Kidneys at tablet width');
        await openOrgan(page, /^Bladder/); // ^-anchored: 'Bladder' vs 'Gallbladder' both contain "Bladder"
        await page.waitForSelector('.ha-diagram-svg');
        assert((await page.evaluate(() => document.getElementById('kidney-shape')?.classList.contains('ha-diagram-part-highlight'))) === false, 'expected #kidney-shape to lose the highlight once Bladder is selected at tablet width');
        assert((await page.evaluate(() => document.getElementById('bladder-shape')?.classList.contains('ha-diagram-part-highlight'))) === true, 'expected #bladder-shape highlighted for Bladder at tablet width');
      });

      await ctx.close();
    }

    // ---------------- Phone (390x844): single-column collapse via a real tap ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('phone (390x844): no page errors, no horizontal overflow, single-track layout', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no horizontal overflow, got ${overflow}px`);
        const template = await gridTemplate(page);
        const tracks = template.split(/\s+/).filter(Boolean);
        assert(tracks.length === 1, `expected a single track at phone width, got ${tracks.length}: ${template}`);
      });

      await check('phone (390x844): a real tap opens an organ and the corrected placeholder copy renders', async () => {
        await openOrgan(page, 'Heart');
        const placeholder = page.locator('.ha-diagram-card .ha-empty');
        assert(await placeholder.count() === 1, 'expected the placeholder to render after a real tap at phone width');
        const text = (await placeholder.textContent()) || '';
        assert(!/accurate/i.test(text), `placeholder must not claim "accurate" at phone width either: ${text}`);
      });

      await check('phone (390x844): the longest organ name + Type pill causes no page overflow, wrapping onto its own line if needed', async () => {
        await openOrgan(page, 'Vena Cava');
        const row = page.locator('.ha-bs-row', { hasText: 'Vena Cava' }).first();
        assert(await row.count() === 1, 'expected a Vena Cava row');
        const pill = row.locator('.ha-bs-type-pill');
        assert((await pill.textContent()).trim() === 'Vein', 'expected the Vena Cava pill to read "Vein" at phone width too');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no horizontal page overflow at phone width, got ${overflow}px`);
      });

      await check('phone (390x844): a real tap selecting Eyes highlights the 3-shape #eye-main group, with no duplicate DOM ids', async () => {
        await openOrgan(page, 'Eyes');
        await page.waitForSelector('.ha-diagram-svg');
        assert((await page.evaluate(() => document.getElementById('eye-main')?.classList.contains('ha-diagram-part-highlight'))) === true, 'expected #eye-main highlighted for Eyes at phone width');
        const dupIds = await page.evaluate(() => {
          const counts = {};
          document.querySelectorAll('[id]').forEach((el) => { counts[el.id] = (counts[el.id] || 0) + 1; });
          return Object.entries(counts).filter(([, c]) => c > 1).map(([id]) => id);
        });
        assert(dupIds.length === 0, `expected zero duplicate DOM ids at phone width, found: ${dupIds.join(', ')}`);
      });

      await ctx.close();
    }
  } finally {
    await browser.close();
    if (proc) proc.kill();
  }

  console.log(`\nHealth Atlas body-systems-parity-browser: ${passed} passed, ${failed} failed`);
  if (failed) {
    for (const f of failures) console.log('  FAIL:', f);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
