// Hadith C2 — the READ-ONLY production inventory of `hadith:` permanent keys,
// run OFFLINE against a file the Owner already knows how to produce.
//
// WHY THIS EXISTS, AND WHAT IT CORRECTS.
// `docs/governance/hadith-c2-live-records-path-2026-09-19.md` §5 specifies the
// inventory C2 needs and records that this environment cannot perform it:
// no Firebase CLI, no credentials, Rules API 403. That is true of a DIRECT
// Firestore read and it is NOT true of the inventory itself. The app already
// ships the read:
//
//   backup.html -> collectBackup()  -> listAllRecordsForPerson(db, tenant, person)
//                                      = query(records, tenantId ==, personId ==)
//
// That query carries NO chunk filter, so it returns EVERY records chunk for the
// person -- which is exactly what §4 says the inventory must do, because a
// `hadith:` key lands in whichever subject chunk the reader had open, not
// necessarily `subject_hadith`. collectBackup() runs it for every person in the
// active tenant, and buildBackupHtml() prints Unit, Chunk, Subject, Approach,
// Status, Confirmed, Claimed at and By for each entry.
//
// So the inventory needs NO new access, NO Rules change and NO new app code:
// the Owner presses Export in the app they already use, and hands over the file.
//
// THIS FILE NEVER TOUCHES FIRESTORE. It reads one local file and prints. It
// imports nothing -- not even from `app/` -- so it cannot become a consumer of
// a key contract it is meant to be measuring. A suite
// (tools/i18n-verify/hadith-records-inventory.mjs) binds its classification to
// the accepted regex read out of app/js/study-note-binding.js, which is the
// right direction of dependency: the check drifts loudly, the tool does not
// drift silently.
//
// NOTHING HERE DECIDES ANYTHING. It measures. C2 -- whether the permanent
// Hadith key stays name-keyed, and what happens to keys already written -- is
// an Owner Control Gate.

// ---------------------------------------------------------------------------
// Parsing a backup export
// ---------------------------------------------------------------------------

/** Undo backup-file.js's own esc(). Its five entities, in the one order that is safe (&amp; last). */
export function unesc(s) {
  return String(s ?? "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const CHUNK_RE = /^(surah_\d+|subject_.+)$/;

/**
 * Every claim row in a backup export, with the person it belongs to.
 *
 * DELIBERATELY LANGUAGE-INDEPENDENT. The export is fully translated -- its
 * headings and column names go through t() -- so keying on the English
 * "Claims and confirmations" would silently return nothing for a Bangla export
 * and the tool would report a clean inventory of a file it could not read.
 * The claims table is instead identified by SHAPE: eight cells, inside a
 * person block, with a cell that looks like a records chunk key. Bookmarks (7),
 * the activity log (6) and folders (4) cannot collide with that.
 */
export function parseBackupHtml(html) {
  const people = [];
  const personRe = /<details class="person"[^>]*>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = personRe.exec(html)) !== null) {
    const block = m[1];
    const name = unesc((block.match(/<span class="sec-title">([\s\S]*?)<\/span>/) || [])[1] ?? "(unnamed)");
    const rows = [];
    const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
    let r;
    while ((r = rowRe.exec(block)) !== null) {
      const cells = [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => unesc(c[1]).trim());
      if (cells.length !== 8) continue;
      if (!CHUNK_RE.test(cells[1])) continue;
      rows.push({
        person: name,
        unit: cells[0], chunkKey: cells[1], subjectId: cells[2], trackableId: cells[3],
        claimedStatus: cells[4], confirmState: cells[5], claimedAt: cells[6], claimedBy: cells[7],
      });
    }
    people.push({ person: name, rows });
  }
  const tenantId = unesc((html.match(/<dt>[^<]*<\/dt><dd>([A-Za-z0-9_-]+)<\/dd>\s*<\/div>\s*<\/dl>/) || [])[1] ?? "");
  return { people, rows: people.flatMap((p) => p.rows), tenantId };
}

/** The same rows out of a raw listAllRecordsForPerson() dump, if one is ever available instead. */
export function parseJsonDump(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data.records ?? []);
  const rows = list.map((e) => ({
    person: e.personId ?? e.person ?? "(unnamed)",
    unit: e.unitKey ?? e.entryKey ?? "",
    chunkKey: e.chunkKey ?? "", subjectId: e.subjectId ?? "", trackableId: e.trackableId ?? "",
    claimedStatus: e.claimedStatus ?? "", confirmState: e.confirmState ?? "",
    claimedAt: e.claimedAt ?? "", claimedBy: e.claimedByPersonId ?? e.claimedBy ?? "",
  }));
  return { people: [], rows, tenantId: data.tenantId ?? "" };
}

// ---------------------------------------------------------------------------
// The inventory
// ---------------------------------------------------------------------------

/**
 * Split a printed Unit cell into its unit key and, when present, the trackable.
 * The exporter prints `r.unitKey ?? r.entryKey`, and a records ENTRY does not
 * carry a unitKey field -- so in practice the cell is the ENTRY key,
 * `<unitKey>::<trackableId>`. Both forms are handled rather than assumed.
 */
export function splitUnit(cell) {
  const i = String(cell).indexOf("::");
  return i === -1 ? { unitKey: String(cell), trackableFromKey: null }
                  : { unitKey: String(cell).slice(0, i), trackableFromKey: String(cell).slice(i + 2) };
}

export const HADITH_PREFIX = "hadith:";

/** The accepted form, per the H1 schema: hadith:<token>:<1-6 digits>. Kept as data so the suite can compare it against the app's own regex rather than trusting this line. */
export const ACCEPTED_SHAPE = /^hadith:[A-Za-z0-9_-]+:\d{1,6}$/;

export function inventory(rows) {
  const hadith = [];
  for (const row of rows) {
    const { unitKey, trackableFromKey } = splitUnit(row.unit);
    if (!unitKey.startsWith(HADITH_PREFIX)) continue;
    const parts = unitKey.split(":");
    const collection = parts[1] ?? "";
    const ordinal = parts.slice(2).join(":");
    hadith.push({
      ...row,
      unitKey,
      trackableId: row.trackableId || trackableFromKey || "",
      collection,
      ordinal,
      accepted: ACCEPTED_SHAPE.test(unitKey),
      numericOrdinal: /^\d+$/.test(ordinal),
      overSixDigits: /^\d+$/.test(ordinal) && ordinal.replace(/^0+/, "").length > 6,
      inHadithSubjectChunk: row.chunkKey === "subject_hadith",
    });
  }

  // Item 3: the migration's real surface -- the names a reader invented, and
  // whether two of them are the same name in different clothes. Grouping by
  // case-folded token is what exposes bukhari / Bukhari as one decision and
  // bukhari / al-bukhari as two.
  const byCollection = new Map();
  for (const h of hadith) {
    const key = h.collection.toLowerCase();
    const g = byCollection.get(key) ?? { folded: key, spellings: new Map(), count: 0 };
    g.count++;
    g.spellings.set(h.collection, (g.spellings.get(h.collection) ?? 0) + 1);
    byCollection.set(key, g);
  }

  const numeric = hadith.filter((h) => h.numericOrdinal).map((h) => Number(h.ordinal));
  const confirmedRows = hadith.filter((h) => isConfirmed(h.confirmState));

  return {
    entries: hadith,
    counts: {
      totalRowsRead: rows.length,
      hadithEntries: hadith.length,
      distinctPersons: new Set(hadith.map((h) => h.person)).size,
      distinctChunks: new Set(hadith.map((h) => h.chunkKey)).size,
      distinctSubjects: new Set(hadith.map((h) => h.subjectId)).size,
      distinctTrackables: new Set(hadith.map((h) => h.trackableId)).size,
    },
    collections: [...byCollection.values()]
      .map((g) => ({ folded: g.folded, count: g.count, spellings: [...g.spellings.entries()].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count),
    ordinals: {
      numeric: numeric.length,
      nonNumeric: hadith.length - numeric.length,
      min: numeric.length ? Math.min(...numeric) : null,
      max: numeric.length ? Math.max(...numeric) : null,
      overSixDigits: hadith.filter((h) => h.overSixDigits).length,
    },
    unaccepted: hadith.filter((h) => !h.accepted),
    confirmed: confirmedRows,
    outsideHadithSubject: hadith.filter((h) => !h.inHadithSubjectChunk),
    verdict: verdictFor(hadith, confirmedRows),
  };
}

/**
 * The export prints confirmState through confirmStateLabel(), so the stored
 * identifier is NOT what lands in the cell and a translated export prints a
 * Bangla word. Anything that is neither empty nor an em dash is treated as a
 * confirmation state present, and the `confirmed` identifier is matched too for
 * a JSON dump. I6 makes the safe direction obvious: over-report a frozen
 * confirmation rather than miss one.
 */
export function isConfirmed(cell) {
  const v = String(cell ?? "").trim().toLowerCase();
  if (!v || v === "—" || v === "-" || v === "pending" || v === "returned") return false;
  return true;
}

/** The C2 §5 outcome table, applied to what was measured. It names a consequence; it does not choose one. */
export function verdictFor(hadith, confirmed) {
  if (!hadith.length) {
    return { code: "NO_LEGACY_KEYS",
      text: "Zero hadith: entries were found in this export. If every tenant reports the same, H1 §5 may be applied with NO legacy mapping at all -- the cheapest outcome, and the one to establish first." };
  }
  if (confirmed.length) {
    return { code: "CONFIRMED_PRESENT",
      text: `${confirmed.length} of ${hadith.length} hadith: entries carry a confirmation state. I6 BINDS: a frozen confirmation may never be recalculated, edited or destroyed by any migration.` };
  }
  return { code: "LEGACY_KEYS_PRESENT",
    text: `${hadith.length} hadith: entries exist and none is confirmed. A reviewer-confirmed legacyHadithKeyMap is needed per H1 §5; old keys are never rewritten (I4).` };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function render(inv, { source, tenantId, scopeNote }) {
  const L = [];
  L.push("Hadith C2 -- read-only inventory of permanent `hadith:` record keys");
  L.push("=".repeat(68));
  L.push(`source        : ${source}`);
  L.push(`tenant id     : ${tenantId || "(not found in the file)"}`);
  L.push(`rows read     : ${inv.counts.totalRowsRead}`);
  L.push("");
  L.push(`hadith entries: ${inv.counts.hadithEntries}`);
  L.push(`  persons     : ${inv.counts.distinctPersons}`);
  L.push(`  chunks      : ${inv.counts.distinctChunks}`);
  L.push(`  subjects    : ${inv.counts.distinctSubjects}`);
  L.push(`  approaches  : ${inv.counts.distinctTrackables}`);
  L.push("");
  L.push("collection tokens actually used (item 3 -- the migration's surface):");
  if (!inv.collections.length) L.push("  (none)");
  for (const c of inv.collections) {
    const sp = c.spellings.map(([s, n]) => `${s} x${n}`).join(", ");
    L.push(`  ${c.folded.padEnd(24)} ${String(c.count).padStart(5)}   spellings: ${sp}${c.spellings.length > 1 ? "   <-- SAME NAME, DIFFERENT KEYS" : ""}`);
  }
  L.push("");
  L.push(`ordinals: ${inv.ordinals.numeric} numeric, ${inv.ordinals.nonNumeric} non-numeric` +
         (inv.ordinals.numeric ? `, range ${inv.ordinals.min}..${inv.ordinals.max}` : "") +
         `, past the 6-digit bound: ${inv.ordinals.overSixDigits}`);
  L.push(`keys OUTSIDE the accepted shape: ${inv.unaccepted.length}`);
  for (const u of inv.unaccepted.slice(0, 20)) L.push(`  ${u.unitKey}   (${u.chunkKey}, ${u.person})`);
  L.push(`hadith keys NOT in subject_hadith (the §4 subtlety): ${inv.outsideHadithSubject.length}`);
  for (const o of [...new Set(inv.outsideHadithSubject.map((o) => o.chunkKey))]) L.push(`  ${o}`);
  L.push(`CONFIRMED entries (I6 -- frozen, never recomputed): ${inv.confirmed.length}`);
  L.push("");
  L.push(`VERDICT [${inv.verdict.code}]`);
  L.push(`  ${inv.verdict.text}`);
  L.push("");
  L.push("SCOPE LIMITS OF THIS FILE, stated rather than assumed:");
  L.push(`  ${scopeNote}`);
  L.push("  A backup export covers ONE tenant -- the one that was active -- and only what");
  L.push("  the signed-in account may read under the DEPLOYED Rules. 'Every tenant' means");
  L.push("  one export per tenant. This tool reports what it was given; it cannot know");
  L.push("  what it was not given.");
  L.push("");
  L.push("This tool DECIDES NOTHING. C2 is an Owner Control Gate.");
  return L.join("\n");
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node tools/hadith-data-pull/records-key-inventory.mjs <backup.html|records.json> [--json]");
    process.exit(2);
  }
  const fs = await import("node:fs");
  const text = fs.readFileSync(file, "utf8");
  const parsed = file.endsWith(".json") ? parseJsonDump(text) : parseBackupHtml(text);
  const inv = inventory(parsed.rows);
  const scopeNote = /class="person"/.test(text)
    ? `${parsed.people.length} person section(s) read from a backup export.`
    : "A raw records dump was read; person and tenant coverage are whatever produced it.";
  if (process.argv.includes("--json")) console.log(JSON.stringify({ tenantId: parsed.tenantId, ...inv }, null, 2));
  else console.log(render(inv, { source: file, tenantId: parsed.tenantId, scopeNote }));
}
