// Role names, in the reader's own language (full app translation, phase 4).
//
// Found by opening a rendered page, not by the coverage report: the tenant
// picker on all 13 signed-in pages prints "Madrasatul Muslimeen (owner,
// prime)" and the nav's "Previewing as" notice prints a bare role id. Both
// stayed English right through phases 1-3, because the identifier reaches
// t() through a variable and no extractor pattern could see it.
//
// WHY ITS OWN FILE. Roles belong to session-context.js, but that module
// imports the Firestore SDK, and nav.js needs these labels while being --
// by its own stated contract (I2) -- a pure renderer that never touches
// Firebase. A three-line module with one dependency keeps both true.
//
// The identifiers themselves are never touched: they are what
// firestore.rules checks and what tenantMemberUids stores. Named *_LABELS
// so tools/i18n-coverage.mjs counts the wording -- see its own note on the
// label-map convention.

import { t } from "./i18n.js";

const ROLE_LABELS = Object.freeze({
  owner: "Owner",
  prime: "Prime",
  teacher: "Teacher",
  guardian: "Guardian",
  student: "Student",
  platformAdmin: "Platform admin",
});

/** One role id as text. An unknown id falls through unchanged rather than rendering blank. */
export function roleLabel(role) {
  const label = ROLE_LABELS[role];
  return label ? t(label) : (role ?? "");
}

/** A membership's whole role list, ready to print: "Owner, Prime". */
export function roleListLabel(roles) {
  return (roles ?? []).map(roleLabel).join(", ");
}

// Lifecycle status, shared by every archivable thing in the app. I4 is why
// the list looks like this: nothing is ever deleted, so a status is how a
// thing leaves active use -- archived, ended, revoked or consumed.
const ENTITY_STATUS_LABELS = Object.freeze({
  active: "Active",
  archived: "Archived",
  ended: "Ended",
  // modules.js seeds a module as "planned" and flips it to "active" when
  // that module's real UI ships -- so the Catalogue's Modules table shows
  // this one on any module not yet built.
  planned: "Planned",
  pending: "Pending",
  consumed: "Accepted",
  revoked: "Revoked",
  draft: "Draft",
});

export function entityStatusLabel(status) {
  const label = ENTITY_STATUS_LABELS[status];
  return label ? t(label) : (status ?? "");
}

// Confirmation state (I6: frozen when marked, never recalculated). Moved
// here in phase 6 from records.js, which owns the WRITING of it but not
// the wording -- asma-renderer.js needs to print it and is, by the same
// contract nav.js holds (I2), a pure renderer that must never gain a
// Firebase dependency. records.js re-exports this rather than keeping a
// second copy, the same way course-offers.js does for the role labels.
const CONFIRM_STATE_LABELS = Object.freeze({
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  returned: "Returned",
});

export function confirmStateLabel(confirmState) {
  const label = CONFIRM_STATE_LABELS[confirmState];
  return label ? t(label) : (confirmState ?? "");
}
