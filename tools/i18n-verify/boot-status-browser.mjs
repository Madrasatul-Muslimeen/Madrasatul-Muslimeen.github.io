// Owner, 2 Oct 2026 (a phone photo of the landing page showing only the
// header and "Home"): "This is the landing page, just blank."
// Reproduced: the page is blank while the database has not answered, when
// signed out (the Sign in button lives inside the Home menu), and when a
// start-up step fails (its error was written only inside the Home menu).
// The #bootStatus box now says which, until the app itself appears.
//
// Run from the repository root, with serve.js on :8080. Expected text is
// hand-written. A case is an alternative stub served for the Firebase SDK:
// signed out (onAuthStateChanged gives null) and a failing userIndex read.
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const TEXT = {
  en: { loading: "Loading your study…", slow: "Still loading… The internet connection is slow, or the database is not answering yet.", out: "You are signed out.", failed: "The app could not finish loading: read your userIndex", signIn: "Sign in with Google", reload: "Reload" },
  bn: { loading: "আপনার পড়াশোনা লোড হচ্ছে…", slow: "এখনো লোড হচ্ছে… ইন্টারনেট সংযোগ ধীর, অথবা ডেটাবেস এখনো সাড়া দিচ্ছে না।", out: "আপনি সাইন আউট অবস্থায় আছেন।", failed: "অ্যাপটি লোড শেষ করতে পারেনি: read your userIndex", signIn: "গুগল দিয়ে সাইন ইন করুন", reload: "আবার লোড করুন" },
};
const box = (page) => page.evaluate(() => {
  const b = document.getElementById("bootStatus"); const r = b.getBoundingClientRect();
  const btn = (id) => { const e = document.getElementById(id); const q = e.getBoundingClientRect(); return !e.hidden && q.height >= 40 ? e.textContent.trim() : null; };
  const app = document.getElementById("app");
  return { shown: !b.hidden && r.height > 0, inScreen: r.top >= 0 && r.bottom <= innerHeight, text: document.getElementById("bootStatusText").textContent.trim(),
    signIn: btn("bootStatusSignIn"), reload: btn("bootStatusReload"), appShown: getComputedStyle(app).display !== "none" };
});
async function open(lang, { latencyMs = 0, patch = null, width = 390 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 844 }, latencyMs });
  if (patch) {
    const body = patch(stubFor({ banner: true, latencyMs }));
    await ctx.route("https://www.gstatic.com/firebasejs/**", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}

for (const lang of ["en", "bn"]) for (const width of [320, 390, 1280]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== ${tag} ===`);
  // 1. A normal start: the box goes away and the app is on screen.
  { const { ctx, page } = await open(lang, { width }); await page.waitForTimeout(2500);
    const b = await box(page);
    check(`${tag} normal start: the box is gone and the app is shown`, !b.shown && b.appShown, JSON.stringify(b)); await ctx.close(); }
  if (width !== 390) continue;
  // 2. A slow database: "Loading", then after 12 s "Still loading" with Reload.
  { const { ctx, page } = await open(lang, { latencyMs: 20000 }); await page.waitForTimeout(1500);
    let b = await box(page);
    check(`${tag} slow: while waiting it says "${TEXT[lang].loading}" on screen`, b.shown && b.inScreen && b.text === TEXT[lang].loading && !b.appShown, JSON.stringify(b));
    check(`${tag} slow: no Reload yet`, b.reload === null, JSON.stringify(b));
    await page.waitForTimeout(12500); b = await box(page);
    check(`${tag} slow: after 12 s it says the connection is slow`, b.shown && b.text === TEXT[lang].slow, JSON.stringify(b));
    check(`${tag} slow: ...with a 40px Reload button reading "${TEXT[lang].reload}"`, b.reload === TEXT[lang].reload, JSON.stringify(b)); await ctx.close(); }
  // 3. Signed out: says so, with a Sign in button on the page.
  { const { ctx, page } = await open(lang, { patch: (s) => s.replace(/export function onAuthStateChanged\(auth, cb\) \{[^\n]*\n/, "export function onAuthStateChanged(auth, cb) { setTimeout(() => cb(null), 0); return () => {}; }\n") });
    await page.waitForTimeout(2000); const b = await box(page);
    check(`${tag} signed out: it says "${TEXT[lang].out}"`, b.shown && b.text === TEXT[lang].out, JSON.stringify(b));
    check(`${tag} signed out: a Sign in button on the page itself`, b.signIn === TEXT[lang].signIn && b.reload === null, JSON.stringify(b));
    await page.waitForTimeout(12000);
    check(`${tag} signed out: it does not turn into "still loading" later`, (await box(page)).text === TEXT[lang].out); await ctx.close(); }
  // 4. A failed start-up step: the failure is on the page, with Reload.
  { const { ctx, page } = await open(lang, { patch: (s) => s.replace("export async function getDoc(ref) {", "export async function getDoc(ref) { if (String(ref?.path ?? ref?._path ?? JSON.stringify(ref)).includes(\"userIndex\")) throw Object.assign(new Error(\"stub: offline\"), { code: \"unavailable\" });") });
    await page.waitForTimeout(2500); const b = await box(page);
    check(`${tag} failed step: it names the step that failed`, b.shown && b.text.startsWith(TEXT[lang].failed) && /offline/.test(b.text), JSON.stringify(b));
    check(`${tag} failed step: with Reload`, b.reload === TEXT[lang].reload, JSON.stringify(b)); await ctx.close(); }
}
console.log(`\n==== Boot status (never a blank page): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
