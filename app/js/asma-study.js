// Phase 13 round 1 — Asma ul Husna study page controller.
//
// Modeled on topic-study.js's shared shape (auth bootstrap, tenant/person
// context, records chunk, Way modal claim/confirm, Continue strip) but
// flattened: there's no tree to browse (see catalogue-data.js's own note --
// asma_ul_husna is one anchor subject, not 99 nodes), so this renders one
// grid of all 99 names straight away, no breadcrumb/branch navigation.
//
// I2-adjacent: this file DOES touch Firebase (it's the page's own
// controller, not a pure renderer like asma-renderer.js is) -- but never
// imports another module's page logic, only the shared renderer/records/
// catalogue layer every module already goes through.

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
import { ensureSubjectTemplatesSeeded, ensureTenantCatalogueSeeded, getTrackables } from "./catalogue.js";
import { ensureModulesSeeded } from "./modules.js";
import { buildUnitKey } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { logActivity } from "./activity.js";
import { renderNavBar, renderHomeExtras, noAccountMessageHtml } from "./nav.js";
import { ASMA_NAMES } from "./asma-data.js";
import { ASMA_POSTERS } from "./asma-posters.js";
import { renderAsmaGrid, renderAsmaDetail, renderAsmaScreensaverSlide } from "./asma-renderer.js";
import { renderGuideTab, renderTrackTab, renderBreakdownTab, renderWayModalShell, attachWayModalHandlers } from "./way-modal.js";
import { getBookmarks, touchResume, recentResumeEntries, NO_PROGRAM } from "./bookmarks.js";
import { renderContinueStrip } from "./continue-strip.js";
import { listEnrollmentsForPerson, programSubjectMapFromEnrollments } from "./course-offers.js";

const MODULE_ID = "asma";
const TRACKABLE_ID = "studied_asma";
const SUBJECT_ID = "asma_ul_husna";
const SCREENSAVER_INTERVAL_MS = 6000;

export function initAsmaStudyPage() {
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
  const gridContainer = document.getElementById("gridContainer");
  const detailContainer = document.getElementById("detailContainer");
  const wayModalOverlay = document.getElementById("wayModalOverlay");
  const wayModalMount = document.getElementById("wayModalMount");
  const continueStripContainer = document.getElementById("continueStrip");
  const screensaverBtn = document.getElementById("screensaverBtn");
  const screensaverOverlay = document.getElementById("screensaverOverlay");
  const screensaverMount = document.getElementById("screensaverMount");
  const screensaverCloseBtn = document.getElementById("screensaverCloseBtn");


  signInBtn.addEventListener("click", () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => {
      whoEl.textContent = t("Sign-in failed: {message}", { message: err.message });
    });
  });
  signOutBtn.addEventListener("click", () => signOut(auth));

  let activeTenantId = null;
  let myMemberships = [];
  let roster = [];
  let selectedPersonId = null;
  let studiedTrackable = null;
  let currentChunk = null;
  const chunkKey = chunkKeyFor(buildUnitKey.name(1), SUBJECT_ID); // any number resolves the same subject_asma_ul_husna chunk
  // Follow-up round: Map(subjectId -> courseOffer contextId) for
  // selectedPersonId -- same mechanism topic-study.js/routine-study.js/
  // quranrevival.html already use. Only ever looked up under SUBJECT_ID
  // here -- Asma ul Husna's whole tree is that one anchor node.
  let programBySubjectId = new Map();

  function currentActingPersonId() {
    const membership = myMemberships.find((m) => m.tenantId === activeTenantId);
    return membership?.personId ?? selectedPersonId;
  }

  async function loadContextData() {
    const [rosterSnap] = await Promise.all([
      getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", activeTenantId))),
    ]);
    roster = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const context = getActiveContext();
    const activeMembership = myMemberships.find((m) => m.tenantId === activeTenantId);
    const realRoles = activeMembership?.roles ?? [];
    const viewAsRole = context?.viewAsRole ?? null;
    const effRoles = effectiveRoles(realRoles, viewAsRole);
    const myPersonId = activeMembership?.personId ?? null;
    renderNav(realRoles, viewAsRole);

    const visibleRoster = viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster;
    personSelect.innerHTML = visibleRoster
      .map((p) => `<option value="${p.id}">${langText(p.name, getAppLang(), p.id)}</option>`)
      .join("");
    selectedPersonId = visibleRoster[0]?.id ?? null;

    const trackables = await getTrackables(db, activeTenantId);
    studiedTrackable = trackables.find((t) => t.id === TRACKABLE_ID) ?? null;

    await refreshChunk();
    await refreshProgramMap();
    renderGrid();
    await refreshContinueStrip();
  }

  /** Follow-up round: which of selectedPersonId's active course-offer enrolments cover SUBJECT_ID -- Asma ul Husna's whole tree is that one anchor node, so this only ever needs the one key. Best-effort, same risk tolerance as refreshContinueStrip. */
  async function refreshProgramMap() {
    if (!selectedPersonId) { programBySubjectId = new Map(); return; }
    const enrollments = await listEnrollmentsForPerson(db, activeTenantId, selectedPersonId);
    programBySubjectId = programSubjectMapFromEnrollments(enrollments);
  }

  async function refreshContinueStrip() {
    if (!continueStripContainer || !selectedPersonId) return;
    const bookmarksDoc = await getBookmarks(db, activeTenantId, selectedPersonId);
    const entries = recentResumeEntries(bookmarksDoc, 5).map((e) => {
      const num = e.moduleId === MODULE_ID ? Number(e.position) : null;
      const name = num ? ASMA_NAMES.find((n) => n.number === num) : null;
      return { ...e, subjectLabel: name ? `${name.transliteration} (${name.number})` : null };
    });
    continueStripContainer.innerHTML = renderContinueStrip(entries);
  }

  async function refreshChunk() {
    if (!selectedPersonId) { currentChunk = null; return; }
    currentChunk = await getRecordsChunk(db, activeTenantId, selectedPersonId, chunkKey);
  }

  function renderGrid() {
    detailContainer.innerHTML = "";
    const statusByNumber = new Map();
    for (const n of ASMA_NAMES) {
      const entryKey = `${buildUnitKey.name(n.number)}::${TRACKABLE_ID}`;
      const status = currentChunk?.entries?.[entryKey]?.claimedStatus ?? null;
      if (status) statusByNumber.set(n.number, status);
    }
    gridContainer.innerHTML = renderAsmaGrid(ASMA_NAMES, statusByNumber);
    gridContainer.querySelectorAll(".asma-card").forEach((btn) => {
      btn.addEventListener("click", () => openNameDetail(Number(btn.dataset.number)));
    });
  }

  async function openNameDetail(number) {
    const name = ASMA_NAMES.find((n) => n.number === number);
    if (!name) return;

    if (selectedPersonId) {
      await touchResume(db, {
        tenantId: activeTenantId, personId: selectedPersonId, moduleId: MODULE_ID,
        programId: programBySubjectId.get(SUBJECT_ID) ?? NO_PROGRAM,
        subjectId: SUBJECT_ID, position: String(number), uid: auth.currentUser.uid,
      });
      await refreshContinueStrip();
    }

    const entryKey = `${buildUnitKey.name(number)}::${TRACKABLE_ID}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    detailContainer.innerHTML = renderAsmaDetail(name, entry);
    document.getElementById("trackAsmaBtn").addEventListener("click", () => openWayModal(name));
  }

  function openWayModal(name) {
    if (!studiedTrackable || !selectedPersonId) return;
    const unitKey = buildUnitKey.name(name.number);
    const entryKey = `${unitKey}::${TRACKABLE_ID}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusIdsForTrackable = Object.values(currentChunk?.entries ?? {})
      .filter((e) => e.trackableId === TRACKABLE_ID)
      .map((e) => e.claimedStatus);

    const title = `${name.transliteration} — ${t("Studied")}`;
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
          subjectId: SUBJECT_ID,
          unitKey,
          trackableId: TRACKABLE_ID,
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
          weekStartsOn: 6, subjectId: SUBJECT_ID, unitKey,
          trackableId: TRACKABLE_ID, action: "claimed", uid: auth.currentUser.uid,
          viaProgramId: programBySubjectId.get(SUBJECT_ID) ?? null,
        });
        const message = outcome.result.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.";
        await refreshChunk();
        renderGrid();
        await openNameDetail(name.number);
        openWayModal(name);
        const freshResultEl = wayModalMount.querySelector(".way-claim-result");
        if (freshResultEl) freshResultEl.textContent = message;
      } else {
        resultEl.textContent = outcome.entry.message;
        claimBtn.disabled = false;
      }
    });
  }

  // ---------------------------------------------------------------------
  // Screensaver -- purely decorative, cycles ASMA_POSTERS (asma-posters.js)
  // with a text-only fallback slide for any gap. Never opened automatically
  // -- load-speed contract: "Screensaver -- on first use, never at startup."
  // ---------------------------------------------------------------------
  let screensaverTimer = null;
  let screensaverIndex = 0;

  function showScreensaverSlide() {
    const poster = ASMA_POSTERS[screensaverIndex % ASMA_POSTERS.length];
    const fallbackName = ASMA_NAMES[screensaverIndex % ASMA_NAMES.length];
    screensaverMount.innerHTML = renderAsmaScreensaverSlide(poster, fallbackName);
    screensaverIndex += 1;
  }

  function openScreensaver() {
    screensaverIndex = Math.floor(Math.random() * ASMA_POSTERS.length);
    showScreensaverSlide();
    screensaverOverlay.classList.add("open");
    screensaverTimer = setInterval(showScreensaverSlide, SCREENSAVER_INTERVAL_MS);
  }

  function closeScreensaver() {
    screensaverOverlay.classList.remove("open");
    if (screensaverTimer) { clearInterval(screensaverTimer); screensaverTimer = null; }
  }

  if (screensaverBtn) screensaverBtn.addEventListener("click", openScreensaver);
  if (screensaverCloseBtn) screensaverCloseBtn.addEventListener("click", closeScreensaver);
  if (screensaverOverlay) screensaverOverlay.addEventListener("click", (e) => { if (e.target === screensaverOverlay) closeScreensaver(); });

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
      await step("set up modules", () => ensureModulesSeeded(db, user.uid));
      await step("set up subject templates", () => ensureSubjectTemplatesSeeded(db, user.uid));
      await step("set up this tenant's catalogue", () => ensureTenantCatalogueSeeded(db, activeTenantId, user.uid));
      await step("load Asma ul Husna", loadContextData);
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
    await refreshChunk();
    await refreshProgramMap();
    renderGrid();
    await refreshContinueStrip();
  });
}
