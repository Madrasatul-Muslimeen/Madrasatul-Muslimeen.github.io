// F-068 — Topic renderer (Phase 6, Deen Study & topic renderer)
//
// I2: pure renderer, HTML in/out, never touches Firebase and never imports
// records.js/catalogue.js itself -- same contract ayah-renderer.js and
// way-modal.js already hold. Shared across every module that uses the
// "topic" renderer (Architecture s5: Arabic, Hadith, Deen Study, General
// Study, Nature-Life) even though only Deen Study has a real study screen
// wired up to it yet (Phase 6 scope) -- the other four are Phase 12.
//
// The subject tree itself IS the topic hierarchy here (Phase 2's existing
// isTrackable/ancestorIds machinery, not a second parallel structure): a
// branch node is browsed into, a leaf node (isTrackable) is a topic that
// can carry a resource and be claimed against.

import { langText } from "./lang.js";
import { STATUS_COLORS } from "./mastery-wheel.js";
import { STATUSES } from "./unit-keys.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** path: [{id, name}] from the module root to the currently-browsed branch (root first). Last crumb is the current location, not a link. */
export function renderTopicBreadcrumb(path, rootLabel) {
  const crumbs = [{ id: null, name: { en: rootLabel } }, ...path];
  return `<nav class="topic-breadcrumb">${crumbs
    .map((c, i) => {
      const label = escapeHtml(langText(c.name, "en", rootLabel));
      return i === crumbs.length - 1
        ? `<span class="topic-crumb topic-crumb-current">${label}</span>`
        : `<button type="button" class="topic-crumb-btn" data-id="${c.id ?? ""}">${label}</button>`;
    })
    .join(" &rsaquo; ")}</nav>`;
}

/**
 * One row per child of the currently-browsed subject. Branches (no
 * resource/status, just a way in) vs. leaves/topics (status chip, click to
 * open). statusByNodeId: Map(subjectId -> statusId|null) for leaves this
 * caller has already loaded claim data for -- callers decide how much to
 * pre-load (a single subject's worth is cheap; the whole tree's worth is
 * not, per the load-speed contract).
 */
export function renderTopicChildList(children, statusByNodeId = new Map()) {
  if (children.length === 0) {
    return `<p class="topic-empty">Nothing under here yet.</p>`;
  }
  const rows = children.map((node) => {
    const name = escapeHtml(langText(node.name, "en", node.id));
    const gloss = node.gloss ? `<span class="topic-gloss">${escapeHtml(langText(node.gloss, "en", ""))}</span>` : "";
    if (!node.isTrackable) {
      return `<button type="button" class="topic-row topic-row-branch" data-id="${node.id}">
        <span class="topic-row-name">${name}</span>${gloss}
        <span class="topic-row-arrow" aria-hidden="true">&rsaquo;</span>
      </button>`;
    }
    const statusId = statusByNodeId.get(node.id) ?? null;
    const hasResource = (node.resourceIds ?? []).length > 0;
    const chip = statusId
      ? `<span class="topic-status-chip" style="background:${STATUS_COLORS[statusId] ?? STATUS_COLORS.not_started}">${STATUSES.find((s) => s.id === statusId)?.label ?? statusId}</span>`
      : hasResource
        ? `<span class="topic-status-chip topic-status-unclaimed">Not started</span>`
        : `<span class="topic-status-chip topic-status-noresource">No resource yet</span>`;
    return `<button type="button" class="topic-row topic-row-leaf" data-id="${node.id}">
      <span class="topic-row-name">${name}</span>${gloss}
      ${chip}
    </button>`;
  });
  return `<div class="topic-list">${rows.join("")}</div>`;
}

/** The topic's actual content -- what Quran's ayah text is to an Approach. null = not authored yet (Phase 6 planning: a topic only becomes claimable once its resource is real). */
export function renderTopicResource(resource) {
  if (!resource) {
    return `<div class="topic-resource topic-resource-empty">
      <p>No resource added yet for this topic. Add one from the Catalogue page before studying it here.</p>
    </div>`;
  }
  if (resource.type === "link") {
    return `<div class="topic-resource">
      <a class="topic-resource-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">${escapeHtml(resource.url)}</a>
    </div>`;
  }
  return `<div class="topic-resource"><p class="topic-resource-text">${escapeHtml(resource.body).replace(/\n/g, "<br>")}</p></div>`;
}
