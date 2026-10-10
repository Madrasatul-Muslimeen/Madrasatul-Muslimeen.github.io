// Pictures in Notes (Part C, item 35; Owner decisions 72 and 81) -- the PURE half: the one path shape a Note's
// picture may have, the widths it may take, and the size step-down. No imports and no DOM, so the sanitiser and a
// plain-Node check can both use it. The upload itself is in note-image.js.
//
// A Note keeps `<img data-mmsa-image="noteImages/{uid}/{imageId}.webp" alt="...">` with NO `src`: the picture is
// fetched when the Note is shown, as the owner, and is never a public link.

export const NOTE_IMAGE_PATH_RE = /^noteImages\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_-]{8,40})\.webp$/;
export const NOTE_IMAGE_WIDTHS = Object.freeze(["25", "50", "75", "100"]);
export const NOTE_IMAGE_ALT_MAX = 200;
export const NOTE_IMAGE_MAX_SIDE = 1600;
export const NOTE_IMAGE_TARGET_BYTES = 200 * 1024;
export const NOTE_IMAGE_MAX_BYTES = 400 * 1024;
export const NOTE_IMAGE_QUALITIES = Object.freeze([0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25]);

export const isNoteImagePath = (p) => typeof p === "string" && NOTE_IMAGE_PATH_RE.test(p);
export const noteImagePathFor = (uid, imageId) => `noteImages/${uid}/${imageId}.webp`;
export const noteImageOwner = (p) => (isNoteImagePath(p) ? NOTE_IMAGE_PATH_RE.exec(p)[1] : null);

/**
 * Size step-down. `encode(quality, side)` returns a Blob-like with `.size`. Tries each quality in turn and stops
 * at the first one at or under the target (~200 KB); if none gets there it tries a smaller picture (3/4, then 1/2
 * of the side). Returns `{ blob, quality, side }`, or `{ tooBig: true }` when even the smallest is over the
 * 400 KB ceiling (the caller refuses in words rather than upload more).
 */
export async function shrinkToTarget(encode, side = NOTE_IMAGE_MAX_SIDE, { target = NOTE_IMAGE_TARGET_BYTES, ceiling = NOTE_IMAGE_MAX_BYTES } = {}) {
  let best = null;
  for (const factor of [1, 0.75, 0.5]) {
    const s = Math.max(1, Math.round(side * factor));
    for (const q of NOTE_IMAGE_QUALITIES) {
      const blob = await encode(q, s);
      if (!blob) continue;
      best = { blob, quality: q, side: s };
      if (blob.size <= target) return best;
    }
  }
  return best && best.blob.size <= ceiling ? best : { tooBig: true };
}
