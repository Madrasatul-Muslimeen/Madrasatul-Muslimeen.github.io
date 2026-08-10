// Phase 6+ — Shared study-screen logic for every "topic" renderer module
// (Architecture s5: Arabic, Hadith, Deen Study, General Study, Nature-Life).
//
// Extracted from deen-study.html once a second, third, fourth and fifth
// call site made the duplication real rather than premature (Deen Study
// proved the pattern; this is that same code, parameterized). Each of
// deen-study.html / arabic-study.html / hadith-study.html /
// general-study.html / naturelife-study.html is now a thin shell: same DOM
// ids, same CSS, one call to initTopicStudyPage() with its own
// {moduleId, trackableId}.
//
// I2-adjacent: this file DOES touch Firebase (it's the page's own
// controller, not a pure renderer like topic-renderer.js/way-modal.js are)
// -- but it never imports another module's page logic, only the shared
// renderer/records/catalogue layer every module already goes through.
//
// Health is deliberately NOT one of these pages -- it uses the "routine"
// renderer (a scheduled habit, not a topic+resource), grouped with Learn
// Deen On-the-Go, which is Phase 7 scope.

import { auth, db } from "./firebase-init.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { langText } from "./lang.js";
import { safeWrite } from "./errors.js";
import {
  getMyMemberships, initializeActiveContext, getActiveContext, setActiveContext,
  effectiveRoles, scopedRoster,
} from "./session-context.js";
import {
  getSubjectTree, getTrackables, ensureSubjectTemplatesSeeded, ensureTenantCatalogueSeeded,
} from "./catalogue.js";
import { ensureModulesSeeded } from "./modules.js";
import { buildUnitKey } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { logActivity } from "./activity.js";
import { getResourcesByIds } from "./resources.js";
import { renderNavBar } from "./nav.js";
import { renderTopicBreadcrumb, renderTopicChildList, renderTopicResource } from "./topic-renderer.js";
import { renderGuideTab, renderTrackTab, renderBreakdownTab, renderWayModalShell, attachWayModalHandlers } from "./way-modal.js";

/**
 * Wires up a topic-renderer study page. Expects the page to already contain
 * the shared DOM shell (same element ids deen-study.html established):
 * who, signInBtn, signOutBtn, app, navBar, tenantSelect, personSelect,
 * breadcrumbContainer, listContainer, detailContainer, wayModalOverlay,
 * wayModalMount.
 */
export function initTopicStudyPage({ moduleId, trackableId }) {
  const whoEl = document.getElementById("who");
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const appEl = document.getElementById("app");
  const navBar = document.getElementById("navBar");
  const tenantSelect = document.getElementById("tenantSelect");
  const personSelect = document.getElementById("personSelect");
  const breadcrumbContainer = document.getElementById("breadcrumbContainer");
  const listContainer = document.getElementById("listContainer");
  const detailContainer = document.getElementById("detailContainer");
  const wayModalOverlay = document.getElementById("wayModalOverlay");
  const wayModalMount = document.getElementById("wayModalMount");

  const NO_ACCOUNT_MESSAGE = ` — no account found yet.
    <br>If someone invited you to join an existing madrasah, use the invite
    link they sent you (check your email) — don't create a new one here.
    <br>Starting fresh instead? <a href="onboarding.html">Create a new account
    on the onboarding page</a>.`;

  signInBtn.addEventListener("click", () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => {
      whoEl.textContent = `Sign-in failed: ${err.message}`;
    });
  });
  signOutBtn.addEventListener("click", () => signOut(auth));

  let activeTenantId = null;
  let myMemberships = [];
  let roster = [];
  let tenantWeekStartsOn = 6;
  let selectedPersonId = null;
  let moduleSubjects = [];
  let studiedTrackable = null;
  let currentChunk = null;
  let currentParentId = null; // null until the tree loads, then set to the module's root subject id
  let rootLabel = "";
  // All of this module's topic claims share one chunk (mirrors how Quran's
  // own non-surah unit types all chunk under "subject_quran" -- chunkKeyFor
  // only cares about the subjectId string passed in, not which specific
  // topic was claimed; I5 keeps each topic's own identity in its unitKey
  // regardless of which chunk it lands in). Set once the tree loads and the
  // module's own root subject id is known.
  let chunkSubjectId = null;

  function currentPreview() {
    const context = getActiveContext();
    const activeMembership = myMemberships.find((m) => m.tenantId === activeTenantId);
    const realRoles = activeMembership?.roles ?? [];
    const viewAsRole = context?.viewAsRole ?? null;
    return { viewAsRole, effRoles: effectiveRoles(realRoles, viewAsRole), myPersonId: activeMembership?.personId ?? null };
  }

  function currentActingPersonId() {
    const membership = myMemberships.find((m) => m.tenantId === activeTenantId);
    return membership?.personId ?? selectedPersonId;
  }

  async function loadContextData() {
    const [rosterSnap, tenantSnap] = await Promise.all([
      getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", activeTenantId))),
      getDoc(doc(db, TENANT.TENANTS, activeTenantId)),
    ]);
    roster = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tenantWeekStartsOn = tenantSnap.exists() ? (tenantSnap.data().weekStartsOn ?? 6) : 6;

    const { viewAsRole, effRoles, myPersonId } = currentPreview();
    navBar.innerHTML = renderNavBar(myMemberships.find((m) => m.tenantId === activeTenantId)?.roles ?? [], viewAsRole);

    const visibleRoster = viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster;
    personSelect.innerHTML = visibleRoster
      .map((p) => `<option value="${p.id}">${langText(p.name, "en", p.id)}</option>`)
      .join("");
    selectedPersonId = visibleRoster[0]?.id ?? null;

    const tree = await getSubjectTree(db, activeTenantId);
    moduleSubjects = tree.filter((n) => (n.moduleIds ?? []).includes(moduleId) && n.status !== "archived");

    const trackables = await getTrackables(db, activeTenantId);
    studiedTrackable = trackables.find((t) => t.id === trackableId) ?? null;

    const root = moduleSubjects.find((n) => n.parentId === null);
    currentParentId = root?.id ?? null;
    chunkSubjectId = root?.id ?? null;
    rootLabel = root ? langText(root.name, "en", moduleId) : moduleId;

    await refreshChunk();
    renderBrowser();
  }

  async function refreshChunk() {
    if (!selectedPersonId || !chunkSubjectId) { currentChunk = null; return; }
    // chunkKeyFor("topic" units) only ever looks at the subjectId argument
    // (see records.js SURAH_CHUNKED_TYPES) -- any topic unitKey produces
    // the same chunk key here, so this reads exactly as `subject_${chunkSubjectId}`.
    const chunkKey = chunkKeyFor(buildUnitKey.topic("_"), chunkSubjectId);
    currentChunk = await getRecordsChunk(db, activeTenantId, selectedPersonId, chunkKey);
  }

  // Root is the breadcrumb's own label (rootLabel) -- never repeated as a
  // path entry, including when currentParentId IS the root (path = [], so
  // only that one non-clickable root crumb shows).
  function ancestorPath(nodeId) {
    const rootId = moduleSubjects.find((n) => n.parentId === null)?.id;
    if (nodeId === rootId) return [];
    const node = moduleSubjects.find((n) => n.id === nodeId);
    if (!node) return [];
    return (node.ancestorIds ?? [])
      .filter((id) => id !== rootId)
      .map((id) => moduleSubjects.find((n) => n.id === id))
      .filter(Boolean)
      .concat([node]);
  }

  function renderBrowser() {
    detailContainer.innerHTML = "";
    if (!currentParentId) {
      listContainer.innerHTML = `<p class="topic-empty">This subject area hasn't been set up in the catalogue for this tenant yet.</p>`;
      breadcrumbContainer.innerHTML = "";
      return;
    }
    breadcrumbContainer.innerHTML = renderTopicBreadcrumb(ancestorPath(currentParentId), rootLabel);
    const children = moduleSubjects
      .filter((n) => n.parentId === currentParentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const statusByNodeId = new Map();
    for (const n of children) {
      if (!n.isTrackable) continue;
      const entryKey = `${buildUnitKey.topic(n.id)}::${trackableId}`;
      const status = currentChunk?.entries?.[entryKey]?.claimedStatus ?? null;
      if (status) statusByNodeId.set(n.id, status);
    }
    listContainer.innerHTML = renderTopicChildList(children, statusByNodeId);

    breadcrumbContainer.querySelectorAll(".topic-crumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentParentId = btn.dataset.id || moduleSubjects.find((n) => n.parentId === null)?.id;
        renderBrowser();
      });
    });
    listContainer.querySelectorAll(".topic-row-branch").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentParentId = btn.dataset.id;
        renderBrowser();
      });
    });
    listContainer.querySelectorAll(".topic-row-leaf").forEach((btn) => {
      btn.addEventListener("click", () => openTopicDetail(btn.dataset.id));
    });
  }

  async function openTopicDetail(nodeId) {
    const node = moduleSubjects.find((n) => n.id === nodeId);
    if (!node) return;

    detailContainer.innerHTML = `<div class="topic-detail"><p>Loading…</p></div>`;
    const resources = await getResourcesByIds(db, activeTenantId, node.resourceIds ?? []);
    const resource = resources[0] ?? null;

    const entryKey = `${buildUnitKey.topic(node.id)}::${trackableId}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusLine = entry
      ? `Status: <strong>${entry.claimedStatus.replace(/_/g, " ")}</strong> &middot; ${entry.confirmState}`
      : "Not started yet.";

    detailContainer.innerHTML = `<div class="topic-detail">
      <h2>${langText(node.name, "en", node.id)}</h2>
      ${renderTopicResource(resource)}
      <p>${statusLine}</p>
      <button type="button" id="trackTopicBtn" ${resource ? "" : "disabled"}>Track my progress</button>
    </div>`;

    const trackBtn = document.getElementById("trackTopicBtn");
    trackBtn.addEventListener("click", () => openWayModal(node));
  }

  function openWayModal(node) {
    if (!studiedTrackable || !selectedPersonId) return;
    const unitKey = buildUnitKey.topic(node.id);
    const entryKey = `${unitKey}::${trackableId}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusIdsForTrackable = Object.values(currentChunk?.entries ?? {})
      .filter((e) => e.trackableId === trackableId)
      .map((e) => e.claimedStatus);

    const title = `${langText(node.name, "en", node.id)} — Studied`;
    const tabBodies = {
      Track: renderTrackTab(entry, entry?.claimedStatus ?? "not_started"),
      Guide: renderGuideTab(studiedTrackable, "en"),
      Breakdown: renderBreakdownTab(statusIdsForTrackable),
    };
    wayModalMount.innerHTML = renderWayModalShell(title, tabBodies, ["Track", "Guide", "Breakdown"]);
    wayModalOverlay.classList.add("open");
    attachWayModalHandlers(wayModalMount.firstElementChild, {
      onClose: () => wayModalOverlay.classList.remove("open"),
    });

    const claimBtn = wayModalMount.querySelector(".way-claim-btn");
    const statusSelectEl = wayModalMount.querySelector(".way-status-select");
    const resultEl = wayModalMount.querySelector(".way-claim-result");
    claimBtn.addEventListener("click", async () => {
      claimBtn.disabled = true;
      const outcome = await safeWrite(
        () => claimStatus(db, {
          tenantId: activeTenantId,
          personId: selectedPersonId,
          subjectId: chunkSubjectId,
          unitKey,
          trackableId,
          statusId: statusSelectEl.value,
          notes: "",
          domainIds: [],
          claimedByPersonId: currentActingPersonId(),
          claimedByUid: auth.currentUser.uid,
        }),
        { collection: "records", action: "claimStatus" }
      );
      if (outcome.ok) {
        await logActivity(db, {
          tenantId: activeTenantId, personId: selectedPersonId, date: new Date(),
          weekStartsOn: tenantWeekStartsOn, subjectId: node.id, unitKey,
          trackableId, action: "claimed", uid: auth.currentUser.uid,
        });
        const message = outcome.result.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.";
        await refreshChunk();
        renderBrowser();
        await openTopicDetail(node.id);
        openWayModal(node); // refresh the modal against the new chunk
        const freshResultEl = wayModalMount.querySelector(".way-claim-result");
        if (freshResultEl) freshResultEl.textContent = message;
      } else {
        resultEl.textContent = outcome.entry.message;
        claimBtn.disabled = false;
      }
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      whoEl.textContent = "Not signed in.";
      signInBtn.style.display = "inline-block";
      signOutBtn.style.display = "none";
      appEl.style.display = "none";
      return;
    }
    whoEl.textContent = `Signed in as ${user.email}`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";

    async function step(name, fn) {
      try { return await fn(); } catch (err) { err.stepName = err.stepName ?? name; throw err; }
    }

    try {
      const userIndexSnap = await step("read your userIndex", () => getDoc(doc(db, TENANT.USER_INDEX, user.uid)));
      const defaultTenantId = userIndexSnap.exists() ? userIndexSnap.data().defaultTenantId : null;

      const context = await step("initialize active context", () => initializeActiveContext(db, user.uid, defaultTenantId));
      if (!context) {
        whoEl.innerHTML += NO_ACCOUNT_MESSAGE;
        return;
      }
      activeTenantId = context.tenantId;

      myMemberships = await step("load your memberships", () => getMyMemberships(db, user.uid));
      tenantSelect.innerHTML = myMemberships
        .map((m) => `<option value="${m.tenantId}" ${m.tenantId === activeTenantId ? "selected" : ""}>${m.tenantName} (${m.roles.join(", ")})</option>`)
        .join("");

      appEl.style.display = "block";
      // Self-repairing, same idempotent shape catalogue.html's own
      // runSeedIfNeeded uses -- lets this page work standalone even for a
      // tenant that never happened to open catalogue.html first.
      await step("set up modules", () => ensureModulesSeeded(db, user.uid));
      await step("set up subject templates", () => ensureSubjectTemplatesSeeded(db, user.uid));
      await step("set up this tenant's catalogue", () => ensureTenantCatalogueSeeded(db, activeTenantId, user.uid));
      await step("load this module", loadContextData);
    } catch (err) {
      whoEl.textContent += ` — failed at "${err.stepName ?? "unknown step"}": ${err.code ?? ""} ${err.message}`;
      console.error(err);
    }
  });

  tenantSelect.addEventListener("change", async () => {
    const chosen = myMemberships.find((m) => m.tenantId === tenantSelect.value);
    if (!chosen) return;
    activeTenantId = chosen.tenantId;
    setActiveContext({ tenantId: chosen.tenantId, personId: chosen.personId, roles: chosen.roles, viewAsRole: null });
    navBar.innerHTML = renderNavBar(chosen.roles, null);
    await ensureModulesSeeded(db, auth.currentUser.uid);
    await ensureSubjectTemplatesSeeded(db, auth.currentUser.uid);
    await ensureTenantCatalogueSeeded(db, activeTenantId, auth.currentUser.uid);
    await loadContextData();
  });

  personSelect.addEventListener("change", async () => {
    selectedPersonId = personSelect.value;
    await refreshChunk();
    renderBrowser();
  });
}
