// The Owner's report, 26 Sep 2026: "Renaming/editing AU categories/group only
// works for 'Group' even after selecting from other drop-down."
//
// Cause: choosing a classification dropdown's first line (its own name, the
// line already on show) fires no change event, and a classification with no
// lists yet has nothing else to choose -- so it never became current, and
// the ⋯ menu's ✎C / 🗄C / + kept acting on Group. This suite drives the real
// Explore panel:
//   - every classification dropdown offers "▸ Open this classification";
//   - choosing it on "Dual Names" (no lists in the fixture) makes Dual Names
//     current: its dropdown is marked, the ✎C tooltip names it;
//   - ✎C then renames DUAL NAMES (the prompt's default is "Dual Names", the
//     write carries the new title under the dual key) and leaves Group alone;
//   - choosing a list inside a classification still opens that list;
//   - both languages.
// Run from the repository root with serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 1300, height: 900 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  await page.click("#tabExploreBtn");
  await page.waitForTimeout(700);
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => document.querySelectorAll("select[data-asmax-class-select]").length >= 2, null, { timeout: 8000 }).catch(() => {});

  const before = await page.evaluate(() => [...document.querySelectorAll("select[data-asmax-class-select]")].map((s) => ({
    key: s.dataset.asmaxClassSelect, current: s.classList.contains("asmax-class-current"),
    title: s.options[0]?.text, hasOpen: [...s.options].some((o) => o.value === "__open__"),
  })));
  check(`${lang} every classification dropdown offers "Open this classification"`, before.length >= 2 && before.every((s) => s.hasOpen), JSON.stringify(before));
  check(`${lang} Group is the current classification on arrival, and marked`, before.find((s) => s.key === "group")?.current === true && before.filter((s) => s.current).length === 1, JSON.stringify(before));
  const groupTitle = before.find((s) => s.key === "group")?.title;
  const dualTitle = before.find((s) => s.key === "dual")?.title;

  // Open "Dual Names" -- which has no lists in the fixture, the exact case
  // that could never become current before.
  await page.selectOption('select[data-asmax-class-select="dual"]', "__open__");
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    marked: [...document.querySelectorAll("select[data-asmax-class-select].asmax-class-current")].map((s) => s.dataset.asmaxClassSelect),
    renameTitle: document.getElementById("asmaXRenameClassBtn")?.title,
  }));
  check(`${lang} choosing "Open this classification" on Dual Names makes it current (marked)`, after.marked.length === 1 && after.marked[0] === "dual", JSON.stringify(after.marked));
  check(`${lang} the ✎C button now names Dual Names`, (after.renameTitle ?? "").includes(dualTitle), after.renameTitle);

  // ✎C: the prompt must be about Dual Names, and the rename must land on it.
  const newName = lang === "bn" ? "যুগল নাম (পরীক্ষা)" : "Paired Names (test)";
  let promptDefault = null;
  page.once("dialog", async (d) => { promptDefault = d.defaultValue(); await d.accept(newName); });
  await page.click("#asmaXPaletteBtn");
  await page.waitForTimeout(200);
  await page.click("#asmaXRenameClassBtn");
  await page.waitForTimeout(800);
  check(`${lang} the rename prompt starts from "${dualTitle}", not "${groupTitle}"`, promptDefault === dualTitle, String(promptDefault));
  const renamed = await page.evaluate(() => [...document.querySelectorAll("select[data-asmax-class-select]")].map((s) => ({ key: s.dataset.asmaxClassSelect, title: s.options[0]?.text })));
  check(`${lang} Dual Names' dropdown now carries the new name`, renamed.find((s) => s.key === "dual")?.title === newName, JSON.stringify(renamed));
  check(`${lang} Group's name is untouched`, renamed.find((s) => s.key === "group")?.title === groupTitle, JSON.stringify(renamed));
  const write = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "asmaCollections").at(-1));
  const classifications = write?.data?.classifications ?? [];
  const writtenDual = classifications.find((c) => c.key === "dual");
  const writtenGroup = classifications.find((c) => c.key === "group");
  check(`${lang} the saved write renames the dual classification and keeps Group's title`,
    JSON.stringify(writtenDual?.title ?? {}).includes(newName) && !JSON.stringify(writtenGroup?.title ?? {}).includes(newName),
    JSON.stringify(classifications.map((c) => ({ key: c.key, title: c.title }))));

  // A list inside a classification still opens that list (the ordinary path).
  const firstGroupList = await page.evaluate(() => [...document.querySelector('select[data-asmax-class-select="group"]').options].find((o) => o.value && o.value !== "__open__")?.value);
  await page.selectOption('select[data-asmax-class-select="group"]', firstGroupList);
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({
    marked: [...document.querySelectorAll("select[data-asmax-class-select].asmax-class-current")].map((s) => s.dataset.asmaxClassSelect),
    value: document.querySelector('select[data-asmax-class-select="group"]').value,
  }));
  check(`${lang} choosing a list in Group makes Group current and opens that list`, back.marked[0] === "group" && back.value === firstGroupList, JSON.stringify(back));
  check(`${lang} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, errors.join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma classification rename (Owner report 26 Sep): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
