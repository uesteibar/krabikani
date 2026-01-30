# PRD: Build APK on PR and Upload as Comment (Issue #11)

## Introduction

Currently, the CI pipeline only runs Node.js quality checks (lint, typecheck, tests). There is no automated way to verify that the Android app compiles successfully on a PR, nor a convenient way for reviewers to download and test changes on a real device.

This feature adds a GitHub Actions job that builds a debug APK for every pull request and posts a comment on the PR with a download link to the artifact. This catches build-breaking changes early and makes manual testing frictionless.

## Goals

- Automatically build an Android debug APK on every pull request
- Upload the APK as a GitHub Actions artifact
- Post (or update) a PR comment with a link to download the APK artifact
- Catch Android build failures before merging

## User Stories

### US-001: Add Android build job to CI workflow
**Description:** As a developer, I want the CI to build an Android APK on every PR so that build-breaking changes are caught before merge.

**Acceptance Criteria:**
- [ ] A new job `build-apk` is added to `.github/workflows/ci.yml`
- [ ] The job runs on `pull_request` events only (not on every push to every branch)
- [ ] The job sets up JDK (Java 17), Node.js 20, and Gradle caching
- [ ] The job runs `npm ci` to install JS dependencies
- [ ] The job runs `./gradlew assembleRelease` from the `android/` directory
- [ ] The build uses the existing debug signing config (already configured for release builds)
- [ ] The job completes successfully on the current `main` branch

### US-002: Upload APK as GitHub Actions artifact
**Description:** As a developer, I want the built APK uploaded as a workflow artifact so that I can download it from the Actions UI.

**Acceptance Criteria:**
- [ ] The APK at `android/app/build/outputs/apk/release/app-release.apk` is uploaded as an artifact
- [ ] The artifact is named descriptively (e.g., `app-release-apk`)
- [ ] The artifact has a reasonable retention period (e.g., 7 days)

### US-003: Post PR comment with APK download link
**Description:** As a reviewer, I want a comment on the PR with a link to the APK artifact so that I can quickly download and test the build on a device.

**Acceptance Criteria:**
- [ ] After the APK is uploaded, a comment is posted on the PR with a link to download the artifact
- [ ] If a comment from the bot already exists on the PR, it is updated instead of creating a duplicate
- [ ] The comment includes the commit SHA for traceability
- [ ] The comment uses a clear, readable format

## Functional Requirements

- FR-1: The `build-apk` job must only run on `pull_request` events (not on `push` events) to avoid redundant builds
- FR-2: The job must set up JDK 17 using `actions/setup-java@v4` with Gradle cache enabled
- FR-3: The job must set up Node.js 20 using `actions/setup-node@v4` with npm cache
- FR-4: The job must install JS dependencies via `npm ci` before building
- FR-5: The job must build the APK using `./gradlew assembleRelease` from the `android/` directory
- FR-6: The built APK must be uploaded using `actions/upload-artifact@v4` with a 7-day retention
- FR-7: A PR comment must be created or updated using `peter-evans/create-or-update-comment@v4` (or equivalent) containing a link to the workflow run artifacts and the commit SHA
- FR-8: The workflow must have appropriate permissions (`contents: read`, `pull-requests: write`) to post comments

## Non-Goals

- No release/production signing setup; the existing debug keystore is sufficient for PR review builds
- No publishing to Google Play or any distribution service
- No multi-architecture APK builds (default arm64-v8a is sufficient for review)
- No APK size tracking or monitoring
- No iOS build (separate concern)
- No build caching beyond Gradle's built-in caching

## Technical Considerations

- **Existing CI structure:** The current `ci.yml` runs on both `push` and `pull_request` for all branches. The new APK build job should only trigger on `pull_request` to avoid unnecessary builds. Note: there is a known issue (#14) about CI running twice for PRs; the APK job should avoid contributing to this by only running on PR events.
- **Signing:** Release builds already use the debug keystore (`android/app/debug.keystore`) with known credentials. No secrets management is needed for this.
- **Build output:** The APK is generated at `android/app/build/outputs/apk/release/app-release.apk` based on the existing npm script `android:install`.
- **GitHub Actions artifact links:** Direct download links to artifacts require the workflow run ID. The comment should link to the workflow run's artifact section (e.g., `https://github.com/$REPO/actions/runs/$RUN_ID`).
- **Gradle caching:** Use `actions/setup-java@v4` with `cache: gradle` to speed up subsequent builds.
- **Runner:** Use `ubuntu-latest` consistent with the existing CI job.
- **React Native build prerequisites:** The build needs Node.js installed and `npm ci` run first so that the Metro bundler can bundle JS assets into the APK.

## Success Metrics

- Every PR automatically gets a downloadable APK artifact
- PR comment with download link appears on every PR within minutes of push
- Android build failures are caught before merge
- Reviewers can test changes on a real device without setting up a local build environment

## Open Questions

- None; this is a straightforward CI enhancement with well-established GitHub Actions patterns.
