// The Owner, 23 Oct 2026: a student on Brave for Android saw "Unable to process request due to missing initial state"
// on study-monitoring.firebaseapp.com/__/auth/handler. Fix (Firebase's option 3): sign-in's helper pages are served from
// the app's own site at /__/auth/ (see __/auth/README.txt), and app/js/firebase-init.js points authDomain there on the
// hosts in SELF_HOSTED_AUTH_HOSTS. This proves:
//   files    the five helper files are there, copied from Firebase with only the script paths made absolute
//   fresh    they still match what Firebase serves today (skipped, and said so, when firebaseapp.com is unreachable)
//   sites    msa.json and qr.json both publish __/auth; MSA's _config.yml includes "__" (Jekyll skips "_" folders otherwise)
//   hosts    every listed host is a site that publishes __/auth; nothing else changes authDomain
//   browser  /__/auth/handler/ and /__/auth/iframe/ load their scripts (window.fireauth), with no failed request
// Run from the repository root with serve.js on :8080 (or QR_BASE):  node tools/i18n-verify/self-hosted-auth.mjs [--mutate=relative]
//   return   the handler page sends Google its address WITHOUT the slash GitHub Pages adds (MSA J88, 4 Nov 2026)
//   relative   the handler page's scripts go back to relative paths -> "browser" FAILS (they 404 under handler/)
//   slash      the handler page loses its slash fix -> "return" FAILS (Google: redirect_uri_mismatch)
import fs from "node:fs";
import { chromium, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !["relative", "slash"].includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);
const read = (p) => fs.readFileSync(p, "utf8");
// The two changes from Firebase's copy: absolute script paths, and (MSA J88, 4 Nov 2026) the slash fix before them.
const SLASH_FIX = /<script type="text\/javascript">\n\/\/ MSA J88 \(4 Nov 2026\)[\s\S]*?<\/script>\n/;
const NOFIX = (s) => s.replace(SLASH_FIX, "");
const ABS = (s) => NOFIX(s).replace(/src="\/__\/auth\/([a-z.]+)"/g, 'src="$1"'); // undo both changes

console.log("\n=== files ===");
const FILES = ["__/auth/handler/index.html", "__/auth/iframe/index.html", "__/auth/handler.js", "__/auth/iframe.js", "__/auth/experiments.js", "__/auth/README.txt"];
for (const f of FILES) check(`${f} is there`, fs.existsSync(f));
const handler = read("__/auth/handler/index.html"), iframe = read("__/auth/iframe/index.html");
check("handler loads experiments.js and handler.js by absolute path", /src="\/__\/auth\/experiments\.js"/.test(handler) && /src="\/__\/auth\/handler\.js"/.test(handler));
check("iframe loads iframe.js by absolute path", /src="\/__\/auth\/iframe\.js"/.test(iframe));
check("the handler page drops GitHub Pages' trailing slash before Firebase's helper runs", SLASH_FIX.test(handler) && handler.indexOf("history.replaceState") < handler.indexOf("/__/auth/experiments.js"));
check("POSITIVE CONTROL the handler page starts Firebase's helper", /fireauth\.oauthhelper\.widget\.initialize\(\)/.test(handler));

console.log("\n=== fresh (against firebaseapp.com) ===");
const SRC = "https://study-monitoring.firebaseapp.com/__/auth/";
try {
  const get = async (n) => { const r = await fetch(SRC + n, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(`${n} ${r.status}`); return r.text(); };
  const [h, i, hj, ij, ej] = await Promise.all(["handler", "iframe", "handler.js", "iframe.js", "experiments.js"].map(get));
  check("handler page matches Firebase's, apart from the script paths and the slash fix", ABS(handler) === h);
  check("iframe page matches Firebase's, apart from the script path", ABS(iframe) === i);
  check("handler.js matches Firebase's", read("__/auth/handler.js") === hj);
  check("iframe.js matches Firebase's", read("__/auth/iframe.js") === ij);
  check("experiments.js matches Firebase's", read("__/auth/experiments.js") === ej);
} catch (e) { console.log(`  SKIP  firebaseapp.com unreachable here (${e.message}); the copies are not compared`); }

console.log("\n=== sites ===");
const msa = JSON.parse(read("app/apps/msa.json")), qr = JSON.parse(read("app/apps/qr.json"));
check("MSA publishes __/auth", msa.site.includes("__/auth"));
check("MSA's Pages build includes the __ folder (_config.yml include; Jekyll skips \"_\" folders otherwise)", /^include:\s*\[[^\]]*"__"/m.test(fs.existsSync("_config.yml") ? read("_config.yml") : ""));
check("QR publishes __/auth", qr.site.includes("__/auth"));
check("QR publishes its own .nojekyll (its build is not Jekyll-processed)", qr.site.includes(".nojekyll") && fs.existsSync("apps/qr/site/.nojekyll"));

console.log("\n=== hosts ===");
const init = read("app/js/firebase-init.js");
const m = init.match(/const SELF_HOSTED_AUTH_HOSTS = (\[[^\]]*\]);/);
check("POSITIVE CONTROL firebase-init.js declares SELF_HOSTED_AUTH_HOSTS", !!m);
const hosts = m ? JSON.parse(m[1].replace(/'/g, '"')) : [];
const known = { "madrasatul-muslimeen.github.io": msa, "quranrevival.github.io": qr };
for (const h of hosts) check(`listed host ${h} is a site that publishes __/auth`, !!known[h] && known[h].site.includes("__/auth"));
check("authDomain comes from authHost, which falls back to firebaseapp.com", /authDomain: authHost,/.test(init) && /: "study-monitoring\.firebaseapp\.com";/.test(init));
// Updated in place, PCF MSA J112 (4 Nov 2026): siyagah-cloud.js sets the authDomain of Siyagah's SECOND, separate
// Firebase app. It is allowed only because it takes the host from this same list (init.SELF_HOSTED_AUTH_HOSTS, read
// from firebase-init.js, never retyped); any other file setting an authDomain still fails.
check("firebase-init.js exports SELF_HOSTED_AUTH_HOSTS (siyagah-cloud.js reads the list from it)", /^export const SELF_HOSTED_AUTH_HOSTS = /m.test(init));
check("siyagah-cloud.js takes Siyagah's authDomain from firebase-init.js's list", /authDomain: siyagahAuthDomain\(hostname, init\.SELF_HOSTED_AUTH_HOSTS,/.test(read("app/js/siyagah-cloud.js")) && /import\("\.\/firebase-init\.js"\)/.test(read("app/js/siyagah-cloud.js")));
check("no other authDomain is set anywhere in app/", fs.readdirSync("app/js").filter((f) => f.endsWith(".js") && f !== "firebase-init.js" && f !== "siyagah-cloud.js").every((f) => !/authDomain\s*:/.test(read(`app/js/${f}`))));
console.log(`  (listed now: ${hosts.length ? hosts.join(", ") : "none, the switch is OFF"})`);

console.log("\n=== browser ===");
const browser = await chromium.launch();
for (const [page, want] of [["handler", "oauthhelper"], ["iframe", "iframe"]]) {
  const ctx = await browser.newContext();
  if (MUTATE === "relative" && page === "handler") await ctx.route("**/__/auth/handler/index.html", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: ABS(handler) }));
  const p = await ctx.newPage();
  const bad = []; p.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await p.goto(`${BASE}/__/auth/${page}/index.html`, { waitUntil: "load" });
  await p.waitForTimeout(800);
  const has = await p.evaluate((w) => !!(window.fireauth && (w === "oauthhelper" ? window.fireauth.oauthhelper : window.fireauth.iframe)), want);
  check(`/__/auth/${page}/ loads Firebase's helper script (window.fireauth.${want})`, has);
  check(`/__/auth/${page}/ has no failed request`, bad.length === 0, bad.slice(0, 3).join(" | "));
  await ctx.close();
}

// MSA J88 (4 Nov 2026, the Owner's office PC: "Error 400: redirect_uri_mismatch"). GitHub Pages serves the helper at
// /__/auth/handler/ (with a slash), Firebase's helper sends its own address to Google as the return address, and the
// OAuth client lists it without the slash. Google's answers to both addresses were checked by hand the same day: with
// the slash, redirect_uri_mismatch; without it, Google's sign-in page.
console.log("\n=== return (the address the helper sends Google) ===");
{
  const ctx = await browser.newContext(); const sent = [];
  await ctx.route(/googleapis\.com|accounts\.google\.com|\/__\/auth\/handler\/index\.html|\/__\/firebase\/init\.json/, (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith("/__/auth/handler/index.html")) return MUTATE === "slash" ? r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: NOFIX(handler) }) : r.continue();
    if (u.pathname.endsWith("/__/firebase/init.json")) return r.fulfill({ status: 404, body: "" });
    if (/getProjectConfig/.test(u.pathname)) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projectId: "study-monitoring", authorizedDomains: ["localhost", "127.0.0.1"] }) });
    if (/createAuthUri/.test(u.pathname)) { sent.push(JSON.parse(r.request().postData() || "{}").continueUri); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authUri: `${BASE}/__/auth/iframe/index.html?probe=1`, sessionId: "probe" }) }); }
    return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  const p = await ctx.newPage();
  const q = "apiKey=AIzaSyBhDw1Y8CxicjIZ7xG2TZdCOIl5rsfaomg&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=" + encodeURIComponent(`${BASE}/app/quranrevival.html`) + "&v=10.12.2&eventId=1&providerId=google.com&scopes=profile";
  await p.goto(`${BASE}/__/auth/handler/index.html?${q}`, { waitUntil: "load" }).catch(() => {});
  for (let i = 0; i < 40 && !sent.length; i++) await p.waitForTimeout(100);
  check("POSITIVE CONTROL the helper asked for Google's sign-in address", sent.length === 1, `asked ${sent.length} times`);
  const path = sent[0] ? new URL(sent[0]).pathname : "";
  check("the return address it sends Google is /__/auth/handler, with no slash or index.html", path === "/__/auth/handler", `sent ${sent[0]}`);
  await ctx.close();
}
await browser.close();
console.log(`\n==== self-hosted sign-in helper${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
