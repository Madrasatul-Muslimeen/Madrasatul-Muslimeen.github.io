// The shared "My account" card (Owner decision 40, round 1).
//
// The Owner, 30 Sep 2026: "Tenant info should not be here. It should be under
// Home, under a new button with user account card info (build full thing
// later)." So the Tenant and Person pickers no longer sit on their own line
// at the top of a page; they live in this card, opened from Home -> 👤 My
// account.
//
// MOVE, DON'T REBUILD. mountAccountCard() takes the page's EXISTING rows (the
// <label> holding #tenantSelect and the one holding #personSelect) and moves
// those very nodes into the card. Every `change` listener the page already
// attached to the <select>s therefore keeps working untouched, and the ids
// stay unique. No Firestore read happens here (I9): the name, email, tenant
// and roles are handed in by the page from what it already holds.
//
// nav.js stays a pure renderer: it only emits a button carrying
// `data-open-account-card`. That button is re-rendered whenever the page
// re-renders its nav, so the click is delegated from the document rather than
// bound to the button itself.
import { t } from "./i18n.js";

const STYLE_ID = "accountCardStyle";
const CSS = `
#accountCardOverlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 960; }
#accountCardOverlay.open { display: block; }
.account-sheet { position: fixed; left: 0; right: 0; bottom: 0; top: 0; height: 100%; overflow-y: auto;
  background: var(--card-bg, #fff); color: var(--card-text, #222); box-shadow: var(--card-shadow, none);
  padding: 0 0.8rem 1rem; font-family: inherit; box-sizing: border-box; }
.account-sheet-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between;
  background: var(--card-bg, #fff); padding: 0.5rem 0.2rem 0.4rem; border-bottom: 1px solid var(--card-line, #ddd); margin-bottom: 0.6rem; }
.account-sheet-title { font-weight: 600; color: var(--card-heading, #1f3a6e); font-size: 1rem; }
.account-sheet-close { background: none; border: none; color: var(--card-text-muted, #555); font-size: 1.5rem; line-height: 1;
  min-width: 40px; min-height: 40px; padding: 0.2rem 0.5rem; cursor: pointer; }
.account-sheet-close:focus-visible { outline: 2px solid var(--card-link, #1f3a6e); outline-offset: 2px; }
.account-sheet dl { margin: 0 0 0.8rem; display: grid; grid-template-columns: auto 1fr; gap: 0.3rem 0.8rem; font-size: 0.9rem; }
.account-sheet dt { color: var(--card-text-muted, #555); }
.account-sheet dd { margin: 0; overflow-wrap: anywhere; color: var(--card-text, #222); }
.account-sheet-pickers { display: flex; flex-direction: column; gap: 0.7rem; margin: 0 0 0.9rem; }
.account-sheet-pickers label { display: flex; flex-direction: column; gap: 0.25rem; margin: 0; font-size: 0.85rem; color: var(--card-text, #222); }
.account-sheet-pickers select { width: 100% !important; max-width: 100%; min-width: 0; box-sizing: border-box; min-height: 40px;
  background: var(--card-bg-inset, #fff); color: var(--card-text, #222); border: 1px solid var(--card-line, #ccc); }
.account-sheet-later { border: 1px dashed var(--card-line, #ccc); border-radius: 0.5rem; padding: 0.6rem 0.7rem;
  font-size: 0.8rem; color: var(--card-text-muted, #555); }
@media (min-width: 900px) {
  #accountCardOverlay.open { display: flex; align-items: center; justify-content: center; }
  .account-sheet { position: relative; inset: auto; width: 26rem; max-width: 92vw; height: auto; max-height: 82vh; border-radius: 14px; padding-top: 0.5rem; }
}
`;

function el(tag, attrs, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

/**
 * tenantRow / personRow: the existing <label> elements (personRow may be null).
 * getSummary(): () => ({ name, email, tenantName, roles }) read from what the page holds.
 * contextBar: the now-empty row to hide (optional).
 */
export function mountAccountCard({ tenantRow, personRow = null, getSummary = () => ({}), contextBar = null } = {}) {
  if (!document.getElementById(STYLE_ID)) {
    const s = el("style", { id: STYLE_ID });
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const overlay = el("div", { id: "accountCardOverlay" });
  const sheet = el("div", { class: "account-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "accountCardTitle" });
  const header = el("div", { class: "account-sheet-header" });
  header.appendChild(el("span", { class: "account-sheet-title", id: "accountCardTitle" }, t("My account")));
  const close = el("button", { type: "button", class: "account-sheet-close", "aria-label": t("Close"), title: t("Close"), id: "accountCardClose" }, "✕");
  header.appendChild(close);
  const facts = el("dl", { id: "accountCardFacts" });
  const pickers = el("div", { class: "account-sheet-pickers", id: "accountCardPickers" });
  const later = el("div", { class: "account-sheet-later", id: "accountCardLater" }, t("More account details will appear here later."));
  sheet.append(header, facts, pickers, later);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Move the real nodes, never copies.
  if (tenantRow) pickers.appendChild(tenantRow);
  if (personRow) pickers.appendChild(personRow);
  if (contextBar && !contextBar.querySelector("label, select")) contextBar.hidden = true;

  function fillFacts() {
    const s = getSummary() || {};
    facts.textContent = "";
    const rows = [
      [t("Name"), s.name],
      [t("Email"), s.email],
      [t("Tenant"), s.tenantName],
      [t("Roles"), s.roles],
    ];
    for (const [k, v] of rows) {
      if (!v) continue;
      facts.appendChild(el("dt", {}, k));
      facts.appendChild(el("dd", {}, v));
    }
  }

  let opener = null;
  function open(from) {
    opener = from || null;
    fillFacts();
    overlay.classList.add("open");
    close.focus();
  }
  function shut() {
    overlay.classList.remove("open");
    if (opener && opener.isConnected) opener.focus();
    opener = null;
  }
  close.addEventListener("click", shut);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) shut(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) shut(); });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-open-account-card]");
    if (!btn) return;
    // The Home <details> closes behind the card.
    const home = btn.closest("details");
    if (home) home.open = false;
    open(btn);
  });
  return { open, close: shut, overlay };
}
