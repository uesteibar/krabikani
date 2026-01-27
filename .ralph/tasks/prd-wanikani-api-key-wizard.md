# PRD: WaniKani API Key Setup Wizard

## Introduction

New users currently land on the Home screen with no data and must manually navigate to Settings to enter their WaniKani API key. This creates a confusing first experience. This feature adds a guided setup wizard that automatically launches when no API key is stored, walking users through generating a WaniKani personal access token, entering it, syncing data, and configuring notifications — all before reaching the Home screen.

## Goals

- Provide a seamless first-launch experience that guides users from zero to ready
- Reduce friction in the API key setup process with step-by-step visual instructions
- Automatically detect when no API key is stored and launch the wizard
- Re-trigger the wizard when a user clears their API key from Settings
- Allow back navigation between wizard steps so users can correct mistakes

## User Stories

### US-001: Auto-launch Wizard on First Use
**Description:** As a new user, I want the app to automatically guide me through setup when I open it for the first time, so that I don't have to figure out where to configure things.

**Acceptance Criteria:**
- [ ] On app launch, if no API key is stored, navigate to the wizard instead of Home
- [ ] The wizard is the root of the navigation stack (no "back" to Home)
- [ ] If an API key is already stored, launch normally to Home
- [ ] All tests pass

### US-002: Welcome Screen
**Description:** As a new user, I want to see a branded welcome screen so that I know I'm in the right app and feel invited to start.

**Acceptance Criteria:**
- [ ] Display the Cabrigator logo (240x240)
- [ ] Show the app name "Krabikani"
- [ ] Show the tagline "Master Japanese, one review at a time"
- [ ] Display a "Get Started" button to advance to the next step
- [ ] Supports light and dark mode using the existing theme system
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-003: Swipable API Key Instructions
**Description:** As a new user, I want step-by-step visual instructions on how to generate a WaniKani API token, so that I can set up the app without guessing.

**Acceptance Criteria:**
- [ ] Multiple swipable pages walking through the WaniKani UI:
  - Page 1: "Go to your WaniKani Settings" (with screenshot)
  - Page 2: "Click on Personal Access Tokens" (with screenshot)
  - Page 3: "Generate a new token" (with screenshot)
  - Page 4: "Copy your new token" (with screenshot) + "Open WaniKani Settings" button linking to `https://www.wanikani.com/settings/personal_access_tokens`
- [ ] Each page shows a screenshot of the relevant WaniKani settings UI
- [ ] Page indicator dots show current position
- [ ] User can swipe left/right between pages
- [ ] "Next" button on each page (and "Back" on pages after the first)
- [ ] Final page has a "Continue" button to advance to the API key input step
- [ ] Supports light and dark mode
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-004: Capture Screenshots for Instructions
**Description:** As a developer, I need actual screenshots of the WaniKani token generation flow to use in the instruction pages.

**Acceptance Criteria:**
- [ ] Use Playwright with Chrome to navigate `https://www.wanikani.com/settings/personal_access_tokens` using the `unainikani-test` test user
- [ ] Capture screenshots for each instruction step (settings page, token section, generate button, copy token)
- [ ] Screenshots are cropped/annotated to highlight the relevant UI area
- [ ] Screenshots captured at 2x resolution (750px wide) for clarity across screen sizes
- [ ] Screenshots are saved as assets in the project (e.g., `assets/wizard/`)
- [ ] Screenshots displayed in responsive containers that scale to screen width with a max width
- [ ] Screenshots work in both light and dark contexts (contain them in rounded-corner cards with a subtle border)

### US-005: API Key Input Step
**Description:** As a new user, I want to paste my WaniKani API token so that the app can connect to my account.

**Acceptance Criteria:**
- [ ] Text input field for the API key (secure text entry)
- [ ] "Validate & Connect" button to submit
- [ ] Back navigation to return to the instructions
- [ ] Loading state while validating the key
- [ ] On invalid key: show inline error "Invalid API key. Please check your token and try again." — stay on this step
- [ ] On network error: show inline error "Could not connect to WaniKani. Please check your internet connection and try again." — stay on this step
- [ ] On success: save key to secure storage and advance to sync step
- [ ] Supports light and dark mode
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-006: Sync Step
**Description:** As a new user, I want the app to sync my WaniKani data after connecting, so that I can start using it immediately.

**Acceptance Criteria:**
- [ ] Show a progress/loading indicator during sync
- [ ] Display status text (e.g., "Syncing your data...")
- [ ] On success: automatically advance to the notification permission step
- [ ] On failure: show error with "Retry" button — stay on this step
- [ ] No back navigation from this step (key is already saved)
- [ ] All tests pass

### US-007: Notification Permission Step
**Description:** As a new user, I want to optionally enable notifications so that I get reminded about upcoming reviews.

**Acceptance Criteria:**
- [ ] Reuse the existing `NotificationPermissionScreen` component/logic
- [ ] Two options: "Enable Notifications" (primary) and "Maybe Later" (secondary)
- [ ] On either choice: advance to the completion step
- [ ] All tests pass

### US-008: Completion Step
**Description:** As a new user, I want to see a confirmation that setup is complete so I know I can start learning.

**Acceptance Criteria:**
- [ ] Show the Cabrigator logo
- [ ] Display a "You're all set!" message
- [ ] "Start Learning" button that navigates to Home with a stack reset
- [ ] `navigation.reset()` ensures user cannot navigate back to wizard
- [ ] Supports light and dark mode
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

### US-009: Re-trigger Wizard on API Key Clear
**Description:** As an existing user, when I clear my API key from Settings, I want the wizard to appear again so that I can reconfigure the app.

**Acceptance Criteria:**
- [ ] After confirming "Clear API Key" in Settings, navigate to the wizard with a stack reset
- [ ] The existing `clearApiKey()` and `clearAllData()` calls remain
- [ ] Wizard behaves identically to first-launch (all steps available)
- [ ] All tests pass

### US-010: Swipable Carousel Component
**Description:** As a developer, I need a swipable page/carousel component for the instruction step.

**Acceptance Criteria:**
- [ ] Build a reusable swipable page component using React Native's `ScrollView` with `pagingEnabled` and `horizontal`
- [ ] Component accepts an array of page content and renders them as swipable pages
- [ ] Includes page indicator dots (filled for current page, outline for others)
- [ ] Supports `onPageChange` callback for tracking the current page
- [ ] Works on both iOS and Android
- [ ] No new native dependencies required
- [ ] All existing tests still pass

## Functional Requirements

- FR-1: On app launch, check `hasApiKey()` — if false, set the wizard as the initial route instead of Home
- FR-2: The wizard consists of sequential screens: Welcome → Instructions (swipable) → API Key Input → Sync → Notification Permission → Completion
- FR-3: Each wizard step is a screen in the navigation stack, allowing native back navigation between steps (except from Sync onward)
- FR-4: The instructions step contains multiple swipable pages with screenshots and text, plus a page indicator
- FR-5: The final instructions page includes an "Open WaniKani Settings" button that opens `https://www.wanikani.com/settings/personal_access_tokens` in the device browser
- FR-6: API key validation calls `GET /user` with the entered token — a 200 response means valid, 401 means invalid
- FR-7: On successful validation, save the key via `saveApiKey()` and trigger sync via `syncSubjects()` and `syncAssignments()`
- FR-8: On successful sync, check notification permission status and show the notification step
- FR-9: The completion step uses `navigation.reset()` to replace the stack with Home
- FR-10: Clearing the API key in Settings uses `navigation.reset()` to replace the stack with the wizard
- FR-11: Distinguish between invalid key errors (401/403) and network errors with different user-facing messages

## Non-Goals

- No account creation flow — users must already have a WaniKani account
- No API key auto-detection or QR code scanning
- No changes to the existing Settings screen layout (beyond the clear-key navigation change)
- No onboarding tutorial for app features (lessons, reviews, etc.)
- No animated transitions between wizard steps beyond default navigation animations

## Design Considerations

- Reuse the existing Cabrigator logo asset (`assets/cabrigator-icon.png`) for welcome and completion screens
- Follow the existing theme system (`useTheme()`, `COLORS`, `SPACING`, `FONT_SIZES`) for all wizard screens
- Use the vocabulary purple (`#AA00FF`) for primary action buttons, consistent with the notification permission screen
- Screenshots for the instructions step should be contained in rounded-corner cards with a subtle border so they look clean in both light and dark mode
- Page indicator dots: filled for current page, outline for others
- The swipable instructions should feel native — smooth gesture-driven swiping with optional next/back buttons

## Technical Considerations

- **Navigation:** Add new screens to `RootStackParamList` in `src/navigation/types.ts`. The wizard screens can be part of the root stack or a nested navigator — a nested stack keeps the wizard self-contained
- **Initial route logic:** In `RootNavigator.tsx`, check `hasApiKey()` during initialization (already async) to determine the initial route
- **Carousel implementation:** Use a `ScrollView` with `pagingEnabled` and `horizontal` — no new native dependency needed. This is sufficient for 4 static instruction pages and avoids a native rebuild. Wrap it in a reusable component with page indicator dots
- **Screenshots:** Use Playwright to capture screenshots from the test WaniKani account. Store in `assets/wizard/` and import as standard React Native image sources
- **Existing sync logic:** Reuse `performSync` patterns from `SettingsScreen.tsx` — `getUserLevel()`, `syncSubjects()`, `syncAssignments()` in parallel
- **Reuse:** The notification permission step should reuse the existing `NotificationPermissionScreen` or extract its logic into a shared component

## Success Metrics

- New users reach the Home screen with synced data on first launch without needing external help
- Zero manual navigation required to configure the API key on first use
- Users who clear their API key are seamlessly guided through reconfiguration

## Resolved Decisions

- **Carousel approach:** Use `ScrollView` with `pagingEnabled` and `horizontal` — no new native dependency. Sufficient for 4 static pages.
- **Welcome tagline:** "Master Japanese, one review at a time"
- **Screenshot resolution:** Capture at 2x (750px wide), display in responsive containers that scale to screen width with a max width.

## Open Questions

None at this time.
