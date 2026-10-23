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
//   relative   the handler page's scripts go back to relative paths -> "browser" FAILS (they 404 under handler/)
import fs from "node:fs";
import { chromium, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && MUTATE !== "relative") throw new Error(`unknown mutation ${MUTATE}`);
const read = (p) => fs.readFileSync(p, "utf8");
const ABS = (s) => s.replace(/src="\/__\/auth\/([a-z.]+)"/g, 'src="$1"'); // undo the one change

console.log("\n=== files ===");
const FILES = ["__/auth/handler/index.html", "__/auth/iframe/index.html", "__/auth/handler.js", "__/auth/iframe.js", "__/auth/experiments.js", "__/auth/README.txt"];
for (const f of FILES) check(`${f} is there`, fs.existsSync(f));
const handler = read("__/auth/handler/index.html"), iframe = read("__/auth/iframe/index.html");
check("handler loads experiments.js and handler.js by absolute path", /src="\/__\/auth\/experiments\.js"/.test(handler) && /src="\/__\/auth\/handler\.js"/.test(handler));
check("iframe loads iframe.js by absolute path", /src="\/__\/auth\/iframe\.js"/.test(iframe));
check("POSITIVE CONTROL the handler page starts Firebase's helper", /fireauth\.oauthhelper\.widget\.initialize\(\)/.test(handler));

console.log("\n=== fresh (against firebaseapp.com) ===");
const SRC = "https://study-monitoring.firebaseapp.com/__/auth/";
try {
  const get = async (n) => { const r = await fetch(SRC + n, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(`${n} ${r.status}`); return r.text(); };
  const [h, i, hj, ij, ej] = await Promise.all(["handler", "iframe", "handler.js", "iframe.js", "experiments.js"].map(get));
  check("handler page matches Firebase's, apart from the script paths", ABS(handler) === h);
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
check("no other authDomain is set anywhere in app/", fs.readdirSync("app/js").filter((f) => f.endsWith(".js") && f !== "firebase-init.js").every((f) => !/authDomain\s*:/.test(read(`app/js/${f}`))));
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
await browser.close();
console.log(`\n==== self-hosted sign-in helper${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
