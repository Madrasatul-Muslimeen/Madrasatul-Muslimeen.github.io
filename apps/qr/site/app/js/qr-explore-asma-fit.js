// QR J02 S4c (QR-only): Quran Study's Explore → Asma ul Husna wheel (the copied quranrevival.html) gets the same
// label fit as QR's Asma app (asma-wheel-fit.js), without editing the copied page or mastery-wheel.js.
// The owner's QR J01 Q3 = A: keep the wording, let it wrap. MMSA's wrapWheelLabel() caps a title at 2 lines, so a long
// group title ("All Knowledgeable, All Encompassing, Watches, Hears everything") runs past its slice. After each
// render of the wheel (and again once the fonts are in, and when the reader changes the wheel's text size):
//   - the Groups wheel: each slice's title is wrapped again into 1 to 4 balanced lines (chooseSliceLines), every word kept;
//   - every Asma wheel there (Groups and a group's Names): a label still reaching outside its slice is shrunk about its
//     own centre until it fits (fitWheelLabels).
// Started by app/js/qr-copied-page.js, which app/sw.js adds to each copied page as it serves it.
import { chooseSliceLines, fitWheelLabels } from "./asma-wheel-fit.js";

const LINE_EM = 1.2; // renderScopedWheel's sliceLineHeightEm

/** Re-wraps the Groups wheel's titles and fits every label of `svg` inside its own slice. */
export function fitExploreAsmaWheel(svg) {
  if (!svg?.isConnected) return;
  const segs = [...svg.querySelectorAll("path.wheel-seg")];
  const n = segs.length;
  if (!n) return;
  const per = 360 / n;
  for (const el of svg.querySelectorAll("text.wheel-seg-label")) {
    if (el.querySelector("tspan.wheel-seg-label-ar")) continue; // a Names wheel: its lines stay as drawn (only fitted below)
    const x = Number(el.getAttribute("x")), y = Number(el.getAttribute("y"));
    const mid = ((Math.atan2(y - 180, x - 180) * 180) / Math.PI + 90 + 360) % 360;
    const i = Math.min(n - 1, Math.floor(mid / per));
    const title = (el.dataset.qrTitle ??= segs[i]?.querySelector("title")?.textContent.trim() ?? el.textContent.trim());
    const cs = getComputedStyle(el);
    const lines = chooseSliceLines(title, i, n, { labelPx: parseFloat(cs.fontSize) || 9.1, labelFont: cs.fontFamily });
    const firstDy = -((lines.length - 1) / 2) * LINE_EM;
    el.replaceChildren(...lines.map((line, li) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      t.setAttribute("x", String(x));
      t.setAttribute("dy", `${li === 0 ? firstDy : LINE_EM}em`);
      t.textContent = line;
      return t;
    }));
  }
  fitWheelLabels(svg);
}

let started = false;
/** Watches Explore's Asma wheel container: every new wheel drawn there is fitted. */
export function startExploreAsmaFit() {
  const box = document.getElementById("asmaXWheelContainer");
  if (started || !box) return;
  started = true;
  const fit = () => {
    const svg = box.querySelector("svg.mastery-wheel");
    if (!svg) return;
    fitExploreAsmaWheel(svg);
    document.fonts?.ready.then(() => fitExploreAsmaWheel(svg));
  };
  new MutationObserver(fit).observe(box, { childList: true });
  // The wheel's text-size control (asma-wheel-text.js) changes CSS variables on <html>, without drawing the wheel again.
  new MutationObserver(() => requestAnimationFrame(fit)).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  fit();
}
