// PCF MSA J112 -- THE MAP'S HOOK FOR SIYAGAH'S MAPPING MY JOURNEY
//
// journey-map.html calls mountSiyagahMapLink() once MSA's own sign-in has loaded the page. With the switch off
// (siyagah-cloud-readiness.js, OFF until Siyagah's R1 is live) it returns at once: no element is added, nothing is
// loaded, and the Map is exactly as before.
//
// With the switch on it adds ONE bar above the folders: "Siyagah's Mapping My Journey", whether this device is signed
// in to Siyagah, and a Connect / Disconnect button. Firebase's code for Siyagah loads here, when the Map opens -- never
// at the app's startup (I9). A failed sign-in is said in the bar, never only in the console (I15).
// Siyagah's folders and notes join this bar when R1's API arrives.
import { isSiyagahCloudReady, SIYAGAH_CLOUD_DECLARATION } from "./siyagah-cloud-readiness.js";
import { t } from "./i18n.js";

export const SIYAGAH_BAR_ID = "siyagahCloudBar";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * Mount the bar before `beforeEl` (the Map's #noteLayout). Returns the bar, or null when the switch is off.
 * `email` is the reader's MSA sign-in, offered to Google as the account to use.
 */
export async function mountSiyagahMapLink({ beforeEl, email = "", declaration = SIYAGAH_CLOUD_DECLARATION } = {}) {
  if (!isSiyagahCloudReady(declaration)) return null;
  if (!beforeEl || !beforeEl.parentNode) return null;
  let bar = document.getElementById(SIYAGAH_BAR_ID);
  if (!bar) {
    bar = document.createElement("section");
    bar.id = SIYAGAH_BAR_ID;
    bar.className = "siyagah-cloud-bar";
    bar.setAttribute("aria-live", "polite");
    bar.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:0 0 10px; padding:8px 10px; border:1px solid #c9d3e0; border-radius:8px; background:#f5f8fc; color:#1d2b3a;";
    beforeEl.parentNode.insertBefore(bar, beforeEl);
  }
  const say = (statusHtml, button) => {
    bar.innerHTML = `<strong style="flex:0 1 auto; min-width:0; overflow-wrap:anywhere;">${escapeHtml(t("Siyagah's Mapping My Journey"))}</strong>`
      + `<span data-siyagah-status style="flex:1 1 12em; min-width:0; overflow-wrap:anywhere;">${statusHtml}</span>`
      + (button ? `<button type="button" data-siyagah-action="${button.action}" style="flex:0 0 auto; max-width:100%; min-height:40px; padding:0 14px;">${escapeHtml(button.label)}</button>` : "");
  };
  say(escapeHtml(t("Opening…")), null);

  let cloud, mod;
  try {
    mod = await import("./siyagah-cloud.js");
    cloud = await mod.openSiyagahCloud({ declaration });
  } catch (err) {
    console.error(err);
    say(escapeHtml(t("Siyagah could not be reached: {reason}", { reason: err?.message || String(err) })), { action: "retry", label: t("Try again") });
    bar.querySelector("[data-siyagah-action]").addEventListener("click", () => location.reload());
    return bar;
  }
  mod.onSiyagahUser(cloud, (user) => {
    if (user) {
      say(escapeHtml(t("Connected as {email}. Your Siyagah folders will show here once Siyagah's part is ready.", { email: user.email || "" })), { action: "out", label: t("Disconnect") });
      bar.querySelector("[data-siyagah-action]").addEventListener("click", () => mod.siyagahSignOut(cloud).catch((err) => {
        console.error(err);
        say(escapeHtml(t("Could not disconnect: {reason}", { reason: err?.message || String(err) })), null);
      }));
    } else {
      offerConnect(escapeHtml(t("Not connected on this device.")));
    }
  });
  function offerConnect(statusHtml) {
    say(statusHtml, { action: "in", label: t("Connect") });
    bar.querySelector("[data-siyagah-action]").addEventListener("click", () => mod.siyagahSignIn(cloud, { email }).catch((err) => {
      console.error(err);
      offerConnect(escapeHtml(t("Could not connect: {reason}", { reason: err?.message || String(err) })));
    }));
  }
  return bar;
}
