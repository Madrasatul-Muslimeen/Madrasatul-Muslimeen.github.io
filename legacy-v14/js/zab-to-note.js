// Zab round Z5 (PCF J25, issue #829) -- "→ Note": a Zab item becomes a Note in Mapping My Journey.
//
// NO NEW NOTE CODE. The Note is made by note-foundation.js's own createPermanentNote() and filed by its own
// createNotePlacement() -- the same two calls journey-map.html's createNoteInFolder() makes. This module only
// (1) turns an item into a title and a safe HTML body, (2) sequences the writes so that nothing is half done, and
// (3) trashes the item (never deletes it: I4, D6) with `noteId` pointing at the new Note.
//
// The Note belongs to the PERSON PRESSING THE BUTTON (ctx.personId), not to the item's addedByPersonId: Notes are
// personal even though the family Zab is shared.
//
// TAGS. An item's `tags` are free text; a Note's tags are rows in `noteTags` linked by id (tagNote). Creating tag
// rows is Mapping My Journey's own business, so the item's tags are NOT carried over. The body says nothing of them.
//
// Nothing here runs until the reader presses → Note (I9).

import { createPermanentNote, createNotePlacement, listAllActiveFoldersForOwner } from "./note-foundation.js";
import { safeWrite } from "./errors.js";
import { t } from "./i18n.js";
import * as zab from "./zab-data.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The Note's title: the item's text, cut to its first non-empty line. */
export function noteTitleFor(item) {
  const first = String(item?.text ?? "").split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
  return first.slice(0, 200);
}

/** The Note's body as simple, escaped HTML. Every part the item has is written, whatever its pocket's kind. */
export function noteBodyFor(item) {
  const parts = [];
  const lines = String(item?.text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const l of lines) parts.push(`<p>${esc(l)}</p>`);
  const url = zab.asUrl(item?.url);
  if (url) parts.push(`<p><a href="${esc(url)}" rel="noopener">${esc(url)}</a></p>`);
  if (zab.isDay(item?.due)) parts.push(`<p>${esc(t("Due"))}: ${esc(item.due)}</p>`);
  if (Array.isArray(item?.steps) && item.steps.length) {
    parts.push(`<ul>${item.steps.filter((s) => s && s.t).map((s) => `<li>${s.d === true ? "☑" : "☐"} ${esc(s.t)}</li>`).join("")}</ul>`);
  }
  if (Number.isFinite(item?.stars) && item.stars >= 1) parts.push(`<p>${esc(t("Stars"))}: ${"★".repeat(Math.min(3, item.stars))}${"☆".repeat(Math.max(0, 3 - item.stars))}</p>`);
  if (Array.isArray(item?.topics) && item.topics.length) parts.push(`<p>${esc(t("Topics"))}: ${item.topics.map(esc).join(", ")}</p>`);
  if (item?.qty) parts.push(`<p>${esc(t("Quantity"))}: ${esc(item.qty)}</p>`);
  if (item?.shop) parts.push(`<p>${esc(t("Shop"))}: ${esc(item.shop)}</p>`);
  return parts.join("") || "<p></p>";
}

/** The reader's active Mapping My Journey folders, A-Z. Throws on a failed read (the caller shows it). */
export async function listFoldersForPicker(db, ctx) {
  const rows = await listAllActiveFoldersForOwner(db, { tenantId: ctx.tenantId, ownerPersonId: ctx.personId });
  return rows
    .map((f) => ({ folderId: f.folderId ?? f.id.slice(ctx.tenantId.length + 2), name: String(f.name ?? "").trim() }))
    .filter((f) => f.folderId && f.name)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export const noteHref = (noteId) => `./journey-map.html?note=${encodeURIComponent(noteId)}&back=1`;

/**
 * Make the Note, file it, trash the item. Returns { ok: true, noteId }, or { ok: false, stage, noteId?, entry }:
 *   stage "note"    -- nothing was written;
 *   stage "filing"  -- the Note WAS made, filing it failed; the item is untouched;
 *   stage "trash"   -- the Note WAS made and filed, trashing the item failed; the item is untouched.
 */
export async function itemToNote(db, ctx, item, folderIds = []) {
  const owner = { tenantId: ctx.tenantId, ownerPersonId: ctx.personId, ownerUid: ctx.uid, actorUid: ctx.uid };
  const made = await safeWrite(
    () => createPermanentNote(db, { ...owner, title: noteTitleFor(item), bodyHtml: noteBodyFor(item) }),
    { collection: "notes", action: "Zab item to Note" });
  if (!made.ok) return { ok: false, stage: "note", entry: made.entry };
  const noteId = made.result.noteId;
  for (const folderId of folderIds) {
    const filed = await safeWrite(
      () => createNotePlacement(db, { ...owner, noteId, folderId, order: 0 }),
      { collection: "notePlacements", action: "Zab Note filing" });
    if (!filed.ok) return { ok: false, stage: "filing", noteId, entry: filed.entry };
  }
  const trashed = await zab.trashItemAsNote(db, ctx, item.itemId, noteId);
  if (!trashed.ok) return { ok: false, stage: "trash", noteId, entry: trashed.entry };
  return { ok: true, noteId };
}
