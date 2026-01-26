# PRD: Review Notifications and App Badge

## Introduction

Add local notifications and app badge functionality to help users stay on top of their WaniKani reviews. The app will show a badge on the app icon indicating the number of available reviews, and send hourly notifications when there are 20 or more reviews pending. This encourages consistent study habits without being intrusive.

## Goals

- Display app icon badge showing total available reviews count
- Send hourly notifications (at o'clock) when 20+ reviews are available
- Provide a simple on/off toggle for notifications in settings
- Request notification permissions on first launch with clear explanation
- Keep notifications non-intrusive (vibration only, suppressed when app is open)

## User Stories

### US-001: Add notification permissions request on first launch
**Description:** As a new user, I want to understand why the app needs notification permissions so that I can make an informed decision about enabling them.

**Acceptance Criteria:**
- [ ] On first app launch, display a pre-permission screen explaining notification purpose
- [ ] Explanation text communicates value: "Get reminded when you have reviews waiting so you never miss a study session"
- [ ] Screen has "Enable Notifications" and "Maybe Later" buttons
- [ ] Tapping "Enable Notifications" triggers the system permission dialog
- [ ] Tapping "Maybe Later" skips and stores preference (can enable later in settings)
- [ ] Permission request state persisted (don't ask again on subsequent launches)
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev tools

### US-002: Implement notification service infrastructure
**Description:** As a developer, I need a notification service that can schedule and manage local notifications so that other features can trigger notifications reliably.

**Acceptance Criteria:**
- [ ] Install and configure `@notifee/react-native` (or equivalent notification library)
- [ ] Create `src/services/notificationService.ts` with functions:
  - `requestPermissions()`: Request notification permissions from OS
  - `checkPermissions()`: Check current permission status
  - `scheduleHourlyNotification()`: Schedule notification for next o'clock
  - `cancelAllNotifications()`: Cancel all scheduled notifications
  - `setBadgeCount(count: number)`: Update app icon badge
  - `clearBadge()`: Remove badge from app icon
- [ ] Configure iOS notification settings (UNUserNotificationCenter)
- [ ] Configure Android notification channel with vibration only (no sound)
- [ ] All tests pass

### US-003: Schedule hourly review notifications
**Description:** As a user, I want to receive a notification every hour (at o'clock) when I have 20+ reviews waiting so that I'm reminded to study without being overwhelmed by constant alerts.

**Acceptance Criteria:**
- [ ] Background task runs at the top of each hour (e.g., 10:00, 11:00, 12:00)
- [ ] Task queries total available reviews (current + any becoming available at that hour)
- [ ] If count >= 20, schedule a local notification
- [ ] Notification message format: "{count} reviews ready! Time to level up your Japanese"
- [ ] Notification uses vibration only (no sound)
- [ ] Notification is NOT shown if app is in foreground
- [ ] Tapping notification opens the app (deep link to home screen)
- [ ] All tests pass

### US-004: Update app badge when notification fires
**Description:** As a user, I want to see the number of pending reviews on the app icon so that I know at a glance if I have work to do.

**Acceptance Criteria:**
- [ ] When hourly notification fires, update app badge to current available review count
- [ ] Badge shows exact number (e.g., "47" not "40+")
- [ ] Badge displays correctly on both iOS and Android
- [ ] Badge count of 0 clears the badge entirely
- [ ] All tests pass

### US-005: Update badge when reviews are completed
**Description:** As a user, I want the badge to reflect my actual pending reviews so that completing reviews is satisfying and accurate.

**Acceptance Criteria:**
- [ ] After completing a review session, recalculate available reviews count
- [ ] Update app badge to new count
- [ ] If count reaches 0, clear badge entirely
- [ ] Badge updates happen when review session ends (not during)
- [ ] All tests pass

### US-006: Add notification toggle to settings
**Description:** As a user, I want to turn notifications on or off so that I have control over when the app can interrupt me.

**Acceptance Criteria:**
- [ ] Add "Review Notifications" toggle in Settings screen
- [ ] Toggle is ON by default (if permissions granted)
- [ ] Toggle is disabled (grayed out) if permissions not granted, with helper text
- [ ] Helper text when disabled: "Enable in system settings"
- [ ] Tapping disabled toggle opens system notification settings for the app
- [ ] When toggled OFF: cancel all scheduled notifications and clear badge
- [ ] When toggled ON: schedule next hourly notification check
- [ ] Setting persists across app restarts
- [ ] All tests pass
- [ ] Verify in browser/simulator using dev tools

### US-007: Handle notification permission changes
**Description:** As a user, I want the app to respect my system-level notification settings so that behavior is consistent with my preferences.

**Acceptance Criteria:**
- [ ] When app returns to foreground, check current permission status
- [ ] If permissions were revoked externally, update settings toggle to reflect this
- [ ] If permissions were granted externally, enable the toggle
- [ ] No duplicate permission requests after initial ask
- [ ] All tests pass

## Functional Requirements

- FR-1: The app must request notification permissions on first launch with an explanatory pre-permission screen
- FR-2: The system must schedule a background check at the top of every hour (XX:00)
- FR-3: When available reviews >= 20 at o'clock, the system must display a local notification with vibration
- FR-4: The notification must NOT display when the app is in the foreground
- FR-5: The app badge must update to show available review count when a notification fires
- FR-6: The app badge must update after a review session completes to reflect new count
- FR-7: A badge count of 0 must clear the badge from the app icon
- FR-8: Users must be able to toggle notifications on/off in Settings
- FR-9: When notifications are disabled, all scheduled notifications must be cancelled and badge cleared
- FR-10: The notification message format must be: "{count} reviews ready! Time to level up your Japanese"
- FR-11: Notifications must use vibration only (no sound)

## Non-Goals (Out of Scope)

- Push notifications from a server (local notifications only)
- Customizable notification thresholds (fixed at 20)
- Customizable notification schedule (fixed at hourly)
- Quiet hours / do-not-disturb integration
- Custom notification sounds
- Notification grouping or stacking
- Rich notifications with actions (just tap to open)
- Apple Watch or wearable notifications
- Expo or Expo Go integration

## Design Considerations

- **Pre-permission screen:** Should match existing app styling (dark theme, clean typography)
- **Settings toggle:** Reuse existing toggle component pattern from Zen Mode setting
- **Notification icon:** Use existing app icon (cabrigator)
- **Android notification channel:** Name it "Review Reminders" for user clarity in system settings

## Technical Considerations

- **Recommended library:** `@notifee/react-native` - well-maintained, supports badges, background tasks, and works with bare RN
- **Alternative:** `react-native-push-notification` if notifee has issues
- **Background scheduling:** Use notifee's trigger notifications with `TimestampTrigger` for hourly scheduling
- **Badge API:** Notifee includes badge management, no separate library needed
- **Foreground detection:** Use React Native's `AppState` API to detect if app is active
- **Existing infrastructure to leverage:**
  - `getAvailableReviews()` in `src/storage/database.ts` for review count
  - `getUpcomingReviewsByHour()` for reviews coming in current hour
  - Settings storage already exists (`src/storage/settings.ts` pattern)
- **iOS specific:** Requires notification permission, badge permission included
- **Android specific:** Requires notification channel setup, badges work differently per launcher

## Success Metrics

- Users receive timely reminders without feeling spammed
- Badge accurately reflects available reviews within 1 hour of accuracy
- Settings toggle provides clear control over notification behavior
- No battery drain from excessive background processing

## Open Questions

- Should the badge update more frequently than hourly (e.g., when app backgrounds)?
- Should we track notification engagement (taps vs dismissals) for future optimization?
- If a user has 100+ reviews, should the notification message change to be more encouraging?
