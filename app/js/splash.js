// Shell round 2 (8 Aug 2026) — splash screens, ported faithfully from
// index.html's mm-splash-overlay (boot) and mm-quran-splash-overlay
// (Quran-entry brand card): same content, same timing, same "show this
// opener: Every time / Once a day / Once a week" preference panel.
//
// Two call sites, same distinction the old app made:
//   showBootSplash()  — app/index.html, on first load (the old app showed
//                        this before/independent of sign-in; same here).
//   showQuranSplash() — app/quranrevival.html, on load. The old app fired
//                        this on every SPA tab-switch into Quran; this is a
//                        multi-page site, not an SPA, so every real page
//                        load of quranrevival.html IS the equivalent
//                        "entering the Quran module" moment.
//
// I2: shared UI, not a data renderer, never touches Firebase — only
// localStorage, the same client-only, per-browser preference the old app
// used (not synced, not tenant-scoped).
//
// The old app duplicated the daily/weekly pref logic once per splash under
// different key prefixes (mm_splash_* / mm_qs_splash_*); this shares one
// implementation, parameterized by key, instead — same behaviour, no
// content or timing difference from what's on record.

function pad2(n) { return n < 10 ? `0${n}` : `${n}`; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function makePrefStore(prefKey, lastKey) {
  function getPref() {
    try { return localStorage.getItem(prefKey) || "always"; } catch { return "always"; }
  }
  function setPref(v) {
    try { localStorage.setItem(prefKey, v); } catch { /* storage unavailable -- falls back to "always" next time, same as the old app */ }
  }
  function shouldShow() {
    const pref = getPref();
    if (pref === "daily" || pref === "weekly") {
      let last = null;
      try { last = localStorage.getItem(lastKey); } catch { /* falls through to "show" below */ }
      if (last) {
        const lastDate = new Date(`${last}T00:00:00`);
        const nowDate = new Date(`${todayStr()}T00:00:00`);
        if (!Number.isNaN(lastDate.getTime())) {
          const daysSinceLast = Math.round((nowDate - lastDate) / 86400000);
          if (pref === "daily" && daysSinceLast < 1) return false;
          if (pref === "weekly" && daysSinceLast < 7) return false;
        }
      }
    }
    return true;
  }
  function markShownToday() {
    try { localStorage.setItem(lastKey, todayStr()); } catch { /* nothing to persist to -- next load just shows again */ }
  }
  return { getPref, setPref, shouldShow, markShownToday };
}

function prefPanelHtml(gearId, panelId, radioName) {
  return `
    <div class="splash-gear" id="${gearId}" title="Opener settings">&#9881;&#65039;</div>
    <div class="splash-panel" id="${panelId}">
      <h4>Show this opener</h4>
      <label><input type="radio" name="${radioName}" value="always"> Every time</label>
      <label><input type="radio" name="${radioName}" value="daily"> Once a day</label>
      <label><input type="radio" name="${radioName}" value="weekly"> Once a week</label>
    </div>`;
}

function wirePrefPanel(overlay, gearId, panelId, store) {
  const gear = overlay.querySelector(`#${gearId}`);
  const panel = overlay.querySelector(`#${panelId}`);
  gear.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
    const checked = overlay.querySelector(`input[value="${store.getPref()}"]`);
    if (checked) checked.checked = true;
  });
  panel.addEventListener("click", (e) => e.stopPropagation());
  panel.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", () => store.setPref(inp.value));
  });
}

const bootStore = makePrefStore("mm_splash_pref", "mm_splash_last_date");

/** Boot splash -- Ta'awwudh then Basmala, 3s each. Calls onDone once closed (immediately, synchronously-ish, if skipped by preference). */
export function showBootSplash(onDone) {
  if (!bootStore.shouldShow()) { onDone?.(); return; }
  const SLIDE_MS = 3000;
  const overlay = document.createElement("div");
  overlay.id = "boot-splash-overlay";
  overlay.className = "app-splash-overlay";
  overlay.innerHTML = `
    ${prefPanelHtml("bootSplashGear", "bootSplashPanel", "bootSplashPref")}
    <div class="splash-slide show" id="bootSplashSlide1">
      <div class="splash-arabic">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>
      <div class="splash-translit">A'udhu billahi min ash-shaytwaner Rajeem</div>
      <div class="splash-english">I seek refuge with Allah from shaitwan, the rejected, accursed.</div>
    </div>
    <div class="splash-slide" id="bootSplashSlide2">
      <div class="splash-arabic">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      <div class="splash-english">In the name of Allah, the Most Gracious, the Most Merciful.</div>
    </div>`;
  document.body.appendChild(overlay);
  wirePrefPanel(overlay, "bootSplashGear", "bootSplashPanel", bootStore);

  const slide1 = overlay.querySelector("#bootSplashSlide1");
  const slide2 = overlay.querySelector("#bootSplashSlide2");

  function closeSplash() {
    bootStore.markShownToday();
    overlay.style.transition = "opacity .35s ease";
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.remove(); onDone?.(); }, 350);
  }
  setTimeout(() => {
    slide1.classList.remove("show");
    slide2.classList.add("show");
    setTimeout(closeSplash, SLIDE_MS);
  }, SLIDE_MS);
}

const quranStore = makePrefStore("mm_qs_splash_pref", "mm_qs_splash_last_date");

/** Quran-brand entry splash -- ~14s, staggered fade-in lines. Calls onDone once closed (immediately if skipped by preference). */
export function showQuranSplash(onDone) {
  if (!quranStore.shouldShow()) { onDone?.(); return; }
  const overlay = document.createElement("div");
  overlay.id = "quran-splash-overlay";
  overlay.className = "app-splash-overlay";
  overlay.innerHTML = `
    ${prefPanelHtml("quranSplashGear", "quranSplashPanel", "quranSplashPref")}
    <div class="splash-qs-wrap">
      <div class="splash-qs-item splash-qs-title" style="animation-delay:.2s">Quran Revival</div>
      <div class="splash-qs-item splash-qs-tagline1" style="animation-delay:2.0s">Reviving the Quran, abandoned.</div>
      <div class="splash-qs-item splash-qs-divider" style="animation-delay:3.7s"></div>
      <div class="splash-qs-item splash-qs-project" style="animation-delay:5.1s">A project of Madrasatul Muslimeen</div>
      <div class="splash-qs-item splash-qs-tagline2" style="animation-delay:8.7s">Building Muslim-Mindset, reviving the Quran, reviving the Ummah!</div>
      <div class="splash-qs-item splash-qs-motto" style="animation-delay:11.5s">Akhlaq &bull; Ilm &bull; Tawheed &bull; Dawah &bull; Hukm</div>
    </div>`;
  document.body.appendChild(overlay);
  wirePrefPanel(overlay, "quranSplashGear", "quranSplashPanel", quranStore);

  setTimeout(() => {
    overlay.style.transition = "opacity .5s ease";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
      quranStore.markShownToday();
      onDone?.();
    }, 500);
  }, 14000);
}
