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
import { getAppLang } from "./prefs.js";
import { adoptAppLangFromUserIndex, mountSyncedAppLangControl } from "./lang-sync.js";
import { t, num, asmaName, translateStatic } from "./i18n.js";
import { safeWrite } from "./errors.js";
import {
  bootstrapContext, getActiveContext, setActiveContext,
  effectiveRoles, scopedRoster, getSelectedPersonId, setSelectedPersonId,
} from "./session-context.js";
import { getTrackables } from "./catalogue.js";
import { seedCatalogueNow, repairCatalogueInBackground } from "./catalogue-repair.js";
import { buildUnitKey } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { logActivity } from "./activity.js";
import { renderNavBar, renderHomeExtras, noAccountMessageHtml } from "./nav.js";
import { mountBookmarkMenu } from "./bookmark-nav.js";
import { ASMA_NAMES } from "./asma-data.js";
import { ASMA_POSTERS } from "./asma-posters.js";
import { renderAsmaGrid, renderAsmaDetail, renderAsmaScreensaverSlide } from "./asma-renderer.js";
import { renderGuideTab, renderTrackTab, renderBreakdownTab, renderWayModalShell, attachWayModalHandlers } from "./way-modal.js";
import { getBookmarks, touchResume, recentResumeEntries, saveBookmark, removeSavedBookmark, findSavedBookmark, NO_PROGRAM, createFolder, flattenFolderTree } from "./bookmarks.js";
import { openBookmarkNamePopover } from "./bookmark-popover.js";
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
    mountSyncedAppLangControl(navHomeExtra, { db, uid: auth.currentUser?.uid }); // v07.37 -- Settings -> Language, saved to the account so it follows this person to their other devices
    mountBookmarkMenu(navBar, { db, getTenantId: () => activeTenantId, getPersonId: () => selectedPersonId, getBookmarksDoc: () => bookmarksDoc, getRoster: () => roster });
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
  // Enhancement round -- the Bookmark Manager (same shape as topic-study.js).
  let bookmarksDoc = { resume: {}, saved: [] };
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
    // LOAD SPEED (Aug 2026): the trackables read used to sit on its own,
    // after the roster had already come back, and behind three seeding
    // checks before that. It depends on neither.
    let [rosterSnap, trackables] = await Promise.all([
      getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", activeTenantId))),
      getTrackables(db, activeTenantId),
    ]);
    // Asma's 99 Names are fixed platform data, not a tenant-authored tree,
    // so the thing that has to exist for this page is its own trackable --
    // that absence is what "this tenant is not set up yet" means here.
    if (!trackables.some((tr) => tr.id === TRACKABLE_ID)) {
      await seedCatalogueNow(db, activeTenantId, auth.currentUser.uid);
      trackables = await getTrackables(db, activeTenantId);
    }
    roster = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const context = getActiveContext();
    const activeMembership = myMemberships.find((m) => m.tenantId === activeTenantId);
    const realRoles = activeMembership?.roles ?? [];
    const viewAsRole = context?.viewAsRole ?? null;
    const effRoles = effectiveRoles(realRoles, viewAsRole);
    const myPersonId = activeMembership?.personId ?? null;
    renderNav(realRoles, viewAsRole);

    const visibleRoster = (viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster).filter((p) => p.status !== "archived");
    personSelect.innerHTML = visibleRoster
      .map((p) => `<option value="${p.id}">${langText(p.name, getAppLang(), p.id)}</option>`)
      .join("");
    // Fix round (25 Aug 2026): a Person selection now stays chosen across
    // pages and reloads, until manually changed -- see topic-study.js's own
    // copy of this comment.
    const storedPersonId = getSelectedPersonId();
    selectedPersonId = visibleRoster.some((p) => p.id === storedPersonId) ? storedPersonId : (visibleRoster[0]?.id ?? null);
    personSelect.value = selectedPersonId ?? "";

    // Parameter renamed off `t` in phase 6: it shadowed the imported
    // translator, so any t("…") added inside this callback would silently
    // have called the trackable instead. Phases 2 and 5 each hit this.
    studiedTrackable = trackables.find((tr) => tr.id === TRACKABLE_ID) ?? null;

    // Three independent reads (records, enrolments, bookmarks) -- fired
    // together instead of one at a time.
    await Promise.all([refreshChunk(), refreshProgramMap(), refreshContinueStrip()]);
    renderGrid();

    // Enhancement round -- this page never read ?resume= at all (a real,
    // separate, pre-existing gap: topic-study.js/routine-study.js have
    // carried this since Phase 7 round 3). A bookmark made here jumps back
    // through this exact same param -- bookmarks.html links non-Quran
    // bookmarks straight to ?resume=<position>, so this module needs no
    // second query param of its own to support the Bookmark Manager.
    const resumeId = new URLSearchParams(location.search).get("resume");
    const number = resumeId ? Number(resumeId) : null;
    if (number && ASMA_NAMES.some((n) => n.number === number)) await openNameDetail(number);
  }

  /** Follow-up round: which of selectedPersonId's active course-offer enrolments cover SUBJECT_ID -- Asma ul Husna's whole tree is that one anchor node, so this only ever needs the one key. Best-effort, same risk tolerance as refreshContinueStrip. */
  async function refreshProgramMap() {
    if (!selectedPersonId) { programBySubjectId = new Map(); return; }
    const enrollments = await listEnrollmentsForPerson(db, activeTenantId, selectedPersonId);
    programBySubjectId = programSubjectMapFromEnrollments(enrollments);
  }

  /** Also refreshes the module-level bookmarksDoc (enhancement round), which the detail view's own Bookmark star reads -- see topic-study.js's own version of this comment for why the fetch isn't guarded on continueStripContainer. */
  async function refreshContinueStrip() {
    if (!selectedPersonId) return;
    bookmarksDoc = await getBookmarks(db, activeTenantId, selectedPersonId);
    if (!continueStripContainer) return;
    const entries = recentResumeEntries(bookmarksDoc, 5).map((e) => {
      // Local `number`, not `num` -- phase 6 imports num() from i18n.js and
      // the old name would have shadowed it exactly where it is needed.
      const number = e.moduleId === MODULE_ID ? Number(e.position) : null;
      const name = number ? ASMA_NAMES.find((n) => n.number === number) : null;
      return { ...e, subjectLabel: name ? `${asmaName(name.number, name.transliteration)} (${num(name.number)})` : null };
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
    const isBookmarked = !!findSavedBookmark(bookmarksDoc, { moduleId: MODULE_ID, subjectId: SUBJECT_ID, position: String(number) });
    detailContainer.innerHTML = renderAsmaDetail(name, entry, { isBookmarked });
    document.getElementById("trackAsmaBtn").addEventListener("click", () => openWayModal(name));
    document.getElementById("bookmarkAsmaBtn").addEventListener("click", () => toggleAsmaBookmark(name));
  }

  /** Enhancement round -- same shape as topic-study.js's toggleTopicBookmark(): a real, named entry under the Bookmark menu, position-only (no rich settings), reusing ?resume='s own restore path (fixed above in loadContextData()). */
  async function toggleAsmaBookmark(name) {
    if (!auth.currentUser || !selectedPersonId) return;
    const position = String(name.number);
    const existing = findSavedBookmark(bookmarksDoc, { moduleId: MODULE_ID, subjectId: SUBJECT_ID, position });
    if (existing) {
      const outcome = await safeWrite(
        () => removeSavedBookmark(db, activeTenantId, selectedPersonId, existing.id),
        { collection: TENANT.BOOKMARKS, action: "removeSavedBookmark" }
      );
      if (!outcome.ok) return;
      bookmarksDoc = { ...bookmarksDoc, saved: bookmarksDoc.saved.map((b) => (b.id === existing.id ? { ...b, removed: true } : b)) };
    } else {
      const defaultName = asmaName(name.number, name.transliteration);
      const choice = await openBookmarkNamePopover({
        defaultName,
        folders: flattenFolderTree(bookmarksDoc),
        // Fixes round 2 -- tag this bookmark with a person. Defaults to
        // whoever is selected right now (studying WITH a child is the
        // common case, per D10), and "No one in particular" clears it.
        people: roster.map((p) => ({ id: p.id, name: langText(p.name, getAppLang(), p.id) })),
        defaultPersonTagId: selectedPersonId,
      });
      if (!choice) return;
      let folderId = choice.folderId;
      if (choice.newFolderName) {
        const folderOutcome = await safeWrite(
          () => createFolder(db, { tenantId: activeTenantId, personId: selectedPersonId, name: choice.newFolderName, uid: auth.currentUser.uid }),
          { collection: TENANT.BOOKMARKS, action: "createFolder" }
        );
        if (!folderOutcome.ok) return;
        folderId = folderOutcome.result.id;
        bookmarksDoc = { ...bookmarksDoc, folders: [...(bookmarksDoc.folders ?? []), folderOutcome.result] };
      }
      const outcome = await safeWrite(
        () => saveBookmark(db, {
          tenantId: activeTenantId, personId: selectedPersonId, moduleId: MODULE_ID, subjectId: SUBJECT_ID,
          name: choice.name || defaultName, position, folderId, personTagId: choice.personTagId, uid: auth.currentUser.uid,
        }),
        { collection: TENANT.BOOKMARKS, action: "saveBookmark" }
      );
      if (!outcome.ok) return;
      bookmarksDoc = { ...bookmarksDoc, saved: [...(bookmarksDoc.saved ?? []), outcome.result] };
    }
    // Patches the star's own DOM directly -- see topic-study.js's own
    // toggleTopicBookmark() for why this doesn't re-open the whole detail view.
    const btn = document.getElementById("bookmarkAsmaBtn");
    if (btn) {
      const isBookmarked = !!findSavedBookmark(bookmarksDoc, { moduleId: MODULE_ID, subjectId: SUBJECT_ID, position });
      btn.textContent = isBookmarked ? "★" : "☆";
      btn.classList.toggle("active", isBookmarked);
      btn.title = isBookmarked ? t("Remove bookmark") : t("Bookmark this");
    }
  }

  function openWayModal(name) {
    if (!studiedTrackable || !selectedPersonId) return;
    const unitKey = buildUnitKey.name(name.number);
    const entryKey = `${unitKey}::${TRACKABLE_ID}`;
    const entry = currentChunk?.entries?.[entryKey] ?? null;
    const statusIdsForTrackable = Object.values(currentChunk?.entries ?? {})
      .filter((e) => e.trackableId === TRACKABLE_ID)
      .map((e) => e.claimedStatus);

    const title = `${asmaName(name.number, name.transliteration)} — ${t("Studied")}`;
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
        const message = t(outcome.result.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.");
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
      await step("load Asma ul Husna", loadContextData);
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
    setSelectedPersonId(selectedPersonId);
    await refreshChunk();
    await refreshProgramMap();
    renderGrid();
    await refreshContinueStrip();
  });
}
