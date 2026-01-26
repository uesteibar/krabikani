# PRD: UX Polish and Zen Mode

## Introduction

This PRD covers a set of UX improvements and a new "zen mode" feature for the UnaiNikani WaniKani client. The changes include: fixing the upcoming reviews chart to include already-pending reviews in the cumulative count, adding navigation from component radicals/kanji to their detail screens, displaying encouragement messages at the end of review sessions, adding a zen mode setting to hide distracting UI during reviews, and redesigning the home screen lessons/reviews buttons to be more minimalistic.

## Goals

- Fix the upcoming reviews chart to show accurate cumulative totals (including already-pending reviews)
- Enable users to tap on component radicals/kanji to see their full details
- Provide positive reinforcement with encouraging messages at review completion
- Allow focused review sessions with zen mode (hide progress bar, count, and level badge)
- Make the home screen buttons more subtle and visually balanced

## User Stories

### US-001: Fix Upcoming Reviews Chart Cumulative Count
**Description:** As a user, I want the cumulative count in the upcoming reviews chart to include reviews I already have pending, so that the total accurately reflects my workload.

**Acceptance Criteria:**
- [ ] The number in parentheses (e.g., "(50)") includes reviews already available (not just future ones)
- [ ] The cumulative total = current pending reviews + sum of reviews becoming available through that hour
- [ ] The chart receives `currentPendingCount` as a prop from HomeScreen
- [ ] When there are 10 pending reviews and 5 coming in hour 1, the first row shows "+5 (15)"
- [ ] Unit tests verify the cumulative calculation includes pending reviews
- [ ] All tests pass

**Technical Notes:**
- Modify `UpcomingReviewsChart` to accept a new `currentPendingCount: number` prop
- Update the cumulative calculation to start from `currentPendingCount` instead of 0
- HomeScreen passes `reviewsCount` as `currentPendingCount`

---

### US-002: Add Settings Storage Infrastructure
**Description:** As a developer, I need a way to store user preferences locally so that features like zen mode can persist across app sessions.

**Acceptance Criteria:**
- [ ] Create `user_settings` table with key-value storage (setting_key TEXT PRIMARY KEY, setting_value TEXT)
- [ ] Add database functions: `getSetting(key)`, `setSetting(key, value)`, `getAllSettings()`, `deleteSetting(key)`
- [ ] Settings are NOT cleared when user clears API key data (separate from synced data)
- [ ] Settings support boolean, string, and number values (stored as JSON strings)
- [ ] Add migration to create the settings table
- [ ] Unit tests for all CRUD operations
- [ ] All tests pass

**Technical Notes:**
- Add `user_settings` table to database schema
- Use JSON.stringify/parse for value serialization
- clearAllData() should NOT clear settings (user preferences should persist)

---

### US-003: Add Zen Mode Setting
**Description:** As a user, I want to enable "zen mode" in settings so that I can have a distraction-free review experience.

**Acceptance Criteria:**
- [ ] New toggle in Settings screen: "Zen Mode" with description "Hide progress bar and stats during reviews"
- [ ] Setting persists to database using the new settings infrastructure
- [ ] Toggle shows current on/off state
- [ ] Default value is OFF (zen mode disabled)
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Add a new section in SettingsScreen for "Review Preferences" or similar
- Use `Switch` component for the toggle
- Store as `zen_mode_enabled` key with boolean value

---

### US-004: Apply Zen Mode to Review Session
**Description:** As a user with zen mode enabled, I want the review session to hide the progress bar, item count, and SRS level badge so I can focus purely on answering.

**Acceptance Criteria:**
- [ ] When zen mode is ON: hide progress bar, hide "X / Y" count text, hide SRS level badge
- [ ] When zen mode is ON: the "Wrap Up" button remains visible
- [ ] When wrap-up mode is activated: show progress bar and count (even in zen mode)
- [ ] When zen mode is OFF: normal behavior (all UI visible)
- [ ] ReviewSession fetches zen mode setting on mount
- [ ] Unit tests verify conditional rendering based on zen mode state
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Fetch setting via `getSetting('zen_mode_enabled')` in ReviewSession
- Add state for `isZenMode: boolean`
- Conditionally render progress bar, count, and SrsLevelBadge based on `!isZenMode || isWrappingUp`

---

### US-005: Create Item Detail Screen
**Description:** As a developer, I need a standalone screen to display full item details (radical, kanji, or vocabulary) so users can navigate to it from various places in the app.

**Acceptance Criteria:**
- [ ] New screen `ItemDetailScreen` added to navigation stack
- [ ] Screen accepts `subjectId: number` as route param
- [ ] Fetches subject data from database using `getSubjectById()`
- [ ] For kanji: fetches component radicals via `component_subject_ids`
- [ ] For vocabulary: fetches component kanji via `component_subject_ids`
- [ ] Displays all item information using a layout similar to LessonCard:
  - Header with character and subject type label
  - "Made up of" section (if applicable)
  - Meanings section
  - Readings section (for kanji/vocabulary)
  - Meaning mnemonic
  - Reading mnemonic (for kanji/vocabulary)
- [ ] Has a back button to return to previous screen
- [ ] Shows loading state while fetching data
- [ ] Shows error state if subject not found
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Add `ItemDetail: { subjectId: number }` to `RootStackParamList`
- Reuse existing components: MnemonicText, ComponentDisplay, RadicalImage
- Use similar styling patterns from LessonCard for visual consistency
- Header background color should match subject type (radical blue, kanji pink, vocabulary purple)

---

### US-006: Navigate to Item Detail from Components
**Description:** As a user, when I tap on a radical or kanji in the "made up of" section, I want to see the full details of that item so I can learn more about its components.

**Acceptance Criteria:**
- [ ] Tapping a component radical/kanji navigates to ItemDetailScreen
- [ ] Works in LessonCard's "Made up of" section
- [ ] Works in ReviewSession's incorrect answer feedback (inside ExpandableDetails/ItemDetails)
- [ ] Works in ItemDetails component (for recursive navigation)
- [ ] Navigation is a stack push (back button returns to previous screen)
- [ ] Visual feedback on tap (opacity change or similar)
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Wrap ComponentDisplay items in TouchableOpacity
- Use `navigation.navigate('ItemDetail', { subjectId: component.id })`
- May need to pass navigation prop down or use `useNavigation` hook
- Consider adding `onPress?: (subjectId: number) => void` prop to ComponentDisplay

---

### US-007: Add Encouragement Message to Review Completion
**Description:** As a user, I want to see an encouraging message when I finish my reviews so that I feel motivated to continue studying.

**Acceptance Criteria:**
- [ ] Encouraging message displayed below "Reviews Complete!" title
- [ ] Message randomly selected from a pool of 5-10 phrases
- [ ] Different message each session (pseudo-random selection)
- [ ] Examples of messages:
  - "Well done! Slow and steady wins the race."
  - "Great work! Every review brings you closer to fluency."
  - "Keep it up! Consistency is key."
  - "Excellent! Your future self will thank you."
  - "You're making progress! One review at a time."
  - "Nice! Another step on your Japanese journey."
  - "Fantastic! The SRS is working its magic."
- [ ] Message styled subtly (secondary text color, smaller font)
- [ ] Appears after the items reviewed count, before incorrect count
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Add ENCOURAGEMENT_MESSAGES constant array in ReviewCompletion
- Use `useMemo` with empty deps to select random message once per component mount
- Style similar to subtitle/secondary text

---

### US-008: Redesign Home Screen Buttons
**Description:** As a user, I want the lessons and reviews buttons on the home screen to be more minimalistic and visually subtle, with the text inside the button.

**Acceptance Criteria:**
- [ ] Buttons have outlined style (border instead of solid fill)
- [ ] Button background is white (or app background color)
- [ ] Border color matches the subject type (pink for lessons, purple for reviews)
- [ ] Count number displayed large inside the button (similar to current)
- [ ] Label text ("Lessons" / "Reviews") displayed below the count, INSIDE the button
- [ ] When count is 0: more subtle appearance (lighter border, muted text)
- [ ] Border width ~2px for visibility
- [ ] Maintains touch target size (min 44px, current 100px height is fine)
- [ ] Similar feel to the "Wrap Up" button style but with white background
- [ ] All tests pass
- [ ] Verify in simulator

**Technical Notes:**
- Modify DashboardStats component
- Remove solid backgroundColor, add borderWidth and borderColor
- Move the label Text inside the statBox View
- Adjust text colors to use the border color (not white/inverse)

---

## Functional Requirements

- **FR-1:** The upcoming reviews chart cumulative total must include already-pending reviews passed via `currentPendingCount` prop
- **FR-2:** User settings must be stored in a local database table that persists independently of synced data
- **FR-3:** Zen mode setting must be accessible from the Settings screen with a toggle control
- **FR-4:** When zen mode is enabled, ReviewSession must hide: progress bar, count text, and SRS level badge (except during wrap-up)
- **FR-5:** ItemDetailScreen must display complete subject information with consistent styling matching LessonCard
- **FR-6:** Component items (radicals/kanji in "made up of" sections) must be tappable and navigate to ItemDetailScreen
- **FR-7:** ReviewCompletion must display a randomly-selected encouragement message from a predefined pool
- **FR-8:** DashboardStats buttons must use outlined style with white background and text inside the button

## Non-Goals (Out of Scope)

- Sync zen mode setting to WaniKani (local-only preference)
- Additional settings beyond zen mode (can be added later)
- Animations for the item detail screen transitions (use default React Navigation transitions)
- Performance-based encouragement messages (same pool for all outcomes)
- Customizable encouragement messages
- Deep linking to item details from outside the app
- Swipe gestures in ItemDetailScreen (just back button navigation)

## Technical Considerations

- **Settings storage:** Use SQLite with key-value pattern for flexibility. JSON.stringify values for type safety.
- **Navigation:** Add ItemDetailScreen to the existing React Navigation stack. Use standard stack navigation for back button behavior.
- **Component reuse:** ItemDetailScreen should heavily reuse LessonCard's internal sections and styling patterns.
- **Testing:** Mock database functions in component tests. Use testID for button/section identification.
- **Accessibility:** Ensure tappable components have sufficient touch targets. Consider adding accessibilityLabel to component items indicating they're tappable.

## Design Considerations

### Item Detail Screen
- Header section with subject-type colored background (matches LessonCard)
- Large character display centered
- Subject type label below character
- Scrollable content area for meanings, readings, mnemonics
- Consistent spacing and typography with existing lesson screens
- Back button in header or use system back gesture

### Minimalistic Buttons
- Border width: 2px
- Border radius: maintain current (BORDER_RADIUS.lg)
- Border color: DASHBOARD_COLORS.lessons / DASHBOARD_COLORS.reviews
- Background: white (#FFFFFF) or COLORS.background.primary
- Count text: large, bold, colored to match border
- Label text: smaller, regular weight, colored to match border
- Empty state: 50% opacity on border and text (current pattern)

### Zen Mode Toggle
- Standard iOS/Android Switch component
- Label: "Zen Mode"
- Description text below: "Hide progress bar and stats during reviews"
- Grouped in a "Review Preferences" section

## Success Metrics

- Upcoming reviews chart accurately reflects total pending workload
- Users can drill down into component items to learn more about them
- Review completion feels more rewarding with encouragement messages
- Users who want focused practice can enable zen mode
- Home screen feels more balanced and less visually heavy

## Open Questions

None - all questions resolved.
