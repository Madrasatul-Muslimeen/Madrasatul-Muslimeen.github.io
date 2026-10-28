// PCF MSA J106 round 1 (the Owner, 28 Oct 2026, demo approved 1A 2A 3A 4A): the Hadith Study page -- its menu bar,
// and Hadith Books in three panes (Chapters | the chapter's hadith | the hadith's text), each resizable, expandable and
// able to pop out as a window that moves and resizes from every side and corner; on a phone one pane at a time.
// Checked on the real page, against the real library (Bukhari's own shard file is read here for the expected text):
//   - the menu: Hadith Books goes to the shelf from another view and opens the quick list on Books; Subjects lists
//     the three; Escape closes a list and gives the focus back;
//   - each pane, and the ‹ › steps in the Text pane;
//   - the divider drag (remembered on this device) and its arrow keys; ⤢ expand and ⤡ back; ⧉ pop out, move, resize
//     from a corner and a side, and put back;
//   - a phone: one pane at a time with the Chapters › Hadith › Text buttons, and the breadcrumb back to Chapters;
//   - the jumps, each with its way back (decision 86): "Go to hadith number" (standard and the edition's own), a
//     passage link (?openiti=, as the Asma posters use), a HadeethEnc card's proven reference (J103) with ← Back to
//     the hadith card, and a Dua narration's "Also narrated in" with ← Back to it.
// Run from the repository root, serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name>   serve one deliberate break (below) instead of the real code; the run must FAIL
//   --prove           run every mutation in turn and report which were caught (exits 1 if any was not)
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  booksmenu: ["js/hadith-browser.js", "    if (before && before()) return;\n", ""],
  nostep: ["js/hadith-browser.js", "    b.disabled = !to;", "    b.disabled = true;"],
  rowpick: ["js/hadith-browser.js", "row.addEventListener(\"click\", () => { oi.passageN = h.n; oi.phone = \"text\"; localRefresh(); });", "row.addEventListener(\"click\", () => { oi.phone = \"text\"; localRefresh(); });"],
  phonecrumb: ["js/hadith-browser.js", "  if (!chapter) oi.phone = \"chapters\";\n", ""],
  editionnum: ["js/hadith-browser.js", "      if (byNumber) oi.focusPassage = byNumber.n;", ""],
  nojump: ["js/hadith-browser.js", "    if (jump) { oi.bab = jump.p; oi.passageN = jump.n; oi.phone = \"text\"; }", ""],
  notrail: ["js/hadith-browser.js", "      if (prev.toDua) { oi.trail = []; prev.toDua(); return; }", "      if (prev.toDua) { oi.trail = []; return; }"],
  nosave: ["js/hadith-reader.js", "try { localStorage.setItem(WIDTHS_KEY, JSON.stringify([get(\"--c1\"), get(\"--c2\")])); }", "try { }"],
  nokeys: ["js/hadith-reader.js", "    if (e.key !== \"ArrowLeft\" && e.key !== \"ArrowRight\") return;", "    return;"],
  nomax: ["js/hadith-reader.js", "  if (oi.max) grid.dataset.max = oi.max;", ""],
  nofloat: ["js/hadith-reader.js", "      floatPane(key, pane, oi, localRefresh);", ""],
  nohandles: ["js/hadith-reader.js", "    g.addEventListener(\"pointerdown\", (e) => startDrag(e, h, ctx));", ""],
  nomove: ["js/hadith-reader.js", "if (!e.target.closest(\"button\")) startDrag(e, \"move\", ctx);", "void 0;"],
  nodock: ["js/hadith-reader.js", "    close.addEventListener(\"click\", () => { delete oi.float[key]; localRefresh(); });", ""],
  nophonesteps: ["js/hadith-reader.js", "    b.addEventListener(\"click\", () => { oi.phone = key; localRefresh(); });", ""],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

if (process.argv.includes("--prove")) {
  let caught = 0;
  const missed = [];
  const only = arg("only") ? arg("only").split(",") : Object.keys(MUT);
  for (const name of only) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim();
    const tail = out.split("\n").pop();
    // Caught = the run failed AND a named check failed (a crash with no FAIL line proves nothing about the checks).
    const firstFail = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && firstFail) { caught++; console.log(`  CAUGHT  ${name}: ${firstFail.trim().slice(0, 140)}`); }
    else { missed.push(name); console.log(`  MISSED  ${name}: exit ${r.status}, ${tail}`); }
  }
  console.log(`\n==== hadith-study-reader mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

// The expected text, read off the library's own files rather than retyped.
const SPLIT = "tools/hadith-data-pull/output/openiti-release/split";
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const MUSLIM = "0261Muslim.Sahih.Shamela0001727-ara1";
const bIndex = JSON.parse(fs.readFileSync(`${SPLIT}/${BUKHARI}/index.json`, "utf8"));
const ch2 = bIndex.chapters.find((c) => c.id === "ch-2");
const ch2Shard = JSON.parse(fs.readFileSync(`${SPLIT}/${BUKHARI}/${ch2.shardFiles[0]}`, "utf8"));
const H1 = ch2Shard.hadiths.find((h) => h.kind === "hadith" && h.number === 1);
const H2 = ch2Shard.hadiths.find((h) => h.kind === "hadith" && h.number === 2);
if (!H1 || !H2 || H1.p !== H2.p) throw new Error("fixture: Bukhari hadith 1 and 2 are expected in ch-2, in one sub-chapter -- re-derive");
const BOOK_COUNT = JSON.parse(fs.readFileSync(`${SPLIT}/books-summary.json`, "utf8")).books?.length ?? null;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
async function acheck(name, fn) {
  try { const r = await fn(); check(name, r !== false, typeof r === "string" ? r : ""); }
  catch (e) { check(name, false, `-- ${String(e.message).split("\n")[0]}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, width, path, look = "light") {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, path);
  if (look === "night") await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
  return { ctx, page, errors };
}
const settle = (p) => p.waitForTimeout(150);
// A tap that cannot happen (a broken control, a missing pane) is reported and the run goes on, so the checks after it
// fail by name instead of the whole run stopping on one timeout.
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const shown = (p, sel) => p.$eval(sel, (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== "none"; }).catch(() => false);
const card = (p) => p.evaluate(() => {
  const c = document.querySelector("[data-openiti-passage]");
  return c ? { n: Number(c.dataset.openitiPassage), text: c.querySelector(".hadith-arabic")?.textContent ?? "", focused: c.dataset.openitiFocused === "true" } : null;
});
const showPane = async (p, key) => { if (await shown(p, `[data-reader-show="${key}"]`)) { await tap(p, `[data-reader-show="${key}"]`); await settle(p); } };
const noSideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function openHadith1(p) {
  await tap(p, `[data-openiti-book="${BUKHARI}"]`);
  await p.waitForSelector('[data-openiti-chapter="ch-2"]');
  await tap(p, '[data-openiti-chapter="ch-2"]');
  await p.waitForSelector(`[data-openiti-bab="${H1.p}"]`, { state: "attached" });
  await showPane(p, "chapters");
  await tap(p, `[data-openiti-bab="${H1.p}"]`);
  await p.waitForSelector(`[data-openiti-row="${H1.n}"]`, { state: "attached" });
  await showPane(p, "hadiths");
  await tap(p, `[data-openiti-row="${H1.n}"]`);
  await p.waitForSelector(`[data-openiti-passage="${H1.n}"]`, { state: "attached" });
}

// ---------------------------------------------------------------------------------------------------------------
// The menu bar, the panes and the window tools, at a computer's and a tablet's width.
// ---------------------------------------------------------------------------------------------------------------
for (const [lang, width, look] of [["en", 1280, "light"], ["bn", 820, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  console.log(`\n===== hadith-study reader ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width, "/app/hadith-study.html", look);
  await P.waitForSelector("[data-openiti-book]");

  // --- The menu ---
  const books = await P.$$eval("[data-openiti-book]", (r) => r.length);
  check(`${tag} the page opens on Hadith Books: the shelf of every book (${books})`, books > 0 && (BOOK_COUNT == null || books === BOOK_COUNT), `${books} vs ${BOOK_COUNT}`);
  check(`${tag} Hadith Books is the current menu button`, await P.$eval('[data-hadith-tab="books"]', (b) => b.getAttribute("aria-current") === "page"));
  await acheck(`${tag} every menu-bar button is a real tap target (>= 40px tall)`, () =>
    P.$$eval(".hadith-menubar .hadith-tab", (bs) => bs.every((b) => b.getBoundingClientRect().height >= 40) || bs.map((b) => b.getBoundingClientRect().height).join(",")));
  await tap(P, '[data-hadith-tab="books"]');
  await P.waitForSelector("[data-hadith-menu=\"books\"] [data-hadith-book-pick]");
  await acheck(`${tag} on Books, Hadith Books opens its quick list: All Hadith Books and every book`, async () => {
    await P.waitForFunction((n) => document.querySelectorAll('[data-hadith-menu="books"] [data-hadith-book-pick]').length === n + 1, books, { timeout: 8000 });
    return await shown(P, '[data-hadith-menu="books"]');
  });
  await P.keyboard.press("Escape");
  await acheck(`${tag} Escape closes the list and gives the focus back to the button`, () =>
    P.evaluate(() => document.querySelector('[data-hadith-menu="books"]').hidden && document.activeElement?.dataset.hadithTab === "books"));
  await tap(P, '[data-hadith-tab="topic"]');
  await settle(P);
  await tap(P, '[data-hadith-tab="books"]');
  await settle(P);
  await acheck(`${tag} from Topics, Hadith Books goes straight to the shelf, with no list`, async () =>
    (await P.$$eval("[data-openiti-book]", (r) => r.length)) === books && await P.$eval('[data-hadith-menu="books"]', (m) => m.hidden));
  await tap(P, '[data-hadith-tab="subjects"]');
  await acheck(`${tag} Subjects lists the three: akhlaq, ghayb, stories`, () =>
    P.$$eval("[data-hadith-subject-pick]", (r) => r.map((x) => x.dataset.hadithSubjectPick).join() === "akhlaq,ghayb,stories" || r.map((x) => x.dataset.hadithSubjectPick).join()));
  await tap(P, '[data-hadith-subject-pick="stories"]');
  await settle(P);
  check(`${tag} choosing a Subject opens it`, await shown(P, '[data-hadith-subject="stories"]'));
  // The quick list opens a book directly once on Books.
  await acheck(`${tag} a book chosen from the quick list opens on its chapters`, async () => {
    await tap(P, '[data-hadith-tab="books"]');
    await settle(P);
    await tap(P, '[data-hadith-tab="books"]');
    await P.waitForSelector(`[data-hadith-menu="books"] [data-hadith-book-pick="${MUSLIM}"]`, { timeout: 8000 });
    await tap(P, `[data-hadith-menu="books"] [data-hadith-book-pick="${MUSLIM}"]`);
    await P.waitForSelector("[data-openiti-chapter]", { timeout: 8000 });
    return (await P.$$eval("[data-openiti-chapter]", (r) => r.length)) > 0;
  });
  // Back to the shelf by the menu bar, whatever state the step above left.
  await P.keyboard.press("Escape");
  await tap(P, '[data-hadith-tab="topic"]');
  await settle(P);
  await tap(P, '[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${BUKHARI}"]`, { timeout: 8000 }).catch(async () => {
    await tap(P, "[data-openiti-crumbs] .openiti-crumb >> nth=0").catch(() => {});
    await P.waitForSelector(`[data-openiti-book="${BUKHARI}"]`);
  });

  // --- The three panes ---
  await openHadith1(P);
  await acheck(`${tag} the three panes sit side by side, in order, inside the reader`, () => P.evaluate(() => {
    const r = ["chapters", "hadiths", "text"].map((k) => document.querySelector(`.hadith-reader-grid > [data-reader-pane="${k}"]`).getBoundingClientRect());
    return (r.every((x) => x.width > 100) && r[0].right <= r[1].left + 1 && r[1].right <= r[2].left + 1 && Math.abs(r[0].top - r[2].top) < 2) || JSON.stringify(r.map((x) => [x.left, x.width]));
  }));
  const c1 = await card(P);
  check(`${tag} the Text pane shows hadith 1, its text exactly the library's own record`, c1?.n === H1.n && c1.text === H1.text, JSON.stringify(c1).slice(0, 80));
  check(`${tag} its row in the middle pane is marked as the one open`, await P.$eval(`[data-openiti-row="${H1.n}"]`, (r) => r.getAttribute("aria-current") === "true"));
  check(`${tag} the open chapter and sub-chapter are marked in the Chapters pane`,
    await P.evaluate((p) => document.querySelector('[data-openiti-chapter="ch-2"]')?.getAttribute("aria-current") === "true" && document.querySelector(`[data-openiti-bab="${p}"]`)?.getAttribute("aria-current") === "true", H1.p));
  check(`${tag} ‹ is off on the sub-chapter's first hadith`, await P.$eval('[data-reader-step="-1"]', (b) => b.disabled));
  await tap(P, '[data-reader-step="1"]');
  await settle(P);
  const c2 = await card(P);
  check(`${tag} › steps to hadith 2, its text exactly the library's own`, c2?.n === H2.n && c2.text === H2.text, JSON.stringify(c2).slice(0, 80));
  await tap(P, '[data-reader-step="-1"]');
  await settle(P);
  check(`${tag} ‹ steps back to hadith 1`, (await card(P))?.n === H1.n);
  await tap(P, `[data-openiti-row="${H2.n}"]`);
  await settle(P);
  check(`${tag} a tap on a row in the middle pane opens that hadith`, (await card(P))?.n === H2.n);
  await acheck(`${tag} the reader's own text reads clearly (row, title and hadith text >= 4.5:1)`, () => P.evaluate(() => {
    const lum = (s) => { const c = s.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const bgOf = (n) => { let e = n, bg; while (e && ((bg = getComputedStyle(e).backgroundColor) === "rgba(0, 0, 0, 0)" || bg === "transparent")) e = e.parentElement; return bg || "rgb(255, 255, 255)"; };
    const bad = [];
    for (const sel of [".hadith-reader-row .hadith-reader-snippet", ".hadith-reader-row .hadith-reader-no", ".hadith-pane-title", "[data-openiti-passage] .hadith-arabic"]) {
      const n = document.querySelector(sel); if (!n) { bad.push(`${sel} missing`); continue; }
      const [a, b] = [lum(getComputedStyle(n).color), lum(bgOf(n))].sort((x, y) => y - x);
      const r = (a + 0.05) / (b + 0.05); if (r < 4.5) bad.push(`${sel} ${r.toFixed(2)}`);
    }
    return bad.length === 0 || bad.join("; ");
  }));

  // --- The divider ---
  const paneW = (k) => P.$eval(`.hadith-reader-grid > [data-reader-pane="${k}"]`, (n) => n.getBoundingClientRect().width);
  const before = await paneW("chapters");
  const sb = await P.$eval('[data-reader-split="0"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await P.mouse.move(sb.x, sb.y); await P.mouse.down(); await P.mouse.move(sb.x + 60, sb.y, { steps: 6 }); await P.mouse.move(sb.x + 120, sb.y, { steps: 6 }); await P.mouse.up();
  const after = await paneW("chapters");
  check(`${tag} dragging the first divider widens Chapters (${Math.round(before)} -> ${Math.round(after)}px)`, after > before + 60);
  const saved = await P.evaluate(() => { try { return JSON.parse(localStorage.getItem("mmsa-hadith-reader-widths")); } catch { return null; } });
  check(`${tag} the new widths are remembered on this device`, Array.isArray(saved) && saved.length === 2 && saved[0] > 26, JSON.stringify(saved));
  const c1Before = await P.$eval(".hadith-reader-grid", (g) => parseFloat(g.style.getPropertyValue("--c1")));
  await P.focus('[data-reader-split="0"]');
  await P.keyboard.press("ArrowLeft");
  const c1After = await P.$eval(".hadith-reader-grid", (g) => parseFloat(g.style.getPropertyValue("--c1")));
  check(`${tag} the divider also moves with the arrow keys (${c1Before}% -> ${c1After}%)`, c1After === c1Before - 2);

  // --- Expand ---
  await tap(P, '[data-reader-max="text"]');
  await settle(P);
  await acheck(`${tag} ⤢ expands the Text pane over the whole reader, the other two hidden`, () => P.evaluate(() => {
    const g = document.querySelector(".hadith-reader-grid");
    const t = g.querySelector('[data-reader-pane="text"]').getBoundingClientRect();
    const hidden = ["chapters", "hadiths"].every((k) => getComputedStyle(g.querySelector(`[data-reader-pane="${k}"]`)).display === "none");
    return (g.dataset.max === "text" && hidden && t.width >= g.getBoundingClientRect().width - 4) || JSON.stringify({ max: g.dataset.max, hidden, t: t.width });
  }));
  await tap(P, '[data-reader-max="text"]');
  await settle(P);
  check(`${tag} ⤡ brings the three panes back`, await shown(P, '.hadith-reader-grid > [data-reader-pane="chapters"]') && !(await P.$eval(".hadith-reader-grid", (g) => g.dataset.max ?? "")));

  // --- Pop out ---
  await tap(P, '[data-reader-pop="hadiths"]');
  await P.waitForSelector('[data-reader-float="hadiths"]', { timeout: 5000 }).catch(() => {});
  const win = () => P.$eval('[data-reader-float="hadiths"]', (w) => { const r = w.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }).catch(() => null);
  const w0 = await win();
  check(`${tag} ⧉ pops the Hadith pane out as a window, holding the chapter's rows`, !!w0 && await P.$$eval('[data-reader-float="hadiths"] [data-openiti-row]', (r) => r.length > 0));
  check(`${tag} ...and its place in the reader says so, with "Put it back here"`, !!(await P.$('.hadith-pane-stub[data-reader-pane="hadiths"] [data-reader-dock="hadiths"]')));
  if (w0) {
    const head = await P.$eval('[data-reader-float="hadiths"] .hadith-pane-title', (n) => { const r = n.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; });
    await P.mouse.move(head.x, head.y); await P.mouse.down(); await P.mouse.move(head.x + 40, head.y + 30, { steps: 5 }); await P.mouse.move(head.x + 80, head.y + 60, { steps: 5 }); await P.mouse.up();
    const w1 = await win();
    check(`${tag} the window moves by its title bar (${Math.round(w1.x - w0.x)}, ${Math.round(w1.y - w0.y)})`, Math.abs(w1.x - w0.x - 80) < 4 && Math.abs(w1.y - w0.y - 60) < 4);
    for (const [h, dx, dy, test] of [["se", 50, 40, (a, b) => b.w > a.w + 40 && b.h > a.h + 30], ["nw", -30, -20, (a, b) => b.w > a.w + 20 && b.x < a.x - 20 && b.y < a.y - 10], ["e", 30, 0, (a, b) => b.w > a.w + 20 && Math.abs(b.h - a.h) < 2]]) {
      const a = await win();
      const g = await P.$eval(`[data-reader-float="hadiths"] .hadith-pane-h[data-h="${h}"]`, (n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null);
      if (!g) { check(`${tag} the window has a "${h}" resize handle`, false); continue; }
      await P.mouse.move(g.x, g.y); await P.mouse.down(); await P.mouse.move(g.x + dx / 2, g.y + dy / 2, { steps: 4 }); await P.mouse.move(g.x + dx, g.y + dy, { steps: 4 }); await P.mouse.up();
      const b = await win();
      check(`${tag} the window resizes from its "${h}" ${h.length === 2 ? "corner" : "side"} (${Math.round(a.w)}x${Math.round(a.h)} -> ${Math.round(b.w)}x${Math.round(b.h)})`, test(a, b));
    }
    const kept = await win();
    await tap(P, `[data-reader-float="hadiths"] [data-openiti-row="${H1.n}"]`);
    await settle(P);
    check(`${tag} a row picked in the window opens that hadith in the Text pane`, (await card(P))?.n === H1.n);
    const again = await win();
    check(`${tag} ...and the window keeps its place and size`, !!again && Math.abs(again.x - kept.x) < 2 && Math.abs(again.w - kept.w) < 2);
    await tap(P, '[data-reader-float="hadiths"] [data-reader-dock="hadiths"]');
    await settle(P);
    check(`${tag} ✕ puts the pane back in its place`, !(await P.$('[data-reader-float="hadiths"]')) && await shown(P, '.hadith-reader-grid > .hadith-pane[data-reader-pane="hadiths"]:not(.hadith-pane-stub)'));
  }
  check(`${tag} no sideways scroll`, (await noSideways(P)) <= 1);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------
// A phone: one pane at a time (answer 2A).
// ---------------------------------------------------------------------------------------------------------------
for (const [lang, look] of [["en", "light"], ["bn", "night"]]) {
  const tag = `[${lang} 390 ${look}]`;
  console.log(`\n===== hadith-study reader ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, 390, "/app/hadith-study.html", look);
  await P.waitForSelector("[data-openiti-book]");
  const only = () => P.evaluate(() => ["chapters", "hadiths", "text"].filter((k) => { const n = document.querySelector(`.hadith-reader-grid > [data-reader-pane="${k}"]`); return n && getComputedStyle(n).display !== "none" && n.getBoundingClientRect().width > 0; }).join());
  await tap(P, `[data-openiti-book="${BUKHARI}"]`);
  await P.waitForSelector('[data-openiti-chapter="ch-2"]');
  check(`${tag} the step buttons show, and a book opens on Chapters alone`, await shown(P, '[data-reader-show="text"]') && (await only()) === "chapters", await only());
  await tap(P, '[data-openiti-chapter="ch-2"]');
  await settle(P);
  check(`${tag} a chapter with sub-chapters stays on Chapters, to pick one`, (await only()) === "chapters" && !!(await P.$(`[data-openiti-bab="${H1.p}"]`)));
  await tap(P, `[data-openiti-bab="${H1.p}"]`);
  await settle(P);
  check(`${tag} a sub-chapter opens the Hadith pane alone`, (await only()) === "hadiths", await only());
  await tap(P, `[data-openiti-row="${H1.n}"]`);
  await settle(P);
  check(`${tag} a row opens the Text pane alone, on that hadith`, (await only()) === "text" && (await card(P))?.n === H1.n, await only());
  await tap(P, '[data-reader-show="chapters"]');
  await settle(P);
  check(`${tag} the Chapters button goes back to Chapters`, (await only()) === "chapters");
  await tap(P, '[data-reader-show="text"]');
  await settle(P);
  await tap(P, "[data-openiti-crumbs] .openiti-crumb >> nth=1");
  await settle(P);
  check(`${tag} the book's name in the breadcrumbs goes back to Chapters (no empty pane)`, (await only()) === "chapters", await only());
  await acheck(`${tag} the step buttons are real tap targets (>= 40px) and fit the screen`, () => P.$$eval("[data-reader-show]", (bs) =>
    bs.every((b) => { const r = b.getBoundingClientRect(); return r.height >= 40 && r.right <= innerWidth; }) || bs.map((b) => `${b.getBoundingClientRect().height}/${b.getBoundingClientRect().right}`).join(",")));
  check(`${tag} no sideways scroll`, (await noSideways(P)) <= 1);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------
// The jumps into the reader, and their ways back (decision 86), at a computer's width and a phone's.
// ---------------------------------------------------------------------------------------------------------------
for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== hadith-study reader jumps ${tag} =====`);
  const textShown = (P) => shown(P, '.hadith-reader-grid > [data-reader-pane="text"]');
  {
    const { ctx, page: P, errors } = await open(lang, width, "/app/hadith-study.html");
    await P.waitForSelector(`[data-openiti-book="${BUKHARI}"]`);
    await tap(P, `[data-openiti-book="${BUKHARI}"]`);
    await P.waitForSelector("[data-openiti-goto-input]");
    await P.fill("[data-openiti-goto-input]", "6306");
    await tap(P, "[data-openiti-goto-btn]");
    await P.waitForSelector("[data-openiti-focused]", { state: "attached" });
    const f = await card(P);
    check(`${tag} Go to standard 6306 opens passage 6578, highlighted, in view`, f?.n === 6578 && f.focused && await textShown(P), JSON.stringify(f).slice(0, 60));
    await acheck(`${tag} Go to this edition's number 5000 opens hadith 5000 itself`, async () => {
      await tap(P, "[data-openiti-crumbs] .openiti-crumb >> nth=1");
      await showPane(P, "chapters");
      await P.waitForSelector("[data-openiti-goto-mode]");
      await P.selectOption("[data-openiti-goto-mode]", "edition");
      await P.fill("[data-openiti-goto-input]", "5000");
      await tap(P, "[data-openiti-goto-btn]");
      await P.waitForSelector("[data-openiti-focused]", { state: "attached" });
      const h = await P.$eval("[data-openiti-focused] .hadith-card-head", (n) => n.textContent);
      const want = lang === "bn" ? "৫০০০" : "5000";
      return (h.includes(want) && await textShown(P)) || h;
    });
    // The Dua tab's "Also narrated in" on a library narration, and its way back.
    await acheck(`${tag} a narration's "Also narrated in" opens the other book's narration, with ← Back to it`, async () => {
      await tap(P, "[data-openiti-crumbs] .openiti-crumb >> nth=1");
      await showPane(P, "chapters");
      await P.waitForSelector("[data-openiti-goto-mode]");
      await P.selectOption("[data-openiti-goto-mode]", "standard");
      await P.fill("[data-openiti-goto-input]", "6306");
      await tap(P, "[data-openiti-goto-btn]");
      await P.waitForSelector('[data-openiti-passage="6578"] [data-dua-also] [data-dua-ref]', { state: "attached" });
      const ref = await P.$eval('[data-openiti-passage="6578"] [data-dua-also] [data-dua-ref]', (b) => b.dataset.duaRef);
      await tap(P, '[data-openiti-passage="6578"] [data-dua-also] [data-dua-ref]');
      const [, n] = ref.split(":");
      await P.waitForSelector(`[data-openiti-passage="${n}"][data-openiti-focused]`, { state: "attached" });
      if (!(await textShown(P))) return "the Text pane is not on screen";
      await tap(P, "[data-openiti-trail-back]");
      await P.waitForSelector('[data-openiti-passage="6578"][data-openiti-focused]', { state: "attached" });
      return await textShown(P);
    });
    check(`${tag} no page errors (Hadith Books jumps)`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  {
    // A passage link, as an Asma poster's Hadith reference makes it (decision 85).
    const { ctx, page: P } = await open(lang, width, `/app/hadith-collections.html?openiti=${BUKHARI}&passage=6682&back=1`);
    await P.waitForSelector("[data-openiti-focused]", { state: "attached", timeout: 20000 }).catch(() => {});
    const f = await card(P);
    check(`${tag} ?openiti=…&passage=6682 opens that narration, highlighted, in the Text pane`, f?.n === 6682 && f.focused && await textShown(P), JSON.stringify(f).slice(0, 60));
    check(`${tag} ...its row is the one marked open`, await P.$eval('[data-openiti-row="6682"]', (r) => r.getAttribute("aria-current") === "true").catch(() => false));
    await ctx.close();
  }
  {
    // J103: a HadeethEnc card's proven reference opens the book's own narration, with ← Back to the hadith card.
    const { ctx, page: P, errors } = await open(lang, width, "/app/hadith-study.html?resume=hadith:hadeethenc:4560");
    await P.waitForSelector('[data-hadeethenc-card="4560"] [data-hadith-ref="muslim:1907"]', { timeout: 20000 }).catch(() => {});
    await acheck(`${tag} HadeethEnc 4560's "Muslim 1907" opens the narration in Hadith Books, highlighted, in the Text pane`, async () => {
      const passage = await P.$eval('[data-hadith-ref="muslim:1907"]', (b) => b.dataset.hadithRefPassage);
      await tap(P, '[data-hadith-ref="muslim:1907"]');
      const n = passage.split(":").pop();
      await P.waitForSelector(`[data-openiti-passage="${n}"][data-openiti-focused]`, { state: "attached", timeout: 15000 });
      const cur = await P.$eval('[data-hadith-tab="books"]', (b) => b.getAttribute("aria-current"));
      return (cur === "page" && await textShown(P)) || `books current: ${cur}`;
    });
    await acheck(`${tag} ...and ← Back to the hadith card returns to card 4560 in the Encyclopedia`, async () => {
      await tap(P, "[data-openiti-trail-back]");
      await P.waitForSelector('[data-hadeethenc-card="4560"]', { timeout: 15000 });
      return (await P.$eval('[data-hadith-tab="collections"]', (b) => b.getAttribute("aria-current"))) === "page";
    });
    check(`${tag} no page errors (reference jump)`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Hadith Study reader (J106 round 1): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
