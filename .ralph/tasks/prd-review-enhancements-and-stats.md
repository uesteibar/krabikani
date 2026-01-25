# PRD: Review Enhancements and Home Screen Stats

## Introduction

This PRD covers a set of enhancements to improve the review experience and provide better visibility into learning progress. The changes include: displaying SRS level during reviews with animations on level changes, upgrading the review completion screen to match the polished lesson completion screen, adding a toggle to see full item details on incorrect answer screens, enabling users to add custom synonyms, displaying an upcoming reviews chart, and adding learned item counts to the home screen.

**Design Direction:** Playful & Celebratory with balanced timing. Animations should feel expressive and rewarding while not slowing down power users. Allow up to 500ms for meaningful moments (level-ups), but keep routine feedback snappy (under 300ms).

## Goals

- Provide visual feedback on SRS progression during reviews (level indicator + animations)
- Create a more satisfying review completion experience matching the lesson completion screen quality
- Allow users to optionally view complete item information when reviewing incorrect answers
- Enable users to add custom synonyms that sync to WaniKani
- Give users visibility into their upcoming review workload via a 12-hour forecast chart
- Show meaningful progress stats (kanji and vocabulary learned) on the home screen

## User Stories

### US-001: Display SRS Level During Review
**Description:** As a user, I want to see the current SRS level of the item I'm reviewing so that I understand where each item stands in my learning journey.

**Acceptance Criteria:**
- [ ] SRS level badge displayed on BOTH question screen AND answer feedback screen
- [ ] Badge shows level name without number: "Apprentice", "Guru", "Master", "Enlightened", "Burned"
- [ ] Badge uses WaniKani-style coloring:
  - Apprentice: Pink (#DD0093)
  - Guru: Purple (#882D9E)
  - Master: Blue (#294DDB)
  - Enlightened: Blue (#0093DD)
  - Burned: Gray (#434343)
- [ ] Badge includes WaniKani-style icon (bar/flame icon appropriate to level)
- [ ] Badge positioned consistently (e.g., top-right of character display or in header area)
- [ ] All tests pass

---

### US-002: Animate SRS Level Changes
**Description:** As a user, I want to see an animation when an item levels up or down after my answer so that I get satisfying feedback on my progress.

**Acceptance Criteria:**
- [ ] Animation sequence for level UP:
  1. Show OLD level briefly (200ms hold)
  2. Badge scales up slightly (1.0 → 1.15) with glow effect in new level's color
  3. Level name cross-fades to new level (300ms)
  4. Particle burst / sparkle effect around badge
  5. Badge scales back down (1.15 → 1.0) with ease-out
  6. Total duration: ~500ms
- [ ] Animation sequence for level DOWN:
  1. Show OLD level briefly (200ms hold)
  2. Badge shakes subtly (2-3 horizontal oscillations)
  3. Red tint pulse on badge
  4. Level name cross-fades to new level (250ms)
  5. Total duration: ~400ms
- [ ] Level change calculated based on WaniKani SRS rules:
  - Correct: +1 stage (up to Burned)
  - Incorrect: drops based on current stage (Apprentice 1-2 stay, others drop more)
- [ ] Animation only plays when level actually changes (not on every answer)
- [ ] Use `react-native-reanimated` for smooth 60fps animations
- [ ] All tests pass

---

### US-003: Upgrade Review Completion Screen
**Description:** As a user, I want the review completion screen to feel as polished as the lesson completion screen so that finishing reviews feels rewarding.

**Acceptance Criteria:**
- [ ] Entrance animation sequence (staggered, 100ms delays between elements):
  1. Success checkmark icon scales up from 0 with bounce (0 → 1.1 → 1.0)
  2. Checkmark draws itself (stroke animation) as it appears
  3. Items count fades in + slides up from below
  4. Incorrect count fades in + slides up
  5. Sync status badge fades in
  6. Button fades in last
- [ ] Success checkmark icon in colored circle (reviews purple)
- [ ] Total items reviewed in large, bold text (64px, matching lesson completion)
- [ ] Incorrect count in secondary text with appropriate color (red tint if any incorrect)
- [ ] Sync status with colored background ("Synced with WaniKani" green / "Queued for sync" amber)
- [ ] Styled "Return to Dashboard" button (not a text link)
- [ ] If 0 incorrect: extra celebration - confetti particles burst from checkmark
- [ ] Layout and spacing matches LessonCompletion component patterns
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev-browser skill

---

### US-004: Add Toggle for Full Item Details on Incorrect Screen
**Description:** As a user, when I get an answer wrong, I want the option to see all information about that item (not just the failed question type) so that I can study it more thoroughly.

**Acceptance Criteria:**
- [ ] Add expandable section on incorrect answer feedback screen
- [ ] Toggle button with chevron icon: "Show full details" (chevron down) / "Hide details" (chevron up)
- [ ] Chevron rotates 180° smoothly when toggling (200ms, ease-out)
- [ ] Content reveals with height animation using `LayoutAnimation` or reanimated
- [ ] When expanded, show in organized sections:
  - **Meanings section**: All meanings (primary bolded, alternatives in regular weight)
  - **Readings section**: All readings with reading types (on'yomi, kun'yomi, etc.)
  - **Meaning Mnemonic**: Full mnemonic text with formatting
  - **Reading Mnemonic**: Full mnemonic text (if applicable)
  - **Components**: Component radicals (for kanji) or component kanji (for vocabulary)
- [ ] Sections have subtle dividers and consistent spacing
- [ ] Toggle state resets for each new incorrect answer
- [ ] Default state is collapsed
- [ ] Expand/collapse animation: 250ms with ease-out-quart easing
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev-browser skill

---

### US-005: Add Synonym from Incorrect Answer Screen
**Description:** As a user, when my answer is marked incorrect but I believe it should be accepted, I want to add it as a synonym so that it's accepted in the future.

**Acceptance Criteria:**
- [ ] Secondary action link on incorrect answer screen: "Add as Synonym"
- [ ] Only appears on MEANING questions (WaniKani synonyms are meaning-only)
- [ ] Visually de-emphasized: text link style, smaller font, positioned below primary actions
- [ ] Tapping triggers this sequence:
  1. Link text changes to "Adding..." with subtle pulse
  2. Success feedback: checkmark icon appears inline, text changes to "Synonym added ✓"
  3. After 400ms, auto-marks question correct and advances to next
- [ ] Synonym is synced to WaniKani via Study Materials API
- [ ] If offline, synonym is queued for sync (similar to pending reviews)
- [ ] All tests pass

---

### US-006: Create Pending Synonyms Storage
**Description:** As a developer, I need to store synonyms locally and track pending syncs so that synonyms work offline and sync when connected.

**Acceptance Criteria:**
- [ ] Create database table for user synonyms: `user_synonyms` (subject_id, synonym, synced_at, created_at)
- [ ] Create table for pending synonym syncs: `pending_synonyms` (subject_id, synonym, created_at)
- [ ] When synonym is added:
  - Insert into `user_synonyms`
  - Insert into `pending_synonyms` if not immediately synced
- [ ] When sync completes, remove from `pending_synonyms` and update `synced_at`
- [ ] Answer validation checks `user_synonyms` table in addition to API meanings
- [ ] All tests pass

---

### US-007: Sync Synonyms to WaniKani
**Description:** As a user, I want my custom synonyms to sync to WaniKani so they're available across all my devices and apps.

**Acceptance Criteria:**
- [ ] Implement WaniKani Study Materials API integration:
  - GET study materials for a subject
  - POST/PUT to create or update study materials with meaning_synonyms
- [ ] On app startup or manual sync, push any pending synonyms
- [ ] Handle API errors gracefully (retry logic, user feedback if persistent failure)
- [ ] All tests pass

---

### US-008: Display Upcoming Reviews Chart on Home Screen
**Description:** As a user, I want to see a chart showing how many reviews are coming up in the next 12 hours so that I can plan my study time.

**Acceptance Criteria:**
- [ ] Bar chart displayed on home screen (in a dedicated section below main stats)
- [ ] Chart entrance animation: bars grow from bottom with staggered timing (50ms delay each, left to right)
- [ ] X-axis: 12 bars, one per hour for the next 12 hours
- [ ] Y-axis: Number of NEW reviews becoming available in that specific hour (not cumulative)
- [ ] Bars colored with reviews purple (#AA00FF), with subtle gradient (lighter at top)
- [ ] Hour labels shown below bars (e.g., "2pm", "3pm", or "+1h", "+2h" for compactness)
- [ ] Current hour highlighted differently (brighter or with accent border)
- [ ] On bar tap: show tooltip with exact count ("15 reviews at 3pm")
- [ ] If 0 reviews in next 12 hours: show empty state with friendly message and subtle illustration
  - Message: "No reviews coming up in the next 12 hours"
  - Consider showing when next review IS (e.g., "Next review in 2 days")
- [ ] Chart height constrained (~100-120px)
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev-browser skill

---

### US-009: Query Upcoming Reviews by Hour
**Description:** As a developer, I need a database query that groups upcoming reviews by hour so that the chart can be populated.

**Acceptance Criteria:**
- [ ] Create query function: `getUpcomingReviewsByHour(hours: number): { hour: Date, count: number }[]`
- [ ] Query groups assignments by `available_at` into hourly buckets
- [ ] Only includes assignments where:
  - `available_at` is within the next N hours
  - `started_at` is not null (item has been learned)
  - `srs_stage` > 0 and < 9 (not burned or unstarted)
- [ ] Returns array of 12 objects with hour timestamp and review count
- [ ] Hours with 0 reviews are included (count: 0) for chart continuity
- [ ] All tests pass

---

### US-010: Add Learned Counts to Home Screen
**Description:** As a user, I want to see how many kanji and vocabulary items I've learned (Guru or above) so that I can track my overall progress.

**Acceptance Criteria:**
- [ ] Display "Kanji Learned: X" on home screen
- [ ] Display "Vocabulary Learned: X" on home screen
- [ ] "Learned" is defined as SRS stage >= 5 (Guru 1 or above)
- [ ] Stats entrance animation: count up from 0 to actual number (500ms, ease-out)
- [ ] Counts update when returning to home screen after reviews/lessons
- [ ] Stats displayed in a visually consistent row/grid with existing home screen elements
- [ ] Consider showing total available for context (e.g., "423 / 2000 Kanji")
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev-browser skill

---

### US-011: Query Learned Item Counts
**Description:** As a developer, I need database queries to count learned kanji and vocabulary.

**Acceptance Criteria:**
- [ ] Create query: `getLearnedCount(subjectType: 'kanji' | 'vocabulary'): number`
- [ ] Query counts assignments where:
  - `srs_stage >= 5` (Guru or above)
  - Subject type matches (join with subjects table)
- [ ] Vocabulary count includes both 'vocabulary' and 'kana_vocabulary' types
- [ ] Query is efficient (uses appropriate indexes)
- [ ] All tests pass

---

## Functional Requirements

- **FR-1:** Display SRS level badge with WaniKani colors and icons on BOTH review question AND answer feedback screens
- **FR-2:** Animate level badge with old→new transition: scale + glow for level up, shake + red tint for level down
- **FR-3:** Review completion screen must include: animated success icon, items count (large), incorrect count, sync status badge, and styled button with staggered entrance
- **FR-4:** Incorrect answer screen must have an expandable toggle to reveal full item details with smooth height animation
- **FR-5:** "Add as Synonym" text link on MEANING questions only; adds synonym, shows success feedback, marks correct, and continues
- **FR-6:** User synonyms stored locally and synced to WaniKani Study Materials API
- **FR-7:** Bar chart on home screen shows NEW review counts per hour for next 12 hours with animated entrance
- **FR-8:** Home screen displays learned kanji and vocabulary counts (Guru+) with count-up animation

## Non-Goals (Out of Scope)

- No Noken/JLPT level equivalent display (too imprecise without grammar assessment)
- No SRS level history or progression graphs
- No ability to edit or delete synonyms after adding (can be added later)
- No review forecast beyond 12 hours
- No notifications or reminders based on upcoming reviews
- No bulk synonym import/export
- No radical learned count (only kanji and vocabulary)

## Design Considerations

### Animation & Motion Philosophy

**Personality:** Playful & Celebratory - animations should feel rewarding and expressive, celebrating progress.

**Timing Guidelines:**
- **Instant feedback (button taps, toggles):** 100-150ms
- **State changes (expand/collapse, transitions):** 200-300ms
- **Meaningful moments (level-up, completion):** 400-500ms
- **Exit animations:** 75% of entrance duration

**Easing Curves (use these, avoid bounce/elastic):**
```javascript
// React Native Reanimated
import { Easing } from 'react-native-reanimated';

const EASE_OUT_QUART = Easing.bezier(0.25, 1, 0.5, 1);     // Smooth, refined
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);      // Confident, decisive
```

**Reduced Motion:** Respect device accessibility settings. When reduced motion is enabled:
- Skip particle effects and confetti
- Use instant state changes instead of animations
- Keep functional feedback (color changes) but remove movement

### SRS Level Badge
- Compact pill/badge shape with subtle shadow
- Icon on left (WaniKani-style bars/flame), level name on right
- Match WaniKani's color scheme exactly for familiarity
- Glow effect uses the level's color with 0.3-0.5 opacity spread
- Consider subtle idle animation (very gentle pulse) for Burned items

### Review Completion Screen
- Reference `LessonCompletion.tsx` component for layout patterns
- Checkmark stroke animation: use SVG with animated stroke-dashoffset
- Confetti: 20-30 particles, variety of colors from theme palette, fade out over 1.5s
- Consider extracting shared `CompletionScreen` component

### Upcoming Reviews Chart
- Height constrained to ~100-120px
- Bars have 4px border-radius at top
- Use `react-native-svg` for custom chart (avoid heavy charting libraries)
- Animate bars growing from 0 to full height with spring physics
- Empty state: subtle animated illustration (e.g., sleeping mascot or peaceful scene)

### Incorrect Answer Toggle
- Chevron icon (24px) rotates smoothly
- Content sections have 1px divider lines in muted color
- Use `LayoutAnimation.configureNext()` or reanimated `useAnimatedStyle` for height

### Synonym Addition Feedback
- Inline feedback (no toast/modal) to keep user in flow
- Checkmark appears with scale animation (0 → 1.2 → 1.0)
- Green color (#4CAF50) for success state

## Technical Considerations

### Animation Libraries
- **Primary:** `react-native-reanimated` v3 for performant, gesture-driven animations
- **Layout changes:** `LayoutAnimation` API for simple expand/collapse
- **SVG animations:** `react-native-svg` + reanimated for checkmark stroke, chart bars
- **Particles/Confetti:** Consider `react-native-confetti-cannon` or custom implementation

### WaniKani Study Materials API
- Endpoint: `https://api.wanikani.com/v2/study_materials`
- Requires subject_id to create/update
- meaning_synonyms is an array of strings
- Need to handle case where study_material doesn't exist yet (POST) vs exists (PUT)

### SRS Stage Calculation
- WaniKani SRS rules for level changes:
  - Correct answer: stage + 1 (max 9)
  - Incorrect answer: stage drops based on current level
    - Stages 1-2: no drop
    - Stage 3-4: drop to stage 1
    - Stage 5+: drop by 2 stages (minimum stage 1)
- Calculate predicted new stage locally for animation purposes
- Map stages to level names:
  - 1-4: Apprentice
  - 5-6: Guru
  - 7: Master
  - 8: Enlightened
  - 9: Burned

### Database Indexes
- Index on `assignments(available_at)` for upcoming reviews query
- Composite index on `assignments(srs_stage, subject_id)` for learned counts

### Accessibility
- All animations respect `AccessibilityInfo.isReduceMotionEnabled()`
- Interactive elements have minimum 44x44 touch targets
- Color is not the only indicator (icons accompany level changes)
- Chart has accessible labels for screen readers

## Success Metrics

- Users can see their SRS level during reviews without leaving the review flow
- Review completion screen feels rewarding (matches lesson completion polish)
- Level-up animations create moments of delight and motivation
- Users can expand to see full item details on incorrect answers
- Users can add synonyms directly from the review flow (meaning questions only)
- Users can see their review workload at a glance via the chart
- Users can track kanji and vocabulary progress on the home screen
- Animations run at 60fps on target devices
- No animation blocks user interaction for more than 500ms

## Resolved Questions

1. **SRS level badge visibility:** Show on BOTH question phase AND answer feedback phase
2. **Level change animation:** Show OLD level briefly (200ms), THEN transition to new level
3. **"Add as Synonym" availability:** Only on MEANING questions (WaniKani synonyms are meaning-only)
4. **Chart data type:** Show NEW reviews per hour (not cumulative)
5. **Empty chart state:** Show empty state with friendly message ("No reviews in the next 12 hours")

## Open Questions

None - all questions resolved.
