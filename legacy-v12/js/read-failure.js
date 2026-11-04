// Audit part 125 (PCF MSA J29): what a shared page says when it is waiting for its data, or could not get it.
// I15 is about writes; a READ that is slow or fails must still tell the reader what happened and what to do:
//   * while the first read is on its way: "Loading…" in words (not a blank area);
//   * when it fails: plain words, a "Try again" button (40px+) that re-runs the read, and the raw code only as a small
//     "Ref:" line. The page never sits on a raw error string.
// Additive: one status block placed just above #app; no stored field, no change to what is read at startup.
import { t } from "./i18n.js";

const ID = "qr-read-status";

function host() {
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ID;
    el.setAttribute("role", "status");
    el.style.cssText = "margin:10px 0;";
    const app = document.getElementById("app");
    if (app && app.parentNode) app.parentNode.insertBefore(el, app);
    else document.body.insertBefore(el, document.body.firstChild);
  }
  return el;
}

export function clearReadStatus() {
  const el = document.getElementById(ID);
  if (el) el.remove();
}

export function showReadLoading() {
  const el = host();
  el.removeAttribute("data-read-failed");
  el.innerHTML = "";
  const p = document.createElement("p");
  p.setAttribute("data-read-loading", "");
  p.style.cssText = "margin:0;padding:8px 0;color:#445;font-size:.95rem;";
  p.textContent = t("Loading…");
  el.appendChild(p);
}

// retry: () => Promise -- re-runs the read. A rejection shows the message again; success clears it.
export function showReadFailure(err, retry) {
  const el = host();
  el.setAttribute("data-read-failed", "");
  el.innerHTML = "";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff4e0;color:#4a2f00;border:1px solid #d9a441;border-radius:10px;padding:12px 14px;line-height:1.45;font-size:.95rem;";
  const msg = document.createElement("p");
  msg.setAttribute("data-read-failed-msg", "");
  msg.style.cssText = "margin:0 0 10px;";
  msg.textContent = t("This page could not load its data. Please check your connection and try again.");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-read-retry", "");
  btn.textContent = t("Try again");
  btn.style.cssText = "min-height:44px;min-width:120px;padding:8px 18px;font-size:1rem;border-radius:8px;border:1px solid #8a5a00;background:#fff;color:#4a2f00;cursor:pointer;";
  box.append(msg, btn);
  const code = err && (err.code || err.message) ? String(err.code || err.message) : "";
  if (code) {
    const ref = document.createElement("p");
    ref.setAttribute("data-read-ref", "");
    ref.style.cssText = "margin:10px 0 0;font-size:.75rem;opacity:.8;";
    ref.textContent = t("Ref: {code}", { code: code.slice(0, 80) });
    box.appendChild(ref);
  }
  el.appendChild(box);
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    msg.textContent = t("Loading…");
    try { await retry(); clearReadStatus(); }
    catch (e) { console.error(e); showReadFailure(e, retry); }
  });
}
