// PCF MSA J104 item 25 (the Owner, 13 Nov 2026), step 6b: the Dua groups SCREEN. One pop-up with two switches, "Admin's groups"
// (the madrasah's own, read by every member, changed only by owner/prime) and "My groups" (the person's own). It is loaded ONLY when the
// button is pressed (I9: nothing joins the startup path), reads one document per switch the first time it is shown (I14-style: by id,
// never a list), and saves through saveDuaGroups. Deleting a group is real: the group is gone for good; the duas and marks stay.
import { t } from "./i18n.js";
import { el } from "./hadith-shared-ui.js";
import { mountGroupTree, openGroupWindow } from "./dua-group-ui.js";
import { ADMIN_GROUP_KEY, loadDuaGroups, saveDuaGroups, loadDuaEdits, isDuaKey } from "./dua-saving-data.js";
import { find, addGroup, MAX_DUAS_PER_GROUP } from "./dua-group-tree.js";

const nodeName = (n, lang) => (lang === "bn" && n.name.bn) || n.name.en;
const duaHref = (key) => `./dua-study.html?back=1&view=dua&dua=${encodeURIComponent(key)}`;

/**
 * opts: { db, getSession() -> { uid, tenantId, personId, canCheck } | null, lang }.
 * Returns { close } or null when nobody is signed in (the reader is told so, in words).
 */
export function openDuaGroups(opts) {
  const session = opts.getSession();
  const lang = opts.lang || "en";
  const body = el("div", "dua-gp");
  if (!session) {
    body.appendChild(el("p", "hadith-note", t("Sign in to use Dua groups.")));
    return openGroupWindow({ title: t("Dua groups"), body });
  }
  const ctx = { tenantId: session.tenantId, personId: session.personId ?? "none", uid: session.uid };
  const state = { which: ADMIN_GROUP_KEY, trees: {}, edits: null };
  const bar = el("div", "dua-gp-switch");
  bar.setAttribute("role", "tablist");
  const status = el("p", "hadith-note dua-gp-status");
  status.setAttribute("role", "status");
  const treeHost = el("div", "dua-gp-tree");
  const addBtn = el("button", "dua-ref dua-gp-add", `＋ ${t("Add a group")}`);
  addBtn.type = "button"; addBtn.hidden = true;
  addBtn.addEventListener("click", () => {
    const name = window.prompt(t("Group name"), "");
    if (!name) return;
    const r = addGroup(state.trees[state.which].nodes, null, { en: name });
    if (!r.ok) { status.textContent = t("That move is not possible here."); return; }
    tree.render(r.tree);
    save(state.which, r.tree);
  });
  body.append(bar, status, treeHost, addBtn);
  let tree = null;
  const win = openGroupWindow({ title: t("Dua groups"), body, onClose: () => tree?.destroy() });

  const ownerKeyOf = (which) => (which === ADMIN_GROUP_KEY ? ADMIN_GROUP_KEY : session.personId);
  const canEdit = (which) => (which === ADMIN_GROUP_KEY ? !!session.canCheck : !!session.personId);

  function drawSwitch() {
    bar.textContent = "";
    for (const [which, label] of [[ADMIN_GROUP_KEY, t("Admin's groups")], ["mine", t("My groups")]]) {
      const b = el("button", "dua-gp-tab", label);
      b.type = "button"; b.setAttribute("role", "tab"); b.dataset.gpTab = which;
      b.setAttribute("aria-selected", String(state.which === which));
      b.addEventListener("click", () => { if (state.which !== which) show(which); });
      bar.appendChild(b);
    }
  }

  async function show(which) {
    state.which = which;
    drawSwitch();
    tree?.destroy(); tree = null;
    treeHost.textContent = "";
    addBtn.hidden = true;
    status.textContent = t("Loading…");
    const ownerKey = ownerKeyOf(which);
    if (!ownerKey) { status.textContent = t("Choose a person to have My groups."); return; }
    try {
      if (!state.trees[which]) state.trees[which] = await loadDuaGroups(opts.db, ctx, ownerKey);
    } catch (err) {
      status.textContent = "";
      const retry = el("button", "dua-ref", t("Try again")); retry.type = "button";
      retry.addEventListener("click", () => show(which));
      treeHost.append(el("p", "hadith-note", `${t("Could not load the groups.")} ${err?.message ?? ""}`.trim()), retry);
      return;
    }
    if (state.which !== which) return;
    const loaded = state.trees[which];
    status.textContent = loaded.invalid ? t("The saved groups could not be read; saving now starts a clean list.") : "";
    if (!loaded.nodes.length) status.textContent = (status.textContent + " " + (canEdit(which) ? t("No groups yet. Add one with the ＋ button.") : t("No groups yet."))).trim();
    tree = mountGroupTree(treeHost, {
      tree: loaded.nodes, canEdit: canEdit(which), lang,
      onChange: (next) => save(which, next),
      onOpen: (node) => openOne(which, node),
    });
    addBtn.hidden = !canEdit(which);
  }

  async function save(which, next) {
    const before = state.trees[which];
    state.trees[which] = { exists: before.exists, nodes: next };
    const r = await saveDuaGroups(opts.db, ctx, { ownerKey: ownerKeyOf(which), nodes: next });
    status.textContent = r.ok ? t("Saved.") : t("Could not save. Nothing was changed.");
    if (!r.ok) { state.trees[which] = before; tree?.render(before.nodes); }
  }

  async function openOne(which, node) {
    const inner = el("div", "dua-gp-one");
    inner.appendChild(el("p", "hadith-note", t("Loading…")));
    const sub = openGroupWindow({ title: nodeName(node, lang), body: inner });
    const fill = (keys, editable) => {
      inner.textContent = "";
      if (!keys.length) inner.appendChild(el("p", "hadith-note", t("No duas in this group yet.")));
      const ul = el("ul", "dua-gp-list");
      for (const k of keys) {
        const li = el("li");
        const a = el("a", "dua-ref", /^\d+$/.test(k) ? `${t("Dua")} ${k}` : k); a.href = duaHref(k);
        li.appendChild(a);
        if (editable) {
          const rm = el("button", "dua-ref", t("Remove")); rm.type = "button";
          rm.setAttribute("aria-label", `${t("Remove")} ${k}`);
          rm.addEventListener("click", () => change(keys.filter((x) => x !== k)));
          li.appendChild(rm);
        }
        ul.appendChild(li);
      }
      inner.appendChild(ul);
      if (editable) {
        const f = el("form", "dua-gp-addform"); const i = el("input"); i.type = "text"; i.inputMode = "numeric";
        i.setAttribute("aria-label", t("Dua number to add")); i.placeholder = t("Dua number to add");
        const b = el("button", "dua-ref", t("Add")); b.type = "submit";
        f.append(i, b);
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const k = i.value.trim();
          if (!isDuaKey(k)) { status.textContent = t("That is not a Dua number."); return; }
          if (keys.includes(k)) return;
          if (keys.length >= MAX_DUAS_PER_GROUP) { status.textContent = t("This group is full."); return; }
          change([...keys, k]);
        });
        inner.appendChild(f);
      }
    };
    async function change(keys) {
      const cur = find(state.trees[which].nodes, node.id)?.node;
      if (!cur) return;
      const nextTree = JSON.parse(JSON.stringify(state.trees[which].nodes));
      find(nextTree, node.id).node.duas = keys;
      tree?.render(nextTree); // the drawn tree must carry the new list too, or the next rename / move would save the old one
      await save(which, nextTree);
      fill(keys, true);
    }
    if (which === "mine") {
      fill(find(state.trees.mine.nodes, node.id)?.node?.duas ?? [], canEdit("mine"));
    } else {
      try {
        state.edits ??= await loadDuaEdits(opts.db, ctx);
        const keys = state.edits.filter((e) => (e.placements || []).some((p) => p.group === node.id)).map((e) => e.duaKey);
        fill(keys, false);
      } catch { inner.textContent = ""; inner.appendChild(el("p", "hadith-note", t("Could not load the groups."))); }
    }
    return sub;
  }

  show(state.which);
  return win;
}
