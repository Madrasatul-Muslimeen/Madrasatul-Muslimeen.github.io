// Keyboard behaviour of a modal dialog (audit part 32, PCF MSA J29): Tab stays inside it, and closing it puts focus back on the
// control that opened it. Firebase-free, imports nothing.
//   const release = trapModal(rootElement);   // on open
//   release();                                // on close (any way it closes)
// The control that opened it is whatever had focus when trapModal() ran. If that control is gone or hidden by then (a ⋯ menu item
// whose menu closed first), focus goes to the ⋯ button of the menu it sat in.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";

export function trapModal(root) {
  const opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  const menuButton = opener?.closest?.("[data-bar-palette-wrap]")?.querySelector("[data-bar-palette-toggle]") ?? null;
  const onKeydown = (e) => {
    if (e.key !== "Tab" || !root.isConnected) return;
    const items = [...root.querySelectorAll(FOCUSABLE)].filter(shown);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], a = document.activeElement;
    if (!root.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKeydown, true);
  let done = false;
  return function release() {
    if (done) return;
    done = true;
    document.removeEventListener("keydown", onKeydown, true);
    const back = [opener, menuButton].find((e) => e && e.isConnected && shown(e));
    if (back) back.focus({ preventScroll: true });
  };
}
