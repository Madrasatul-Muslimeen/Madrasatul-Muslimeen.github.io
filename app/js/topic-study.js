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
import { roleListLabel } from "./labels.js";
import { getAppLang, mountAppLangControl } from "./prefs.js";
import { t, translateStatic } from "./i18n.js";
import { safeWrite } from "./errors.js";
import {
  getMyMemberships, initializeActiveContext, getActiveContext, setActiveContext,
  effectiveRoles, scopedRoster,
} from "./session-context.js";
import {
  getSubjectTree, getTrackables, ensureSubjectTemplatesSeeded, ensureTenantCatalogueSeeded,
} from "./catalogue.js";
import { ensureModulesSeeded } from "./modules.js";
import {
  listEnrollmentsForPerson, listCourseOffers, programSubjectMapFromEnrollments, allowedSubjectIdsForTeacherStudent,
} from "./course-offers.js";
import { listClasses } from "./classes.js";
import { NO_PROGRAM } from "./bookmarks.js";
import { buildUnitKey } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { logActivity } from "./activity.js";
import { getResourcesByIds } from "./resources.js";
import { renderNavBar, renderHomeExtras, noAccountMessageHtml } from "./nav.js";
import { renderTopicBreadcrumb, renderTopicChildList, renderTopicResource } from "./topic-renderer.js";
import { renderGuideTab, renderTrackTab, renderBreakdownTab, renderWayModalShell, attachWayModalHandlers } from "./way-modal.js";
import { getBookmarks, touchResume, recentResumeEntries } from "./bookmarks.js";
import { renderContinueStrip } from "./continue-strip.js";

/**
 * Wires up a topic-renderer study page. Expects the page to already contain
 * the shared DOM shell (same element ids deen-study.html established):
 * who, signInBtn, signOutBtn, app, navBar, tenantSelect, personSelect,
 * breadcrumbContainer, listContainer, detailContainer, wayModalOverlay,
 * wayModalMount.
 *
 * rootSubjectId is the module's own known top-level subject id (e.g.
 * "deen_study", "general_study") -- passed explicitly rather than found by
 * searching moduleSubjects for "the" node with parentId === null. That
 * search was the actual bug behind the owner's "General Study shows Life
 * Skill" report: two "Enhancement" subjects (deen_enhancement,
 * general_enhancement) had been accidentally reparented to top-level back
 * in Phase 2 testing (31 Jul 2026, long before this page existed to
 * surface it) -- `.find(parentId === null)` then picked whichever of the
 * two real top-level nodes Firestore happened to return first, which isn't
 * guaranteed or stable. Anchoring on a known id sidesteps that whole bug
 * class rather than just fixing this one instance of it.
 */
export function initTopicStudyPage({ moduleId, trackableId, rootSubjectId }) {
  const whoEl = document.getElementById("who");
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const appEl = document.getElementById("app");
  const navBar = document.getElementById("navBar");
  const navHomeExtra = document.getElementById("navHomeExtra");
  function renderNav(roles, viewAsRole) {
    navBar.innerHTML = renderNavBar(roles, viewAsRole);
    navHomeExtra.innerHTML = renderHomeExtras(roles);
    mountAppLangControl(navHomeExtra); // shell round 13 -- Settings -> Language; default handler reloads so every name comes back translated
  }
  const tenantSelect = document.getElementById("tenantSelect");
  const personSelect = document.getElementById("personSelect");
  const breadcrumbContainer = document.getElementById("breadcrumbContainer");
  const listContainer = document.getElementById("listContainer");
  const detailContainer = document.getElementById("detailContainer");
  const wayModalOverlay = document.getElementById("wayModalOverlay");
  const wayModalMount = document.getElementById("wayModalMount");
  const continueStripContainer = document.getElementById("continueStrip"); // optional -- Phase 7; older shells without this id just skip the strip


  signInBtn.addEventListener("click", () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => {
      whoEl.textContent = t("Sign-in failed: {message}", { message: err.message });
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
  // Follow-up round: Map(subjectId -> courseOffer contextId) for the
  // selected person, refreshed alongside the records chunk whenever the
  // person changes -- see course-offers.js's programSubjectMapFromEnrollments().
  let programBySubjectId = new Map();
  // Follow-up round (subject-level teacher scoping): null = no restriction
  // (admin/guardian/self, or a mixed-role actor whose OTHER role already
  // grants full access); an array = a pure-teacher actor viewing someone
  // else, restricted to the subjectIds they're actually assigned to teach
  // this person. Client-side only -- see course-offers.js's
  // allowedSubjectIdsForTeacherStudent() for why this can't be a hard
  // server-side rule the same way student-level scoping is.
  let allowedSubjectIds = null;

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
    renderNav(myMemberships.find((m) => m.tenantId === activeTenantId)?.roles ?? [], viewAsRole);

    const visibleRoster = viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster;
    personSelect.innerHTML = visibleRoster
      .map((p) => `<option value="${p.id}">${langText(p.name, getAppLang(), p.id)}</option>`)
      .join("");
    selectedPersonId = visibleRoster[0]?.id ?? null;

    const tree = await getSubjectTree(db, activeTenantId);
    moduleSubjects = tree.filter((n) => (n.moduleIds ?? []).includes(moduleId) && n.status !== "archived");

    const trackables = await getTrackables(db, activeTenantId);
    studiedTrackable = trackables.find((t) => t.id === trackableId) ?? null;

    const root = moduleSubjects.find((n) => n.id === rootSubjectId);
    currentParentId = rootSubjectId;
    chunkSubjectId = rootSubjectId;
    rootLabel = root ? langText(root.name, getAppLang(), moduleId) : moduleId;

    await refreshChunk();
    await refreshProgramMap();
    await refreshSubjectScoping(effRoles, myPersonId);
    renderBrowser();
    await refreshContinueStrip();

    // Phase 7 auto-resume: a Continue-strip link lands here as
    // page.html?resume=<subjectId> -- jump straight to that topic's detail
    // instead of leaving the person to re-browse to it. Silently ignored if
    // the id doesn't resolve to a trackable node in this tenant's tree.
    const resumeId = new URLSearchParams(location.search).get("resume");
    if (resumeId) {
      const resumeNode = moduleSubjects.find((n) => n.id === resumeId && n.isTrackable);
      if (resumeNode) await openTopicDetail(resumeId);
    }
  }

  /** Phase 7 — Continue strip: this module's own most-recent position, plus whatever other modules' pages already wrote to this person's bookmarks. Guarded on continueStripContainer so a shell without the id degrades silently. */
  async function refreshContinueStrip() {
    if (!continueStripContainer || !selectedPersonId) return;
    const bookmarksDoc = await getBookmarks(db, activeTenantId, selectedPersonId);
    const entries = recentResumeEntries(bookmarksDoc, 5).map((e) => {
      const node = e.moduleId === moduleId ? moduleSubjects.find((n) => n.id === e.subjectId) : null;
      return { ...e, subjectLabel: node ? langText(node.name, getAppLang(), node.id) : null };
    });
    continueStripContainer.innerHTML = renderContinueStrip(entries);
  }

  /** Follow-up round: which of this person's actively-enrolled course offers cover which subject, so touchResume()/logActivity() below can tag a real programId instead of always "none". Best-effort, same risk tolerance as refreshContinueStrip -- a lookup failure here shouldn't block studying. */
  async function refreshProgramMap() {
    if (!selectedPersonId) { programBySubjectId = new Map(); return; }
    const enrollments = await listEnrollmentsForPerson(db, activeTenantId, selectedPersonId);
    programBySubjectId = programSubjectMapFromEnrollments(enrollments);
  }

  /**
   * Follow-up round (subject-level teacher scoping). Conservative on
   * purpose: only restricts when effRoles is EXACTLY ["teacher"] (no
   * owner/prime/guardian/self overlap for this login in this tenant) AND
   * the person being viewed isn't the actor themself -- the same
   * conservative condition Homework's own teacher-scoping round used, so a
   * mixed-role actor's broader (contextId-independent) access is never
   * wrongly narrowed. Sets allowedSubjectIds back to null (no restriction)
   * for every other case.
   */
  async function refreshSubjectScoping(effRoles, myPersonId) {
    const isPureTeacher = effRoles.length === 1 && effRoles[0] === "teacher";
    if (!isPureTeacher || !myPersonId || !selectedPersonId || selectedPersonId === myPersonId) {
      allowedSubjectIds = null;
      return;
    }
    const [teacherEnrollments, studentEnrollments, classes, offers] = await Promise.all([
      listEnrollmentsForPerson(db, activeTenantId, myPersonId),
      listEnrollmentsForPerson(db, activeTenantId, selectedPersonId),
      listClasses(db, activeTenantId),
      listCourseOffers(db, activeTenantId),
    ]);
    allowedSubjectIds = allowedSubjectIdsForTeacherStudent(teacherEnrollments, studentEnrollments, [...classes, ...offers]);
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
    if (nodeId === rootSubjectId) return [];
    const node = moduleSubjects.find((n) => n.id === nodeId);
    if (!node) return [];
    return (node.ancestorIds ?? [])
      .filter((id) => id !== rootSubjectId)
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
    // Follow-up round (subject-level teacher scoping): branches always stay
    // visible for navigation -- only LEAF topics outside allowedSubjectIds
    // are hidden, same "graceful narrowing, not a broken tree" shape
    // Homework's own context-scoped roster uses.
    const children = moduleSubjects
      .filter((n) => n.parentId === currentParentId)
      .filter((n) => !n.isTrackable || !allowedSubjectIds || allowedSubjectIds.includes(n.id))
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
        currentParentId = btn.dataset.id || rootSubjectId;
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

    // Follow-up round (subject-level teacher scoping): blocks a direct-navigation
    // bypass of the grid filter above (e.g. a stale ?resume= link from before
    // an assignment changed) -- renderBrowser() already hides this row, but
    // this is the actual gate.
    if (node.isTrackable && allowedSubjectIds && !allowedSubjectIds.includes(node.id)) {
      detailContainer.innerHTML = `<div class="topic-detail"><p class="topic-empty">${t("You're not assigned to teach this subject for this student.")}</p></div>`;
      return;
    }

    // Phase 7 auto-resume: overwrite this module's one "where was I"
    // position every time a topic is opened. Best-effort, same risk
    // tolerance as logActivity() below -- not wrapped in safeWrite(), a
    // failure here doesn't block studying.
    if (selectedPersonId) {
      // Follow-up round: tag the real course-offer id when this subject is
      // actively enrolled through one, instead of always NO_PROGRAM.
      await touchResume(db, {
        tenantId: activeTenantId, personId: selectedPersonId, moduleId,
        programId: programBySubjectId.get(node.id) ?? NO_PROGRAM,
        subjectId: node.id, position: node.id, uid: auth.currentUser.uid,
      });
      await refreshContinueStrip();
    }

    detailContainer.innerHTML = `<div class="topic-detail"><p>Loading…</p></div>`;
    const resources = await getResourcesByIds(db, activeTenantId, node.resourceIds ?? []);
    const resource = resources[0] ?? null;

    const entryKey = `${buildUnitKey.topic(node.id)}::${trackableId}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusLine = entry
      ? `Status: <strong>${entry.claimedStatus.replace(/_/g, " ")}</strong> &middot; ${entry.confirmState}`
      : "Not started yet.";

    detailContainer.innerHTML = `<div class="topic-detail">
      <h2>${langText(node.name, getAppLang(), node.id)}</h2>
      ${renderTopicResource(resource)}
      <p>${statusLine}</p>
      <button type="button" id="trackTopicBtn" ${resource ? "" : "disabled"}>${t("Track my progress")}</button>
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

    const title = `${langText(node.name, getAppLang(), node.id)} — ${t("Studied")}`;
    const tabBodies = {
      Track: renderTrackTab(entry, entry?.claimedStatus ?? "not_started"),
      Guide: renderGuideTab(studiedTrackable, getAppLang()),
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
        // Follow-up round: tag the real course-offer id when this subject is
        // actively enrolled through one, instead of always null.
        await logActivity(db, {
          tenantId: activeTenantId, personId: selectedPersonId, date: new Date(),
          weekStartsOn: tenantWeekStartsOn, subjectId: node.id, unitKey,
          trackableId, action: "claimed", uid: auth.currentUser.uid,
          viaProgramId: programBySubjectId.get(node.id) ?? null,
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
      whoEl.textContent = t("Not signed in.");
      signInBtn.style.display = "inline-block";
      signOutBtn.style.display = "none";
      appEl.style.display = "none";
      return;
    }
    whoEl.textContent = t("Signed in as {email}", { email: user.email });
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
        whoEl.innerHTML += noAccountMessageHtml();
        return;
      }
      activeTenantId = context.tenantId;

      myMemberships = await step("load your memberships", () => getMyMemberships(db, user.uid));
      tenantSelect.innerHTML = myMemberships
        .map((m) => `<option value="${m.tenantId}" ${m.tenantId === activeTenantId ? "selected" : ""}>${m.tenantName} (${roleListLabel(m.roles)})</option>`)
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
    renderNav(chosen.roles, null);
    await ensureModulesSeeded(db, auth.currentUser.uid);
    await ensureSubjectTemplatesSeeded(db, auth.currentUser.uid);
    await ensureTenantCatalogueSeeded(db, activeTenantId, auth.currentUser.uid);
    await loadContextData();
  });

  personSelect.addEventListener("change", async () => {
    selectedPersonId = personSelect.value;
    const { effRoles, myPersonId } = currentPreview();
    await refreshChunk();
    await refreshProgramMap();
    await refreshSubjectScoping(effRoles, myPersonId);
    renderBrowser();
    await refreshContinueStrip();
  });
}
