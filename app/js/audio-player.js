// F-051 — Audio playback with loop, for the `ayah` renderer's "audio"/"loop"
// Layout A panels.
//
// Two playback shapes, same as the legacy app's proven plumbing (never
// Firestore, always static audio files on archive.org, per CLAUDE.md's data
// source decision):
//   - Direct: one file per ayah (Arabic), or one file per surah with no
//     per-ayah split at all (English -- whole-surah playback only, until
//     ayah-timing data for this specific recording exists somewhere).
//   - Segmented: one file per SURAH with ayah boundaries given by a separate
//     millisecond timestamp map (Bangla) -- playing "one ayah" means seeking
//     within the surah file and stopping at the next boundary.
//
// All three reciters below are now confirmed, real archive.org items (owner
// message, 1 Aug 2026):
//   - Arabic:  Abdullah Basfar, per-ayah, archive.org item abdullah-ali-basfar.
//              CAVEAT: confirmed only 85% uploaded as of this check (5,288 of
//              6,236 ayah files present -- every surah has SOME files, but
//              any surah longer than 100 ayahs is capped at exactly 100,
//              e.g. surah 2 stops at 2/189.mp3). Ayahs beyond that will
//              404 until the rest of the upload finishes.
//   - English: Kevan Brighting, whole-surah only, archive.org item
//              al-quran-eng-mp3-audio. Filenames carry the surah's English
//              name too ("001 - Al-Fatihah ... .mp3"), not just a padded
//              number, so ENGLISH_FILENAMES below is the real, confirmed
//              114-entry list -- not a guessed pattern.
//   - Bangla:  Shareef Bayezid Mahmud, whole-surah, archive.org item
//              ShareefBayezidMahmud, folder "Quran Bangla mp3 - Shareef
//              Bayezid Mahmud/001.mp3" .. "114.mp3". Ayah-boundary timing
//              reused from the same GitHub-hosted timestamp map the legacy
//              app already uses (raw.githubusercontent.com/Madrasatul-
//              Muslimeen/Madrasatul-Muslimeen.github.io) -- verified this is
//              the SAME recording, not a guess: the archive.org file's own
//              declared length for surah 1 (40.92s) matches that timestamp
//              map's last boundary for surah 1 (40.943s) to within 23ms.
//              That file is already a small (460KB), static, GitHub-hosted
//              JSON, so it's left in place rather than re-hosted.

const ENGLISH_FILENAMES = [
  "001 - Al-Fatihah ( The Opening ) - سورة الفاتحة.mp3",
  "002 - Al-Baqarah ( The Cow ) - سورة البقرة.mp3",
  "003 - Al-Imran ( The Family of Imran ) - سورة آل عمران.mp3",
  "004 - An-Nisa ( The Women ) - سورة النساء.mp3",
  "005 - Al-Maidah ( The Table spread with Food ) - سورة المائدة.mp3",
  "006 - Al-An'am ( The Cattle ) - سورة الأنعام.mp3",
  "007 - Al-A'raf (The Heights ) - سورة الأعراف.mp3",
  "008 - Al-Anfal ( The Spoils of War ) - سورة الأنفال.mp3",
  "009 - At-Taubah ( The Repentance ) - سورة التوبة.mp3",
  "010 - Yunus ( Jonah ) - سورة يونس.mp3",
  "011 - Hud - سورة هود.mp3",
  "012 - Yusuf (Joseph ) - سورة يوسف.mp3",
  "013 - Ar-Ra'd ( The Thunder ) - سورة الرعد.mp3",
  "014 - Ibrahim ( Abraham ) - سورة إبراهيم.mp3",
  "015 - Al-Hijr ( The Rocky Tract ) - سورة الحجر.mp3",
  "016 - An-Nahl ( The Bees ) - سورة النحل.mp3",
  "017 - Al-Isra ( The Night Journey ) - سورة الإسراء.mp3",
  "018 - Al-Kahf ( The Cave ) - سورة الكهف.mp3",
  "019 - Maryam ( Mary ) - سورة مريم.mp3",
  "020 - Taha - سورة طه.mp3",
  "021 - Al-Anbiya ( The Prophets ) - سورة الأنبياء.mp3",
  "022 - Al-Hajj ( The Pilgrimage ) - سورة الحج.mp3",
  "023 - Al-Mu'minoon ( The Believers ) - سورة المؤمنون.mp3",
  "024 - An-Noor ( The Light ) - سورة النور.mp3",
  "025 - Al-Furqan (The Criterion ) - سورة الفرقان.mp3",
  "026 - Ash-Shuara ( The Poets ) - سورة الشعراء.mp3",
  "027 - An-Naml (The Ants ) - سورة النمل.mp3",
  "028 - Al-Qasas ( The Stories ) - سورة القصص.mp3",
  "029 - Al-Ankaboot ( The Spider ) - سورة العنكبوت.mp3",
  "030 - Ar-Room ( The Romans ) - سورة الروم.mp3",
  "031 - Luqman - سورة لقمان.mp3",
  "032 - As-Sajdah ( The Prostration ) - سورة السجدة.mp3",
  "033 - Al-Ahzab ( The Combined Forces ) - سورة الأحزاب.mp3",
  "034 - Saba ( Sheba ) - سورة سبأ.mp3",
  "035 - Fatir ( The Orignator ) - سورة فاطر.mp3",
  "036 - Ya-seen - سورة يس.mp3",
  "037 - As-Saaffat ( Those Ranges in Ranks ) - سورة الصافات.mp3",
  "038 - Sad ( The Letter Sad ) - سورة ص.mp3",
  "039 - Az-Zumar ( The Groups ) - سورة الزمر.mp3",
  "040 - Ghafir ( The Forgiver God ) - سورة غافر.mp3",
  "041 - Fussilat ( Explained in Detail ) - سورة فصلت.mp3",
  "042 - Ash-Shura (Consultation ) - سورة الشورى.mp3",
  "043 - Az-Zukhruf ( The Gold Adornment ) - سورة الزخرف.mp3",
  "044 - Ad-Dukhan ( The Smoke ) - سورة الدخان.mp3",
  "045 - Al-Jathiya ( Crouching ) - سورة الجاثية.mp3",
  "046 - Al-Ahqaf ( The Curved Sand-hills ) - سورة الأحقاف.mp3",
  "047 - Muhammad - سورة محمد.mp3",
  "048 - Al-Fath ( The Victory ) - سورة الفتح.mp3",
  "049 - Al-Hujurat ( The Dwellings ) - سورة الحجرات.mp3",
  "050 - Qaf ( The Letter Qaf ) - سورة ق.mp3",
  "051 - Adh-Dhariyat ( The Wind that Scatter ) - سورة الذاريات.mp3",
  "052 - At-Tur ( The Mount ) - سورة الطور.mp3",
  "053 - An-Najm ( The Star ) - سورة النجم.mp3",
  "054 - Al-Qamar ( The Moon ) - سورة القمر.mp3",
  "055 - Ar-Rahman ( The Most Graciouse ) - سورة الرحمن.mp3",
  "056 - Al-Waqi'ah ( The Event ) - سورة الواقعة.mp3",
  "057 - Al-Hadid ( The Iron ) - سورة الحديد.mp3",
  "058 - Al-Mujadilah ( She That Disputeth ) - سورة المجادلة.mp3",
  "059 - Al-Hashr ( The Gathering ) - سورة الحشر.mp3",
  "060 - Al-Mumtahanah ( The Woman to be examined ) - سورة الممتحنة.mp3",
  "061 - As-Saff ( The Row ) - سورة الصف.mp3",
  "062 - Al-Jumu'ah ( Friday ) - سورة الجمعة.mp3",
  "063 - Al-Munafiqoon ( The Hypocrites ) - سورة المنافقون.mp3",
  "064 - At-Taghabun ( Mutual Loss & Gain ) - سورة التغابن.mp3",
  "065 - At-Talaq ( The Divorce ) - سورة الطلاق.mp3",
  "066 - At-Tahrim ( The Prohibition ) - سورة التحريم.mp3",
  "067 - Al-Mulk ( Dominion ) - سورة الملك.mp3",
  "068 - Al-Qalam ( The Pen ) - سورة القلم.mp3",
  "069 - Al-Haaqqah ( The Inevitable ) - سورة الحاقة.mp3",
  "070 - Al-Ma'arij (The Ways of Ascent ) - سورة المعارج.mp3",
  "071 - Nooh - سورة نوح.mp3",
  "072 - Al-Jinn ( The Jinn ) - سورة الجن.mp3",
  "073 - Al-Muzzammil (The One wrapped in Garments) - سورة المزمل.mp3",
  "074 - Al-Muddaththir ( The One Enveloped ) - سورة المدثر.mp3",
  "075 - Al-Qiyamah ( The Resurrection ) - سورة القيامة.mp3",
  "076 - Al-Insan ( Man ) - سورة الإنسان.mp3",
  "077 - Al-Mursalat ( Those sent forth ) - سورة المرسلات.mp3",
  "078 - An-Naba' ( The Great News ) - سورة النبأ.mp3",
  "079 - An-Nazi'at ( Those who Pull Out ) - سورة النازعات.mp3",
  "080 - Abasa ( He frowned ) - سورة عبس.mp3",
  "081 - At-Takwir ( The Overthrowing ) - سورة التكوير.mp3",
  "082 - Al-Infitar ( The Cleaving ) - سورة الانفطار.mp3",
  "083 - Al-Mutaffifin (Those Who Deal in Fraud) - سورة المطففين.mp3",
  "084 - Al-Inshiqaq (The Splitting Asunder) - سورة الانشقاق.mp3",
  "085 - Al-Burooj ( The Big Stars ) - سورة البروج.mp3",
  "086 - At-Tariq ( The Night-Comer ) - سورة الطارق.mp3",
  "087 - Al-A'la ( The Most High ) - سورة الأعلى.mp3",
  "088 - Al-Ghashiya ( The Overwhelming ) - سورة الغاشية.mp3",
  "089 - Al-Fajr ( The Dawn ) - سورة الفجر.mp3",
  "090 - Al-Balad ( The City ) - سورة البلد.mp3",
  "091 - Ash-Shams ( The Sun ) - سورة الشمس.mp3",
  "092 - Al-Layl ( The Night ) - سورة الليل.mp3",
  "093 - Ad-Dhuha ( The Forenoon ) - سورة الضحى.mp3",
  "094 - As-Sharh ( The Opening Forth) - سورة الشرح.mp3",
  "095 - At-Tin ( The Fig ) - سورة التين.mp3",
  "096 - Al-'alaq ( The Clot ) - سورة العلق.mp3",
  "097 - Al-Qadr ( The Night of Decree ) - سورة القدر.mp3",
  "098 - Al-Bayyinah ( The Clear Evidence ) - سورة البينة.mp3",
  "099 - Az-Zalzalah ( The Earthquake ) - سورة الزلزلة.mp3",
  "100 - Al-'adiyat ( Those That Run ) - سورة العاديات.mp3",
  "101 - Al-Qari'ah ( The Striking Hour ) - سورة القارعة.mp3",
  "102 - At-Takathur ( The piling Up ) - سورة التكاثر.mp3",
  "103 - Al-Asr ( The Time ) - سورة العصر.mp3",
  "104 - Al-Humazah ( The Slanderer ) - سورة الهمزة.mp3",
  "105 - Al-Fil ( The Elephant ) - سورة الفيل.mp3",
  "106 - Quraish - سورة قريش.mp3",
  "107 - Al-Ma'un ( Small Kindnesses ) - سورة الماعون.mp3",
  "108 - Al-Kauthor ( A River in Paradise) - سورة الكوثر.mp3",
  "109 - Al-Kafiroon ( The Disbelievers ) - سورة الكافرون.mp3",
  "110 - An-Nasr ( The Help ) - سورة النصر.mp3",
  "111 - Al-Masad ( The Palm Fibre ) - سورة المسد.mp3",
  "112 - Al-Ikhlas ( Sincerity ) - سورة الإخلاص.mp3",
  "113 - Al-Falaq ( The Daybreak ) - سورة الفلق.mp3",
  "114 - An-Nas ( Mankind ) - سورة الناس.mp3",
];

const BANGLA_FOLDER = "Quran Bangla mp3 - Shareef Bayezid Mahmud";
const BANGLA_TIMESTAMPS_URL =
  "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/refs/heads/main/gtaf_bangla_timestamps.json";

export const RECITERS = {
  ar: {
    id: "ar",
    label: "Abdullah Basfar (Arabic)",
    kind: "direct",
    // Confirmed complete 5 Aug 2026: archive.org item
    // abdullah-ali-basfar.ayahbyayah (superseding the old abdullah-ali-basfar
    // item, which was only 85% uploaded and capped every long surah early --
    // e.g. surah 2 stopped at ayah 189/286). Verified via the item's own
    // metadata: 6,314 numbered files, all 114 surahs present, surah 2 runs
    // the full 1-286. Flat SSSAAA.mp3 naming (same convention as the English
    // Ibraheem Walk item below), not the old item's folder-per-surah layout.
    // Each surah also carries a "000" bismillah/istiadhah track ahead of
    // ayah 1 -- unused here since callers only ever request real ayah
    // numbers (1-based), never 0.
    perAyahUrl: (surah, ayah) =>
      `https://archive.org/download/abdullah-ali-basfar.ayahbyayah/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`,
    surahUrl: null, // no confirmed whole-surah file for this reciter -- callers fall back to a per-ayah playlist
  },
  en_ibraheemwalk: {
    id: "en_ibraheemwalk",
    label: "Ibraheem Walk (English)",
    kind: "direct",
    // Confirmed complete 2 Aug 2026: archive.org item
    // quran.eng.mp3.AyahbyAyah.audio.ibraheem-walk -- all 114 surahs, all
    // 6,236 real ayahs present (verified against surah-index.json's real
    // per-surah counts), flat SSSAAA.mp3 naming (everyayah.com's classic
    // convention -- 3-digit surah + 3-digit ayah, zero-padded). Real
    // per-ayah playback + loop for English, for the first time.
    perAyahUrl: (surah, ayah) =>
      `https://archive.org/download/quran.eng.mp3.AyahbyAyah.audio.ibraheem-walk/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`,
    surahUrl: null, // no single whole-surah file in this item -- playSurah() falls back to a per-ayah playlist
  },
  en_kevanbrighting: {
    id: "en_kevanbrighting",
    label: "Kevan Brighting (English, whole surah only)",
    kind: "direct",
    perAyahUrl: null, // whole-surah only -- no ayah-timing data exists for this recording
    surahUrl: (surah) => `https://archive.org/download/al-quran-eng-mp3-audio/${encodeURIComponent(ENGLISH_FILENAMES[surah - 1])}`,
  },
  bn: {
    id: "bn",
    label: "Shareef Bayezid Mahmud (Bangla)",
    kind: "segmented",
    surahUrl: (surah) => `https://archive.org/download/ShareefBayezidMahmud/${encodeURIComponent(BANGLA_FOLDER)}/${String(surah).padStart(3, "0")}.mp3`,
    timestampsUrl: BANGLA_TIMESTAMPS_URL,
  },
};

/** True once a reciter's real audio source has actually been filled in above. */
export function reciterIsReady(reciterId) {
  const r = RECITERS[reciterId];
  if (!r) return false;
  if (r.kind === "direct") return !!(r.perAyahUrl || r.surahUrl);
  if (r.kind === "segmented") return !!(r.surahUrl && r.timestampsUrl);
  return false;
}

/** True if this reciter can play a single ayah in isolation (vs. whole-surah only). */
export function reciterSupportsSingleAyah(reciterId) {
  const r = RECITERS[reciterId];
  if (!r) return false;
  return r.kind === "segmented" ? !!(r.surahUrl && r.timestampsUrl) : !!r.perAyahUrl;
}

let audioEl = null;
let loopEnabled = false;
let currentPlaylist = null; // legacy single-shot playlist shape, kept only so playAyah()/playSurah() have something to null out -- currentRange below is what actually drives auto-advance now
let currentRange = null; // { surahNum, ayahs: [...], index, reciterId } -- drives ayah-by-ayah auto-advance for BOTH direct (one file per ayah) and segmented (seek+boundary) reciters
let currentBoundaryListener = null; // the one active timeupdate listener for segmented playback, tracked so switching ayah/reciter never leaves a stale one (with a stale endMs) attached alongside a new one
let timestampsCache = null; // Promise<raw Bangla timestamp map> -- same shape for every segmented reciter for now
let onPlaybackError = null;

/**
 * Registers a callback for playback failures that happen after play()
 * already resolved -- a network drop mid-file, a source that turns out not
 * to exist, a corrupt/undecodable file. None of those reject play()'s own
 * promise (that promise is about starting playback, not finishing it), so
 * without this a real failure just goes silent. Same idea as I15 ("a failed
 * write must reach the user, never console.error alone") applied to audio.
 */
export function setPlaybackErrorHandler(fn) {
  onPlaybackError = fn;
}

function describeMediaError(code) {
  switch (code) {
    case 1: return "playback was aborted";
    case 2: return "a network error interrupted the download";
    case 3: return "the file could not be decoded -- it may be corrupt or an unsupported format";
    case 4: return "the audio source isn't available -- the file may not exist at that address";
    default: return "an unknown playback error occurred";
  }
}

function clearBoundaryListener() {
  if (audioEl && currentBoundaryListener) audioEl.removeEventListener("timeupdate", currentBoundaryListener);
  currentBoundaryListener = null;
}

function ensureAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("error", () => {
      const message = `Couldn't play this audio: ${describeMediaError(audioEl.error?.code)}.`;
      currentPlaylist = null;
      currentRange = null;
      clearBoundaryListener();
      if (onPlaybackError) onPlaybackError(message, { code: audioEl.error?.code });
    });
  }
  return audioEl;
}

function handleEnded() {
  if (currentRange) {
    advanceRange();
    return;
  }
  if (loopEnabled && audioEl) {
    audioEl.currentTime = 0;
    audioEl.play();
    return;
  }
  if (currentPlaylist && currentPlaylist.index < currentPlaylist.urls.length - 1) {
    currentPlaylist.index++;
    audioEl.src = currentPlaylist.urls[currentPlaylist.index];
    audioEl.play();
  }
}

export function setLoop(enabled) {
  loopEnabled = enabled;
}

/** Play a single ayah (direct reciters with a perAyahUrl -- Arabic, English Ibraheem Walk). Standalone -- not part of a range, just finishes and stops. */
export function playAyah(surahNum, ayahNum, reciterId) {
  const reciter = RECITERS[reciterId];
  if (!reciter || reciter.kind !== "direct" || !reciter.perAyahUrl) {
    throw new Error(`"${reciterId}" has no per-ayah audio configured yet.`);
  }
  currentPlaylist = null;
  currentRange = null;
  clearBoundaryListener();
  const el = ensureAudioEl();
  el.src = reciter.perAyahUrl(surahNum, ayahNum);
  return el.play();
}

function playCurrentRangeAyah() {
  const { surahNum, ayahs, index, reciterId } = currentRange;
  const ayahNum = ayahs[index];
  const reciter = RECITERS[reciterId];
  if (reciter.kind === "segmented") return playSegmentedAyahInternal(surahNum, ayahNum, reciterId);
  clearBoundaryListener();
  const el = ensureAudioEl();
  el.src = reciter.perAyahUrl(surahNum, ayahNum);
  return el.play();
}

function advanceRange() {
  if (!currentRange) return;
  if (currentRange.index < currentRange.ayahs.length - 1) {
    currentRange.index++;
    playCurrentRangeAyah();
    return;
  }
  if (loopEnabled) {
    currentRange.index = 0;
    playCurrentRangeAyah();
    return;
  }
  currentRange = null;
  clearBoundaryListener();
  if (audioEl) audioEl.pause();
}

/**
 * Play a run of ayahs, auto-advancing from one to the next until the range
 * ends (or looping the whole range, if loop is on) -- works for BOTH direct
 * per-ayah reciters (Arabic, English Ibraheem Walk) and segmented reciters
 * (Bangla: one file per surah, seek + boundary per ayah). This is what
 * "Play whole surah" actually calls for any reciter with per-ayah playback
 * at all -- see playSurah() for the one reciter (English Kevan Brighting)
 * that has only a single whole-surah file and never needs to advance.
 */
export function playAyahRange(surahNum, fromAyah, toAyah, reciterId) {
  if (!reciterSupportsSingleAyah(reciterId)) {
    throw new Error(`"${reciterId}" can't play ayah by ayah -- use playSurah() for its single whole-file playback instead.`);
  }
  const ayahs = [];
  for (let a = fromAyah; a <= toAyah; a++) ayahs.push(a);
  currentPlaylist = null;
  currentRange = { surahNum, ayahs, index: 0, reciterId };
  return playCurrentRangeAyah();
}

/** Play the reciter's single whole-surah file if that's all it has (English Kevan Brighting -- one continuous file, nothing to advance between); otherwise play the whole surah ayah-by-ayah via playAyahRange, which auto-advances for both direct and segmented reciters. */
export function playSurah(surahNum, reciterId, ayahCount) {
  const reciter = RECITERS[reciterId];
  if (reciter?.kind === "direct" && reciter.surahUrl && !reciter.perAyahUrl) {
    currentPlaylist = null;
    currentRange = null;
    clearBoundaryListener();
    const el = ensureAudioEl();
    el.src = reciter.surahUrl(surahNum);
    return el.play();
  }
  if (!ayahCount) throw new Error("playSurah: no whole-surah file for this reciter, and no ayahCount given to play it ayah by ayah.");
  return playAyahRange(surahNum, 1, ayahCount, reciterId);
}

/** { surahNumber(string) -> [{verse_key, timestamp_from, timestamp_to}, ...] }, ms-based, one shared shape across segmented reciters for now. */
async function getTimestamps(reciterId) {
  const reciter = RECITERS[reciterId];
  if (!reciter?.timestampsUrl) throw new Error(`"${reciterId}" has no ayah-timing data configured yet.`);
  if (!timestampsCache) {
    timestampsCache = fetch(reciter.timestampsUrl).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} loading timestamps for "${reciterId}".`);
      return res.json();
    }).catch((err) => { timestampsCache = null; throw err; });
  }
  return timestampsCache;
}

// Fetches the (small, ~460KB) Bangla timestamp map in the background as soon
// as this module loads, rather than on the user's first Play click. Browsers
// only allow audio.play() without being blocked when it runs inside (or very
// soon after) a real user gesture -- an `await` on a real network fetch
// in between the click and el.play() can break that association and get the
// play() promise silently rejected. Warming the cache ahead of time means
// the `await getTimestamps()` inside playSegmentedAyah below resolves
// immediately from memory (a microtask, not a network round trip) by the
// time anyone actually clicks Play.
for (const reciter of Object.values(RECITERS)) {
  if (reciter.kind === "segmented" && reciter.timestampsUrl) {
    getTimestamps(reciter.id).catch(() => {}); // best-effort warm-up; a real failure still surfaces to the user at click time
  }
}

/** Seeks an <audio> element to a position, waiting for loadedmetadata first if the src just changed -- setting currentTime before the browser knows the media's seekable range is silently ignored in some browsers. */
function seekTo(el, url, seconds) {
  if (el.dataset.segUrl !== url) {
    el.dataset.segUrl = url;
    return new Promise((resolve) => {
      el.addEventListener("loadedmetadata", () => { el.currentTime = seconds; resolve(); }, { once: true });
      el.src = url; // setting src triggers the load that will fire loadedmetadata above
    });
  }
  el.currentTime = seconds;
  return Promise.resolve();
}

/**
 * Core segmented-ayah playback: seek to this ayah's boundary and stop at
 * the next one -- OR, if this ayah is part of an active currentRange,
 * advance to the next ayah in the range instead of just stopping. Shared by
 * the standalone playSegmentedAyah() below and by playCurrentRangeAyah()
 * above; the only difference between those two callers is whether
 * currentRange happens to be set when this runs.
 */
async function playSegmentedAyahInternal(surahNum, ayahNum, reciterId) {
  const reciter = RECITERS[reciterId];
  const timestamps = await getTimestamps(reciterId);
  const surahEntries = timestamps[String(surahNum)];
  const entry = surahEntries?.find((e) => e.verse_key === `${surahNum}:${ayahNum}`);
  if (!entry) throw new Error(`No timing data for surah ${surahNum}, ayah ${ayahNum}.`);

  const { timestamp_from: startMs, timestamp_to: endMs } = entry;
  clearBoundaryListener(); // never leave the previous ayah's boundary check (with its own stale endMs) attached alongside this one
  const el = ensureAudioEl();
  const url = reciter.surahUrl(surahNum);
  await seekTo(el, url, startMs / 1000);

  const stopAtBoundary = () => {
    if (el.currentTime * 1000 < endMs) return;
    clearBoundaryListener();
    if (currentRange && currentRange.reciterId === reciterId) {
      advanceRange();
      return;
    }
    if (loopEnabled) {
      el.currentTime = startMs / 1000;
      currentBoundaryListener = stopAtBoundary;
      el.addEventListener("timeupdate", stopAtBoundary);
    } else {
      el.pause();
    }
  };
  currentBoundaryListener = stopAtBoundary;
  el.addEventListener("timeupdate", stopAtBoundary);
  return el.play();
}

/** Play one Bangla-style segmented ayah standalone (e.g. the "Play ayah" button) -- not part of a range, just finishes and stops (or loops on itself, if loop is on). */
export function playSegmentedAyah(surahNum, ayahNum, reciterId) {
  const reciter = RECITERS[reciterId];
  if (!reciter || reciter.kind !== "segmented") throw new Error(`"${reciterId}" is not a segmented reciter.`);
  currentPlaylist = null;
  currentRange = null;
  return playSegmentedAyahInternal(surahNum, ayahNum, reciterId);
}

export function stop() {
  currentPlaylist = null;
  currentRange = null;
  clearBoundaryListener();
  if (audioEl) audioEl.pause();
}

export function isPlaying() {
  return !!audioEl && !audioEl.paused;
}
