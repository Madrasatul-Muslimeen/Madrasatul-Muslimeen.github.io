// QR J02 S4c (QR-only): the one QR module each page copied from MMSA runs. app/sw.js adds it to the page as it serves
// it (the copied files stay unchanged). It starts:
//   - qr-links.js: the links to pages QR does not hold (J02 S4);
//   - qr-explore-asma-fit.js: on Quran Study, Explore → Asma ul Husna's wheel labels kept inside their slices (J02 S4c).
import { startQrLinks } from "./qr-links.js";

startQrLinks();
if (document.getElementById("asmaXWheelContainer")) {
  import("./qr-explore-asma-fit.js").then((m) => m.startExploreAsmaFit()).catch((err) => console.warn("Asma wheel fit not started:", err.message));
}
