// F-0XX — Phase 8: Monitor & reports.
//
// One universal report -- reads records + activity, which are already the
// same shape for every module (ayah, topic, or routine unit keys all flow
// through the same two collections) -- so it reports on whatever's actually
// been claimed/logged regardless of how built-out any given module is.
// Quran gets one extra section on top: the 30-Approach status breakdown,
// since Quran is the only subject with real structured trackable data today
// (CLAUDE.md, Phase 8 scope).
//
// Read-only throughout. No new collection, no security-rule change -- every
// read here reuses records.js/activity.js's existing, already-approved query
// shapes. Never part of the startup path (load-speed contract: "Screensaver,
// About, resources -- on first use" -- a report is the same category).

import { weekKeyFor, getWeekActivity } from "./activity.js";
import { listAllRecordsForPerson } from "./records.js";
import { summarizeStatuses } from "./unit-keys.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";
import { t } from "./i18n.js";

// ---------------------------------------------------------------------------
// Fetching -- bounded to the date range actually asked for, never "the
// whole set" (I14's spirit, even though I14 itself names `sessions`, a
// Phase 14 collection that doesn't exist yet -- activity is already "one
// document per week" by construction, so this just decides WHICH weeks).
// ---------------------------------------------------------------------------

/** Every distinct weekKey (per the tenant's own weekStartsOn) whose week touches any day of {year, month} (month is 1-12) -- bounded to a handful of weeks, never a year at once. */
export function monthWeekKeys(year, month, weekStartsOn) {
  const keys = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const wk = weekKeyFor(new Date(Date.UTC(year, month - 1, day)), weekStartsOn);
    if (!keys.includes(wk)) keys.push(wk);
  }
  return keys;
}

/** Flattened, personId-tagged activity entries for one person across a list of weekKeys -- activity.js's own entries don't carry personId (it lives on the parent doc); a missing week (nothing logged) is simply skipped, matching activity.js's own convention. */
async function personActivityForWeeks(db, tenantId, personId, weekKeys) {
  const docs = await Promise.all(weekKeys.map((wk) => getWeekActivity(db, tenantId, personId, wk)));
  const out = [];
  for (const wd of docs) {
    if (!wd) continue;
    for (const e of wd.entries ?? []) out.push({ ...e, personId });
  }
  return out;
}

/** Flattened, personId-tagged activity entries for a whole roster across a list of weekKeys -- the shared engine behind both the weekly (one weekKey) and monthly (monthWeekKeys()) report views. */
export async function activityForRoster(db, tenantId, personIds, weekKeys) {
  const perPerson = await Promise.all(personIds.map((pid) => personActivityForWeeks(db, tenantId, pid, weekKeys)));
  return perPerson.flat();
}

/** Restricts entries to those whose own date actually falls in {year, month} -- a fetched week can straddle two months at its edges (monthWeekKeys() pulls in the whole week for any day landing in the target month); this is what keeps a report's totals to the month it claims to cover. */
export function filterEntriesToMonth(entries, year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return entries.filter((e) => e.date?.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Per-student / per-subject summaries -- same two axes the old app's own
// Monitor report used (index.html's weekly/monthly report), rebuilt against
// this schema's real activity entries instead of the old app's free-text
// day/subject grid cells.
// ---------------------------------------------------------------------------

/** One row per roster student (roster order preserved, zero-entry students included so a quiet week/month is visible, not just absent): distinct days with any activity, entry count, and a subjectId -> count breakdown. */
export function summarizeByStudent(entries, roster) {
  const byPerson = new Map(
    roster.map((p) => [p.id, { personId: p.id, name: langText(p.name, getAppLang(), p.id), days: new Set(), entryCount: 0, subjects: new Map() }])
  );
  for (const e of entries) {
    const s = byPerson.get(e.personId);
    if (!s) continue; // outside the roster this report is scoped to
    s.days.add(e.date);
    s.entryCount++;
    s.subjects.set(e.subjectId, (s.subjects.get(e.subjectId) ?? 0) + 1);
  }
  return [...byPerson.values()].map((s) => ({
    personId: s.personId,
    name: s.name,
    dayCount: s.days.size,
    entryCount: s.entryCount,
    subjectBreakdown: [...s.subjects.entries()].sort((a, b) => b[1] - a[1]),
  }));
}

/** One row per subject touched: total entries, distinct students, distinct units. A subjectId with no matching subjectTree node (renamed/archived mid-range) still shows, keyed by its raw id, rather than being silently dropped. */
export function summarizeBySubject(entries, subjectTree) {
  const bySubject = new Map();
  for (const e of entries) {
    if (!bySubject.has(e.subjectId)) bySubject.set(e.subjectId, { subjectId: e.subjectId, entryCount: 0, students: new Set(), units: new Set() });
    const s = bySubject.get(e.subjectId);
    s.entryCount++;
    s.students.add(e.personId);
    s.units.add(e.unitKey);
  }
  const nameFor = (id) => {
    const node = subjectTree.find((n) => n.id === id);
    return node ? langText(node.name, getAppLang(), id) : id;
  };
  return [...bySubject.values()]
    .map((s) => ({ subjectId: s.subjectId, name: nameFor(s.subjectId), entryCount: s.entryCount, studentCount: s.students.size, unitCount: s.units.size }))
    .sort((a, b) => b.entryCount - a.entryCount);
}

// ---------------------------------------------------------------------------
// Quran Approach-status breakdown -- richer than the universal report
// because Quran has real structured trackable data (claimedStatus per
// Approach) nothing else has yet (CLAUDE.md, Phase 8 scope). Reads a SINGLE
// person's own records (listAllRecordsForPerson -- one query, every chunk
// they touch, never quranrevival.html's own per-surah Explore loop) -- one
// student at a time by design, matching the load-speed budget the rest of
// this module respects ("on first use", never "everyone at once").
// ---------------------------------------------------------------------------

const ON_RAMP_STATUSES = ["not_started", "learning", "practising", "achieved", "mastered"];

/** Per-status counts for a list of claimedStatus values -- summarizeStatuses() itself only returns the achieved-or-better roll-up (I7), not each status's own count, and a report table needs the full six-way split. */
function statusHistogram(statusIds) {
  const counts = Object.fromEntries(ON_RAMP_STATUSES.map((s) => [s, 0]));
  for (const s of statusIds) if (s in counts) counts[s]++;
  return counts;
}

/**
 * claimedStatus-based counts per Approach, for one person's Quran records
 * only. claimedStatus, not confirmedStatus -- matching quranrevival.html's
 * own wheel/coverage reads (poolCoverageStatus), the "what's actually been
 * done" axis, not "what's been signed off yet". Every active Approach
 * appears even with zero entries, so the report shows the full 30-item
 * shape, not just whatever's been touched (I7: not_applicable is excluded
 * from countedTotal/ratio, never counted as zero).
 */
export function summarizeQuranApproaches(personRecordsEntries, trackables) {
  const quranTrackables = trackables
    .filter((t) => t.subjectId === "quran" && t.status !== "archived")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const byTrackable = new Map(quranTrackables.map((t) => [t.id, []]));
  for (const e of personRecordsEntries) {
    if (e.subjectId !== "quran") continue;
    if (!byTrackable.has(e.trackableId)) byTrackable.set(e.trackableId, []);
    byTrackable.get(e.trackableId).push(e.claimedStatus);
  }

  return quranTrackables.map((t) => {
    const statusIds = byTrackable.get(t.id) ?? [];
    return {
      trackableId: t.id,
      name: langText(t.name, getAppLang(), t.id),
      groupName: langText(t.groupName, getAppLang(), ""),
      byStatus: statusHistogram(statusIds),
      ...summarizeStatuses(statusIds),
    };
  });
}

// ---------------------------------------------------------------------------
// CSV + print -- same two outputs the old app's own Monitor report had
// (index.html's exportWeekCSV/exportMonthCSV/doPrint), rebuilt against this
// schema's flat activity-entry rows.
// ---------------------------------------------------------------------------

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** Flat CSV rows (header row first) for a set of activity entries -- one row per entry, names resolved from the caller's already-loaded roster/subjectTree/trackables (no extra reads here). */
export function entriesToCsvRows(entries, { roster, subjectTree, trackables }) {
  const personNameOf = (id) => { const p = roster.find((r) => r.id === id); return p ? langText(p.name, getAppLang(), id) : id; };
  const subjectNameOf = (id) => { const n = subjectTree.find((s) => s.id === id); return n ? langText(n.name, getAppLang(), id) : id; };
  const trackableNameOf = (id) => { const t = trackables.find((tr) => tr.id === id); return t ? langText(t.name, getAppLang(), id) : (id ?? ""); };

  // Full app translation, phase 4: the HEADER row is translated (it is a
  // label someone reads), but the date, the unit key and the action are
  // left exactly as stored. A CSV is a data export -- it gets opened in a
  // spreadsheet, filtered and sorted, and possibly read back -- so the
  // canonical identifier is the right thing to carry, the same reason
  // STATUSES keeps its English label as the stored value. Names are already
  // language-keyed tenant data (I11), so those follow the reader.
  const rows = [[t("Date"), t("Student"), t("Subject"), t("Unit"), t("Approach"), t("Action")]];
  for (const e of entries) {
    rows.push([e.date, personNameOf(e.personId), subjectNameOf(e.subjectId), e.unitKey, trackableNameOf(e.trackableId), e.action]);
  }
  return rows;
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Opens a plain, print-styled window around already-rendered report HTML (the page's own report container's innerHTML) -- "print what's on screen," same shape as the old app's doPrint(), not a re-fetch. A blocked pop-up is surfaced with an alert rather than failing silently (I15's spirit -- this isn't a Firestore write, but the same "never just fail quietly" rule applies to any user-initiated action). */
export function printReportHtml(title, innerHtml) {
  const win = window.open("", "_blank", "width=1050,height=780");
  if (!win) {
    alert(t("Print pop-up blocked. Allow pop-ups for this site, then try again."));
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#0f172a;font-size:12px}
    table{border-collapse:collapse;width:100%;margin-bottom:1.4rem}
    th,td{text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #ddd}
    h1,h2{margin:0 0 0.6rem}
    tr{page-break-inside:avoid} @page{margin:1.5cm}
  </style></head><body>${innerHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try { win.print(); } catch { /* pop-up already surfaced above if this was ever going to fail */ }
    setTimeout(() => { try { win.close(); } catch { } }, 1500);
  }, 400);
}
