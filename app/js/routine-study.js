// Phase 7 — Shared study-screen logic for every "routine" renderer module
// (Architecture s5: Health, Learn Deen On-the-Go).
//
// Deliberately built as topic-study.js's sibling, not a subclass of it or a
// parametrized merge with it -- the two controllers share the same subject
// tree / breadcrumb / resource machinery (topic-renderer.js, way-modal.js,
// records.js) but diverge on what a leaf actually IS: a topic is claimed
// once toward mastery; a routine is claimed toward mastery too (same
// Track/Guide/Breakdown tabs, same "Studied"-shaped trackable, here named
// "Practised") but is ALSO logged per-occurrence for a streak, which a
// topic never is. Forcing one file to cover both would mean every topic
// caller carrying dead streak/log code it never uses -- I2's "renderers are
// shared components" is about not duplicating the RENDERING (topic-renderer.js's
// breadcrumb/list/resource functions are reused directly below), not about
// forcing every renderer family through one controller.
//
// I2-adjacent: this file DOES touch Firebase (it's the page's own
// controller, not a pure renderer) -- but it never imports another
// module's page logic, only the shared renderer/records/activity/catalogue
// layer every module already goes through.

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
import {
  logActivity, weekKeyFor, getWeekActivity, hasLoggedOn, getRecentWeeksActivity, computeStreak,
} from "./activity.js";
import { getResourcesByIds } from "./resources.js";
import { renderNavBar } from "./nav.js";
import { renderTopicBreadcrumb, renderTopicChildList, renderTopicResource } from "./topic-renderer.js";
import {
  renderGuideTab, renderTrackTab, renderBreakdownTab, renderStreakTab,
  renderWayModalShell, attachWayModalHandlers,
} from "./way-modal.js";
import { getBookmarks, touchResume, recentResumeEntries, NO_PROGRAM } from "./bookmarks.js";
import { renderContinueStrip } from "./continue-strip.js";
import { listEnrollmentsForPerson, programSubjectMapFromEnrollments } from "./course-offers.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Wires up a routine-renderer study page. Same DOM contract as
 * initTopicStudyPage() (topic-study.js) plus one more optional element:
 * reminderBanner (a top-of-page "N routines not logged today" count).
 */
export function initRoutineStudyPage({ moduleId, trackableId, rootSubjectId }) {
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
  const continueStripContainer = document.getElementById("continueStrip");
  const reminderBanner = document.getElementById("reminderBanner"); // optional

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
  let practisedTrackable = null;
  let currentChunk = null;
  let currentWeekActivity = null; // this person's current week -- "logged today" comes from here
  let currentParentId = null;
  let rootLabel = "";
  let chunkSubjectId = null;
  // Follow-up round (same as topic-study.js): Map(subjectId -> courseOffer
  // contextId) for the selected person -- see course-offers.js's
  // programSubjectMapFromEnrollments().
  let programBySubjectId = new Map();

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
    practisedTrackable = trackables.find((t) => t.id === trackableId) ?? null;

    const root = moduleSubjects.find((n) => n.id === rootSubjectId);
    currentParentId = rootSubjectId;
    chunkSubjectId = rootSubjectId;
    rootLabel = root ? langText(root.name, "en", moduleId) : moduleId;

    await refreshChunk();
    await refreshWeekActivity();
    await refreshProgramMap();
    renderBrowser();
    await refreshContinueStrip();

    const resumeId = new URLSearchParams(location.search).get("resume");
    if (resumeId) {
      const resumeNode = moduleSubjects.find((n) => n.id === resumeId && n.isTrackable);
      if (resumeNode) await openRoutineDetail(resumeId);
    }
  }

  async function refreshChunk() {
    if (!selectedPersonId || !chunkSubjectId) { currentChunk = null; return; }
    const chunkKey = chunkKeyFor(buildUnitKey.topic("_"), chunkSubjectId);
    currentChunk = await getRecordsChunk(db, activeTenantId, selectedPersonId, chunkKey);
  }

  /** This person's current week of activity -- one doc, load-speed-safe (Architecture: "Activity -- one document per week"). Drives the "logged today" badges and the reminder banner; the fuller multi-week streak only loads on demand when a routine's Streak tab actually opens. */
  async function refreshWeekActivity() {
    if (!selectedPersonId) { currentWeekActivity = null; return; }
    const weekKey = weekKeyFor(new Date(), tenantWeekStartsOn);
    currentWeekActivity = await getWeekActivity(db, activeTenantId, selectedPersonId, weekKey);
  }

  /** Follow-up round: which of this person's actively-enrolled course offers cover which subject, so touchResume()/logActivity() below can tag a real programId instead of always "none"/null. Best-effort, same risk tolerance as refreshContinueStrip. */
  async function refreshProgramMap() {
    if (!selectedPersonId) { programBySubjectId = new Map(); return; }
    const enrollments = await listEnrollmentsForPerson(db, activeTenantId, selectedPersonId);
    programBySubjectId = programSubjectMapFromEnrollments(enrollments);
  }

  async function refreshContinueStrip() {
    if (!continueStripContainer || !selectedPersonId) return;
    const bookmarksDoc = await getBookmarks(db, activeTenantId, selectedPersonId);
    const entries = recentResumeEntries(bookmarksDoc, 5).map((e) => {
      const node = e.moduleId === moduleId ? moduleSubjects.find((n) => n.id === e.subjectId) : null;
      return { ...e, subjectLabel: node ? langText(node.name, "en", node.id) : null };
    });
    continueStripContainer.innerHTML = renderContinueStrip(entries);
  }

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
      if (reminderBanner) reminderBanner.innerHTML = "";
      return;
    }
    breadcrumbContainer.innerHTML = renderTopicBreadcrumb(ancestorPath(currentParentId), rootLabel);
    const children = moduleSubjects
      .filter((n) => n.parentId === currentParentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const statusByNodeId = new Map();
    const loggedTodayByNodeId = new Map();
    const today = todayIso();
    for (const n of children) {
      if (!n.isTrackable) continue;
      const entryKey = `${buildUnitKey.topic(n.id)}::${trackableId}`;
      const status = currentChunk?.entries?.[entryKey]?.claimedStatus ?? null;
      if (status) statusByNodeId.set(n.id, status);
      loggedTodayByNodeId.set(n.id, hasLoggedOn(currentWeekActivity, n.id, today));
    }
    listContainer.innerHTML = renderTopicChildList(children, statusByNodeId, loggedTodayByNodeId);

    if (reminderBanner) {
      const dueCount = [...loggedTodayByNodeId.values()].filter((logged) => !logged).length;
      reminderBanner.innerHTML = dueCount > 0
        ? `<p class="routine-reminder">${dueCount} routine${dueCount === 1 ? "" : "s"} here not logged today yet.</p>`
        : "";
    }

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
      btn.addEventListener("click", () => openRoutineDetail(btn.dataset.id));
    });
  }

  async function openRoutineDetail(nodeId) {
    const node = moduleSubjects.find((n) => n.id === nodeId);
    if (!node) return;

    if (selectedPersonId) {
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
    const loggedToday = hasLoggedOn(currentWeekActivity, node.id, todayIso());

    detailContainer.innerHTML = `<div class="topic-detail">
      <h2>${langText(node.name, "en", node.id)}</h2>
      ${renderTopicResource(resource)}
      <p>${statusLine}</p>
      <p>${loggedToday ? "Logged today ✓" : "Not logged today yet."}</p>
      <button type="button" id="trackTopicBtn" ${resource ? "" : "disabled"}>Track my progress</button>
    </div>`;

    const trackBtn = document.getElementById("trackTopicBtn");
    trackBtn.addEventListener("click", () => openWayModal(node));
  }

  async function logRoutineToday(node) {
    return safeWrite(
      () => logActivity(db, {
        tenantId: activeTenantId, personId: selectedPersonId, date: new Date(),
        weekStartsOn: tenantWeekStartsOn, subjectId: node.id,
        unitKey: buildUnitKey.topic(node.id), trackableId, action: "practised",
        uid: auth.currentUser.uid,
        viaProgramId: programBySubjectId.get(node.id) ?? null,
      }),
      { collection: "activity", action: "logRoutine" }
    );
  }

  async function openWayModal(node) {
    if (!practisedTrackable || !selectedPersonId) return;
    const unitKey = buildUnitKey.topic(node.id);
    const entryKey = `${unitKey}::${trackableId}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusIdsForTrackable = Object.values(currentChunk?.entries ?? {})
      .filter((e) => e.trackableId === trackableId)
      .map((e) => e.claimedStatus);

    const recentWeeks = await getRecentWeeksActivity(db, activeTenantId, selectedPersonId, tenantWeekStartsOn, 8);
    const streakCount = computeStreak(recentWeeks, node.id);
    const loggedToday = hasLoggedOn(currentWeekActivity, node.id, todayIso());

    const title = `${langText(node.name, "en", node.id)} — Practised`;
    const tabBodies = {
      Track: renderTrackTab(entry, entry?.claimedStatus ?? "not_started"),
      Guide: renderGuideTab(practisedTrackable, "en"),
      Streak: renderStreakTab(streakCount, loggedToday),
      Breakdown: renderBreakdownTab(statusIdsForTrackable),
    };
    wayModalMount.innerHTML = renderWayModalShell(title, tabBodies, ["Track", "Guide", "Streak", "Breakdown"]);
    wayModalOverlay.classList.add("open");
    attachWayModalHandlers(wayModalMount.firstElementChild, {
      onClose: () => wayModalOverlay.classList.remove("open"),
    });

    const logBtn = wayModalMount.querySelector(".way-log-btn");
    if (logBtn) {
      logBtn.addEventListener("click", async () => {
        logBtn.disabled = true;
        const outcome = await logRoutineToday(node);
        const logResultEl = wayModalMount.querySelector(".way-log-result");
        if (outcome.ok) {
          await refreshWeekActivity();
          renderBrowser();
          await openRoutineDetail(node.id);
          openWayModal(node); // refresh the modal against the new activity
        } else if (logResultEl) {
          logResultEl.textContent = outcome.entry.message;
          logBtn.disabled = false;
        }
      });
    }

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
          viaProgramId: programBySubjectId.get(node.id) ?? null,
        });
        const message = outcome.result.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.";
        await refreshChunk();
        renderBrowser();
        await openRoutineDetail(node.id);
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
    await refreshWeekActivity();
    await refreshProgramMap();
    renderBrowser();
    await refreshContinueStrip();
  });
}
