// The Hadith Books reader (PCF MSA J106; the Owner, 28 Oct 2026, demo approved 1A 2A 3A 4A): three panes side by
// side -- Chapters | the chapter's hadith | the hadith's text -- like the Siyagah notebook.
//   - The two dividers drag to resize (and take the arrow keys); the widths are remembered on this device.
//   - ⤢ expands one pane over the reader; ⤡ brings the three back.
//   - ⧉ pops a pane out as a window that moves by its title bar and resizes from every side and corner (the app's
//     own float-window.js, as the Mapping My Journey tray and the Note windows use); ✕ puts it back in its place.
//   - On a phone (answer 2A) one pane shows at a time, with Chapters › Hadith › Text buttons above it.
// Pure UI: the caller fills each pane, keeps the state in `oi` and re-renders through `localRefresh`.
import { t } from "./i18n.js";
import { HANDLES, handleCss, startDrag } from "./float-window.js";

const PANES = ["chapters", "hadiths", "text"];
const WIDTHS_KEY = "mmsa-hadith-reader-widths";
const LIMITS = { minW: 260, minH: 180, bar: 44 };
let cssDone = false;

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
    const pane = buildPane(key, opts);
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
  return root;
}

function buildPane(key, opts) {
  const { oi, localRefresh, titles } = opts;
  const pane = el("section", "hadith-pane");
  pane.dataset.readerPane = key;
  pane.setAttribute("aria-label", titles[key]);
  const head = el("div", "hadith-pane-head");
  head.appendChild(el("span", "hadith-pane-title", titles[key]));
  const tools = el("span", "hadith-pane-tools");
  if (!oi.float[key]) {
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
  } else {
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
  opts[key](body, head);
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
