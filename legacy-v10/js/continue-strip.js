// F-074 — Continue strip (Phase 7, Bookmarks/programs/routines)
//
// I2: pure renderer, HTML in/out, never touches Firebase or bookmarks.js
// itself -- same contract every other renderer file holds. The Architecture
// doc (s5) ties "Continue strip" to a card-grid landing page ("2+ modules ->
// card grid + Continue strip") that hasn't been built (flagged since Phase
// 5 round 8, still open -- a separate decision, not part of this round).
// Scoped here instead as a strip embedded directly in every study page's
// own shell, right under the nav bar -- delivers the same "jump back to
// where I left off" value without also being the landing-page rebuild.
//
// Full app translation, phase 4: the chip's own wording and the module name
// in it are translated at render time. MODULE_LABELS below stays English --
// it is the translation KEY (the same eight module names phase 3 already put
// in the catalogue), not the text drawn on screen. Importing t() does not
// cost this file its I2 purity: still HTML in, HTML out, no Firebase.

import { t } from "./i18n.js";

// Every module's own study page -- kept here (not in nav.js) since this is
// the one place that needs to turn a moduleId back into a URL.
export const MODULE_PAGES = {
  quranrevival: "quranrevival.html",
  deen: "deen-study.html",
  arabic: "arabic-study.html",
  hadith: "hadith-study.html",
  general: "general-study.html",
  naturelife: "naturelife-study.html",
  lifeskill: "life-skill.html",
  health: "health-study.html",
  ldog: "ldog-study.html",
};

// Small display-label mirror (matches catalogue-data.js's MODULE_TEMPLATES
// names) -- avoids an extra blocking modules-collection read on every study
// page just to label a strip; ensureModulesSeeded already reads that
// collection for seeding, this doesn't need to duplicate it.
export const MODULE_LABELS = {
  quranrevival: "QuranRevival",
  deen: "Deen Study",
  arabic: "Arabic",
  hadith: "Hadith",
  general: "General Study",
  naturelife: "Nature-Life",
  lifeskill: "Life Skill",
  health: "Health",
  ldog: "Learn Deen On-the-Go",
};

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * entries: [{moduleId, subjectId, subjectLabel?}], newest first -- caller
 * (each page's own controller) has already sorted/capped these from
 * bookmarks.recentResumeEntries() and resolved subjectLabel via its own
 * already-loaded subject tree, if it wants one. moduleLabel comes from
 * MODULE_LABELS above, not the caller.
 */
export function renderContinueStrip(entries) {
  const chips = entries
    .map((e) => {
      const href = MODULE_PAGES[e.moduleId];
      const moduleLabel = MODULE_LABELS[e.moduleId];
      if (!href || !moduleLabel) return "";
      // subjectLabel is already tenant-authored text the caller resolved
      // through langText(), so it is in the reader's language already.
      const label = e.subjectLabel ? `${t(moduleLabel)} — ${e.subjectLabel}` : t(moduleLabel);
      return `<a class="continue-chip" href="${href}?resume=${encodeURIComponent(e.subjectId ?? "")}">
        <span class="continue-chip-label">${escapeHtml(t("Continue: {what}", { what: label }))}</span>
      </a>`;
    })
    .filter(Boolean);
  if (!chips.length) return "";
  return `<div class="continue-strip">${chips.join("")}</div>`;
}
