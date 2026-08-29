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
import { langText, setLangText } from "./lang.js";
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
import { buildUnitKey, statusLabelsById } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { logActivity } from "./activity.js";
import { renderNavBar, renderHomeExtras, noAccountMessageHtml } from "./nav.js";
import { mountBookmarkMenu } from "./bookmark-nav.js";
import { ASMA_NAMES } from "./asma-data.js";
import { ASMA_POSTERS } from "./asma-posters.js";
import { renderAsmaGrid, renderAsmaDetail, renderAsmaScreensaverSlide, renderAsmaCollectionListHtml, asmaEntryDisplayName } from "./asma-renderer.js";
import { renderScopedWheel, renderWheelLegend, attachScopedWheelClickHandler } from "./mastery-wheel.js";
import {
  collectionsFrom, extraNamesFrom, overridesFrom, activeCollections, activeExtraNames,
  addCollection, renameCollection, setCollectionStatus,
  addItem as asmaAddItemLocal, removeItem as asmaRemoveItemLocal, moveItem as asmaMoveItemLocal,
  updateExtraName, setExtraNameStatus, setNameOverrideBn,
  getAsmaCollectionsDoc, saveAsmaCollections, resolveAsmaEntry,
} from "./asma-collections.js";
import {
  renderGuideTab, renderTrackTab, renderBreakdownTab, renderWayModalShell, attachWayModalHandlers,
  renderAssignDropdown, wireAssignDropdown, checkedAssignees, buildClaimResultMessage,
} from "./way-modal.js";
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

  // Asma Collections round -- the "Browse by Category" panel, built to the
  // same template as Ayah Collections (QCR). Static markup, wired once
  // (same lesson QCR's own round 2 already learned: re-attaching listeners
  // on every render is unnecessary work).
  const asmaCatToggleBtn = document.getElementById("asmaCatToggleBtn");
  const asmaCatPanel = document.getElementById("asmaCatPanel");
  const asmaCatBackBtn = document.getElementById("asmaCatBackBtn");
  const asmaCatLevelSelect = document.getElementById("asmaCatLevelSelect");
  const asmaCatManageActions = document.getElementById("asmaCatManageActions");
  const asmaCatRenameBtn = document.getElementById("asmaCatRenameBtn");
  const asmaCatArchiveBtn = document.getElementById("asmaCatArchiveBtn");
  const asmaCatAddGroupBtn = document.getElementById("asmaCatAddGroupBtn");
  const asmaCatShowArchivedToggle = document.getElementById("asmaCatShowArchivedToggle");
  const asmaCatManageToggleBtn = document.getElementById("asmaCatManageToggleBtn");
  const asmaCatListHeaderEl = document.getElementById("asmaCatListHeader");
  const asmaCatWaysListContainer = document.getElementById("asmaCatWaysListContainer");
  const asmaCatAddFormSlot = document.getElementById("asmaCatAddFormSlot");
  const asmaCatWheelContainerEl = document.getElementById("asmaCatWheelContainer");
  const asmaCatLegendContainerEl = document.getElementById("asmaCatLegendContainer");
  const asmaCatHintEl = document.getElementById("asmaCatHint");


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

  // Asma Collections round -- loaded lazily, once per sign-in, the first
  // time either the category browser OR any Name's own detail view is
  // opened (I9 -- an on-first-use cost, not a startup-path one; the plain
  // 99-grid's own load stays exactly as it was). null until then.
  let asmaCollections = null;
  let asmaExtraNames = null;
  let asmaOverrides = {};
  let asmaCollectionsDocExists = false;
  let asmaCollectionsTenantId = null; // which tenant the above was loaded for
  let asmaCatCurrentId = null;
  let asmaCatManageOn = false;
  let asmaCatShowArchived = false;

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function currentActingPersonId() {
    const membership = myMemberships.find((m) => m.tenantId === activeTenantId);
    return membership?.personId ?? selectedPersonId;
  }

  /** Who a Claim can be assigned to -- the exact same scoping the Person
      picker already uses (scopedRoster(), non-archived), recomputed on
      demand rather than stored separately so the two can never disagree. */
  function assignableRoster() {
    const context = getActiveContext();
    const activeMembership = myMemberships.find((m) => m.tenantId === activeTenantId);
    const realRoles = activeMembership?.roles ?? [];
    const viewAsRole = context?.viewAsRole ?? null;
    const effRoles = effectiveRoles(realRoles, viewAsRole);
    const myPersonId = activeMembership?.personId ?? null;
    return (viewAsRole ? scopedRoster(roster, effRoles, myPersonId) : roster)
      .filter((p) => p.status !== "archived")
      .map((p) => ({ id: p.id, name: langText(p.name, getAppLang(), p.id), isSelf: p.id === myPersonId }));
  }

  /** Asma Collections round -- owner/prime only, same check quranrevival.html's
      own canAdminCatalogueClientSide() makes for QCR's Manage mode. */
  function canManageAsmaCollections() {
    const membership = myMemberships.find((m) => m.tenantId === activeTenantId);
    if (!membership) return false;
    const context = getActiveContext();
    const viewAsRole = context?.viewAsRole ?? null;
    const effRoles = effectiveRoles(membership.roles ?? [], viewAsRole);
    return effRoles.some((r) => r === "owner" || r === "prime");
  }

  /** Resolves ONE Name/phrase (canonical 1..99, or an extra >= 100) using
      whatever asmaCollections data is currently loaded -- empty defaults
      until ensureAsmaCollectionsLoaded() has run at least once. */
  function resolveNumber(number) {
    return resolveAsmaEntry(number, { extraNames: asmaExtraNames ?? [], overrides: asmaOverrides });
  }

  /** Real bug shape to guard against (the same one QCR's own 27 Aug 2026
      report already caught for ayahCollections): before the owner deploys
      this round's own firestore.rules addition, reading
      asmaCollections/{tenantId} throws permission-denied. Falls back to
      the seeded defaults rather than leaving anything stuck on "Loading…". */
  async function ensureAsmaCollectionsLoaded() {
    if (asmaCollections && asmaCollectionsTenantId === activeTenantId) return;
    try {
      const docData = await getAsmaCollectionsDoc(db, activeTenantId);
      asmaCollectionsDocExists = !!docData;
      asmaCollections = collectionsFrom(docData);
      asmaExtraNames = extraNamesFrom(docData);
      asmaOverrides = overridesFrom(docData);
    } catch (err) {
      console.warn("Couldn't read this tenant's saved Asma collections yet (showing the built-in defaults instead):", err.message);
      asmaCollectionsDocExists = false;
      asmaCollections = collectionsFrom(null);
      asmaExtraNames = extraNamesFrom(null);
      asmaOverrides = {};
    }
    asmaCollectionsTenantId = activeTenantId;
  }

  /** Every manage action writes the whole document back immediately (no
      batched Save button -- an edit that already looked applied on screen
      should never be lost by navigating away). I15: a failure reaches the
      user through safeWrite(); the caller rolls the optimistic in-memory
      change back on failure. */
  async function asmaPersist() {
    const res = await safeWrite(
      () => saveAsmaCollections(db, {
        tenantId: activeTenantId, collections: asmaCollections, extraNames: asmaExtraNames,
        overrides: asmaOverrides, docExists: asmaCollectionsDocExists, uid: auth.currentUser.uid,
      }),
      { collection: TENANT.ASMA_COLLECTIONS, docId: activeTenantId, action: "save Asma collections" }
    );
    if (res.ok) asmaCollectionsDocExists = true;
    return res.ok;
  }

  function asmaCatDefaultCollectionId() {
    return activeCollections(asmaCollections ?? [])[0]?.id ?? asmaCollections?.[0]?.id ?? null;
  }

  /** The level bar: a plain <select> of active (or, if showArchived, all)
      groups, plus Manage-mode icon buttons for whichever one is currently
      selected -- byte-for-byte the same shape as QCR's own renderQcrLevelBar(). */
  function renderAsmaCatLevelBar() {
    const visible = asmaCatShowArchived
      ? [...asmaCollections].sort((a, b) => a.order - b.order)
      : activeCollections(asmaCollections);
    asmaCatLevelSelect.innerHTML = visible.length
      ? visible.map((c) => {
          const label = langText(c.title, getAppLang()) + (c.status === "archived" ? ` (${t("Archived")})` : "");
          return `<option value="${c.id}"${c.id === asmaCatCurrentId ? " selected" : ""}>${escapeHtml(label)}</option>`;
        }).join("")
      : `<option value="">${escapeHtml(t("No groups yet."))}</option>`;

    const canManage = canManageAsmaCollections();
    asmaCatManageToggleBtn.hidden = !canManage;
    asmaCatManageToggleBtn.classList.toggle("on", asmaCatManageOn);
    const showManageActions = canManage && asmaCatManageOn;
    asmaCatManageActions.hidden = !showManageActions;
    if (showManageActions) {
      const col = asmaCollections.find((c) => c.id === asmaCatCurrentId);
      const archived = col?.status === "archived";
      asmaCatArchiveBtn.textContent = archived ? "↺" : "🗄";
      asmaCatArchiveBtn.title = archived ? t("Restore") : t("Archive");
      asmaCatArchiveBtn.setAttribute("aria-label", asmaCatArchiveBtn.title);
      asmaCatArchiveBtn.classList.toggle("danger", !archived);
      asmaCatArchiveBtn.disabled = !col;
      asmaCatRenameBtn.disabled = !col;
      asmaCatShowArchivedToggle.checked = asmaCatShowArchived;
    }
  }

  /** Every Name currently NOT in this group -- both canonical (1..99) and
      active extras -- for the "+ Add to this group" picker. */
  function asmaNamesNotInCollection(col) {
    const already = new Set(col.items);
    const canonicalKeys = ASMA_NAMES
      .filter((n) => !already.has(buildUnitKey.name(n.number)))
      .map((n) => ({ key: buildUnitKey.name(n.number), entry: resolveNumber(n.number) }));
    const extraKeys = activeExtraNames(asmaExtraNames ?? [])
      .filter((e) => !already.has(buildUnitKey.name(e.number)))
      .map((e) => ({ key: buildUnitKey.name(e.number), entry: resolveNumber(e.number) }));
    return [...canonicalKeys, ...extraKeys];
  }

  /** Renders the list + wheel for whichever group is current -- mirrors
      QCR's own renderQcrCollectionView(), adapted for Names instead of āyāt. */
  function renderAsmaCatPanel() {
    renderAsmaCatLevelBar();
    const col = asmaCollections.find((c) => c.id === asmaCatCurrentId);
    if (!col) {
      asmaCatListHeaderEl.innerHTML = "";
      asmaCatWaysListContainer.innerHTML = `<p class="hint">${escapeHtml(t("No groups yet."))}</p>`;
      asmaCatAddFormSlot.innerHTML = "";
      asmaCatWheelContainerEl.innerHTML = "";
      asmaCatLegendContainerEl.innerHTML = "";
      asmaCatHintEl.textContent = "";
      return;
    }
    const statusByKey = new Map();
    for (const uk of col.items) {
      const number = Number(uk.split(":")[1]);
      const entryKey = `${uk}::${TRACKABLE_ID}`;
      statusByKey.set(uk, currentChunk?.entries?.[entryKey]?.claimedStatus ?? "not_started");
    }
    const entries = col.items
      .map((uk) => {
        const number = Number(uk.split(":")[1]);
        const entry = resolveNumber(number);
        if (!entry) return null;
        return { key: uk, entry, statusId: statusByKey.get(uk) };
      })
      .filter(Boolean);
    const labelsById = statusLabelsById();

    asmaCatListHeaderEl.innerHTML = `
      <span class="t">${escapeHtml(langText(col.title, getAppLang()))}</span>
      <span class="c">${escapeHtml(t("{count} Names", { count: num(entries.length) }))}</span>
    `;

    const otherCollections = asmaCollections.filter((c) => c.id !== col.id && c.status !== "archived");
    asmaCatWaysListContainer.innerHTML = renderAsmaCollectionListHtml(entries, { manageOn: asmaCatManageOn, otherCollections });

    asmaCatWaysListContainer.querySelectorAll("[data-asma-jump]").forEach((btn) => {
      btn.addEventListener("click", () => goToNameFromCategory(btn.dataset.asmaJump));
    });
    asmaCatWaysListContainer.querySelectorAll("[data-asma-remove]").forEach((btn) => {
      btn.addEventListener("click", () => asmaRemoveItemAction(col.id, btn.dataset.asmaRemove));
    });
    asmaCatWaysListContainer.querySelectorAll("[data-asma-move]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const toId = sel.value;
        if (!toId) return;
        asmaMoveItemAction(col.id, toId, sel.dataset.asmaMove);
      });
    });
    asmaCatWaysListContainer.querySelectorAll("[data-asma-edit-bn]").forEach((btn) => {
      btn.addEventListener("click", () => asmaEditBnPrompt(btn.dataset.asmaEditBn));
    });
    asmaCatWaysListContainer.querySelectorAll("[data-asma-archive-extra]").forEach((btn) => {
      btn.addEventListener("click", () => asmaArchiveExtraAction(btn.dataset.asmaArchiveExtra));
    });

    asmaCatAddFormSlot.innerHTML = asmaCatManageOn
      ? (() => {
          const candidates = asmaNamesNotInCollection(col);
          if (!candidates.length) {
            return `<p class="hint">${escapeHtml(t("Already in this group, or no Names left to add."))}</p>`;
          }
          const options = candidates
            .map((c) => `<option value="${escapeHtml(c.key)}">#${num(c.entry.number)} — ${escapeHtml(asmaEntryDisplayName(c.entry))}</option>`)
            .join("");
          return `<div class="asma-add-form">
            <select id="asmaCatAddSelect">${options}</select>
            <button type="button" id="asmaCatAddBtn">${escapeHtml(t("+ Add to this group"))}</button>
          </div>`;
        })()
      : "";
    document.getElementById("asmaCatAddBtn")?.addEventListener("click", () => asmaAddItemAction(col.id));

    const wheelItems = entries.map((it) => ({
      key: it.key,
      statusId: it.statusId,
      number: num(it.entry.number),
      title: escapeHtml(asmaEntryDisplayName(it.entry)),
    }));
    asmaCatWheelContainerEl.innerHTML = renderScopedWheel(wheelItems, {
      centerLabel: escapeHtml(langText(col.title, getAppLang())),
      centerSub: escapeHtml(t("{count} Names", { count: num(entries.length) })),
    });
    attachScopedWheelClickHandler(asmaCatWheelContainerEl, (key) => goToNameFromCategory(key));
    asmaCatLegendContainerEl.innerHTML = renderWheelLegend(labelsById);
    asmaCatHintEl.textContent = t("Tap a segment or a row to open that Name — the wheel closes and lands you on its own detail screen.");
  }

  async function asmaRenameCollectionPrompt(id) {
    const col = asmaCollections.find((c) => c.id === id);
    if (!col) return;
    const current = langText(col.title, getAppLang());
    const typed = prompt(t("Rename group:"), current);
    if (!typed || !typed.trim() || typed.trim() === current) return;
    const prev = asmaCollections;
    asmaCollections = renameCollection(asmaCollections, id, setLangText(col.title, getAppLang(), typed.trim()));
    renderAsmaCatLevelBar();
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; renderAsmaCatLevelBar(); renderAsmaCatPanel(); }
  }

  async function asmaToggleArchiveCollection(id) {
    const col = asmaCollections.find((c) => c.id === id);
    if (!col) return;
    const name = langText(col.title, getAppLang());
    const willArchive = col.status !== "archived";
    if (!confirm(willArchive ? t('Archive "{name}"?', { name }) : t('Restore "{name}"?', { name }))) return;
    const prev = asmaCollections;
    const prevCurrentId = asmaCatCurrentId;
    asmaCollections = setCollectionStatus(asmaCollections, id, willArchive ? "archived" : "active");
    if (willArchive && !asmaCatShowArchived && asmaCatCurrentId === id) asmaCatCurrentId = asmaCatDefaultCollectionId();
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; asmaCatCurrentId = prevCurrentId; renderAsmaCatPanel(); }
  }

  async function asmaAddCollectionPrompt() {
    const typed = prompt(t("New group name:"));
    if (!typed || !typed.trim()) return;
    const prev = asmaCollections;
    const prevCurrentId = asmaCatCurrentId;
    // A plain single-key object, not setLangText(null, ...) -- that would
    // leave the OTHER language as a stored empty string rather than simply
    // absent, and langText() treats an empty string as "nothing to fall
    // back from" (I11) instead of trying the other language's own text.
    asmaCollections = addCollection(asmaCollections, { title: { [getAppLang()]: typed.trim() }, badge: "", status: "active" });
    asmaCatCurrentId = asmaCollections[asmaCollections.length - 1].id;
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; asmaCatCurrentId = prevCurrentId; renderAsmaCatPanel(); }
  }

  async function asmaRemoveItemAction(collectionId, unitKey) {
    const prev = asmaCollections;
    asmaCollections = asmaRemoveItemLocal(asmaCollections, collectionId, unitKey);
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; renderAsmaCatPanel(); }
  }

  async function asmaMoveItemAction(fromId, toId, unitKey) {
    const prev = asmaCollections;
    asmaCollections = asmaMoveItemLocal(asmaCollections, fromId, toId, unitKey);
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; renderAsmaCatPanel(); }
  }

  async function asmaAddItemAction(collectionId) {
    const sel = document.getElementById("asmaCatAddSelect");
    if (!sel || !sel.value) return;
    const prev = asmaCollections;
    asmaCollections = asmaAddItemLocal(asmaCollections, collectionId, sel.value);
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaCollections = prev; renderAsmaCatPanel(); }
  }

  /** Edits the Bangla wording of ONE Name/phrase -- a canonical Name
      (1..99, asma-data.js is fixed platform content) gets a per-tenant
      OVERRIDE; an extra (>= 100, the owner's own content) has its own `bn`
      field edited directly. Either way this never touches the permanent
      number (I5) -- only what displays for it. */
  async function asmaEditBnPrompt(unitKey) {
    const number = Number(unitKey.split(":")[1]);
    const entry = resolveNumber(number);
    if (!entry) return;
    const current = entry.isExtra ? entry.meaning.bn : (entry.bnOverride ?? langText(entry.meaning, "bn"));
    const typed = prompt(t("New Bangla wording:"), current);
    if (typed === null || typed.trim() === current.trim()) return;
    if (entry.isExtra) {
      const prev = asmaExtraNames;
      asmaExtraNames = updateExtraName(asmaExtraNames, number, { bn: typed.trim() });
      renderAsmaCatPanel();
      if (!(await asmaPersist())) { asmaExtraNames = prev; renderAsmaCatPanel(); }
    } else {
      const prev = asmaOverrides;
      asmaOverrides = setNameOverrideBn(asmaOverrides, number, typed);
      renderAsmaCatPanel();
      if (!(await asmaPersist())) { asmaOverrides = prev; renderAsmaCatPanel(); }
    }
  }

  /** I4: archive/restore only, for an extra Name's own record -- its id
      (>= 100) never changes, whatever collections still list it. */
  async function asmaArchiveExtraAction(unitKey) {
    const number = Number(unitKey.split(":")[1]);
    const extra = (asmaExtraNames ?? []).find((e) => e.number === number);
    if (!extra) return;
    const willArchive = extra.status !== "archived";
    const name = getAppLang() === "bn" ? (extra.bnName || extra.transliteration) : extra.transliteration;
    if (!confirm(willArchive ? t('Archive "{name}"?', { name }) : t('Restore "{name}"?', { name }))) return;
    const prev = asmaExtraNames;
    asmaExtraNames = setExtraNameStatus(asmaExtraNames, number, willArchive ? "archived" : "active");
    renderAsmaCatPanel();
    if (!(await asmaPersist())) { asmaExtraNames = prev; renderAsmaCatPanel(); }
  }

  /** Opening a Name from the category browser closes the panel and lands
      on the same real detail screen a grid tap already opens -- one
      mechanism, not two. */
  async function goToNameFromCategory(unitKey) {
    closeCategoryBrowser();
    const number = Number(unitKey.split(":")[1]);
    await openNameDetail(number);
  }

  async function openCategoryBrowser() {
    asmaCatPanel.hidden = false;
    gridContainer.hidden = true;
    detailContainer.hidden = true;
    asmaCatToggleBtn.textContent = t("All 99 Names");
    asmaCatWaysListContainer.innerHTML = t("Loading…");
    await ensureAsmaCollectionsLoaded();
    if (!asmaCatCurrentId || !asmaCollections.some((c) => c.id === asmaCatCurrentId)) {
      asmaCatCurrentId = asmaCatDefaultCollectionId();
    }
    renderAsmaCatPanel();
  }

  function closeCategoryBrowser() {
    asmaCatPanel.hidden = true;
    gridContainer.hidden = false;
    detailContainer.hidden = false;
    asmaCatToggleBtn.textContent = t("Browse by Category");
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
    // copy of this comment. Bookmark-issues round: myPersonId is a fallback
    // below stored, above the first roster row.
    const storedPersonId = getSelectedPersonId();
    selectedPersonId = visibleRoster.some((p) => p.id === storedPersonId) ? storedPersonId
      : (visibleRoster.some((p) => p.id === myPersonId) ? myPersonId : (visibleRoster[0]?.id ?? null));
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
    // Asma Collections round: an extra Name's own bookmark (number >= 100)
    // resumes here too now -- openNameDetail() itself resolves both ranges
    // and is a no-op if the number turns out not to exist.
    if (Number.isInteger(number) && number >= 1) await openNameDetail(number);
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
      // Asma Collections round: resolveNumber() covers extras (>= 100) too,
      // but only once asmaCollections has actually been loaded -- this runs
      // during ordinary page load, before that lazy read necessarily has.
      // Falling back to the canonical-only lookup keeps today's behaviour
      // for every number <= 99 regardless; an extra Name's own strip entry
      // just shows its bare number until something else in the session has
      // triggered the load (opening it once is enough for the rest of the
      // visit).
      // resolveNumber() covers extras too, but only once loaded (see
      // ensureAsmaCollectionsLoaded's own header); asmaEntryDisplayName()
      // handles either shape the same way, since a plain ASMA_NAMES
      // fallback object's `isExtra` is simply undefined (falsy).
      const name = number ? (asmaExtraNames ? resolveNumber(number) : ASMA_NAMES.find((n) => n.number === number)) : null;
      return { ...e, subjectLabel: name ? `${asmaEntryDisplayName(name)} (${num(number)})` : null };
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

  /** Asma Collections round: resolves through BOTH the fixed 99 (asma-data.js)
      AND any extra Name (>= 100) / Bangla override the tenant has saved --
      one code path for a Name opened from the grid, from the category
      browser, or from ?resume=/a bookmark. Costs one lazy Firestore read
      the FIRST time ANY Name is opened this session (I9, disclosed): the
      owner's own ask to make a canonical Name's Bangla wording editable
      applies wherever a Name is viewed, not only inside the category
      browser, so the override has to be resolvable from here too. */
  async function openNameDetail(number) {
    await ensureAsmaCollectionsLoaded();
    const name = resolveNumber(number);
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

  /** Patches the star's own DOM directly -- see topic-study.js's own
      toggleTopicBookmark() for why this doesn't re-open the whole detail
      view. Safe to call whatever the write outcome was: it only ever
      re-derives from bookmarksDoc's own current state. */
  function refreshAsmaBookmarkBtn(position) {
    const btn = document.getElementById("bookmarkAsmaBtn");
    if (!btn) return;
    const isBookmarked = !!findSavedBookmark(bookmarksDoc, { moduleId: MODULE_ID, subjectId: SUBJECT_ID, position });
    btn.textContent = isBookmarked ? "★" : "☆";
    btn.classList.toggle("active", isBookmarked);
    btn.title = isBookmarked ? t("Remove bookmark") : t("Bookmark this");
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
      refreshAsmaBookmarkBtn(position);
      return;
    }
    const defaultName = asmaName(name.number, name.transliteration);
    const choice = await openBookmarkNamePopover({
      defaultName,
      folders: flattenFolderTree(bookmarksDoc),
      // Fixes round 2 -- tag this bookmark with a person. Defaults to
      // whoever is selected right now (studying WITH a child is the
      // common case, per D10), and "No one in particular" clears it.
      people: roster.map((p) => ({ id: p.id, name: langText(p.name, getAppLang(), p.id) })),
      defaultPersonTagId: selectedPersonId,
      // Multi-student round -- "Assign to", the same roster/scoping rule
      // the Track card's own Claim dropdown already uses.
      roster: assignableRoster(),
      selectedPersonId,
    });
    if (!choice) return;
    // Save the SAME bookmark into every ticked assignee's own document --
    // see quranrevival.html's own toggleAyahBookmark() for the full
    // reasoning (an existing named folder id and a shared personTagId only
    // transfer for a single assignee; safe in parallel since each write
    // lands on a different bookmarks document).
    const assigneeIds = choice.assigneeIds?.length ? choice.assigneeIds : [selectedPersonId];
    const multi = assigneeIds.length > 1;
    await Promise.all(assigneeIds.map(async (pid) => {
      let folderId = multi ? null : choice.folderId;
      if (choice.newFolderName) {
        const folderOutcome = await safeWrite(
          () => createFolder(db, { tenantId: activeTenantId, personId: pid, name: choice.newFolderName, personTagId: multi ? null : choice.personTagId, uid: auth.currentUser.uid }),
          { collection: TENANT.BOOKMARKS, action: "createFolder" }
        );
        if (!folderOutcome.ok) return;
        folderId = folderOutcome.result.id;
        if (pid === selectedPersonId) bookmarksDoc = { ...bookmarksDoc, folders: [...(bookmarksDoc.folders ?? []), folderOutcome.result] };
      }
      const outcome = await safeWrite(
        () => saveBookmark(db, {
          tenantId: activeTenantId, personId: pid, moduleId: MODULE_ID, subjectId: SUBJECT_ID,
          name: choice.name || defaultName, position, folderId, personTagId: multi ? null : choice.personTagId, uid: auth.currentUser.uid,
        }),
        { collection: TENANT.BOOKMARKS, action: "saveBookmark" }
      );
      if (outcome.ok && pid === selectedPersonId) {
        bookmarksDoc = { ...bookmarksDoc, saved: [...(bookmarksDoc.saved ?? []), outcome.result] };
      }
    }));
    refreshAsmaBookmarkBtn(position);
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
    wayModalMount.innerHTML = renderWayModalShell(title, tabBodies, ["Track", "Guide", "Breakdown"], renderAssignDropdown(assignableRoster(), selectedPersonId));
    wayModalOverlay.classList.add("open");
    attachWayModalHandlers(wayModalMount.firstElementChild, {
      onClose: () => wayModalOverlay.classList.remove("open"),
    });

    const claimBtn = wayModalMount.querySelector(".way-claim-btn");
    const statusSelectEl = wayModalMount.querySelector(".way-status-select");
    const resultEl = wayModalMount.querySelector(".way-claim-result");
    wireAssignDropdown(wayModalMount, claimBtn);
    claimBtn.addEventListener("click", async () => {
      claimBtn.disabled = true;
      const assignees = checkedAssignees(wayModalMount, selectedPersonId);
      const outcomes = await Promise.all(assignees.map(async (a) => {
        const r = await safeWrite(
          () => claimStatus(db, {
            tenantId: activeTenantId,
            personId: a.id,
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
        if (r.ok) {
          await logActivity(db, {
            tenantId: activeTenantId, personId: a.id, date: new Date(),
            weekStartsOn: 6, subjectId: SUBJECT_ID, unitKey,
            trackableId: TRACKABLE_ID, action: "claimed", uid: auth.currentUser.uid,
            viaProgramId: programBySubjectId.get(SUBJECT_ID) ?? null,
          });
        }
        return { name: a.name, ok: r.ok, needsConfirmation: r.ok ? r.result.needsConfirmation : null, message: r.ok ? null : r.entry.message };
      }));
      const message = buildClaimResultMessage(outcomes);
      if (outcomes.some((o) => o.ok)) {
        await refreshChunk();
        renderGrid();
        await openNameDetail(name.number);
        openWayModal(name);
        const freshResultEl = wayModalMount.querySelector(".way-claim-result");
        if (freshResultEl) freshResultEl.textContent = message;
      } else {
        resultEl.textContent = message;
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
    // behind the page rather than in front of it. The category browser (if
    // open) is closed rather than left showing the PREVIOUS tenant's own
    // groups until ensureAsmaCollectionsLoaded() re-fires on its own tenant
    // check -- ensureAsmaCollectionsLoaded() is already tenant-aware, so
    // nothing further is needed there.
    if (!asmaCatPanel.hidden) closeCategoryBrowser();
    asmaCatCurrentId = null;
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
    if (!asmaCatPanel.hidden) renderAsmaCatPanel();
  });

  // Asma Collections round -- the "Browse by Category" toggle and the
  // level bar's own controls are static markup, wired ONCE here (the same
  // lesson QCR's own round 2 already learned).
  asmaCatToggleBtn.addEventListener("click", () => {
    if (asmaCatPanel.hidden) openCategoryBrowser();
    else closeCategoryBrowser();
  });
  asmaCatBackBtn.addEventListener("click", () => closeCategoryBrowser());
  asmaCatLevelSelect.addEventListener("change", () => {
    asmaCatCurrentId = asmaCatLevelSelect.value || null;
    renderAsmaCatPanel();
  });
  asmaCatManageToggleBtn.addEventListener("click", () => {
    asmaCatManageOn = !asmaCatManageOn;
    renderAsmaCatPanel();
  });
  asmaCatShowArchivedToggle.addEventListener("change", () => {
    asmaCatShowArchived = asmaCatShowArchivedToggle.checked;
    renderAsmaCatLevelBar();
    renderAsmaCatPanel();
  });
  asmaCatRenameBtn.addEventListener("click", () => { if (asmaCatCurrentId) asmaRenameCollectionPrompt(asmaCatCurrentId); });
  asmaCatArchiveBtn.addEventListener("click", () => { if (asmaCatCurrentId) asmaToggleArchiveCollection(asmaCatCurrentId); });
  asmaCatAddGroupBtn.addEventListener("click", () => asmaAddCollectionPrompt());
}
