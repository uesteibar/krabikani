# PRD: WaniKani Android Client (UnaiNikani)

## Introduction

A clean, smooth WaniKani client for Android built with React Native. This app replaces Tsurukame (iOS-only) for Android users, providing a focused experience for completing WaniKani lessons and reviews with full offline support. The emphasis is on interaction smoothness and UI clarity over feature bloat.

## Goals

- Provide a native-feeling Android experience for WaniKani study sessions
- Enable complete offline functionality for uninterrupted study
- Minimize friction during reviews (auto-advance on correct, clear feedback on incorrect)
- Match WaniKani's lesson flow (batches of 5, quiz after learning)
- Support the "wrap up" feature for controlled review session endings

## User Stories

### US-001: Initialize React Native Project
**Description:** As a developer, I need a properly configured React Native project so that I can build the Android app.

**Acceptance Criteria:**
- [ ] React Native project initialized with TypeScript support
- [ ] Android build configuration working
- [ ] Basic folder structure established (src/screens, src/components, src/api, src/storage, src/utils)
- [ ] Navigation library installed and configured (React Navigation)
- [ ] Project builds and runs on Android emulator

---

### US-002: API Key Configuration Screen
**Description:** As a user, I want to enter my WaniKani API key so that the app can access my account data.

**Acceptance Criteria:**
- [ ] Settings screen with API key input field
- [ ] API key stored securely (encrypted storage)
- [ ] Validate API key by making test request to WaniKani API
- [ ] Show success/error feedback after validation
- [ ] API key persists across app restarts
- [ ] Option to clear/change API key
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-003: WaniKani API Client
**Description:** As a developer, I need a typed API client to communicate with WaniKani's API v2.

**Acceptance Criteria:**
- [ ] API client handles authentication via API key header
- [ ] Implements endpoints: GET /summary, GET /subjects, GET /assignments, PUT /assignments/:id/start, POST /reviews
- [ ] TypeScript types for all API responses (Subject, Assignment, Review, Summary)
- [ ] Proper error handling with typed errors
- [ ] Request retry logic for transient failures
- [ ] All tests pass

---

### US-004: Local Database Setup
**Description:** As a developer, I need a local database to store WaniKani data for offline access.

**Acceptance Criteria:**
- [ ] SQLite database configured (expo-sqlite or react-native-sqlite-storage)
- [ ] Schema for subjects table (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, etc.)
- [ ] Schema for assignments table (id, subject_id, srs_stage, available_at, started_at, etc.)
- [ ] Schema for pending_reviews table (for offline review queue)
- [ ] Schema for sync_status table (last_sync timestamp, sync state)
- [ ] Database migrations system
- [ ] All tests pass

---

### US-005: Initial Data Sync
**Description:** As a user, I want the app to download my WaniKani data when I first connect so that I can study offline.

**Acceptance Criteria:**
- [ ] On first launch with valid API key, fetch all subjects up to user's current level
- [ ] Fetch all assignments for unlocked subjects
- [ ] Store data in local database
- [ ] Show progress indicator during sync (X of Y items)
- [ ] Handle sync interruption gracefully (resume capability)
- [ ] Block app usage until initial sync completes
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-006: Offline Detection and Sync Status
**Description:** As a user, I want to know when I'm offline and when my data was last synced.

**Acceptance Criteria:**
- [ ] Detect network connectivity status
- [ ] Show offline indicator in UI when disconnected
- [ ] Display "Last synced: X minutes/hours ago" on dashboard
- [ ] If app opened offline with no cached data, show error requiring connection
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-007: Dashboard Screen
**Description:** As a user, I want to see my pending lessons and reviews count so that I know what study is available.

**Acceptance Criteria:**
- [ ] Dashboard shows number of available lessons
- [ ] Dashboard shows number of available reviews
- [ ] Dashboard shows next review time (e.g., "Next review in 2 hours")
- [ ] Tapping lessons count navigates to lessons session
- [ ] Tapping reviews count navigates to reviews session
- [ ] Data refreshes from API when online, uses cache when offline
- [ ] Pull-to-refresh triggers sync when online
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-008: Romaji to Hiragana Input Conversion
**Description:** As a user, I want to type romaji and have it automatically convert to hiragana so that I can answer reading questions without switching keyboards.

**Acceptance Criteria:**
- [ ] Input field converts romaji to hiragana in real-time
- [ ] Wapuro-style conversion rules (ka→か, shi→し, si→し, tsu→つ, tu→つ, etc.)
- [ ] Double consonant produces っ (kka→っか)
- [ ] nn produces ん, n followed by vowel produces な/に/ぬ/ね/の
- [ ] Long vowels work correctly (ou→おう, uu→うう)
- [ ] Backspace works correctly (deleting partial romaji)
- [ ] All tests pass

---

### US-009: Lesson Learning Phase
**Description:** As a user, I want to learn new items before being quizzed on them.

**Acceptance Criteria:**
- [ ] Lessons presented in batches of 5 items
- [ ] Each item shows: characters, meaning, reading (if applicable), meaning mnemonic, reading mnemonic (if applicable)
- [ ] For kanji: show component radicals
- [ ] Simple card layout with "Next" button to advance
- [ ] After viewing all 5 items, automatically proceed to quiz
- [ ] Radicals only show meaning (no reading)
- [ ] Kanji and vocabulary show both meaning and reading
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-010: Lesson Quiz
**Description:** As a user, I want to be quizzed on the items I just learned to confirm understanding.

**Acceptance Criteria:**
- [ ] Quiz covers all 5 items from the learning phase
- [ ] Each item requires correct answers for both meaning and reading (except radicals: meaning only)
- [ ] Meaning questions show characters, expect English answer
- [ ] Reading questions show characters, expect hiragana answer (using romaji input)
- [ ] Order of questions is randomized
- [ ] Order of meaning vs reading for same item is randomized
- [ ] Correct answer: auto-advance to next question (no tap required)
- [ ] Incorrect answer: show correct answer + mnemonic, tap to continue
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-011: Lesson Completion
**Description:** As a user, I want my completed lessons to be registered with WaniKani so they appear in my review queue.

**Acceptance Criteria:**
- [ ] After passing quiz, call PUT /assignments/:id/start for each item
- [ ] If online: sync immediately
- [ ] If offline: queue for later sync
- [ ] Show completion summary (X items learned)
- [ ] Return to dashboard or offer to continue with next batch
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-012: Review Session - Basic Flow
**Description:** As a user, I want to complete my pending reviews with a smooth interaction flow.

**Acceptance Criteria:**
- [ ] Load available reviews from local cache (synced from API)
- [ ] Show progress bar + remaining count at top
- [ ] Each item requires correct answers for both meaning and reading (except radicals: meaning only)
- [ ] Order of items is randomized
- [ ] Order of meaning vs reading for same item is randomized
- [ ] Correct answer: auto-advance to next question immediately
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-013: Review Session - Incorrect Answer Handling
**Description:** As a user, when I answer incorrectly, I want to see the correct answer and a hint to help me remember.

**Acceptance Criteria:**
- [ ] On incorrect answer, show the correct answer prominently
- [ ] Show relevant mnemonic (meaning mnemonic for meaning questions, reading mnemonic for reading questions)
- [ ] User must tap to continue to next question
- [ ] Track number of incorrect answers per item (for API submission)
- [ ] Item returns later in the session until answered correctly
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-014: Review Session - Wrap Up Feature
**Description:** As a user, I want to end my review session early while still completing items I've already started.

**Acceptance Criteria:**
- [ ] "Wrap Up" button visible during review session
- [ ] When activated, stop introducing NEW items
- [ ] Continue showing only items already presented in current session that have pending answers
- [ ] Show "Wrapping up: X remaining" indicator
- [ ] Session ends when all pending items are completed
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

---

### US-015: Review Submission and Sync
**Description:** As a user, I want my review results to be synced with WaniKani so my SRS progress is updated.

**Acceptance Criteria:**
- [ ] After completing an item (both meaning and reading correct), prepare review submission
- [ ] Submit via POST /reviews with incorrect_meaning_answers and incorrect_reading_answers counts
- [ ] If online: submit immediately
- [ ] If offline: queue in pending_reviews table
- [ ] When coming back online, sync all pending reviews
- [ ] Handle sync conflicts gracefully
- [ ] All tests pass

---

### US-016: Background Sync
**Description:** As a user, I want my data to stay up-to-date automatically when I have connectivity.

**Acceptance Criteria:**
- [ ] On app foreground, check for new assignments/reviews if online
- [ ] Sync any pending review submissions
- [ ] Update local cache with new data
- [ ] Fetch any new subjects unlocked since last sync
- [ ] Do not interrupt active lesson/review sessions
- [ ] All tests pass

---

### US-017: Answer Validation
**Description:** As a user, I want my answers to be validated correctly, accepting reasonable variations.

**Acceptance Criteria:**
- [ ] Meaning answers: case-insensitive comparison
- [ ] Meaning answers: accept all valid meanings from WaniKani (primary + alternatives)
- [ ] Meaning answers: trim whitespace
- [ ] Reading answers: exact hiragana match required
- [ ] Reading answers: accept all valid readings from WaniKani
- [ ] Handle auxiliary meanings (accept but don't require)
- [ ] All tests pass

---

### US-018: UI Polish and Animations
**Description:** As a user, I want a clean, smooth interface that feels responsive and polished.

**Acceptance Criteria:**
- [ ] Use impeccable.style guidelines for consistent design
- [ ] Smooth transitions between screens
- [ ] Subtle animations for correct/incorrect feedback
- [ ] Clear visual hierarchy (characters prominent, input clear)
- [ ] Consistent color scheme (consider WaniKani's pink/purple palette as inspiration)
- [ ] Proper loading states (skeleton screens or spinners)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: App authenticates with WaniKani API v2 using user-provided API key
- FR-2: App downloads and caches all subjects up to user's current level for offline use
- FR-3: Dashboard displays pending lessons count, pending reviews count, and next review time
- FR-4: Lessons are presented in batches of 5 items with a learning phase followed by a quiz
- FR-5: Lesson quiz requires correct meaning (all items) and reading (kanji/vocabulary only) answers
- FR-6: Completing lesson quiz calls PUT /assignments/:id/start for each item
- FR-7: Reviews present items in random order, requiring both meaning and reading answers
- FR-8: Review meaning/reading order for same item is randomized
- FR-9: Correct review answers auto-advance without user interaction
- FR-10: Incorrect review answers display correct answer + mnemonic, require tap to continue
- FR-11: Wrap-up mode stops new items and completes only already-shown items
- FR-12: Reviews are submitted via POST /reviews with incorrect answer counts
- FR-13: Offline reviews are queued and synced when connectivity returns
- FR-14: Romaji input auto-converts to hiragana using Wapuro-style rules
- FR-15: Progress bar + remaining count shown during review sessions

## Non-Goals (Out of Scope)

- No Extra Study mode (self-study outside of SRS)
- No SRS level statistics or detailed progress visualization
- No audio playback for vocabulary
- No lesson ordering customization (use WaniKani's default order)
- No custom lesson batch sizes (fixed at 5)
- No push notifications for reviews
- No iPad/tablet-optimized layouts
- No iOS support (Android only)
- No user scripts or customization plugins
- No community mnemonics or user notes
- No kanji stroke order diagrams

## Design Considerations

- Clean, minimal interface prioritizing the study content
- Large, readable Japanese characters (especially for kanji)
- High contrast input fields with clear focus states
- Touch-friendly button sizes (minimum 44x44 dp)
- Use impeccable.style skills for UI polish: `/impeccable:polish`, `/impeccable:animate`, `/impeccable:clarify`
- Consider WaniKani's color associations: pink/magenta for radicals, purple for kanji, blue for vocabulary
- Dark mode support (respect system preference)

## Technical Considerations

- **Framework:** React Native with TypeScript
- **Navigation:** React Navigation v6+
- **Local Storage:** SQLite (expo-sqlite or react-native-sqlite-storage)
- **Secure Storage:** react-native-keychain or expo-secure-store for API key
- **State Management:** React Context + useReducer or Zustand (keep it simple)
- **HTTP Client:** fetch with typed wrappers or axios
- **Offline Detection:** @react-native-community/netinfo
- **Testing:** Jest + React Native Testing Library

### WaniKani API Reference
Full documentation: https://docs.api.wanikani.com/20170710/

### WaniKani API Endpoints Used
- `GET /v2/summary` - Available lessons/reviews
- `GET /v2/subjects` - Subject details (radicals, kanji, vocabulary)
- `GET /v2/assignments` - User's assignments with SRS stages
- `PUT /v2/assignments/:id/start` - Mark lesson as started
- `POST /v2/reviews` - Submit review results
- `GET /v2/user` - User info (for current level)

### Database Schema Overview
```
subjects (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, component_subject_ids, ...)
assignments (id, subject_id, srs_stage, available_at, started_at, unlocked_at, ...)
pending_reviews (id, assignment_id, subject_id, incorrect_meaning_answers, incorrect_reading_answers, created_at)
sync_status (id, last_subjects_sync, last_assignments_sync, last_summary_sync)
```

## Success Metrics

- User can complete a full review session without connectivity after initial sync
- Correct answers advance immediately (< 100ms perceived delay)
- App cold start to dashboard < 2 seconds
- Offline review sync completes within 30 seconds of regaining connectivity
- Zero data loss for offline reviews

## Resolved Questions

- **Orientation:** Portrait only (lock orientation)
- **API down during initial sync:** Show error message, require retry when connection available
- **Vacation mode:** Out of scope for initial version
- **API rate limits:** Implement exponential backoff retry (max 3 retries, 1s → 2s → 4s delays); WaniKani rate limit is generous (60 requests/minute) so unlikely to hit for single-user app
