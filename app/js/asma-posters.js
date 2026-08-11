// Phase 13 round 1 — Asma ul Husna screensaver poster set.
//
// Owner-supplied source: https://archive.org/details/NamesAndAttributesOfAllah
// ("Names of Allah - POSTERS", creator Creative-Motivations.com, collections
// opensource_image/community, no explicit license restriction on the item's
// own metadata; the item's own description links to
// learndeenonthego.wordpress.com -- the same "Learn Deen On-the-Go" name
// already used elsewhere in this app, so this is the owner's own known,
// affiliated source, not an unrelated third party's copyrighted work).
//
// Deliberately NOT copied into this repo -- 93 images at up to ~900KB each
// would be a real weight increase against a codebase that otherwise embeds
// no binary media at all (Quran audio is streamed from reciter CDNs, never
// bundled -- see quranrevival.html). These reference archive.org's own
// stable per-file download URLs instead (verified: 302-redirects to a CDN
// host, serves with access-control-allow-origin: *, so an <img> tag loads
// it cross-origin with no proxy needed) -- same "link to the source, don't
// redistribute a copy" shape, and it matches the load-speed contract's own
// "Screensaver -- on first use, never at startup" rule for free, since nothing
// here is fetched until the screensaver is actually opened.
//
// This is a WIDER set of traditional Names than the 99-name Tirmidhi list in
// asma-data.js (includes Ar-Rabb, Al-Ilaah, As-Sayyid, Al-Witr, Al-Khallaq
// and others not in the specific 99 enumeration) -- kept as its own list on
// purpose (see asma-data.js's own header) rather than force-trimmed to only
// the overlapping subset.
//
// label is the filename's own transliteration, used as the on-screen caption
// -- not cross-matched against asma-data.js's transliteration spellings
// (they use different transliteration conventions), so don't assume a label
// here lines up character-for-character with an asma-data.js entry.

export const ASMA_POSTERS = [
  { label: 'Al-A\'laa', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28A%27laa%29%20Al-A%27laa.jpg' },
  { label: 'Al-Aleem', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Aaleem%29%20Al-Aleem.png' },
  { label: 'Al-Aleem3', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Aaleem%29%20Al-Aleem3.png' },
  { label: 'Al-Aalim', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Aalim%29%20Al-Aalim.png' },
  { label: 'Al-Afuww', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Afuww%29%20Al-Afuww.jpg' },
  { label: 'Al-Ahad', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ahad%29%20Al-Ahad.jpg' },
  { label: 'Al-Akheer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Akheer%29%20Al-Akheer.jpg' },
  { label: 'Al-Akram', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Akram%29%20Al-Akram.png' },
  { label: 'Al-Aliyyu', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Aliyyu%29%20Al-Aliyyu.jpg' },
  { label: 'Allah-The Proper Name', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Allah%29%20Allah-The%20Proper%20Name.jpg' },
  { label: 'Al-Awwal', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Awwal%29%20Al-Awwal.jpg' },
  { label: 'Al-Azeem', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Azeem%29%20Al-Azeem.jpg' },
  { label: 'Al-Azeez', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Azeez%29%20Al-Azeez.jpg' },
  { label: 'Al-Baari', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Baari%29%20Al-Baari.png' },
  { label: 'Al-Baasit', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Baasit%29%20Al-Baasit.jpg' },
  { label: 'Al-Baatin', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Baatin%29%20Al-Baatin.jpg' },
  { label: 'Al-Barr', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Barr%29%20Al-Barr.png' },
  { label: 'Al-Baseer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Baseer%29%20Al-Baseer.png' },
  { label: 'Adh-Dhaahir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Dhaahir%29%20Adh-Dhaahir.jpg' },
  { label: 'Al-Fattah', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Fattah%29%20Al-Fattah.jpg' },
  { label: 'Al-Ganiyyu', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ganiyyu%29%20Al-Ganiyyu.jpg' },
  { label: 'Al-Ghaffaar', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ghaffaar%29%20Al-Ghaffaar.png' },
  { label: 'Al-Ghafoor', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ghafoor%29%20Al-Ghafoor.png' },
  { label: 'Al-Hafeedh', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hafeedh%29%20Al-Hafeedh.jpg' },
  { label: 'Al-Hafiyy', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hafiyy%29%20Al-Hafiyy.jpg' },
  { label: 'Al-Hakam', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hakam%29%20Al-Hakam.jpg' },
  { label: 'Al-Hakeem', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hakeem%29%20Al-Hakeem.jpg' },
  { label: 'Al-Hameed', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hameed%29%20Al-Hameed.jpg' },
  { label: 'Al-Haqq', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Haqq%29%20Al-Haqq.png' },
  { label: 'Al-Haseeb', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Haseeb%29%20Al-Haseeb.jpg' },
  { label: 'Al-Hayy', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Hayy%29%20Al-Hayy.jpg' },
  { label: 'Al-Ilaah', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ilaah%29%20Al-Ilaah.jpg' },
  { label: 'Al-Jabbaar', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Jabbaar%29%20Al-Jabbaar.png' },
  { label: 'Al-Jameel', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Jameel%29%20Al-Jameel.jpg' },
  { label: 'Al-Jawwaad', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Jawwaad%29%20Al-Jawwaad.jpg' },
  { label: 'Al-Kabeer Al-Mutawaal', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Kabeer%29%20Al-Kabeer%20Al-Mutawaal.jpg' },
  { label: 'Al-Kabeer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Kabeer%29%20Al-Kabeer.png' },
  { label: 'Al-Kareem', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Kareem%29%20Al-Kareem.jpg' },
  { label: 'Al-Khaaliq', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Khaaliq%29%20Al-Khaaliq.png' },
  { label: 'Al-Khabeer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Khabeer%29%20Al-Khabeer.jpg' },
  { label: 'Al-Khallaq', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Khallaq%29%20Al-Khallaq.jpg' },
  { label: 'Al-Lateef', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Lateef%29%20Al-Lateef.jpg' },
  { label: 'Al-Maaleek', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Maaleek%29%20Al-Maaleek.jpg' },
  { label: 'Al-Maalik', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Maalik%29%20Al-Maalik.jpg' },
  { label: 'Al-Mannan', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mannan%29%20Al-Mannan.jpg' },
  { label: 'Al-Mateen', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mateen%29%20Al-Mateen.jpg' },
  { label: 'Al-Mu\'mim', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mu%27mim%29%20Al-Mu%27mim.jpg' },
  { label: 'Al-Mu\'tee', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mu%27tee%29%20Al-Mu%27tee.jpg' },
  { label: 'Al-Muakkhir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muakkhir%29%20Al-Muakkhir.jpg' },
  { label: 'Al-Mubeen', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mubeen%29%20Al-Mubeen.jpg' },
  { label: 'Al-Muhayimin', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muhayimin%29%20Al-Muhayimin.jpg' },
  { label: 'Al-MuHeet', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muheet%29%20Al-MuHeet.jpg' },
  { label: 'Al-Muhsin', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muhsin%29%20Al-Muhsin.jpg' },
  { label: 'Al-Mujeeb', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mujeeb%29%20Al-Mujeeb.jpg' },
  { label: 'Al-Muqaddimu', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muqaddimu%29%20Al-Muqaddimu.jpg' },
  { label: 'Al-Muqeet', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muqeet%29%20Al-Muqeet.jpg' },
  { label: 'Al-Muqtadir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muqtadir%29%20Al-Muqtadir.jpg' },
  { label: 'Al-Musawwir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Musawwir%29%20Al-Musawwir.png' },
  { label: 'Al-Muta\'aalee', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Muta%27aalee%29%20Al-Muta%27aalee.jpg' },
  { label: 'Al-Mutakabbir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Mutakabbir%29%20Al-Mutakabbir.jpg' },
  { label: 'An-Naseer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Naseer%29%20An-Naseer.jpg' },
  { label: 'Al-Qaabid', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qaabid%29%20Al-Qaabid.jpg' },
  { label: 'Al-Qaadir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qaadir%29%20Al-Qaadir.jpg' },
  { label: 'Al-Qaahir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qaahir%29%20Al-Qaahir.jpg' },
  { label: 'Al-Qadeer', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qadeer%29%20Al-Qadeer.jpg' },
  { label: 'Al-Qahhaar', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qahhaar%29%20Al-Qahhaar.png' },
  { label: 'Al-Qawiyy', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qawiyy%29%20Al-Qawiyy.jpg' },
  { label: 'Al-Qayyuum', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Qayyuum%29%20Al-Qayyuum.jpg' },
  { label: 'Al-Quddoos', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Quddoos%29%20Al-Quddoos.png' },
  { label: 'Ar-Ra\'oof', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Ra%27oof%29%20Ar-Ra%27oof.jpg' },
  { label: 'Ar-Rabb', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Rabb%29%20Ar-Rabb.jpg' },
  { label: 'Ar-Rafeeq', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Rafeeq%29%20Ar-Rafeeq.jpg' },
  { label: 'Ar-Raheem', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Raheem%29%20Ar-Raheem.jpg' },
  { label: 'Ar-Rahman', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Rahman%29%20Ar-Rahman.png' },
  { label: 'Ar-Raqeeb', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Raqeeb%29%20Ar-Raqeeb.jpg' },
  { label: 'Ar-Razzaq', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Razzaq%29%20Ar-Razzaq.jpg' },
  { label: 'As-Salaam', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Salaam%29%20As-Salaam.png' },
  { label: 'As-Samee', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Samee%29%20As-Samee.jpg' },
  { label: 'As-Sayyid', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Sayyid%29%20As-Sayyid.jpg' },
  { label: 'Ash-Shaafee', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Shaafee%29%20Ash-Shaafee.jpg' },
  { label: 'Ash-Shaakir', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Shaakir%29%20Ash-Shaakir.jpg' },
  { label: 'Ash-Shaheed', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Shaheed%29%20Ash-Shaheed.jpg' },
  { label: 'Ash-Shakoor', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Shakoor%29%20Ash-Shakoor.jpg' },
  { label: 'Al-Subbuhu', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Subbuhu%29%20Al-Subbuhu.jpg' },
  { label: 'At-Tawwab', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Tawwab%29%20At-Tawwab.jpg' },
  { label: 'At-Tayyib', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Tayyib%29%20At-Tayyib.jpg' },
  { label: 'Al-Waahid', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Waahid%29%20Al-Waahid.jpg' },
  { label: 'Al-Waarith', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Waarith%29%20Al-Waarith.jpg' },
  { label: 'Al-Waasi', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Waasi%29%20Al-Waasi.jpg' },
  { label: 'Al-Wadud', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Wadud%29%20Al-Wadud.jpg' },
  { label: 'Al-Wahhab', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Wahhab%29%20Al-Wahhab.png' },
  { label: 'Al-Wakeel', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Wakeel%29%20Al-Wakeel.jpg' },
  { label: 'Al-Witr', url: 'https://archive.org/download/NamesAndAttributesOfAllah/%28Witr%29%20Al-Witr.jpg' },];
