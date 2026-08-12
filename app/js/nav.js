// Shell round 1 (option A, agreed with the owner 8 Aug 2026) — a small
// shared nav strip connecting the separate phase-built pages, since none of
// them link to each other today.
//
// Shell round 3 (11 Aug 2026) — the flat ~19-link list this used to render
// had outgrown itself (wrapped/crowded at ~19 links). Reorganized into five
// categories: Admin / Study Module / Operation / Bookmark / Settings.
//
// Shell round 4 (12 Aug 2026, owner's own layout discussion) — five
// categories was still one too many for a single line on a phone. Down to
// four main buttons: Home / Study / Operation / Bookmark. Admin, About and
// Settings all fold inside Home now instead of being their own top-level
// entries. Home itself is split across two places on purpose:
//   - The sign-in status, Sign In/Out buttons and the Legacy App link stay
//     in each page's own static pre-JS markup, inside a `.nav-cat-home`
//     <details> element the page already renders before any script runs
//     (same reasoning as before — see the v07.08 sign-in-flash note below).
//   - renderHomeExtras() below renders the role-gated part (Admin, About,
//     Settings) as HTML the caller injects into that same <details>, once
//     roles are known — the exact same timing Admin already had before this
//     round, just nested one level deeper now.
// applyHomeAutoOpen() (called automatically, see bottom of file) opens that
// <details> by default when the current page is one of the links living
// inside it, matching the auto-open behaviour every other category already
// had.
//
// Each category (Study / Operation / Bookmark, and the page's own Home) is
// a native <details>/<summary> disclosure — no click-handler wiring needed.
// renderNavBar() itself stays a pure renderer per I2 (roles in, HTML out);
// the page's own script never has to attach anything to what it returns.
// Individual links can still carry their own ownerPrimeOnly flag within a
// category that's otherwise open to everyone (Operation: Classes/Curriculum
// are owner/prime-only, Records/Monitor/Homework/Course Offers aren't).
//
// Sign-in status, Sign In/Out and the Legacy App link are deliberately NOT
// part of renderNavBar()'s own output — they live in each page's own static
// Home markup, visible before sign-in resolves, same reason the "who"
// status text is static markup (see CLAUDE.md v07.08 — the sign-in flash
// fix). Folding them into a JS-rendered function would mean they only
// appear once roles are known, i.e. only after sign-in — exactly the flash
// this file must not reintroduce.
//
// I2: a renderer, not a module -- takes roles in, HTML out. Never touches
// Firebase, never computes roles itself; the caller already knows them from
// its own sign-in bootstrap.

const STUDY_LINKS = [
  { href: "quranrevival.html", label: "Quran Study" }, // renamed from "Study" -- see shell round 4
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

// Phase 13 round 1: About reads the feature registry live (getFullRegistry()).
const ABOUT_LINKS = [{ href: "about.html", label: "About" }];

// Every link that now lives inside the Home dropdown -- used by
// applyHomeAutoOpen() to decide whether Home should start open on this page.
const HOME_SUB_LINKS = [...ADMIN_LINKS, ...ABOUT_LINKS];

// Kept exported for reuse -- the literal link lives in each page's own
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

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). The Classes/Curriculum links inside Operation only show for owner/prime -- everyone else gets the rest of Operation (+ the always-shown Bookmark placeholder). viewAsRole (round 11): when set, shows a "Previewing as" notice so it's never ambiguous why the page looks scoped down -- change/exit it from the People page's own dropdown. Returns the Study/Operation/Bookmark categories only -- Home is the caller's own static markup; call renderHomeExtras() separately for its role-gated contents. */
export function renderNavBar(roles = [], viewAsRole = null) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();

  const cats = [];
  cats.push(renderCategory("Study", renderLinks(STUDY_LINKS, currentFile, canAdmin), currentFile, STUDY_LINKS));
  cats.push(renderCategory("Operation", renderLinks(OPERATION_LINKS, currentFile, canAdmin), currentFile, OPERATION_LINKS));
  cats.push(renderCategory("Bookmark", renderPlaceholders(BOOKMARK_PLACEHOLDERS), currentFile, null));

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
  return `${cats.join("")}${previewNotice}`;
}

/** Role-gated contents of the Home dropdown (Admin, About, Settings) -- the
 * caller injects this into the static `.nav-cat-home` <details> already
 * present in the page's own pre-JS markup (see shell.css / the per-page
 * `#navHomeExtra` container). Kept separate from renderNavBar() so the
 * sign-in-status/legacy-link portion of Home never has to wait on roles. */
export function renderHomeExtras(roles = []) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();

  const adminHtml = canAdmin
    ? `<div class="nav-cat-group"><div class="nav-cat-group-label">Admin</div>${renderLinks(ADMIN_LINKS, currentFile, canAdmin)}</div>`
    : "";
  const aboutHtml = `<div class="nav-cat-group">${renderLinks(ABOUT_LINKS, currentFile, canAdmin)}</div>`;
  const settingsHtml = `<div class="nav-cat-group"><div class="nav-cat-group-label">Settings</div>${renderPlaceholders(SETTINGS_PLACEHOLDERS)}</div>`;
  return adminHtml + aboutHtml + settingsHtml;
}

// Opens the page's own static `.nav-cat-home` <details> by default when the
// current page is one of the links that now live inside it (People,
// Catalogue, About) -- matching the auto-open behaviour every other
// category already has. Runs once, automatically, as soon as this module
// loads -- by the time a `type="module"` script executes the DOM has
// already been parsed, so no page needs to call this itself.
function applyHomeAutoOpen() {
  if (typeof document === "undefined") return;
  const homeDetails = document.querySelector(".nav-cat-home");
  if (!homeDetails) return;
  const currentFile = location.pathname.split("/").pop();
  if (HOME_SUB_LINKS.some((l) => l.href === currentFile)) homeDetails.open = true;
}
applyHomeAutoOpen();
