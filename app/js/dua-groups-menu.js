// PCF MSA J104 (the Owner, 14 Nov 2026, in answer to the v1.11 demo): the madrasah's groups ("Admin's groups"), a person's own ("My groups")
// and the editing of a Dua's title and groups work INSIDE the Dua groups menu and the card's Keep tab, not in a separate pop-up.
// Loaded only on demand (I9): the first time the Dua groups menu opens, the first time a Dua card's Menu is pressed, or when the address
// names a group. It reads one document for each of the two group trees (by id) and the madrasah's Dua edits (one equality list read),
// then adds each group to the page's own group list (`data.groups`) so a group opens exactly like a built-in one.
// "Delete" on a Dua means: take it out of the list it is attached to. The Dua itself, its marks and notes are never removed.
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { el } from "./hadith-shared-ui.js";
import { mountGroupTree } from "./dua-group-ui.js";
import { addGroup, find, MAX_DUAS_PER_GROUP } from "./dua-group-tree.js";
import {
  ADMIN_GROUP_KEY, loadDuaGroups, saveDuaGroups, loadDuaEdits, saveDuaEdit, dropStalePlacements, hisnPlanKey, quranPlanKey, newDuaKey,
} from "./dua-saving-data.js";

/** A custom group's id has the permanent shape g-xxxxxxxx; the built-in groups never do. */
export const isCustomId = (s) => typeof s === "string" && /^g-[a-z0-9]{8}$/.test(s);
const nodeName = (n, lang) => (lang === "bn" && n.name.bn) || n.name.en;
const flat = (nodes, out = [], level = 1) => { for (const n of nodes) { out.push({ n, level }); flat(n.kids, out, level + 1); } return out; };

/**
 * opts: { getSession?, loadEnv? } (tests may supply them). Returns the controller the Dua page uses.
 * `names` is filled by apply(): group id -> { en, bn } so the page can print a custom group's name.
 */
export function createCustomGroups(opts = {}) {
  const S = { loaded: false, loading: null, session: null, db: null, ctx: null, admin: [], mine: [], edits: new Map(), failed: false };
  const names = new Map();
  const env = opts.loadEnv ?? (async () => {
    const [{ db }, check] = await Promise.all([import("./firebase-init.js"), import("./dua-check-data.js")]);
    return { db, getSession: check.getDuaCheckSession };
  });
  const canAdmin = () => !!S.session?.canCheck;
  const canMine = () => !!S.session?.personId;

  /** Loads the session, both trees and the edits once. `wait`: sign-in finishes after the page paints, so wait for it (up to 6 s). */
  function ensure({ wait = false } = {}) {
    if (S.loaded) return Promise.resolve(S);
    if (S.loading) return S.loading;
    S.loading = (async () => {
      const e = await env();
      S.db = e.db;
      for (let i = 0; i < (wait ? 30 : 1) && !e.getSession(); i++) await new Promise((r) => setTimeout(r, 200));
      S.session = e.getSession();
      if (S.session) {
        S.ctx = { tenantId: S.session.tenantId, personId: S.session.personId ?? "none", uid: S.session.uid };
        const [a, m, ed] = await Promise.all([
          loadDuaGroups(S.db, S.ctx, ADMIN_GROUP_KEY),
          S.session.personId ? loadDuaGroups(S.db, S.ctx, S.session.personId) : { nodes: [] },
          loadDuaEdits(S.db, S.ctx),
        ]);
        S.admin = a.nodes; S.mine = m.nodes;
        S.edits = new Map(ed.map((x) => [x.duaKey, x]));
      }
      S.loaded = true;
      return S;
    })().catch((err) => { S.loading = null; S.failed = true; throw err; });
    return S.loading;
  }

  // key -> list entry, for the entries the page already knows (a Dua by number; a Hisn dhikr; a Qur'anic dua)
  const entryKey = (e) => (e.kind === "added" ? e.key : e.kind === "dua" ? String(e.n) : e.kind === "hisn" ? hisnPlanKey(e.h) : e.kind === "quran" ? quranPlanKey(e.ref) : null);
  function indexEntries(data) {
    const map = new Map();
    for (const id of ["rasul", "occasions", "books", "prophets", "sahaba", "salaf", "ulama"]) {
      const g = data.groups.get(id);
      if (!g) continue;
      for (const e of g.parts ? g.parts.flatMap((p) => p.items) : g.items) { const k = entryKey(e); if (k && !map.has(k)) map.set(k, e); }
    }
    return map;
  }
  const placementOrder = (ed, id) => ed.placements.find((p) => p.group === id)?.order ?? 0;

  /** Adds every custom group to data.groups (as a plain list of entries), and overlays the madrasah's titles. Safe to call again. */
  function apply(data) {
    for (const id of [...data.groups.keys()]) if (isCustomId(id)) data.groups.delete(id);
    names.clear();
    const byKey = indexEntries(data);
    // A Dua the madrasah added carries its own text (`added`); it is a list entry of its own kind.
    for (const [key, ed] of S.edits) if (key.startsWith("new-") && ed.added) byKey.set(key, { kind: "added", key, added: ed.added, title: ed.title });
    const visible = (ed) => ed && !ed.hidden;
    for (const [key, ed] of S.edits) {
      if (!ed.title || (!ed.title.en && !ed.title.bn)) continue;
      if (/^[0-9]{1,6}$/.test(key)) data.titles = { ...data.titles, [key]: ed.title };
      else { const e = byKey.get(key); if (e) e.title = ed.title; }
    }
    for (const { n } of flat(S.admin)) {
      const rows = [...S.edits.values()].filter((ed) => visible(ed) && ed.placements.some((p) => p.group === n.id))
        .sort((a, b) => placementOrder(a, n.id) - placementOrder(b, n.id));
      const items = rows.map((ed) => byKey.get(ed.duaKey)).filter(Boolean);
      data.groups.set(n.id, { id: n.id, custom: "admin", items });
      names.set(n.id, n.name);
    }
    for (const { n } of flat(S.mine)) {
      const items = (n.duas ?? []).filter((k) => !S.edits.get(k)?.hidden).map((k) => byKey.get(k)).filter(Boolean);
      data.groups.set(n.id, { id: n.id, custom: "mine", items });
      names.set(n.id, n.name);
    }
  }

  async function saveTree(which, nodes) {
    const r = await saveDuaGroups(S.db, S.ctx, { ownerKey: which === "admin" ? ADMIN_GROUP_KEY : S.session.personId, nodes });
    if (r.ok) S[which] = r.nodes;
    return r;
  }

  /**
   * The two group trees inside the Dua groups menu: drag, one ⋯ menu per group, Add a group. `onOpen(node)` opens a group's list;
   * `onChange()` tells the page the groups changed (it refreshes its list and name).
   */
  function mountMenuTrees(host, { onOpen, onChange, lang = getAppLang() } = {}) {
    host.textContent = "";
    if (!S.session) { host.appendChild(el("p", "hadith-note", t("Sign in to use Admin's and my groups."))); return; }
    const status = el("p", "hadith-note dua-pull-status"); status.setAttribute("role", "status");
    const section = (which, title, canEdit) => {
      const wrap = el("div", "dua-pull-section");
      wrap.dataset.duaPullSection = which;
      wrap.appendChild(el("h3", "dua-pull-h", title));
      const tree = el("div", "dua-pull-tree");
      const mounted = mountGroupTree(tree, {
        tree: S[which], canEdit, lang, onOpen,
        onChange: async (next) => {
          const before = S[which];
          S[which] = next;
          const r = await saveTree(which, next);
          status.textContent = r.ok ? t("Saved.") : t("Could not save. Nothing was changed.");
          if (!r.ok) { S[which] = before; mounted.render(before); }
          onChange?.();
        },
      });
      wrap.appendChild(tree);
      if (!S[which].length) tree.appendChild(el("p", "hadith-note", canEdit ? t("No groups yet. Add one with the ＋ button.") : t("No groups yet.")));
      if (canEdit) {
        const add = el("button", "dua-ref dua-pull-add", `＋ ${t("Add a group")}`);
        add.type = "button";
        add.addEventListener("click", () => {
          const name = window.prompt(t("Group name"), "");
          if (!name) return;
          const r = addGroup(S[which], null, { en: name });
          if (!r.ok) { status.textContent = t("That move is not possible here."); return; }
          S[which] = r.tree;
          mounted.render(r.tree);
          tree.querySelector(".hadith-note")?.remove();
          saveTree(which, r.tree).then((x) => { status.textContent = x.ok ? t("Saved.") : t("Could not save. Nothing was changed."); onChange?.(); });
        });
        wrap.appendChild(add);
      }
      return wrap;
    };
    host.append(section("admin", t("Admin's groups"), canAdmin()), section("mine", t("My groups"), canMine()), status);
  }

  /**
   * "Add a new Dua" (admin): a form for a Dua of the madrasah's own text, put into the group `groupId`. Saved as one new note
   * (a permanent key new-xxxxxxxxxx) carrying the text; no number of the Hadith books is used or invented.
   */
  function newDuaForm(host, { groupId, onSaved } = {}) {
    host.textContent = "";
    if (!canAdmin()) return;
    const open = el("button", "dua-ref dua-add-open", `＋ ${t("Add a new Dua")}`);
    open.type = "button"; open.dataset.duaAddOpen = "";
    const form = el("form", "dua-add-form"); form.hidden = true; form.dataset.duaAddForm = "";
    const field = (key, label, area, dir) => {
      const lab = el("label", "dua-add-label", label);
      const inp = el(area ? "textarea" : "input"); if (!area) inp.type = "text";
      inp.dataset.duaAdd = key; inp.maxLength = area ? 4000 : 300;
      if (dir) { inp.dir = dir; inp.lang = "ar"; }
      lab.appendChild(inp);
      form.appendChild(lab);
      return inp;
    };
    const fAr = field("ar", t("Arabic text"), true, "rtl");
    const fEn = field("en", t("English meaning (optional)"), true);
    const fBn = field("bn", t("Bangla meaning (optional)"), true);
    const tEn = field("titleEn", t("Title (English)"), false);
    const tBn = field("titleBn", t("Title (Bangla)"), false);
    const status = el("p", "hadith-note"); status.setAttribute("role", "status");
    const row = el("div", "dua-keep-row");
    const save = el("button", "dua-ref dua-menu-btn", t("Save new Dua")); save.type = "submit";
    const cancel = el("button", "dua-ref dua-menu-btn", t("Cancel")); cancel.type = "button";
    row.append(save, cancel);
    form.append(row, status);
    open.addEventListener("click", () => { form.hidden = !form.hidden; });
    cancel.addEventListener("click", () => { form.hidden = true; });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const ar = fAr.value.trim();
      if (!ar) { status.textContent = t("Please write the Arabic text first."); return; }
      const added = { ar };
      if (fEn.value.trim()) added.en = fEn.value.trim();
      if (fBn.value.trim()) added.bn = fBn.value.trim();
      const key = newDuaKey();
      const order = [...S.edits.values()].reduce((m, ed) => Math.max(m, ed.placements.find((p) => p.group === groupId)?.order ?? 0), 0) + 1;
      const r = await saveDuaEdit(S.db, S.ctx, { duaKey: key, title: { en: tEn.value.trim(), bn: tBn.value.trim() }, placements: groupId ? [{ group: groupId, order }] : [], added });
      if (!r.ok) { status.textContent = t("Could not save. Nothing was changed."); return; }
      S.edits.set(key, r.edit);
      status.textContent = t("Saved.");
      form.reset(); form.hidden = true;
      onSaved?.(key);
    });
    host.append(open, form);
  }

  /**
   * The Keep tab's block for ONE Dua (`key` is its number as text): which groups it is in, "Remove from this list", and, for the admin,
   * its title. Delete means take it out of a list; nothing is removed from the database.
   * opts: { current (the group id the reader is in, or null), onRemoved(), onSaved(), lang }
   */
  function keepEditor(host, key, { current = null, onRemoved, onSaved, lang = getAppLang() } = {}) {
    host.textContent = "";
    if (!S.session) return;
    const ed = () => S.edits.get(key);
    const box = el("div", "dua-keep-edit");
    box.dataset.duaKeepEdit = key;
    box.appendChild(el("p", "dua-menu-label", t("Groups")));
    const status = el("p", "hadith-note"); status.setAttribute("role", "status");
    const inList = (which, n) => (which === "admin" ? !!ed()?.placements.some((p) => p.group === n.id) && !ed()?.hidden : (n.duas ?? []).includes(key));
    const ticks = { admin: new Set(), mine: new Set() };
    const list = (which, title, canEdit) => {
      const nodes = flat(S[which]);
      if (!canEdit || !nodes.length) return null;
      const fs = el("fieldset", "dua-keep-groups");
      fs.dataset.duaKeepGroups = which;
      fs.appendChild(el("legend", null, title));
      for (const { n, level } of nodes) {
        const lab = el("label", "dua-keep-tick");
        lab.style.marginInlineStart = `${(level - 1) * 1.1}rem`;
        const c = el("input"); c.type = "checkbox"; c.dataset.duaGroupId = n.id; c.checked = inList(which, n);
        if (c.checked) ticks[which].add(n.id);
        c.addEventListener("change", () => { if (c.checked) ticks[which].add(n.id); else ticks[which].delete(n.id); });
        lab.append(c, document.createTextNode(` ${nodeName(n, lang)}`));
        fs.appendChild(lab);
      }
      return fs;
    };
    const aList = list("admin", t("Admin's groups"), canAdmin());
    const mList = list("mine", t("My groups"), canMine());
    if (aList) box.appendChild(aList);
    if (mList) box.appendChild(mList);
    if (!aList && !mList) box.appendChild(el("p", "hadith-note", t("No groups yet. Make one in the Dua groups menu.")));

    async function saveGroups() {
      let ok = true;
      if (aList) {
        const cur = ed();
        const keep = dropStalePlacements(cur?.placements ?? [], S.admin).filter((p) => !isCustomId(p.group));
        const order = (cur?.placements ?? []).reduce((m, p) => Math.max(m, p.order ?? 0), 0);
        const add = [...ticks.admin].map((id, i) => ({ group: id, order: placementOrder(cur ?? { placements: [] }, id) || order + i + 1 }));
        const r = await saveDuaEdit(S.db, S.ctx, { duaKey: key, placements: [...keep, ...add] });
        if (r.ok) S.edits.set(key, r.edit); else ok = false;
      }
      if (mList) {
        const next = JSON.parse(JSON.stringify(S.mine));
        for (const { n } of flat(next)) {
          const has = (n.duas ?? []).includes(key);
          if (ticks.mine.has(n.id) && !has) {
            if ((n.duas ?? []).length >= MAX_DUAS_PER_GROUP) { status.textContent = t("This group is full."); return; }
            n.duas = [...(n.duas ?? []), key];
          } else if (!ticks.mine.has(n.id) && has) n.duas = n.duas.filter((k) => k !== key);
        }
        const r = await saveTree("mine", next);
        if (!r.ok) ok = false;
      }
      status.textContent = ok ? t("Saved.") : t("Could not save. Nothing was changed.");
      if (ok) onSaved?.();
    }
    const row = el("div", "dua-keep-row");
    if (aList || mList) {
      const save = el("button", "dua-ref dua-menu-btn", t("Save groups")); save.type = "button"; save.dataset.duaKeepSave = "groups";
      save.addEventListener("click", saveGroups);
      row.appendChild(save);
    }
    if (isCustomId(current)) {
      const which = S.admin.length && find(S.admin, current) ? "admin" : "mine";
      const rm = el("button", "dua-ref dua-menu-btn", t("Remove from this list")); rm.type = "button"; rm.dataset.duaKeepRemove = "";
      rm.addEventListener("click", async () => {
        ticks[which].delete(current);
        await saveGroups();
        onRemoved?.();
      });
      row.appendChild(rm);
    }
    box.append(row, status);

    if (canAdmin()) {
      box.appendChild(el("p", "dua-menu-label", t("Title")));
      const en = el("input"); en.type = "text"; en.maxLength = 300; en.value = ed()?.title?.en ?? ""; en.dataset.duaTitle = "en";
      en.setAttribute("aria-label", t("Title (English)")); en.placeholder = t("Title (English)");
      const bn = el("input"); bn.type = "text"; bn.maxLength = 300; bn.value = ed()?.title?.bn ?? ""; bn.dataset.duaTitle = "bn";
      bn.setAttribute("aria-label", t("Title (Bangla)")); bn.placeholder = t("Title (Bangla)");
      const ts = el("button", "dua-ref dua-menu-btn", t("Save title")); ts.type = "button"; ts.dataset.duaKeepSave = "title";
      const tstat = el("p", "hadith-note"); tstat.setAttribute("role", "status");
      ts.addEventListener("click", async () => {
        const r = await saveDuaEdit(S.db, S.ctx, { duaKey: key, title: { en: en.value.trim(), bn: bn.value.trim() } });
        if (r.ok) S.edits.set(key, r.edit);
        tstat.textContent = r.ok ? t("Saved.") : t("Could not save. Nothing was changed.");
        if (r.ok) onSaved?.();
      });
      box.append(en, bn, ts, tstat);
    }
    host.appendChild(box);
  }

  return { ensure, apply, mountMenuTrees, keepEditor, newDuaForm, names, state: S, canAdmin, canMine };
}
