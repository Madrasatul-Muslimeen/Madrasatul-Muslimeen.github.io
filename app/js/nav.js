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
  { href: "life-skill.html", label: "Life Skill" }, // owner: independent module, pulled out of General Study this round
  { href: "health-study.html", label: "Health" }, // Phase 7 -- routine renderer
  { href: "ldog-study.html", label: "Learn Deen On-the-Go" }, // Phase 7 -- pulled out of Deen Study, routine renderer
  { href: "records.html", label: "Records" },
  { href: "monitor.html", label: "Monitor" }, // Phase 8 -- reads whatever's visible to the signed-in login, same as Records
  { href: "homework.html", label: "Homework" }, // Phase 9 -- assign/mark/score, person-only (no classes until Phase 10)
  { href: "course-offers.html", label: "Course Offers" }, // Phase 7 round 2 -- offers + enrolments, Stage B1
  { href: "classes.html", label: "Classes", ownerPrimeOnly: true }, // Phase 10 -- classes + real per-student teacher scoping, Stage B2
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
  // Phase 10: real per-student teacher assignment now exists (classes.html
  // + teacherStudentLinks) -- a teacher preview is scoped to whoever
  // they're actually enrolled to teach, not the full roster any more.
  // Homework/assignments is the one surface that's still tenant-wide for
  // teachers (see isAssignmentCreator's own comment in firestore.rules for
  // why) -- noted here since it's the one place "previewing as teacher"
  // can still look broader than everywhere else.
  const teacherGapNote = viewAsRole === "teacher" ? " (Homework still shows every assignment — per-teacher scoping isn't built there yet)" : "";
  const previewNotice = viewAsRole
    ? `<span class="nav-preview-notice">Previewing as: ${viewAsRole}${teacherGapNote} — change this on the People page</span>`
    : "";
  const legacyLink = `<a href="${LEGACY_APP_URL}" class="nav-legacy-link" target="_blank" rel="noopener">Old app ↗</a>`;
  return `<nav class="app-nav">${items}${previewNotice}${legacyLink}</nav>`;
}
