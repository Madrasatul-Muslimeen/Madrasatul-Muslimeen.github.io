// The Owner, 6 Nov 2026: the Asma screensaver came over a Note being written. The Note window is an <iframe>, so typing in it
// leaves document.activeElement on the frame and fires no key event in the page: it looked idle after 3 minutes.
// screensaverHeld() now holds while a frame has focus or while the Note window (#noteOpener) is on screen.
// --mutate=nohold removes both lines -> FAIL.   Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=nohold");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 800 } });
if (MUT) await ctx.route("**/js/screensaver-idle.js*", async (r) => { const res = await r.fetch(); const b = await res.text(); const i = b.indexOf("  if (a && a.tagName === \"IFRAME\") return true;"); const j = b.indexOf("  const ws = doc.getElementById(\"writingSheet\");"); if (i < 0 || j < 0) throw new Error("anchor"); r.fulfill({ response: res, body: b.slice(0, i) + b.slice(j) }); });
const { page } = await openPage(ctx, "/app/about.html?noscreensaver");
const held = () => page.evaluate(async () => (await import("/app/js/screensaver-idle.js")).screensaverHeld());
await page.evaluate(() => { document.activeElement?.blur?.(); });
check("baseline: nothing open, the page is not held (positive control)", (await held()) === false);
await page.evaluate(() => { const f = document.createElement("iframe"); f.id = "tFrame"; f.src = "about:blank"; document.body.append(f); f.focus(); });
check("a focused iframe (the reader typing in a Note) holds the screensaver", (await page.evaluate(() => document.activeElement?.tagName)) === "IFRAME" && (await held()) === true);
await page.evaluate(() => { document.getElementById("tFrame").remove(); document.activeElement?.blur?.(); });
check("with the frame gone it is not held again", (await held()) === false);
await page.evaluate(() => { const w = document.createElement("div"); w.id = "noteOpener"; w.style.cssText = "position:fixed;inset:0;width:100px;height:100px"; document.body.append(w); });
check("the Note window on screen holds it", (await held()) === true);
await page.evaluate(() => { document.getElementById("noteOpener").hidden = true; document.getElementById("noteOpener").style.display = "none"; });
check("a hidden Note window does not hold it", (await held()) === false);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
