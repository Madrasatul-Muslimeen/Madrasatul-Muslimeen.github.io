// Shell round 1 (option A, agreed with the owner 8 Aug 2026) — a small
// shared nav strip connecting the separate phase-built pages, since none of
// them link to each other today.
//
// Shell round 3 (11 Aug 2026) — the flat ~19-link list this used to render
// had outgrown itself (wrapped/crowded at ~19 links). Reorganized into
// categories per the owner's own mockup: Admin / Study Module / Operation /
// Bookmark / Settings. Location change only, confirmed with the owner --
// no link's destination or gating logic changed, only how they're grouped
// and revealed. Each category is a native <details>/<summary> disclosure --
// no click-handler wiring needed, keeping this file a pure renderer per I2
// (takes roles in, HTML out; the page's own script never has to attach
// anything to what this returns). Individual links can still carry their
// own ownerPrimeOnly flag within a category that's otherwise open to
// everyone (Operation: Classes/Curriculum are owner/prime-only, Records/
// Monitor/Homework/Course Offers aren't) -- same per-item gating the old
// flat list used, just filtered within a category now instead of across
// the whole bar.
//
// Home (Legacy App link, Sign in, Sign out) is deliberately NOT part of
// this file's output any more -- it now lives in each page's own static
// markup, visible before sign-in resolves, same reason the "who" status
// text is static markup (see CLAUDE.md v07.08 -- the sign-in flash fix).
// Folding Home into this renderer would mean it only appears once roles
// are known, i.e. only after sign-in -- exactly the flash this file must
// not reintroduce.
//
// I2: a renderer, not a module -- takes roles in, HTML out. Never touches
// Firebase, never computes roles itself; the caller already knows them from
// its own sign-in bootstrap.

const STUDY_LINKS = [
  { href: "quranrevival.html", label: "Study" },
  { href: "deen-study.html", label: "Deen Study" },
  { href: "arabic-study.html", label: "Arabic" },
  { href: "hadith-study.html", label: "Hadith" },
  { href: "general-study.html", label: "General Study" },
  { href: "naturelife-study.html", label: "Nature-Life" },
  { href: "life-skill.html", label: "Life Skill" },
  { href: "health-study.html", label: "Health" },
  { href: "ldog-study.html", label: "Learn Deen On-the-Go" },
  { href: "asma-study.html", label: "Asma ul Husna" }, // Phase 13 round 1
];

// Owner's mockup order: Curriculum, Course Offers, Homework, Record,
// Monitor. Classes (Phase 10) isn't in the mockup -- it postdates it --
// but is the same kind of owner/prime-only scheduling tool as Curriculum,
// so it sits alongside it rather than getting its own category.
const OPERATION_LINKS = [
  { href: "classes.html", label: "Classes", ownerPrimeOnly: true }, // Phase 10 -- classes + real per-student teacher scoping, Stage B2
  { href: "curriculum.html", label: "Curriculum", ownerPrimeOnly: true }, // Phase 11 -- curriculum units + plan, resources, grades, Stage C
  { href: "course-offers.html", label: "Course Offers" }, // Phase 7 round 2 -- offers + enrolments, Stage B1
  { href: "homework.html", label: "Homework" }, // Phase 9 -- assign/mark/score, person-only
  { href: "records.html", label: "Records" },
  { href: "monitor.html", label: "Monitor" }, // Phase 8 -- reads whatever's visible to the signed-in login, same as Records
];

const ADMIN_LINKS = [
  { href: "people.html", label: "People" },
  { href: "catalogue.html", label: "Catalogue" },
];

// Bookmark and Settings: placeholders only this round, per the owner
// (11 Aug 2026) -- Bookmark's real design (per-subject, multiple named
// bookmarks, its own page, resume-where-left-off) and Settings (Language,
// Appearance) are both explicit future work, not oversights.
const BOOKMARK_PLACEHOLDERS = ["Bookmark"];
const SETTINGS_PLACEHOLDERS = ["Language", "Appearance"];

// Phase 13 round 1: About reads the feature registry live (getFullRegistry())
// -- a real link, not a placeholder, sitting in the same category Settings
// already occupies rather than inventing a sixth category for one link.
const ABOUT_LINKS = [{ href: "about.html", label: "About" }];

// Kept exported for reuse -- the literal link now lives in each page's own
// static Home markup (see quranrevival.html etc.), not in this renderer's
// output, so it's visible before sign-in resolves same as "who".
export const LEGACY_APP_URL = "https://madrasatul-muslimeen.github.io/legacy/index.html";

function renderLinks(links, currentFile, canAdmin) {
  return links
    .filter((l) => !l.ownerPrimeOnly || canAdmin)
    .map((l) => {
      const isCurrent = l.href === currentFile;
      return `<a href="${l.href}" class="nav-link${isCurrent ? " nav-current" : ""}"${isCurrent ? ' aria-current="page"' : ""}>${l.label}</a>`;
    })
    .join("");
}

function renderPlaceholders(labels) {
  return labels.map((label) => `<span class="nav-link-disabled">${label} (coming soon)</span>`).join("");
}

function renderCategory(name, linksHtml, currentFile, links) {
  const isCurrentCategory = links?.some((l) => l.href === currentFile) ?? false;
  return `<details class="nav-cat"${isCurrentCategory ? " open" : ""}><summary>${name}</summary><div class="nav-cat-links">${linksHtml}</div></details>`;
}

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). Admin category, and the Classes/Curriculum links inside Operation, only show for owner/prime -- everyone else gets Study Module + the rest of Operation (+ the always-shown Bookmark/Settings placeholders). viewAsRole (round 11): when set, shows a "Previewing as" notice so it's never ambiguous why the page looks scoped down -- change/exit it from the People page's own dropdown. */
export function renderNavBar(roles = [], viewAsRole = null) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();

  const cats = [];
  if (canAdmin) cats.push(renderCategory("Admin", renderLinks(ADMIN_LINKS, currentFile, canAdmin), currentFile, ADMIN_LINKS));
  cats.push(renderCategory("Study Module", renderLinks(STUDY_LINKS, currentFile, canAdmin), currentFile, STUDY_LINKS));
  cats.push(renderCategory("Operation", renderLinks(OPERATION_LINKS, currentFile, canAdmin), currentFile, OPERATION_LINKS));
  cats.push(renderCategory("Bookmark", renderPlaceholders(BOOKMARK_PLACEHOLDERS), currentFile, null));
  cats.push(renderCategory(
    "Settings",
    renderLinks(ABOUT_LINKS, currentFile, canAdmin) + renderPlaceholders(SETTINGS_PLACEHOLDERS),
    currentFile,
    ABOUT_LINKS
  ));

  // Phase 10: real per-student teacher assignment now exists (classes.html
  // + teacherStudentLinks) -- a teacher preview is scoped to whoever
  // they're actually enrolled to teach, not the full roster any more.
  // Follow-up round (11 Aug 2026): Homework/assignments closed the same gap
  // (isAssignmentCreator()/isActiveTeacherInContext() in firestore.rules) --
  // no surface left with the old blanket-tenant-wide teacher shape. Kept as
  // an empty-string constant, not deleted outright, since "View as: teacher"
  // previews on top of the owner's own real access either way (it can't
  // prove the restriction actually holds -- same standing limitation every
  // teacher-scoping round has disclosed, not new here) and a future gap
  // found the same way deserves the same kind of note.
  const teacherGapNote = "";
  const previewNotice = viewAsRole
    ? `<span class="nav-preview-notice">Previewing as: ${viewAsRole}${teacherGapNote} — change this on the People page</span>`
    : "";
  return `<nav class="app-nav">${cats.join("")}${previewNotice}</nav>`;
}
