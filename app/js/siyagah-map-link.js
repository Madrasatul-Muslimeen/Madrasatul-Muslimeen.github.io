// PCF MSA J112 -- THE MAP'S HOOK FOR SIYAGAH'S MAPPING MY JOURNEY
//
// journey-map.html calls mountSiyagahMapLink() once MSA's own sign-in has loaded the page. With the switch off
// (siyagah-cloud-readiness.js) it returns at once: no element is added, nothing is loaded, and the Map is exactly as
// before.
//
// With the switch on it adds ONE bar above the folders: "Siyagah's Mapping My Journey", whether this device is signed
// in to Siyagah, and a Connect / Disconnect button. Firebase's code for Siyagah loads here, when the Map opens -- never
// at the app's startup (I9). A failed sign-in or a failed read is said in the bar, never only in the console (I15).
//
// R1 (4 Nov 2026): once connected, the SAME bar (no new bar) shows the owner's Siyagah folder tree and its notes,
// READ-ONLY, from siyagah-mmj-data.js (loaded only now, by dynamic import). A note opens inside the bar, its content
// sanitised by note-sanitize.js, with "Back to Siyagah folders" returning to the tree exactly as it was, the folders
// still open and the note's own row in view (the way-back law). Pictures are fetched and sha256-checked; until then,
// or when one fails, a plain "Picture" box stands in. `vis` (👁) is shown as a hint only, never used to decide access.
import { isSiyagahCloudReady, SIYAGAH_CLOUD_DECLARATION } from "./siyagah-cloud-readiness.js";
import { t, num } from "./i18n.js";

export const SIYAGAH_BAR_ID = "siyagahCloudBar";
const STYLE_ID = "siyagahCloudBarStyle";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// The bar keeps its own light palette on every page look (day or night), so every colour inside it is set here,
// against the bar's own #f5f8fc -- never inherited from the page's buttons.
const BAR_CSS = `
#siyagahCloudBar { display:block; margin:0 0 10px; padding:8px 10px; border:1px solid #c9d3e0; border-radius:8px; background:#f5f8fc; color:#1d2b3a; min-width:0; max-width:100%; box-sizing:border-box; }
#siyagahCloudBar [data-siyagah-head] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-width:0; }
#siyagahCloudBar button { font:inherit; color:#1d2b3a; background:#ffffff; border:1px solid #8a9bb0; border-radius:6px; cursor:pointer; }
#siyagahCloudBar button:focus-visible { outline:3px solid #1f5fa8; outline-offset:1px; }
#siyagahCloudBar [data-siyagah-mmj] { margin-top:8px; min-width:0; }
#siyagahCloudBar [data-mmj-status] { margin:0 0 6px; font-size:0.9em; color:#33475c; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-status][data-kind="denied"], #siyagahCloudBar [data-mmj-status][data-kind="error"] { color:#8a1c12; font-weight:600; }
#siyagahCloudBar [data-mmj-sec] { margin:4px 0; font-size:1em; font-weight:700; overflow-wrap:anywhere; }
#siyagahCloudBar ul { list-style:none; margin:0; padding:0; min-width:0; }
#siyagahCloudBar ul ul { padding-inline-start:14px; border-inline-start:2px solid #d7e0ea; margin-inline-start:8px; }
#siyagahCloudBar li { margin:2px 0; min-width:0; }
#siyagahCloudBar [data-mmj-folder], #siyagahCloudBar [data-mmj-note] { display:flex; align-items:center; gap:6px; width:100%; min-height:40px; padding:4px 8px; text-align:start; overflow-wrap:anywhere; box-sizing:border-box; }
#siyagahCloudBar [data-mmj-folder] { font-weight:600; background:#eef3f9; border-color:#c9d3e0; }
#siyagahCloudBar [data-mmj-note] { background:#ffffff; border-color:#d7e0ea; }
#siyagahCloudBar [data-mmj-name] { flex:1 1 auto; min-width:0; }
#siyagahCloudBar [data-mmj-count], #siyagahCloudBar [data-mmj-vis] { flex:0 0 auto; font-weight:400; color:#4a5d72; font-size:0.85em; }
#siyagahCloudBar [data-mmj-noteview] { min-width:0; }
#siyagahCloudBar [data-mmj-back] { min-height:40px; padding:0 12px; max-width:100%; }
#siyagahCloudBar [data-mmj-title] { margin:8px 0 2px; font-size:1.15em; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-meta] { margin:0 0 8px; font-size:0.85em; color:#4a5d72; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-body] { background:#ffffff; color:#1d2b3a; border:1px solid #d7e0ea; border-radius:6px; padding:8px 10px; overflow-x:auto; overflow-wrap:anywhere; min-width:0; }
#siyagahCloudBar [data-mmj-body] img { max-width:100%; height:auto; }
#siyagahCloudBar [data-mmj-body] a { color:#1f4f8a; }
#siyagahCloudBar [data-mmj-pic] { display:inline-block; min-width:6em; max-width:100%; padding:10px 12px; margin:4px 0; border:1px dashed #8a9bb0; border-radius:6px; color:#33475c; background:#f5f8fc; box-sizing:border-box; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = BAR_CSS;
  document.head.appendChild(st);
}

const PIC_TOKEN = /PIC(\d+)/;
const PIC_TOKENS = /PIC(\d+)/g;

/**
 * A note's saved HTML, ready for the bar: Siyagah's <img data-pic> (no src) would be dropped by the sanitiser, so each
 * is swapped for a private token first (inside an inert <template>: nothing loads, nothing runs), the rest goes through
 * note-sanitize.js, and the tokens become picture boxes made with DOM calls, never with HTML.
 */
function noteBodyInto(el, html, sanitize, reader) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html || "");
  const pics = [];
  for (const img of tpl.content.querySelectorAll("img[data-pic]")) {
    const sha = String(img.getAttribute("data-pic") || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha)) { img.remove(); continue; }
    pics.push({ sha, mime: String(img.getAttribute("data-mime") || ""), alt: String(img.getAttribute("alt") || "") });
    img.replaceWith(document.createTextNode(`PIC${pics.length - 1}`));
  }
  el.innerHTML = sanitize(tpl.innerHTML);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (PIC_TOKEN.test(n.nodeValue)) hits.push(n);
  for (const node of hits) {
    const frag = document.createDocumentFragment();
    let last = 0;
    const text = node.nodeValue;
    for (const m of text.matchAll(PIC_TOKENS)) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const pic = pics[Number(m[1])];
      if (pic) {
        const box = document.createElement("span");
        box.setAttribute("data-mmj-pic", pic.sha);
        box.setAttribute("role", "img");
        box.setAttribute("aria-label", pic.alt || t("Picture"));
        box.textContent = t("Picture…");
        frag.appendChild(box);
        reader.picture(pic.sha, pic.mime).then((blob) => {
          if (!box.isConnected) return;
          const img = document.createElement("img");
          img.alt = pic.alt;
          img.src = URL.createObjectURL(blob);
          img.setAttribute("data-mmj-pic-ok", pic.sha);
          box.replaceWith(img);
        }, (err) => {
          console.error(err);
          box.textContent = t("Picture (could not be shown: {reason})", { reason: err?.message || String(err) });
          box.setAttribute("data-mmj-pic-failed", "1");
        });
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
}

/** A time as "2026-11-02 09:00" on this device's clock, in the reader's digits (never an English month name in Bangla). */
function when(ms) {
  if (!Number.isFinite(ms) || !ms) return "";
  const d = new Date(ms), p = (n) => String(n).padStart(2, "0");
  return num(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`);
}

/** The tree and its notes inside `host`; returns { update(copy), state(s) }. */
function mountMmjView(host, reader, model, sanitize) {
  const open = new Set(); // folders the reader opened, kept across every re-render
  let copy = reader.copy, st = { kind: "loading" }, noteId = null, returnTo = null;
  host.innerHTML = `<p data-mmj-status role="status"></p><div data-mmj-treewrap></div><div data-mmj-noteview style="display:none"></div>`;
  const statusEl = host.querySelector("[data-mmj-status]");
  const treeEl = host.querySelector("[data-mmj-treewrap]");
  const noteEl = host.querySelector("[data-mmj-noteview]");

  function status() {
    const v = model.folderView(copy);
    const held = copy.tree || v.noteCount;
    let text;
    if (st.kind === "denied") text = t("Ask the owner to allow this app.") + (held ? " " + t("Showing the copy on this device.") : "");
    else if (st.kind === "error") text = t("Siyagah's folders could not be read: {reason}", { reason: st.error?.message || String(st.error || "") }) + (held ? " " + t("Showing the copy on this device.") : "");
    else if (st.kind === "loading" && !held) text = t("Reading your Siyagah folders…");
    else if (!held) text = t("No Mapping My Journey folders in Siyagah yet.");
    else text = t("{folders} folders, {notes} notes. Read-only: change them in Siyagah.", { folders: num(v.folderCount), notes: num(v.noteCount) })
      + (st.kind === "live" ? "" : " " + t("Showing the copy on this device."));
    statusEl.textContent = text;
    statusEl.setAttribute("data-kind", st.kind);
  }

  function noteRow(n) {
    const title = n.title.trim() || t("(untitled note)");
    return `<li><button type="button" data-mmj-note="${escapeHtml(n.id)}"><span data-mmj-name dir="auto">${escapeHtml(title)}</span>`
      + (n.vis === 1 ? `<span data-mmj-vis title="${escapeHtml(t("Visitors may see this in Siyagah"))}">👁</span>` : "") + `</button></li>`;
  }
  function countAll(node) { return node.notes.length + node.children.reduce((s, c) => s + countAll(c), 0); }
  function folderRow(node) {
    const f = node.folder, isOpen = open.has(f.id);
    const name = f.n.trim() || t("(untitled folder)");
    let out = `<li><button type="button" data-mmj-folder="${escapeHtml(f.id)}" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? "▾" : "▸"}</span>`
      + `<span data-mmj-name dir="auto">${escapeHtml(name)}</span>`
      + (f.vis === 1 ? `<span data-mmj-vis title="${escapeHtml(t("Visitors may see this in Siyagah"))}">👁</span>` : "")
      + `<span data-mmj-count>${escapeHtml(num(countAll(node)))}</span></button>`;
    if (isOpen) {
      const inner = node.children.map(folderRow).join("") + node.notes.map(noteRow).join("");
      out += `<ul>${inner || `<li data-mmj-empty>${escapeHtml(t("This folder is empty."))}</li>`}</ul>`;
    }
    return out + `</li>`;
  }

  function renderTree() {
    const v = model.folderView(copy);
    let rows = "";
    if (copy.tree) rows += `<h3 data-mmj-sec dir="auto">${escapeHtml(copy.tree.sec?.n || "Mapping My Journey")}</h3>`;
    if (v.roots.length || v.loose.length) {
      rows += `<ul data-mmj-tree>${v.roots.map(folderRow).join("")}`;
      if (v.loose.length) {
        const isOpen = open.has("~loose");
        rows += `<li><button type="button" data-mmj-folder="~loose" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? "▾" : "▸"}</span><span data-mmj-name>${escapeHtml(t("Not in a folder"))}</span><span data-mmj-count>${escapeHtml(num(v.loose.length))}</span></button>`
          + (isOpen ? `<ul>${v.loose.map(noteRow).join("")}</ul>` : "") + `</li>`;
      }
      rows += `</ul>`;
    }
    treeEl.innerHTML = rows;
  }

  function renderNote() {
    const n = copy.notes[noteId];
    const back = `<button type="button" data-mmj-back>${escapeHtml(t("← Back to Siyagah folders"))}</button>`;
    if (!n) {
      noteEl.innerHTML = back + `<p data-mmj-meta>${escapeHtml(t("This note is no longer in Mapping My Journey."))}</p>`;
      return;
    }
    const title = n.title.trim() || t("(untitled note)");
    const meta = [n.updatedAt ? t("Changed {when}", { when: when(Date.parse(n.updatedAt)) }) : "", t("Read-only: change it in Siyagah.")].filter(Boolean).join(" · ");
    noteEl.innerHTML = back + `<h3 data-mmj-title dir="auto">${escapeHtml(title)}</h3><p data-mmj-meta>${escapeHtml(meta)}</p><div data-mmj-body dir="auto"></div>`;
    const body = noteEl.querySelector("[data-mmj-body]");
    try { noteBodyInto(body, n.content, sanitize, reader); }
    catch (err) { console.error(err); body.textContent = t("This note could not be shown: {reason}", { reason: err?.message || String(err) }); }
  }

  let shownNote = null; // the note doc last drawn, so a copy update that does not touch it leaves its pictures alone
  function render() {
    status();
    if (noteId) {
      treeEl.style.display = "none"; noteEl.style.display = "block";
      const n = copy.notes[noteId] || null;
      if (n !== shownNote || !noteEl.firstChild) { shownNote = n; renderNote(); }
    } else { shownNote = null; noteEl.style.display = "none"; noteEl.innerHTML = ""; treeEl.style.display = "block"; renderTree(); }
  }

  host.addEventListener("click", (e) => {
    const f = e.target.closest("[data-mmj-folder]");
    if (f) { const id = f.getAttribute("data-mmj-folder"); open.has(id) ? open.delete(id) : open.add(id); render(); host.querySelector(`[data-mmj-folder="${CSS.escape(id)}"]`)?.focus(); return; }
    const nt = e.target.closest("[data-mmj-note]");
    if (nt) {
      returnTo = { id: nt.getAttribute("data-mmj-note"), y: window.scrollY };
      noteId = returnTo.id;
      render();
      noteEl.querySelector("[data-mmj-back]")?.focus({ preventScroll: true });
      host.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.target.closest("[data-mmj-back]")) {
      noteId = null;
      render();
      // The way back: the tree as it was (the same folders open), the note's own row in view and focused.
      const row = returnTo && host.querySelector(`[data-mmj-note="${CSS.escape(returnTo.id)}"]`);
      if (returnTo) window.scrollTo(0, returnTo.y);
      if (row) { row.scrollIntoView({ block: "nearest" }); row.focus({ preventScroll: true }); }
    }
  });

  render();
  return {
    update(next) { copy = next; render(); },
    state(s) { st = s; status(); },
  };
}

/**
 * Mount the bar before `beforeEl` (the Map's #noteLayout). Returns the bar, or null when the switch is off.
 * `email` is the reader's MSA sign-in, offered to Google as the account to use. `after` (a promise): load nothing of
 * Siyagah's until it settles -- the Map passes its own folders' load, so the Map is usable first.
 */
export async function mountSiyagahMapLink({ beforeEl, email = "", declaration = SIYAGAH_CLOUD_DECLARATION, after = null } = {}) {
  if (!isSiyagahCloudReady(declaration)) return null;
  if (!beforeEl || !beforeEl.parentNode) return null;
  ensureStyle();
  let bar = document.getElementById(SIYAGAH_BAR_ID);
  if (!bar) {
    bar = document.createElement("section");
    bar.id = SIYAGAH_BAR_ID;
    bar.className = "siyagah-cloud-bar";
    bar.innerHTML = `<div data-siyagah-head aria-live="polite"></div><div data-siyagah-mmj id="siyagahMmjBody" hidden></div>`;
    beforeEl.parentNode.insertBefore(bar, beforeEl);
  }
  const head = bar.querySelector("[data-siyagah-head]");
  const body = bar.querySelector("[data-siyagah-mmj]");
  // The folders sit behind ONE toggle, shut by default and remembered on this device, so the Map's own Back, views and
  // folders stay in the first screenful (journey-map-back.mjs measures that) however big the owner's Siyagah tree is.
  // A refusal or a failed read opens it, so the message is never hidden (I15).
  const OPEN_KEY = "msa-siyagah-mmj-open";
  let isOpen = false;
  try { isOpen = localStorage.getItem(OPEN_KEY) === "1"; } catch { isOpen = false; }
  const say = (statusHtml, button, toggle = false) => {
    head.innerHTML = `<strong style="flex:0 1 auto; min-width:0; overflow-wrap:anywhere;">${escapeHtml(t("Siyagah's Mapping My Journey"))}</strong>`
      + (statusHtml ? `<span data-siyagah-status style="flex:1 1 12em; min-width:0; overflow-wrap:anywhere;">${statusHtml}</span>` : `<span style="flex:1 1 0; min-width:0;"></span>`)
      + (toggle ? `<button type="button" data-siyagah-toggle aria-controls="siyagahMmjBody" aria-expanded="${isOpen}" style="flex:0 0 auto; max-width:100%; min-height:40px; padding:0 12px;"><span aria-hidden="true">${isOpen ? "▾" : "▸"}</span> ${escapeHtml(t("Siyagah folders"))}</button>` : "")
      + (button ? `<button type="button" data-siyagah-action="${button.action}" style="flex:0 0 auto; max-width:100%; min-height:40px; padding:0 14px;">${escapeHtml(button.label)}</button>` : "");
  };
  function setOpen(open, remember = true) {
    isOpen = open;
    if (remember) { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }
    if (readerFor) body.hidden = !open;
    const tg = head.querySelector("[data-siyagah-toggle]");
    if (tg) { tg.setAttribute("aria-expanded", String(open)); tg.firstElementChild.textContent = open ? "▾" : "▸"; }
  }
  head.addEventListener("click", (e) => { if (e.target.closest("[data-siyagah-toggle]")) setOpen(!isOpen); });
  say(escapeHtml(t("Opening…")), null);
  // `after`: the Map's own folders first. Siyagah's code is fetched only once they have loaded (or failed to).
  if (after && typeof after.then === "function") { try { await after; } catch { /* the Map says its own failure */ } }

  let cloud, mod;
  try {
    mod = await import("./siyagah-cloud.js");
    cloud = await mod.openSiyagahCloud({ declaration });
  } catch (err) {
    console.error(err);
    say(escapeHtml(t("Siyagah could not be reached: {reason}", { reason: err?.message || String(err) })), { action: "retry", label: t("Try again") });
    head.querySelector("[data-siyagah-action]").addEventListener("click", () => location.reload());
    return bar;
  }

  let reader = null, readerFor = null;
  function stopReading() {
    try { reader?.close(); } catch {}
    reader = null; readerFor = null;
    body.innerHTML = ""; body.hidden = true;
  }
  async function startReading(user) {
    const nb = declaration.notebookId;
    if (!nb || readerFor === user.uid) return;
    stopReading();
    readerFor = user.uid;
    body.hidden = !isOpen;
    body.innerHTML = `<p data-siyagah-who style="margin:0 0 6px; overflow-wrap:anywhere;">${escapeHtml(t("Connected as {email}.", { email: user.email || "" }))}</p>`
      + `<div data-siyagah-view><p data-mmj-status role="status">${escapeHtml(t("Reading your Siyagah folders…"))}</p></div>`;
    const viewHost = body.querySelector("[data-siyagah-view]");
    try {
      const [data, model, san] = await Promise.all([import("./siyagah-mmj-data.js"), import("./siyagah-mmj-model.js"), import("./note-sanitize.js")]);
      let view = null;
      const pending = { state: null };
      const r = await data.openMmjReader({
        cloud, nb, uid: user.uid,
        onCopy: (c) => { if (view) view.update(c); },
        onState: (s) => {
          if (s.kind === "denied" || s.kind === "error") setOpen(true, false); // never a hidden refusal (I15)
          if (view) view.state(s); else pending.state = s;
        },
      });
      if (readerFor !== user.uid) { r.close(); return; }
      reader = r;
      view = mountMmjView(viewHost, r, model, san.sanitizeNoteHtml);
      if (pending.state) view.state(pending.state);
    } catch (err) {
      console.error(err);
      viewHost.innerHTML = `<p data-mmj-status role="status" data-kind="error">${escapeHtml(t("Siyagah's folders could not be read: {reason}", { reason: err?.message || String(err) }))}</p>`;
      setOpen(true, false);
    }
  }

  mod.onSiyagahUser(cloud, (user) => {
    if (user) {
      say("", { action: "out", label: t("Disconnect") }, true);
      head.querySelector("[data-siyagah-action]").addEventListener("click", () => mod.siyagahSignOut(cloud).catch((err) => {
        console.error(err);
        say(escapeHtml(t("Could not disconnect: {reason}", { reason: err?.message || String(err) })), null);
      }));
      startReading(user);
    } else {
      stopReading();
      offerConnect(escapeHtml(t("Not connected on this device.")));
    }
  });
  function offerConnect(statusHtml) {
    say(statusHtml, { action: "in", label: t("Connect") });
    head.querySelector("[data-siyagah-action]").addEventListener("click", () => mod.siyagahSignIn(cloud, { email }).catch((err) => {
      console.error(err);
      offerConnect(escapeHtml(t("Could not connect: {reason}", { reason: err?.message || String(err) })));
    }));
  }
  return bar;
}
