// J03 K3: what "Read next" shows on one narration of the Hadith library (hadith-browser.js's passage card). Each
// value is a function, so nothing is fetched until the reader opens that tab (I9):
//   Qur'an     -- the āyāt this narration quotes (the āyah–hadith index), each opening the Read view, ← Back to the hadith;
//   Hadith     -- the other narrations that quote those āyāt;
//   Dictionary -- the word meanings HadeethEnc gives with it (when it is linked to HadeethEnc), and the app's
//                 dictionary entries for the words of the āyāt it quotes (the dictionaries hold Qur'an words only);
//   Scholars   -- the book's compiler where the Scholars Database names one, then the tafsīr scholars by Approach;
//   Tafsīr     -- HadeethEnc's explanation and benefits where present, and where to read the āyāt's tafsīr.
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { getSurah } from "./quran-data.js";
import { loadHadithAyat, loadAyahHadithHits } from "./ayah-hadith.js";
import { loadHadithRecords } from "./hadeethenc-corpus.js";
import { otherHadith, hadithExplanation } from "./read-next.js";

export function hadithReadNextCtx(versionUri, n, heIds = null) {
  let ayatP = null, recordP = null;
  const ayat = () => (ayatP ??= loadHadithAyat(versionUri, n).then((hits) => hits.map(([s, a]) => [s, a])).catch(() => []));
  const record = () => (recordP ??= (heIds?.length
    ? loadHadithRecords(heIds, getAppLang() === "bn" ? "bn" : "en").then((m) => heIds.map((id) => m.get(String(id))?.record).find(Boolean) ?? null).catch(() => null)
    : Promise.resolve(null)));
  return {
    quran: ayat,
    backTo: "hadith",
    self: { book: versionUri, n },
    hadith: async () => {
      const refs = await ayat();
      const lists = await Promise.all(refs.map(([s, a]) => loadAyahHadithHits(s, a).catch(() => [])));
      return otherHadith(lists, { book: versionUri, n });
    },
    words: async () => (await record())?.words_meanings ?? null,
    lemmas: async () => {
      const out = [];
      for (const [s, a] of await ayat()) {
        const surah = await getSurah(s).catch(() => null);
        for (const w of surah?.ayahs?.find((x) => x.ayah === a)?.words ?? []) if (w.morphology?.lemma) out.push(w.morphology.lemma);
      }
      return out;
    },
    lemmasFrom: t("Dictionary words of the āyah it quotes"),
    scholars: "hadith+tafsir",
    compilerBook: versionUri,
    tafsir: async () => ({ ...(hadithExplanation(await record()) ?? {}), ayat: await ayat() }),
  };
}
