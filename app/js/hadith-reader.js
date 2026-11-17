// The Hadith Books reader (PCF MSA J106; the Owner, 28 Oct 2026, demo approved 1A 2A 3A 4A): three panes side by
// side -- Chapters | the chapter's hadith | the hadith's text -- like the Siyagah notebook.
//   - The two dividers drag to resize (and take the arrow keys); the widths are remembered on this device.
//   - ⤢ expands one pane over the reader; ⤡ brings the three back.
//   - ⧉ pops a pane out as a window that moves by its title bar and resizes from every side and corner (the app's
//     own float-window.js, as the Mapping My Journey tray and the Note windows use); ✕ puts it back in its place.
//   - On a phone (answer 2A) one pane shows at a time, with Chapters › Hadith › Text buttons above it.
//   - ONE bar on a phone (the Owner, 17 Nov 2026): Chapters | Hadith | Text and the pane's own buttons share a single row; the pane's
//     own heading row is gone. Three icons sit in it -- ⚙ Settings/choice, ⓘ Info, ⚡ Actions -- each opening a small panel with
//     ← Back, ⛶ Full screen and ✕ (the panels hold what used to sprawl above the chapter list).
// Pure UI: the caller fills each pane, keeps the state in `oi` and re-renders through `localRefresh`.
import { t } from "./i18n.js";
import { HANDLES, handleCss, startDrag } from "./float-window.js";

const PANES = ["chapters", "hadiths", "text"];
const WIDTHS_KEY = "mmsa-hadith-reader-widths";
const LIMITS = { minW: 260, minH: 180, bar: 44 };
const PHONE_MQ = "(max-width: 720px)"; // the same breakpoint hadith.css uses for the one-pane layout
const isPhone = () => typeof matchMedia === "function" && matchMedia(PHONE_MQ).matches;
let cssDone = false;
let latestRefresh = null;
let mqBound = false;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function readWidths() {
  try {
    const w = JSON.parse(localStorage.getItem(WIDTHS_KEY) || "null");
    if (Array.isArray(w) && w.length === 2 && w.every((x) => Number.isFinite(x) && x >= 12 && x <= 60)) return w;
  } catch { /* storage blocked: the default widths */ }
  return [26, 30];
}

/** Removes every popped-out pane window (on each render of the reader, and when the view changes). */
export function removeReaderWindows() {
  for (const w of document.querySelectorAll(".hadith-pane-float")) w.remove();
}

/**
 * opts: { oi, localRefresh, titles: { chapters, hadiths, text }, chapters(body, head), hadiths(body, head), text(body, head) }
 * oi carries the reader's own state: phone (which pane a phone shows), max (the expanded pane), float ({ pane: rect }).
 */
export function hadithReader(opts) {
  const { oi, localRefresh, titles } = opts;
  if (!cssDone) {
    const style = document.createElement("style");
    style.textContent = handleCss("hadith-pane-h");
    document.head.appendChild(style);
    cssDone = true;
  }
  removeReaderWindows();
  latestRefresh = localRefresh;
  if (!mqBound && typeof matchMedia === "function") {
    mqBound = true; // crossing the phone breakpoint redraws the reader once, so the bar and the pane headings are rebuilt for the new layout
    matchMedia(PHONE_MQ).addEventListener("change", () => { if (document.querySelector(".hadith-reader")) latestRefresh?.(); });
  }
  const phone = isPhone();
  if (!PANES.includes(oi.phone)) oi.phone = oi.chapterId ? (oi.passageN != null ? "text" : "hadiths") : "chapters";
  if (!oi.float) oi.float = {};
  if (oi.max && oi.float[oi.max]) oi.max = null;

  const root = el("div", "hadith-reader");
  root.dataset.phone = oi.phone;

  const steps = el("div", "hadith-reader-steps");
  steps.setAttribute("role", "group");
  steps.setAttribute("aria-label", t("Show"));
  for (const key of PANES) {
    const b = el("button", `hadith-reader-step${oi.phone === key ? " on" : ""}`, titles[key]);
    b.type = "button";
    b.dataset.readerShow = key;
    b.setAttribute("aria-pressed", String(oi.phone === key));
    b.addEventListener("click", () => { oi.phone = key; localRefresh(); });
    steps.appendChild(b);
  }
  root.appendChild(steps);

  const grid = el("div", "hadith-reader-grid");
  const [c1, c2] = readWidths();
  grid.style.setProperty("--c1", `${c1}%`);
  grid.style.setProperty("--c2", `${c2}%`);
  if (oi.max) grid.dataset.max = oi.max;
  root.appendChild(grid);

  PANES.forEach((key, i) => {
    const pane = buildPane(key, opts, phone);
    if (oi.float[key]) {
      const stub = el("section", "hadith-pane hadith-pane-stub");
      stub.dataset.readerPane = key;
      const note = el("div", "hadith-pane-docked");
      note.appendChild(el("p", "hadith-note", t("This pane is open as a window.")));
      const back = el("button", "hadith-pane-putback", t("Put it back here"));
      back.type = "button";
      back.dataset.readerDock = key;
      back.addEventListener("click", () => { delete oi.float[key]; localRefresh(); });
      note.appendChild(back);
      stub.appendChild(note);
      grid.appendChild(stub);
      floatPane(key, pane, oi, localRefresh);
    } else {
      if (oi.max === key) pane.classList.add("is-max");
      grid.appendChild(pane);
    }
    if (i < 2) grid.appendChild(splitter(grid, i));
  });
  // ONE bar on a phone: the open pane's own buttons (and its tool icons) move into the Chapters | Hadith | Text row; the heading row is dropped.
  if (phone) {
    const head = grid.querySelector(`[data-reader-pane="${oi.phone}"] .hadith-pane-head`);
    if (head) {
      const tools = el("span", "hadith-reader-steps-tools");
      for (const c of [...head.children]) if (!c.classList.contains("hadith-pane-title")) tools.append(...(c.classList.contains("hadith-pane-tools") ? [...c.children] : [c]));
      steps.appendChild(tools);
      head.remove();
    }
  }
  return root;
}

const TOOL_ICONS = { choice: "⚙", info: "ⓘ", actions: "⚡" };

/** Which tool icons a pane carries: all three on Chapters (and, on a phone, on Hadith too, where the one bar is shared); only Info beside ‹ › on Text; none on a wide screen's other panes. */
function toolIdsFor(key, phone) {
  if (phone) return key === "text" ? ["info"] : ["choice", "info", "actions"];
  return key === "chapters" ? ["choice", "info", "actions"] : [];
}

function toolButton(def, opts) {
  const { oi, localRefresh } = opts;
  const on = oi.tool === def.id;
  const b = el("button", `hadith-pane-btn hadith-tool-btn${on ? " on" : ""}`, TOOL_ICONS[def.id]);
  b.type = "button";
  b.dataset.readerTool = def.id;
  b.title = def.label;
  b.setAttribute("aria-label", def.label);
  b.setAttribute("aria-expanded", String(on));
  b.addEventListener("click", () => {
    if (on) { oi.tool = null; oi.toolFull = false; if (oi.toolFrom) oi.phone = oi.toolFrom; oi.toolFrom = null; localRefresh(); return; }
    oi.toolFrom = oi.phone !== "chapters" ? oi.phone : (oi.toolFrom ?? null); // the way back: Back returns to the tab it was opened from
    oi.tool = def.id; oi.toolFull = false;
    oi.phone = "chapters"; // the panel lives at the top of the Chapters pane
    localRefresh();
  });
  return b;
}

/** The small panel a tool icon opens (inline at the top of the Chapters pane): ← Back, the name, ⛶ Full screen and ✕. */
function toolPanel(def, opts) {
  const { oi, localRefresh } = opts;
  const panel = el("section", `hadith-toolpanel${oi.toolFull ? " is-full" : ""}`);
  panel.dataset.toolPanel = def.id;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", def.label);
  const head = el("div", "hadith-toolpanel-head");
  const close = (back) => {
    oi.tool = null; oi.toolFull = false;
    if (back && oi.toolFrom) oi.phone = oi.toolFrom;
    oi.toolFrom = null; oi.toolFocus = def.id;
    localRefresh();
  };
  const backBtn = el("button", "hadith-pane-btn hadith-toolpanel-back", "←");
  backBtn.type = "button"; backBtn.dataset.toolBack = ""; backBtn.title = t("Back"); backBtn.setAttribute("aria-label", t("Back"));
  backBtn.addEventListener("click", () => close(true));
  const title = el("span", "hadith-toolpanel-title", def.label);
  const full = el("button", "hadith-pane-btn", oi.toolFull ? "⤡" : "⛶");
  full.type = "button"; full.dataset.toolFull = ""; full.title = oi.toolFull ? t("Back to three panes") : t("Full screen"); full.setAttribute("aria-label", full.title);
  full.setAttribute("aria-pressed", String(!!oi.toolFull));
  full.addEventListener("click", () => { oi.toolFull = !oi.toolFull; localRefresh(); });
  const x = el("button", "hadith-pane-btn", "✕");
  x.type = "button"; x.dataset.toolClose = ""; x.title = t("Close"); x.setAttribute("aria-label", t("Close"));
  x.addEventListener("click", () => close(false));
  head.append(backBtn, title, full, x);
  panel.appendChild(head);
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); } });
  const body = el("div", "hadith-toolpanel-body");
  panel.appendChild(body);
  def.render(body, { done: () => { oi.tool = null; oi.toolFull = false; oi.toolFrom = null; }, refresh: localRefresh });
  return panel;
}

function buildPane(key, opts, phone = false) {
  const { oi, localRefresh, titles } = opts;
  const toolDefs = opts.tools ?? [];
  const pane = el("section", "hadith-pane");
  pane.dataset.readerPane = key;
  pane.setAttribute("aria-label", titles[key]);
  const head = el("div", "hadith-pane-head");
  const title = el("span", "hadith-pane-title", titles[key]);
  title.title = titles[key]; // a narrow pane cuts its heading with large text (audit part 136 H2)
  head.appendChild(title);
  const tools = el("span", "hadith-pane-tools");
  for (const id of toolIdsFor(key, phone)) { const def = toolDefs.find((d) => d.id === id); if (def && !oi.float[key]) tools.appendChild(toolButton(def, opts)); }
  if (!oi.float[key] && !phone) {
    const maxed = oi.max === key;
    const max = el("button", "hadith-pane-btn", maxed ? "⤡" : "⤢");
    max.type = "button";
    max.dataset.readerMax = key;
    max.title = maxed ? t("Back to three panes") : t("Expand this pane");
    max.setAttribute("aria-label", max.title);
    max.setAttribute("aria-pressed", String(maxed));
    max.addEventListener("click", () => { oi.max = maxed ? null : key; localRefresh(); });
    const pop = el("button", "hadith-pane-btn", "⧉");
    pop.type = "button";
    pop.dataset.readerPop = key;
    pop.title = t("Pop out as a window");
    pop.setAttribute("aria-label", pop.title);
    pop.addEventListener("click", () => { oi.float[key] = defaultRect(key); if (oi.max === key) oi.max = null; localRefresh(); });
    tools.append(max, pop);
  } else if (oi.float[key]) {
    const close = el("button", "hadith-pane-btn", "✕");
    close.type = "button";
    close.dataset.readerDock = key;
    close.title = t("Put it back in its place");
    close.setAttribute("aria-label", close.title);
    close.addEventListener("click", () => { delete oi.float[key]; localRefresh(); });
    tools.appendChild(close);
  }
  head.appendChild(tools);
  pane.appendChild(head);
  const body = el("div", "hadith-pane-body");
  pane.appendChild(body);
  const openDef = key === "chapters" && oi.tool ? toolDefs.find((d) => d.id === oi.tool) : null;
  if (openDef) body.appendChild(toolPanel(openDef, opts));
  opts[key](body, head);
  if (oi.toolFocus) { // after a panel closes, focus goes back to the icon that opened it (way-back law)
    const id = oi.toolFocus; oi.toolFocus = null;
    queueMicrotask(() => setTimeout(() => document.querySelector(`[data-reader-tool="${id}"]`)?.focus(), 0));
  }
  return pane;
}

function defaultRect(key) {
  const i = PANES.indexOf(key);
  const w = Math.min(480, innerWidth - 16), h = Math.min(520, innerHeight - 80);
  return { x: Math.max(8, Math.min(40 + i * 48, innerWidth - w - 8)), y: Math.max(8, Math.min(80 + i * 40, innerHeight - h - 8)), w, h };
}

function floatPane(key, pane, oi, localRefresh) {
  const r = oi.float[key];
  const win = el("div", "hadith-pane-float");
  win.dataset.readerFloat = key;
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-label", pane.getAttribute("aria-label"));
  const place = () => Object.assign(win.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  const ctx = {
    getRect: () => ({ ...r }),
    setRect: (n) => { Object.assign(r, n); place(); },
    locked: () => false,
    limits: LIMITS,
    onEnd: () => {},
    dragClass: "hadith-pane-dragging",
  };
  const head = pane.querySelector(".hadith-pane-head");
  head.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", ctx); });
  for (const h of HANDLES) {
    const g = el("div", "hadith-pane-h");
    g.dataset.h = h;
    g.addEventListener("pointerdown", (e) => startDrag(e, h, ctx));
    win.appendChild(g);
  }
  win.appendChild(pane);
  win.addEventListener("pointerdown", () => {
    for (const w of document.querySelectorAll(".hadith-pane-float")) w.classList.remove("front");
    win.classList.add("front");
  });
  document.body.appendChild(win);
  place();
}

function splitter(grid, i) {
  const s = el("div", "hadith-splitter");
  s.dataset.readerSplit = String(i);
  s.setAttribute("role", "separator");
  s.setAttribute("aria-orientation", "vertical");
  s.setAttribute("aria-label", t("Drag to resize"));
  s.tabIndex = 0;
  const get = (v) => parseFloat(grid.style.getPropertyValue(v)) || 25;
  const save = () => { try { localStorage.setItem(WIDTHS_KEY, JSON.stringify([get("--c1"), get("--c2")])); } catch { /* not remembered */ } };
  const setPct = (pct) => {
    const c1 = get("--c1"), c2 = get("--c2");
    if (i === 0) grid.style.setProperty("--c1", `${Math.max(12, Math.min(pct, 100 - c2 - 20))}%`);
    else grid.style.setProperty("--c2", `${Math.max(12, Math.min(pct - c1, 100 - c1 - 20))}%`);
  };
  s.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    try { s.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    s.classList.add("drag");
    const box = grid.getBoundingClientRect();
    const move = (ev) => setPct(((ev.clientX - box.left) / box.width) * 100);
    const up = () => {
      s.classList.remove("drag");
      s.removeEventListener("pointermove", move);
      s.removeEventListener("pointerup", up);
      s.removeEventListener("pointercancel", up);
      save();
    };
    s.addEventListener("pointermove", move);
    s.addEventListener("pointerup", up);
    s.addEventListener("pointercancel", up);
  });
  s.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const d = e.key === "ArrowRight" ? 2 : -2;
    setPct(i === 0 ? get("--c1") + d : get("--c1") + get("--c2") + d);
    save();
  });
  return s;
}
