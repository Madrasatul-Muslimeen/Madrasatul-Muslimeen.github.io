// J120 (the Owner, 15 Nov 2026, v15.02): the site's own address madrasatul-muslimeen.github.io/ (a jump into
// /app/quranrevival.html) is outside /app/sw.js's scope, so offline it gave Chrome's "no internet" page. /root-sw.js,
// registered by app/js/sw-register.js, answers ONLY "/" and "/index.html", and only when the network fails.
// Run from the repository root with serve.js up.
//   MUT=noreg     sw-register.js does not register /root-sw.js       -> the front-door checks FAIL
//   MUT=nofallback root-sw.js does not answer when the network fails -> the front-door checks FAIL
//   --prove runs both.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
if (process.argv.includes("--prove")) {
  let missed = 0;
  for (const m of ["noreg", "nofallback"]) {
    const r = spawnSync(process.execPath, [process.argv[1]], { encoding: "utf8", env: { ...process.env, MUT: m }, timeout: 600000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) console.log(`  CAUGHT  ${m}: ${ff.trim()}`); else { missed++; console.log(`  MISSED  ${m}`); }
  }
  process.exit(missed ? 1 : 0);
}
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const REG = fs.readFileSync("app/js/sw-register.js", "utf8");
const ROOT = fs.readFileSync("root-sw.js", "utf8");
const REG_LINE = 'navigator.serviceWorker.register("/root-sw.js", { scope: "/" }).catch(() => {});';
const FALLBACK = 'fetch(request).catch(() => Response.redirect(new URL("/app/quranrevival.html", location.origin).href, 302))';
check("POSITIVE CONTROL: sw-register.js registers /root-sw.js and root-sw.js carries its offline answer", REG.includes(REG_LINE) && ROOT.includes(FALLBACK));
// nofallback edits root-sw.js ON DISK (serve.js serves it live) and restores it on exit: a route does not reach the worker's
// own script fetch reliably, and a mutation that never reaches the browser proves nothing (found by this suite's first --prove).
if (process.env.MUT === "nofallback") {
  fs.writeFileSync("root-sw.js", ROOT.replace(FALLBACK, "fetch(request)"));
  const restore = () => fs.writeFileSync("root-sw.js", ROOT);
  process.on("exit", restore); process.on("SIGINT", () => { restore(); process.exit(130); }); process.on("SIGTERM", () => { restore(); process.exit(143); });
}
const b = await chromium.launch();
for (const width of [390, 1280]) {
  const ctx = await newContext(b, { allowServiceWorker: true, viewport: { width, height: 900 } });
  if (process.env.MUT === "noreg") await ctx.route(`${BASE}/app/js/sw-register.js*`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: REG.replace(REG_LINE, "") }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const ctl = await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 20000 }).then(() => true).catch(() => false);
  check(`${width}: precondition: /app/sw.js controls the page`, ctl);
  await page.waitForTimeout(2500);
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort());
  check(`${width}: MUTATION TARGET (noreg): two workers are registered, /app/ and the front door's /`, JSON.stringify(regs) === JSON.stringify(["/", "/app/"]), JSON.stringify(regs));
  // online, the front door is unchanged: it is the real index.html, which jumps into the app. (/index.html, because the
  // local serve.js maps "/" to admin-self-check.html; GitHub Pages serves index.html there.)
  await page.goto(BASE + "/index.html"); await page.waitForURL(/\/app\/quranrevival\.html/, { timeout: 15000 }).catch(() => {});
  check(`${width}: online, the address still jumps into /app/quranrevival.html`, /\/app\/quranrevival\.html/.test(page.url()), page.url());
  await page.waitForTimeout(2000);
  await ctx.setOffline(true);
  await ctx.route(`${BASE}/**`, (r) => r.abort("internetdisconnected"));
  for (const p of ["/", "/index.html"]) {
    let url = "", title = "", h = 0;
    try { await page.goto(BASE + p, { timeout: 15000 }); await page.waitForURL(/\/app\/quranrevival\.html/, { timeout: 15000 }); url = page.url(); title = await page.title(); h = await page.evaluate(() => document.body.innerText.length); } catch (e) { url = String(e.message).split("\n")[0].slice(0, 90); }
    check(`${width}: MUTATION TARGET: offline, ${p} opens the app (Quran Study) from what was saved`, /\/app\/quranrevival\.html/.test(url) && /MSA/.test(title) && h > 200, `${url} ${title} (${h} chars)`);
  }
  let legacyOk = true;
  try { const r = await page.goto(BASE + "/legacy-v14/index.html", { timeout: 15000 }); legacyOk = !!r && r.ok(); } catch { legacyOk = false; }
  check(`${width}: an archive address (legacy-v14) is NOT answered by the front-door worker (it fails offline exactly as before)`, !legacyOk);
  await ctx.close();
}
await b.close();
console.log(`\n==== offline-front-door: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
