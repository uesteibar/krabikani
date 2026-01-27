# PRD: UX Improvements Batch 2

## Introduction

A collection of UX improvements and new features for Krabikani focused on practice flexibility, session polish, home screen refinements, and review flow improvements. These changes address pain points in the current experience: no way to practice outside SRS cycles, lack of session result detail, slow completion animations, and review queue management issues.

## Goals

- Allow users to practice learned items outside the SRS schedule
- Provide detailed session results (correct/failed items) at the end of reviews and lessons
- Unify and polish the completion experience across lessons and reviews
- Improve home screen information density and visual appeal
- Fix UX friction in lessons (quiz ordering, scroll position)
- Prevent review queue buildup during wrap-up by capping incomplete items

## User Stories

### US-013: Random Practice Mode

**Description:** As a user, I want to practice randomly sampled learned items (Guru or above) so that I can keep studying without affecting my SRS progress.

**Acceptance Criteria:**
- [ ] New "Practice" button on the home screen, placed below the Search button (same outline style)
- [ ] The button is always visible (regardless of pending reviews)
- [ ] Tapping it navigates to a new `Practice` screen
- [ ] The practice screen queries all items where `srs_stage >= 5` (Guru 1 and above) from the assignments/subjects tables
- [ ] Items that are currently pending a review (`available_at <= now`) are excluded from the practice pool
- [ ] Items are randomly sampled and presented as quiz questions (meaning + reading, same as review quiz)
- [ ] No progress bar, no pending count, no SRS badge, no subject type text label — pure flow mode
- [ ] Results do NOT affect SRS stage: no API calls, no database updates to assignments
- [ ] Session has no natural end; user exits via standard back navigation (hardware back or swipe gesture)
- [ ] If no learned items exist (no items at Guru+), shows an appropriate empty state when tapped
- [ ] Incorrect answers show the correct answer + mnemonic (same as review), tap to continue
- [ ] Correct answers auto-advance (same as review)
- [ ] Questions are continuously generated (when the queue runs low, sample more random items)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-014: Review Session Results List

**Description:** As a user, I want to see which items I got correct and which I failed at the end of a review session, so that I can identify my weak points.

**Acceptance Criteria:**
- [ ] After review completion, the finish screen shows summary stats: "N correct, M incorrect" above the results list
- [ ] Below the stats, an expandable "View Results" toggle (collapsed by default) reveals the full item list
- [ ] Each item in the list shows: characters, primary meaning, primary reading, and a correct/incorrect indicator (green checkmark or red X)
- [ ] List style matches the search results display: character on the left, meaning and reading to the right, subject type color accent
- [ ] Items with zero incorrect answers are marked correct; items with any incorrect answers are marked failed
- [ ] The list is scrollable within the completion screen
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-015: Randomize Lesson Quiz Questions

**Description:** As a user, I want the lesson quiz questions to appear in random order, so that I don't memorize answers by position.

**Acceptance Criteria:**
- [ ] The `generateQuizQuestions` function in `LessonQuiz.tsx` shuffles the final question array (currently it preserves item insertion order)
- [ ] The lesson card learning phase order remains unchanged (items shown in WaniKani's order)
- [ ] Only the quiz questions are randomized, not the lesson cards themselves
- [ ] Both meaning and reading question order per-item are randomized (which comes first)
- [ ] All tests pass

---

### US-016: Scroll to Top on Lesson Navigation

**Description:** As a user, I want the lesson card to scroll to the top when I tap Next or Back, so that I always start reading from the beginning of each card.

**Acceptance Criteria:**
- [ ] Tapping "Next" in the lesson batch scrolls the lesson card content to the top
- [ ] Tapping "Back" in the lesson batch scrolls the lesson card content to the top
- [ ] Swiping left/right to navigate also scrolls to the top
- [ ] The scroll reset is immediate (no animation delay)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-017: Unify Completion Screens

**Description:** As a user, I want the lesson and review completion screens to have a consistent, polished look, so the app feels cohesive.

**Acceptance Criteria:**
- [ ] The `LessonCompletion` component is refactored to use the same animated design as `ReviewCompletion` (staggered entrance animations, animated checkmark icon, confetti for perfect quiz)
- [ ] Both screens share a common completion component or follow the same visual pattern
- [ ] Animation timing is faster than the current `ReviewCompletion`: reduce `STAGGER_DELAY` from 600ms to 200ms and `FADE_DURATION` from 1500ms to 500ms
- [ ] The lesson completion screen retains its "Continue Lessons" button when more batches are available
- [ ] The review completion screen retains its "Return to Dashboard" button
- [ ] Encouragement messages are shown on both screens
- [ ] Sync status badge (Synced/Queued) is shown on both screens
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-018: Remove "Next Review In" from Home Screen

**Description:** As a user, I don't need the "Next review in X hours" indicator on the home screen since the upcoming reviews chart already shows this information.

**Acceptance Criteria:**
- [ ] The `NextReviewIndicator` component is removed from the home screen layout
- [ ] The upcoming reviews chart empty state still shows "Next review in X hours" when there are no reviews in the next 12 hours (this is useful context within the chart)
- [ ] No orphaned code: remove the `NextReviewIndicator` import and the `nextReviewAt` data loading if no longer needed anywhere
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-019: Enhanced Level Display on Home Screen

**Description:** As a user, I want the level display on the home screen to be more prominent and better styled, so I can clearly see my current progress.

**Acceptance Criteria:**
- [ ] The level indicator is redesigned to be more visually prominent (larger, better typography, possibly with a decorative element)
- [ ] The level display is visually cohesive with the learned counts (kanji/vocabulary) but doesn't need to be in the same row if space doesn't allow it
- [ ] The design uses existing theme colors and spacing tokens
- [ ] The level indicator remains near the top of the dashboard section (below the crab logo)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-020: Remove Current Hour from Upcoming Reviews Chart

**Description:** As a user, I don't want to see the current hour in the upcoming reviews chart because it's always empty (current reviews are shown as pending count).

**Acceptance Criteria:**
- [ ] The `getUpcomingReviewsByHour` query or the `UpcomingReviewsChart` component skips the current hour
- [ ] The chart starts from the next hour (hour + 1)
- [ ] The cumulative count still correctly includes the current pending reviews as the base
- [ ] If all remaining hours have zero reviews, the empty state is shown
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-021: Animated Crab on Home Screen

**Description:** As a user, I want the crab mascot on the home screen to do a subtle animation when I tap it, adding personality to the app.

**Acceptance Criteria:**
- [ ] Tapping the crab image triggers a tilt/rock animation (rocks left-right a couple of times, like a crab walking)
- [ ] The animation is subtle and brief (under 1 second)
- [ ] Uses `react-native-reanimated` for smooth 60fps animation
- [ ] The crab image is wrapped in a `TouchableOpacity` or `Pressable` with the animation trigger
- [ ] Animation does not block interaction (user can scroll or tap other elements during animation)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-022: Remove Subject Type Text Label from Review Sessions

**Description:** As a user, I don't need the "radical" / "kanji" / "vocabulary" text label below the characters during review sessions, because the background color already conveys the subject type.

**Acceptance Criteria:**
- [ ] The subject type text label (e.g., "radical", "kanji", "vocabulary", "kana vocabulary") is removed from the review session question view
- [ ] The background color continues to indicate subject type (blue for radical, pink for kanji, purple for vocabulary)
- [ ] The label is also not present in practice mode (US-013)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-023: Limit Review Buffer to 10 Incomplete Items

**Description:** As a user, I want the review session to limit the number of "in-progress" items (where I've answered one question but not the other) to 10, so that wrapping up doesn't leave me with a massive backlog.

**Acceptance Criteria:**
- [ ] During a review session, the system tracks how many items have been "initiated" (at least one question answered) but not yet "completed" (both meaning and reading correct)
- [ ] When the incomplete item count reaches 10, the system stops introducing questions for new items
- [ ] Instead, it only shows questions for items that are already initiated (similar to wrap-up behavior, but automatic)
- [ ] Once an initiated item is completed (both questions answered correctly), a new item can be introduced
- [ ] This cap applies during normal review flow (not just wrap-up mode)
- [ ] When wrap-up mode is activated, the existing wrap-up logic takes precedence (stops all new items)
- [ ] The cap is a constant (e.g., `MAX_INCOMPLETE_ITEMS = 10`) for easy adjustment
- [ ] All tests pass

---

## Functional Requirements

- FR-1: Practice mode queries subjects with `srs_stage >= 5` from local database and presents randomized quiz questions
- FR-2: Practice mode does not submit results to WaniKani API or update local SRS data
- FR-3: Review completion screen displays per-item correct/incorrect results in an expandable list with summary stats
- FR-4: Lesson quiz `generateQuizQuestions` shuffles the question array using Fisher-Yates algorithm
- FR-5: Lesson card navigation (Next/Back/swipe) resets scroll position to top
- FR-6: `LessonCompletion` adopts `ReviewCompletion`'s animated design with faster timing (200ms stagger, 500ms fade)
- FR-7: `NextReviewIndicator` is removed from the home screen; its data in the chart empty state is preserved
- FR-8: Level indicator on home screen is redesigned with increased visual prominence
- FR-9: `UpcomingReviewsChart` excludes the current hour row from the chart
- FR-10: Tapping the crab mascot triggers a tilt/rock animation using `react-native-reanimated`
- FR-11: Subject type text label is removed from the review session question view (background color is sufficient)
- FR-12: Review session enforces a hard cap of 10 incomplete items; new item introduction pauses when cap is reached

## Non-Goals (Out of Scope)

- No statistics or analytics tracking for practice mode sessions
- No custom practice mode filters (e.g., by subject type, level, or SRS stage)
- No audio playback in practice mode
- No streak tracking or gamification for practice mode
- No lesson quiz ordering customization (random is the new default)
- No redesign of the upcoming reviews chart beyond removing the current hour
- No interactive crab animation beyond the tap-triggered tilt (no idle animations)
- No configurable buffer size in settings (the 10-item cap is hardcoded)

## Design Considerations

- The practice button uses the same outline style as Search/Settings buttons for visual consistency
- The results list in the completion screen follows the search results card pattern (character + meaning + reading + subject color accent)
- The completion screen animations should feel snappy — the current 600ms stagger feels sluggish
- The level indicator redesign should be bold but not overwhelming; it competes with lesson/review counts for attention
- The crab animation should be delightful but not distracting — a quick tilt/rock lasting ~600ms

## Technical Considerations

- Practice mode reuses `ReviewSession` component logic but without SRS callbacks — consider a `practiceMode` prop or a lightweight wrapper component
- The review buffer cap requires modifying `findNextQuestionIndex` in `ReviewSession.tsx` to skip questions for new items when the cap is reached
- Lesson scroll reset requires a `ScrollView` ref in `LessonCard` and calling `scrollTo({y: 0})` on navigation
- The `generateQuizQuestions` function in `LessonQuiz.tsx` just needs a `shuffleArray` call on the final output (the function from `ReviewSession.tsx` can be shared)
- The unified completion component could be a shared `SessionCompletion` component with props for customization, or `LessonCompletion` could simply adopt `ReviewCompletion`'s pattern directly
- The crab animation uses `useSharedValue` and `withSequence`/`withTiming` from `react-native-reanimated` for the tilt rotation

## Success Metrics

- Practice mode is accessible in under 2 taps from the home screen
- Review completion shows correct/failed breakdown without requiring external tracking
- Lesson quiz question order is non-deterministic across sessions
- Lesson card always starts from the top when navigating
- Completion screen animation completes in under 2 seconds (vs ~5+ seconds currently)
- Wrapping up a review session with the buffer cap never leaves more than 10 items to finish

## Resolved Questions

- **Should the practice button be hidden when there are pending reviews?** No — always shown. Items pending review are excluded from the practice pool instead.
- **Should practice mode show the subject type text label?** No — the background color already indicates subject type. The redundant text label is also being removed from review sessions (US-022).
