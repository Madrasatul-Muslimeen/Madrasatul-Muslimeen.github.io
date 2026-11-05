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
//
// R2a (5 Nov 2026, Siyagah v05.68's "Writing (R2)"): the folders can be changed from here -- BY REQUEST. Each folder's
// ⋯ menu (the Map's own bar-palette pattern) asks Siyagah to add a subfolder, rename, move, delete (to Siyagah's Trash,
// with its notes, undoable there) or switch 👁; "New folder" adds one at the top. The request is one new document in
// notebooks/{nb}/mmjin/, written by siyagah-mmj-write.js (loaded by dynamic import on the first request, never before).
// R2b (5 Nov 2026): the NOTES too, the same way -- "New note" in a folder's ⋯ menu; Edit, Move to…, 👁 and Delete in
// each note row's own ⋯ menu and beside an opened note. The machinery (ask / settle) is R2a's, shared.
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
#siyagahCloudBar [data-siyagah-toggle] { display:inline-flex; align-items:center; gap:8px; }
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
#siyagahCloudBar [data-mmj-row] { display:flex; align-items:center; gap:6px; min-width:0; position:relative; }
#siyagahCloudBar [data-mmj-row] > [data-mmj-folder] { flex:1 1 auto; width:auto; min-width:0; }
#siyagahCloudBar [data-mmj-row][data-mmj-pending] > [data-mmj-folder] { border-style:dashed; border-color:#1f5fa8; font-style:italic; }
#siyagahCloudBar [data-mmj-row][data-mmj-pending="folder.delete"] [data-mmj-name] { text-decoration:line-through; }
#siyagahCloudBar .folder-menu-wrap { position:static; flex:0 0 auto; } /* the menu hangs from the ROW, so it is never wider than the row (inside the bar at any width) */
#siyagahCloudBar .folder-menu-btn { width:40px; height:40px; min-height:40px; padding:0; font-size:1.15rem; line-height:1; }
#siyagahCloudBar .bar-palette { display:none; position:absolute; top:calc(100% + 2px); inset-inline-end:0; inset-inline-start:auto; z-index:20; flex-direction:column; gap:4px; width:14rem; max-width:100%; box-sizing:border-box; padding:6px; background:#ffffff; color:#1d2b3a; border:1px solid #8a9bb0; border-radius:8px; box-shadow:0 10px 26px rgba(20,30,60,0.25); }
#siyagahCloudBar .bar-palette.open { display:flex; }
#siyagahCloudBar .bar-palette button { width:100%; }
#siyagahCloudBar .bar-palette button { min-height:40px; padding:4px 10px; font-size:0.95em; text-align:start; display:flex; align-items:center; gap:6px; overflow-wrap:anywhere; }
#siyagahCloudBar .bar-palette button:disabled { color:#5d6b7a; background:#eef1f5; cursor:default; }
#siyagahCloudBar [data-mmj-danger] { color:#8a1c12; border-color:#c98a82; }
#siyagahCloudBar [data-mmj-tools] { display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 6px; }
#siyagahCloudBar [data-mmj-tools] button, #siyagahCloudBar [data-mmj-formbtns] button, #siyagahCloudBar [data-mmj-msg] button { min-height:40px; padding:0 12px; max-width:100%; }
#siyagahCloudBar [data-mmj-wait] { margin:2px 0 4px; padding-inline-start:8px; font-size:0.85em; color:#1f4f8a; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-msg] { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:4px 0; padding:6px 8px; border:1px solid #c98a82; border-radius:6px; background:#fff4f2; color:#8a1c12; font-size:0.9em; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-msg] > span { flex:1 1 12em; min-width:0; }
#siyagahCloudBar [data-mmj-form] { display:flex; flex-wrap:wrap; align-items:flex-end; gap:6px; margin:4px 0 6px; padding:8px; border:1px solid #c9d3e0; border-radius:6px; background:#ffffff; min-width:0; }
#siyagahCloudBar [data-mmj-form] label { display:flex; flex-direction:column; gap:4px; flex:1 1 14em; min-width:0; font-size:0.9em; color:#33475c; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-form] input, #siyagahCloudBar [data-mmj-form] select { font:inherit; min-height:40px; min-width:0; max-width:100%; width:100%; box-sizing:border-box; color:#1d2b3a; background:#ffffff; border:1px solid #8a9bb0; border-radius:6px; padding:4px 8px; }
#siyagahCloudBar [data-mmj-confirm] { margin:0; flex:1 1 100%; color:#1d2b3a; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-formbtns] { display:flex; flex-wrap:wrap; gap:6px; }
#siyagahCloudBar [data-mmj-row] > [data-mmj-note] { flex:1 1 auto; width:auto; min-width:0; }
#siyagahCloudBar [data-mmj-row][data-mmj-pending] > [data-mmj-note] { border-style:dashed; border-color:#1f5fa8; font-style:italic; }
#siyagahCloudBar [data-mmj-row][data-mmj-pending="note.delete"] [data-mmj-name] { text-decoration:line-through; }
#siyagahCloudBar [data-mmj-form^="note"] label, #siyagahCloudBar [data-mmj-field] { flex:1 1 100%; }
#siyagahCloudBar [data-mmj-field] { display:flex; flex-direction:column; gap:4px; min-width:0; font-size:0.9em; color:#33475c; }
#siyagahCloudBar [data-mmj-form] textarea, #siyagahCloudBar [data-mmj-neditor] { font:inherit; font-size:1rem; min-height:7em; width:100%; max-width:100%; box-sizing:border-box; color:#1d2b3a; background:#ffffff; border:1px solid #8a9bb0; border-radius:6px; padding:6px 8px; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-neditor] { max-height:60vh; overflow:auto; }
#siyagahCloudBar [data-mmj-neditor]:focus-visible, #siyagahCloudBar [data-mmj-form] textarea:focus-visible { outline:3px solid #1f5fa8; outline-offset:1px; }
#siyagahCloudBar [data-mmj-edpic] { display:inline-block; max-width:100%; padding:6px 10px; margin:2px 0; border:1px dashed #8a9bb0; border-radius:6px; color:#33475c; background:#f5f8fc; box-sizing:border-box; user-select:none; }
#siyagahCloudBar [data-mmj-form] label[data-mmj-check] { flex-direction:row; align-items:center; gap:8px; min-height:40px; color:#1d2b3a; font-size:0.95em; }
#siyagahCloudBar [data-mmj-form] input[type="checkbox"] { flex:0 0 auto; width:24px; height:24px; min-height:24px; margin:0; padding:0; }
#siyagahCloudBar [data-mmj-hint] { margin:0; flex:1 1 100%; font-size:0.85em; color:#33475c; overflow-wrap:anywhere; }
#siyagahCloudBar [data-mmj-pic] { display:inline-block; min-width:6em; max-width:100%; padding:10px 12px; margin:4px 0; border:1px dashed #8a9bb0; border-radius:6px; color:#33475c; background:#f5f8fc; box-sizing:border-box; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = BAR_CSS;
  document.head.appendChild(st);
}

// The token is wrapped in private-use characters (written as escapes), so a note whose text says "PIC0" is never a picture.
const PIC_TOKEN = /\uE000PIC(\d+)\uE001/;
const PIC_TOKENS = /\uE000PIC(\d+)\uE001/g;
const PIC_CHARS = /[\uE000\uE001]/g;
// R2b: a picture's own tag is sent back as it was only when it is exactly this plain shape; otherwise in this shape.
const PIC_TAG_SAFE = /^<img(?:\s+(?:class="ed-img"|data-pic="[0-9a-f]{64}"|data-mime="image\/[a-z0-9.+-]+"|alt="[^"<>&]*"))+\s*\/?>$/i;

/** Each picture's own <img> tag as Siyagah saved it, by sha, in order -- so an edit sends a picture back byte for byte. */
function pictureTags(html) {
  const by = new Map();
  for (const m of String(html || "").matchAll(/<img\b[^>]*>/gi)) {
    const sha = (m[0].match(/\bdata-pic\s*=\s*["']([0-9a-f]{64})["']/i) || [])[1];
    if (!sha) continue;
    const k = sha.toLowerCase();
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(m[0]);
  }
  return by;
}

/**
 * A note's saved HTML, ready for the bar: Siyagah's <img data-pic> (no src) would be dropped by the sanitiser, so each
 * is swapped for a private token first (inside an inert <template>: nothing loads, nothing runs), the rest goes through
 * note-sanitize.js, and the tokens become picture boxes made with DOM calls, never with HTML.
 */
function noteBodyInto(el, html, sanitize, reader, edit = false) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html || "");
  const pics = [];
  const tags = edit ? pictureTags(html) : null;
  // R2b: a private-use character already in the note's text is dropped, so only this code can make a token.
  const tw = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (/[\uE000\uE001]/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(PIC_CHARS, "");
  for (const img of tpl.content.querySelectorAll("img[data-pic]")) {
    const sha = String(img.getAttribute("data-pic") || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha)) { img.remove(); continue; }
    const mime = String(img.getAttribute("data-mime") || "");
    const pic = { sha, mime, alt: String(img.getAttribute("alt") || "") };
    if (edit) {
      const own = tags.get(sha)?.shift();
      const okMime = /^image\/[a-z0-9.+-]+$/i.test(mime) ? mime : "";
      pic.tag = own && PIC_TAG_SAFE.test(own) ? own : `<img class="ed-img" data-pic="${sha}" data-mime="${okMime}" alt="">`;
    }
    pics.push(pic);
    img.replaceWith(document.createTextNode(`\uE000PIC${pics.length - 1}\uE001`));
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
      if (pic && edit) {
        const ph = document.createElement("span");
        ph.setAttribute("data-mmj-edpic", String(Number(m[1])));
        ph.setAttribute("contenteditable", "false");
        ph.setAttribute("role", "img");
        ph.setAttribute("aria-label", t("Picture (kept as it is)"));
        ph.textContent = "🖼 " + t("Picture (kept as it is)");
        frag.appendChild(ph);
      } else if (pic) {
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
          // The reader sees a reason in their own language (I11); only an unexpected error shows its raw text.
          const reason = err?.code === "picture-check-failed" ? t("it failed its safety check")
            : err?.code === "picture-part-missing" ? t("part of it is missing") : (err?.message || String(err));
          box.textContent = t("Picture (could not be shown: {reason})", { reason });
          box.setAttribute("data-mmj-pic-failed", "1");
        });
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
  return pics;
}

/**
 * R2b: the edit box's HTML as it will be sent. Read as a string and parsed in an inert <template> (nothing loads, nothing
 * runs, even for something pasted in), each picture placeholder becomes a token, the rest goes through the same
 * sanitiser, and each token becomes that picture's own <img> tag again, exactly as Siyagah saved it. A placeholder the
 * reader deleted is a picture taken out; nothing else can add one.
 */
function editorHtml(ed, pics, sanitize) {
  const box = document.createElement("template");
  box.innerHTML = ed.innerHTML.replace(PIC_CHARS, "");
  for (const ph of box.content.querySelectorAll("[data-mmj-edpic]")) {
    const i = Number(ph.getAttribute("data-mmj-edpic"));
    ph.replaceWith(document.createTextNode(Number.isInteger(i) && pics[i] ? `\uE000PIC${i}\uE001` : ""));
  }
  return sanitize(box.innerHTML).replace(PIC_TOKENS, (m, i) => pics[Number(i)]?.tag || "");
}

/** A time as "2026-11-02 09:00" on this device's clock, in the reader's digits (never an English month name in Bangla). */
function when(ms) {
  if (!Number.isFinite(ms) || !ms) return "";
  const d = new Date(ms), p = (n) => String(n).padStart(2, "0");
  return num(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`);
}

/**
 * The tree and its notes inside `host`; returns { update(copy), state(s) }.
 *
 * J112 R2a: with `write` ({ cloud, nb, from }) each folder row carries the Map's own ⋯ menu (bar-palette.js's
 * data-bar-palette-* markup, so it opens, closes and gives way exactly like the Map's folder menus): Add subfolder,
 * Rename, Move up / down, Move to…, the 👁 visitors switch and Delete; "New folder" sits above the tree. Nothing is
 * written here: a request is built by the pure model (buildFolderRequest) and sent by siyagah-mmj-write.js, loaded by
 * dynamic import the first time one is sent. The change shows AT ONCE, marked "Waiting for Siyagah…" (the contract's
 * own instruction for st:'new'); on 'done' the mark goes and Siyagah's copy takes over as soon as it shows the change;
 * on 'refused' the row goes back as it was and Siyagah's reason is said in words (I15). Never sent twice by itself.
 *
 * J112 R2b: the NOTES too, by the same machinery (ask / settle) and the model's buildNoteRequest. A folder's ⋯ menu
 * gains "New note"; every note row has its own ⋯ menu -- Edit, Move to…, 👁, Delete -- and a note opened in the bar
 * shows the same four beside "Back to Siyagah folders". A note form lives in the page while it is open (it is moved,
 * never rebuilt, when Siyagah's copy changes underneath it), so the text typed and the caret are never lost. The edit
 * box shows each picture as a placeholder that cannot be typed into, and sends it back as its own <img> tag exactly as
 * Siyagah saved it; only the fields that changed are sent, and the text only when it changed.
 *
 * Keys: a folder's row is its id (the top is "~top"); a note's row is "n:<folder id>|<note id>" (a note sits in each of
 * its folders, so the key says which row), and "n:~view|<note id>" is the note opened in the bar.
 */
function mountMmjView(host, reader, model, sanitize, write = null) {
  const open = new Set(); // folders the reader opened, kept across every re-render
  let copy = reader.copy, st = { kind: "loading" }, noteId = null, returnTo = null;
  const pending = []; // requests out: { req, reqId, key, st: "sending"|"new"|"work"|"done", still, unsub, timer }
  const msgs = {};    // a row's key -> a sentence for that row: a refusal or a failed send
  let form = null;    // the one open form: { kind, key, id, ... } -- folder kinds "add"|"rename"|"move"|"delete", note kinds "note*"
  let liveForm = null; // R2b: a note form's own element, kept (moved, never rebuilt) across re-renders while it is open
  let writerP = null;
  host.innerHTML = `<p data-mmj-status role="status"></p><div data-mmj-treewrap></div><div data-mmj-noteview style="display:none"></div>`;
  const statusEl = host.querySelector("[data-mmj-status]");
  const treeEl = host.querySelector("[data-mmj-treewrap]");
  const noteEl = host.querySelector("[data-mmj-noteview]");
  const shownNow = () => model.withPending(copy, pending);
  const formKey = (f) => (f ? f.key ?? (f.id || "~top") : null);
  const noteKey = (ctx, id) => `n:${ctx}|${id}`;
  const splitNoteKey = (key) => { const s = String(key).slice(2), i = s.indexOf("|"); return { ctx: s.slice(0, i), id: s.slice(i + 1) }; };
  const noteTitle = (n) => (n?.title || "").trim() || t("(untitled note)");

  function status() {
    const v = model.folderView(copy);
    const held = copy.tree || v.noteCount;
    let text;
    if (st.kind === "denied") text = t("Ask the owner to allow this app.") + (held ? " " + t("Showing the copy on this device.") : "");
    else if (st.kind === "error") text = t("Siyagah's folders could not be read: {reason}", { reason: st.error?.message || String(st.error || "") }) + (held ? " " + t("Showing the copy on this device.") : "");
    else if (st.kind === "loading" && !held) text = t("Reading your Siyagah folders…");
    else if (!held) text = t("No Mapping My Journey folders in Siyagah yet.");
    else text = (write
      ? t("{folders} folders, {notes} notes. Changes to folders and notes are sent to Siyagah.", { folders: num(v.folderCount), notes: num(v.noteCount) })
      : t("{folders} folders, {notes} notes. Read-only: change them in Siyagah.", { folders: num(v.folderCount), notes: num(v.noteCount) }))
      + (st.kind === "live" ? "" : " " + t("Showing the copy on this device."));
    statusEl.textContent = text;
    statusEl.setAttribute("data-kind", st.kind);
  }

  function visSwitch(attrs, on) {
    return `<button type="button" ${attrs} role="switch" aria-checked="${on}"><span class="mm-sw${on ? " on" : ""}" aria-hidden="true"></span> 👁 ${escapeHtml(t("Visitors may see it"))}</button>`;
  }
  /** R2b: a note row's ⋯ menu (the same bar-palette markup as a folder's). */
  function noteMenuFor(n, ctx) {
    const id = escapeHtml(n.id), c = escapeHtml(ctx), menuId = `mmjNMenu-${c}-${id}`, both = `data-for="${id}" data-ctx="${c}"`;
    return `<span class="bar-palette-wrap folder-menu-wrap" data-bar-palette-wrap="${menuId}">`
      + `<button type="button" class="folder-menu-btn bar-palette-toggle" data-bar-palette-toggle="${menuId}" data-mmj-nmenu-btn="${c}|${id}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(t("More"))}" aria-label="${escapeHtml(t("More: {name}", { name: noteTitle(n) }))}">⋯</button>`
      + `<div class="bar-palette folder-row-menu" data-bar-palette="${menuId}" data-mmj-nmenu="${c}|${id}">`
      + `<button type="button" data-mmj-nact="edit" ${both}>✏️ ${escapeHtml(t("Edit"))}</button>`
      + `<button type="button" data-mmj-nact="move" ${both}>${escapeHtml(t("Move to…"))}</button>`
      + visSwitch(`data-mmj-nact="vis" ${both}`, n.vis === 1)
      + `<button type="button" data-mmj-nact="delete" ${both} data-mmj-danger>🗑 ${escapeHtml(t("Delete"))}</button>`
      + `</div></span>`;
  }
  function noteRow(n, ctx, nmarks = {}) {
    const vis = n.vis === 1 ? `<span data-mmj-vis title="${escapeHtml(t("Visitors may see this in Siyagah"))}">👁</span>` : "";
    const btn = `<button type="button" data-mmj-note="${escapeHtml(n.id)}" data-mmj-ctx="${escapeHtml(ctx)}"><span data-mmj-name dir="auto">${escapeHtml(noteTitle(n))}</span>${vis}</button>`;
    if (!write) return `<li>${btn}</li>`;
    const mark = nmarks[n.id], key = noteKey(ctx, n.id);
    return `<li><div data-mmj-row data-mmj-noterow${mark && mark.st !== "done" ? ` data-mmj-pending="${escapeHtml(mark.op)}"` : ""}>${btn}${noteMenuFor(n, ctx)}</div>`
      + waitLine(mark) + msgLine(key) + formFor(key, []) + `</li>`;
  }
  function countAll(node) { return node.notes.length + node.children.reduce((s, c) => s + countAll(c), 0); }

  // --- the write controls (R2a) ---------------------------------------------------------------------------------------
  function menuFor(f, folders) {
    const id = escapeHtml(f.id), menuId = `mmjMenu-${id}`, name = f.n.trim() || t("(untitled folder)");
    const up = model.siblingStep(folders, f.id, -1), down = model.siblingStep(folders, f.id, 1);
    return `<span class="bar-palette-wrap folder-menu-wrap" data-bar-palette-wrap="${menuId}">`
      + `<button type="button" class="folder-menu-btn bar-palette-toggle" data-bar-palette-toggle="${menuId}" data-mmj-menu-btn="${id}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(t("More"))}" aria-label="${escapeHtml(t("More: {name}", { name }))}">⋯</button>`
      + `<div class="bar-palette folder-row-menu" data-bar-palette="${menuId}" data-mmj-menu="${id}">`
      + `<button type="button" data-mmj-act="newnote" data-for="${id}">📝 ${escapeHtml(t("New note"))}</button>`
      + `<button type="button" data-mmj-act="add" data-for="${id}">➕ ${escapeHtml(t("Add subfolder"))}</button>`
      + `<button type="button" data-mmj-act="rename" data-for="${id}">✏️ ${escapeHtml(t("Rename"))}</button>`
      + `<button type="button" data-mmj-act="up" data-for="${id}"${up ? "" : " disabled"}>▲ ${escapeHtml(t("Move up"))}</button>`
      + `<button type="button" data-mmj-act="down" data-for="${id}"${down ? "" : " disabled"}>▼ ${escapeHtml(t("Move down"))}</button>`
      + `<button type="button" data-mmj-act="move" data-for="${id}">${escapeHtml(t("Move to…"))}</button>`
      + `<button type="button" data-mmj-act="vis" data-for="${id}" role="switch" aria-checked="${f.vis === 1}"><span class="mm-sw${f.vis === 1 ? " on" : ""}" aria-hidden="true"></span> 👁 ${escapeHtml(t("Visitors may see it"))}</button>`
      + `<button type="button" data-mmj-act="delete" data-for="${id}" data-mmj-danger>🗑 ${escapeHtml(t("Delete"))}</button>`
      + `</div></span>`;
  }
  function waitLine(mark) {
    if (!mark || mark.st === "done") return "";
    const text = mark.still ? t("Still waiting for Siyagah. It makes the change when Siyagah is open on one of your devices.") : t("Waiting for Siyagah…");
    return `<p data-mmj-wait role="status">${escapeHtml(text)}</p>`;
  }
  function msgLine(key) {
    const m = msgs[key];
    return m ? `<p data-mmj-msg role="alert"><span>${escapeHtml(m)}</span><button type="button" data-mmj-dismiss="${escapeHtml(key)}">${escapeHtml(t("OK"))}</button></p>` : "";
  }
  function formFor(key, folders) {
    if (!form || formKey(form) !== key) return "";
    if (form.kind.startsWith("note")) return `<div data-mmj-formslot></div>`; // R2b: the live note form goes here (mountNoteForm)
    const f = form.id ? folders.find((x) => x.id === form.id) : null;
    const name = f ? (f.n.trim() || t("(untitled folder)")) : "";
    const cancel = `<button type="button" data-mmj-cancel>${escapeHtml(t("Cancel"))}</button>`;
    if (form.kind === "add" || form.kind === "rename") {
      const label = form.kind === "rename" ? t("New name for “{name}”", { name }) : f ? t("Name for the new subfolder in “{name}”", { name }) : t("Name for the new folder");
      return `<form data-mmj-form="${form.kind}"><label><span>${escapeHtml(label)}</span><input type="text" data-mmj-input maxlength="200" dir="auto" value="${escapeHtml(form.value ?? "")}"></label>`
        + `<span data-mmj-formbtns><button type="submit">${escapeHtml(form.kind === "rename" ? t("Rename") : t("Create"))}</button>${cancel}</span></form>`;
    }
    if (form.kind === "move") {
      const targets = model.moveTargets(folders, form.id);
      const cur = f?.p || null, chosen = form.value === undefined ? cur : form.value;
      const opts = [`<option value=""${chosen === null ? " selected" : ""}>${escapeHtml(t("Top of Mapping My Journey"))}</option>`]
        .concat(folderOrder(folders).filter((x) => targets.includes(x.f.id)).map((x) => `<option value="${escapeHtml(x.f.id)}"${chosen === x.f.id ? " selected" : ""}>${"— ".repeat(x.depth + 1)}${escapeHtml(x.f.n.trim() || t("(untitled folder)"))}</option>`));
      return `<form data-mmj-form="move"><label><span>${escapeHtml(t("Move “{name}” into", { name }))}</span><select data-mmj-parent>${opts.join("")}</select></label>`
        + `<span data-mmj-formbtns><button type="submit">${escapeHtml(t("Move"))}</button>${cancel}</span></form>`;
    }
    if (form.kind === "delete") {
      const reach = model.folderDeleteReach({ tree: { folders }, notes: copy.notes }, form.id);
      return `<div data-mmj-form="delete" role="group" aria-label="${escapeHtml(t("Delete"))}"><p data-mmj-confirm>${escapeHtml(t("Delete “{name}”? It goes to Siyagah's Trash with everything in it (subfolders: {folders} · notes: {notes}). You can undo it in Siyagah (Trash, then Restore).", { name, folders: num(reach.folders), notes: num(reach.notes) }))}</p>`
        + `<span data-mmj-formbtns><button type="button" data-mmj-confirm-delete data-mmj-danger>🗑 ${escapeHtml(t("Delete"))}</button>${cancel}</span></div>`;
    }
    return "";
  }
  /** The folders in tree order, each with its depth (for Move to… lists). */
  function folderOrder(folders) {
    const view = model.folderView({ tree: { folders }, notes: {} });
    const out = []; const walk = (nodes, d) => { for (const n of nodes) { out.push({ f: n.folder, depth: d }); walk(n.children, d + 1); } }; walk(view.roots, 0);
    return out;
  }

  // --- R2b: the note forms ------------------------------------------------------------------------------------------
  /** The markup of the open note form (made once when it opens; the live element is kept after that). */
  function noteFormHtml(f, shown) {
    const cancel = `<button type="button" data-mmj-cancel>${escapeHtml(t("Cancel"))}</button>`;
    const folders = shown.tree?.folders || [];
    const n = f.id && f.kind !== "noteadd" ? shown.notes[f.id] : null;
    if (f.kind === "noteadd") {
      const fo = folders.find((x) => x.id === f.folder);
      const name = fo ? (fo.n.trim() || t("(untitled folder)")) : "";
      return `<form data-mmj-form="noteadd" data-mmj-formkey="${escapeHtml(f.key)}"><p data-mmj-hint>${escapeHtml(t("A new note in “{name}”", { name }))}</p>`
        + `<label><span>${escapeHtml(t("Title"))}</span><input type="text" data-mmj-ntitle maxlength="300" dir="auto" value=""></label>`
        + `<label><span>${escapeHtml(t("Text"))}</span><textarea data-mmj-ntext rows="5" dir="auto"></textarea></label>`
        + `<span data-mmj-formbtns><button type="submit">${escapeHtml(t("Create"))}</button>${cancel}</span></form>`;
    }
    if (!n) return `<div data-mmj-form="notegone" data-mmj-formkey="${escapeHtml(f.key)}"><p data-mmj-hint>${escapeHtml(t("This note is no longer in Mapping My Journey."))}</p><span data-mmj-formbtns>${cancel}</span></div>`;
    const title = noteTitle(n);
    if (f.kind === "noteedit") {
      return `<form data-mmj-form="noteedit" data-mmj-formkey="${escapeHtml(f.key)}">`
        + `<label><span>${escapeHtml(t("Title"))}</span><input type="text" data-mmj-ntitle maxlength="300" dir="auto" value="${escapeHtml(n.title || "")}"></label>`
        + `<div data-mmj-field><span>${escapeHtml(t("Text"))}</span><div data-mmj-neditor contenteditable="true" role="textbox" aria-multiline="true" aria-label="${escapeHtml(t("Text of “{name}”", { name: title }))}" dir="auto"></div></div>`
        + `<p data-mmj-hint>${escapeHtml(t("Pictures stay as they are. Only the formatting shown here is kept when you change the text; changing only the title keeps the text exactly as it is."))}</p>`
        + `<span data-mmj-formbtns><button type="submit">${escapeHtml(t("Save"))}</button>${cancel}</span></form>`;
    }
    if (f.kind === "notemove") {
      const mine = new Set(model.mmjFolderIdsOf(n, folders));
      const boxes = folderOrder(folders).map((x) => `<label data-mmj-check><input type="checkbox" data-mmj-nfolder value="${escapeHtml(x.f.id)}"${mine.has(x.f.id) ? " checked" : ""}><span dir="auto">${"— ".repeat(x.depth)}${escapeHtml(x.f.n.trim() || t("(untitled folder)"))}</span></label>`).join("");
      return `<form data-mmj-form="notemove" data-mmj-formkey="${escapeHtml(f.key)}"><fieldset data-mmj-checks style="border:0; margin:0; padding:0; min-width:0; flex:1 1 100%; max-height:40vh; overflow:auto;">`
        + `<legend data-mmj-hint>${escapeHtml(t("Folders for “{name}” (keep at least one, 20 at most)", { name: title }))}</legend>${boxes}</fieldset>`
        + `<span data-mmj-formbtns><button type="submit">${escapeHtml(t("Move"))}</button>${cancel}</span></form>`;
    }
    if (f.kind === "notedelete") {
      return `<div data-mmj-form="notedelete" data-mmj-formkey="${escapeHtml(f.key)}" role="group" aria-label="${escapeHtml(t("Delete"))}"><p data-mmj-confirm>${escapeHtml(t("Delete the note “{name}”? It goes to Siyagah's Trash. You can undo it in Siyagah (Trash, then Restore).", { name: title }))}</p>`
        + `<span data-mmj-formbtns><button type="button" data-mmj-confirm-ndelete data-mmj-danger>🗑 ${escapeHtml(t("Delete"))}</button>${cancel}</span></div>`;
    }
    return "";
  }
  /** Put the open note form into its slot: the SAME element while it stays open, made (and seeded) only the first time. */
  function mountNoteForm(container, shown) {
    const slot = container.querySelector("[data-mmj-formslot]");
    if (!slot || !form) return;
    if (!liveForm || liveForm.getAttribute("data-mmj-formkey") !== form.key) {
      const holder = document.createElement("div");
      holder.innerHTML = noteFormHtml(form, shown);
      liveForm = holder.firstElementChild;
      if (!liveForm) return;
      const ed = liveForm.querySelector("[data-mmj-neditor]");
      if (ed) {
        const n = shown.notes[form.id];
        form.title = n.title || "";
        form.base = n.updatedAt;
        try { form.pics = noteBodyInto(ed, n.content, sanitize, reader, true); }
        catch (err) { console.error(err); ed.textContent = ""; form.pics = []; form.broken = err?.message || String(err); }
        form.baseline = editorHtml(ed, form.pics, sanitize);
      }
    }
    slot.replaceWith(liveForm);
  }

  function folderRow(node, marks, folders, nmarks) {
    const f = node.folder, isOpen = open.has(f.id), mark = marks[f.id];
    const name = f.n.trim() || t("(untitled folder)");
    let out = `<li><div data-mmj-row${mark && mark.st !== "done" ? ` data-mmj-pending="${escapeHtml(mark.op)}"` : ""}>`
      + `<button type="button" data-mmj-folder="${escapeHtml(f.id)}" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? "▾" : "▸"}</span>`
      + `<span data-mmj-name dir="auto">${escapeHtml(name)}</span>`
      + (f.vis === 1 ? `<span data-mmj-vis title="${escapeHtml(t("Visitors may see this in Siyagah"))}">👁</span>` : "")
      + `<span data-mmj-count>${escapeHtml(num(countAll(node)))}</span></button>`
      + (write ? menuFor(f, folders) : "") + `</div>`
      + waitLine(mark) + msgLine(f.id) + formFor(f.id, folders);
    if (isOpen) {
      const inner = node.children.map((c) => folderRow(c, marks, folders, nmarks)).join("") + node.notes.map((n) => noteRow(n, f.id, nmarks)).join("");
      out += `<ul>${inner || `<li data-mmj-empty>${escapeHtml(t("This folder is empty."))}</li>`}</ul>`;
    }
    return out + `</li>`;
  }

  /** A selector that finds the same control again after a re-render (the focus is never dropped by a copy update). */
  function focusKey(el) {
    if (!el || !host.contains(el)) return null;
    if (el.hasAttribute("data-mmj-note")) return `[data-mmj-note="${CSS.escape(el.getAttribute("data-mmj-note"))}"][data-mmj-ctx="${CSS.escape(el.getAttribute("data-mmj-ctx") || "")}"]`;
    for (const a of ["data-mmj-folder", "data-mmj-menu-btn", "data-mmj-nmenu-btn", "data-mmj-dismiss"]) if (el.hasAttribute(a)) return `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
    if (el.hasAttribute("data-mmj-act")) return `[data-mmj-act="${CSS.escape(el.getAttribute("data-mmj-act"))}"]` + (el.hasAttribute("data-for") ? `[data-for="${CSS.escape(el.getAttribute("data-for"))}"]` : "");
    if (el.hasAttribute("data-mmj-nact")) return `[data-mmj-nact="${CSS.escape(el.getAttribute("data-mmj-nact"))}"][data-for="${CSS.escape(el.getAttribute("data-for") || "")}"][data-ctx="${CSS.escape(el.getAttribute("data-ctx") || "")}"]`;
    for (const a of ["data-mmj-input", "data-mmj-parent", "data-mmj-confirm-delete", "data-mmj-cancel", "data-mmj-back"]) if (el.hasAttribute(a)) return `[${a}]`;
    return null;
  }
  /**
   * Re-render without losing what the reader was doing: the focus (found again by focusKey), and inside a live note
   * form the very element and the caret (the form is moved, never rebuilt). A note row that went away (deleted) gives
   * the focus to its folder: the way back.
   */
  function keepFocus(fn) {
    const a = document.activeElement;
    const inLive = liveForm && a && liveForm.contains(a) ? a : null;
    let range = null;
    if (inLive) { const s = getSelection(); if (s && s.rangeCount && liveForm.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); }
    const sel = inLive ? null : focusKey(a);
    const ctx = !inLive && a && a.hasAttribute?.("data-mmj-ctx") ? a.getAttribute("data-mmj-ctx") : null;
    fn();
    if (inLive) {
      if (inLive.isConnected) { inLive.focus({ preventScroll: true }); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } }
      return;
    }
    if (!sel) return;
    const el = host.querySelector(sel) || (ctx && !ctx.startsWith("~") ? host.querySelector(`[data-mmj-folder="${CSS.escape(ctx)}"]`) : null);
    el?.focus({ preventScroll: true });
  }

  function renderTree() {
    // A re-render (Siyagah's copy changed under the reader) must not lose what they were doing: the open ⋯ menu, the
    // text typed in a form and where the focus was are read off the page one line before it is replaced.
    const openMenu = treeEl.querySelector("[data-bar-palette].open")?.getAttribute("data-bar-palette") || null;
    const input = treeEl.querySelector("[data-mmj-input]"), sel = treeEl.querySelector("[data-mmj-parent]");
    if (form && input) form.value = input.value;
    if (form && sel) form.value = sel.value || null;
    keepFocus(() => {
      const shown = shownNow();
      const v = model.folderView(shown.copy);
      const folders = shown.copy.tree?.folders || [];
      const nmarks = shown.noteMarks || {};
      let rows = "";
      if (copy.tree) rows += `<h3 data-mmj-sec dir="auto">${escapeHtml(copy.tree.sec?.n || "Mapping My Journey")}</h3>`;
      if (write && copy.tree) rows += `<div data-mmj-tools><button type="button" data-mmj-act="newtop">➕ ${escapeHtml(t("New folder"))}</button></div>` + msgLine("~top") + formFor("~top", folders);
      if (v.roots.length || v.loose.length) {
        rows += `<ul data-mmj-tree data-folder-tree>${v.roots.map((n) => folderRow(n, shown.marks, folders, nmarks)).join("")}`;
        if (v.loose.length) {
          const isOpen = open.has("~loose");
          rows += `<li><button type="button" data-mmj-folder="~loose" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? "▾" : "▸"}</span><span data-mmj-name>${escapeHtml(t("Not in a folder"))}</span><span data-mmj-count>${escapeHtml(num(v.loose.length))}</span></button>`
            + (isOpen ? `<ul>${v.loose.map((n) => noteRow(n, "~loose", nmarks)).join("")}</ul>` : "") + `</li>`;
        }
        rows += `</ul>`;
      }
      treeEl.innerHTML = rows;
      mountNoteForm(treeEl, shown.copy);
      if (openMenu) {
        const pop = treeEl.querySelector(`[data-bar-palette="${CSS.escape(openMenu)}"]`);
        if (pop) { pop.classList.add("open"); pop.closest("[data-bar-palette-wrap]")?.querySelector("[data-bar-palette-toggle]")?.setAttribute("aria-expanded", "true"); }
      }
    });
  }

  function renderNote() {
    const shown = shownNow();
    const n = shown.copy.notes[noteId];
    const back = `<button type="button" data-mmj-back>${escapeHtml(t("← Back to Siyagah folders"))}</button>`;
    keepFocus(() => {
      if (!n) {
        noteEl.innerHTML = back + `<p data-mmj-meta>${escapeHtml(t("This note is no longer in Mapping My Journey."))}</p>`;
        return;
      }
      const key = noteKey("~view", n.id), mark = (shown.noteMarks || {})[n.id];
      const both = `data-for="${escapeHtml(n.id)}" data-ctx="~view"`;
      // R2b: the note's own actions sit beside the way back -- the same four as its row's ⋯ menu.
      const acts = write ? `<div data-mmj-tools data-mmj-noteacts>`
        + `<button type="button" data-mmj-nact="edit" ${both}>✏️ ${escapeHtml(t("Edit"))}</button>`
        + `<button type="button" data-mmj-nact="move" ${both}>${escapeHtml(t("Move to…"))}</button>`
        + visSwitch(`data-mmj-nact="vis" ${both}`, n.vis === 1)
        + `<button type="button" data-mmj-nact="delete" ${both} data-mmj-danger>🗑 ${escapeHtml(t("Delete"))}</button></div>`
        + waitLine(mark) + msgLine(key) + formFor(key, []) : "";
      const meta = [n.updatedAt ? t("Changed {when}", { when: when(Date.parse(n.updatedAt)) }) : "", write ? "" : t("Read-only: change it in Siyagah.")].filter(Boolean).join(" · ");
      noteEl.innerHTML = `<div data-mmj-tools>${back}</div>` + acts + `<h3 data-mmj-title dir="auto">${escapeHtml(noteTitle(n))}</h3><p data-mmj-meta>${escapeHtml(meta)}</p><div data-mmj-body dir="auto"></div>`;
      mountNoteForm(noteEl, shown.copy);
      const body = noteEl.querySelector("[data-mmj-body]");
      try { noteBodyInto(body, n.content, sanitize, reader); }
      catch (err) { console.error(err); body.textContent = t("This note could not be shown: {reason}", { reason: err?.message || String(err) }); }
    });
  }

  let shownSig = null; // what the note view last drew, so a copy update that does not touch it leaves it (and its pictures) alone
  function render() {
    status();
    if (noteId) {
      treeEl.style.display = "none"; noteEl.style.display = "block";
      const shown = shownNow(), n = shown.copy.notes[noteId] || null, key = noteKey("~view", noteId), mk = (shown.noteMarks || {})[noteId];
      const sig = JSON.stringify([n && [n.title, n.content, n.updatedAt, n.vis], mk && [mk.op, mk.st, mk.still], msgs[key] || null, form && formKey(form) === key ? form.kind : null]);
      if (sig !== shownSig || !noteEl.firstChild) { shownSig = sig; renderNote(); }
    } else { shownSig = null; noteEl.style.display = "none"; noteEl.innerHTML = ""; treeEl.style.display = "block"; renderTree(); }
  }

  /** The way-back law after every folder action: the same folders open, this row (or the top's New folder) in view and focused. */
  function focusRow(id) {
    const el = id ? host.querySelector(`[data-mmj-folder="${CSS.escape(id)}"]`) : host.querySelector('[data-mmj-act="newtop"]');
    if (el) { el.scrollIntoView({ block: "nearest" }); el.focus({ preventScroll: true }); }
  }
  /** R2b: the same for any row's key -- a note's row in the folder it was used from (else any of its rows, else that folder), or the opened note's Edit. */
  function focusKeyed(key) {
    if (!(typeof key === "string" && key.startsWith("n:"))) { focusRow(key === "~top" ? null : key); return; }
    const { ctx, id } = splitNoteKey(key);
    let el = null;
    if (ctx === "~view" && noteId === id) el = noteEl.querySelector('[data-mmj-nact="edit"]') || noteEl.querySelector("[data-mmj-back]");
    el = el || host.querySelector(`[data-mmj-note="${CSS.escape(id)}"][data-mmj-ctx="${CSS.escape(ctx)}"]`) || host.querySelector(`[data-mmj-note="${CSS.escape(id)}"]`)
      || (!ctx.startsWith("~") ? host.querySelector(`[data-mmj-folder="${CSS.escape(ctx)}"]`) : null);
    if (el) { el.scrollIntoView({ block: "nearest" }); el.focus({ preventScroll: true }); }
  }
  function closeMenus() {
    for (const p of host.querySelectorAll("[data-bar-palette].open")) {
      p.classList.remove("open");
      p.closest("[data-bar-palette-wrap]")?.querySelector("[data-bar-palette-toggle]")?.setAttribute("aria-expanded", "false");
    }
  }
  const WHY = {
    "bad name": "Give the folder a name (200 characters at most).",
    "changed in Siyagah since": "this note was changed in Siyagah since you opened it. Wait until the copy here shows the newer version, then try again.",
    "open in Siyagah — try again": "the note is open in Siyagah on one of your devices. Try again in a minute.",
    "base is required": "Siyagah has not made this note yet. Try again when it shows without “Waiting for Siyagah…”.",
    "folderIds must be 1 to 20 folders": "choose at least one folder (20 at most).",
    "bad title": "the title is too long (300 characters at most).",
    "bad content": "the text is too big (900 KB at most), or Siyagah could not accept it.",
  };
  const whyWords = (why) => (WHY[why] ? t(WHY[why]) : t(String(why || "")) || String(why || ""));

  function settle(entry, outcome) {
    const i = pending.indexOf(entry);
    if (outcome.kind === "waiting") { if (entry.st !== "done") entry.st = outcome.st; render(); return; }
    clearTimeout(entry.timer);
    try { entry.unsub?.(); } catch {}
    entry.unsub = null;
    if (outcome.kind === "done") {
      entry.st = "done";
      // Siyagah's copy shows the change within ~10 s of done; until it does, the change stays shown (unmarked). If the
      // copy never catches up (a closed Siyagah between the two writes), the copy wins after a minute.
      if (model.requestReflected(copy, entry.req)) { if (i >= 0) pending.splice(i, 1); }
      else entry.timer = setTimeout(() => { const j = pending.indexOf(entry); if (j >= 0) { pending.splice(j, 1); render(); } }, 60000);
      render();
      return;
    }
    if (i >= 0) pending.splice(i, 1);
    const key = entry.key;
    msgs[key] = outcome.kind === "refused"
      ? t("Siyagah did not make this change: {why}", { why: whyWords(outcome.why) })
      : t("Siyagah's answer could not be read: {reason}", { reason: model.isPermissionDenied(outcome.error) ? t("Ask the owner to allow this app.") : (outcome.error?.message || String(outcome.error || "")) });
    render();
    focusKeyed(key);
  }

  /**
   * Send one request. `focusTo` is where the focus goes once the change shows (a folder id, null for the top, or a
   * note row's key); `msgKey` is the row a refusal is said on (by default the folder's own, or the parent's for an add).
   */
  async function ask(op, fields, focusTo, msgKey = null) {
    closeMenus();
    const isNote = op.startsWith("note.");
    const key = msgKey ?? (op === "folder.add" ? (fields.parent || "~top") : fields.id);
    delete msgs[key];
    if (st.kind === "denied" || st.kind === "error") {
      // A control that opens and explains itself beats one that is not there: say why nothing can be sent.
      msgs[key] = t("This change cannot be sent now: {reason}", { reason: st.kind === "denied" ? t("Ask the owner to allow this app.") : t("Siyagah's folders could not be read.") });
      render(); focusKeyed(key); return;
    }
    const shown = shownNow().copy;
    const built = isNote ? model.buildNoteRequest(op, fields, { copy: shown, from: write.from })
      : model.buildFolderRequest(op, fields, { folders: shown.tree?.folders || [], from: write.from });
    // A refusal before asking keeps the form open (the reader's text is not lost).
    if (!built.ok) { msgs[key] = t("This change cannot be sent now: {reason}", { reason: whyWords(built.reason) }); render(); focusKeyed(key); return; }
    const entry = { req: built.req, reqId: null, key, st: "sending", still: false, unsub: null, timer: null };
    pending.push(entry);
    form = null; liveForm = null;
    if (op === "folder.add" && fields.parent) open.add(fields.parent);
    if (op === "folder.move" && fields.parent) open.add(fields.parent);
    if (op === "note.add") for (const fid of built.req.folderIds) open.add(fid);
    render(); focusKeyed(focusTo);
    try {
      writerP = writerP || import("./siyagah-mmj-write.js").then((m) => m.openMmjWriter({ cloud: write.cloud, nb: write.nb }));
      writerP.catch(() => { writerP = null; });
      const w = await writerP;
      entry.reqId = await w.send(built.req);
      if (entry.st === "sending") entry.st = "new";
      entry.timer = setTimeout(() => { if (pending.includes(entry) && entry.st !== "done") { entry.still = true; render(); } }, model.MMJ_STILL_WAITING_MS);
      entry.unsub = w.follow(entry.reqId, (o) => { if (pending.includes(entry)) settle(entry, o); });
      render();
    } catch (err) {
      console.error(err);
      const i = pending.indexOf(entry);
      if (i >= 0) pending.splice(i, 1);
      msgs[key] = t("Siyagah could not be asked: {reason}", { reason: model.isPermissionDenied(err) ? t("Ask the owner to allow this app.") : (err?.message || String(err)) });
      render(); focusKeyed(key);
    }
  }

  function focusFirstField() {
    const fe = host.querySelector("[data-mmj-input], [data-mmj-parent], [data-mmj-confirm-delete], [data-mmj-ntitle], [data-mmj-nfolder], [data-mmj-confirm-ndelete], [data-mmj-form=\"notegone\"] [data-mmj-cancel]");
    if (fe) { fe.scrollIntoView({ block: "nearest" }); fe.focus({ preventScroll: true }); fe.select?.(); }
  }
  function act(kind, id) {
    const folders = shownNow().copy.tree?.folders || [];
    const f = id ? folders.find((x) => x.id === id) : null;
    closeMenus();
    liveForm = null;
    if (kind === "newtop") { form = { kind: "add", id: null, value: "" }; }
    else if (kind === "add") { form = { kind: "add", id, value: "" }; }
    else if (kind === "newnote") { form = { kind: "noteadd", key: id, id: null, folder: id }; }
    else if (kind === "rename") { form = { kind: "rename", id, value: f?.n ?? "" }; }
    else if (kind === "move") { form = { kind: "move", id, value: undefined }; }
    else if (kind === "delete") { form = { kind: "delete", id }; }
    else if (kind === "up" || kind === "down") {
      const step = model.siblingStep(folders, id, kind === "up" ? -1 : 1);
      if (step) ask("folder.move", step.before ? { id, parent: step.parent, before: step.before } : { id, parent: step.parent }, id);
      return;
    } else if (kind === "vis") { ask("folder.vis", { id, vis: f?.vis === 1 ? 0 : 1 }, id); return; }
    render();
    focusFirstField();
  }
  /** R2b: a note's action, from its row's ⋯ menu (ctx = that row's folder) or from the opened note (ctx "~view"). */
  function nact(kind, id, ctx) {
    const n = shownNow().copy.notes[id];
    const key = noteKey(ctx, id);
    closeMenus();
    if (kind === "vis") { ask("note.vis", { id, vis: n?.vis === 1 ? 0 : 1 }, key, key); return; }
    liveForm = null;
    form = { kind: "note" + kind, key, id, ctx };
    delete msgs[key];
    render();
    focusFirstField();
  }
  function cancelForm() { const key = formKey(form); form = null; liveForm = null; render(); focusKeyed(key); }
  function sayOnForm(text) { msgs[formKey(form)] = text; render(); focusKeyed(formKey(form)); }
  function submitForm() {
    if (!form) return;
    const f = form;
    if (f.kind === "add") {
      const name = treeEl.querySelector("[data-mmj-input]")?.value ?? "";
      const nid = model.mmjRandomId(crypto.getRandomValues(new Uint8Array(16)), `x-${write.from}-`); // the contract's "x-<app>-<random>"
      ask("folder.add", { id: nid, name, parent: f.id }, nid);
    } else if (f.kind === "rename") ask("folder.rename", { id: f.id, name: treeEl.querySelector("[data-mmj-input]")?.value ?? "" }, f.id);
    else if (f.kind === "move") ask("folder.move", { id: f.id, parent: treeEl.querySelector("[data-mmj-parent]")?.value || null }, f.id);
    else if (f.kind === "delete") ask("folder.delete", { id: f.id }, f.id);
    else if (f.kind === "noteadd") {
      const title = liveForm?.querySelector("[data-mmj-ntitle]")?.value ?? "";
      const text = liveForm?.querySelector("[data-mmj-ntext]")?.value ?? "";
      const nid = model.mmjRandomId(crypto.getRandomValues(new Uint8Array(16)), `x-${write.from}-`);
      ask("note.add", { id: nid, title, content: model.textToNoteHtml(text), tags: [], folderIds: [f.folder] }, noteKey(f.folder, nid), f.key);
    } else if (f.kind === "noteedit") {
      if (f.broken) { sayOnForm(t("This change cannot be sent now: {reason}", { reason: f.broken })); return; }
      const fields = { id: f.id, base: f.base };
      const title = liveForm?.querySelector("[data-mmj-ntitle]")?.value ?? "";
      if (model.cleanMmjName(title) !== model.cleanMmjName(f.title)) fields.title = title;
      const ed = liveForm?.querySelector("[data-mmj-neditor]");
      if (ed) { const html = editorHtml(ed, f.pics, sanitize); if (html !== f.baseline) fields.content = html; }
      if (!("title" in fields) && !("content" in fields)) { sayOnForm(t("Nothing has changed.")); return; }
      ask("note.edit", fields, f.key, f.key);
    } else if (f.kind === "notemove") {
      const n = shownNow().copy.notes[f.id];
      const ids = [...(liveForm?.querySelectorAll("[data-mmj-nfolder]:checked") || [])].map((x) => x.value);
      const folders = shownNow().copy.tree?.folders || [];
      const had = model.mmjFolderIdsOf(n, folders).slice().sort();
      if (ids.length && JSON.stringify(ids.slice().sort()) === JSON.stringify(had)) { sayOnForm(t("Nothing has changed.")); return; }
      ask("note.move", { id: f.id, base: n?.updatedAt ?? "", folderIds: ids }, f.key, f.key);
    } else if (f.kind === "notedelete") {
      const n = shownNow().copy.notes[f.id];
      let key = f.key;
      if (f.ctx === "~view") {
        // From the opened note: back to the tree, to the note's own row (marked as going), where the answer is said.
        const ctx = returnTo && returnTo.id === f.id ? returnTo.ctx : (n?.folderIds?.[0] || "~loose");
        key = noteKey(ctx, f.id);
        noteId = null;
      }
      ask("note.delete", { id: f.id, base: n?.updatedAt ?? "" }, key, key);
    }
  }

  host.addEventListener("submit", (e) => { if (e.target.closest("[data-mmj-form]")) { e.preventDefault(); submitForm(); } });
  host.addEventListener("keydown", (e) => { if (e.key === "Escape" && form && e.target.closest("[data-mmj-form]")) { e.preventDefault(); cancelForm(); } });
  host.addEventListener("click", (e) => {
    const a = e.target.closest("[data-mmj-act]");
    if (a && write) { if (!a.disabled) act(a.getAttribute("data-mmj-act"), a.getAttribute("data-for")); return; }
    const na = e.target.closest("[data-mmj-nact]");
    if (na && write) { nact(na.getAttribute("data-mmj-nact"), na.getAttribute("data-for"), na.getAttribute("data-ctx")); return; }
    if (e.target.closest("[data-mmj-cancel]")) { cancelForm(); return; }
    if (e.target.closest("[data-mmj-confirm-delete]") || e.target.closest("[data-mmj-confirm-ndelete]")) { submitForm(); return; }
    const dm = e.target.closest("[data-mmj-dismiss]");
    if (dm) { const k = dm.getAttribute("data-mmj-dismiss"); delete msgs[k]; render(); focusKeyed(k); return; }
    if (e.target.closest("[data-mmj-form]")) return; // inside a form: nothing below applies
    const f = e.target.closest("[data-mmj-folder]");
    if (f) { const id = f.getAttribute("data-mmj-folder"); open.has(id) ? open.delete(id) : open.add(id); render(); host.querySelector(`[data-mmj-folder="${CSS.escape(id)}"]`)?.focus(); return; }
    const nt = e.target.closest("[data-mmj-note]");
    if (nt) {
      returnTo = { id: nt.getAttribute("data-mmj-note"), ctx: nt.getAttribute("data-mmj-ctx") || "", y: window.scrollY };
      noteId = returnTo.id;
      if (form && formKey(form).startsWith("n:")) { form = null; liveForm = null; }
      render();
      noteEl.querySelector("[data-mmj-back]")?.focus({ preventScroll: true });
      host.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.target.closest("[data-mmj-back]")) {
      noteId = null;
      if (form && formKey(form).startsWith("n:~view|")) { form = null; liveForm = null; }
      render();
      // The way back: the tree as it was (the same folders open), the note's own row in view and focused.
      const row = returnTo && (host.querySelector(`[data-mmj-note="${CSS.escape(returnTo.id)}"][data-mmj-ctx="${CSS.escape(returnTo.ctx)}"]`) || host.querySelector(`[data-mmj-note="${CSS.escape(returnTo.id)}"]`));
      if (returnTo) window.scrollTo(0, returnTo.y);
      if (row) { row.scrollIntoView({ block: "nearest" }); row.focus({ preventScroll: true }); }
    }
  });

  render();
  return {
    update(next) {
      copy = next;
      // A done request whose change Siyagah's copy now shows is finished: the copy speaks for it from here.
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].st === "done" && model.requestReflected(copy, pending[i].req)) { clearTimeout(pending[i].timer); pending.splice(i, 1); }
      render();
    },
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
  // A refusal or a failed read opens it, so the message is never hidden (I15). The toggle wears the J109 ON/OFF switch
  // (shell.css .mm-sw), never an arrow; the folder tree inside keeps its ▸/▾ (a tree, data-folder-tree).
  const OPEN_KEY = "msa-siyagah-mmj-open";
  let isOpen = false;
  try { isOpen = localStorage.getItem(OPEN_KEY) === "1"; } catch { isOpen = false; }
  const say = (statusHtml, button, toggle = false) => {
    head.innerHTML = `<strong style="flex:0 1 auto; min-width:0; overflow-wrap:anywhere;">${escapeHtml(t("Siyagah's Mapping My Journey"))}</strong>`
      + (statusHtml ? `<span data-siyagah-status style="flex:1 1 12em; min-width:0; overflow-wrap:anywhere;">${statusHtml}</span>` : `<span style="flex:1 1 0; min-width:0;"></span>`)
      + (toggle ? `<button type="button" data-siyagah-toggle aria-controls="siyagahMmjBody" aria-expanded="${isOpen}" style="flex:0 0 auto; max-width:100%; min-height:40px; padding:0 12px;"><span class="mm-sw" aria-hidden="true"></span> ${escapeHtml(t("Siyagah folders"))}</button>` : "")
      + (button ? `<button type="button" data-siyagah-action="${button.action}" style="flex:0 0 auto; max-width:100%; min-height:40px; padding:0 14px;">${escapeHtml(button.label)}</button>` : "");
  };
  function setOpen(open, remember = true) {
    isOpen = open;
    if (remember) { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }
    if (readerFor) body.hidden = !open;
    const tg = head.querySelector("[data-siyagah-toggle]");
    if (tg) tg.setAttribute("aria-expanded", String(open)); // J109: the ON/OFF switch (.mm-sw) reads aria-expanded
  }
  head.addEventListener("click", (e) => { if (e.target.closest("[data-siyagah-toggle]")) setOpen(!isOpen); });
  say(escapeHtml(t("Opening…")), null);
  // `after`: the Map's own folders first. Siyagah's code is fetched only once they have loaded (or failed to).
  if (after && typeof after.then === "function") { try { await after; } catch { /* the Map says its own failure */ } }
  // ...and the browser has drawn them: one idle moment more (at most 2 s), so the Map's first view is never shared.
  if (after) await new Promise((r) => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => r(), { timeout: 2000 }) : setTimeout(r, 200)));

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
      // R2a/R2b: the folder and note controls need nothing more loaded now -- the writer itself comes on the first request.
      view = mountMmjView(viewHost, r, model, san.sanitizeNoteHtml, { cloud, nb, from: model.mmjFromForHost(location.hostname) });
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
