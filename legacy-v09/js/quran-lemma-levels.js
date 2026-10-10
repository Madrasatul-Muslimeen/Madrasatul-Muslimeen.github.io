// Decision 58 (issue #490) -- WHICH CLAIM KEY covers a word at each level.
//
// Pure: no Firebase, DOM or state. One lemma-wide claim document per
// (tenant, person, level, claimKey), keyed so that ONE record covers the whole
// spread and nothing is ever written for a group-mate or root-mate:
//
//   wbw   -> the lemma itself                       (same word only)
//   basic -> the meaning-group id, e.g. "رحم:2",    (same root, same meaning)
//            or the lemma when it has no group
//   depth -> the root, e.g. "رحم"                   (the whole root)
//
// Why not one record per lemma with a fan-out write: that would write for the
// mates (forbidden), cost N writes per tap, and a mate added to a group later
// would silently be missing. One record per group/root costs one write and the
// spread is DERIVED at read time from static data.
//
// Keys of different levels never share a document (the level is in the doc id),
// so a group id can never be mistaken for a lemma or a root.

export const LEMMA_WIDE_LEVELS = Object.freeze(["wbw", "basic", "depth"]);

/** The claim key a word is covered by at `level`, or null when it has none (no lemma / no root). */
export function claimKeyFor(level, { lemma, root } = {}, groupOf = () => null) {
  if (!LEMMA_WIDE_LEVELS.includes(level)) throw new TypeError(`Unknown lemma-wide level: ${level}.`);
  if (level === "wbw") return lemma || null;
  if (level === "basic") return lemma ? (groupOf(lemma) || lemma) : null;
  return root || null;
}
