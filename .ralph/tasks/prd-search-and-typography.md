# PRD: Search Feature and Typography Improvements

## Introduction

This PRD covers three related improvements to enhance the user experience:

1. **Subject Search** - A unified search screen to find learned radicals, kanji, and vocabulary by meaning, reading, or characters
2. **Lighter Japanese Display Font** - Switch to Noto Sans JP Light for large character display in reviews/lessons
3. **Heavier Answer Input Font** - Increase font weight in the answer TextInput for better readability
4. **Home Screen Button Redesign** - Add a Search button and restyle both Search and Settings buttons to be full-width with a subtle outline style

## Goals

- Allow users to quickly find any learned item without scrolling through lessons
- Improve visual hierarchy by using appropriate font weights for different contexts
- Make the home screen buttons more subtle and consistent
- Provide "show screens" for viewing item details outside of lesson/review flow

## User Stories

### US-001: Add Noto Sans JP Light font to the project
**Description:** As a developer, I need to add the Noto Sans JP Light font to the project so it can be used for Japanese text display.

**Acceptance Criteria:**
- [ ] Download Noto Sans JP Light (NotoSansJP-Light.ttf or .otf)
- [ ] Add font file to `assets/fonts/` directory
- [ ] Configure React Native to include the font (react-native.config.js or Info.plist/build.gradle)
- [ ] Create a typography constant for the Japanese display font family
- [ ] Verify font loads correctly on both iOS and Android
- [ ] All tests pass

### US-002: Apply lighter font to Japanese character display
**Description:** As a user, I want the large Japanese characters in reviews and lessons to use a lighter font weight so they're easier to read and less visually heavy.

**Acceptance Criteria:**
- [ ] Review screen character display (72pt) uses Noto Sans JP Light
- [ ] Lesson card character display uses Noto Sans JP Light
- [ ] Incorrect answer screen character display uses Noto Sans JP Light
- [ ] Font renders correctly for kanji, hiragana, katakana, and radicals
- [ ] All tests pass
- [ ] Verify in simulator/device that the font appears lighter than before

### US-003: Increase answer input font weight
**Description:** As a user, I want the text I type in the answer box to be slightly heavier so it's easier to read while typing.

**Acceptance Criteria:**
- [ ] Answer TextInput in ReviewSession uses fontWeight 600 (semi-bold)
- [ ] Answer TextInput in LessonQuiz uses fontWeight 600 (semi-bold)
- [ ] Text remains readable and doesn't feel too heavy
- [ ] All tests pass
- [ ] Verify in simulator/device that typed text appears heavier than before

### US-004: Redesign Settings button to outline style
**Description:** As a user, I want the Settings button to be more subtle and full-width so it doesn't dominate the home screen.

**Acceptance Criteria:**
- [ ] Settings button is full width (with standard horizontal margins)
- [ ] Settings button uses outline style: transparent background, subtle gray border, dark text
- [ ] Button has appropriate press state feedback
- [ ] All tests pass
- [ ] Verify in simulator/device that button looks subtle and full-width

### US-005: Add Search button to home screen
**Description:** As a user, I want a Search button on the home screen so I can easily access the search feature.

**Acceptance Criteria:**
- [ ] Search button appears above the Settings button
- [ ] Search button matches Settings button style (full-width, outline)
- [ ] Search button navigates to the new SearchScreen
- [ ] Appropriate spacing between Search and Settings buttons
- [ ] All tests pass
- [ ] Verify in simulator/device that button appears correctly

### US-006: Create SearchScreen with text input
**Description:** As a user, I want a search screen where I can type to search for learned items.

**Acceptance Criteria:**
- [ ] New SearchScreen accessible via navigation
- [ ] Search input field at the top with placeholder "Search radicals, kanji, vocabulary..."
- [ ] Search input auto-focuses when screen opens
- [ ] Back button/gesture to return to home screen
- [ ] Empty state message when no search query entered
- [ ] All tests pass
- [ ] Verify in simulator/device that screen renders correctly

### US-007: Implement full-text search logic
**Description:** As a developer, I need to implement the search logic to query learned subjects from the database.

**Acceptance Criteria:**
- [ ] Search queries subjects where started_at is not null (lesson completed)
- [ ] Search matches against: characters, meanings (all in array), meaning_mnemonic, reading_mnemonic, readings (all in array)
- [ ] Romaji input is converted to hiragana for reading matches
- [ ] Results prioritized: meaning matches first, then mnemonic/explanation matches
- [ ] Search is case-insensitive for English text
- [ ] Returns subject type (radical/kanji/vocabulary/kana_vocabulary) with each result
- [ ] Performance: search completes in under 500ms for typical queries
- [ ] All tests pass

### US-008: Display search results list
**Description:** As a user, I want to see search results as I type so I can quickly find what I'm looking for.

**Acceptance Criteria:**
- [ ] Results displayed as a scrollable list below the search input
- [ ] Each result shows: character (large), primary meaning, subject type badge
- [ ] Subject type badge colored appropriately (blue for radical, pink for kanji, purple for vocabulary)
- [ ] Results update as user types (debounced, ~300ms delay)
- [ ] "No results found" message when search returns empty
- [ ] Results count shown (e.g., "42 results")
- [ ] All tests pass
- [ ] Verify in simulator/device that results display correctly

### US-009: Create RadicalDetailScreen (show screen)
**Description:** As a user, I want to view radical details when I tap on a radical search result.

**Acceptance Criteria:**
- [ ] New RadicalDetailScreen accessible via navigation with subject_id parameter
- [ ] Displays: character (or image for image-only radicals), all meanings, meaning mnemonic
- [ ] Shows user's current SRS level badge for this item
- [ ] Shows "Used in Kanji" section listing kanji that use this radical (if available)
- [ ] Back button/gesture to return to search results
- [ ] Styled consistently with existing LessonCard component
- [ ] All tests pass
- [ ] Verify in simulator/device that screen renders correctly

### US-010: Create KanjiDetailScreen (show screen)
**Description:** As a user, I want to view kanji details when I tap on a kanji search result.

**Acceptance Criteria:**
- [ ] New KanjiDetailScreen accessible via navigation with subject_id parameter
- [ ] Displays: character, all meanings, all readings (grouped by type: on'yomi, kun'yomi, nanori)
- [ ] Shows user's current SRS level badge for this item
- [ ] Shows meaning mnemonic and reading mnemonic
- [ ] Shows component radicals with their meanings
- [ ] Shows meaning hint and reading hint if available
- [ ] Back button/gesture to return to search results
- [ ] Styled consistently with existing LessonCard component
- [ ] All tests pass
- [ ] Verify in simulator/device that screen renders correctly

### US-011: Create VocabularyDetailScreen (show screen)
**Description:** As a user, I want to view vocabulary details when I tap on a vocabulary search result.

**Acceptance Criteria:**
- [ ] New VocabularyDetailScreen accessible via navigation with subject_id parameter
- [ ] Displays: characters, all meanings, all readings
- [ ] Shows user's current SRS level badge for this item
- [ ] Shows meaning mnemonic and reading mnemonic
- [ ] Shows component kanji with their meanings
- [ ] Shows context sentences (Japanese + English)
- [ ] Shows parts of speech
- [ ] Audio playback button for pronunciation (if available)
- [ ] Works for both vocabulary and kana_vocabulary types
- [ ] Back button/gesture to return to search results
- [ ] Styled consistently with existing LessonCard component
- [ ] All tests pass
- [ ] Verify in simulator/device that screen renders correctly

### US-012: Navigate from search results to detail screens
**Description:** As a user, I want to tap a search result to view its full details.

**Acceptance Criteria:**
- [ ] Tapping a radical result navigates to RadicalDetailScreen
- [ ] Tapping a kanji result navigates to KanjiDetailScreen
- [ ] Tapping a vocabulary/kana_vocabulary result navigates to VocabularyDetailScreen
- [ ] Navigation passes subject_id correctly
- [ ] Back navigation returns to search screen with query preserved
- [ ] All tests pass
- [ ] Verify in simulator/device that navigation works correctly

## Functional Requirements

- FR-1: Add Noto Sans JP Light font to the app bundle
- FR-2: Apply Noto Sans JP Light to all large Japanese character displays (72pt display size)
- FR-3: Apply fontWeight 600 to answer TextInput in reviews and lesson quizzes
- FR-4: Restyle Settings button: full-width, transparent background, gray border (#666 or similar), dark text
- FR-5: Add Search button above Settings with matching outline style
- FR-6: Create SearchScreen with auto-focusing text input
- FR-7: Implement search that queries subjects where started_at is not null
- FR-8: Search must match against: characters, meanings[], meaning_mnemonic, reading_mnemonic, readings[]
- FR-9: Convert romaji input to hiragana for reading field matching
- FR-10: Prioritize results by match location: meanings first, then mnemonics
- FR-11: Display results with character, primary meaning, and colored subject type badge
- FR-12: Debounce search input by ~300ms
- FR-13: Create RadicalDetailScreen showing character/image, meanings, mnemonic, SRS level badge, amalgamation kanji
- FR-14: Create KanjiDetailScreen showing character, meanings, readings (by type), mnemonics, hints, component radicals, SRS level badge
- FR-15: Create VocabularyDetailScreen showing characters, meanings, readings, mnemonics, component kanji, context sentences, parts of speech, audio, SRS level badge
- FR-16: Navigate to appropriate detail screen when tapping search result
- FR-17: All detail screens display the user's current SRS level badge for that item

## Non-Goals (Out of Scope)

- No filtering by SRS level in search results
- No sorting options for search results (beyond the priority ranking)
- No search history or recent searches
- No "favorite" or "bookmark" functionality
- No offline-first search indexing (uses existing SQLite queries)
- Tapping "Kanji Learned" or "Vocabulary Learned" counters does nothing (remains display-only)
- No radical learned counter on home screen
- No changes to the existing LessonCard component (detail screens are new, separate screens)
- No "start review" or "practice this item" action from detail screens

## Technical Considerations

- **Font Loading:** React Native requires font files to be linked. For iOS, add to Info.plist UIAppFonts. For Android, place in `android/app/src/main/assets/fonts/`.
- **Search Performance:** SQLite LIKE queries may be slow on large datasets. Consider adding a debounce and limiting results. If needed, explore FTS (Full-Text Search) extension.
- **Romaji to Hiragana:** Reuse existing conversion logic from `ReviewSession` (used for reading input).
- **Component Reuse:** Detail screens can reuse `MnemonicText`, `ComponentDisplay`, `RadicalImage` components from lessons.
- **Navigation:** Add new screens to the navigation stack in App.tsx or navigation config.

## Design Considerations

- **Button Style:** Outline buttons should use ~1-2pt border, border color around #888 or muted, text color matching primary text color
- **Search Results:** Each row should have comfortable padding, character displayed prominently on the left, meaning and type badge on the right
- **Detail Screens:** Follow the visual pattern of `LessonCard` - large character at top, sections below with clear headings
- **Font Consistency:** Only apply Noto Sans JP to Japanese text; keep English text in system font

## Success Metrics

- Users can find any learned item in under 5 seconds
- Search results appear within 500ms of typing
- Font changes receive positive feedback (lighter display, heavier input)
- No performance regression in app startup or navigation

## Open Questions

None - all questions resolved.
