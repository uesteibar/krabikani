#!/bin/bash
# Create a PRD from a GitHub issue non-interactively
# Uses the existing create_prd.prompt template with issue details injected
# Usage: .ralph/create_prd_from_issue.sh <issue_number>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISSUE_NUMBER=$1

if [ -z "$ISSUE_NUMBER" ]; then
  echo "Usage: $0 <issue_number>"
  exit 1
fi

# Fetch issue details
ISSUE_DATA=$(gh issue view "$ISSUE_NUMBER" --json title,body)
ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_DATA" | jq -r '.body // ""')

# Read the existing create_prd.prompt template
PRD_PROMPT=$(cat "$SCRIPT_DIR/create_prd.prompt")

# Build the full prompt: template + issue context + non-interactive instructions
PROMPT="$PRD_PROMPT

---

Here is the feature/change to create a PRD for:

**Issue #$ISSUE_NUMBER: $ISSUE_TITLE**

$ISSUE_BODY

---

IMPORTANT: This is a non-interactive run. Do NOT ask me any clarifying questions.
Instead, analyze the codebase thoroughly, make reasonable decisions yourself based on the issue description and existing code, and produce the complete PRD directly.
Save it to .ralph/tasks/prd-issue-$ISSUE_NUMBER.md"

# Run Claude Code non-interactively
claude -p "$PROMPT" --dangerously-skip-permissions --print

echo "PRD created at: .ralph/tasks/prd-issue-$ISSUE_NUMBER.md"
