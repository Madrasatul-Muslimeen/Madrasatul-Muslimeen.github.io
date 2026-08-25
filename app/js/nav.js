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
// Every category, including Home, starts closed and stays closed until the
// user taps it -- an earlier version of this round auto-opened a category
// when the current page was one of its own links (e.g. Study auto-expanding
// on quranrevival.html), which meant Study was open on effectively every
// visit once quranrevival.html became the landing page too, pushing real
// content down the screen. Removed per the owner's own report. The
// current-page link itself still gets highlighted (nav-current class) once
// a category is opened, so which page you're on is never actually lost.
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
//
// Shell round 13 (13 Aug 2026): Settings -> Language is now a real control.
// The one import below is a constant list of languages, not state -- see
// renderSettings() for why that keeps this file's purity intact.

import { APP_LANGS } from "./prefs.js";
import { t } from "./i18n.js";
import { roleLabel } from "./labels.js";

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

// Bookmark: real now (enhancement round) -- named/foldered bookmarks, one
// page, reachable from every module's own nav bar, same as this comment
// always said it eventually would be.
//
// Fixes round (23 Aug 2026), items 2/3: the category itself is no longer a
// single link to that page -- it's a live dropdown of every bookmark
// (js/bookmark-nav.js's own mountBookmarkMenu(), the Firebase-touching
// "mount" helper this file's own I2 contract requires living elsewhere,
// same seam mountSyncedAppLangControl() already uses for the language
// picker). This link stays as the one way INTO the full Manager page --
// "opening as a page is needed only when organising/edits... arrangements
// is required," the owner's own words -- so it keeps its own distinct
// label rather than repeating the category's own "Bookmark" heading.
const BOOKMARK_LINKS = [{ href: "bookmarks.html", label: "Manage bookmarks…" }];
// Settings: Language became real in shell round 13 (13 Aug 2026) -- see
// renderSettings() below. Appearance is still a placeholder.
const SETTINGS_PLACEHOLDERS = ["Appearance"];
// Shell round 20: the moving tagline strip's own editing screen. Tenant
// content, so owner/prime only -- see renderSettings().
const SETTINGS_LINKS = [{ href: "taglines.html", label: "Taglines", ownerPrimeOnly: true }];

// Phase 13 round 1: About reads the feature registry live (getFullRegistry()).
const ABOUT_LINKS = [{ href: "about.html", label: "About" }];

// Kept exported for reuse -- the literal link lives in each page's own
// static Home markup (see quranrevival.html etc.), not in this renderer's
// output, so it's visible before sign-in resolves same as "who".
export const LEGACY_APP_URL = "https://madrasatul-muslimeen.github.io/legacy/index.html";

function renderLinks(links, currentFile, canAdmin) {
  return links
    .filter((l) => !l.ownerPrimeOnly || canAdmin)
    .map((l) => {
      const isCurrent = l.href === currentFile;
      return `<a href="${l.href}" class="nav-link${isCurrent ? " nav-current" : ""}"${isCurrent ? ' aria-current="page"' : ""}>${t(l.label)}</a>`;
    })
    .join("");
}

function renderPlaceholders(labels) {
  return labels.map((label) => `<span class="nav-link-disabled">${t(label)} ${t("(coming soon)")}</span>`).join("");
}

// Shell round 4 (12 Aug 2026) -- used to auto-open a category when the
// current page was one of its own links (e.g. Study auto-expanding on
// quranrevival.html). Fine when quranrevival.html was one destination among
// several; now that it's also the landing page, that meant Study was open
// on effectively every visit, pushing the actual content down -- exactly
// what the owner asked to stop. Categories now always start closed; the
// current-page link itself still gets highlighted via renderLinks()'s own
// `nav-current` class, so you can still tell where you are once you open one.
function renderCategory(name, linksHtml, extraClass = "") {
  return `<details class="nav-cat${extraClass ? " " + extraClass : ""}"><summary>${t(name)}</summary><div class="nav-cat-links">${linksHtml}</div></details>`;
}

// Fixes round (23 Aug 2026), items 2/3 -- the Bookmark category's own
// skeleton: a live-list container (js/bookmark-nav.js fills this in, lazily,
// the first time the category is actually opened -- I9, never on page load)
// plus the one link into the full Manager page. `#navBookmarkList`'s starting
// text ("Loading…") is what a person sees for the brief moment between
// opening the category and the fetch resolving; it is replaced outright, not
// left behind, once real content renders.
function renderBookmarkCategory(currentFile, canAdmin) {
  return `<details class="nav-cat nav-cat-end nav-cat-bookmark"><summary>${t("Bookmark")}</summary><div class="nav-cat-links">
    <div id="navBookmarkList" class="nav-bm-list">${t("Loading…")}</div>
    ${renderLinks(BOOKMARK_LINKS, currentFile, canAdmin)}
  </div></details>`;
}

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). The Classes/Curriculum links inside Operation only show for owner/prime -- everyone else gets the rest of Operation (+ the always-shown Bookmark link, real since the enhancement round). viewAsRole (round 11): when set, shows a "Previewing as" notice so it's never ambiguous why the page looks scoped down -- change/exit it from the People page's own dropdown. Returns the Study/Operation/Bookmark categories only -- Home is the caller's own static markup; call renderHomeExtras() separately for its role-gated contents. */
export function renderNavBar(roles = [], viewAsRole = null) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();

  const cats = [];
  // Owner, 13 Aug 2026: "Study" -> "Modules". They asked for "Study Module"
  // and asked whether it would fit; measured, it does not -- it needs 97px
  // and gets 75-83px on a phone, so it ellipsised to "Study Mo...", and was
  // still clipped even at an unreadable 8.8px. Wrapping it to two lines cost
  // 13px of nav height and one visible Approach row, which is exactly what
  // shell rounds 9-10 spent themselves reclaiming. Offered both; the owner
  // chose the short word. It still separates the category from its own first
  // link ("Quran Study") and matches the word catalogue.html already uses.
  cats.push(renderCategory("Modules", renderLinks(STUDY_LINKS, currentFile, canAdmin)));
  // nav-cat-end: this category and the one after it sit in the right half
  // of the four-button row -- see shell.css for why their dropdowns hang
  // from their own right edge instead of their left. Left-aligned (the
  // default), Operation's own dropdown ran 35px past the right edge of a
  // 320px phone (measured) -- its own button already sits past the
  // midpoint, so a left-anchored dropdown under it has nowhere to grow but
  // off-screen.
  cats.push(renderCategory("Operation", renderLinks(OPERATION_LINKS, currentFile, canAdmin), "nav-cat-end"));
  cats.push(renderBookmarkCategory(currentFile, canAdmin));

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
    // phase 4: the role id itself is translated too -- the sentence around
    // it was Bangla while the word inside it stayed "teacher".
    ? `<span class="nav-preview-notice">${t("Previewing as: {role} — change this on the People page", { role: roleLabel(viewAsRole) })}${teacherGapNote}</span>`
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
    ? `<div class="nav-cat-group"><div class="nav-cat-group-label">${t("Admin")}</div>${renderLinks(ADMIN_LINKS, currentFile, canAdmin)}</div>`
    : "";
  const aboutHtml = `<div class="nav-cat-group">${renderLinks(ABOUT_LINKS, currentFile, canAdmin)}</div>`;
  return adminHtml + aboutHtml + renderSettings(canAdmin);
}

// Shell round 13 (13 Aug 2026) -- Language is a real control now, not the
// disabled placeholder it had been since shell round 3. It sits here, under
// Home -> Settings, because it is an ALL-MODULES choice about which language
// user-visible names appear in; it used to live inside the Quran module's
// own Study options purely because nothing global existed to put it in.
//
// This function stays a PURE renderer, exactly like everything else in this
// file (I2): it emits the <select> and nothing more. It does NOT read the
// stored preference and does NOT attach a change handler -- the caller does
// both, in one line, via mountAppLangControl() from js/prefs.js. That keeps
// nav.js free of state and side effects, which is what lets any page render
// it before sign-in resolves without consequence.
//
// APP_LANGS is imported rather than re-typed so the option list and the
// preference reader can never disagree about what languages exist. It is a
// constant, not state -- importing it does not compromise the purity above.
// Shell round 20 (17 Aug 2026): Settings gains its first real LINK, alongside
// the Language control. Taglines edits tenant content (the moving line under
// the app banner), so it is owner/prime-only -- the same gate the Admin group
// above uses. It goes in Settings rather than Admin deliberately: Admin is the
// catalogue and the roster, i.e. what the madrasah teaches and who is in it,
// while this is how this tenant's own app presents itself. That is also where
// LAYOUT-BACKLOG.md item 7 says "Edit banner" belongs when it gets a home, so
// this group is now the natural place for it rather than an empty promise.
function renderSettings(canAdmin = false) {
  const options = APP_LANGS.map((l) => `<option value="${l.id}">${l.label}</option>`).join("");
  return `<div class="nav-cat-group"><div class="nav-cat-group-label">${t("Settings")}</div>
    <div class="nav-setting"><label for="navAppLangSelect">${t("Language")}</label><select id="navAppLangSelect">${options}</select></div>
    ${renderLinks(SETTINGS_LINKS, location.pathname.split("/").pop(), canAdmin)}
    ${renderPlaceholders(SETTINGS_PLACEHOLDERS)}</div>`;
}

// Full app translation, phase 4 (13 Aug 2026). Twelve pages/modules each
// carried their OWN identical copy of this sentence, and every one of them
// was still in English -- a signed-in Bangla reader with no account yet got
// the app's most important dead-end explained in a language they cannot
// read. It was invisible to tools/i18n-coverage.mjs (a template literal
// assigned to a const matches none of its extractor patterns), and it was
// found by opening the page, not by the report.
//
// Centralised here rather than translated twelve times: nav.js is already
// imported by every one of those files, and this is shell chrome, which is
// exactly what this file renders. Still a pure renderer (I2) -- HTML out, no
// state, no Firebase.
//
// The caller appends it to the sign-in status line, so it deliberately opens
// with the same " — " continuation the twelve copies did.
export function noAccountMessageHtml() {
  return ` — ${t("no account found yet.")}
    <br>${t("If someone invited you to join an existing madrasah, use the invite link they sent you (check your email) — don't create a new one here.")}
    <br>${t("Starting fresh instead?")} <a href="onboarding.html">${t("Create a new account on the onboarding page")}</a>.`;
}

// PC layout fix: each nav category is a native <details>, and native
// <details> elements never close a sibling just because another one opened
// -- so Home and Modules (or any two) could sit open at the same time, each
// spending its own screen space. This is a single capture-phase listener on
// `document`, added once when this module is first imported (every page
// that renders the nav bar already imports nav.js), rather than something
// each of the 19 pages has to wire up individually.
//
// It works even though Modules/Operation/Bookmark's own <details> elements
// don't exist yet at the moment this code runs (renderNavBar() injects them
// into #navBar later, once roles are known) -- the listener is on
// `document` itself, not on the elements, so it sees every `.nav-cat` that
// exists in the DOM at the time someone actually opens one, regardless of
// when that element was added. `toggle` does not bubble, but a
// capture-phase listener still fires on the way down to the target even for
// a non-bubbling event, which is what makes listening at `document` enough.
document.addEventListener(
  "toggle",
  (e) => {
    const el = e.target;
    if (!(el instanceof Element) || !el.matches(".nav-cat") || !el.open) return;
    document.querySelectorAll(".nav-cat").forEach((other) => {
      if (other !== el) other.open = false;
    });
  },
  true
);

// Fix round (25 Aug 2026), owner report: a category stayed open until a
// DIFFERENT category was clicked (the accordion listener above) -- there
// was no way to just tap elsewhere on the page and have it close, which
// is the more common way to dismiss any dropdown. A bubble-phase click
// listener on `document`, same "attach once here, works for every page
// and every category including ones injected later" shape as the toggle
// listener above. Runs during the ordinary bubble phase, which completes
// BEFORE a <summary> click's native open/close default action fires --
// so clicking a category's own summary (to open OR close it) is always
// still contained by that category's own element and is correctly left
// alone here; only a click genuinely outside every open category reaches
// this far and closes them.
document.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-cat[open]").forEach((cat) => {
    if (!cat.contains(e.target)) cat.open = false;
  });
});
