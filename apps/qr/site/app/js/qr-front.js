// QR J02 S4 (QR-only): QR's front page (index.html at the site's address and app/index.html, the same file).
// Language and look use MMSA's own prefs.js (keys mm_app_lang and mm_card_look), so the choice made here is the one
// Quran Study, Asma and LDOG open in. No sign-in on this page. It also registers QR's one worker (the same call as
// Asma's pages), so the copied pages are ready and saved for offline use by the time a card is tapped.
// Rule kept from MMSA: plain Bangla text only, never an HTML entity in a Bangla value.
import { getAppLang, setAppLang, getCardLook, setCardLook } from "./prefs.js";
import { APP_VERSION } from "./qr-version.js";
import { registerQrServiceWorker } from "./qr-sw-register.js";

const TEXT = {
  en: {
    lead: "Study the Quran, the Names of Allah and your Deen, a little every day.",
    "Quran Study": "Quran Study",
    quranText: "Read, listen and keep track of your study, surah by surah. Sign in to keep your progress.",
    "Asma ul Husna": "Asma ul Husna",
    asmaText: "The 99 Names of Allah, with their meanings. No sign-in.",
    "Learn Deen On-the-Go": "Learn Deen On-the-Go",
    ldogText: "A short daily habit of learning your Deen, wherever you are.",
    full: "The full Madrasah:",
    Night: "Night", Light: "Light", Language: "Language", "Card look": "Card look",
    version: "Version {v}",
  },
  bn: {
    lead: "প্রতিদিন একটু একটু করে কুরআন, আল্লাহর নামসমূহ ও আপনার দ্বীন শিখুন।",
    "Quran Study": "কুরআন অধ্যয়ন",
    quranText: "সূরা ধরে ধরে পড়ুন, শুনুন ও আপনার অধ্যয়নের হিসাব রাখুন। অগ্রগতি রাখতে সাইন ইন করুন।",
    "Asma ul Husna": "আসমাউল হুসনা",
    asmaText: "আল্লাহর ৯৯টি নাম, অর্থসহ। সাইন ইন লাগে না।",
    "Learn Deen On-the-Go": "চলার পথে দ্বীন শিক্ষা",
    ldogText: "যেখানেই থাকুন, প্রতিদিন অল্প সময়ে দ্বীন শেখার অভ্যাস।",
    full: "পূর্ণ মাদ্রাসা:",
    Night: "রাত", Light: "হালকা", Language: "ভাষা", "Card look": "কার্ডের রূপ",
    version: "সংস্করণ {v}",
  },
};

function paint() {
  const lang = getAppLang() === "bn" ? "bn" : "en";
  const tx = (k) => TEXT[lang][k] ?? TEXT.en[k] ?? k;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = tx(el.dataset.t); });
  document.querySelectorAll("[data-t-label]").forEach((el) => { el.setAttribute("aria-label", tx(el.dataset.tLabel)); });
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll("[data-look]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === getCardLook())));
  document.getElementById("qfVersion").textContent = tx("version").replace("{v}", APP_VERSION);
}

document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => { setAppLang(b.dataset.lang); paint(); }));
document.querySelectorAll("[data-look]").forEach((b) => b.addEventListener("click", () => { setCardLook(b.dataset.look); paint(); }));
paint();

// After the page is drawn, never before (as MMSA's sw-register.js). No note here: an update shows on the app's pages.
// On QR's ADDRESS itself (not /app/index.html, the same file), also the tiny /root-sw.js, so the address opens offline; only
// once the app's own worker registered, so the kill switches (which unregister every worker) cover both.
addEventListener("load", () => {
  registerQrServiceWorker().then((reg) => {
    if (reg && ["/", "/index.html"].includes(location.pathname)) navigator.serviceWorker.register("/root-sw.js", { scope: "/" }).catch(() => {});
  });
}, { once: true });
