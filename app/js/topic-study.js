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
import { getAppLang } from "./prefs.js";
import { adoptAppLangFromUserIndex, mountSyncedAppLangControl } from "./lang-sync.js";
import { t, translateStatic } from "./i18n.js";
import { safeWrite } from "./errors.js";
import {
  bootstrapContext, getActiveContext, setActiveContext,
  effectiveRoles, scopedRoster,
} from "./session-context.js";
import { getSubjectTree, getTrackables } from "./catalogue.js";
import { catalogueNeedsSeeding, seedCatalogueNow, repairCatalogueInBackground } from "./catalogue-repair.js";
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
import { getBookmarks, touchResume, recentResumeEntries, saveBookmark, removeSavedBookmark, findSavedBookmark } from "./bookmarks.js";
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
    mountSyncedAppLangControl(navHomeExtra, { db, uid: auth.currentUser?.uid }); // v07.37 -- Settings -> Language, saved to the account so it follows this person to their other devices
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
  // Enhancement round -- the Bookmark Manager. Kept in memory (not re-fetched
  // per topic) so the detail view's own star can check "is this already
  // bookmarked" without a round trip every time a topic is opened; refreshed
  // whenever refreshContinueStrip() runs (person change, tree load).
  let bookmarksDoc = { resume: {}, saved: [] };

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
    // LOAD SPEED (Aug 2026): one wave, not three. The subject tree and the
    // trackables were previously awaited one after the other, AFTER this
    // roster read had already finished -- three round trips in a row for
    // four reads that do not depend on each other at all.
    let [rosterSnap, tenantSnap, tree, trackables] = await Promise.all([
      getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", activeTenantId))),
      getDoc(doc(db, TENANT.TENANTS, activeTenantId)),
      getSubjectTree(db, activeTenantId),
      getTrackables(db, activeTenantId),
    ]);
    // The seeding check is now made from data this page had to read anyway:
    // if this tenant has no catalogue, or none that covers this module, seed
    // it here and re-read. For a tenant already set up this costs nothing.
    if (catalogueNeedsSeeding(tree, rootSubjectId)) {
      await seedCatalogueNow(db, activeTenantId, auth.currentUser.uid);
      [tree, trackables] = await Promise.all([
        getSubjectTree(db, activeTenantId),
        getTrackables(db, activeTenantId),
      ]);
    }
    roster = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tenantWeekStartsOn = tenantSnap.exists() ? (tenantSnap.data().weekStartsOn ?? 6) : 6;

    const { viewAsRole, effRoles, myPersonId } = currentPreview();
    renderNav(myMemberships.find((m) => m.tenantId === activeTenantId)?.roles ?? [], viewAsRole);

    const visibleRoster = viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster;
    personSelect.innerHTML = visibleRoster
      .map((p) => `<option value="${p.id}">${langText(p.name, getAppLang(), p.id)}</option>`)
      .join("");
    selectedPersonId = visibleRoster[0]?.id ?? null;

    moduleSubjects = tree.filter((n) => (n.moduleIds ?? []).includes(moduleId) && n.status !== "archived");
    studiedTrackable = trackables.find((t) => t.id === trackableId) ?? null;

    const root = moduleSubjects.find((n) => n.id === rootSubjectId);
    currentParentId = rootSubjectId;
    chunkSubjectId = rootSubjectId;
    rootLabel = root ? langText(root.name, getAppLang(), moduleId) : moduleId;

    // Four independent reads (records, enrolments, teacher scoping,
    // bookmarks) -- fired together instead of one at a time.
    await Promise.all([
      refreshChunk(),
      refreshProgramMap(),
      refreshSubjectScoping(effRoles, myPersonId),
      refreshContinueStrip(),
    ]);
    renderBrowser();

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

  /** Phase 7 — Continue strip: this module's own most-recent position, plus whatever other modules' pages already wrote to this person's bookmarks. Also refreshes the module-level bookmarksDoc (enhancement round), which the detail view's own Bookmark star reads -- kept here rather than a separate fetch since this already loads the same document. Strip rendering itself stays guarded on continueStripContainer so a shell without the id degrades silently; the bookmarksDoc refresh does not, since the Bookmark star has no such guard. */
  async function refreshContinueStrip() {
    if (!selectedPersonId) return;
    bookmarksDoc = await getBookmarks(db, activeTenantId, selectedPersonId);
    if (!continueStripContainer) return;
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

    const isBookmarked = !!findSavedBookmark(bookmarksDoc, { moduleId, subjectId: node.id, position: node.id });
    detailContainer.innerHTML = `<div class="topic-detail">
      <h2>${langText(node.name, getAppLang(), node.id)} <button type="button" id="bookmarkTopicBtn" class="topic-bookmark-btn${isBookmarked ? " active" : ""}" title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this")}">${isBookmarked ? "★" : "☆"}</button></h2>
      ${renderTopicResource(resource)}
      <p>${statusLine}</p>
      <button type="button" id="trackTopicBtn" ${resource ? "" : "disabled"}>${t("Track my progress")}</button>
    </div>`;

    const trackBtn = document.getElementById("trackTopicBtn");
    trackBtn.addEventListener("click", () => openWayModal(node));
    document.getElementById("bookmarkTopicBtn").addEventListener("click", () => toggleTopicBookmark(node));
  }

  /**
   * Enhancement round -- a real, named entry under the Bookmark menu
   * (bookmarks.html), not just the silent auto-resume touchResume() already
   * writes above. Position is the topic's own id, the same value ?resume=
   * already jumps by -- so a bookmark made here opens the same way a
   * Continue-strip chip already does, no new restore mechanism needed on
   * this page. Unlike Quran, no rich `settings` snapshot: this module has
   * no per-topic reading state to capture, so a bookmark here is exactly
   * "which topic", named by the person.
   */
  async function toggleTopicBookmark(node) {
    if (!auth.currentUser || !selectedPersonId) return;
    const existing = findSavedBookmark(bookmarksDoc, { moduleId, subjectId: node.id, position: node.id });
    if (existing) {
      const outcome = await safeWrite(
        () => removeSavedBookmark(db, activeTenantId, selectedPersonId, existing.id),
        { collection: TENANT.BOOKMARKS, action: "removeSavedBookmark" }
      );
      if (!outcome.ok) return;
      bookmarksDoc = { ...bookmarksDoc, saved: bookmarksDoc.saved.map((b) => (b.id === existing.id ? { ...b, removed: true } : b)) };
    } else {
      const defaultName = langText(node.name, getAppLang(), node.id);
      const name = prompt(t("Name this bookmark:"), defaultName);
      if (name === null) return;
      const outcome = await safeWrite(
        () => saveBookmark(db, {
          tenantId: activeTenantId, personId: selectedPersonId, moduleId, subjectId: node.id,
          name: name.trim() || defaultName, position: node.id, uid: auth.currentUser.uid,
        }),
        { collection: TENANT.BOOKMARKS, action: "saveBookmark" }
      );
      if (!outcome.ok) return;
      bookmarksDoc = { ...bookmarksDoc, saved: [...(bookmarksDoc.saved ?? []), outcome.result] };
    }
    // Patches the star's own DOM directly rather than re-opening the whole
    // detail view: openTopicDetail() would re-fetch bookmarksDoc from
    // scratch (via refreshContinueStrip()) and re-read resources/records for
    // no reason a star click needs -- an unnecessary round trip on top of
    // the one this toggle already made.
    const btn = document.getElementById("bookmarkTopicBtn");
    if (btn) {
      const isBookmarked = !!findSavedBookmark(bookmarksDoc, { moduleId, subjectId: node.id, position: node.id });
      btn.textContent = isBookmarked ? "★" : "☆";
      btn.classList.toggle("active", isBookmarked);
      btn.title = isBookmarked ? t("Remove bookmark") : t("Bookmark this");
    }
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
        const message = t(outcome.result.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.");
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
      // v07.37: if this account has a language set on another device, take it
      // and reload. Costs no extra read -- the snapshot is already in hand.
      if (adoptAppLangFromUserIndex(userIndexSnap)) return;
      const defaultTenantId = userIndexSnap.exists() ? userIndexSnap.data().defaultTenantId : null;

      // One membership load, not two. bootstrapContext() hands back the very
      // list it used to choose the context -- the page used to fetch that
      // same list a second time, one round trip later, for the tenant picker.
      const { context, memberships } = await step("initialize active context", () => bootstrapContext(db, user.uid, defaultTenantId));
      if (!context) {
        whoEl.innerHTML += noAccountMessageHtml();
        return;
      }
      activeTenantId = context.tenantId;
      myMemberships = memberships;
      tenantSelect.innerHTML = myMemberships
        .map((m) => `<option value="${m.tenantId}" ${m.tenantId === activeTenantId ? "selected" : ""}>${m.tenantName} (${roleListLabel(m.roles)})</option>`)
        .join("");

      appEl.style.display = "block";
      // Still self-repairing, but no longer at the person's expense. The
      // three seeding checks used to run here, one after another, before
      // anything was drawn -- three round trips that found nothing to do for
      // any tenant already set up. loadContextData() now seeds only if the
      // data it reads for itself turns out to be missing, and the full drift
      // check runs in the background once the page is usable. See
      // catalogue-repair.js for the whole reasoning.
      await step("load this module", loadContextData);
      repairCatalogueInBackground(db, activeTenantId, user.uid, loadContextData);
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
    // Switching tenants: same rule as first load -- loadContextData() seeds
    // if the tenant it is switching to has nothing, and the drift check runs
    // behind the page rather than in front of it.
    await loadContextData();
    repairCatalogueInBackground(db, activeTenantId, auth.currentUser.uid, loadContextData);
  });

  personSelect.addEventListener("change", async () => {
    selectedPersonId = personSelect.value;
    const { effRoles, myPersonId } = currentPreview();
    // Four independent reads (records, enrolments, teacher scoping,
    // bookmarks) -- fired together instead of one at a time.
    await Promise.all([
      refreshChunk(),
      refreshProgramMap(),
      refreshSubjectScoping(effRoles, myPersonId),
      refreshContinueStrip(),
    ]);
    renderBrowser();
  });
}
