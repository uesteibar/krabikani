# PRD: Set Up CI Automations (Issue #8)

## Introduction

The Krabikani project currently has no CI/CD pipeline. This PRD defines the setup of GitHub Actions workflows to run quality checks automatically on every push to any branch and on every pull request. This ensures code quality is maintained, regressions are caught early, and contributors get fast feedback on their changes.

## Goals

- Automate running all quality checks (tests, linting, type checking) on every push and PR
- Catch regressions and code quality issues before they reach the main branch
- Provide clear, fast feedback to developers on the status of their changes
- Establish a reliable CI foundation that can be extended in the future

## User Stories

### US-001: Create GitHub Actions workflow for quality checks
**Description:** As a developer, I want a GitHub Actions workflow that runs on every push to any branch and on every pull request, so that I get automatic feedback on code quality.

**Acceptance Criteria:**
- [ ] Create `.github/workflows/ci.yml` workflow file
- [ ] Workflow triggers on `push` to any branch
- [ ] Workflow triggers on `pull_request` to any branch
- [ ] Workflow uses Node.js 20 (matching the project's `engines` requirement)
- [ ] Workflow installs dependencies with `npm ci`
- [ ] Dependencies are cached (node_modules via `actions/setup-node` cache) to speed up runs

### US-002: Run ESLint in CI
**Description:** As a developer, I want ESLint to run in CI so that linting issues are caught automatically.

**Acceptance Criteria:**
- [ ] CI runs `npm run lint` as a step
- [ ] Workflow fails if ESLint reports any errors
- [ ] Lint results are visible in the GitHub Actions log

### US-003: Run TypeScript type checking in CI
**Description:** As a developer, I want TypeScript type checking to run in CI so that type errors are caught before merging.

**Acceptance Criteria:**
- [ ] CI runs `npm run typecheck` as a step
- [ ] Workflow fails if `tsc --noEmit` reports any errors
- [ ] Type check results are visible in the GitHub Actions log

### US-004: Run Jest tests in CI
**Description:** As a developer, I want all Jest tests to run in CI so that test failures are caught before merging.

**Acceptance Criteria:**
- [ ] CI runs `npm test` as a step
- [ ] Workflow fails if any test fails
- [ ] Test results (pass/fail counts) are visible in the GitHub Actions log

### US-005: Configure branch protection rules (documentation)
**Description:** As a repository maintainer, I want documentation on how to configure branch protection rules so that the main branch requires CI checks to pass before merging.

**Acceptance Criteria:**
- [ ] PR description includes instructions for enabling branch protection on `main`
- [ ] Instructions specify requiring the CI workflow status check to pass before merging
- [ ] Instructions mention requiring PR reviews (recommended but optional)

## Functional Requirements

- FR-1: A GitHub Actions workflow file must exist at `.github/workflows/ci.yml`
- FR-2: The workflow must trigger on `push` events to all branches
- FR-3: The workflow must trigger on `pull_request` events to all branches
- FR-4: The workflow must set up Node.js version 20 using `actions/setup-node`
- FR-5: The workflow must cache npm dependencies to reduce CI run times
- FR-6: The workflow must install dependencies using `npm ci` (clean install for reproducibility)
- FR-7: The workflow must run `npm run lint` and fail if errors are found
- FR-8: The workflow must run `npm run typecheck` and fail if type errors are found
- FR-9: The workflow must run `npm test` and fail if any test fails
- FR-10: The three quality checks (lint, typecheck, test) should run as separate steps for clear failure identification, but can run in a single job since they are fast and share the same setup

## Non-Goals

- No native Android or iOS builds in CI (these require platform-specific SDKs and are expensive to run)
- No deployment or release automation
- No code coverage reporting or thresholds
- No integration or E2E tests (only unit tests via Jest)
- No Docker-based builds
- No artifact uploads or build caching beyond npm dependencies
- No automatic PR labeling or changelog generation

## Technical Considerations

- **Runner**: Use `ubuntu-latest` since all checks are JavaScript/TypeScript-only and don't require macOS or Android SDK
- **Node version**: Must use Node.js >= 20 as specified in `package.json` engines field
- **npm ci vs npm install**: Use `npm ci` for deterministic, clean installs from `package-lock.json`
- **Caching**: Use the built-in cache option of `actions/setup-node` with `cache: 'npm'` for simplicity
- **Parallelism**: Running lint, typecheck, and tests as separate steps in a single job is sufficient given the project size. Separate parallel jobs would add overhead from duplicate setup without meaningful time savings for a project of this scale
- **Existing commands**: All necessary npm scripts already exist (`lint`, `typecheck`, `test`) — no changes to `package.json` are needed

## Success Metrics

- All three quality checks (lint, typecheck, tests) pass on the current `main` branch
- CI provides feedback within a few minutes of pushing
- Failed checks are clearly identifiable in the GitHub Actions UI (separate steps for each check)
- No flaky tests causing false failures

## Open Questions

- Should branch protection rules be enforced immediately, or after a trial period to ensure CI stability?
- Should a Prettier format check (`npx prettier --check .`) be added as a separate step, or is ESLint sufficient for now since the `@react-native` ESLint config includes some formatting rules?
