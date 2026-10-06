// The Owner, 5 Oct 2026: "Put a distinctive mark on each bookmark. Also put the date and time of the last act after
// each bookmark. Keep an option to show/hide timing." and "Place a back button to go where bookmark is clicked from".
// The Bookmark menu: 🔖 on every bookmark, the last-act time after its name, 🕘 shows / hides the times (per device).
// Opening a bookmark stamps usedAt.<id> on the bookmarks document and the page it opens shows "← Back to <page>" once.
// The Manage bookmarks page does the same for its rows and its Open buttons. en/bn at 390 and 1280.
// Run from the repository root with `node serve.js` running.
//   --mutate=no-mark    the 🔖 is not drawn                 -> the mark checks fail
//   --mutate=no-times   the 🕘 button does nothing          -> the hide checks fail
//   --mutate=no-stamp   opening does not stamp usedAt        -> the stamp checks fail
//   --mutate=no-back    the Back row is never mounted        -> the Back checks fail
//   --mutate=no-aside   the chip no longer steps aside       -> the Word Card check fails
//   --mutate=raw-label  the page name is the heading's whole text -> the name check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const js = "text/javascript; charset=utf-8";
  const f = "app/js/bookmark-nav.js";
  let body = fs.readFileSync(f, "utf8");
  if (MUTATE === "no-mark") body = swap(body, '<span class="nav-bm-mark" aria-hidden="true">🔖</span><span class="nav-bm-name">', '<span class="nav-bm-name">');
  else if (MUTATE === "no-times") body = swap(body, "      setBookmarkTimesShown(!getBookmarkTimesShown());\n", "");
  else if (MUTATE === "no-stamp") body = swap(body, "const write = markBookmarkUsed(db, tenantId, personId, bookmarkId)", "const write = Promise.resolve()");
  else if (MUTATE === "no-back") body = swap(body, "  mountBookmarkBack(navBarEl);\n", "");
  else if (MUTATE === "no-aside") body = swap(body, "    row.style.display = covered ? \"none\" : \"\";\n", "");
  else if (MUTATE === "raw-label") body = swap(body, "  return (copy.textContent || \"\")", "  return (h1.textContent || \"\")");
  else throw new Error(`unknown mutation ${MUTATE}`);
  await ctx.route("**/js/bookmark-nav.js", (r) => r.fulfill({ status: 200, contentType: js, body }));
}

const SEED = `DATA.bookmarks[0].usedAt = { bm1: "2026-10-04T09:30:00.000Z" };`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  const { page: P, errors } = await openPage(ctx, "/app/about.html");
  P.on("dialog", (d) => d.dismiss().catch(() => {}));
  const openSheet = async () => {
    await P.evaluate(() => { const d = document.querySelector(".nav-cat-bookmark"); if (d.open) d.open = false; });
    await P.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
    await P.waitForFunction(() => !!document.querySelector("#navBookmarkList [data-bm-nav-times]"), null, { timeout: 10000 }).catch(() => {});
    await P.waitForTimeout(150);
  };
  const row = "#navBookmarkList a[data-bm-open-id='bm1']";
  await openSheet();
  check(`${tag}: the bookmark carries the 🔖 mark`, await P.evaluate((s) => document.querySelector(s)?.querySelector(".nav-bm-mark")?.textContent === "🔖", row));
  const when = await P.evaluate((s) => document.querySelector(s)?.querySelector("[data-bm-when]")?.textContent ?? "", row);
  check(`${tag}: after its name, the date and time it was last opened`, lang === "bn" ? /২০২৬/.test(when) && /[০-৯]{2}:[০-৯]{2}/.test(when) : /2026/.test(when) && /Oct/.test(when) && /\d:\d\d/.test(when), when);
  check(`${tag}: the time sits after the name, on the row`, await P.evaluate((s) => { const a = document.querySelector(s); const n = a.querySelector(".nav-bm-name").getBoundingClientRect(), w = a.querySelector("[data-bm-when]").getBoundingClientRect(), r = a.getBoundingClientRect(); return (w.left >= n.right - 1 || w.top >= n.bottom - 1) && w.right <= r.right + 1; }, row));
  const ctl = await P.evaluate(() => { const b = document.querySelector("[data-bm-nav-times]"), l = document.getElementById("navBookmarkList").getBoundingClientRect(), r = b.getBoundingClientRect(); return { text: b.textContent.trim(), pressed: b.getAttribute("aria-pressed"), inside: r.left >= l.left - 1 && r.right <= l.right + 1, h: r.height, overflow: [...document.querySelectorAll(".nav-bm-controls > *")].some((x) => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== "hidden") }; });
  check(`${tag}: the 🕘 button says what it does, inside the menu`, ctl.text.startsWith("🕘") && ctl.pressed === "true" && ctl.inside, JSON.stringify(ctl));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/bm-${tag.replace("/", "-")}-menu.png` });
  await P.click("[data-bm-nav-times]");
  await P.waitForTimeout(150);
  check(`${tag}: 🕘 hides the times`, (await P.$$("#navBookmarkList [data-bm-when]")).length === 0 && (await P.getAttribute("[data-bm-nav-times]", "aria-pressed")) === "false");
  check(`${tag}: ...and the menu stayed open`, await P.evaluate(() => document.querySelector(".nav-cat-bookmark").open));
  await openSheet();
  check(`${tag}: hidden times stay hidden when the menu opens again`, (await P.$$("#navBookmarkList [data-bm-when]")).length === 0);
  await P.click("[data-bm-nav-times]");
  await P.waitForTimeout(150);
  check(`${tag}: 🕘 shows them again`, (await P.$$("#navBookmarkList [data-bm-when]")).length >= 1);

  // ---- open it: stamp + Back ----
  await P.evaluate(() => sessionStorage.removeItem("__stubWrites"));
  await Promise.all([P.waitForURL(/quranrevival\.html\?bookmark=bm1/, { timeout: 15000 }).catch(() => {}), P.click(row)]);
  await P.waitForSelector("#navBar, .nav-cat-bookmark", { timeout: 15000 }).catch(() => {});
  await P.waitForTimeout(1200);
  const writes = await P.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  check(`${tag}: opening the bookmark stamps usedAt.bm1, and only that`, writes.some((w) => w.col === "bookmarks" && w.data.includes("usedAt.bm1") && w.data.every((k) => k === "usedAt.bm1" || k === "updatedAt")), JSON.stringify(writes));
  const back = await P.evaluate(() => { const r = document.querySelector("[data-bm-back]"); const a = r?.querySelector("[data-bm-back-link]"); const b = a?.getBoundingClientRect(); return r ? { text: a.textContent, href: a.getAttribute("href"), visible: !!b && b.width > 0 && b.height >= 40, inside: !!b && b.left >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight, top: document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest("[data-bm-back-link]") === a } : null; });
  check(`${tag}: the page it opened shows "← Back to <page>"`, !!back && back.text.startsWith("←") && back.visible && back.inside, JSON.stringify(back));
  check(`${tag}: ...on top of everything (nothing covers it)`, !!back?.top, JSON.stringify(back));
  check(`${tag}: ...and it does not cover the Study / Explore tab bar`, await P.evaluate(() => { const r = document.querySelector("[data-bm-back]")?.getBoundingClientRect(), tb = document.getElementById("tabStudyBtn")?.getBoundingClientRect(); return !!r && (!tb || tb.height === 0 || r.bottom <= tb.top + 1); }));
  check(`${tag}: ...pointing at the page it was opened from`, !!back && /about\.html$/.test(back.href), JSON.stringify(back));
  // The Owner, 6 Oct 2026 (a screenshot: the bubble over the Word Card, reading "← Back to QuranRevival v09.98Search
  // Previewing as:…"): (1) a page's name is its heading's own words, never its version, buttons or preview note; (2) a
  // sheet that fills the screen (the Word Card) is not a bottom bar -- the chip steps aside and comes back when it closes.
  const label = await P.evaluate(async () => (await import("/app/js/bookmark-nav.js")).pageLabelOf(document));
  check(`${tag}: the Qur'an page's name is just its heading's words ("QuranRevival")`, label === "QuranRevival", JSON.stringify(label));
  const readReach = await P.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!readReach) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(500);
  await P.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForSelector("[data-word-occurrence]", { timeout: 10000 }).catch(() => {});
  await P.locator("[data-word-occurrence]").first().click().catch(() => {});
  await P.waitForSelector(".quran-word-card", { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  const overCard = await P.evaluate(() => {
    const card = document.querySelector(".quran-word-card"), row = document.querySelector("[data-bm-back]");
    if (!card || !row) return { card: !!card, row: !!row };
    const r = row.getBoundingClientRect(), shown = getComputedStyle(row).display !== "none" && r.width > 0;
    // The whole card, not just its header: where the card does not fill the screen (a PC), the chip may stay at the
    // bottom, as long as it covers no part of the card.
    const c = card.getBoundingClientRect();
    const overlaps = shown && !(r.bottom <= c.top || r.top >= c.bottom || r.right <= c.left || r.left >= c.right);
    return { card: true, row: true, shown, overlaps, rowTop: Math.round(r.top) };
  });
  check(`${tag}: with the Word Card open, the Back bubble does not sit over the card`, overCard.card && overCard.row && !overCard.overlaps, JSON.stringify(overCard));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/bm-${tag.replace("/", "-")}-wordcard.png` });
  await P.click(".quran-word-card [data-word-card-close]").catch(() => {});
  await P.waitForTimeout(400);
  const after = await P.evaluate(() => { const row = document.querySelector("[data-bm-back]"), r = row?.getBoundingClientRect(); return { shown: !!row && getComputedStyle(row).display !== "none" && r.width > 0, low: !!r && r.top > innerHeight * 0.5 }; });
  check(`${tag}: ...and it comes back, at the bottom, when the card closes`, after.shown && after.low, JSON.stringify(after));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/bm-${tag.replace("/", "-")}-back.png` });
  if (back) { await Promise.all([P.waitForURL(/about\.html$/, { timeout: 15000 }).catch(() => {}), P.click("[data-bm-back-link]")]); }
  check(`${tag}: Back goes there`, /about\.html$/.test(P.url()), P.url());
  check(`${tag}: no Back row on the page it came back to`, !(await P.$("[data-bm-back]")));

  // ---- the Manage bookmarks page ----
  await P.goto(`${new URL(P.url()).origin}/app/bookmarks.html`);
  await P.waitForSelector(".bm-row[data-bm-id='bm1']", { timeout: 15000 }).catch(() => {});
  const mrow = await P.evaluate(() => { const r = document.querySelector(".bm-row[data-bm-id='bm1']"); return r ? { mark: r.querySelector(".nav-bm-mark")?.textContent, when: r.querySelector("[data-bm-when]")?.textContent ?? "" } : null; });
  check(`${tag}: Manage bookmarks: 🔖 and the time on the row`, mrow?.mark === "🔖" && mrow.when.length > 5, JSON.stringify(mrow));
  await P.evaluate(() => sessionStorage.removeItem("__stubWrites"));
  await Promise.all([P.waitForURL(/quranrevival\.html\?bookmark=bm1/, { timeout: 15000 }).catch(() => {}), P.click(".bm-row[data-bm-id='bm1'] a[data-bm-open-id] button")]);
  await P.waitForTimeout(1500);
  const w2 = await P.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  check(`${tag}: Manage bookmarks: Open stamps it too`, w2.some((w) => w.col === "bookmarks" && w.data.includes("usedAt.bm1")), JSON.stringify(w2));
  const back2 = await P.evaluate(() => document.querySelector("[data-bm-back-link]")?.getAttribute("href") ?? "");
  check(`${tag}: ...and the Back button leads to Manage bookmarks`, /bookmarks\.html$/.test(back2), back2);
  await P.reload();
  await P.waitForTimeout(1500);
  check(`${tag}: the Back button shows once (not again after a reload)`, !(await P.$("[data-bm-back]")));
  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
