/**
 * PCF MSA J106 S3 part 2 (the writer round): the ONE switch for the madrasah's own names for the Hadith books and
 * their chapters (hadithNames/{tenantId}).
 *
 * It is OFF. The Rules block for hadithNames is a CANDIDATE (tests/firestore/hadith-names-v1.proposed.rules): not in
 * firestore.rules, not published. While this is false nothing reads the collection, nothing shows a name and no editor
 * is drawn, so no page can hit a write the server would deny (I15 would show it, but a control that cannot work should
 * not be on screen). The MSA Architect flips it to true in the same release that merges the block into firestore.rules,
 * after the Owner publishes the Rules (an Owner Control Gate). Nothing else turns it on: no URL parameter, no storage key.
 */
export const HADITH_NAMES_PUBLISHED = false;
export const namesEnabled = () => HADITH_NAMES_PUBLISHED === true;
