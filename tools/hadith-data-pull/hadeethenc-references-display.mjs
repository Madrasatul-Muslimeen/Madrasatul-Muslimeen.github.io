// HadeethEnc references for the card (PCF MSA J103, Round 3): what each HadeethEnc card shows under its "Narrated by"
// line. Reads Round 2's proven rows (references.json) and adds, for each, the chapter it sits in.
//
// Owner's choices (28 Oct 2026): 1A, the standard number as on sunnah.com (Muslim by Abdul-Baqi's); 2A, the Arabic
// chapter (kitab, and bab where the book has one) with the English book name where the standard edition gives one.
//
// WRITES output/hadeethenc-references/display/<floor(id/200)>.json, small shards so a card loads only its own:
//   { refs: { "<id>": [[book, cite, n|null, enBook|null, kitabAr|null, babAr|null], …] },
//     notFound: { "<id>": [book, …] } }      (books the line names whose number is not yet proven)
// Only status "proven" is ever written as a reference. Nothing is guessed.
//
// Usage (repository root): node tools/hadith-data-pull/hadeethenc-references-display.mjs --cache <dir>
//   <dir> holds the ara-<edition>.json files Round 2 downloaded (never committed).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS } from "./hadeethenc-references.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.join(__dirname, "output", "hadeethenc-references");
const SPLIT_DIR = path.join(__dirname, "output", "openiti-release", "split");
const EDITION = { bukhari: "bukhari", muslim: "muslim", abudawud: "abudawud", tirmidhi: "tirmidhi", nasai: "nasai", ibnmajah: "ibnmajah", malik: "malik" };
export const SHARD = 200;

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };

/** Pure: section_details + a standard number -> the section's English name, or null. */
export function englishBookFor(meta, standard) {
  if (!meta || standard == null) return null;
  const s = Math.floor(Number(standard));
  for (const [k, d] of Object.entries(meta.section_details ?? {})) {
    if (k !== "0" && d.hadithnumber_first <= s && s <= d.hadithnumber_last) return meta.sections?.[k] || null;
  }
  return null;
}

/** n -> { kitab, bab } for one OpenITI book, from its shards' paths (first and last heading levels). */
function chaptersOf(uri) {
  const index = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, "index.json"), "utf8"));
  const m = new Map();
  for (const ch of index.chapters) for (const f of ch.shardFiles) {
    const d = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, f), "utf8"));
    for (const h of d.hadiths) {
      const p = d.paths[h.p] ?? [];
      m.set(h.n, { kitab: p[0] || ch.title || null, bab: p.length > 1 ? p[p.length - 1] : null });
    }
  }
  return m;
}

function main() {
  const cache = arg("--cache");
  if (!cache) { console.error("usage: --cache <dir>"); process.exit(2); }
  const { rows } = JSON.parse(fs.readFileSync(path.join(REF_DIR, "references.json"), "utf8"));
  const meta = {};
  for (const [book, ed] of Object.entries(EDITION)) meta[book] = JSON.parse(fs.readFileSync(path.join(cache, `ara-${ed}.json`), "utf8")).metadata;
  const chapters = {};
  const shards = new Map();
  const shard = (id) => { const k = Math.floor(id / SHARD); if (!shards.has(k)) shards.set(k, { refs: {}, notFound: {} }); return shards.get(k); };
  let refs = 0, notFound = 0;
  for (const r of rows) {
    const s = shard(r.id);
    if (r.status !== "proven") { (s.notFound[r.id] ??= []).push(r.book); notFound++; continue; }
    const cite = r.cite ?? r.edition ?? null;
    if (cite == null) { (s.notFound[r.id] ??= []).push(r.book); notFound++; continue; }
    chapters[r.book] ??= chaptersOf(BOOKS[r.book]);
    const ch = r.n != null ? chapters[r.book].get(r.n) : null;
    (s.refs[r.id] ??= []).push([r.book, String(cite), r.n ?? null, englishBookFor(meta[r.book], r.standard), ch?.kitab ?? null, ch?.bab ?? null]);
    refs++;
  }
  // A book proven in one row and unproven in another (two narrations named) keeps only the proven one.
  for (const s of shards.values()) for (const [id, books] of Object.entries(s.notFound)) {
    const have = new Set((s.refs[id] ?? []).map((x) => x[0]));
    const left = [...new Set(books)].filter((b) => !have.has(b));
    if (left.length) s.notFound[id] = left; else delete s.notFound[id];
  }
  const dir = path.join(REF_DIR, "display");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, s] of shards) fs.writeFileSync(path.join(dir, `${k}.json`), JSON.stringify({ schemaVersion: 1, ...s }) + "\n");
  console.log(`${refs} references and ${notFound} not-yet-found in ${shards.size} shards`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
