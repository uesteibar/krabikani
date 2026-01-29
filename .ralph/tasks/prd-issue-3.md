# PRD: Show Secondary Meanings in Reverse Session

## Introduction

In the reverse practice mode, users are shown an English meaning and must recall the Japanese characters. Currently, only the primary meaning is displayed in the question header. This feature adds secondary meanings below the primary meaning in smaller text, giving users additional context to help them recall the correct vocabulary item — especially useful when the primary meaning alone is ambiguous (e.g., "to enter" could be multiple words).

## Goals

- Display all non-primary accepted meanings below the primary meaning during reverse practice
- Use smaller, visually subordinate text so the primary meaning remains the focal point
- Maintain the existing layout and UX flow without introducing clutter
- Improve recall accuracy by giving users more semantic cues

## User Stories

### US-001: Display secondary meanings in reverse practice question
**Description:** As a user practicing in reverse mode, I want to see secondary meanings below the primary meaning so that I have enough context to recall the correct Japanese word.

**Acceptance Criteria:**
- [ ] Below the primary meaning text (currently `meaningText` style, `FONT_SIZES.xxl` bold), secondary meanings are displayed in smaller text (`FONT_SIZES.sm`)
- [ ] Secondary meanings text uses a slightly translucent inverse color (e.g., `rgba(255, 255, 255, 0.75)`) to visually differentiate from the primary meaning
- [ ] Secondary meanings are shown as a comma-separated list (e.g., "big, large")
- [ ] Only meanings where `primary === false` are shown as secondary meanings
- [ ] If there are no secondary meanings, nothing extra is rendered (no empty space or placeholder)
- [ ] The `meaningContainer` layout accommodates both texts without overflow or clipping
- [ ] The "Correct!" label still displays correctly when the user answers correctly
- [ ] Changes are covered by unit tests
- [ ] All tests pass

### US-002: Update test data to include secondary meanings
**Description:** As a developer, I want test fixtures that include secondary meanings so that the feature is properly tested.

**Acceptance Criteria:**
- [ ] At least one sample subject in the test file has multiple meanings (primary + secondary)
- [ ] Test verifies secondary meanings text is rendered on screen
- [ ] Test verifies secondary meanings are NOT rendered when there is only a primary meaning
- [ ] All tests pass

## Functional Requirements

- FR-1: Extract secondary meanings from `item.meanings` by filtering for entries where `primary === false`
- FR-2: Render secondary meanings as a comma-separated string below the primary meaning `Text` component inside `meaningContainer`
- FR-3: Use `FONT_SIZES.sm` (14px) for the secondary meanings text, with inverse text color at reduced opacity
- FR-4: Do not render the secondary meanings `Text` component when there are no secondary meanings
- FR-5: The secondary meanings must be visible in both the active question view and the incorrect feedback header (where `getPrimaryMeaning` is currently used at line 449)

## Non-Goals

- No changes to answer validation logic — secondary meanings are display-only context
- No display of auxiliary meanings (whitelist/blacklist) in the question header
- No display of user synonyms in the question header
- No changes to the `ItemDetails` expandable section (it already shows all meanings)
- No changes to the regular (non-reverse) review session

## Technical Considerations

- The `Meaning` type (`src/api/types.ts:72`) already has `primary: boolean` — filter for `primary === false` to get secondary meanings
- The `ReversePracticeItem` interface (`src/screens/ReversePracticeScreen.tsx:47`) already carries a full `meanings: Meaning[]` array, so no data fetching changes are needed
- The `meaningContainer` style has a fixed `height: 232` — this should accommodate both texts, but may need adjustment or switch to `minHeight` if the combined text is too tall
- The `getPrimaryMeaning` helper at line 216 can be complemented with a `getSecondaryMeanings` helper that returns the filtered non-primary meanings as a formatted string
- The incorrect feedback header (around line 449) also shows the primary meaning and should similarly show secondary meanings for consistency

## Success Metrics

- Secondary meanings are visible at a glance without extra interaction
- Primary meaning remains the dominant visual element
- No regression in reverse practice session flow or performance

## Open Questions

- None — scope is well-defined based on the issue description and existing codebase.
