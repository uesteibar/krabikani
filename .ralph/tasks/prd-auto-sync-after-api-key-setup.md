# PRD: Auto-Sync After API Key Setup

## Introduction

When a user sets up their WaniKani API key for the first time, the app currently validates and saves the key but does not automatically sync data. This leaves users on a dashboard showing "0 Lessons, 0 Reviews" with "Last synced: Never synced" - an impossible state for any real WaniKani account. Users must manually discover pull-to-refresh to trigger their first sync, which is not intuitive.

This feature adds automatic initial sync immediately after a successful API key setup, providing a seamless onboarding experience.

## Goals

- Automatically sync WaniKani data (subjects and assignments) after saving a valid API key
- Provide clear visual feedback during the sync process
- Navigate user to the Home screen after sync completes, showing their actual lesson/review counts
- Eliminate the confusing "0/0 with Never synced" state for new users

## User Stories

### US-001: Show sync progress after API key validation
**Description:** As a user, I want to see sync progress after saving my API key so that I know the app is downloading my data.

**Acceptance Criteria:**
- [ ] After successful API key validation, show a syncing state instead of just "Success" alert
- [ ] Display a progress indicator (spinner or progress text) during sync
- [ ] Show "Syncing your data..." or similar message during the process
- [ ] User cannot dismiss the sync UI while sync is in progress
- [ ] All tests pass

### US-002: Sync subjects and assignments after API key save
**Description:** As a user, I want my WaniKani data to be downloaded automatically after saving my API key so that I can start using the app immediately.

**Acceptance Criteria:**
- [ ] After API key is saved, automatically call `syncSubjects()` with user's level
- [ ] After API key is saved, automatically call `syncAssignments()`
- [ ] Sync happens in parallel for faster completion
- [ ] User's level is fetched via `getUserLevel()` before syncing subjects
- [ ] All tests pass

### US-003: Navigate to Home after successful sync
**Description:** As a user, I want to be taken to the Home screen after my data syncs so that I can immediately see my available lessons and reviews.

**Acceptance Criteria:**
- [ ] After sync completes successfully, automatically navigate to Home screen
- [ ] Home screen shows updated lesson/review counts (not 0/0)
- [ ] "Last synced" indicator shows the current sync time
- [ ] All tests pass

### US-004: Handle sync errors gracefully
**Description:** As a user, I want to see a clear error message if sync fails so that I know what went wrong and can try again.

**Acceptance Criteria:**
- [ ] If sync fails, show an error alert with the failure reason
- [ ] Offer a "Retry" option to attempt sync again
- [ ] User must retry until sync succeeds (no skip option)
- [ ] API key remains saved even if sync fails
- [ ] All tests pass

### US-005: Show sync progress indicator on Home screen
**Description:** As a user, I want to see when the app is syncing data on the Home screen so that I know my data is being updated.

**Acceptance Criteria:**
- [ ] When a sync is in progress (from pull-to-refresh), show a "Syncing..." indicator
- [ ] The indicator is informative only (no cancel option needed)
- [ ] Indicator disappears when sync completes (success or failure)
- [ ] All tests pass

## Functional Requirements

- FR-1: After `saveApiKey()` succeeds, the app must automatically initiate a data sync
- FR-2: The sync must fetch the user's level via `getUserLevel()` before syncing subjects
- FR-3: The sync must call `syncSubjects(client, { maxLevel: userLevel })` and `syncAssignments(client)` in parallel
- FR-4: The Settings screen must display a non-dismissible sync progress UI during sync
- FR-5: Upon successful sync completion, the app must navigate to the Home screen
- FR-6: Upon sync failure, the app must display an error with a "Retry" option (no skip)
- FR-8: The Home screen must display a "Syncing..." indicator when pull-to-refresh sync is in progress
- FR-7: The sync progress UI should show a spinner and descriptive text (e.g., "Syncing your WaniKani data...")

## Non-Goals

- No changes to the Home screen pull-to-refresh behavior
- No changes to the DashboardStats button enable/disable logic
- No progress percentage display (just a spinner is sufficient)
- No background sync - this is only for the initial setup flow
- No changes to the "Clear API Key" flow

## Technical Considerations

- Reuse existing sync functions from `src/sync/index.ts`: `syncSubjects`, `syncAssignments`, `getUserLevel`
- Reuse existing `WaniKaniClient` from `src/api/wanikaniApi.ts`
- The SettingsScreen will need access to navigation to navigate to Home after sync
- Consider using a modal or replacing the current Alert with a custom sync progress view
- The sync should be cancellable if the user leaves the screen (cleanup on unmount)

**Relevant files:**
- `src/screens/SettingsScreen.tsx` - Main file to modify (lines 41-71 `handleSave` function)
- `src/screens/HomeScreen.tsx` - Add syncing indicator during pull-to-refresh
- `src/sync/index.ts` - Sync functions to call
- `src/api/wanikaniApi.ts` - WaniKaniClient class

**Current flow (SettingsScreen.tsx:41-71):**
1. Validate API key
2. Save API key
3. Show success Alert
4. User manually goes back to Home
5. User manually pulls to refresh

**New flow:**
1. Validate API key
2. Save API key
3. Show sync progress UI (replacing Alert)
4. Fetch user level, sync subjects + assignments in parallel
5. On success: navigate to Home automatically
6. On error: show error with Retry/Skip options

## Success Metrics

- New users see their actual lesson/review counts within 30 seconds of saving their API key
- Zero instances of "0/0 with Never synced" state after successful API key setup
- Sync errors are clearly communicated with actionable options

## Testing Notes

**Manual Testing with mobile-mcp:**
- Use `@mobilenext/mobile-mcp` to test on Android emulator
- Use the WaniKani API key from `.env` file (`WANIKANI_API_TOKEN`) for testing
- Test the full flow:
  1. Launch app on emulator (fresh install or cleared data)
  2. Navigate to Settings
  3. Enter the API key from `.env`
  4. Tap "Save API Key"
  5. Verify sync progress UI appears
  6. Verify automatic navigation to Home after sync
  7. Verify lesson/review counts are populated (not 0/0)
  8. Verify "Last synced" shows current time
- Test error handling:
  1. Disconnect network before saving API key
  2. Verify error message with "Retry" option appears
  3. Reconnect network and tap "Retry"
  4. Verify sync completes successfully
- Test Home screen sync indicator:
  1. On Home screen, pull to refresh
  2. Verify "Syncing..." indicator is visible during sync

## Open Questions

None - all questions resolved.
