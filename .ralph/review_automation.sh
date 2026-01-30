#!/bin/bash
# Scan Ralph PRs for new review comments and run Ralph again to apply feedback.
# Criteria:
# - Repo: uesteibar/wanidroid
# - PRs: state=open, author=uesteibar, head branch starts with "ralph/"
# - Comments: only those authored by uesteibar
# - Runs on the existing PR branch (no new PRs)

set -euo pipefail

REPO_PATH="$HOME/code/uesteibar/wanidroid"
USERNAME="uesteibar"
STATE_FILE="$HOME/.clawdbot/ralph-review-state.json"

mkdir -p "$(dirname "$STATE_FILE")"

cd "$REPO_PATH"

# Initialize state file if missing
if [ ! -f "$STATE_FILE" ]; then
  echo "{}" > "$STATE_FILE"
fi

# Load state
STATE_JSON=$(cat "$STATE_FILE")

# Fetch open PRs authored by USERNAME
PRS_JSON=$(gh pr list --state open --author "$USERNAME" --json number,headRefName,title,url)

# Filter to Ralph branches
PRS_JSON=$(echo "$PRS_JSON" | jq '[.[] | select(.headRefName | startswith("ralph/"))]')

if [ "$(echo "$PRS_JSON" | jq 'length')" -eq 0 ]; then
  echo "No open Ralph PRs authored by $USERNAME. Exiting."
  exit 0
fi

# Helper to get last processed timestamp for a PR
get_last_ts() {
  local pr_number="$1"
  echo "$STATE_JSON" | jq -r --arg pr "${pr_number}" '.[$pr] // ""'
}

UPDATED_STATE="$STATE_JSON"

# Process each PR
for row in $(echo "$PRS_JSON" | jq -rc '.[]'); do
  PR_NUMBER=$(echo "$row" | jq -r '.number')
  BRANCH_NAME=$(echo "$row" | jq -r '.headRefName')
  PR_TITLE=$(echo "$row" | jq -r '.title')
  PR_URL=$(echo "$row" | jq -r '.url')

  LAST_TS=$(get_last_ts "$PR_NUMBER")

  echo "=========================================="
  echo "Review automation for PR #$PR_NUMBER: $PR_TITLE ($BRANCH_NAME)"
  echo "=========================================="

  # Safety: ensure branch name is a ralph/* branch with a safe pattern
  if ! [[ "$BRANCH_NAME" =~ ^ralph\/[a-zA-Z0-9._-]+$ ]]; then
    echo "⚠️ Skipping PR #$PR_NUMBER with unexpected branch name: $BRANCH_NAME"
    continue
  fi

  # Fetch comments (issue + review threads)
  PR_DATA=$(gh pr view "$PR_NUMBER" --json comments,reviewThreads)

  # Collect all comments authored by USERNAME with their timestamps and context
  COMMENTS=$(echo "$PR_DATA" | jq -r --arg user "$USERNAME" '
    [
      # Top-level comments
      (.comments[]? | select(.author.login == $user) | {
        id: .id,
        path: null,
        line: null,
        body: .body,
        createdAt: .createdAt
      })
      +
      # Review thread comments
      (.reviewThreads[]?.comments[]? | select(.author.login == $user) | {
        id: .id,
        path: .path,
        line: .position,
        body: .body,
        createdAt: .createdAt
      })
    ]
  ')

  if [ "$(echo "$COMMENTS" | jq 'length')" -eq 0 ]; then
    echo "No comments by $USERNAME on this PR. Skipping."
    continue
  fi

  # Filter to comments newer than LAST_TS (if set)
  if [ -n "$LAST_TS" ] && [ "$LAST_TS" != "null" ] && [ "$LAST_TS" != "" ]; then
    NEW_COMMENTS=$(echo "$COMMENTS" | jq --arg last "$LAST_TS" '[.[] | select(.createdAt > $last)]')
  else
    NEW_COMMENTS="$COMMENTS"
  fi

  if [ "$(echo "$NEW_COMMENTS" | jq 'length')" -eq 0 ]; then
    echo "No new comments since last run. Skipping PR #$PR_NUMBER."
    continue
  fi

  echo "Found $(echo "$NEW_COMMENTS" | jq 'length') new comments for PR #$PR_NUMBER. Preparing review PRD..."

  # Build a markdown summary of the new comments for the PRD
  COMMENTS_MD=$(echo "$NEW_COMMENTS" | jq -r '
    sort_by(.createdAt) |
    map("- "
        + (if .path then "`" + .path + (if .line then " (line " + (.line|tostring) + ")" else "" end) + "`" else "(general comment)" end)
        + ": " + (.body|gsub("\r";"")))
    | join("\n")
  ')

  # Create PRD file
  PRD_MD_FILE=".ralph/tasks/prd-review-pr-$PR_NUMBER.md"

  cat > "$PRD_MD_FILE" <<EOF
# PRD: Address Review Feedback for PR #$PR_NUMBER - $PR_TITLE

## Context

This PR was created on branch \

	ralph/$BRANCH_NAME

and contains changes currently under review.

The following **new review comments** from @${USERNAME} need to be addressed:

$COMMENTS_MD

## Goal

Apply small, focused changes on the existing branch \`$BRANCH_NAME\` to address all of the above comments, without introducing unrelated changes.

## User Stories

### US-001: Address review feedback for PR #$PR_NUMBER

**Description:** As a developer, I want to address all outstanding review comments on this PR so that it can be approved and merged.

**Acceptance Criteria:**
- [ ] All listed review comments above are addressed in code.
- [ ] New or updated tests are added where needed.
- [ ] All quality checks pass (tests, lint, typecheck).
- [ ] The branch \`$BRANCH_NAME\` remains focused on the original feature.
- [ ] Verify UI changes (if any) using the existing UI verification patterns.

EOF

  echo "PRD written to $PRD_MD_FILE"

  # Convert PRD to prd.json (reusing existing converter)
  echo "Converting review PRD to prd.json..."
  .ralph/convert_prd.sh "$PRD_MD_FILE"

  # Force branchName in prd.json to match existing PR branch
  echo "Ensuring prd.json branchName is $BRANCH_NAME..."
  jq --arg branch "$BRANCH_NAME" '.branchName = $branch' .ralph/prd.json > .ralph/prd.tmp && mv .ralph/prd.tmp .ralph/prd.json

  # Commit PRD/prd.json so worktree sees them
  echo "Committing review PRD and prd.json to main..."
  git -c commit.gpgsign=false add "$PRD_MD_FILE" .ralph/prd.json
  git -c commit.gpgsign=false commit -m "chore: add review PRD for PR #$PR_NUMBER" || true

  # Run Ralph loop on existing branch
  echo "Running Ralph on branch $BRANCH_NAME to apply review feedback..."
  if .ralph/ralph.sh 20 2>&1; then
    echo "✅ Review automation completed for PR #$PR_NUMBER"
    echo "NOTIFY_SUCCESS|PR #$PR_NUMBER: $PR_TITLE|$PR_URL"
  else
    echo "❌ Review automation failed for PR #$PR_NUMBER"
    echo "NOTIFY_FAILURE|PR #$PR_NUMBER: $PR_TITLE|Ralph failed while applying review feedback"
  fi

  # Update state with newest comment timestamp
  NEW_LAST_TS=$(echo "$NEW_COMMENTS" | jq -r 'max_by(.createdAt).createdAt')
  UPDATED_STATE=$(echo "$UPDATED_STATE" | jq --arg pr "${PR_NUMBER}" --arg ts "$NEW_LAST_TS" '.[$pr] = $ts')

done

# Save updated state
echo "$UPDATED_STATE" > "$STATE_FILE"
