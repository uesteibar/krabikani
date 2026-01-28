# PRD: Study Materials Sync, Review Progress Persistence & Reverse Practice

## Introduction

This PRD covers three related improvements to the app's study experience:

1. **Study Materials Download Sync** — The app currently uploads user synonyms to WaniKani but never downloads existing ones. Synonyms added on wanikani.com are invisible in the app. Additionally, auxiliary meanings (whitelist/blacklist) from the API are fetched but never stored, causing the app to miss curated alternate answers and blacklisted misleading answers.

2. **Review Session Progress on Exit** — When a user leaves a review session mid-way (app close, navigation away), all progress is lost. Completed and failed items should be synced to WaniKani instead of silently discarded.

3. **Reverse Practice Mode** — A new study mode where the user sees an English meaning and must type the corresponding kanji/vocabulary characters. This exercises recall in the opposite direction and only applies to vocabulary items.

---

## Goals

- Download user synonyms from WaniKani study materials so the app reflects synonyms added on wanikani.com
- Store auxiliary meanings (whitelist/blacklist) from the WaniKani API so answer validation uses curated alternate and blacklisted answers
- Preserve review progress when a session is interrupted, syncing completed and failed items to WaniKani
- Provide a "Reverse" practice mode for vocabulary that tests kanji recall from English meanings

---

## User Stories

### US-001: Download study materials during sync

**Description:** As a user, I want my synonyms from wanikani.com to appear in the app so that my custom answers work everywhere.

**Acceptance Criteria:**
- [ ] During background sync (app foregrounding), fetch study materials from the WaniKani API using `getStudyMaterials()` (`src/api/wanikaniApi.ts:374`)
- [ ] Extract `meaning_synonyms` from each study material and insert into the `user_synonyms` table
- [ ] If a synonym with identical text already exists locally for the same subject, the WaniKani version takes precedence (overwrite local row)
- [ ] New remote synonyms not present locally are inserted with `synced_at` set (they don't need re-uploading)
- [ ] Local-only synonyms (not present on WaniKani) are preserved — they will be uploaded by the existing `syncPendingSynonyms()` flow
- [ ] Support incremental sync using `updated_after` parameter to avoid re-fetching all study materials every time
- [ ] Store the last study materials sync timestamp in the `sync_status` table (new column: `last_study_materials_sync`)
- [ ] Downloaded synonyms appear in reviews, lessons, practice, and the new reverse practice
- [ ] All tests pass

### US-002: Store and use auxiliary meanings from subjects

**Description:** As a user, I want the app to recognize WaniKani's curated alternate answers (whitelist) and reject known misleading answers (blacklist) so that answer validation is accurate.

**Acceptance Criteria:**
- [ ] Add an `auxiliary_meanings` TEXT column to the `subjects` table (database migration to version 6)
- [ ] During subject sync (`convertSubjectToInput` in `src/sync/syncService.ts:101-146`), store `auxiliary_meanings` as a JSON string
- [ ] Update `ReviewsScreen.tsx` (line ~107) and `PracticeScreen.tsx` (line ~132) to load `auxiliary_meanings` from the subject instead of hardcoding `[]`
- [ ] Answer validation in `src/utils/answerValidation.ts` already handles auxiliary meanings — verify it works end-to-end with real data
- [ ] Whitelist meanings are accepted as correct answers
- [ ] Blacklist meanings are rejected with appropriate feedback
- [ ] All tests pass

### US-003: Sync completed items when leaving a review session

**Description:** As a user, I want items I fully completed during a review session to be synced to WaniKani even if I leave mid-session, so my progress is not lost.

**Acceptance Criteria:**
- [ ] When the user navigates away from the review screen, all items where both meaning and reading were answered correctly are submitted as reviews to WaniKani (or queued for offline sync)
- [ ] The `ReviewToSubmit` for these items has `incorrectMeaningAnswers` and `incorrectReadingAnswers` set to their actual counts (0 for both if answered correctly on first try)
- [ ] Submission uses the existing `submitReviews()` flow (`src/sync/syncService.ts`)
- [ ] Works offline — items queue to `pending_reviews` if no connection
- [ ] All tests pass

### US-004: Sync failed items when leaving a review session

**Description:** As a user, I want items where I got at least one wrong answer to count as failed reviews when I leave mid-session, so the SRS correctly demotes items I struggled with.

**Acceptance Criteria:**
- [ ] When the user navigates away, items that were started (at least one question answered) AND have at least one incorrect answer (meaning or reading) are submitted as reviews
- [ ] The `ReviewToSubmit` includes the actual `incorrectMeaningAnswers` and `incorrectReadingAnswers` counts
- [ ] Items where the user only answered correctly so far (started but zero failures) are NOT synced — these are lost
- [ ] Works offline — items queue to `pending_reviews` if no connection
- [ ] All tests pass

### US-005: Confirmation dialog when leaving a review session

**Description:** As a user, I want to see a confirmation dialog when navigating away from a review so I understand what progress will be lost.

**Acceptance Criteria:**
- [ ] When the user presses back/home navigation during an active review session, a confirmation dialog appears
- [ ] Dialog message includes the count of items that will be lost (started, with at least one correct answer, but zero failures)
- [ ] Dialog has two buttons: "Leave" (exits and syncs per US-003/US-004) and "Continue" (dismisses dialog, returns to session)
- [ ] If there are zero items that would be lost, still show the dialog but adjust the message (e.g., "All progress will be saved")
- [ ] The dialog blocks navigation until the user makes a choice
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-006: Reverse practice screen — navigation and data loading

**Description:** As a developer, I need the Reverse practice screen registered in navigation and loading vocabulary data so the feature has its foundation.

**Acceptance Criteria:**
- [ ] Add a new screen `ReversePracticeScreen` accessible from the Home dashboard
- [ ] Register the screen in `RootNavigator.tsx` with the same transition style as other screens
- [ ] Add a navigation entry point on the Home screen (button/card similar to the existing Practice entry)
- [ ] Load vocabulary-only practice items: query assignments with `srs_stage >= 5`, `started_at IS NOT NULL`, `available_at > now OR NULL`, and join with subjects where `object_type IN ('vocabulary', 'kana_vocabulary')`
- [ ] Load user synonyms for loaded items (for potential future use, consistency with other modes)
- [ ] Show a loading state while data loads and an empty state if no items are eligible
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-007: Reverse practice question flow

**Description:** As a user, I want to see an English meaning and type the corresponding kanji (or hiragana for kana vocabulary) so I can practice recall in the opposite direction.

**Acceptance Criteria:**
- [ ] Each question displays the primary English meaning of a vocabulary item as the prompt
- [ ] The user types their answer using a Japanese keyboard (free text input)
- [ ] Both vocabulary (kanji) and kana_vocabulary (hiragana-only) items are included
- [ ] Correct answer: the input matches the `characters` field of the vocabulary subject exactly (after trimming whitespace) — no alternative forms accepted
- [ ] On correct answer: show green "Correct!" feedback briefly (same timing as practice mode, ~500ms), then auto-advance
- [ ] On incorrect answer: show the incorrect feedback screen matching practice mode's design — red header with the item's characters, user's answer, correct answer (the kanji characters), and the meaning mnemonic
- [ ] User taps "Continue" to dismiss the incorrect screen and advance to the next question
- [ ] Questions auto-refill when running low, same pattern as practice mode (`REFILL_THRESHOLD`)
- [ ] The session is endless (no completion state) — user leaves by navigating away
- [ ] No SRS impact — this is purely for practice
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- **FR-1:** Fetch study materials from WaniKani API during background sync and store `meaning_synonyms` in the `user_synonyms` table
- **FR-2:** Support incremental study materials sync using `updated_after` timestamps stored in `sync_status`
- **FR-3:** When merging remote synonyms, overwrite local rows with identical text per subject; preserve local-only synonyms
- **FR-4:** Add `auxiliary_meanings` column to `subjects` table and populate during subject sync
- **FR-5:** Pass real `auxiliary_meanings` data to review items instead of empty arrays
- **FR-6:** On review session exit, categorize in-progress items into three buckets: completed, failed (started + has incorrect), and clean-started (started + no incorrect)
- **FR-7:** Submit completed and failed items as reviews via existing `submitReviews()` flow on session exit
- **FR-8:** Show confirmation dialog on review exit, displaying count of clean-started items that will be lost
- **FR-9:** Add `ReversePracticeScreen` to navigation, accessible from Home dashboard
- **FR-10:** Reverse practice loads only vocabulary/kana_vocabulary items at Guru+ level
- **FR-11:** Reverse practice displays English meaning as prompt and accepts kanji character input (free text, Japanese keyboard)
- **FR-12:** Reverse practice validates answers by exact match against the subject's `characters` field
- **FR-13:** Reverse practice shows incorrect feedback screen (same style as practice mode) with character, user answer, correct answer, and mnemonic
- **FR-14:** Reverse practice auto-refills question queue when running low

---

## Non-Goals (Out of Scope)

- No periodic/scheduled sync retry for pending synonyms (gap #3 from the analysis — separate effort)
- No syncing of study material notes (only `meaning_synonyms`)
- No review session resume — interrupted sessions sync what they can and end
- No SRS impact from reverse practice
- No multiple-choice or handwriting input for reverse practice
- No reverse practice for radicals or kanji (vocabulary only)
- No reading hints in reverse practice
- No reverse practice for items below Guru
- No alternative kanji form matching — answers must match WaniKani's `characters` field exactly
- No separate count/indicator for reverse practice eligibility on Home dashboard — the learned vocabulary count serves as the indicator

---

## Design Considerations

- The confirmation dialog on review exit should use the platform's native alert or the app's existing dialog pattern
- Reverse practice screen should follow the same visual structure as `PracticeScreen.tsx` — mode banner, character/meaning display area, text input, feedback screens
- Reverse practice entry on the Home dashboard should be visually distinct from the existing Practice button so users understand it's a different mode
- The incorrect feedback screen in reverse practice reuses the same layout and styling as practice mode's incorrect feedback

---

## Technical Considerations

- **Database migration:** Bump to version 6 to add `auxiliary_meanings` column to `subjects` and `last_study_materials_sync` column to `sync_status`
- **Study materials API pagination:** `getStudyMaterials()` may return paginated results — handle `next_url` pagination like existing sync methods
- **Review exit sync timing:** The exit sync must complete before navigation proceeds, or items must be queued to `pending_reviews` synchronously (SQLite insert is fast enough for this)
- **Offline support:** All three features must work offline. Study materials sync only runs when online. Review exit sync queues to `pending_reviews` if offline. Reverse practice is fully local.
- **Japanese keyboard input:** React Native `TextInput` supports Japanese input natively. May need `autoCorrect={false}` and `spellCheck={false}` to avoid interference. Consider `keyboardType` prop for appropriate keyboard presentation.
- **getPracticeItems reuse:** Reverse practice can reuse `getPracticeItems()` with an additional filter for `object_type IN ('vocabulary', 'kana_vocabulary')` — either add a parameter to the existing function or create a `getReversePracticeItems()` variant.

---

## Success Metrics

- Synonyms added on wanikani.com are available in the app after the next sync
- Auxiliary meanings (whitelist) are accepted as correct; blacklisted meanings are rejected
- When a user exits a review mid-session, completed and failed items appear in WaniKani's review history
- Users can practice kanji recall via the Reverse mode without affecting SRS

---

## Open Questions

All resolved:

1. **Alternative kanji forms?** → No. Answers must match WaniKani's `characters` field exactly.
2. **Include kana vocabulary (hiragana-only)?** → Yes. User types hiragana for those items.
3. **Dashboard indicator for reverse practice?** → No. The learned vocabulary count is the indicator.
