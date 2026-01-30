# PRD: Only Play SRS Level Animation on First Failure (Issue #5)

## Introduction

During review sessions, when a user answers incorrectly, the SRS level-down animation plays to indicate the item's SRS stage has dropped. However, because incorrect items are requeued for another attempt later in the session, the level-down animation plays again on every subsequent failure of the same item. This is misleading — the SRS penalty is determined by the first failure, and repeated failures within the same session do not cause additional level changes. After the first failure, the badge should simply display the new (already-downgraded) SRS level statically.

## Goals

- Show the SRS level-down animation only on the **first** incorrect answer for an item in a review session
- On subsequent failures of the same item, display the new SRS level as a static badge (no animation)
- Maintain the existing level-up animation behavior (unchanged)
- Ensure the displayed SRS level is always accurate and not confusing to the user

## User Stories

### US-001: Track first failure per item in a review session
**Description:** As a developer, I need to track which items have already had their first incorrect answer so the system knows when to suppress the level-down animation.

**Acceptance Criteria:**
- [ ] A data structure (e.g., a `Set<number>` of item IDs) tracks items that have already been marked as "level-down shown" during the current session
- [ ] When an item receives its first incorrect answer that triggers a level-down, the item ID is added to this set
- [ ] The set is initialized empty at the start of each review session
- [ ] All tests pass

### US-002: Show level-down animation only on first failure
**Description:** As a user, I want to see the SRS level-down animation only the first time I fail an item so that I understand my SRS level dropped, without being shown the same animation repeatedly.

**Acceptance Criteria:**
- [ ] On the first incorrect answer for an item that crosses an SRS level boundary, the level-down animation plays as it does today
- [ ] On subsequent incorrect answers for the same item, the SRS badge shows the new (downgraded) level statically — no shake animation or cross-fade
- [ ] The static badge after repeated failure displays the correct downgraded SRS stage (the stage calculated from `calculateSrsStageAfterIncorrect` using the item's **original** SRS stage, not the already-downgraded one)
- [ ] Level-up animation behavior remains unchanged
- [ ] All tests pass

### US-003: Display correct SRS stage on repeated failures
**Description:** As a user, when I fail an already-failed item again, I want to see my current (downgraded) SRS level displayed correctly so I'm not confused about my progress.

**Acceptance Criteria:**
- [ ] When an item has already failed and is shown again (requeued), the `getSrsBadge` function returns a static badge with the downgraded SRS stage
- [ ] The downgraded stage is consistent with what was shown in the initial level-down animation
- [ ] The static badge uses the correct color and label for the downgraded level
- [ ] All tests pass

## Functional Requirements

- FR-1: `ReviewSession` must maintain a `Set<number>` (or equivalent) that tracks item IDs for which the level-down animation has already been shown during the current session
- FR-2: In the `handleAnswer` callback, when processing an incorrect answer, the system must check whether the item ID is already in the "level-down shown" set before setting `pendingLevelDown`
- FR-3: If the item has NOT had a level-down animation shown yet (first failure crossing a level boundary), set `pendingLevelDown` as normal and add the item ID to the tracking set
- FR-4: If the item HAS already had a level-down animation shown (subsequent failure), do NOT set `pendingLevelDown` — the badge will be rendered statically
- FR-5: The `getSrsBadge` function must, for items that have already had their level-down shown, return a static badge with the downgraded SRS stage instead of the original `item.srsStage`
- FR-6: The downgraded stage should be computed once (on first failure) and stored or re-derived consistently using `calculateSrsStageAfterIncorrect(item.srsStage)` where `item.srsStage` is the original pre-session stage

## Non-Goals

- No changes to the level-up animation behavior
- No changes to how incorrect answer counts are tracked or submitted to the WaniKani API
- No changes to the requeue logic for incorrect items
- No changes to the animation visuals themselves (timing, particles, shake, etc.)
- No changes to zen mode behavior

## Technical Considerations

- The fix is localized to `ReviewSession.tsx` — specifically the `handleAnswer` callback (around lines 589–605) and the `getSrsBadge` callback (around lines 806–843)
- A `useRef<Set<number>>` is recommended for the tracking set since it doesn't need to trigger re-renders; alternatively a `useState<Set<number>>` could work if `getSrsBadge` needs it in its dependency array
- Consider storing a `Map<number, number>` (item ID → downgraded stage) instead of a plain `Set` so the downgraded stage is readily available in `getSrsBadge` without re-computing it
- The `ItemProgress` interface already tracks `incorrectMeaningAnswers` and `incorrectReadingAnswers`, which could theoretically be used to detect "has failed before" — but a dedicated tracking structure is cleaner and more explicit
- Care must be taken with the `getSrsBadge` fallback: currently it returns `{ type: 'static', stage: rq.item.srsStage }` which uses the **original** stage. For items that have already level-downed, this should return the downgraded stage instead

## Success Metrics

- Level-down animation plays exactly once per item per review session, on the first failure that crosses a level boundary
- Subsequent failures of the same item show the correct downgraded SRS level statically
- No visual regressions in animation quality or timing
- No regressions in SRS data submitted to WaniKani API

## Open Questions

- None — the issue description and codebase analysis provide sufficient clarity for implementation.
