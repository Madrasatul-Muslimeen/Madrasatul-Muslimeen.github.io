// QR J01 R1 (QR-only): the few words the Asma app (app/asma.html) says that MMSA's Bangla catalogue
// (js/i18n/bn.js, copied unchanged) does not have yet. Everything else goes through MMSA's own t().
// Rule kept from MMSA: plain Bangla text only, never an HTML entity in a Bangla value.
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";

const BN = Object.freeze({
  "The 99 Names of Allah": "আল্লাহর ৯৯টি নাম",
  "99 Names": "৯৯টি নাম",
  "Groups": "গ্রুপসমূহ",
  "{n} of {total} studied on this device": "এই ডিভাইসে {total}টির মধ্যে {n}টি পড়া হয়েছে",
  "Tap a Name to open it.": "খুলতে একটি নামে চাপ দিন।",
  "Mark as studied": "পড়া হয়েছে চিহ্ন দিন",
  "Studied ✓": "পড়া হয়েছে ✓",
  "Kept on this device only. It does not move to another phone.": "শুধু এই ডিভাইসে রাখা হয়। অন্য ফোনে যায় না।",
  "Studied on this device": "এই ডিভাইসে পড়া হয়েছে",
  "Not studied yet": "এখনও পড়া হয়নি",
  "Back to all groups": "সব গ্রুপে ফিরুন",
  "Back to the 99 Names": "৯৯টি নামে ফিরুন",
  "{n} of {total} in this group": "এই গ্রুপে {total}টির মধ্যে {n}",
  "{n} studied": "{n}টি পড়া হয়েছে",
  "Tap a word to see its meaning.": "অর্থ দেখতে একটি শব্দে চাপ দিন।",
  "Open in Hadith ↗": "হাদিসে খুলুন ↗",
  "Arabic text: OpenITI ({licence})": "আরবি পাঠ: OpenITI ({licence})",
  "Night": "রাত",
  "Light": "হালকা",
  "Night look": "রাতের রূপ",
  "Light look": "হালকা রূপ",
  "QuranRevival home": "কুরআন রিভাইভাল হোম",
  "Studied ticks stay on this device only.": "পড়া হয়েছে চিহ্নগুলো শুধু এই ডিভাইসে থাকে।",
  "Name not found.": "নামটি পাওয়া যায়নি।",
  "Save all āyāt for offline use (19 MB)": "সব আয়াত অফলাইনের জন্য রাখুন (১৯ MB)",
  "About and privacy": "পরিচিতি ও গোপনীয়তা",
  "Saving… {n} of {total}": "রাখা হচ্ছে… {total}টির মধ্যে {n}",
  "Ready for offline use ✓": "অফলাইনে ব্যবহারের জন্য প্রস্তুত ✓",
  "Some could not be saved. Check the connection and try again.": "কিছু রাখা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।",
  "The Names work offline. The āyāt you have opened are saved too.": "নামগুলো অফলাইনে চলে। যে আয়াতগুলো খুলেছেন সেগুলোও রাখা আছে।",
  "A new version is ready": "নতুন সংস্করণ প্রস্তুত",
});

/** Like t(), with the QR-only Bangla above; {name}-style placeholders are filled the same way. */
export function tr(key, vars) {
  if (getAppLang() !== "bn" || !BN[key]) return t(key, vars);
  let out = BN[key];
  for (const [k, v] of Object.entries(vars ?? {})) out = out.split(`{${k}}`).join(String(v));
  return out;
}
