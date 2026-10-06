// Note pane Part C3 (decisions 72, 80) -- the pure cleaners and the settings store behind the across-devices note settings.
// Plain Node, no browser. Run from the repository root:  node tools/i18n-verify/note-user-settings.mjs
// MUTATE=palette-open | merge-off | startup-read  is refused by the browser suite; here MUTATE=limit-off proves a cap check can fail.
import {
  cleanText, cleanColour, cleanTabs, cleanTemplates, cleanPhrases, cleanHeadingStyles, cleanFolds, cleanFoldList, cleanSettings,
  createSettingsStore, headingStyleCss, isSafeNoteId, LIMITS, PALETTE, SETTINGS_FIELD,
} from "../../app/js/note-user-settings.js";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
// A stand-in for the Note sanitiser (the real one needs DOMPurify): it removes script elements and on* handlers.
const sanitize = (h) => String(h).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), key: (i) => [...m.keys()][i], get length() { return m.size; } }; };

console.log("text and colour");
check("cleanText strips markup characters and control characters", cleanText("a<b>\u0000c\n d", 50) === "a b c d");
check("cleanText caps the length", cleanText("x".repeat(500), 200).length === 200);
check("cleanText of a non-string is empty", cleanText(42, 10) === "" && cleanText(null, 10) === "");
check("a palette colour survives (case-insensitive)", cleanColour("#B3261E") === "#b3261e");
check("a colour outside the palette is dropped", cleanColour("#123456") === "" && cleanColour("red") === "" && cleanColour("url(x)") === "" && cleanColour("#b3261e;background:url(x)") === "");
check("the palette has twelve distinct colours", new Set(PALETTE.map((p) => p[0])).size === 12);

console.log("ids");
check("a safe Note id passes", isSafeNoteId("note_abc-123"));
check("a bad Note id is refused", !isSafeNoteId("a/b") && !isSafeNoteId("a.b") && !isSafeNoteId("") && !isSafeNoteId("x".repeat(121)) && !isSafeNoteId(5) && !isSafeNoteId("<img>"));

console.log("tabs");
const tabs = cleanTabs([{ noteId: "n1", name: "A".repeat(60), colour: "#1f3a6e" }, { noteId: "bad/id", name: "x" }, { noteId: "n1", name: "dup" }, { noteId: "n2", name: "<b>Two</b>", colour: "#000000" }, null, 7]);
check("tabs keep safe ids only, once each", tabs.length === 2 && tabs[0].noteId === "n1" && tabs[1].noteId === "n2");
check("a tab name is short plain text", tabs[0].name.length === LIMITS.tabName && !/[<>]/.test(tabs[1].name));
check("a tab colour is a palette colour or empty", tabs[0].colour === "#1f3a6e" && tabs[1].colour === "");
check("at most 20 tabs", cleanTabs(Array.from({ length: 40 }, (_, i) => ({ noteId: `n${i}`, name: "t" }))).length === LIMITS.tabs);

console.log("templates");
const tpl = cleanTemplates([{ id: "t1", title: "T".repeat(200), bodyHtml: "<p>hi</p><script>alert(1)</script>" }, { id: "../x", title: "no" }, { id: "t2", title: "Big", bodyHtml: "x".repeat(LIMITS.templateBody + 1) }], sanitize);
check("a <script> in a template body is cleaned before it is stored", tpl.length === 1 && !/script/i.test(tpl[0].bodyHtml) && tpl[0].bodyHtml.includes("<p>hi</p>"));
check("a template title is capped at 80", tpl[0].title.length === LIMITS.templateTitle);
check("a bad template id and an over-20KB body are dropped", tpl.every((x) => x.id === "t1"));
check("at most 50 templates", cleanTemplates(Array.from({ length: 80 }, (_, i) => ({ id: `t${i}`, title: "x", bodyHtml: "<p>x</p>" })), sanitize).length === LIMITS.templates);
check("a template the sanitiser throws on is dropped, never stored raw", cleanTemplates([{ id: "t1", title: "x", bodyHtml: "<p>x</p>" }], () => { throw new Error("no DOMPurify"); }).length === 0);

console.log("phrases");
const ph = cleanPhrases(["ok", "", "  ", "p".repeat(500), "<img src=x onerror=alert(1)>", 5]);
check("phrases are plain text, non-empty, capped at 200", ph.length === 3 && ph[1].length === LIMITS.phrase && !/[<>]/.test(ph[2]));
check("at most 100 phrases", cleanPhrases(Array.from({ length: 250 }, (_, i) => `p${i}`)).length === LIMITS.phrases);

console.log("heading styles");
const hs = cleanHeadingStyles({ h1: { border: "#b3261e", bg: "#fff59d" }, h2: { border: "#abcdef", bg: "expression(x)" }, h3: { border: "", bg: "#c8e6c9" }, h9: { border: "#b3261e" }, h4: "x" });
check("a heading style keeps palette colours only", hs.h1.border === "#b3261e" && hs.h1.bg === "#fff59d" && !hs.h2 && hs.h3.bg === "#c8e6c9" && hs.h3.border === "");
check("only H1 to H4 exist", Object.keys(hs).every((k) => /^h[1-4]$/.test(k)) && !hs.h9);
check("the CSS made from a style holds palette colours and nothing else", !/[<>{}]\s*[^{}]*url|expression|javascript/i.test(headingStyleCss({ h1: { border: "red;x:y", bg: "#fff59d" } })) && headingStyleCss({ h1: { border: "red", bg: "" } }) === "");

console.log("folds");
check("a fold list is sorted, whole, in range and unique", JSON.stringify(cleanFoldList([3, 1, 1, -2, 2.5, "x", 999, 0])) === "[0,1,3]");
const many = Object.fromEntries(Array.from({ length: 350 }, (_, i) => [`n${i}`, [0]]));
const cf = cleanFolds({ ...many, "bad/id": [1], empty: [] });
check("folds hold at most 300 Notes, dropping the oldest", Object.keys(cf).length === LIMITS.folds && !("n0" in cf) && "n349" in cf && !("bad/id" in cf) && !("empty" in cf));

console.log("cleanSettings");
const all = cleanSettings(null, sanitize);
check("an empty or hostile value becomes the closed empty shape", JSON.stringify(Object.keys(all).sort()) === JSON.stringify(["folds", "headingStyles", "phrases", "tabs", "templates"]) && all.tabs.length === 0);
check("the stored field is mmsaNotes", SETTINGS_FIELD === "mmsaNotes");

console.log("the store");
{
  const writes = []; let remote = null; let reads = 0;
  const storage = mem();
  storage.setItem("qr.journeyNoteCollapsed.n1", "[1,2]"); storage.setItem("qr.journeyNoteCollapsed.n2", "[0]");
  const mk = (st = storage) => createSettingsStore({ uid: "u1", storage: st, sanitize, deleteMark: { del: true }, legacyFolds: () => ({ n1: [1, 2], n2: [0] }), readRemote: async () => { reads++; return remote; }, writeRemote: async (p) => { writes.push(p); } });
  const s = mk();
  check("nothing is read until open() is called", reads === 0 && writes.length === 0);
  await s.open(); await s.open();
  check("open() reads once however often it is called", reads === 1);
  check("the old local folds are copied up once, in one write under folds", writes.length === 1 && JSON.stringify(writes[0]) === JSON.stringify({ folds: { n1: [1, 2], n2: [0] } }));
  check("the old local values still exist afterwards", storage.getItem("qr.journeyNoteCollapsed.n1") === "[1,2]");
  check("folds are in the store now", [...s.foldsFor("n1")].join() === "1,2");
  writes.length = 0;
  await s.set("phrases", ["Bismillah", "<b>x</b>"]);
  check("a save writes only the one part", writes.length === 1 && Object.keys(writes[0]).join() === "phrases" && writes[0].phrases.length === 2 && !/[<>]/.test(writes[0].phrases[1]));
  await s.setFold("n1", []);
  check("clearing a fold writes a delete marker for that Note only", JSON.stringify(writes[1]) === JSON.stringify({ folds: { n1: { del: true } } }));
  await s.setFold("n3", [4]);
  check("a new fold writes that Note's list only", JSON.stringify(writes[2]) === JSON.stringify({ folds: { n3: [4] } }));
  let threw = false; try { await s.set("themeColors", { a: 1 }); } catch { threw = true; }
  check("only the five known parts can be written (themeColors is refused)", threw);
  // a second device
  remote = { phrases: ["From phone"], tabs: [{ noteId: "n9", name: "Nine", colour: "#006a6a" }] };
  const s2 = createSettingsStore({ uid: "u1", storage: mem(), sanitize, deleteMark: { del: true }, readRemote: async () => remote, writeRemote: async (p) => { writes.push(p); } }); const w0 = writes.length; // a clean browser: no old local folds
  await s2.open();
  check("a second device sees what the first saved", s2.get().phrases.join() === "From phone" && s2.get().tabs[0].name === "Nine");
  check("a field the account lacks is not invented", s2.get().templates.length === 0 && writes.length === w0);
  // offline
  const s3 = createSettingsStore({ uid: "u1", storage, sanitize, readRemote: async () => { throw new Error("offline"); }, writeRemote: async () => {} });
  check("the cached copy is there before any read", s3.get().phrases.length === 2);
  await s3.open();
  check("a failed read keeps the cached copy and says why", s3.get().phrases.length === 2 && s3.error === "offline");
  // a failed save is loud
  const s4 = createSettingsStore({ uid: "u4", storage: mem(), sanitize, readRemote: async () => null, writeRemote: async () => { throw new Error("denied"); } });
  let msg = ""; try { await s4.set("phrases", ["x"]); } catch (e) { msg = e.message; }
  check("a failed save rejects (so the page can say so in words)", msg === "denied" && s4.get().phrases.length === 1);
}

console.log("sources");
const src = fs.readFileSync("app/js/note-user-settings-fs.js", "utf8");
check("every Firestore write is a merge write", /setDoc\([^)]*\{ merge: true \}\)/.test(src) && (src.match(/setDoc\(/g) || []).length === 2 /* import + one call */);
check("nothing but mmsaNotes is written", !/themeColors/.test(src.replace(/\/\/.*$/gm, "")));
const pure = fs.readFileSync("app/js/note-user-settings.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check("the pure module imports no Firebase and no DOM", !/firebase|document\.|window\./.test(pure));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
