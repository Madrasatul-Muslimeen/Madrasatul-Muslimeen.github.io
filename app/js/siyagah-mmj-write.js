// PCF MSA J112 R2a -- ASKING SIYAGAH TO CHANGE A MAPPING MY JOURNEY FOLDER: THE WRITE HALF, AND ONLY THAT
//
// Siyagah v05.68's "Writing (R2)" contract (MMJ-SHARE.md): an app NEVER writes Siyagah's records. It CREATES one
// request document notebooks/{nb}/mmjin/{reqId} -- reqId its own random id -- holding exactly
// {v:1, op, from, at:<serverTimestamp>, st:'new', ...the op's fields}, never changes it after, and follows that one
// document for Siyagah's answer (st 'done', or 'refused' with why).
//
// So this file has ONE write call: setDoc on a FRESH document under notebooks/{nb}/mmjin/, with no merge. No update, no
// delete, no batch, no transaction, no other path. tools/i18n-verify/siyagah-mmj-model.mjs fails if any other write
// call or path appears here. The request itself is built and checked by the pure model (buildFolderRequest), so the
// fields are the contract's, never more.
//
// Loaded ONLY by a dynamic import from siyagah-map-link.js, the first time the reader uses a folder's write control on
// the Map -- never at startup (I9), never in an embedded Map (the bar is not mounted there).
import { isMmjId, mmjRandomId, requestOutcome } from "./siyagah-mmj-model.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

/** A fresh random id (20 letters and digits from the browser's crypto), with an optional prefix. */
export function randomId(prefix = "") {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return mmjRandomId(bytes, prefix);
}

/**
 * Open the writer on Siyagah's own named app (siyagah-cloud.js). Returns
 *   send(req)          -> Promise<reqId>: CREATES notebooks/{nb}/mmjin/{reqId} with `req` plus at:serverTimestamp()
 *   follow(reqId, cb)  -> unsubscribe: cb(outcome) on every change of that one request ({kind:'waiting'|'done'|'refused'})
 *                         or cb({kind:'error', error}) when it cannot be read
 */
export async function openMmjWriter({ cloud, nb }) {
  if (!isMmjId(String(nb || ""))) throw new Error("bad notebook id");
  const fs = await import(`${SDK}firebase-firestore.js`);
  const db = fs.getFirestore(cloud.app);
  const MMJIN = `notebooks/${nb}/mmjin`;
  return {
    async send(req) {
      if (!req || req.v !== 1 || req.st !== "new" || typeof req.op !== "string" || "at" in req) throw new Error("not a request");
      const reqId = randomId();
      await fs.setDoc(fs.doc(db, MMJIN, reqId), { ...req, at: fs.serverTimestamp() });
      return reqId;
    },
    follow(reqId, cb) {
      return fs.onSnapshot(fs.doc(db, MMJIN, reqId),
        (snap) => cb(requestOutcome(snap && snap.exists() ? snap.data() : null)),
        (error) => cb({ kind: "error", error }));
    },
  };
}
