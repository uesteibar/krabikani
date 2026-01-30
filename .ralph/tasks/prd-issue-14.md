# PRD: Fix CI Running Twice for PRs (Issue #14)

## Introduction

The CI workflow currently triggers on both `push` (all branches) and `pull_request` (all branches) events. This causes CI to run twice for every PR commit — once for the push event and once for the pull_request event. The fix is to restrict push triggers to `main` only, so CI runs once per PR (via `pull_request`) and once per merge to `main` (via `push`).

## Goals

- Eliminate duplicate CI runs on pull requests
- Maintain CI coverage: every PR and every commit to `main` is checked
- Reduce unnecessary GitHub Actions usage

## User Stories

### US-001: Update CI trigger configuration
**Description:** As a developer, I want CI to run only once per PR so that I don't waste CI minutes and avoid confusion from duplicate check runs.

**Acceptance Criteria:**
- [ ] CI workflow triggers on `push` only for the `main` branch
- [ ] CI workflow triggers on `pull_request` for all branches (targeting any base)
- [ ] A push to a non-main branch without a PR does NOT trigger CI
- [ ] A push to a branch with an open PR triggers CI exactly once (via `pull_request`)
- [ ] A merge/push to `main` triggers CI exactly once (via `push`)
- [ ] All existing CI steps (lint, typecheck, test) remain unchanged

## Functional Requirements

- FR-1: Change the `push` trigger in `.github/workflows/ci.yml` from `branches: ['**']` to `branches: ['main']`
- FR-2: Keep the `pull_request` trigger as `branches: ['**']` (or remove the branches filter, since PRs targeting any branch should be checked)
- FR-3: No changes to the `quality-checks` job steps — only the `on:` trigger block is modified

## Non-Goals

- No changes to CI job steps, dependencies, or tooling
- No addition of new workflows or jobs
- No changes to branch protection rules (those are managed separately in GitHub settings)

## Technical Considerations

- The file to modify is `.github/workflows/ci.yml`
- The change is limited to the `on:` block (lines 3-7)
- Target configuration:
  ```yaml
  on:
    push:
      branches: ['main']
    pull_request:
      branches: ['**']
  ```
- Note: developers pushing to branches without a PR will not get CI feedback until they open a PR. This is the intended trade-off per the issue description.

## Success Metrics

- CI runs exactly once per PR update (not twice)
- CI runs on every push/merge to `main`
- No change in quality gate coverage (lint, typecheck, test still run)

## Open Questions

None — the issue description and current configuration make the required change clear.
