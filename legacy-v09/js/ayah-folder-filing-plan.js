// Issue #286 -- "File in folder(s)…" is a multi-select tick list (spec item
// 3): folders already holding this reader's Note start ticked, unticking
// one retires that placement (I4 -- nothing is deleted), ticking a new one
// creates one. Pure, uninvoked-by-Firestore planning logic, same shape as
// journey-map-service.js's own P6-G `planReorder()` -- a pure function the
// caller diffs against, rather than a live write buried inside a bigger
// function, so "did this tick/untick actually produce the right two lists"
// is provable without a database at all.

/**
 * `currentPlacements`: the rows `noteFilings()`/`listNotePlacementsForNote()`
 * already return for this Note -- each needs at least `folderId` and
 * `placementId` (the field `createNotePlacement()` itself writes, distinct
 * from the Firestore doc id `retireNotePlacement()` does NOT want).
 * `desiredFolderIds`: every folder id left ticked when Save is pressed.
 *
 * Returns `{ toCreate, toRetire }` -- `toCreate` is folder ids with no
 * active placement yet; `toRetire` is placement ids (not folder ids, since
 * retiring is keyed by placement) whose folder was unticked. A folder that
 * was already ticked and is still ticked appears in neither list -- Save
 * costs exactly as many writes as the reader actually changed, the same
 * "write only what changed" rule `reorderTrackables()`/`planReorder()`
 * already follow.
 */
export function planFolderFilings(currentPlacements = [], desiredFolderIds = []) {
  const desired = new Set(desiredFolderIds);
  const currentByFolder = new Map(currentPlacements.map((p) => [p.folderId, p]));
  const toCreate = [...desired].filter((folderId) => !currentByFolder.has(folderId));
  const toRetire = currentPlacements
    .filter((p) => !desired.has(p.folderId))
    .map((p) => p.placementId);
  return { toCreate, toRetire };
}
