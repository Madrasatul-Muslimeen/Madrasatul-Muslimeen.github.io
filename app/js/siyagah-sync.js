// PCF MSA J112 (d) D2 -- MSA NOTES KEPT IN STEP WITH SIYAGAH: THE DEVICE HALF.
//
// What waits to go to Siyagah is kept ON THIS DEVICE (IndexedDB "msa-siyagah-sync-v1", one record per MSA tenant +
// person), never as a new field on an MSA Note: no Firestore Rules change, no new permanent key. Every read and write of
// it is wrapped -- a private window or blocked storage means the Notes are simply not kept in step on this device, said
// on the Note ("Waiting to go to Siyagah" never turns to ✓), never a broken page.
//
// Two parts:
//   openSync()   -- every Map page (the full Map AND the Notes pane embedded in Quran Study, Hadith and Dua) queues each
//                   saved change of a Note here (scan), and reads the Note's mark from here. It loads no Firebase.
//   drain()      -- ONLY where Siyagah is already open and signed in (the full Map's Siyagah bar, siyagah-map-link.js,
//                   never at startup: I9): sends what waits, one request per Note at a time, through the ONE write
//                   module (siyagah-mmj-write.js: a fresh mmjin request, nothing else), and brings Siyagah's newer
//                   copies back through the page's own MSA write (host.applyPull / host.keepOlder).
// Every decision is the pure model's (siyagah-sync-model.js).
import {
  parseSyncState, emptySyncState, queueNote, settleWithCopy, planSync, afterStep, afterAnswer, syncMark, PRIMARY_ID,
  TRANSIENT_REFUSAL, TRANSIENT_RETRY_MS,
} from "./siyagah-sync-model.js";

const IDB_NAME = "msa-siyagah-sync-v1";
const RETRY_MS = TRANSIENT_RETRY_MS + 500; // a refused-for-now request's hold has passed when this fires

function withStore(mode, fn) {
  return new Promise((resolve, reject) => {
    let rq;
    try { rq = indexedDB.open(IDB_NAME, 1); } catch (e) { reject(e); return; }
    rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains("kv")) rq.result.createObjectStore("kv"); };
    rq.onerror = () => reject(rq.error);
    rq.onsuccess = () => {
      const db = rq.result;
      try {
        const tx = db.transaction("kv", mode), st = tx.objectStore("kv");
        let out;
        fn(st, (v) => { out = v; });
        tx.oncomplete = () => { db.close(); resolve(out); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      } catch (e) { db.close(); reject(e); }
    };
  });
}

/**
 * The sync for one person. `key` names them (tenant|person). Returns
 *   ready        -- a promise: the device's record has been read (or could not be)
 *   state()      -- the record as last read or written (synchronous, for the Note's mark)
 *   update(fn)   -- read, fn(state) -> next, write: ONE IndexedDB transaction, so two pages never undo each other
 *   scan(notes)  -- queue every Note whose saved snapshot changed: [{ noteId, updatedAtMs, createdAtMs, snapshot }]
 *   mark(noteId) -- syncMark() of its link
 *   onChange(cb) -- cb() after every change this page made or read
 */
export function openSync({ key, now = () => Date.now() }) {
  let cached = emptySyncState(now());
  let broken = false;
  const listeners = new Set();
  const told = () => { for (const cb of listeners) { try { cb(); } catch (e) { console.error(e); } } };
  async function update(fn) {
    if (broken) { const next = fn(cached); cached = next; told(); return cached; }
    try {
      const next = await withStore("readwrite", (st, done) => {
        const g = st.get(key);
        g.onsuccess = () => {
          const cur = parseSyncState(g.result, now());
          const nx = fn(cur);
          if (nx !== cur) st.put(nx, key);
          done(nx);
        };
      });
      cached = next ?? cached;
    } catch (e) {
      console.error(e);
      broken = true; // no storage on this device: keep going in memory for this page only
      cached = fn(cached);
    }
    told();
    return cached;
  }
  const ready = update((s) => s);
  return {
    key, ready,
    state: () => cached,
    get stored() { return !broken; },
    update,
    /** Queue every changed Note. Resolves to { state, queued } -- queued: how many Notes now have a change waiting. */
    async scan(notes) {
      const list = (notes || []).filter((n) => n && n.snapshot);
      if (!list.length) return { state: cached, queued: 0 };
      let queued = 0;
      const state = await update((s) => {
        let x = s;
        queued = 0;
        for (const n of list) { const before = x.links[n.noteId]; x = queueNote(x, n, now()); const after = x.links[n.noteId]; if (after && after !== before && after.want) queued++; }
        return x;
      });
      return { state, queued };
    },
    mark: (noteId) => syncMark(cached.links[noteId]),
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}

/**
 * Keep the Notes in step while Siyagah's copy is live. `sync` is openSync()'s; `model` siyagah-mmj-model.js; `writer()`
 * a promise of openMmjWriter()'s { send, follow }; `from` 'msa' | 'qr'; `host`:
 *   applyPull({ noteId, title, bodyHtml })  -> Promise<{ seen }>   Siyagah's newer copy written to the MSA Note (a revision)
 *   keepOlder({ noteId, title, bodyHtml })  -> Promise             rule 4: Siyagah's text kept as an older version first
 * Returns { onCopy(copy), close() }.
 */
/** The Web Lock every page sending for this person takes, so two tabs never send the same request twice. */
export const syncLockName = (key) => `msa-siyagah-sync|${key}`;

export function startSyncDrain({ sync, model, writer, from = "msa", host, setTimer = setTimeout }) {
  let copy = null, running = false, again = false, closed = false, retry = null;
  const followers = new Map();
  const say = (err) => console.error("[siyagah sync]", err);

  function follow(noteId, reqId) {
    if (!reqId || followers.has(reqId)) return;
    writer().then((w) => {
      if (closed) return;
      const unsub = w.follow(reqId, async (o) => {
        if (!o || o.kind === "waiting") return;
        if (o.kind === "error") return; // cannot be read now; the next copy tries again
        try { unsub(); } catch {}
        followers.delete(reqId);
        if (noteId === PRIMARY_ID) {
          await sync.update((s) => (s.primary?.reqId === reqId ? { ...s, primary: o.kind === "refused" ? { ...s.primary, refused: o.why || "" } : s.primary } : s));
        } else {
          await sync.update((s) => (s.links[noteId]?.inflight?.reqId === reqId ? afterAnswer(s, noteId, o, Date.now()) : s));
          // "open in Siyagah -- try again" is not final (J112 D2 refusals A): it goes again after the hold.
          if (o.kind === "refused" && TRANSIENT_REFUSAL.test(o.why || "")) scheduleRetry();
        }
        kick();
      });
      followers.set(reqId, unsub);
    }, say);
  }

  async function step(s, st) {
    if (st.kind === "primary") {
      const built = model.buildFolderRequest("folder.add", st.fields, { folders: copy.tree.folders || [], from });
      if (!built.ok) return s;
      s = await sync.update((x) => afterStep(x, st, { reqId: null, at: Date.now() }));
      let reqId;
      try { reqId = await (await writer()).send(built.req); }
      catch (err) { await sync.update((x) => ({ ...x, primary: null })); scheduleRetry(); throw err; }
      s = await sync.update((x) => ({ ...x, primary: { reqId, at: Date.now() } }));
      follow(PRIMARY_ID, reqId);
      return s;
    }
    if (st.kind === "send") {
      const built = model.buildNoteRequest(st.op, st.fields, { copy, from });
      if (!built.ok) {
        if (/changed in Siyagah since|id already used/.test(built.reason)) return s;
        return sync.update((x) => { const l = x.links[st.noteId]; return l ? { ...x, links: { ...x.links, [st.noteId]: { ...l, refused: { seq: l.want?.seq || 0, why: built.reason } } } } : x; });
      }
      s = await sync.update((x) => afterStep(x, st, { reqId: null }));
      let reqId;
      try { reqId = await (await writer()).send(built.req); }
      catch (err) {
        say(err);
        // Not sent (offline, refused by the cloud): nothing is lost -- it waits, and goes again when back online.
        await sync.update((x) => { const l = x.links[st.noteId]; return l?.inflight && !l.inflight.reqId ? { ...x, links: { ...x.links, [st.noteId]: { ...l, inflight: null } } } : x; });
        scheduleRetry();
        throw err;
      }
      s = await sync.update((x) => { const l = x.links[st.noteId]; return l?.inflight ? { ...x, links: { ...x.links, [st.noteId]: { ...l, inflight: { ...l.inflight, reqId } } } } : x; });
      follow(st.noteId, reqId);
      return s;
    }
    if (st.kind === "pull") {
      const out = await host.applyPull({ noteId: st.noteId, title: st.title, bodyHtml: st.bodyHtml });
      if (!out) return s; // the page could not write it now (not loaded, finalised): it stays as it is, tried next time
      return sync.update((x) => afterStep(x, st, { seen: out.seen }));
    }
    if (st.kind === "keep-older") {
      const out = await host.keepOlder({ noteId: st.noteId, title: st.title, bodyHtml: st.bodyHtml });
      if (!out) return s;
      return sync.update((x) => afterStep(x, st));
    }
    return sync.update((x) => afterStep(x, st));
  }

  // ONE sender at a time across tabs and pages (the full Map, every embedded Notes pane): the work below runs only while
  // this page holds the Web Lock; a page that cannot get it leaves the queue to the page that has it and looks again soon.
  // (A browser without Web Locks has one page sending anyway: the request ids, kept in the same IndexedDB record, are what
  // a second page would see.)
  async function run() {
    if (running) { again = true; return; }
    running = true;
    const locks = globalThis.navigator?.locks;
    if (locks?.request) {
      let got = false;
      try {
        await locks.request(syncLockName(sync.key), { ifAvailable: true }, async (lock) => { if (!lock) return; got = true; await work(); });
      } catch (err) { say(err); }
      running = false;
      if (!got && !closed) setTimer(() => kick(), 3000);
      else if (again && !closed) Promise.resolve().then(run);
      return;
    }
    try { await work(); } finally {
      running = false;
      if (again && !closed) Promise.resolve().then(run);
    }
  }
  async function work() {
    try {
      for (let pass = 0; pass < 4 && copy && !closed; pass++) {
        again = false;
        let s = await sync.update((x) => settleWithCopy(x, copy));
        // A request sent before the page closed: follow it again. One sent without its id known: send again.
        for (const [id, l] of Object.entries(s.links)) if (l.inflight?.reqId) follow(id, l.inflight.reqId);
        if (Object.values(s.links).some((l) => l.inflight && !l.inflight.reqId) && !pass) {
          s = await sync.update((x) => { const links = { ...x.links }; for (const [id, l] of Object.entries(links)) if (l.inflight && !l.inflight.reqId) links[id] = { ...l, inflight: null }; return { ...x, links }; });
        }
        if (s.primary && !s.primary.reqId && !pass) s = await sync.update((x) => (x.primary && !x.primary.reqId ? { ...x, primary: null } : x));
        if (s.primary?.reqId && !s.primary.refused) follow(PRIMARY_ID, s.primary.reqId);
        const steps = planSync(s, copy, Date.now()).filter((st) => !(st.kind === "primary" && s.primary));
        if (!steps.length) break;
        let moved = false;
        for (const st of steps) {
          if (closed) break;
          try { s = await step(s, st); moved = true; } catch (err) { say(err); }
        }
        if (!moved && !again) break;
      }
    } catch (err) { say(err); }
  }
  function kick() { if (!closed) run(); }
  function scheduleRetry() {
    if (retry || closed) return;
    retry = setTimer(() => { retry = null; kick(); }, RETRY_MS);
  }
  const onOnline = () => kick();
  try { window.addEventListener("online", onOnline); } catch {}
  const offChange = sync.onChange(() => {}); // the page's own scans call kick() through onQueued
  return {
    onCopy(c) { copy = c; kick(); },
    kick,
    close() {
      closed = true; offChange();
      try { window.removeEventListener("online", onOnline); } catch {}
      for (const u of followers.values()) { try { u(); } catch {} }
      followers.clear();
    },
  };
}
