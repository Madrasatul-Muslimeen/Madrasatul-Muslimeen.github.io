// Pictures in Notes (Part C, item 35; Owner decisions 72 and 81) -- the device side: make a picture small, put it in
// Firebase Storage under noteImages/{uid}/{imageId}.webp, and fetch it back to show. The pure rules (the path pattern,
// the size step-down) are in note-image-path.js; the page hands this module to the Note views as `host.images`.
//
//  * MADE SMALL FIRST, ON THE DEVICE: the picture is re-drawn on a canvas, longest side at most 1600px, saved as WebP
//    and stepped down in quality until it is about 200 KB; more than 400 KB is refused in words, never uploaded.
//    Re-drawing also strips the photo's location and camera data (EXIF): none of it survives a canvas.
//  * PRIVATE: the Storage Rules candidate (docs/governance/2026-10-storage-rules-candidate.rules) lets only the signed-in
//    person read or write their own folder. Until the Owner publishes it an upload is refused, and the refusal is
//    said in words (I15), never swallowed.
//  * NEVER A PUBLIC LINK: the Note keeps only the path. A picture is fetched with getBlob and shown from an object URL;
//    a download URL (which carries a token) is never asked for and never stored.
//  * NOTHING IS EVER DELETED (I4, D6): removing a picture from a Note leaves its file in Storage. There is no delete here
//    and the Rules candidate allows none.

import { getStorage, ref, uploadBytes, getBlob } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseApp } from "./firebase-init.js";
import { t } from "./i18n.js";
import { NOTE_IMAGE_MAX_SIDE, NOTE_IMAGE_MAX_BYTES, isNoteImagePath, noteImagePathFor, shrinkToTarget } from "./note-image-path.js";

let storage = null;
const storageOf = () => (storage ??= getStorage(firebaseApp));

/** A random id of the shape the Rules and the sanitiser both accept: [A-Za-z0-9_-]{8,40}. */
export function newImageId() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

/** Draw the picture again, small: returns { blob } or throws Error(sentence). */
export async function makeSmall(file) {
  if (!file || !/^image\//.test(file.type || "")) throw new Error(t("That file is not a picture."));
  let src;
  try { src = await decode(file); } catch { throw new Error(t("That picture could not be opened.")); }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) throw new Error(t("That picture could not be opened."));
  const encode = (quality, side) => new Promise((resolve) => {
    const k = Math.min(1, side / Math.max(w0, h0));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); // the re-draw is what drops EXIF
    c.toBlob((b) => resolve(b && b.type === "image/webp" ? b : null), "image/webp", quality);
  });
  const r = await shrinkToTarget(encode, NOTE_IMAGE_MAX_SIDE);
  src.close?.();
  if (!r || (!r.blob && !r.tooBig)) throw new Error(t("This browser cannot make the picture small enough. Try a different picture."));
  if (r.tooBig) throw new Error(t("That picture is still too big after making it small (over 400 KB), so it was not uploaded. Try a simpler picture."));
  return { blob: r.blob };
}

/** Make small, upload, return the path. Throws Error(sentence) for every failure. */
export async function uploadNoteImage(uid, file, { onStage } = {}) {
  if (!uid) throw new Error(t("Sign in first: a picture is saved to your own private folder."));
  onStage?.("shrinking");
  const { blob } = await makeSmall(file);
  if (blob.size > NOTE_IMAGE_MAX_BYTES) throw new Error(t("That picture is still too big after making it small (over 400 KB), so it was not uploaded. Try a simpler picture."));
  const path = noteImagePathFor(uid, newImageId());
  onStage?.("uploading");
  try {
    await uploadBytes(ref(storageOf(), path), blob, { contentType: "image/webp" });
  } catch (err) {
    const code = String(err?.code || "");
    if (/unauthori[sz]ed|unauthenticated|permission/.test(code + " " + (err?.message || "")))
      throw new Error(t("The picture was not saved: picture storage is not switched on yet. The Owner needs to publish the Storage Rules first. Your Note is unchanged."));
    throw new Error(t("The picture was not saved: no connection, or the service is not reachable. Your Note is unchanged."));
  }
  return path;
}

const urlCache = new Map();
/** The picture as an object URL (cached for this page), fetched as the signed-in person. Rejects when it cannot be fetched. */
export function noteImageUrl(path) {
  if (!isNoteImagePath(path)) return Promise.reject(new Error("not a Note picture path"));
  if (!urlCache.has(path)) {
    const p = getBlob(ref(storageOf(), path)).then((b) => URL.createObjectURL(b));
    p.catch(() => urlCache.delete(path)); // a failure is retried next time, not remembered
    urlCache.set(path, p);
  }
  return urlCache.get(path);
}
