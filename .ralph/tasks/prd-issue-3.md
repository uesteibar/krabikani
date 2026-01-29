# PRD: Show Secondary Meanings in Reverse Practice Session

## Introduction

In reverse practice mode, users are shown an English meaning and must type the corresponding Japanese characters. Currently, only the primary meaning is displayed as the prompt. This can be confusing when a vocabulary item has multiple accepted meanings -- a user might know the word by a secondary meaning but not recognize the primary one shown on screen.

This feature adds secondary meanings below the primary meaning in smaller text, giving users full context about what word is being asked without needing to expand the details section.

## Goals

- Display all accepted secondary meanings below the primary meaning on the reverse practice question screen
- Display secondary meanings on the incorrect feedback screen as well
- Maintain visual hierarchy: primary meaning remains prominent, secondary meanings are clearly subordinate
- No changes to answer validation logic (already accepts all valid meanings)

## User Stories

### US-001: Show secondary meanings on reverse practice question screen
**Description:** As a learner, I want to see secondary meanings below the primary meaning during reverse practice so that I have full context about which word is being asked.

**Acceptance Criteria:**
- [ ] Primary meaning continues to display in large, bold text as it does today
- [ ] Secondary accepted meanings (where `accepted_answer: true` and `primary: false`) display below the primary meaning in smaller text
- [ ] Secondary meanings are comma-separated on a single line (e.g., "to consume, to have")
- [ ] When there are no secondary meanings, nothing extra is shown (no visual change for single-meaning items)
- [ ] Text does not overflow or clip within the meaning container for items with many meanings
- [ ] Changes are covered by unit/integration tests
- [ ] All tests pass

### US-002: Show secondary meanings on incorrect feedback screen
**Description:** As a learner, when I answer incorrectly during reverse practice, I want to see the secondary meanings alongside the primary meaning so I understand the full scope of the word I got wrong.

**Acceptance Criteria:**
- [ ] Incorrect feedback header shows primary meaning in the existing style
- [ ] Secondary accepted meanings display below the primary meaning in smaller text, matching the style from US-001
- [ ] When there are no secondary meanings, nothing extra is shown
- [ ] Changes are covered by unit/integration tests
- [ ] All tests pass

## Functional Requirements

- FR-1: Add a helper function to extract secondary accepted meanings from a `Meaning[]` array (filter by `accepted_answer: true` and `primary: false`)
- FR-2: On the reverse practice question screen (`ReversePracticeScreen.tsx`, around line 574), render secondary meanings below the primary meaning text
- FR-3: On the incorrect feedback screen (`ReversePracticeScreen.tsx`, around line 449), render secondary meanings below the primary meaning text
- FR-4: Secondary meanings must use a smaller font size than the primary meaning (e.g., `FONT_SIZES.md` or `FONT_SIZES.sm`) and reduced opacity or lighter weight to establish visual hierarchy
- FR-5: Secondary meanings are comma-separated in a single `Text` element

## Non-Goals

- No changes to answer validation logic (it already accepts all valid meanings)
- No changes to the expandable details section (ItemDetails component)
- No changes to how meanings are stored or fetched from the database
- No changes to the regular review session screens
- No display of auxiliary meanings (whitelist/blacklist) or user synonyms in the prompt area

## Design Considerations

- The meaning container (`meaningContainer` style, height ~232px) already has vertical centering and padding. Adding a second line of text should fit comfortably within this space.
- Use the existing theme system (`FONT_SIZES`, `SPACING`, `COLORS`) for consistent styling.
- Secondary text should be white like the primary text but with reduced opacity (e.g., 0.7) or a smaller font weight to create clear hierarchy.
- Follow the existing pattern in `ReviewSession.tsx` where `getAcceptedMeaningsDisplay()` joins meanings with commas.

## Technical Considerations

- All necessary data is already loaded in `ReversePracticeItem.meanings` -- no database or API changes needed.
- Only one file needs modification: `src/screens/ReversePracticeScreen.tsx`.
- A new helper function (e.g., `getSecondaryMeanings`) should be added alongside the existing `getPrimaryMeaning` function around line 216-219.
- New styles should be added to the existing `StyleSheet.create()` block at the bottom of the file.

## Success Metrics

- Secondary meanings are visible at a glance without expanding the details section
- No regression in reverse practice session performance or usability
- Visual hierarchy is clear: users can instantly identify the primary meaning

## Open Questions

- None. The scope is well-defined and isolated to a single file with no architectural decisions required.
