// Decision 96, "Check a dua" (the Owner: "Dua. yes to all."): where a check is kept.
//
// A check is kept in the madrasah's own document, ayahCollections/{tenantId}, in the field duaChecks.<dua>, and is
// written ALONE with a field-path update, exactly as saveAsmaDescription writes nameDescriptions.<n>. No Rules change:
// that document's update rule is canAdminCatalogue(tenantId) and carries no hasOnly() list. Only Owner and Prime may
// check (a "View as" preview narrows it). The document is read once when the Dua tab opens, never at startup (I9).
// Loaded lazily by hadith-browser.js so the browsing stays Firebase-free at its core.

import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { getActiveContext, effectiveRoles } from "./session-context.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";

/** { uid, tenantId, personId, canCheck } or null when nobody is signed in with a madrasah chosen. */
export function getDuaCheckSession() {
  const uid = auth.currentUser?.uid ?? null;
  const ctx = getActiveContext();
  if (!uid || !ctx?.tenantId) return null;
  const effRoles = effectiveRoles(ctx.roles ?? [], ctx.viewAsRole ?? null);
  return { uid, tenantId: ctx.tenantId, personId: ctx.personId ?? null, canCheck: effRoles.some((r) => r === "owner" || r === "prime") };
}

/** { exists, checks: { "<dua>": check } } -- one read of the madrasah's document. */
export async function loadDuaChecks(session) {
  const snap = await getDoc(doc(db, TENANT.AYAH_COLLECTIONS, session.tenantId));
  const d = snap.exists() ? snap.data() : null;
  return { exists: !!d, checks: d?.duaChecks && typeof d.duaChecks === "object" ? { ...d.duaChecks } : {} };
}

/** The name to put on a check: the person's own name in the reader's language, else their id. */
async function checkerName(session) {
  if (!session.personId) return "";
  try {
    const snap = await getDoc(doc(db, TENANT.TENANT_PEOPLE, session.personId));
    return snap.exists() ? langText(snap.data().name, getAppLang(), session.personId) : session.personId;
  } catch { return session.personId; }
}

/** Saves one dua's check alone (a field-path update; a create when the document is not there yet). Throws on failure (I15). */
export async function saveDuaCheck(session, dua, check, docExists) {
  const n = String(dua);
  if (!/^\d{1,6}$/.test(n)) throw new Error(`Invalid dua number "${dua}".`);
  const stored = { ...check, by: session.personId ?? "", byName: await checkerName(session), at: new Date().toISOString() };
  if (docExists) await updateDocument(db, TENANT.AYAH_COLLECTIONS, session.tenantId, { [`duaChecks.${n}`]: stored });
  else await createDocument(db, TENANT.AYAH_COLLECTIONS, session.tenantId, { tenantId: session.tenantId, duaChecks: { [n]: stored } }, session.uid);
  return stored;
}
