// PCF MSA J112 R1 -- the Map's read-only copy of Siyagah's Mapping My Journey: the pure model
// (app/js/siyagah-mmj-model.js) and the shape of the data module (app/js/siyagah-mmj-data.js).
//
// Siyagah's R1 reader contract (MMJ-SHARE), checked here function by function:
//   ids       n~<encodeURIComponent(id)> with "." as %2E; a big note's pieces n~<same>~<g>~<i>
//   tree      t~0, or t~0 + t~1..t~N joined ONLY when every piece's g equals t~0.g; never half a tree
//   notes     a big note's content joined from its pieces (same g, all present); gone:true removes; last `at` wins
//   cursor    the largest `at` seen
//   view      folders nested and ordered (o, then name); a folder whose parent is missing is never lost; a parent
//             loop is broken and still shown; notes in no folder of the set are "loose"
//   pictures  the sha the bytes must have (the smaller copy's when `sm` is set); bytes that fail are refused
//   retry     permission-denied is recognised; a retry is allowed only a minute after the last try
//   wiring    the model imports nothing; the data module never writes; neither is reachable from any page statically
//
// EVERY CHECK IS MUTATION-PROVEN BY THIS FILE ITSELF: after the real module passes, each mutation in MUTATIONS is
// applied to a copy of the source (every occurrence, counted) and the named check must FAIL against it. A mutation
// that leaves its check green fails this suite. Run from the repository root:
//   node tools/i18n-verify/siyagah-mmj-model.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const read = (p) => fs.readFileSync(p, "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const MODEL_SRC = read("app/js/siyagah-mmj-model.js");
const DATA_SRC = read("app/js/siyagah-mmj-data.js");
const LINK_SRC = read("app/js/siyagah-map-link.js");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError(`check "${name}" returned a promise; check() is synchronous`);
    if (r === false) throw new Error("returned false");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
function eq(a, b, what = "") { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${what} expected ${y}, got ${x}`); }
function ok(v, what) { if (!v) throw new Error(what || "expected true"); }

// A Firestore-Timestamp-like value, as the real SDK hands `at` back.
const TS = (ms) => ({ toMillis: () => ms, seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 });

/** Every behaviour check, run against a module M. Returns { name: true|errorMessage }. */
function behaviour(M) {
  const out = {};
  const run = (name, fn) => {
    try {
      const r = fn();
      if (r && typeof r.then === "function") throw new TypeError("a promise");
      if (r === false) throw new Error("returned false");
      out[name] = true;
    } catch (e) { out[name] = e.message; }
  };
  run("ids: a note's doc id is encodeURIComponent with '.' as %2E", () => {
    eq(M.mmjNoteDocId("a.b/c d"), "n~a%2Eb%2Fc%20d");
    eq(M.mmjNoteDocId("x1"), "n~x1");
  });
  run("ids: a big note's piece is n~<same encoded id>~<g>~<i>", () => eq(M.mmjPartDocId("a.b", "g7", 2), "n~a%2Eb~g7~2"));
  run("at: Timestamp, Date, {seconds,nanoseconds}, number and ISO all read as milliseconds; unknown is 0", () => {
    eq(M.atMillis(TS(1234567)), 1234567); eq(M.atMillis(new Date(5000)), 5000);
    eq(M.atMillis({ seconds: 2, nanoseconds: 3e6 }), 2003); eq(M.atMillis(77), 77);
    eq(M.atMillis("1970-01-01T00:00:01.000Z"), 1000); eq(M.atMillis(null), 0); eq(M.atMillis("nonsense"), 0);
  });
  run("kinds: t~0 is the tree, t~3 a piece, n~x a note, anything else nothing", () => {
    eq([M.mmjDocKind("t~0"), M.mmjDocKind("t~3"), M.mmjDocKind("t~03"), M.mmjDocKind("n~x"), M.mmjDocKind("n~"), M.mmjDocKind("x")], ["tree", "piece", null, "note", null, null]);
  });
  run("tree: a small t~0 gives its folders, cleaned, and its section", () => {
    const r = M.joinTree({ v: 1, at: TS(10), sec: { id: "mmj-sec", n: "My Journey" }, folders: [{ id: "a", n: "A", p: null, o: 1, vis: 1 }, { id: "", n: "bad" }, null] });
    ok(r.ok, "not ok"); eq(r.tree.sec.n, "My Journey"); eq(r.tree.folders.map((f) => [f.id, f.vis]), [["a", 1]]); eq(r.tree.at, 10);
  });
  run("tree: pieces t~1..t~N are joined in order when every g equals t~0.g", () => {
    const r = M.joinTree({ at: TS(9), n: 2, g: "G" }, { "t~2": { g: "G", folders: [{ id: "c", n: "C" }] }, "t~1": { g: "G", folders: [{ id: "a", n: "A" }, { id: "b", n: "B" }] } });
    ok(r.ok, JSON.stringify(r)); eq(r.tree.folders.map((f) => f.id), ["a", "b", "c"]);
  });
  run("tree: a piece of ANOTHER generation is refused (a write is in progress), never half-joined", () => {
    const r = M.joinTree({ n: 2, g: "G2" }, { "t~1": { g: "G2", folders: [{ id: "a" }] }, "t~2": { g: "G1", folders: [{ id: "b" }] } });
    eq([r.ok, r.reason], [false, "piece-generation"]);
  });
  run("tree: a missing piece is refused", () => {
    const r = M.joinTree({ n: 2, g: "G" }, { "t~1": { g: "G", folders: [] } });
    eq([r.ok, r.reason], [false, "piece-missing"]);
  });
  run("tree: a folder id twice is kept once", () => eq(M.joinTree({ folders: [{ id: "a", n: "1" }, { id: "a", n: "2" }] }).tree.folders.map((f) => f.n), ["1"]));
  run("big note: pieces of the same g are joined in order; another g, a missing piece or a wrong count gives null", () => {
    const d = { id: "x", parts: 2, g: "G", content: "" };
    eq(M.joinNoteParts(d, [{ d: "ab", g: "G" }, { d: "cd", g: "G" }]), "abcd");
    eq(M.joinNoteParts(d, [{ d: "ab", g: "G" }, { d: "cd", g: "H" }]), null);
    eq(M.joinNoteParts(d, [{ d: "ab", g: "G" }, null]), null);
    eq(M.joinNoteParts(d, [{ d: "ab", g: "G" }]), null);
  });
  run("notes: a note goes in; a big note asks for its pieces, then goes in with the joined content", () => {
    let c = M.emptyCopy("nb");
    c = M.applyNoteDoc(c, "n~a", { id: "a", title: "A", content: "<p>x</p>", folderIds: ["f"], at: TS(5) }).copy;
    eq(c.notes.a.content, "<p>x</p>");
    const big = { id: "b", title: "B", parts: 2, g: "G", content: "", at: TS(6) };
    const r1 = M.applyNoteDoc(c, "n~b", big);
    eq([r1.needParts, r1.changed, !!r1.copy.notes.b], [true, false, false]);
    const r2 = M.applyNoteDoc(c, "n~b", big, "<p>joined</p>");
    eq(r2.copy.notes.b.content, "<p>joined</p>");
  });
  run("notes: last `at` wins -- an older doc changes nothing; the same `at` replaces", () => {
    let c = M.applyNoteDoc(M.emptyCopy("nb"), "n~a", { id: "a", title: "new", at: TS(20) }).copy;
    const older = M.applyNoteDoc(c, "n~a", { id: "a", title: "old", at: TS(10) });
    eq([older.changed, older.copy.notes.a.title], [false, "new"]);
    eq(M.applyNoteDoc(c, "n~a", { id: "a", title: "same-at", at: TS(20) }).copy.notes.a.title, "same-at");
  });
  run("notes: gone:true removes the note; an older doc after it does not bring it back; a newer one does", () => {
    let c = M.applyNoteDoc(M.emptyCopy("nb"), "n~a", { id: "a", title: "A", at: TS(10) }).copy;
    c = M.applyNoteDoc(c, "n~a", { id: "a", gone: true, at: TS(20) }).copy;
    eq(Object.keys(c.notes), []);
    eq(Object.keys(M.applyNoteDoc(c, "n~a", { id: "a", title: "A", at: TS(15) }).copy.notes), []);
    eq(Object.keys(M.applyNoteDoc(c, "n~a", { id: "a", title: "A2", at: TS(30) }).copy.notes), ["a"]);
  });
  run("notes: a doc whose id does not match its note is ignored", () => eq(M.applyNoteDoc(M.emptyCopy("nb"), "n~other", { id: "a", at: TS(1) }).changed, false));
  run("notes: the old copy is never changed in place", () => {
    const c = M.emptyCopy("nb"); M.applyNoteDoc(c, "n~a", { id: "a", at: TS(1) }); eq(Object.keys(c.notes), []);
  });
  run("cursor: the largest `at` seen, by notes, gone notes, the tree and t~ pieces", () => {
    let c = M.emptyCopy("nb");
    c = M.applyNoteDoc(c, "n~a", { id: "a", at: TS(40) }).copy; eq(c.cursor, 40);
    c = M.applyNoteDoc(c, "n~b", { id: "b", gone: true, at: TS(50) }).copy; eq(c.cursor, 50);
    c = M.applyTree(c, M.joinTree({ at: TS(60), folders: [] }).tree).copy; eq(c.cursor, 60);
    c = M.seeAt(c, TS(70)); eq(c.cursor, 70);
    c = M.seeAt(c, TS(5)); eq(c.cursor, 70);
  });
  run("tree: an older tree does not replace a newer one", () => {
    let c = M.applyTree(M.emptyCopy("nb"), M.joinTree({ at: TS(20), folders: [{ id: "new" }] }).tree).copy;
    const r = M.applyTree(c, M.joinTree({ at: TS(10), folders: [{ id: "old" }] }).tree);
    eq([r.changed, r.copy.tree.folders[0].id], [false, "new"]);
  });
  run("view: folders nest and sort by o then name; notes newest first; a note in two folders is in both", () => {
    let c = M.applyTree(M.emptyCopy("nb"), M.joinTree({ folders: [
      { id: "b", n: "Beta", p: null, o: 2 }, { id: "a", n: "Alpha", p: null, o: 2 }, { id: "z", n: "Zed", p: null, o: 1 }, { id: "a1", n: "Child", p: "a", o: 0 },
    ] }).tree).copy;
    c = M.applyNoteDoc(c, "n~n1", { id: "n1", title: "old", folderIds: ["a", "a1"], updatedAt: "2026-01-01" }).copy;
    c = M.applyNoteDoc(c, "n~n2", { id: "n2", title: "new", folderIds: ["a", "elsewhere"], updatedAt: "2026-02-01" }).copy;
    const v = M.folderView(c);
    eq(v.roots.map((r) => r.folder.id), ["z", "a", "b"]);
    eq(v.roots[1].children.map((r) => r.folder.id), ["a1"]);
    eq(v.roots[1].notes.map((n) => n.id), ["n2", "n1"]);
    eq(v.roots[1].children[0].notes.map((n) => n.id), ["n1"]);
    eq([v.folderCount, v.noteCount, v.loose.length], [4, 2, 0]);
  });
  run("view: a folder whose parent is not in the set sits at the top, never lost", () => {
    // ...and in its own place among the top folders (by o), not merely appended at the end
    const c = M.applyTree(M.emptyCopy("nb"), M.joinTree({ folders: [{ id: "a", n: "A", o: 2 }, { id: "x", n: "X", p: "trashed-parent", o: 1 }] }).tree).copy;
    eq(M.folderView(c).roots.map((r) => r.folder.id), ["x", "a"]);
  });
  run("view: a parent loop is broken and both folders are still shown", () => {
    const c = M.applyTree(M.emptyCopy("nb"), M.joinTree({ folders: [{ id: "p", n: "P", p: "q" }, { id: "q", n: "Q", p: "p" }] }).tree).copy;
    const v = M.folderView(c);
    const all = []; const walk = (ns) => ns.forEach((n) => { all.push(n.folder.id); walk(n.children); });
    walk(v.roots); eq(all.sort(), ["p", "q"]);
  });
  run("view: a note in no folder of the set is loose", () => {
    const c = M.applyNoteDoc(M.applyTree(M.emptyCopy("nb"), M.joinTree({ folders: [{ id: "f", n: "F" }] }).tree).copy, "n~l", { id: "l", title: "L", folderIds: ["nope"] }).copy;
    eq(M.folderView(c).loose.map((n) => n.id), ["l"]);
  });
  run("device copy: a stored copy reads back; another notebook, another version or garbage gives an empty one", () => {
    let c = M.applyNoteDoc(M.emptyCopy("nb"), "n~a", { id: "a", title: "A", at: TS(3) }).copy;
    c = M.applyTree(c, M.joinTree({ at: TS(4), folders: [{ id: "f", n: "F" }] }).tree).copy;
    const back = M.parseCopy(JSON.stringify(c), "nb");
    eq([Object.keys(back.notes), back.tree.folders.map((f) => f.id), back.cursor], [["a"], ["f"], 4]);
    eq(Object.keys(M.parseCopy(JSON.stringify(c), "other").notes), []);
    eq(M.parseCopy({ ...c, v: 99 }, "nb").cursor, 0);
    eq(M.parseCopy("{not json", "nb").cursor, 0);
  });
  run("pictures: <img data-pic=sha256 data-mime> is found in order; anything else is not", () => {
    const sha = "a".repeat(64), sha2 = "b".repeat(64);
    eq(M.pictureRefs(`<p>x</p><img class="ed-img" data-pic="${sha}" data-mime="image/png" alt=""><img data-pic="short"><img data-pic='${sha2}'>`),
      [{ sha, mime: "image/png" }, { sha: sha2, mime: "" }]);
  });
  run("pictures: the bytes must have the smaller copy's sha when `sm` is set; a wrong meta is refused", () => {
    const sha = "a".repeat(64), sm = "c".repeat(64);
    eq(M.picturePlan(sha, { p: 2, n: 10, t: "image/webp", sm }).want, sm);
    eq(M.picturePlan(sha, { p: 1 }).want, sha);
    let threw = 0;
    for (const bad of [null, { p: 0 }, { p: 6000 }, { p: "x" }]) { try { M.picturePlan(sha, bad); } catch { threw++; } }
    try { M.picturePlan("nope", { p: 1 }); } catch { threw++; }
    eq(threw, 5);
  });
  run("pictures: bytes of the wrong size or the wrong sha are refused; the right ones pass", () => {
    const plan = M.picturePlan("a".repeat(64), { p: 1, n: 3 });
    eq([M.pictureBytesOk(plan, 3, "a".repeat(64)), M.pictureBytesOk(plan, 4, "a".repeat(64)), M.pictureBytesOk(plan, 3, "b".repeat(64))], [true, false, false]);
  });
  run("refusal: permission-denied is recognised in its shapes, other errors are not", () => {
    eq([M.isPermissionDenied({ code: "permission-denied" }), M.isPermissionDenied({ message: "Missing or insufficient permissions." }), M.isPermissionDenied({ code: "unavailable" }), M.isPermissionDenied(null)], [true, true, false, false]);
  });
  run("retry: never sooner than a minute after the last try; the first try is always allowed", () => {
    eq([M.mayRetry(0, 5), M.mayRetry(1000, 1000 + 59999), M.mayRetry(1000, 1000 + 60000), M.MMJ_RETRY_MS], [true, false, true, 60000]);
  });
  return out;
}

// -------------------------------------------------------------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mmj-model-"));
let seq = 0;
async function load(src) { const f = path.join(tmp, `m${++seq}.mjs`); fs.writeFileSync(f, src); return import(pathToFileURL(f).href); }

console.log("\n=== the model, as shipped ===");
const M = await load(MODEL_SRC);
const real = behaviour(M);
check("POSITIVE CONTROL the behaviour runner really runs (it found more than 25 checks, and a broken module fails them)", () => {
  ok(Object.keys(real).length > 25, `only ${Object.keys(real).length}`);
  const broken = behaviour({});
  ok(Object.values(broken).every((v) => v !== true), "an empty module passed something");
});
for (const [name, r] of Object.entries(real)) check(name, () => { if (r !== true) throw new Error(r); });

console.log("\n=== wiring ===");
const staticImports = (src) => [...strip(src).matchAll(/^\s*import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
function wiring(model, data, link) {
  const o = {};
  const run = (n, fn) => { try { const r = fn(); if (r === false) throw new Error("false"); o[n] = true; } catch (e) { o[n] = e.message; } };
  run("the model imports nothing, and names no network or storage", () => {
    const s = strip(model);
    eq(staticImports(model), []); ok(!/import\s*\(/.test(s), "a dynamic import");
    for (const w of ["fetch(", "indexedDB", "localStorage", "XMLHttpRequest", "firebase"]) ok(!s.includes(w), `names ${w}`);
  });
  run("POSITIVE CONTROL the write scan reads the data module (it finds getDoc and onSnapshot)", () => ok(/fs\.getDoc\(/.test(strip(data)) && /fs\.onSnapshot\(/.test(strip(data)), "reads not found"));
  run("the data module NEVER writes anything of Siyagah's", () => {
    const s = strip(data);
    for (const w of ["setDoc", "updateDoc", "deleteDoc", "addDoc", "writeBatch", "runTransaction", "arrayUnion", "serverTimestamp", "deleteField", ".commit("]) ok(!s.includes(w), `names ${w}`);
  });
  run("the data module's only static import is the model; Firestore comes by dynamic import", () => {
    eq(staticImports(data), ["./siyagah-mmj-model.js"]);
    ok(/await import\(`\$\{SDK\}firebase-firestore\.js`\)/.test(data), "no dynamic Firestore import");
  });
  run("the data module listens with where('at','>',cursor).orderBy('at') on notebooks/{nb}/mmj", () => {
    ok(/fs\.where\("at", ">", new Date\(Math\.floor\(copy\.cursor\)\)\), fs\.orderBy\("at"\)/.test(data), "the cursor query is not as the contract says");
    ok(/`notebooks\/\$\{nb\}\/mmj`/.test(data) && /`notebooks\/\$\{nb\}\/mmjparts`/.test(data), "paths");
  });
  run("the hook loads the reader, the model and the sanitiser only by dynamic import, and only for a signed-in user", () => {
    eq(staticImports(link).sort(), ["./i18n.js", "./siyagah-cloud-readiness.js"]);
    ok(/import\("\.\/siyagah-mmj-data\.js"\)/.test(link) && /import\("\.\/note-sanitize\.js"\)/.test(link), "dynamic imports missing");
  });
  run("a note's content reaches the page only through the sanitiser", () => {
    // The content (a note's `html`) is written twice: into an INERT <template> (nothing loads or runs there) to swap its
    // pictures for tokens, then into the page through sanitize(). Any other write of it is a hole.
    const sets = [...strip(link).matchAll(/(\w+)\.innerHTML\s*=\s*([^;]+);/g)].filter((m) => /\bhtml\b|\.content\b|tpl\.innerHTML/.test(m[2]));
    ok(/const tpl = document\.createElement\("template"\);/.test(link), "the template is not a <template>");
    eq(sets.map((m) => `${m[1]}=${m[2].trim()}`), ['tpl=String(html || "")', "el=sanitize(tpl.innerHTML)"], "content writes");
  });
  return o;
}
const realWiring = wiring(MODEL_SRC, DATA_SRC, LINK_SRC);
for (const [name, r] of Object.entries(realWiring)) check(name, () => { if (r !== true) throw new Error(r); });

function graph(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return seen;
  seen.add(file);
  const src = strip(read(file));
  const specs = file.endsWith(".html")
    ? [...src.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]).concat([...src.matchAll(/^\s*import\s+(?:[^"';]*?\s+from\s+)?["'](\.[^"']+)["']/gm)].map((m) => m[1]))
    : staticImports(src).filter((s) => s.startsWith("."));
  for (const s of specs) graph(path.normalize(path.join(path.dirname(file), s.split("?")[0])), seen);
  return seen;
}
const pages = fs.readdirSync("app").filter((f) => f.endsWith(".html") && !f.startsWith("_prev"));
check("POSITIVE CONTROL the walker reaches the hook from journey-map.html", () => ok(graph("app/journey-map.html").has(path.normalize("app/js/siyagah-map-link.js"))));
check("no page reaches the reader or the model through static imports (I9: they load only when the Map connects)", () => {
  const hit = pages.filter((f) => { const g = graph(`app/${f}`); return g.has(path.normalize("app/js/siyagah-mmj-data.js")) || g.has(path.normalize("app/js/siyagah-mmj-model.js")); });
  eq(hit, []);
});

// -------------------------------------------------------------------------------------------------------------------
console.log("\n=== mutations (each must turn its named check red) ===");
function mutate(src, a, b) {
  const n = src.split(a).length - 1;
  if (!n) throw new Error(`mutation anchor missing: ${a}`);
  return { src: src.split(a).join(b), n };
}
const MUTATIONS = [
  ["no-dot-encoding", 'encodeURIComponent(String(noteId)).replace(/\\./g, "%2E")', "encodeURIComponent(String(noteId))", "ids: a note's doc id is encodeURIComponent with '.' as %2E"],
  ["join-any-generation", 'if (p.g !== t0.g) return { ok: false, reason: "piece-generation" };', "", "tree: a piece of ANOTHER generation is refused (a write is in progress), never half-joined"],
  ["join-missing-piece", 'if (!p || !Array.isArray(p.folders)) return { ok: false, reason: "piece-missing" };', "if (!p) continue;", "tree: a missing piece is refused"],
  ["parts-any-generation", 'p.g !== want.g', "false", "big note: pieces of the same g are joined in order; another g, a missing piece or a wrong count gives null"],
  ["ignore-at", "if (at < heldAt) return { copy, changed: false, needParts: false };", "", "notes: last `at` wins -- an older doc changes nothing; the same `at` replaces"],
  ["gone-kept", "const notes = { ...copy.notes }; delete notes[id];", "const notes = { ...copy.notes };", "notes: gone:true removes the note; an older doc after it does not bring it back; a newer one does"],
  ["big-note-without-parts", "if (noteParts(data) && typeof content !== \"string\") return { copy, changed: false, needParts: true };", "", "notes: a note goes in; a big note asks for its pieces, then goes in with the joined content"],
  ["cursor-stuck", "cursor: Math.max(copy.cursor, at)", "cursor: copy.cursor", "cursor: the largest `at` seen, by notes, gone notes, the tree and t~ pieces"],
  ["older-tree-wins", "if (copy.tree && tree.at < copy.tree.at) return { copy, changed: false };", "", "tree: an older tree does not replace a newer one"],
  ["orphan-lost", "const parent = f.p && ids.has(f.p) && f.p !== f.id ? f.p : null;", "const parent = f.p || null;", "view: a folder whose parent is not in the set sits at the top, never lost"],
  ["loop-hidden", "if (!placed.has(f.id)) { placed.add(f.id); roots.push(", "if (false) { placed.add(f.id); roots.push(", "view: a parent loop is broken and both folders are still shown"],
  ["sm-ignored", "want: sm || sha", "want: sha", "pictures: the bytes must have the smaller copy's sha when `sm` is set; a wrong meta is refused"],
  ["trust-bytes", 'return typeof hex === "string" && hex === plan.want;', "return true;", "pictures: bytes of the wrong size or the wrong sha are refused; the right ones pass"],
  ["retry-loop", "return !(Number.isFinite(lastTryMs) && lastTryMs > 0) || nowMs - lastTryMs >= gap;", "return true;", "retry: never sooner than a minute after the last try; the first try is always allowed"],
  ["other-notebook-copy", "c.nb !== String(nb || \"\")", "false", "device copy: a stored copy reads back; another notebook, another version or garbage gives an empty one"],
];
for (const [label, a, b, target] of MUTATIONS) {
  ok(real[target] === true, `the target "${target}" is not a real passing check`);
  const { src, n } = mutate(MODEL_SRC, a, b);
  const r = behaviour(await load(src));
  check(`mutation ${label} (${n} occurrence${n > 1 ? "s" : ""}) turns "${target}" red`, () => { if (r[target] === true) throw new Error("it stayed green"); });
}
const WIRING_MUTATIONS = [
  ["data-writes", DATA_SRC.replace("const s0 = await fs.getDoc(", "await fs.setDoc(fs.doc(db, MMJ, \"x\"), {}); const s0 = await fs.getDoc("), "the data module NEVER writes anything of Siyagah's", "data"],
  ["model-imports", 'import "./firebase-init.js";\n' + MODEL_SRC, "the model imports nothing, and names no network or storage", "model"],
  ["static-reader", LINK_SRC.replace('import { t, num } from "./i18n.js";', 'import { t, num } from "./i18n.js";\nimport "./siyagah-mmj-data.js";'), "the hook loads the reader, the model and the sanitiser only by dynamic import, and only for a signed-in user", "link"],
  ["unsanitised", LINK_SRC.replace("el.innerHTML = sanitize(tpl.innerHTML);", "el.innerHTML = tpl.innerHTML;"), "a note's content reaches the page only through the sanitiser", "link"],
  ["no-cursor", DATA_SRC.replace('fs.where("at", ">", new Date(Math.floor(copy.cursor))), ', ""), "the data module listens with where('at','>',cursor).orderBy('at') on notebooks/{nb}/mmj", "data"],
];
for (const [label, src, target, which] of WIRING_MUTATIONS) {
  const orig = { model: MODEL_SRC, data: DATA_SRC, link: LINK_SRC }[which];
  if (src === orig) throw new Error(`wiring mutation ${label} changed nothing`);
  const r = wiring(which === "model" ? src : MODEL_SRC, which === "data" ? src : DATA_SRC, which === "link" ? src : LINK_SRC);
  check(`mutation ${label} turns "${target}" red`, () => { if (r[target] === true) throw new Error("it stayed green"); });
}

console.log(`\n==== Siyagah MMJ model (J112 R1): ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
