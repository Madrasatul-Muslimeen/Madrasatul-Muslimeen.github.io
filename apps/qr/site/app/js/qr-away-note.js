// QR J02 S1e (QR-only): the calm one-time note before a reader first leaves QR for a page whose home is MMSA (Notes,
// Bookmarks and the others; PCA J71). Sign-in is per site address, and QR cannot add words to MMSA's pages, so it says
// it here, once: Continue goes on, Cancel stays. Shown once per device (localStorage, marked when it shows), in the reader's language.
// Used by qr-links.js (a tapped link) and the site's 404.html (a page opened by script).
import { AWAY_NOTE_KEY } from "./qr-links.js";

const TEXT = {
  en: {
    body: "This opens in the Madrasah app. If it asks, sign in once with the same Google account; your notes are the same.",
    go: "Continue",
    stay: "Cancel",
  },
  bn: {
    body: "এটি মাদ্রাসা অ্যাপে খুলবে। জিজ্ঞেস করলে একই Google অ্যাকাউন্ট দিয়ে একবার সাইন ইন করুন; আপনার নোটগুলো একই থাকবে।",
    go: "চালিয়ে যান",
    stay: "বাতিল",
  },
};

const CSS = `
#qrAwayNote { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(8, 18, 20, 0.55); }
#qrAwayNote .qan-card { max-width: 26rem; width: 100%; box-sizing: border-box; padding: 20px 20px 16px; border-radius: 16px;
  background: #fffdf7; color: #1d2b2c; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
  font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif; }
#qrAwayNote p { margin: 0 0 16px; }
#qrAwayNote .qan-row { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
#qrAwayNote button { min-height: 44px; min-width: 96px; padding: 0 16px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; }
#qrAwayNote .qan-stay { background: transparent; color: #0f5c5c; border: 1px solid #c9c1ad; }
#qrAwayNote .qan-go { background: #0f5c5c; color: #fff; border: 1px solid #0f5c5c; }
#qrAwayNote button:focus-visible { outline: 3px solid #d8b25a; outline-offset: 2px; }
`;

/** Shows the note (once per device). Resolves true for Continue (or when it was already shown), false for Cancel. */
export function showAwayNote() {
  try { if (localStorage.getItem(AWAY_NOTE_KEY) === "1") return Promise.resolve(true); } catch { /* storage blocked: show it */ }
  if (document.getElementById("qrAwayNote")) return Promise.resolve(false);
  let lang = "en";
  try { if (localStorage.getItem("mm_app_lang") === "bn") lang = "bn"; } catch { /* English */ }
  const tx = TEXT[lang];
  const style = document.createElement("style");
  style.textContent = CSS;
  const box = document.createElement("div");
  box.id = "qrAwayNote";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-describedby", "qrAwayNoteBody");
  box.lang = lang;
  box.innerHTML = `<div class="qan-card"><p id="qrAwayNoteBody"></p><div class="qan-row">
    <button type="button" class="qan-stay"></button><button type="button" class="qan-go"></button></div></div>`;
  box.querySelector("p").textContent = tx.body;
  box.querySelector(".qan-stay").textContent = tx.stay;
  box.querySelector(".qan-go").textContent = tx.go;
  const before = document.activeElement;
  try { localStorage.setItem(AWAY_NOTE_KEY, "1"); } catch { /* storage blocked: it may show again */ }
  document.head.appendChild(style);
  document.body.appendChild(box);
  box.querySelector(".qan-go").focus();
  return new Promise((resolve) => {
    const close = (go) => {
      box.remove();
      style.remove();
      document.removeEventListener("keydown", onKey, true);
      if (!go) before?.focus?.();
      resolve(go);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); close(false); } };
    document.addEventListener("keydown", onKey, true);
    box.querySelector(".qan-go").addEventListener("click", () => close(true));
    box.querySelector(".qan-stay").addEventListener("click", () => close(false));
    box.addEventListener("click", (e) => { if (e.target === box) close(false); });
  });
}
