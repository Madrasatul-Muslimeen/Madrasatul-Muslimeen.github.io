// Audit part 130, F1 / F3 / F5 (Hadith Lead): when a Hadith pane cannot read its data (offline, most often), it says so in
// plain words in the page's language with a "Try again" button, never the browser's "Failed to fetch"; and the
// Encyclopedia hides the synthetic sample collections while the real library cannot load (F3).
// The Hadith data files are blocked by a route (the same TypeError a phone offline gets), so no service worker is needed;
// then the route is lifted and "Try again" must load the real content. hadith-study.html and hadith-collections.html,
// en and bn, at 390 and 1440.
//   node tools/i18n-verify/hadith-read-failed-browser.mjs            (serve.js on :8080, or QR_BASE)
//   --mutate=<name>   serve one deliberately broken file through the browser route (nothing on disk changes)
//   --prove           run every mutation in turn and report which were caught (exits 1 if any was not)
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  rawmsg: ["js/hadith-shared-ui.js", 'const msg = el("p", null, message);', 'const msg = el("p", null, String(err?.message ?? err));'],
  noretry: ["js/hadith-shared-ui.js", "btn.addEventListener(\"click\", () => { btn.disabled = true; retry(); });", ""],
  rawref: ["js/hadith-shared-ui.js", "const code = err && err.code ? String(err.code) : \"\";", "const code = err && (err.code || err.message) ? String(err.code || err.message) : \"\";"],
  synshown: ["js/hadith-browser.js", "const s = synthetic(); if (s) s.hidden = true;", ""],
  synstays: ["js/hadith-browser.js", "const s = synthetic(); if (s) s.hidden = false;", ""],
  bookmsg: ["js/hadith-browser.js", "? t(\"This book could not be opened. Check the connection and try again.\")", "? t(\"The list of books could not be loaded. Check the connection and try again.\")"],
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
    // Caught = the run failed AND a named check failed (a crash with no FAIL line proves nothing about the checks).
    const firstFail = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && firstFail) { caught++; console.log(`  CAUGHT  ${name}: ${firstFail.trim().slice(0, 140)}`); }
    else { missed.push(name); console.log(`  MISSED  ${name}: exit ${r.status}, ${out.split("\n").pop()}`); }
  }
  console.log(`\n==== hadith-read-failed mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

// The expected sentences, read off the app's own Bangla file rather than retyped.
const BN = fs.readFileSync("app/js/i18n/bn.js", "utf8");
const bnOf = (en) => {
  const m = BN.match(new RegExp(`"${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*"([^"]+)"`));
  if (!m) throw new Error(`fixture: no Bangla for "${en}"`);
  return m[1];
};
const SHELF = "The list of books could not be loaded. Check the connection and try again.";
const BOOK = "This book could not be opened. Check the connection and try again.";
const ENCYC = "The Encyclopedia could not be loaded. Check the connection and try again.";
const words = (lang, en) => (lang === "bn" ? bnOf(en) : en);
const RAW = /Failed to fetch|TypeError|NetworkError|ERR_|undefined|\[object/i;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, width, path, blocked = false) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const net = { blocked };
  await ctx.route("**/tools/hadith-data-pull/output/**", (r) => (net.blocked ? r.abort("internetdisconnected") : r.continue()));
  const { page } = await openPage(ctx, path);
  return { ctx, page, net };
}
const tab = (p, name) => p.click(`[data-hadith-tab="${name}"]`, { timeout: 8000 }).catch(() => console.log(`  note: could not tap the ${name} tab`));
const waitFor = (p, sel, ms = 8000) => p.waitForSelector(sel, { state: "attached", timeout: ms }).then(() => true).catch(() => false);
const bodyText = (p) => p.evaluate(() => (document.querySelector(".hadith-body") || document.body).innerText);
// The note inside sel: its words, its button's rendered box, and whether that box is on screen.
const note = (p, sel, width) => p.evaluate(([s, w]) => {
  const n = document.querySelector(s);
  if (!n) return null;
  const b = n.querySelector("[data-hadith-read-retry]");
  const r = b?.getBoundingClientRect();
  return { text: n.innerText, btnH: r ? r.height : 0, btnIn: !!r && r.width > 0 && r.left >= 0 && r.right <= w };
}, [sel, width]);
const synHidden = (p) => p.evaluate(() => {
  const s = document.querySelector("[data-hadith-synthetic-block]");
  return s ? getComputedStyle(s).display === "none" : null;
});

for (const path of ["/app/hadith-study.html", "/app/hadith-collections.html"]) {
  for (const lang of ["en", "bn"]) {
    for (const width of [390, 1440]) {
      const tag = `[${path.split("/").pop()} ${lang} ${width}]`;

      // F1, the shelf: blocked from the first read.
      {
        // Books is the tab the page opens on, so the connection is off before the page loads.
        const { ctx, page, net } = await open(lang, width, path, true);
        const got = await waitFor(page, "[data-openiti-error] [data-hadith-read-retry]");
        const n = got ? await note(page, "[data-openiti-error]", width) : null;
        check(`${tag} shelf offline: the plain sentence in the page's language`, !!n && n.text.includes(words(lang, SHELF)), JSON.stringify(n?.text));
        check(`${tag} shelf offline: no raw browser text anywhere on the pane`, !RAW.test(await bodyText(page)));
        check(`${tag} shelf offline: Try again is 44px+ and on screen`, !!n && n.btnH >= 44 && n.btnIn, JSON.stringify(n));
        net.blocked = false;
        await page.click("[data-openiti-error] [data-hadith-read-retry]", { timeout: 4000 }).catch(() => {});
        const back = await waitFor(page, "[data-openiti-book]");
        check(`${tag} shelf: Try again, once online, shows the books`, back && !(await page.$("[data-openiti-error]")));
        await ctx.close();
      }

      // F1, a book: the shelf loads, then the connection drops before a book is opened.
      {
        const { ctx, page, net } = await open(lang, width, path);
        await waitFor(page, "[data-openiti-book]");
        net.blocked = true;
        await page.locator("[data-openiti-book]").first().click({ timeout: 4000 }).catch(() => console.log("  note: could not tap a book"));
        const got = await waitFor(page, "[data-openiti-error] [data-hadith-read-retry]");
        const n = got ? await note(page, "[data-openiti-error]", width) : null;
        check(`${tag} book offline: "this book could not be opened" in the page's language`, !!n && n.text.includes(words(lang, BOOK)), JSON.stringify(n?.text));
        check(`${tag} book offline: no raw browser text`, !RAW.test(await bodyText(page)));
        net.blocked = false;
        await page.click("[data-openiti-error] [data-hadith-read-retry]", { timeout: 4000 }).catch(() => {});
        // Positive control on the far side: the book's chapters really are drawn (not merely "no error left").
        const opened = await waitFor(page, "[data-openiti-chapter], .hadith-reader");
        check(`${tag} book: Try again, once online, opens it`, opened && !(await page.$("[data-openiti-error]")));
        await ctx.close();
      }

      // F3, the Encyclopedia: plain words, the synthetic samples hidden, and both back on Try again.
      {
        const { ctx, page, net } = await open(lang, width, path);
        net.blocked = true;
        await tab(page, "collections");
        const got = await waitFor(page, "[data-hadeethenc-error] [data-hadith-read-retry]");
        const n = got ? await note(page, "[data-hadeethenc-error]", width) : null;
        check(`${tag} Encyclopedia offline: the plain sentence in the page's language`, !!n && n.text.includes(words(lang, ENCYC)), JSON.stringify(n?.text));
        check(`${tag} Encyclopedia offline: no raw browser text`, !RAW.test(await bodyText(page)));
        check(`${tag} Encyclopedia offline: the synthetic samples are hidden`, (await synHidden(page)) === true);
        net.blocked = false;
        await page.click("[data-hadeethenc-error] [data-hadith-read-retry]", { timeout: 4000 }).catch(() => {});
        const back = await waitFor(page, "#hadeethencSection .hadith-row");
        check(`${tag} Encyclopedia: Try again, once online, shows the categories`, back && !(await page.$("[data-hadeethenc-error]")));
        check(`${tag} Encyclopedia online: the synthetic samples are back`, (await synHidden(page)) === false);
        await ctx.close();
      }
    }
  }
}

await browser.close();
console.log(`\n==== hadith-read-failed: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
