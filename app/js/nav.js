// Shell round 1 (option A, agreed with the owner 8 Aug 2026) — a small
// shared nav strip connecting the separate phase-built pages, since none of
// them link to each other today.
//
// I2: a renderer, not a module -- takes roles in, HTML out. Never touches
// Firebase, never computes roles itself; the caller already knows them from
// its own sign-in bootstrap.

const LINKS = [
  { href: "quranrevival.html", label: "Study" },
  { href: "deen-study.html", label: "Deen Study" }, // Phase 6
  { href: "arabic-study.html", label: "Arabic" }, // Phase 6 (topic-renderer rollout)
  { href: "hadith-study.html", label: "Hadith" },
  { href: "general-study.html", label: "General Study" },
  { href: "naturelife-study.html", label: "Nature-Life" },
  { href: "records.html", label: "Records" },
  { href: "people.html", label: "People", ownerPrimeOnly: true },
  { href: "catalogue.html", label: "Catalogue", ownerPrimeOnly: true },
];

// Owner request, 9 Aug 2026: a quick way to jump to the old app and back
// while porting more of its features across. Hardcoded absolute URL, not
// a relative path -- /legacy/ only exists on the production mirror
// (madrasatul-muslimeen.github.io), not in this dev repo, so a relative
// link would 404 locally. Opens in a new tab (not a navigation) so the
// current session/place in the new app is never lost just from peeking at
// the old one. One-way only -- index.html itself is reference-only, never
// edited, so there is no matching link back from inside the old app.
const LEGACY_APP_URL = "https://madrasatul-muslimeen.github.io/legacy/index.html";

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). People/Catalogue only show for owner/prime -- everyone else just gets Study + Records. viewAsRole (round 11): when set, shows a "Previewing as" notice so it's never ambiguous why the page looks scoped down -- change/exit it from the People page's own dropdown. */
export function renderNavBar(roles = [], viewAsRole = null) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();
  const items = LINKS.filter((l) => !l.ownerPrimeOnly || canAdmin)
    .map((l) => {
      const isCurrent = l.href === currentFile;
      return `<a href="${l.href}" class="nav-link${isCurrent ? " nav-current" : ""}"${isCurrent ? ' aria-current="page"' : ""}>${l.label}</a>`;
    })
    .join("");
  const teacherGapNote = viewAsRole === "teacher" ? " (shows the full roster — per-student teacher assignment isn't built yet)" : "";
  const previewNotice = viewAsRole
    ? `<span class="nav-preview-notice">Previewing as: ${viewAsRole}${teacherGapNote} — change this on the People page</span>`
    : "";
  const legacyLink = `<a href="${LEGACY_APP_URL}" class="nav-legacy-link" target="_blank" rel="noopener">Old app ↗</a>`;
  return `<nav class="app-nav">${items}${previewNotice}${legacyLink}</nav>`;
}
