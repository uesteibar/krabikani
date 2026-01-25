# PRD: UI Improvements and Typo Forgiveness

## Introduction

This PRD covers several UI improvements and a typo forgiveness feature for the UnaiNikani WaniKani client. The changes span the home screen, lesson screens, answer validation logic, and incorrect answer feedback screens. The goal is to improve the learning experience by fixing bugs, enhancing information display, and being more forgiving of minor typing mistakes.

## Goals

- Display user's current WaniKani level on the home screen
- Fix bug where radicals without Unicode characters show "?" instead of their image
- Improve mnemonic text rendering by supporting `<reading>` tags with italic styling
- Reorder the "made up of" section in kanji lessons to appear below the main kanji display
- Implement typo forgiveness for meaning answers using Damerau-Levenshtein distance
- Allow users to manually mark incorrect answers as correct
- Show component information (radicals for kanji, kanji for vocabulary) on incorrect answer screens
- Prevent submission of invalid reading answers (non-hiragana or empty)

## User Stories

### US-001: Fix radicals displaying "?" instead of image
**Description:** As a user, I want to see radical images for radicals without Unicode characters so that I can learn all radicals visually.

**Acceptance Criteria:**
- [ ] Radicals with `characters: null` display their image from `character_images` array
- [ ] Image fetched from WaniKani CDN URL (prefer SVG with `inline_styles: true`)
- [ ] Image displays at appropriate size (24x24 matching current character font size)
- [ ] Radical images are cached locally for offline use
- [ ] Fallback to meaning text if no image available
- [ ] Regression test added that verifies radicals without characters render correctly
- [ ] All tests pass

**Technical Notes:**
- `RadicalData.character_images` contains array of image options with URL and metadata
- Prefer SVG images with `inline_styles: true` for consistent rendering
- Cache images to device storage during sync for offline access
- Affects: `LessonBatch.tsx` component radicals section

---

### US-002: Support `<reading>` tags in MnemonicText with italic rendering
**Description:** As a user, I want reading hints in mnemonics to be displayed in italics so they stand out from regular text without being too visually heavy.

**Acceptance Criteria:**
- [ ] `<reading>text</reading>` tags render as italic text (no color, no bold)
- [ ] Works in lesson screens (LessonCard mnemonics)
- [ ] Works in incorrect answer feedback screens (LessonQuiz, ReviewSession)
- [ ] Existing tag types (`<radical>`, `<kanji>`, `<vocabulary>`) continue to work
- [ ] Unit tests added for `<reading>` tag parsing
- [ ] All tests pass

**Technical Notes:**
- Modify `/src/components/MnemonicText.tsx`
- Add 'reading' to the TAG_PATTERN regex
- Render with `fontStyle: 'italic'` instead of color/bold

---

### US-003: Move "made up of" section below kanji display in lessons
**Description:** As a user, I want to see the kanji character first before seeing its component radicals, so the visual flow matches how I learn (whole → parts).

**Acceptance Criteria:**
- [ ] "Made up of" section appears below the pink kanji character block
- [ ] Section still only appears for kanji items with component radicals
- [ ] Visual styling remains unchanged (light blue background, radical pills)
- [ ] Swipe gestures continue to work correctly
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/components/LessonBatch.tsx`
- Move the components container render block after the LessonCard

---

### US-004: Display current level on home screen
**Description:** As a user, I want to see my current WaniKani level on the home screen so I can track my progress at a glance.

**Acceptance Criteria:**
- [ ] User level displayed in the stats area near lessons/reviews counts
- [ ] Level fetched during initial sync and cached
- [ ] Display format: "Level X" with subtle styling (not dominant)
- [ ] Level updates after successful sync
- [ ] Handles loading state gracefully (shows placeholder or nothing)
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/screens/HomeScreen.tsx`
- Consider storing level in sync_status table or fetching with dashboard data
- Use existing color scheme (neutral colors for subtle display)

---

### US-005: Implement typo forgiveness for meaning answers
**Description:** As a user, I want minor typos in my meaning answers to be accepted so that I'm not penalized for typing mistakes when I know the correct answer.

**Acceptance Criteria:**
- [ ] Answers within acceptable edit distance are marked correct
- [ ] Tolerance: 1 edit for words 4-6 characters, 2 edits for words 7+ characters
- [ ] Uses Damerau-Levenshtein distance (handles transpositions like "teh" → "the")
- [ ] Only applies to meaning answers (not reading/hiragana answers)
- [ ] Exact matches still prioritized over fuzzy matches
- [ ] Blacklisted meanings still rejected even if within edit distance
- [ ] When answer accepted via typo forgiveness, show yellow/amber background instead of green
- [ ] Yellow feedback indicates "accepted but be careful" to the user
- [ ] Unit tests cover various typo scenarios
- [ ] All tests pass

**Technical Notes:**
- Modify `/src/utils/answerValidation.ts`
- Implement or import Damerau-Levenshtein algorithm
- Check fuzzy match only after exact match fails
- Return additional flag `isFuzzyMatch` in validation result
- Update UI components to show yellow background when `isFuzzyMatch` is true

**Algorithm Reference:**
```
Word length 1-3: exact match only (no typo tolerance)
Word length 4-6: allow 1 edit
Word length 7+:  allow 2 edits
```

---

### US-006: Add "Mark as Correct" button on incorrect answer screen
**Description:** As a user, I want to mark my answer as correct when I made a typo that wasn't caught by typo forgiveness, so I don't lose SRS progress for answers I actually knew.

**Acceptance Criteria:**
- [ ] "Mark as Correct" button appears alongside "Continue" button on incorrect feedback
- [ ] Tapping "Mark as Correct" treats the answer as correct (updates SRS accordingly)
- [ ] Button has distinct but secondary styling (not as prominent as Continue)
- [ ] Works in both LessonQuiz and ReviewSession screens
- [ ] No confirmation dialog needed (proceeds immediately)
- [ ] No usage limits - trust the user
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/components/LessonQuiz.tsx` and `/src/components/ReviewSession.tsx`
- Reuse existing correct answer handling logic
- Button styling: outline or secondary variant

---

### US-007: Show component radicals on incorrect kanji answer screen
**Description:** As a user, when I get a kanji answer wrong, I want to see the radicals that make up the kanji so I can better understand and remember it.

**Acceptance Criteria:**
- [ ] "Made up of" section displays below mnemonic on incorrect kanji answers
- [ ] Shows each component radical with character/image and meaning
- [ ] Uses same visual style as lesson screen (blue pills)
- [ ] Only appears for kanji items (not radicals or vocabulary)
- [ ] Handles radicals without Unicode characters (uses images per US-001)
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/components/LessonQuiz.tsx` and `/src/components/ReviewSession.tsx`
- Reuse or extract radical display component from LessonBatch
- Fetch component radicals using `component_subject_ids` from the kanji item

---

### US-008: Show component kanji on incorrect vocabulary answer screen
**Description:** As a user, when I get a vocabulary answer wrong, I want to see the kanji that make up the word with their relevant meaning or reading, so I can understand the word's composition.

**Acceptance Criteria:**
- [ ] "Made up of" section displays below mnemonic on incorrect vocabulary answers
- [ ] For meaning questions: shows each kanji character + its primary meaning
- [ ] For reading questions: shows each kanji character + its primary reading
- [ ] Uses pink kanji color scheme for consistency
- [ ] Only appears for vocabulary items with component kanji
- [ ] Gracefully handles vocabulary without kanji (kana-only words)
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/components/LessonQuiz.tsx` and `/src/components/ReviewSession.tsx`
- Fetch component kanji using `component_subject_ids` from the vocabulary item
- Query database for kanji meanings/readings

---

### US-009: Block submission of invalid reading answers
**Description:** As a user, I want the app to prevent me from submitting invalid reading answers (empty or containing non-hiragana characters) so I can fix my input without losing progress.

**Acceptance Criteria:**
- [ ] Empty reading answers are not submitted
- [ ] Reading answers containing non-hiragana characters (romaji, katakana, etc.) are not submitted
- [ ] When submission is blocked, input field shakes briefly (animation feedback)
- [ ] User can continue typing to fix their answer after shake
- [ ] Shake animation is subtle but noticeable (150-300ms duration)
- [ ] Works in both LessonQuiz and ReviewSession screens
- [ ] Unit tests verify invalid inputs are blocked
- [ ] All tests pass
- [ ] Verify in browser/simulator

**Technical Notes:**
- Modify `/src/components/LessonQuiz.tsx` and `/src/components/ReviewSession.tsx`
- Add validation check before `handleSubmit` processes the answer
- Use React Native `Animated` API for shake animation
- Regex to detect hiragana: `/^[\u3040-\u309F]+$/` (hiragana Unicode range)
- Do NOT mark answer as incorrect - just prevent submission and shake

---

## Functional Requirements

- FR-1: The system must display radical images when `characters` is null, using the `character_images` URL from WaniKani API, and cache them locally for offline use
- FR-2: The MnemonicText component must parse `<reading>` tags and render them in italic style
- FR-3: The kanji lesson screen must display the "made up of" section below the main kanji character block
- FR-4: The home screen must display the user's current WaniKani level in the stats area
- FR-5: The answer validation system must accept meaning answers within Damerau-Levenshtein distance thresholds (1 edit for 4-6 chars, 2 edits for 7+ chars) and indicate fuzzy matches with yellow feedback
- FR-6: The incorrect answer screen must include a "Mark as Correct" button that treats the answer as correct
- FR-7: The incorrect answer screen for kanji must display component radicals with their characters/images and meanings
- FR-8: The incorrect answer screen for vocabulary must display component kanji with their meanings (for meaning questions) or readings (for reading questions)
- FR-9: The system must block submission of reading answers that are empty or contain non-hiragana characters, and provide shake animation feedback

## Non-Goals (Out of Scope)

- Typo forgiveness for reading (hiragana) answers - hiragana input is more precise
- Audio pronunciation on incorrect screens
- Animated transitions for the "made up of" section
- User-configurable typo tolerance settings
- Undo functionality after marking as correct
- Showing visually similar kanji on incorrect screens
- Usage limits on "Mark as Correct" - trust the user

## Technical Considerations

- **Radical images**: Prefer SVG images with `inline_styles: true` from the `character_images` array. May need to use `react-native-svg` or similar for SVG rendering. Cache to local storage during sync.
- **Damerau-Levenshtein**: Implement in pure TypeScript or use a lightweight library. Algorithm handles insertions, deletions, substitutions, and transpositions.
- **Component data**: Both kanji and vocabulary store `component_subject_ids` as JSON in the database. Components need to be fetched from the subjects table.
- **Performance**: Typo checking runs on every answer submission - keep algorithm efficient. Consider early termination when edit distance exceeds threshold.
- **Shake animation**: Use `Animated.sequence` with `Animated.timing` for smooth shake effect. Keep duration short (150-300ms) to avoid frustrating the user.

## Success Metrics

- Radicals without Unicode characters display correctly (0 instances of "?")
- Reading tags render as italic in all mnemonic displays
- Users can see their level without navigating away from home screen
- Minor typos (1-2 character errors) are forgiven in meaning answers
- Yellow feedback clearly indicates when typo forgiveness was applied
- Users can override incorrect answers when they made typing mistakes
- Component information visible on all incorrect kanji/vocabulary answers
- Invalid reading submissions are blocked with clear feedback
