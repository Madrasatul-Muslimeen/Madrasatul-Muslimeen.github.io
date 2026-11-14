// PCF MSA J104 item 25 (the Owner, 13 Nov 2026): Dua groups are a TREE the person drags to any level (at most 3 levels),
// renames, adds to and really deletes. This module is PURE: no imports, no network, no storage, no DOM. It only knows how to
// change a tree and refuse a change that breaks a rule, so the same rules guard the screen, the writer and the tests.
//
// A tree is an array of nodes { id, name: { en, bn? }, kids: [] } (I11: names are language-keyed). Ids are permanent (I5):
// a rename or a move never changes an id, so a dua placed in "g-ab12cd34" stays there.
//
// DELETE (the Owner chose "real delete", and D6 still holds): removeGroup takes the node and the groups inside it OUT of the
// tree. Nothing here deletes a document and no dua is touched; a dua keeps all its own data. The tree is saved by writing the
// whole tree without the node, like clearing a memorising mark in duaPlans.
//
// Every function returns a NEW tree and leaves its input alone, and answers { ok: true, tree, ... } or { ok: false, refused }.

export const MAX_DEPTH = 3;
export const MAX_NODES = 200;
export const MAX_NAME = 60;
export const GROUP_ID = /^g-[a-z0-9]{8}$/;

const clone = (t) => JSON.parse(JSON.stringify(t));

/** A fresh permanent id, "g-" and eight lowercase letters or digits. `rand` is injectable so a test can be exact. */
export function newGroupId(rand = Math.random) {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "g-";
  for (let i = 0; i < 8; i++) s += a[Math.floor(rand() * a.length) % a.length];
  return s;
}

/** Pure: a clean { en, bn? } name, or null when English is empty or any text is over MAX_NAME. */
export function cleanName(name) {
  const en = String(name?.en ?? "").trim();
  if (!en || en.length > MAX_NAME) return null;
  const out = { en };
  if (name.bn !== undefined && name.bn !== null && String(name.bn).trim() !== "") {
    const bn = String(name.bn).trim();
    if (bn.length > MAX_NAME) return null;
    out.bn = bn;
  }
  return out;
}

/** Height of one node: 1 for a node with no kids, 2 for one with kids that have none, and so on. */
export function height(node) {
  return 1 + (node.kids || []).reduce((m, k) => Math.max(m, height(k)), 0);
}

export function countNodes(tree) {
  return tree.reduce((n, x) => n + 1 + countNodes(x.kids || []), 0);
}

/** Finds a node: { node, list, index, parent, level } (level 1 is the top), or null. */
export function find(tree, id, parent = null, level = 1) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return { node: tree[i], list: tree, index: i, parent, level };
    const r = find(tree[i].kids || [], id, tree[i], level + 1);
    if (r) return r;
  }
  return null;
}

const containsId = (node, id) => node.id === id || (node.kids || []).some((k) => containsId(k, id));

export const MAX_DUAS_PER_GROUP = 500;
export const MAX_DUAS_IN_TREE = 5000;

/**
 * Pure: a validated deep copy of a tree, or null when it is not one (bad node, duplicate id, too deep, too many).
 * A PERSON'S groups ("My groups") also carry `duas`, a list of dua keys on each node (the Owner's membership home for them): it is kept
 * only when the caller hands in `opts.isKey` (this module imports nothing, so it cannot know the key forms), each key must pass it and
 * be unique inside its group, and the limits are MAX_DUAS_PER_GROUP a group and MAX_DUAS_IN_TREE in all. Without `isKey` a `duas` list
 * is dropped, as before. `opts.noDuas` refuses a tree that carries any (the madrasah's groups keep their membership in duaEdits).
 */
export function cleanTree(tree, opts = {}) {
  if (!Array.isArray(tree)) return null;
  const seen = new Set();
  let n = 0, duasTotal = 0;
  const walk = (list, level) => {
    if (!Array.isArray(list) || (list.length && level > MAX_DEPTH)) return null;
    const out = [];
    for (const x of list) {
      if (!x || typeof x !== "object" || !GROUP_ID.test(String(x.id)) || seen.has(x.id)) return null;
      const name = cleanName(x.name);
      if (!name || ++n > MAX_NODES) return null;
      seen.add(x.id);
      let duas;
      if (x.duas !== undefined) {
        if (opts.noDuas) return null;
        if (opts.isKey) {
          if (!Array.isArray(x.duas) || x.duas.length > MAX_DUAS_PER_GROUP || new Set(x.duas).size !== x.duas.length || !x.duas.every((k) => typeof k === "string" && opts.isKey(k))) return null;
          duasTotal += x.duas.length;
          if (duasTotal > MAX_DUAS_IN_TREE) return null;
          duas = [...x.duas];
        }
      }
      const kids = walk(x.kids ?? [], level + 1);
      if (!kids) return null;
      out.push(duas === undefined ? { id: x.id, name, kids } : { id: x.id, name, kids, duas });
    }
    return out;
  };
  return walk(tree, 1);
}

/** Adds a new group (name = { en, bn? }) at the end of the top level, or inside `parentId`. */
export function addGroup(tree, parentId, name, id = newGroupId()) {
  const nm = cleanName(name);
  if (!nm) return { ok: false, refused: "bad-name" };
  const t = clone(tree);
  if (find(t, id)) return { ok: false, refused: "duplicate-id" };
  if (countNodes(t) >= MAX_NODES) return { ok: false, refused: "too-many" };
  const node = { id, name: nm, kids: [] };
  if (parentId === null || parentId === undefined) { t.push(node); return { ok: true, tree: t, id }; }
  const p = find(t, parentId);
  if (!p) return { ok: false, refused: "no-such-group" };
  if (p.level + 1 > MAX_DEPTH) return { ok: false, refused: "too-deep" };
  p.node.kids.push(node);
  return { ok: true, tree: t, id };
}

export function renameGroup(tree, id, name) {
  const nm = cleanName(name);
  if (!nm) return { ok: false, refused: "bad-name" };
  const t = clone(tree), f = find(t, id);
  if (!f) return { ok: false, refused: "no-such-group" };
  f.node.name = nm;
  return { ok: true, tree: t };
}

/**
 * Moves group `id` relative to `targetId`: zone "before" or "after" makes it that group's sibling, "inside" makes it that
 * group's last kid. Refused when the target is the group itself or inside it (a group cannot go into its own kids), or when
 * the result would be more than MAX_DEPTH levels deep (the moved group brings its own kids with it).
 */
export function moveGroup(tree, id, targetId, zone) {
  if (!["before", "after", "inside"].includes(zone)) return { ok: false, refused: "bad-zone" };
  const t = clone(tree), src = find(t, id), dst = find(t, targetId);
  if (!src || !dst) return { ok: false, refused: "no-such-group" };
  if (containsId(src.node, targetId)) return { ok: false, refused: "into-itself" };
  const newLevel = zone === "inside" ? dst.level + 1 : dst.level;
  if (newLevel + height(src.node) - 1 > MAX_DEPTH) return { ok: false, refused: "too-deep" };
  src.list.splice(src.index, 1);
  const d2 = find(t, targetId); // indexes may have shifted after the removal
  if (zone === "inside") d2.node.kids.push(src.node);
  else d2.list.splice(d2.index + (zone === "after" ? 1 : 0), 0, src.node);
  return { ok: true, tree: t };
}

/** Moves a group to the end of the top level (for a drop on empty space). */
export function moveToTop(tree, id) {
  const t = clone(tree), src = find(t, id);
  if (!src) return { ok: false, refused: "no-such-group" };
  src.list.splice(src.index, 1);
  t.push(src.node);
  return { ok: true, tree: t };
}

/** Real delete: takes the group and the groups inside it out of the tree. `removed` lists every id taken out. */
export function removeGroup(tree, id) {
  const t = clone(tree), f = find(t, id);
  if (!f) return { ok: false, refused: "no-such-group" };
  const removed = [];
  const collect = (n) => { removed.push(n.id); (n.kids || []).forEach(collect); };
  collect(f.node);
  f.list.splice(f.index, 1);
  return { ok: true, tree: t, removed };
}
