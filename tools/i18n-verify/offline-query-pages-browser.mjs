// J120 (the Owner, 15 Nov 2026, v15.02): "Offline didn't work. all files downloaded, tick mark shown yet didn't work."
// A page saved for offline is stored under its bare address; the app itself opens pages with a "?" part
// (hadith-study.html?resume=…, notes.html?back=1, quranrevival.html?s=2), and with no internet those missed the saved
// copy and Chrome showed its own offline page. sw.js now answers a failed PAGE request with the saved copy of the same
// page, whatever follows "?". Run from the repository root with serve.js up.
//   MUT=noquery  serves sw.js without that answer: the "?" checks must FAIL.   --prove runs it.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
if (process.argv.includes("--prove")) {
  const r = spawnSync(process.execPath, [process.argv[1]], { encoding: "utf8", env: { ...process.env, MUT: "noquery" }, timeout: 600000 });
  const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
  console.log(r.status !== 0 && ff ? `  CAUGHT  noquery: ${ff.trim()}` : "  MISSED  noquery");
  process.exit(r.status !== 0 && ff ? 0 : 1);
}
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const SW = fs.readFileSync("app/sw.js", "utf8");
const BLOCK = /      if \(request\.mode === "navigate"\) \{\n        const page = await cache\.match\(request, \{ ignoreSearch: true \}\);\n        if \(page\) return page;\n      \}\n/;
check("POSITIVE CONTROL: sw.js carries the saved-page answer for a failed page request", BLOCK.test(SW));
const b = await chromium.launch();
for (const width of [390, 1280]) {
  const ctx = await newContext(b, { allowServiceWorker: true, viewport: { width, height: 900 } });
  if (process.env.MUT === "noquery") await ctx.route(`${BASE}/app/sw.js*`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: SW.replace(BLOCK, "") }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const ctl = await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 20000 }).then(() => true).catch(() => false);
  check(`${width}: precondition: the service worker controls the page`, ctl);
  for (const p of ["/app/hadith-study.html", "/app/notes.html", "/app/quranrevival.html"]) { await page.goto(BASE + p); await page.waitForTimeout(2500); }
  await ctx.setOffline(true);
  await ctx.route(`${BASE}/**`, (r) => r.abort("internetdisconnected"));
  const open = async (p) => { try { const r = await page.goto(BASE + p, { timeout: 15000 }); return { ok: !!r && r.ok(), title: await page.title(), h: await page.evaluate(() => document.body.innerText.length) }; } catch (e) { return { ok: false, title: String(e.message).split("\n")[0].slice(0, 90), h: 0 }; } };
  const plain = await open("/app/hadith-study.html");
  check(`${width}: offline, a saved page at its bare address opens (control)`, plain.ok && /Hadith Study/.test(plain.title), plain.title);
  for (const [p, re] of [["/app/hadith-study.html?resume=openiti:0179MalikIbnAnas.Muwatta:1", /Hadith Study/], ["/app/notes.html?back=1", /Notes/], ["/app/quranrevival.html?s=2", /MSA/]]) {
    const r = await open(p);
    check(`${width}: MUTATION TARGET (noquery): offline, ${p} opens the saved page with its content`, r.ok && re.test(r.title) && r.h > 50, `${r.title} (${r.h} chars)`);
  }
  await ctx.close();
}
await b.close();
console.log(`\n==== offline-query-pages: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
