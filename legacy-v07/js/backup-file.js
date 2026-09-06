// Backup file — pure renderer (I2): the collected object in, one complete
// HTML document out. Imports nothing at all: no Firebase, no i18n, no app
// state. That is deliberate and load-bearing twice over.
//
//   - It can be tested without a browser or a signed-in session.
//   - The FILE IT PRODUCES must open on a machine that has never heard of
//     this app: no stylesheet link, no script src, no font download, no
//     network of any kind. Everything it needs is inside it.
//
// The file's own headings are written in whatever language the app was in
// when the backup was taken -- I11 applies here like anywhere else, and the
// person who reads a backup is the person who was using the app. `t()` runs
// at BUILD time, so the finished file is still one static, self-contained
// document with no i18n machinery inside it; only this builder needs the
// catalogue. The tenant's own content (names, notes, taglines) is of course
// reproduced exactly as it was written, in whatever language it was written
// in -- that is data, not interface.
//
// The one import is i18n.js, which is itself Firebase-free (nav.js, a pure
// renderer by contract, already imports it) -- so this file's purity rule is
// intact: no Firebase, no app state, no DOM.

import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { langText } from "./lang.js";
// The same label helpers the app's own screens use, so a backup reads the way
// the app reads rather than printing raw stored ids ("pending", "practised",
// "active"). Both modules are Firebase-free -- labels.js exists precisely so a
// pure renderer can print these, see its own header -- which is what keeps this
// file's no-Firebase rule intact. The canonical ids are untouched in the data
// block at the end; this only changes what a PERSON sees.
import { statusLabel } from "./unit-keys.js";
import { confirmStateLabel, entityStatusLabel, activityActionLabel, roleListLabel } from "./labels.js";

// D7 stores weekStartsOn as 0=Sunday..6=Saturday. Printing the bare number
// ("Week starts on: 6") is meaningless in either language -- the same
// raw-identifier-on-screen problem v07.36 found in the Asma detail panel.
// These seven are the same words onboarding.html's own picker offers.
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayText(n) {
  return Number.isInteger(n) && WEEKDAYS[n] ? t(WEEKDAYS[n]) : "—";
}

/** A stored lifecycle status ("active"/"archived"/…) as words, or an em dash. */
function statusText(value) {
  return value ? entityStatusLabel(value) : "—";
}

/** The finished file's own `lang` attribute -- what it was built in, so a
    screen reader and the browser's own hyphenation both get told the truth. */
function getLangAttr() {
  return getAppLang() === "bn" ? "bn" : "en";
}

/** Text -> HTML. Everything user-authored goes through this or sanitizeNoteHtml() below; nothing is ever concatenated raw. */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// The only tags an āyah note can legitimately contain -- exactly what the
// Notes editor's own palette can produce (bold/italic/underline/strike,
// three heading levels, both list kinds, plus the div/br/span the browser's
// own contenteditable inserts as it goes).
const NOTE_TAGS = new Set(["b", "i", "u", "s", "strike", "strong", "em", "p", "br", "div", "span", "h1", "h2", "h3", "ul", "ol", "li", "blockquote"]);

/**
 * Notes are stored as rich text the reader typed, so they are the one thing
 * in this file that is HTML rather than text. They are reproduced with
 * formatting intact but stripped to the tag list above, with EVERY attribute
 * dropped -- no href, no style, no onclick, no src.
 *
 * The threat is small and real: a backup is a local file the owner opens by
 * double-clicking, so it runs with file:// privileges, and whatever a note
 * contains has never been through a sanitizer anywhere else in this app. A
 * note is content to be preserved, not markup to be trusted, and preserving
 * "what it said" never requires preserving "what it could do".
 */
export function sanitizeNoteHtml(html) {
  let out = String(html ?? "");
  // Whole elements whose CONTENT is also dangerous go first, openers and
  // bodies together -- stripping only the tags would leave script text
  // sitting in the page as visible garbage.
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, "");
  // Then every remaining tag: keep it only if it is on the list, and keep it
  // bare -- name only, no attributes at all.
  out = out.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, slash, name) => {
    const tag = name.toLowerCase();
    if (!NOTE_TAGS.has(tag)) return "";
    return `<${slash}${tag}>`;
  });
  return out;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const s = String(iso);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return esc(s);
  return esc(d.toISOString().replace("T", " ").slice(0, 16)) + " UTC";
}

/**
 * A language-keyed name ({en, bn}) or a plain string, whichever a document
 * happens to carry, read in the language the backup is being taken in.
 *
 * This goes through langText() rather than reading `.en` directly, which was
 * this function's own first-draft bug and is the same one v07.35 found in
 * classes.html: a tenant that HAS authored Bangla for a name still got the
 * English, in a file whose every heading around it was Bangla. I11 is about
 * the tenant's own names as much as the app's own words.
 *
 * An EMPTY string counts as absent, not as a value -- a tenant that has
 * cleared its banner stores {en: ""}, and langText() would hand that back as
 * a blank cell rather than the em dash every other blank cell shows.
 */
function nameOf(value, fallback = "—") {
  if (value == null) return fallback;
  const out = langText(value, getAppLang(), "");
  return typeof out === "string" && out.trim() !== "" ? out : fallback;
}

function table(headers, rows) {
  if (!rows.length) return `<p class="empty">${t("Nothing recorded.")}</p>`;
  return `<div class="scroll"><table>
  <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`;
}

/** One collapsible section. Open by default when it holds something, shut when it is empty -- so scrolling the file is scrolling real content. */
function section(id, title, count, bodyHtml) {
  const n = typeof count === "number" ? count : null;
  return `<details class="sec"${n === 0 ? "" : " open"} id="${esc(id)}">
  <summary><span class="sec-title">${esc(title)}</span>${n === null ? "" : `<span class="count">${num(n)}</span>`}</summary>
  <div class="sec-body">${bodyHtml}</div>
</details>`;
}

/** The subject tree, indented by its own ancestorIds depth (I12's own field, already on every node). */
function subjectRows(subjects) {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const depth = (s) => (s.ancestorIds ?? []).filter((a) => byId.has(a)).length;
  return [...subjects]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => [
      `<span style="padding-left:${depth(s) * 1.2}rem">${esc(nameOf(s.name, s.id))}</span>`,
      esc(s.id),
      esc((s.moduleIds ?? []).join(", ") || "—"),
      esc(statusText(s.status)),
      esc(nameOf(s.gloss, "")),
    ]);
}

function personSections(study, peopleById) {
  if (!study.length) return `<p class="empty">${t("No per-person study data was read.")}</p>`;
  return study.map((p) => {
    const name = esc(nameOf(peopleById.get(p.personId)?.name, p.name ?? p.personId));
    const records = p.records ?? [];
    const notes = Object.entries(p.ayahNotes?.notes ?? {});
    const saved = (p.bookmarks?.saved ?? []);
    const folders = (p.bookmarks?.folders ?? []);
    const activity = (p.activityWeeks ?? []).flatMap((w) => (w.entries ?? []).map((e) => ({ ...e, weekKey: w.weekKey ?? w.id })));

    const notesHtml = notes.length
      ? notes.map(([unitKey, note]) => `<article class="note">
          <h4>${esc(unitKey)}<span class="when">${fmtDate(note?.updatedAt)}</span></h4>
          <div class="note-body">${sanitizeNoteHtml(note?.html)}</div>
        </article>`).join("")
      : `<p class="empty">${t("No notes.")}</p>`;

    return `<details class="person"${records.length || notes.length || saved.length || activity.length ? " open" : ""}>
      <summary><span class="sec-title">${name}</span><span class="count">${t("{claims} claims · {notes} notes · {marks} bookmarks · {logs} log entries", { claims: num(records.length), notes: num(notes.length), marks: num(saved.length), logs: num(activity.length) })}</span></summary>
      <div class="sec-body">
        <h3>${t("Claims and confirmations")} <span class="count">${num(records.length)}</span></h3>
        ${table([t("Unit"), t("Chunk"), t("Subject"), t("Approach"), t("Status"), t("Confirmed"), t("Claimed at"), t("By")],
          records.map((r) => [
            esc(r.unitKey ?? r.entryKey), esc(r.chunkKey), esc(r.subjectId), esc(r.trackableId),
            esc(r.claimedStatus ? statusLabel(r.claimedStatus) : "—"), esc(r.confirmState ? confirmStateLabel(r.confirmState) : "—"), fmtDate(r.claimedAt), esc(r.claimedByPersonId),
          ]))}

        <h3>${t("Āyah notes")} <span class="count">${num(notes.length)}</span></h3>
        ${notesHtml}

        <h3>${t("Bookmarks")} <span class="count">${num(saved.length)}</span></h3>
        ${table([t("Name"), t("Module"), t("Subject"), t("Position"), t("Folder"), t("For"), t("Retired")],
          saved.map((b) => [
            esc(b.name ?? "—"), esc(b.moduleId), esc(b.subjectId), esc(b.position),
            esc(folders.find((f) => f.id === b.folderId)?.name ?? "—"),
            esc(b.personTagId ?? "—"), b.removed ? t("yes") : "",
          ]))}
        ${folders.length ? `<h4>${t("Folders")}</h4>${table([t("Folder"), t("Inside"), t("For"), t("Retired")],
          folders.map((f) => [esc(f.name), esc(folders.find((p2) => p2.id === f.parentId)?.name ?? "—"), esc(f.personTagId ?? "—"), f.removed ? t("yes") : ""]))}` : ""}

        <h3>${t("Activity log")} <span class="count">${num(activity.length)}</span></h3>
        ${table([t("Date"), t("Subject"), t("Unit"), t("Action"), t("Approach"), t("Week")],
          activity.sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .map((e) => [esc(e.date), esc(e.subjectId), esc(e.unitKey), esc(activityActionLabel(e.action)), esc(e.trackableId ?? "—"), esc(e.weekKey ?? "—")]))}

        ${(p.levels ?? []).length ? `<h3>${t("Grade levels")}</h3>${table([t("Ladder"), t("Level"), t("From")], p.levels.map((l) => [esc(l.ladderId), esc(l.levelId), esc(l.fromDate)]))}` : ""}
        ${(p.enrolments ?? []).length ? `<h3>${t("Enrolments")}</h3>${table([t("Context"), t("Type"), t("Role"), t("Status")], p.enrolments.map((e) => [esc(e.contextId), esc(e.contextType), esc(e.roleInContext), esc(statusText(e.status))]))}` : ""}
      </div>
    </details>`;
  }).join("");
}

/**
 * The whole file. `data` is exactly what collectBackup() returned.
 *
 * The raw JSON rides along in a <script type="application/json"> block at
 * the end -- readable by any tool, and the reason this file is a real backup
 * rather than a printout: what is restored later is that block, not the
 * tables above it. The tables are for a person; the block is for a machine.
 */
export function buildBackupHtml(data) {
  const peopleById = new Map((data.people ?? []).map((p) => [p.id, p]));
  const cat = data.catalogue ?? {};
  const org = data.org ?? {};
  const qcr = data.collections?.ayah?.collections ?? [];
  const asma = data.collections?.asma ?? {};
  const study = data.study ?? [];

  const totals = {
    people: (data.people ?? []).length,
    claims: study.reduce((n, p) => n + (p.records?.length ?? 0), 0),
    notes: study.reduce((n, p) => n + Object.keys(p.ayahNotes?.notes ?? {}).length, 0),
    bookmarks: study.reduce((n, p) => n + (p.bookmarks?.saved?.length ?? 0), 0),
    activity: study.reduce((n, p) => n + (p.activityWeeks ?? []).reduce((m, w) => m + (w.entries?.length ?? 0), 0), 0),
    subjects: (cat.subjects ?? []).length,
    approaches: (cat.trackables ?? []).length,
    qcr: qcr.length,
  };

  // The JSON is embedded as-is inside a non-executing script block. The only
  // sequence that can escape such a block is a literal "</script", so that
  // one is broken up -- the standard, and only necessary, escape here.
  const json = JSON.stringify(data, null, 1).replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html lang="${getLangAttr()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QuranRevival backup — ${esc(nameOf(data.tenant?.name, data.tenantId))} — ${esc(String(data.exportedAt).slice(0, 10))}</title>
<style>
  /* Self-contained on purpose: system fonts only, so this file renders with
     no network. The Bengali and Arabic families are named explicitly because
     a bare system-ui can resolve to a face with no glyphs for either -- empty
     boxes where a note or an āyah should be, which would make the backup
     useless for exactly the content most worth keeping. */
  :root {
    --ink: #1a1a1a; --dim: #666; --line: #e3e3e3; --navy: #1F3A6E; --gold: #B8862F;
    --bg: #fdfdfb; --card: #fff;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 1.2rem 1rem 5rem; background: var(--bg); color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Bengali", "Nirmala UI", sans-serif;
    line-height: 1.45; font-size: 15px;
  }
  .wrap { max-width: 68rem; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 0.2rem; }
  h2 { font-size: 1.05rem; margin: 0; }
  h3 { font-size: 0.95rem; margin: 1.4rem 0 0.3rem; color: var(--navy); }
  h4 { font-size: 0.85rem; margin: 1rem 0 0.2rem; color: var(--dim); }
  .lede { color: var(--dim); margin: 0 0 1rem; }
  .head {
    background: var(--card); border: 1px solid var(--line); border-radius: 0.6rem;
    padding: 1rem 1.1rem; margin-bottom: 1rem;
  }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.5rem 1.2rem; margin-top: 0.8rem; }
  .meta div { font-size: 0.85rem; }
  .meta dt { color: var(--dim); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta dd { margin: 0; font-weight: 600; word-break: break-word; }
  .totals { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.9rem; }
  .pill { background: #f3f1ea; border: 1px solid #e6e1d2; border-radius: 2rem; padding: 0.2rem 0.7rem; font-size: 0.8rem; }
  .pill b { color: var(--navy); }
  .warn { background: #fff8e6; border: 1px solid #f0d9a0; border-radius: 0.5rem; padding: 0.7rem 0.9rem; font-size: 0.88rem; margin-top: 0.9rem; }
  .warn ul { margin: 0.4rem 0 0; padding-left: 1.1rem; }
  .sec, .person {
    background: var(--card); border: 1px solid var(--line); border-radius: 0.6rem;
    margin-bottom: 0.6rem; overflow: hidden;
  }
  summary { cursor: pointer; padding: 0.6rem 0.9rem; display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
  summary::-webkit-details-marker { color: var(--gold); }
  .sec-title { font-weight: 700; font-size: 0.95rem; }
  .count { color: var(--dim); font-size: 0.78rem; }
  .sec-body { padding: 0 0.9rem 1rem; border-top: 1px solid var(--line); }
  .person { margin: 0.5rem 0; }
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.3rem; }
  th, td { text-align: left; padding: 0.32rem 0.45rem; border-bottom: 1px solid #f0f0f0; font-size: 0.8rem; vertical-align: top; }
  th { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dim); background: #fafaf8; position: sticky; top: 0; }
  .empty { color: var(--dim); font-size: 0.85rem; font-style: italic; margin: 0.4rem 0; }
  .note { border-left: 3px solid var(--gold); padding: 0.1rem 0 0.1rem 0.7rem; margin: 0.7rem 0; }
  .note h4 { margin: 0 0 0.2rem; color: var(--navy); font-size: 0.82rem; display: flex; gap: 0.6rem; align-items: baseline; }
  .note .when { color: var(--dim); font-weight: 400; font-size: 0.72rem; }
  .note-body { font-size: 0.88rem; }
  .note-body h1, .note-body h2, .note-body h3 { font-size: 0.95rem; margin: 0.3rem 0; }
  .ar { font-family: "Traditional Arabic", "Amiri", "Scheherazade New", "Noto Naskh Arabic", serif; font-size: 1.25rem; direction: rtl; }
  .tools { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.9rem; }
  .tools input { flex: 1 1 14rem; padding: 0.4rem 0.6rem; border: 1px solid #ccc; border-radius: 0.4rem; font-size: 0.9rem; }
  .tools button { padding: 0.4rem 0.8rem; border-radius: 0.4rem; border: 1px solid var(--navy); background: var(--navy); color: #fff; font-size: 0.85rem; cursor: pointer; }
  .tools button.sec2 { background: #fff; color: var(--navy); }
  footer { color: var(--dim); font-size: 0.8rem; margin-top: 2rem; text-align: center; }
  @media print {
    .tools { display: none; }
    .sec, .person { break-inside: avoid; border: none; }
    details { display: block; }
    summary { list-style: none; }
  }
</style>
</head>
<body>
<div class="wrap">

  <div class="head">
    <h1>QuranRevival — ${t("backup|noun")}</h1>
    <p class="lede">${t("A complete copy of this account's own data, as it stood at the moment below. This file needs no internet and no app: everything in it is inside it.")}</p>
    <dl class="meta">
      <div><dt>${t("Madrasah / tenant")}</dt><dd>${esc(nameOf(data.tenant?.name, data.tenantId))}</dd></div>
      <div><dt>${t("Taken")}</dt><dd>${fmtDate(data.exportedAt)}</dd></div>
      <div><dt>${t("Taken by")}</dt><dd>${esc(data.exportedBy?.email ?? data.exportedBy?.uid ?? "—")}</dd></div>
      <div><dt>${t("App version")}</dt><dd>v${esc(data.appVersion || "—")}</dd></div>
      <div><dt>${t("Covers")}</dt><dd>${esc(data.scope === "tenant" ? t("Everything for the whole madrasah") : t("What this account can see"))}</dd></div>
      <div><dt>${t("Tenant id")}</dt><dd>${esc(data.tenantId)}</dd></div>
    </dl>
    <div class="totals">
      ${[
        [totals.people, t("people")], [totals.claims, t("claims")], [totals.notes, t("āyah notes")],
        [totals.bookmarks, t("bookmarks")], [totals.activity, t("log entries")], [totals.subjects, t("subjects")],
        [totals.approaches, t("Approaches")], [totals.qcr, t("āyah collections")],
      ].map(([n, label]) => `<span class="pill"><b>${num(n)}</b> ${esc(label)}</span>`).join("\n      ")}
    </div>
    ${(data.couldNotRead ?? []).length ? `<div class="warn"><b>${t("Not everything could be read into this file.")}</b> ${t("That is usually correct rather than a fault — an account is only allowed to read what it is allowed to read. What is missing, and why:")}
      <ul>${data.couldNotRead.map((n) => `<li>${esc(n.label)} — ${esc(t(n.reason))}</li>`).join("")}</ul></div>` : ""}
    <div class="warn"><b>${t("What this file is not.")}</b> ${t("It does not contain the Qur'an text, the Mushaf pages, the recitations or the app's own program code — those are the same for everybody and are kept separately. It holds only what this madrasah wrote: its people, its catalogue, and everything studied, claimed, noted and bookmarked.")}</div>
  </div>

  <div class="tools">
    <input type="search" id="q" placeholder="${esc(t("Filter the tables — a name, an āyah, a date…"))}" aria-label="${esc(t("Filter"))}" />
    <button type="button" id="openAll" class="sec2">${t("Open all")}</button>
    <button type="button" id="shutAll" class="sec2">${t("Close all")}</button>
    <button type="button" id="getJson">${t("Save the data file (JSON)")}</button>
    <button type="button" class="sec2" onclick="window.print()">${t("Print")}</button>
  </div>

  ${section("people", t("People"), (data.people ?? []).length, table(
    [t("Name"), t("Person id"), t("Status"), t("Child"), t("Looked after by"), t("Roles")],
    (data.people ?? []).map((p) => [
      esc(nameOf(p.name, p.id)), esc(p.id), esc(statusText(p.status ?? "active")), p.isMinor ? t("yes") : "",
      esc(nameOf(peopleById.get(p.managedByPersonId)?.name, p.managedByPersonId ?? "—")),
      esc(roleListLabel((data.memberships ?? []).filter((m) => m.personId === p.id && m.status !== "archived").map((m) => m.role)) || "—"),
    ])))}

  ${section("study", t("Study — claims, notes, bookmarks and the activity log"), study.length, personSections(study, peopleById))}

  ${section("subjects", t("Subjects"), (cat.subjects ?? []).length, table([t("Subject"), t("Id"), t("Modules"), t("Status"), t("Description")], subjectRows(cat.subjects ?? [])))}

  ${section("approaches", t("Approaches"), (cat.trackables ?? []).length, table([t("Approach"), t("Id"), t("Subject"), t("Section"), t("Status")],
    [...(cat.trackables ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((tr) => [
      esc(nameOf(tr.name, tr.id)), esc(tr.id), esc(tr.subjectId ?? "—"), esc(nameOf(tr.section, "—")), esc(statusText(tr.status))])))}

  ${section("qcr", t("Āyah collections (QCR)"), qcr.length, qcr.map((c) => `
    <h3>${esc(nameOf(c.title, c.id))} <span class="count">${t("{n} āyāt", { n: num((c.items ?? []).length) })}${c.status === "archived" ? ` · ${t("archived")}` : ""}</span></h3>
    <p class="empty">${esc((c.items ?? []).join("  ·  ") || t("Empty."))}</p>`).join("") || `<p class="empty">${t("Nothing recorded.")}</p>`)}

  ${section("asma", t("Asma ul Husna collections"), (asma.collections ?? []).length, `
    ${table([t("Group"), t("Kind"), t("Names"), t("Status")], (asma.collections ?? []).map((c) => [
      esc(nameOf(c.title, c.id)), esc(c.kind ?? "group"), esc((c.items ?? []).join(", ") || "—"), esc(statusText(c.status ?? "active"))]))}
    ${(asma.extraNames ?? []).length ? `<h4>${t("Names added by this madrasah")}</h4>${table([t("Number"), t("Name"), t("Transliteration"), t("Reference")],
      (asma.extraNames ?? []).map((n) => [esc(n.number), `<span class="ar">${esc(n.arabic ?? "")}</span>`, esc(n.translit ?? "—"), esc(n.ref ?? "—")]))}` : ""}
    ${Object.keys(asma.overrides ?? {}).length ? `<h4>${t("Wording this madrasah changed")}</h4>${table([t("Number"), t("Wording")], Object.entries(asma.overrides ?? {}).map(([k, v]) => [esc(k), esc(v)]))}` : ""}`)}

  ${section("org", t("Classes, course offers and curriculum"), (org.classes ?? []).length + (org.courseOffers ?? []).length + (org.curriculumUnits ?? []).length, `
    <h3>${t("Classes")} <span class="count">${num((org.classes ?? []).length)}</span></h3>
    ${table([t("Class"), t("Id"), t("Status")], (org.classes ?? []).map((c) => [esc(nameOf(c.name, c.id)), esc(c.id), esc(statusText(c.status))]))}
    <h3>${t("Course offers")} <span class="count">${num((org.courseOffers ?? []).length)}</span></h3>
    ${table([t("Offer"), t("Id"), t("Subjects"), t("Status")], (org.courseOffers ?? []).map((o) => [esc(nameOf(o.name, o.id)), esc(o.id), esc((o.subjectIds ?? []).join(", ") || "—"), esc(statusText(o.status))]))}
    <h3>${t("Curriculum units")} <span class="count">${num((org.curriculumUnits ?? []).length)}</span></h3>
    ${table([t("Unit"), t("Id"), t("Subject"), t("Status")], (org.curriculumUnits ?? []).map((u) => [esc(nameOf(u.name, u.id)), esc(u.id), esc(u.subjectId ?? "—"), esc(statusText(u.status))]))}
    <h3>${t("Curriculum plan")} <span class="count">${num((org.curriculumPlan ?? []).length)}</span></h3>
    ${table([t("For"), t("Type"), t("Unit"), t("Term"), t("Week"), t("Status")], (org.curriculumPlan ?? []).map((e) => [esc(e.contextId), esc(e.contextType), esc(e.curriculumUnitId), esc(num(e.term)), esc(num(e.week)), esc(statusText(e.status))]))}`)}

  ${section("grades", t("Grade ladders and levels"), (cat.ladders ?? []).length, `
    ${table([t("Ladder"), t("Id"), t("Status")], (cat.ladders ?? []).map((l) => [esc(nameOf(l.name, l.id)), esc(l.id), esc(statusText(l.status))]))}
    ${(cat.levels ?? []).length ? `<h4>${t("Levels")}</h4>${table([t("Level"), t("Ladder"), t("Order"), t("Status")], (cat.levels ?? []).map((l) => [esc(nameOf(l.name, l.id)), esc(l.ladderId), esc(num(l.order ?? "—")), esc(statusText(l.status))]))}` : ""}`)}

  ${section("homework", t("Homework"), (data.homework?.assignments ?? []).length, `
    ${table([t("Title"), t("Due"), t("Assigned to"), t("Status")], (data.homework?.assignments ?? []).map((a) => [
      esc(a.title ?? a.id), esc(a.dueDate ?? "—"),
      esc((a.assignedToPersonIds ?? []).map((id) => nameOf(peopleById.get(id)?.name, id)).join(", ") || "—"),
      esc(statusText(a.status))]))}
    ${(data.homework?.submissions ?? []).length ? `<h4>${t("Submissions")}</h4>${table([t("Assignment"), t("Person"), t("State"), t("Score"), t("Comment")],
      (data.homework.submissions).map((s) => [esc(s.assignmentId), esc(nameOf(peopleById.get(s.personId)?.name, s.personId)), esc(s.state ?? "—"), esc(num(s.score ?? "—")), esc(s.comment ?? "")]))}` : ""}
    ${(data.homework?.teachingNotes ?? []).length ? `<h4>${t("Your own teaching notes")}</h4>${table([t("About"), t("Written"), t("Note")],
      (data.homework.teachingNotes).map((n) => [esc(nameOf(peopleById.get(n.aboutPersonId)?.name, n.aboutPersonId ?? "—")), fmtDate(n.createdAt), esc(n.text ?? "")]))}` : ""}`)}

  ${section("settings", t("This madrasah's own settings"), null, `
    ${table([t("Setting"), t("Value")], [
      [t("Name"), esc(nameOf(data.tenant?.name, "—"))],
      [t("Kind"), esc(data.tenant?.kind ?? "—")],
      [t("Week starts on"), esc(weekdayText(data.tenant?.weekStartsOn))],
      [t("Banner title"), esc(nameOf(data.tenant?.bannerTitle, "—"))],
      [t("Banner subtitle"), esc(nameOf(data.tenant?.bannerSub, "—"))],
      [t("Created"), fmtDate(data.tenant?.createdAt)],
    ])}
    <h3>${t("Taglines")} <span class="count">${num((data.tenant?.taglines ?? []).length)}</span></h3>
    ${table([t("Order"), t("Line"), t("Links to"), t("Holds"), t("Only on āyah"), t("Status")], [...(data.tenant?.taglines ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((l) => [esc(num(l.order ?? "—")), esc(nameOf(l.text, "—")), esc(l.url ?? "—"), esc(l.holdDays ?? "—"), esc(l.ayahRef ?? "—"), esc(statusText(l.status ?? "active"))]))}
    ${(cat.domains ?? []).length ? `<h3>${t("Domains")}</h3>${table([t("Domain"), t("Status")], (cat.domains ?? []).map((d) => [esc(nameOf(d.name, d.id)), esc(statusText(d.status))]))}` : ""}
    ${(cat.resources ?? []).length ? `<h3>${t("Resources")}</h3>${table([t("Resource"), t("Kind"), t("Where"), t("Status")], (cat.resources ?? []).map((r) => [esc(nameOf(r.title, r.id)), esc(r.kind ?? "—"), esc(r.url ?? "—"), esc(statusText(r.status))]))}` : ""}
    ${(data.invites ?? []).length ? `<h3>${t("Invitations")}</h3>${table([t("Email"), t("Role"), t("State"), t("Sent")], (data.invites ?? []).map((i) => [esc(i.email), esc(i.role), esc(statusText(i.state ?? i.status)), fmtDate(i.createdAt)]))}` : ""}`)}

  <footer>
    ${t("QuranRevival backup · format {n} · the complete data is in this file, in the block below this line.", { n: num(data.formatVersion) })}<br />
    ${t("To restore from it, keep this file — the \"Save the data file (JSON)\" button above extracts the machine-readable copy.")}
  </footer>
</div>

<script type="application/json" id="quranrevival-backup">${json}</script>
<script>
  // The only script in this file, and it never leaves the page: a filter, the
  // open/close pair, and a button that writes the embedded JSON back out as
  // its own file. No network, no storage, nothing that changes the data.
  (function () {
    var q = document.getElementById("q");
    var rowsCache = null;
    function allRows() {
      if (!rowsCache) rowsCache = Array.prototype.slice.call(document.querySelectorAll("tbody tr"));
      return rowsCache;
    }
    q.addEventListener("input", function () {
      var needle = q.value.trim().toLowerCase();
      allRows().forEach(function (tr) {
        tr.style.display = !needle || tr.textContent.toLowerCase().indexOf(needle) !== -1 ? "" : "none";
      });
      if (needle) document.querySelectorAll("details").forEach(function (d) { d.open = true; });
    });
    function setAll(open) { document.querySelectorAll("details").forEach(function (d) { d.open = open; }); }
    document.getElementById("openAll").addEventListener("click", function () { setAll(true); });
    document.getElementById("shutAll").addEventListener("click", function () { setAll(false); });
    document.getElementById("getJson").addEventListener("click", function () {
      var text = document.getElementById("quranrevival-backup").textContent;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = (document.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "quranrevival-backup") + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  }());
</script>
</body>
</html>`;
}

/**
 * Filename that sorts by date and never collides: the madrasah, then the day.
 *
 * Deliberately reads the tenant's ENGLISH name, not nameOf()'s language-aware
 * one. Two reasons, and the first was a real bug found by looking at a Bangla
 * export: stripping a Bangla name to [a-z0-9] leaves NOTHING, so every backup
 * taken in Bangla was called "quranrevival-backup-tenant-<date>". And a file
 * name should not change meaning because someone switched the interface
 * language between one backup and the next -- these are meant to sit in a
 * folder together and sort.
 */
export function backupFilename(data) {
  const name = data.tenant?.name;
  const english = typeof name === "string" ? name : (name?.en ?? "");
  const who = String(english).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `quranrevival-backup-${who || data.tenantId || "tenant"}-${String(data.exportedAt).slice(0, 10)}.html`;
}
