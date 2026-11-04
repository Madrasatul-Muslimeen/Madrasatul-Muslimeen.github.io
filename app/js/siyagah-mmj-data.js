// PCF MSA J112 R1 -- THE MAP READS SIYAGAH'S MAPPING MY JOURNEY: THE DATA HALF (READ-ONLY)
//
// Reached ONLY by a dynamic import from siyagah-map-link.js, once the Map is open AND the reader is signed in to
// Siyagah -- never at the app's startup (I9). Its one static import is the pure model; Firestore's code is loaded here
// by dynamic import, into Siyagah's own named app (siyagah-cloud.js), never MSA's study-monitoring (D1).
//
// What it does, in the order Siyagah's R1 contract gives:
//   1. shows the copy this device already holds (IndexedDB, wrapped: a private window or blocked storage just means
//      no copy, never a broken Map);
//   2. reads notebooks/{nb}/mmj/t~0 (+ its pieces, joined only when every piece's g equals t~0.g) when it has no tree;
//   3. listens to notebooks/{nb}/mmj where('at','>',cursor).orderBy('at'): a gone note is removed, any other note
//      replaced (a big note's pieces read from mmjparts first), any t~ change re-reads the tree;
//   4. permission-denied: says so, keeps the copy, tries again after one minute -- at most once a minute, never a loop.
//
// IT NEVER WRITES ANYTHING OF SIYAGAH'S. The only Firestore calls in this file are getFirestore, collection, doc,
// query, where, orderBy, getDoc and onSnapshot; tools/i18n-verify/siyagah-mmj-model.mjs fails if a write call appears.
import {
  MMJ_RETRY_MS, mmjDocKind, mmjPartDocId, joinTree, noteParts, joinNoteParts,
  emptyCopy, parseCopy, applyNoteDoc, applyTree, seeAt, isPermissionDenied, picturePlan, pictureBytesOk,
} from "./siyagah-mmj-model.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const IDB_NAME = "msa-siyagah-mmj-v1";

function idb(op, key, value) {
  return new Promise((resolve, reject) => {
    let rq;
    try { rq = indexedDB.open(IDB_NAME, 1); } catch (e) { reject(e); return; }
    rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains("kv")) rq.result.createObjectStore("kv"); };
    rq.onerror = () => reject(rq.error);
    rq.onsuccess = () => {
      const db = rq.result;
      try {
        const tx = db.transaction("kv", op === "get" ? "readonly" : "readwrite"), st = tx.objectStore("kv");
        const r = op === "get" ? st.get(key) : st.put(value, key);
        tx.oncomplete = () => { db.close(); resolve(op === "get" ? r.result : true); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      } catch (e) { db.close(); reject(e); }
    };
  });
}

async function loadCopy(key, nb) {
  try { return parseCopy(await idb("get", key), nb); } catch (e) { console.error(e); return emptyCopy(nb); }
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Start reading. `onCopy(copy, why)` is called with every new copy ("device" first, then "cloud"); `onState(state)`
 * with { kind: "loading" | "live" | "denied" | "error", error?, retryAt? }. Returns { close(), picture(sha, mime) }.
 */
export async function openMmjReader({ cloud, nb, uid, onCopy, onState, retryMs = MMJ_RETRY_MS }) {
  const key = `${uid}|${nb}`;
  let copy = await loadCopy(key, nb);
  let closed = false, unsub = null, retryTimer = null, saveTimer = null, lastTry = 0;
  onCopy(copy, "device");

  const fs = await import(`${SDK}firebase-firestore.js`);
  const db = fs.getFirestore(cloud.app);
  const MMJ = `notebooks/${nb}/mmj`, PARTS = `notebooks/${nb}/mmjparts`;

  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { idb("put", key, { ...copy, savedAt: Date.now() }).catch((e) => console.error(e)); }, 300);
  };
  const set = (next, why = "cloud") => { if (next !== copy) { copy = next; save(); onCopy(copy, why); } };

  async function readTree() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const s0 = await fs.getDoc(fs.doc(db, MMJ, "t~0"));
      if (!s0.exists()) return;
      const t0 = s0.data(), pieces = {};
      const n = Array.isArray(t0.folders) ? 0 : Number(t0.n) || 0;
      for (let i = 1; i <= n; i++) {
        const s = await fs.getDoc(fs.doc(db, MMJ, "t~" + i));
        if (s.exists()) pieces["t~" + i] = s.data();
      }
      const joined = joinTree(t0, pieces);
      if (joined.ok) { set(applyTree(copy, joined.tree).copy); return; }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); // a write is in progress: read again
    }
  }

  async function readParts(data) {
    const want = noteParts(data);
    const docs = [];
    for (let i = 0; i < want.n; i++) {
      const s = await fs.getDoc(fs.doc(db, PARTS, mmjPartDocId(data.id, want.g, i)));
      docs.push(s.exists() ? s.data() : null);
    }
    return joinNoteParts(data, docs);
  }

  async function takeNote(docId, data) {
    let d = data;
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = applyNoteDoc(copy, docId, d);
      if (!r.needParts) { set(r.copy); return; }
      const content = await readParts(d);
      if (content != null) { set(applyNoteDoc(copy, docId, d, content).copy); return; }
      // A piece is missing: a rewrite is in progress. Read the note doc again (the contract).
      const again = await fs.getDoc(fs.doc(db, MMJ, docId));
      if (!again.exists()) return;
      d = again.data();
    }
  }

  let queue = Promise.resolve();
  function onChanges(snap) {
    const changes = typeof snap.docChanges === "function" ? snap.docChanges() : snap.docs.map((doc) => ({ type: "added", doc }));
    queue = queue.then(async () => {
      let tree = false;
      for (const ch of changes) {
        if (closed) return;
        if (ch.type === "removed") continue; // a doc is never deleted; leaving the query changes nothing
        const id = ch.doc.id, data = ch.doc.data(), kind = mmjDocKind(id);
        if (kind === "note") await takeNote(id, data);
        else if (kind === "tree" || kind === "piece") { tree = true; set(seeAt(copy, data?.at)); }
      }
      if (tree) await readTree();
      onState({ kind: "live" });
    }).catch(fail);
  }

  function fail(err) {
    console.error(err);
    if (closed) return;
    try { unsub?.(); } catch {}
    unsub = null;
    const retryAt = Date.now() + retryMs;
    onState({ kind: isPermissionDenied(err) ? "denied" : "error", error: err, retryAt });
    clearTimeout(retryTimer);
    retryTimer = setTimeout(start, retryMs); // ONE retry, a minute later; start() refuses anything sooner
  }

  async function start() {
    if (closed || unsub) return;
    const now = Date.now();
    if (lastTry && now - lastTry < retryMs) return;
    lastTry = now;
    onState({ kind: "loading" });
    try {
      if (!copy.tree) await readTree();
      const q = fs.query(fs.collection(db, MMJ), fs.where("at", ">", new Date(Math.floor(copy.cursor))), fs.orderBy("at"));
      unsub = fs.onSnapshot(q, onChanges, fail);
    } catch (err) { fail(err); }
  }

  await start();

  const pics = new Map();
  return {
    close() { closed = true; clearTimeout(retryTimer); clearTimeout(saveTimer); try { unsub?.(); } catch {} unsub = null; },
    get copy() { return copy; },
    /** A picture's bytes, sha256-checked (Siyagah's _picFetch). Throws when it is missing or fails the check. */
    picture(sha, mime) {
      if (!pics.has(sha)) {
        const p = (async () => {
          const ms = await fs.getDoc(fs.doc(db, `notebooks/${nb}/pics`, sha));
          const plan = picturePlan(sha, ms.exists() ? ms.data() : null, mime);
          const parts = [];
          let total = 0;
          for (let i = 0; i < plan.parts; i++) {
            const ps = await fs.getDoc(fs.doc(db, `notebooks/${nb}/picparts`, `${plan.want}~${i}`));
            const d = ps.exists() ? ps.data().d : null;
            const u8 = d && typeof d.toUint8Array === "function" ? d.toUint8Array() : null;
            if (!u8) throw new Error(`picture part ${i} is missing`);
            parts.push(u8); total += u8.length;
          }
          const all = new Uint8Array(total);
          let off = 0;
          for (const u of parts) { all.set(u, off); off += u.length; }
          const sum = hex(await crypto.subtle.digest("SHA-256", all));
          if (!pictureBytesOk(plan, total, sum)) throw new Error("picture failed its check");
          return new Blob([all], { type: plan.type });
        })();
        p.catch(() => pics.delete(sha)); // a failure is not remembered: the next opening tries again
        pics.set(sha, p);
      }
      return pics.get(sha);
    },
  };
}

