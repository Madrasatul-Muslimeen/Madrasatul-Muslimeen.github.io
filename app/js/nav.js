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
// anything to what this returns).
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
];

const OPERATION_LINKS = [
  { href: "records.html", label: "Records" },
  { href: "monitor.html", label: "Monitor" },
  { href: "homework.html", label: "Homework" },
  { href: "course-offers.html", label: "Course Offers" },
];
// Curriculum (Architecture Phase 11) isn't built yet -- shown disabled so
// the category's shape matches the owner's mockup without inventing a page.
const OPERATION_PLACEHOLDERS = ["Curriculum"];

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

// Kept exported for reuse -- the literal link now lives in each page's own
// static Home markup (see quranrevival.html etc.), not in this renderer's
// output, so it's visible before sign-in resolves same as "who".
export const LEGACY_APP_URL = "https://madrasatul-muslimeen.github.io/legacy/index.html";

function renderLinks(links, currentFile) {
  return links
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

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). Admin category only shows for owner/prime -- everyone else just gets Study Module + Operation (+ the always-shown Bookmark/Settings placeholders). viewAsRole (round 11): when set, shows a "Previewing as" notice so it's never ambiguous why the page looks scoped down -- change/exit it from the People page's own dropdown. */
export function renderNavBar(roles = [], viewAsRole = null) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();

  const cats = [];
  if (canAdmin) cats.push(renderCategory("Admin", renderLinks(ADMIN_LINKS, currentFile), currentFile, ADMIN_LINKS));
  cats.push(renderCategory("Study Module", renderLinks(STUDY_LINKS, currentFile), currentFile, STUDY_LINKS));
  cats.push(renderCategory(
    "Operation",
    renderLinks(OPERATION_LINKS, currentFile) + renderPlaceholders(OPERATION_PLACEHOLDERS),
    currentFile,
    OPERATION_LINKS,
  ));
  cats.push(renderCategory("Bookmark", renderPlaceholders(BOOKMARK_PLACEHOLDERS), currentFile, null));
  cats.push(renderCategory("Settings", renderPlaceholders(SETTINGS_PLACEHOLDERS), currentFile, null));

  const teacherGapNote = viewAsRole === "teacher" ? " (shows the full roster — per-student teacher assignment isn't built yet)" : "";
  const previewNotice = viewAsRole
    ? `<span class="nav-preview-notice">Previewing as: ${viewAsRole}${teacherGapNote} — change this on the People page</span>`
    : "";
  return `<nav class="app-nav">${cats.join("")}${previewNotice}</nav>`;
}
