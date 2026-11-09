// Builds output/learn-next-levels.json (MSA · QR J133): the Learn next list at two more levels, derived ONLY from files
// already in output/ (no network, nothing invented). Run from the repository root:
//   node tools/quran-data-pull/build-learn-next-levels.mjs
//   family = one row per meaning group (lemma-meaning-groups.json byLemma) or per lone lemma, i.e. exactly the key a
//            Family (basic) claim is stored under (claimKeyFor).
//   root   = one row per root (roots-index.json), the key Root, Taṣrīf and Depth claims are stored under.
// Same row shape as learn-next.json: r rank, l claim key, n occurrences, p running % of the Qur'an, e/b meaning of the
// commonest word in it, o its first occurrence; plus a (the Arabic shown: that commonest word, or the root letters)
// and k (how many dictionary words it holds). Ordered by n, ties by the key text.
import fs from "node:fs";
const OUT = "tools/quran-data-pull/output/";
const read = (f) => JSON.parse(fs.readFileSync(OUT + f, "utf8"));
const ln = read("learn-next.json");
const groups = read("lemma-meaning-groups.json").byLemma ?? {};
const roots = read("roots-index.json").values;
const lemmas = read("lemmas-index.json").values;

const rootOfOcc = new Map();
for (const [root, refs] of Object.entries(roots)) for (const o of refs) rootOfOcc.set(o, root);
const rootOfLemma = new Map();
for (const [lemma, refs] of Object.entries(lemmas)) { const r = refs.map((o) => rootOfOcc.get(o)).find(Boolean); if (r) rootOfLemma.set(lemma, r); }

function fold(keyOf, label) {
  const by = new Map();
  for (const row of ln.rows) {
    const key = keyOf(row.l);
    if (!key) continue;
    const e = by.get(key);
    if (!e) by.set(key, { key, n: row.n, o: row.o, k: 1, top: row });
    else { e.n += row.n; e.k += 1; e.o = Math.min(e.o, row.o); }
  }
  const list = [...by.values()].sort((a, b) => b.n - a.n || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  let running = 0;
  return list.map((e, i) => {
    running += e.n;
    const r = { r: i + 1, l: e.key, a: label(e), n: e.n, p: Math.round((running / ln.total) * 1000) / 10, e: e.top.e, b: e.top.b, o: e.o, k: e.k };
    return r;
  });
}
const family = fold((l) => groups[l] || l, (e) => e.top.l);
const root = fold((l) => rootOfLemma.get(l) ?? null, (e) => e.key);
const doc = { contract: "learn-next-levels:v1", total: ln.total, family: { count: family.length, rows: family }, root: { count: root.length, rows: root } };
fs.writeFileSync(OUT + "learn-next-levels.json", JSON.stringify(doc));
console.log(`family ${family.length} rows (last p ${family.at(-1).p}), root ${root.length} rows (last p ${root.at(-1).p}), ${fs.statSync(OUT + "learn-next-levels.json").size} bytes`);
