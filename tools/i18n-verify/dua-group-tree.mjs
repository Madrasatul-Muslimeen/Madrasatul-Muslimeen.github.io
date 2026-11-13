// PCF MSA J104 item 25 (13 Nov 2026) -- the Dua group tree, app/js/dua-group-tree.js. PURE module, so the suite imports it
// directly. Halves: 1. NOT WIRED (no page reaches it yet, with a positive control); 2. BEHAVIOUR of add / rename / move /
// remove / cleanTree, including every refusal, each paired with an allow that differs in ONE fact; 3. a failed call leaves the
// tree untouched, and the module deletes nothing (D6). Run from the repository root.
//   --mutate=nodepth    moves/adds ignore MAX_DEPTH      --mutate=nocycle   a group may move into its own kids
//   --mutate=keepkids   removeGroup leaves the kids behind in the tree
//   --mutate=nokeycheck a person's `duas` keys are not checked (isKey ignored)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root = process.cwd(), appDir = path.join(root, "app"), appJs = path.join(appDir, "js");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let passed = 0, failed = 0;
const check = (name, fn) => { try { const r = fn(); if (r && typeof r.then === "function") throw new TypeError("sync check given a promise"); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } };

// --- 1. NOT WIRED AT START-UP (I9) --- (step 6b, 13 Nov 2026: the module is now reached ONLY through one lazy import() in dua-study.js, opened by a button;
// the walker below follows STATIC imports only, so the claim that matters stays checked: no page loads it before the button is pressed.)
const localImportsOf = (file) => [...fs.readFileSync(file, "utf8").matchAll(/(?:from\s*|import\s+)["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
const entryModulesOf = (html) => [...fs.readFileSync(html, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir).filter((x) => x.endsWith(".html"))) {
    const seen = new Set(); const queue = entryModulesOf(path.join(appDir, entry)).map((m) => [m]);
    while (queue.length) {
      const chain = queue.shift(), head = chain[chain.length - 1];
      if (seen.has(head)) continue; seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (fs.existsSync(full)) for (const n of localImportsOf(full)) queue.push([...chain, n]);
    }
  }
  return found;
}
check("POSITIVE CONTROL: the reachability walker finds a wired module (records.js)", () => assert.ok(chainsToTarget("records.js").length > 0));
check("the ONE lazy door: dua-study.js opens the groups pop-up with a dynamic import() of dua-groups-page.js, and no page imports that statically", () => { assert.match(fs.readFileSync(path.join(appJs, "dua-study.js"), "utf8"), /import\("\.\/dua-groups-page\.js"\)/); assert.deepEqual(chainsToTarget("dua-groups-page.js"), []); });
check("dua-group-tree.js is reachable from NO page by a STATIC import chain (it loads only when the Dua groups button is pressed: I9)", () => assert.deepEqual(chainsToTarget("dua-group-tree.js"), []));

// --- the module, with a throw-away mutated copy when --mutate is given ---
let file = path.join(appJs, "dua-group-tree.js"), tmp = null;
if (MUTATE) {
  let src = fs.readFileSync(file, "utf8"), n = 0;
  const swap = (a, b) => { const parts = src.split(a); n += parts.length - 1; src = parts.join(b); };
  if (MUTATE === "nodepth") { swap("if (p.level + 1 > MAX_DEPTH) return", "if (false) return"); swap("if (newLevel + height(src.node) - 1 > MAX_DEPTH) return", "if (false) return"); }
  else if (MUTATE === "nocycle") swap("if (containsId(src.node, targetId)) return", "if (false) return");
  else if (MUTATE === "keepkids") swap("f.list.splice(f.index, 1);\n  return { ok: true, tree: t, removed };", "f.list.splice(f.index, 1, ...f.node.kids);\n  return { ok: true, tree: t, removed };");
  else if (MUTATE === "nokeycheck") swap("!x.duas.every((k) => typeof k === \"string\" && opts.isKey(k))", "false");
  else throw new Error("unknown --mutate " + MUTATE);
  console.log(`  (mutation ${MUTATE}: ${n} occurrence(s) replaced)`); assert.ok(n > 0, "mutation matched nothing");
  tmp = path.join(appJs, "_mut-dua-group-tree.js"); fs.writeFileSync(tmp, src); file = tmp;
}
const m = await import(file + "?" + Date.now());
if (tmp) fs.unlinkSync(tmp);

let ctr = 0;
const id = () => "g-" + String(++ctr).padStart(8, "0").replace(/0/g, "a");
const names = (t) => t.map((x) => x.name.en + (x.kids.length ? "(" + names(x.kids) + ")" : "")).join(",");
const build = () => { // A( A1( A1x ), A2 ), B( B1 ), C
  let t = [];
  for (const [p, nm, key] of [[null, "A", "A"], ["A", "A1", "A1"], ["A1", "A1x", "A1x"], ["A", "A2", "A2"], [null, "B", "B"], ["B", "B1", "B1"], [null, "C", "C"]]) {
    const r = m.addGroup(t, p ? ids[p] : null, { en: nm }, (ids[key] = id())); assert.ok(r.ok, nm + " " + r.refused); t = r.tree;
  }
  return t;
}; const ids = {};
const T0 = build();
check("BUILD: the sample tree is A(A1(A1x),A2),B(B1),C", () => assert.equal(names(T0), "A(A1(A1x),A2),B(B1),C"));
check("ids: newGroupId makes a g- id that the id pattern accepts, and two calls differ", () => { const a = m.newGroupId(), b = m.newGroupId(); assert.match(a, m.GROUP_ID); assert.notEqual(a, b); });

// names
check("name: English is required; Bangla is optional and kept; both are trimmed", () => { assert.equal(m.cleanName({ en: "  " }), null); assert.deepEqual(m.cleanName({ en: " Morning ", bn: " সকাল " }), { en: "Morning", bn: "সকাল" }); assert.deepEqual(m.cleanName({ en: "x" }), { en: "x" }); });
check("name: 60 characters pass and 61 are refused", () => { assert.ok(m.cleanName({ en: "a".repeat(60) })); assert.equal(m.cleanName({ en: "a".repeat(61) }), null); });

// add
check("add: a top-level group goes last; one inside B goes last in B", () => { const r = m.addGroup(T0, null, { en: "D" }); assert.equal(names(r.tree), "A(A1(A1x),A2),B(B1),C,D"); assert.equal(names(m.addGroup(T0, ids.B, { en: "B2" }).tree), "A(A1(A1x),A2),B(B1,B2),C"); });
check("add: inside a level-3 group is refused (too deep); inside a level-2 group is allowed", () => { assert.equal(m.addGroup(T0, ids.A1x, { en: "z" }).refused, "too-deep"); assert.ok(m.addGroup(T0, ids.A1, { en: "z" }).ok); });
check("add: a bad name, an unknown parent and a duplicate id are refused", () => { assert.equal(m.addGroup(T0, null, { en: "" }).refused, "bad-name"); assert.equal(m.addGroup(T0, "g-zzzzzzzz", { en: "q" }).refused, "no-such-group"); assert.equal(m.addGroup(T0, null, { en: "q" }, ids.A).refused, "duplicate-id"); });
check("add: the 201st group is refused (too many)", () => { let t = []; for (let i = 0; i < m.MAX_NODES; i++) t = m.addGroup(t, null, { en: "n" + i }, "g-" + String(i).padStart(8, "0")).tree; assert.equal(m.countNodes(t), m.MAX_NODES); assert.equal(m.addGroup(t, null, { en: "x" }).refused, "too-many"); });

// rename
check("rename: changes the name and keeps the id, the place and the kids", () => { const r = m.renameGroup(T0, ids.A1, { en: "Hisn", bn: "হিসন" }); assert.equal(names(r.tree), "A(Hisn(A1x),A2),B(B1),C"); assert.equal(m.find(r.tree, ids.A1).node.id, ids.A1); });
check("rename: a bad name or an unknown group is refused", () => { assert.equal(m.renameGroup(T0, ids.A, { en: " " }).refused, "bad-name"); assert.equal(m.renameGroup(T0, "g-zzzzzzzz", { en: "q" }).refused, "no-such-group"); });

// move
check("move before: C before A", () => assert.equal(names(m.moveGroup(T0, ids.C, ids.A, "before").tree), "C,A(A1(A1x),A2),B(B1)"));
check("move after: A after C (sibling order, indexes after removal are re-read)", () => assert.equal(names(m.moveGroup(T0, ids.A, ids.C, "after").tree), "B(B1),C,A(A1(A1x),A2)"));
check("move inside: C inside B goes last in B", () => assert.equal(names(m.moveGroup(T0, ids.C, ids.B, "inside").tree), "A(A1(A1x),A2),B(B1,C)"));
check("move inside carries the kids: B inside A2 makes B level 3 with B1 level 4 -> refused; C inside A2 -> allowed", () => { assert.equal(m.moveGroup(T0, ids.B, ids.A2, "inside").refused, "too-deep"); assert.equal(names(m.moveGroup(T0, ids.C, ids.A2, "inside").tree), "A(A1(A1x),A2(C)),B(B1)"); });
check("move DEPTH: one fact differs: B (height 2) inside A1 is level 3+1 -> refused; B1 (height 1) inside A1 -> allowed", () => { assert.equal(m.moveGroup(T0, ids.B, ids.A1, "inside").refused, "too-deep"); assert.equal(names(m.moveGroup(T0, ids.B1, ids.A1, "inside").tree), "A(A1(A1x,B1),A2),B,C"); });
check("move DEPTH: a sibling drop next to a level-3 group is allowed for a lone group, refused for one with kids", () => { assert.ok(m.moveGroup(T0, ids.C, ids.A1x, "after").ok); assert.equal(m.moveGroup(T0, ids.B, ids.A1x, "after").refused, "too-deep"); });
check("move CYCLE: a group cannot go inside itself or inside its own kids; a sibling can go inside it", () => { assert.equal(m.moveGroup(T0, ids.A, ids.A, "inside").refused, "into-itself"); assert.equal(m.moveGroup(T0, ids.A, ids.A1x, "inside").refused, "into-itself"); assert.equal(m.moveGroup(T0, ids.A, ids.A1x, "before").refused, "into-itself"); assert.ok(m.moveGroup(T0, ids.C, ids.A, "inside").ok); });
check("move: a bad zone and an unknown id are refused", () => { assert.equal(m.moveGroup(T0, ids.A, ids.B, "sideways").refused, "bad-zone"); assert.equal(m.moveGroup(T0, "g-zzzzzzzz", ids.B, "after").refused, "no-such-group"); });
check("move to top: A1 goes to the end of the top level with its kid", () => assert.equal(names(m.moveToTop(T0, ids.A1).tree), "A(A2),B(B1),C,A1(A1x)"));

// remove
check("REAL DELETE: removing A takes A, A1, A1x and A2 out and lists all four ids", () => { const r = m.removeGroup(T0, ids.A); assert.equal(names(r.tree), "B(B1),C"); assert.deepEqual(r.removed.sort(), [ids.A, ids.A1, ids.A1x, ids.A2].sort()); });
check("REAL DELETE: nothing of the removed group stays anywhere in the tree (kids are not left behind)", () => { const r = m.removeGroup(T0, ids.A); for (const i of r.removed) assert.equal(m.find(r.tree, i), null, i + " still in the tree"); });
check("REAL DELETE: removing a leaf removes only the leaf; an unknown id is refused", () => { assert.equal(names(m.removeGroup(T0, ids.B1).tree), "A(A1(A1x),A2),B,C"); assert.equal(m.removeGroup(T0, "g-zzzzzzzz").refused, "no-such-group"); });

// purity and cleanTree
check("PURE: no call changes its input tree, and a refused call returns no tree", () => { const before = JSON.stringify(T0); m.addGroup(T0, ids.B, { en: "x" }); m.renameGroup(T0, ids.A, { en: "y" }); m.moveGroup(T0, ids.A, ids.C, "after"); m.removeGroup(T0, ids.A); assert.equal(JSON.stringify(T0), before); assert.equal(m.moveGroup(T0, ids.A, ids.A1, "inside").tree, undefined); });
check("cleanTree: a good tree passes unchanged; the copy is not the same object", () => { const c = m.cleanTree(T0); assert.deepEqual(c, T0); assert.notEqual(c, T0); });
check("cleanTree: refuses a duplicate id, a bad id, a bad name, a 4-level tree and a non-array", () => {
  const dup = [{ id: "g-aaaaaaaa", name: { en: "a" }, kids: [{ id: "g-aaaaaaaa", name: { en: "b" }, kids: [] }] }];
  const bad = [{ id: "A", name: { en: "a" }, kids: [] }], noname = [{ id: "g-bbbbbbbb", name: {}, kids: [] }];
  const deep = [{ id: "g-00000001", name: { en: "1" }, kids: [{ id: "g-00000002", name: { en: "2" }, kids: [{ id: "g-00000003", name: { en: "3" }, kids: [{ id: "g-00000004", name: { en: "4" }, kids: [] }] }] }] }];
  for (const x of [dup, bad, noname, deep, "x", null]) assert.equal(m.cleanTree(x), null);
  assert.ok(m.cleanTree([...deep.slice(0, 1).map((n) => ({ ...n, kids: [{ ...n.kids[0], kids: [{ ...n.kids[0].kids[0], kids: [] }] }] }))]));
});
check("cleanTree: a missing kids list is read as empty; stray fields are dropped", () => { const c = m.cleanTree([{ id: "g-cccccccc", name: { en: "c" }, evil: 1 }]); assert.deepEqual(c, [{ id: "g-cccccccc", name: { en: "c" }, kids: [] }]); });
const isKey = (k) => /^([0-9]{1,6}|hisn-[0-9]{1,3}-[0-9]{1,3})$/.test(k);
const withDuas = (duas) => [{ id: "g-dddddd01", name: { en: "Mine" }, kids: [{ id: "g-dddddd02", name: { en: "Kid" }, kids: [], duas: ["7"] }], duas }];
check("MY GROUPS: without opts.isKey a `duas` list is dropped (as before); with it the lists are kept exactly", () => {
  assert.equal(m.cleanTree(withDuas(["12"]))[0].duas, undefined);
  const c = m.cleanTree(withDuas(["12", "hisn-27-5"]), { isKey });
  assert.deepEqual(c[0].duas, ["12", "hisn-27-5"]); assert.deepEqual(c[0].kids[0].duas, ["7"]);
});
check("MY GROUPS: a `duas` list with a bad key, a repeated key or a non-list is REFUSED (null); an empty list is fine", () => {
  for (const bad of [["abc"], ["12", "12"], "12", [12], [null]]) assert.equal(m.cleanTree(withDuas(bad), { isKey }), null, JSON.stringify(bad));
  assert.deepEqual(m.cleanTree(withDuas([]), { isKey })[0].duas, []);
});
check("MY GROUPS: 500 duas in a group pass and 501 are refused; 5000 in all pass and 5001 are refused", () => {
  const keys = (n, from = 1) => Array.from({ length: n }, (_, i) => String(from + i));
  assert.ok(m.cleanTree(withDuas(keys(500)), { isKey }), "500 refused"); assert.equal(m.cleanTree(withDuas(keys(501)), { isKey }), null);
  const many = (k) => Array.from({ length: 11 }, (_, i) => ({ id: "g-dddd" + String(i).padStart(4, "0"), name: { en: "g" + i }, kids: [], duas: keys(i < 10 ? 500 : k, i * 500 + 1) }));
  assert.ok(m.cleanTree(many(0), { isKey }), "exactly 5000 refused"); assert.equal(m.cleanTree(many(1), { isKey }), null);
});
check("THE MADRASAH'S GROUPS: opts.noDuas refuses any tree that carries a `duas` list (their membership lives in duaEdits.placements)", () => {
  assert.equal(m.cleanTree(withDuas(["12"]), { noDuas: true, isKey }), null);
  assert.ok(m.cleanTree([{ id: "g-dddddd01", name: { en: "A" }, kids: [] }], { noDuas: true }));
});
check("D6: the module source never names a delete of a document", () => { const s = fs.readFileSync(path.join(appJs, "dua-group-tree.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); assert.ok(!/deleteDoc|deleteField|\bimport\b/.test(s), "must import nothing and delete nothing"); });
console.log(`\n==== Dua group tree: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
