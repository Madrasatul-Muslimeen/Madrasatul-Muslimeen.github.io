// Speed, part 5 (issue #282) -- how Mapping My Journey's three Note
// Foundation collections (noteFolders, notes, notePlacements) are split into
// several independent id ranges so `journey-map-service.js` can page them in
// PARALLEL rather than one cursor chain of dozens of sequential round trips.
// At the Owner's real import size (1,464 folders, 1,083 Notes, 2,319
// filings — issue #265/#267's own numbers) a single cursor chain for the
// placements alone is ~24 sequential page reads; several shards running at
// once cut that to roughly one shard's own share.
//
// PURE, and deliberately so: no Firebase import, mutation-testable with no
// browser and no emulator (`journey-map-shard.mjs`) -- the same shape
// `journey-map-contract.js` already uses for its own bounded walk.
//
// WHY THE SPLIT IS ON A LATER CHARACTER, NOT THE FIRST. Every id this
// codebase mints is one of two shapes: a 32-char lowercase-hex UUID
// (`newNoteEntityId()` in note-foundation.js), or `"imp" + a ONE-LETTER KIND
// CODE + 16 hex characters` (`stableImportId()` in notes-import-shared.js).
// The kind code is FIXED per collection -- a folder import is always
// `"impf..."`, a note import always `"impn..."`, a placement import always
// `"impp..."` -- so every imported id in ONE collection shares its first
// FOUR characters. Splitting on the leading character alone would put the
// Owner's whole 1,464-folder WordPress import in a single shard and buy
// nothing. Splitting inside the fixed "imp" + kind-code header, on the hex
// digit that actually varies, is what spreads it; a plain UUID's own
// leading characters are just as random at that depth as at the start, so
// the split costs that population nothing either.
//
// CORRECTNESS NEVER DEPENDS ON WHICH SHAPE ACTUALLY DOMINATES. Every real id
// sorts into exactly one of the returned ranges, whether or not the split
// happens to be even for one Owner's own mix -- an empty shard just returns
// its own "nothing here" quickly, it does not lose or duplicate a row.
export const HEX_CHARS = "0123456789abcdef";

/** `count` cut characters spread evenly across the hex alphabet -- e.g. hexCuts(4) -> ["0","4","8","c"]. */
export function hexCuts(count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("journey-map-shard: count must be a positive integer.");
  }
  const step = HEX_CHARS.length / count;
  return Array.from({ length: count }, (_, i) => HEX_CHARS[Math.floor(i * step)]);
}

// The one-letter kind code `stableImportId()` stamps for each collection this
// round shards -- see `notes-import-shared.js`'s own
// `stableImportId(system, kind, rawKey)`: `"imp" + String(kind).slice(0, 1) + ...`.
// `journey-map-shard.mjs` calls the real function and asserts these still
// match, so a future importer renaming its own "kind" argument fails loudly
// there rather than silently unbalancing the shards.
export const IMPORT_KIND_CODE = Object.freeze({ folder: "f", note: "n", placement: "p" });

/**
 * `count` disjoint ENTITY-id ranges (never a full document id -- the caller
 * prefixes with `${tenantId}__` once it knows which tenant it is reading)
 * covering the whole id space one of these collections can ever hold, as
 * `{ gte, lt }`. The last range carries no `lt` (nothing sorts after it, so
 * an upper bound would only cost an extra, pointless comparison); the first
 * carries no `gte` (nothing sorts before the start of the collection).
 *
 * Range 0 covers everything before the import block -- every plain UUID,
 * whose own leading character is always a hex digit and so always sorts
 * before `"i"`. The remaining `count - 1` ranges subdivide the
 * `"imp" + kindCode` block itself, evenly, by its own first varying hex
 * character (index 4, right after the fixed 4-character header).
 */
export function entityIdShardRanges(kind, count = 4) {
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError("journey-map-shard: count must be an integer >= 2.");
  }
  const kindCode = IMPORT_KIND_CODE[kind];
  if (!kindCode) throw new RangeError(`journey-map-shard: unknown kind "${kind}".`);
  const header = `imp${kindCode}`;
  const cuts = hexCuts(count - 1).map((c) => `${header}${c}`);
  const bounds = [undefined, ...cuts, undefined];
  return Array.from({ length: count }, (_, i) => ({ gte: bounds[i], lt: bounds[i + 1] }));
}

/** One entity-id range, turned into the full-document-id `{ gte, lt }` a Firestore `where(documentId(), ...)` clause needs. `undefined` in, `undefined` out -- an unbounded end of the range stays unbounded. */
export function docIdRangeFor(tenantId, entityRange) {
  if (!entityRange) return null;
  const { gte, lt } = entityRange;
  return {
    gte: gte !== undefined ? `${tenantId}__${gte}` : undefined,
    lt: lt !== undefined ? `${tenantId}__${lt}` : undefined,
  };
}
