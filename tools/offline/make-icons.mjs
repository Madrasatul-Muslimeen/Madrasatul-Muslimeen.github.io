// PCF MSA J120 O1 ("Install MSA"): draws the app's install icons.
//   node tools/offline/make-icons.mjs
//   node tools/offline/make-icons.mjs --app=qr   (PCA J117: QR's own install icons, into QR's overlay folder)
//   node tools/offline/make-icons.mjs --app=hadith|dua|health   (PCA J117: each module's own install, msa.json "ownInstalls")
// Writes app/img/icons/msa-192.png, msa-512.png and msa-maskable-512.png. A calm
// icon: the app's night navy, an open-book mark and the letters "MMSA" (PCA J118 rename; was "MSA") in the
// app's gold. The maskable one fills its square and keeps the mark inside the
// middle 80% (the "safe zone" a phone may crop to a circle). Re-run only when
// the design changes; the PNGs are committed.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const APP = (process.argv.find((a) => a.startsWith("--app=")) || "--app=msa").slice(6);
// PCA J117 (the Owner, 16 Nov 2026: "Enable Hadith, Health, Dua also separately installable"): each module's own
// colours and name, the same book mark and gold, so the four icons read as one family on a phone.
const MODULES = {
  hadith: { dark: "#0f2e22", light: "#1d6b45", label: "Hadith" },
  dua: { dark: "#231a45", light: "#4b3a8c", label: "Dua" },
  health: { dark: "#0e2f42", light: "#1e6f8f", label: "Health" },
};
if (!["msa", "qr", ...Object.keys(MODULES)].includes(APP)) { console.error(`unknown --app=${APP} (msa, qr, ${Object.keys(MODULES).join(", ")})`); process.exit(2); }
const MOD = MODULES[APP];
// QR's icons are QR's own files: they live in its overlay (apps/qr/site), never in MSA's app/.
const OUT = path.join(process.cwd(), APP === "qr" ? "apps/qr/site/app/img/icons" : "app/img/icons");
if (!fs.existsSync(path.join(process.cwd(), "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

// MSA: night navy and gold. QR: its own teal (qr.json colours.theme #0f4c4c) and the same gold.
const NAVY = MOD ? MOD.dark : APP === "qr" ? "#0d2225" : "#1B2A41", NAVY_2 = MOD ? MOD.light : APP === "qr" ? "#0f4c4c" : "#1F3A6E", GOLD = "#e2bd62";
const LABEL = MOD ? MOD.label : APP === "qr" ? "QR" : "MMSA";
// A longer word gets a smaller letter so it stays inside the icon (and the maskable safe zone): "Health" at 104px is ~400px wide.
const FONT = LABEL.length <= 3 ? 104 : LABEL.length <= 4 ? 96 : 80, SPACING = LABEL.length <= 3 ? 6 : 2;
// One SVG, drawn on a 512 grid. `inset` shrinks the mark for the maskable icon.
const svg = ({ rounded, inset }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><radialGradient id="g" cx="50%" cy="20%" r="85%"><stop offset="0" stop-color="${NAVY_2}"/><stop offset="1" stop-color="${NAVY}"/></radialGradient></defs>
  <rect width="512" height="512" rx="${rounded ? 96 : 0}" fill="url(#g)"/>
  <g transform="translate(256 256) scale(${inset}) translate(-256 -256)">
    <path d="M256 150 C 214 128, 156 124, 112 134 L 112 300 C 156 290, 214 294, 256 316 Z" fill="none" stroke="${GOLD}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M256 150 C 298 128, 356 124, 400 134 L 400 300 C 356 290, 298 294, 256 316 Z" fill="none" stroke="${GOLD}" stroke-width="14" stroke-linejoin="round"/>
    <line x1="256" y1="150" x2="256" y2="316" stroke="${GOLD}" stroke-width="10"/>
    <text x="256" y="410" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-weight="700" font-size="${FONT}" letter-spacing="${SPACING}" fill="${GOLD}">${LABEL}</text>
  </g>
</svg>`;

const ICONS = [
  { file: `${APP}-192.png`, size: 192, rounded: true, inset: 1 },
  { file: `${APP}-512.png`, size: 512, rounded: true, inset: 1 },
  { file: `${APP}-maskable-512.png`, size: 512, rounded: false, inset: 0.78 },
  ...(APP !== "msa" ? [{ file: `${APP}-apple-touch-icon.png`, size: 180, rounded: false, inset: 1 }] : []), // iPhone rounds it itself
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
for (const ic of ICONS) {
  await page.setViewportSize({ width: ic.size, height: ic.size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${ic.size}px;height:${ic.size}px">${svg(ic).replace('width="512" height="512"', `width="${ic.size}" height="${ic.size}"`)}</div></body></html>`);
  await page.screenshot({ path: path.join(OUT, ic.file), omitBackground: true, clip: { x: 0, y: 0, width: ic.size, height: ic.size } });
  console.log(`wrote ${path.relative(process.cwd(), path.join(OUT, ic.file))} (${ic.size}x${ic.size})`);
}
await browser.close();
