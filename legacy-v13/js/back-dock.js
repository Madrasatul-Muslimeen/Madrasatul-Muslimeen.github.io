// The Owner, 8 Oct 2026 (a phone screenshot of the Read view with the floating "← Back to QuranRevival" chip lying
// over the Study menu): "Not a proper place for back button, right? May be beside the tick button."
//
// A page marks a place for its way back with [data-back-dock] (the Qur'an page: a slot just before ✓ on the Read
// bar). Whenever that place is on screen, a floating Back chip sits there, in the page's own row; when it is not
// (another view, the bar hidden in full screen), the chip floats as before, so the way back is never lost
// (decision 86). Pure UI: no Firebase, no storage.

/** The first marked place whose own row is on screen, or null. The slot itself may be empty and so take no room,
 *  which is why its PARENT is what has to be showing. */
export function backDock(doc = document) {
  for (const d of doc.querySelectorAll("[data-back-dock]")) {
    const host = d.parentElement;
    if (!host || d.closest("[hidden]")) continue;
    if (!host.getClientRects().length || getComputedStyle(host).visibility === "hidden") continue;
    return d;
  }
  return null;
}

/**
 * Put `el` in the marked place if one is showing (adds `dockedClass`), or back on `document.body` if it had been
 * docked. Returns true when docked. Moving only when the place changes keeps it idempotent, so a page-wide
 * MutationObserver may call it on every change without looping.
 */
export function placeInDock(el, dockedClass) {
  const dock = backDock(el.ownerDocument || document);
  if (dock) {
    if (el.parentElement !== dock) dock.appendChild(el);
    el.classList.add(dockedClass);
    return true;
  }
  if (el.classList.contains(dockedClass)) {
    el.classList.remove(dockedClass);
    document.body.appendChild(el);
  }
  return false;
}
