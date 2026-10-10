// The Read view's 📝 Notes pane never says "Loading…" forever (the Owner's screenshot, 11 Oct 2026: "Notes on 3:26 /
// Open in Mapping My Journey / Loading…", no ✚ New note, on a phone). The page inside the pane is journey-map.html?embed=1;
// four ways it could hang, each forced here, and what the reader must see instead.
//   roster-empty  the people list came back empty (a saved copy answering while the signal dropped) -> the reader's own Notes
//   tree-slow     the whole folder tree takes 20 s -> this āyah's Notes still show within a few seconds
//   tree-fails    the folder tree cannot be read -> the Notes still show, and the failure is said in words (I15)
//   no-person     nobody can be chosen at all -> words and Try again, never "Loading…"
// Run from the repository root with serve.js on :8080. 390px Bangla and 1280px English.
//   --mutate=nofallback  the reader's own person is not used        -> roster-empty fails
//   --mutate=noearly     the pane waits for the folder tree again   -> tree-slow fails
//   --mutate=nocatch     a failed folder tree is not caught         -> tree-fails fails
//   --mutate=nomessage   no person: back to returning silently      -> no-person fails
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PAGE_MUT = {
  nofallback: ["selectedPersonId = personSelect.value || myPersonIdInActiveTenant() || null;", "selectedPersonId = personSelect.value || null;"],
  noearly: ['      if (currentView === "unit") renderUnitView();\n', ""],
  nocatch: ["        reportWriteFailure(error, { collection: TENANT.NOTE_FOLDERS, action: \"ownerFolderTree\" });\n        showPageStatus(t(\"Your folders could not be read. Please try again.\"));\n        return;", "        throw error;"],
  nomessage: ["if (!activeTenantId || !selectedPersonId) { unitCannotLoad(body, label); return; }", "if (!activeTenantId || !selectedPersonId) return;"],
};
if (MUTATE && !PAGE_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const ROSTER = "roster = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));";
const FALLBACK = "selectedPersonId = personSelect.value || myPersonIdInActiveTenant() || null;";
const TREE = "export async function ownerFolderTreePagedSharded(db, { tenantId, ownerPersonId, pageSize = 100, shardCount = DEFAULT_SHARD_COUNT } = {}) {";
const swap = (src, a, b, what) => { if (!src.includes(a)) throw new Error(`anchor missing: ${what}`); return src.split(a).join(b); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  for (const variant of ["roster-empty", "tree-slow", "tree-fails", "no-person"]) {
    const tag = `[${lang} ${width} ${variant}]`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await ctx.route("**/app/journey-map.html*", async (r) => {
      let src = fs.readFileSync("app/journey-map.html", "utf8");
      if (MUTATE) src = swap(src, ...PAGE_MUT[MUTATE], MUTATE);
      if (variant === "roster-empty" || variant === "no-person") src = swap(src, ROSTER, "roster = [];", "roster");
      if (variant === "no-person" && src.includes(FALLBACK)) src = swap(src, FALLBACK, "selectedPersonId = null;", "fallback");
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src });
    });
    if (variant === "tree-slow" || variant === "tree-fails") await ctx.route("**/app/js/journey-map-service.js*", async (r) => {
      const inj = variant === "tree-fails" ? `\n  throw Object.assign(new Error("permission-denied (test)"), { code: "permission-denied" });` : `\n  await new Promise((r) => setTimeout(r, 20000));`;
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: swap(fs.readFileSync("app/js/journey-map-service.js", "utf8"), TREE, TREE + inj, "tree") });
    });
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    const ev = (f, a) => P.evaluate(f, a);
    await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
    await P.click("#tabReadBtn"); await P.waitForTimeout(400);
    await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
    await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(900);
    await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await clickReadTool(P, "#readNotesBtn");
    let F = null;
    for (let i = 0; i < 60 && !F; i++) { F = P.frames().find((x) => /journey-map\.html\?embed=1/.test(x.url())); if (!F) await P.waitForTimeout(100); }
    if (!F) { check(`${tag} the pane opens its page`, false); await ctx.close(); continue; }
    await P.waitForTimeout(4000); // well inside tree-slow's 20 s
    const s = await F.evaluate(() => {
      const body = document.querySelector("[data-unit-body]"), st = document.getElementById("pageStatusMsg"), ro = document.getElementById("readOnlyMsg");
      const retry = document.querySelector("[data-unit-retry]"), r = retry?.getBoundingClientRect();
      return { body: body?.innerText.replace(/\s+/g, " ").trim() ?? null, listed: !!body?.querySelector("[data-note-id], [data-unit-empty]"),
        newBtn: !!document.querySelector("[data-unit-new]"), retryH: r?.height ?? 0, status: st && getComputedStyle(st).display !== "none" ? st.textContent : "",
        roNull: !!ro && getComputedStyle(ro).display !== "none" && /null/.test(ro.textContent) };
    });
    const loadingForever = !s.listed && /Loading|লোড/.test(s.body ?? "");
    if (variant === "roster-empty") {
      check(`${tag} the people list came back empty: the reader's own Notes on 2:256 show, with ✚ New note`, s.listed && s.newBtn, JSON.stringify(s));
    } else if (variant === "tree-slow") {
      check(`${tag} the folder tree is slow (20 s): this āyah's Notes show within 4 s`, s.listed && !loadingForever, JSON.stringify(s));
    } else if (variant === "tree-fails") {
      check(`${tag} the folder tree cannot be read: this āyah's Notes still show`, s.listed, JSON.stringify(s));
      check(`${tag} ...and the failure is said in words (I15)`, s.status.length > 10, JSON.stringify(s));
    } else {
      check(`${tag} nobody can be chosen: words, not "Loading…"`, !loadingForever && (s.body ?? "").length > 10 && !/Loading/.test(s.body ?? ""), JSON.stringify(s));
      check(`${tag} ...with Try again, 36px or taller`, s.retryH >= 36, JSON.stringify(s));
      check(`${tag} ...and no "viewing null's Journey" line`, !s.roNull, JSON.stringify(s));
    }
    if (lang === "bn") check(`${tag} the pane's words are Bangla`, !/could not|Notes on|Try again/.test(s.body ?? "") && !/could not/.test(s.status), JSON.stringify(s));
    const bad = errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|permission-denied \(test\)/i.test(e));
    check(`${tag} no page errors`, bad.length === 0, bad.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Notes pane never "Loading…" forever: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
