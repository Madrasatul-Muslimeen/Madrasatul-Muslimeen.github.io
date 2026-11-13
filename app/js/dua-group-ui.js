// PCF MSA J104 item 25 (the Owner, 13 Nov 2026, demo v1.10): the Dua groups SCREEN pieces. Two things, no saving, no Firebase:
//   mountGroupTree(host, opts)   a tree of groups the person DRAGS to any level (mouse or finger, at most 3 levels), one ⋯ menu per
//                                group (Open, Rename, Add a group inside, Delete), a read-only look for groups the person may not
//                                change. Every change goes through dua-group-tree.js (the pure rules) and is handed to opts.onChange(tree).
//   openGroupWindow(opts)        a group's pop-up: full screen on a tablet or phone, and on a computer (a wide screen with a mouse) a
//                                window that is dragged by its title and resized from all four sides and four corners.
// Not wired to any page yet: the writer (for the groups collection; the Owner publishes its Rules first) and the screens that use these come next.
import { t } from "./i18n.js";
import { trapModal } from "./modal-focus.js";
import { MAX_DEPTH, addGroup, renameGroup, moveGroup, moveToTop, removeGroup, find, height } from "./dua-group-tree.js";

const nameOf = (n, lang) => (lang === "bn" && n.name.bn) || n.name.en;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** The tree. opts: { tree, canEdit, lang, onChange(tree), onOpen(node), onCopy(node) (read-only groups only), ask(kind, text, preset) }.
 *  `ask` is how a name or a yes/no is asked (the page supplies its own dialog); it defaults to window.prompt / confirm. Returns { render(tree) }. */
export function mountGroupTree(host, opts) {
  let tree = opts.tree || [];
  const lang = opts.lang || "en";
  const ask = opts.ask || ((kind, text, preset) => (kind === "confirm" ? (window.confirm(text) ? true : null) : window.prompt(text, preset || "")));
  const change = (r) => { if (r.ok) { tree = r.tree; draw(); opts.onChange?.(tree, r); } return r; };
  let drag = null;
  const closeMenus = () => host.querySelectorAll(".dua-gt-menu").forEach((m) => { m.hidden = true; });
  function draw() {
    host.textContent = "";
    host.classList.add("dua-gt");
    host.classList.toggle("dua-gt-ro", !opts.canEdit);
    const walk = (list, into, level) => list.forEach((n) => {
      const wrap = el("div", "dua-gt-item");
      const row = el("div", "dua-gt-row");
      row.dataset.groupId = n.id;
      const grip = el("span", "dua-gt-grip", "⠿");
      grip.setAttribute("aria-label", `${t("Drag")} ${nameOf(n, lang)}`);
      const label = el("button", "dua-gt-name");
      label.type = "button";
      label.append(nameOf(n, lang), el("span", "dua-gt-level", ` ${t("level")} ${level}`));
      label.addEventListener("click", () => opts.onOpen?.(n));
      const more = el("button", "dua-gt-more", "⋯");
      more.type = "button"; more.setAttribute("aria-label", `${t("Menu for")} ${nameOf(n, lang)}`);
      const menu = el("div", "dua-gt-menu"); menu.hidden = true;
      const item = (text, fn, danger) => { const b = el("button", danger ? "dua-gt-danger" : "", text); b.type = "button"; b.addEventListener("click", () => { menu.hidden = true; fn(); }); menu.appendChild(b); };
      item(t("Open"), () => opts.onOpen?.(n));
      if (opts.canEdit) {
        item(t("Rename"), async () => { const v = await ask("name", t("Rename group"), n.name.en); if (v && String(v).trim()) change(renameGroup(tree, n.id, { en: String(v).trim(), bn: n.name.bn })); });
        if (level < MAX_DEPTH) item(t("Add a group inside"), async () => { const v = await ask("name", t("Group name"), ""); if (v && String(v).trim()) change(addGroup(tree, n.id, { en: String(v).trim() })); });
        // ONE whole sentence per case, with {name} inside it, so a language may put the words where it wants them (Bangla order is not English's).
        const sentence = n.kids.length
          ? t("Delete “{name}” and the groups inside it? Deleting a group removes it for good, with no bring-back; the duas themselves and everyone's marks are never removed.", { name: nameOf(n, lang) })
          : t("Delete “{name}”? Deleting a group removes it for good, with no bring-back; the duas themselves and everyone's marks are never removed.", { name: nameOf(n, lang) });
        item(t("Move…"), () => openMove(row, n));
        item(t("Delete"), async () => { const ok = await ask("confirm", sentence); if (ok) change(removeGroup(tree, n.id)); }, true);
      } else if (opts.onCopy) item(t("Copy to My groups"), () => opts.onCopy(n));
      more.addEventListener("click", (e) => { e.stopPropagation(); const was = menu.hidden; closeMenus(); menu.hidden = !was; });
      row.append(grip, label, more, menu);
      wrap.appendChild(row);
      if (n.kids.length) { const k = el("div", "dua-gt-kids"); wrap.appendChild(k); walk(n.kids, k, level + 1); }
      into.appendChild(wrap);
    });
    walk(tree, host, 1);
  }
  // The keyboard / screen-reader way to move a group (dragging needs a pointer): "Move…" opens a small panel under the row with a place
  // (a group, or the top level) and a position (before / inside / after). Only places the same rules would accept are offered.
  function openMove(row, n) {
    host.querySelectorAll(".dua-gt-move").forEach((m) => m.remove());
    const panel = el("div", "dua-gt-move"); panel.setAttribute("role", "group"); panel.setAttribute("aria-label", `${t("Move")} ${nameOf(n, lang)}`);
    const where = el("select"); where.setAttribute("aria-label", t("Move next to"));
    const how = el("select"); how.setAttribute("aria-label", t("Position"));
    const flat = []; (function w(list) { list.forEach((g) => { flat.push(g); w(g.kids); }); })(tree);
    const positions = [["before", t("Before it")], ["inside", t("Inside it")], ["after", t("After it")]];
    for (const g of flat) { if (g.id === n.id) continue; if (positions.some(([z]) => moveGroup(tree, n.id, g.id, z).ok)) where.appendChild(new Option(nameOf(g, lang), g.id)); }
    const top = new Option(t("The top level (last)"), "__top"); if (find(tree, n.id).level !== 1 || find(tree, n.id).index !== tree.length - 1) where.appendChild(top);
    const fill = () => { how.textContent = ""; if (where.value === "__top") { how.disabled = true; return; } how.disabled = false; for (const [z, label] of positions) if (moveGroup(tree, n.id, where.value, z).ok) how.appendChild(new Option(label, z)); };
    where.addEventListener("change", fill); fill();
    const go = el("button", "dua-gt-move-go", t("Move")); go.type = "button";
    const cancel = el("button", "", t("Cancel")); cancel.type = "button";
    const say = el("p", "dua-gt-move-say"); say.setAttribute("role", "status");
    go.addEventListener("click", () => {
      const r = where.value === "__top" ? moveToTop(tree, n.id) : moveGroup(tree, n.id, where.value, how.value);
      if (r.ok) change(r); else say.textContent = t("That move is not possible here.");
    });
    cancel.addEventListener("click", () => { panel.remove(); row.querySelector(".dua-gt-more")?.focus(); });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel.click(); } });
    panel.append(where, how, go, cancel, say);
    row.after(panel);
    where.focus();
  }
  const clearMarks = () => host.querySelectorAll(".dua-gt-row").forEach((r) => r.classList.remove("before", "after", "inside", "dragging"));
  function zone(e) {
    clearMarks(); drag.target = null; drag.zone = null;
    drag.ghost.hidden = true; const hit = document.elementFromPoint(e.clientX, e.clientY); drag.ghost.hidden = false;
    const row = hit?.closest?.(".dua-gt-row");
    if (!row || !host.contains(row)) return;
    const id = row.dataset.groupId, src = find(tree, drag.id), dst = find(tree, id);
    if (!src || !dst || id === drag.id) return;
    const b = row.getBoundingClientRect(), f = (e.clientY - b.top) / b.height;
    let z = f < 0.28 ? "before" : f > 0.72 ? "after" : "inside";
    const trial = moveGroup(tree, drag.id, id, z);
    if (!trial.ok && z === "inside") { z = f < 0.5 ? "before" : "after"; if (!moveGroup(tree, drag.id, id, z).ok) return; }
    else if (!trial.ok) return;
    drag.target = id; drag.zone = z; row.classList.add(z);
  }
  host.addEventListener("pointerdown", (e) => {
    const g = e.target.closest?.(".dua-gt-grip");
    if (!g || !opts.canEdit) return;
    e.preventDefault();
    const row = g.closest(".dua-gt-row"), ghost = el("div", "dua-gt-ghost", row.querySelector(".dua-gt-name").firstChild.textContent);
    document.body.appendChild(ghost);
    g.setPointerCapture?.(e.pointerId);
    drag = { id: row.dataset.groupId, ghost, target: null, zone: null };
    row.classList.add("dragging");
    host.dispatchEvent(new PointerEvent("pointermove", { clientX: e.clientX, clientY: e.clientY, bubbles: true }));
  });
  host.addEventListener("pointermove", (e) => { if (!drag) return; drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; zone(e); });
  const end = (cancel) => { if (!drag) return; const d = drag; drag = null; d.ghost.remove(); clearMarks(); if (!cancel && d.target) change(moveGroup(tree, d.id, d.target, d.zone)); };
  host.addEventListener("pointerup", () => end(false));
  host.addEventListener("pointercancel", () => end(true));
  document.addEventListener("click", closeMenus);
  draw();
  // The click listener is on the document, so it is taken off again with destroy() (a page that mounts the tree twice leaks none).
  return { render(next) { tree = next; draw(); }, tree: () => tree, destroy() { document.removeEventListener("click", closeMenus); end(true); host.textContent = ""; } };
}

const MIN_W = 280, MIN_H = 200;
/** A group's pop-up. opts: { title, body (Node), onClose }. Returns { close, isWindow(), box() }. */
export function openGroupWindow(opts) {
  const mq = matchMedia("(min-width:1000px) and (pointer:fine)");
  const box = { x: 60, y: 110, w: 460, h: 340 };
  const win = el("div", "dua-gw"); win.setAttribute("role", "dialog"); win.setAttribute("aria-modal", "true"); win.setAttribute("aria-label", opts.title);
  const release = (() => { let r = null; return { set(f) { r = f; }, run() { r?.(); r = null; } }; })();
  const head = el("header", "dua-gw-head"); const title = el("b", "", opts.title);
  const x = el("button", "dua-gw-close", "✕"); x.type = "button"; x.setAttribute("aria-label", t("Close"));
  head.append(title, x);
  const body = el("div", "dua-gw-body"); body.appendChild(opts.body);
  win.append(head, body);
  const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => { const h = el("i", `dua-gw-h dua-gw-h-${d}`); h.dataset.dir = d; win.appendChild(h); return h; });
  const place = () => {
    const w = mq.matches; win.classList.toggle("dua-gw-full", !w);
    if (w) { win.style.left = `${box.x}px`; win.style.top = `${box.y}px`; win.style.width = `${box.w}px`; win.style.height = `${box.h}px`; }
    else { win.style.left = win.style.top = win.style.width = win.style.height = ""; }
  };
  const dragWith = (h, fn) => h.addEventListener("pointerdown", (e) => {
    if (e.target.closest?.("button") || win.classList.contains("dua-gw-full")) return;
    e.preventDefault(); e.stopPropagation(); h.setPointerCapture?.(e.pointerId);
    const sx = e.clientX, sy = e.clientY, b = { ...box };
    const mv = (ev) => { fn(b, ev.clientX - sx, ev.clientY - sy); place(); };
    const up = () => { h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); };
    h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up);
  });
  dragWith(head, (b, dx, dy) => { box.x = Math.max(0, Math.min(innerWidth - 120, b.x + dx)); box.y = Math.max(0, Math.min(innerHeight - 60, b.y + dy)); });
  for (const h of handles) dragWith(h, (b, dx, dy) => {
    const d = h.dataset.dir; let { x: nx, y: ny, w, h: hh } = b;
    if (d.includes("e")) w = Math.max(MIN_W, Math.min(innerWidth - b.x, b.w + dx));
    if (d.includes("s")) hh = Math.max(MIN_H, Math.min(innerHeight - b.y, b.h + dy));
    if (d.includes("w")) { const nw = Math.max(MIN_W, b.w - dx); nx = Math.max(0, b.x + (b.w - nw)); w = b.x + b.w - nx; }
    if (d.includes("n")) { const nh = Math.max(MIN_H, b.h - dy); ny = Math.max(0, b.y + (b.h - nh)); hh = b.y + b.h - ny; }
    box.x = nx; box.y = ny; box.w = w; box.h = hh;
  });
  const onResize = () => place();
  const close = () => { release.run(); removeEventListener("resize", onResize); mq.removeEventListener?.("change", onResize); document.removeEventListener("keydown", onKey); win.remove(); opts.onClose?.(); };
  const onKey = (e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } };
  x.addEventListener("click", close);
  addEventListener("resize", onResize); mq.addEventListener?.("change", onResize); document.addEventListener("keydown", onKey);
  document.body.appendChild(win); place();
  release.set(trapModal(win)); // Tab stays inside; focus goes back to what opened the window when it closes
  x.focus({ preventScroll: true });
  return { close, isWindow: () => mq.matches, box: () => ({ ...box }), el: win };
}
