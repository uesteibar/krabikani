# PRD: Lesson & Review UI Improvements

## Introduction

A collection of UX improvements to enhance the lesson and review experience. These changes improve visual clarity, feedback timing, content rendering, and navigation flow to create a more polished and user-friendly app.

## Goals

- Provide clear visual distinction between reading and meaning question types (Tsurukame-style color bars)
- Improve feedback timing so correct answers feel more satisfying
- Properly render mnemonic content with highlighted radicals, kanji, and vocabulary
- Enable bidirectional navigation in lessons (back button + swipe gestures)
- Fix auto-advance bug after lesson completion so users control their learning pace

## User Stories

### US-001: Add visual indicator bar for question type
**Description:** As a user, I want to immediately see whether I'm being asked for a reading or meaning so I don't accidentally enter the wrong type of answer.

**Acceptance Criteria:**
- [ ] Full-width horizontal bar at the top of the quiz card
- [ ] Black bar for reading questions
- [ ] White bar (with subtle border for visibility) for meaning questions
- [ ] Bar is visible on both LessonQuiz and ReviewSession components
- [ ] Bar height is consistent (approximately 8-12px)
- [ ] Unit tests verify correct bar color based on question type
- [ ] All tests pass

### US-002: Increase correct answer feedback duration
**Description:** As a user, I want the correct answer animation to last slightly longer so I can appreciate the positive feedback before moving on.

**Acceptance Criteria:**
- [ ] Change `autoAdvanceDelay` from 200ms to 500ms in LessonQuiz
- [ ] Change equivalent delay in ReviewSession if applicable
- [ ] Animation feels satisfying but not sluggish
- [ ] Unit tests verify the timing constant
- [ ] All tests pass

### US-003: Parse and highlight mnemonic tags
**Description:** As a user, I want mnemonic text with `<radical>`, `<kanji>`, and `<vocabulary>` tags to render with appropriate highlight colors so the content is easier to read and understand.

**Acceptance Criteria:**
- [ ] Create a `MnemonicText` component that parses XML-like tags
- [ ] `<radical>` text highlighted with blue color (#00AAFF)
- [ ] `<kanji>` text highlighted with pink color (#FF00AA)
- [ ] `<vocabulary>` text highlighted with purple color (#AA00FF)
- [ ] Highlighted text has subtle background or text color styling
- [ ] Regular text renders normally
- [ ] Nested or malformed tags handled gracefully (render as plain text)
- [ ] Component used in LessonCard, LessonQuiz incorrect feedback, and ReviewSession
- [ ] Unit tests cover parsing logic and edge cases
- [ ] All tests pass

### US-004: Add back button to lesson navigation
**Description:** As a user, I want to go back to a previous lesson card if I need to review it again before continuing.

**Acceptance Criteria:**
- [ ] "Back" button appears when not on the first item (index > 0)
- [ ] Back button positioned on the left side of the card footer
- [ ] Next button remains on the right side
- [ ] Back button decrements `currentIndex` in LessonBatch
- [ ] First item shows only "Next" button (no back)
- [ ] Unit tests verify navigation state
- [ ] All tests pass

### US-005: Add swipe gestures to lesson cards
**Description:** As a user, I want to swipe left/right on lesson cards for quick navigation between items.

**Acceptance Criteria:**
- [ ] Swipe left advances to next item (same as tapping Next)
- [ ] Swipe right goes back to previous item (same as tapping Back)
- [ ] Swipe right on first item does nothing
- [ ] Swipe left on last item completes the batch (same as tapping Next)
- [ ] Swipe gesture has appropriate threshold to avoid accidental triggers
- [ ] Visual feedback during swipe (optional: subtle card movement)
- [ ] Works alongside tap navigation (buttons still functional)
- [ ] All tests pass

### US-006: Fix lesson completion auto-advance bug
**Description:** As a user, I want to stay on the completion screen after finishing a lesson batch until I choose to continue or return to dashboard.

**Acceptance Criteria:**
- [ ] After quiz completion, user sees LessonCompletion screen
- [ ] Screen remains visible until user taps a button
- [ ] No automatic navigation to next batch
- [ ] "Continue" button still available for users who want to proceed
- [ ] "Return to Dashboard" button takes user back to home
- [ ] Investigate and fix any race conditions or unintended state changes
- [ ] Add regression test to verify completion screen waits for user input
- [ ] All tests pass

## Functional Requirements

- FR-1: Display a colored bar at the top of quiz cards indicating question type (black=reading, white=meaning)
- FR-2: Set correct answer animation duration to 500ms
- FR-3: Parse mnemonic strings for `<radical>`, `<kanji>`, and `<vocabulary>` tags and render with colored highlights
- FR-4: Show "Back" button in lesson cards when currentIndex > 0
- FR-5: Support horizontal swipe gestures on lesson cards for navigation
- FR-6: Lesson completion screen must not auto-advance; require explicit user action

## Non-Goals

- No changes to incorrect answer animation duration
- No changes to quiz question order or SRS algorithm
- No changes to the number of items per lesson batch
- No keyboard shortcuts for navigation
- No haptic feedback for gestures (can be added later)

## Design Considerations

- The question type bar should be prominent but not overwhelming - similar to Tsurukame's implementation
- Mnemonic highlights should use WaniKani's standard colors for consistency
- Back/Next buttons should be balanced visually in the footer
- Swipe gestures should feel natural and have appropriate thresholds

## Technical Considerations

- `MnemonicText` component should use a regex-based parser for tag extraction
- Consider using `react-native-gesture-handler` for swipe implementation if not already installed
- The auto-advance bug may be related to async state updates or effect timing - investigate `handleQuizComplete` and phase transitions
- Mnemonic parsing should handle edge cases: unclosed tags, nested tags, empty content

## Success Metrics

- Users can identify question type at a glance without reading the prompt text
- Correct answer feedback feels more rewarding (subjective, but 500ms is a common standard)
- Mnemonic content is more readable with color-coded highlights
- Users can navigate lessons freely without feeling "locked in" to forward-only progression
- No reports of unexpected auto-advance after lesson completion

## Open Questions

- Should the question type bar animate when transitioning between questions?
- Should swipe gestures be enabled during the quiz phase as well (for navigating after incorrect answers)?
- Is the auto-advance issue consistent or intermittent? (Need to reproduce during implementation)
