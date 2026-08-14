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
