#!/bin/bash
set -e

# Configuration
PROJECT_NUMBER=2
USERNAME="uesteibar"
REPO_PATH="$HOME/code/uesteibar/wanidroid"
MAX_ITERATIONS=20
MAX_ISSUES_PER_RUN=3
READY_STATUS_NAME="Ready"
IN_PROGRESS_STATUS_NAME="In progress"
IN_REVIEW_STATUS_NAME="In review"

cd "$REPO_PATH"

# Get project ID and status field IDs
PROJECT_DATA=$(gh api graphql -f query="
query {
  user(login: \"$USERNAME\") {
    projectV2(number: $PROJECT_NUMBER) {
      id
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}")

PROJECT_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.id')
STATUS_FIELD_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.fields.nodes[] | select(.name == "Status") | .id')
READY_OPTION_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.fields.nodes[] | select(.name == "Status") | .options[] | select(.name == "'"$READY_STATUS_NAME"'") | .id')
IN_PROGRESS_OPTION_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.fields.nodes[] | select(.name == "Status") | .options[] | select(.name == "'"$IN_PROGRESS_STATUS_NAME"'") | .id')
IN_REVIEW_OPTION_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.fields.nodes[] | select(.name == "Status") | .options[] | select(.name == "'"$IN_REVIEW_STATUS_NAME"'") | .id')

echo "Project ID: $PROJECT_ID"
echo "Status Field ID: $STATUS_FIELD_ID"

# Get all items with their status
ALL_ITEMS=$(gh api graphql -f query="
query {
  user(login: \"$USERNAME\") {
    projectV2(number: $PROJECT_NUMBER) {
      items(first: 50) {
        nodes {
          id
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                field {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                  }
                }
                optionId
              }
            }
          }
          content {
            ... on Issue {
              title
              number
              body
              repository {
                nameWithOwner
              }
            }
          }
        }
      }
    }
  }
}")

# Filter items in "Ready" status
READY_ITEMS=$(echo "$ALL_ITEMS" | jq -c --arg status_field_id "$STATUS_FIELD_ID" --arg ready_option_id "$READY_OPTION_ID" '
  .data.user.projectV2.items.nodes[] | 
  select(
    .fieldValues.nodes[] | 
    select(.field.id == $status_field_id and .optionId == $ready_option_id)
  )
')

if [ -z "$READY_ITEMS" ]; then
  echo "No items in Ready status. Exiting."
  exit 0
fi

# Take first N items
ISSUES_TO_PROCESS=$(echo "$READY_ITEMS" | head -n "$MAX_ISSUES_PER_RUN")

move_to_status() {
  local item_id="$1"
  local option_id="$2"
  gh api graphql -f query="
  mutation {
    updateProjectV2ItemFieldValue(
      input: {
        projectId: \"$PROJECT_ID\"
        itemId: \"$item_id\"
        fieldId: \"$STATUS_FIELD_ID\"
        value: { singleSelectOptionId: \"$option_id\" }
      }
    ) { projectV2Item { id } }
  }" > /dev/null
}

echo "$ISSUES_TO_PROCESS" | while IFS= read -r item; do
  ITEM_ID=$(echo "$item" | jq -r '.id')
  ISSUE_NUMBER=$(echo "$item" | jq -r '.content.number')
  ISSUE_TITLE=$(echo "$item" | jq -r '.content.title')
  
  echo "=========================================="
  echo "Processing Issue #$ISSUE_NUMBER: $ISSUE_TITLE"
  echo "=========================================="
  
  # Move to "In progress"
  echo "Moving to In Progress..."
  move_to_status "$ITEM_ID" "$IN_PROGRESS_OPTION_ID"
  
  # Step 1: Generate PRD markdown from issue
  echo "Step 1: Generating PRD from issue #$ISSUE_NUMBER..."
  if ! .ralph/create_prd_from_issue.sh "$ISSUE_NUMBER" 2>&1; then
    echo "❌ Failed to generate PRD"
    move_to_status "$ITEM_ID" "$READY_OPTION_ID"
    continue
  fi
  
  # Step 2: Convert PRD markdown to prd.json
  echo "Step 2: Converting PRD to prd.json..."
  if ! .ralph/convert_prd.sh ".ralph/tasks/prd-issue-$ISSUE_NUMBER.md" 2>&1; then
    echo "❌ Failed to convert PRD"
    move_to_status "$ITEM_ID" "$READY_OPTION_ID"
    continue
  fi
  
  # Step 3: Run Ralph (creates worktree, implements stories)
  echo "Step 3: Starting Ralph with $MAX_ITERATIONS iterations..."
  if .ralph/ralph.sh "$MAX_ITERATIONS" 2>&1; then
    echo "✅ Ralph completed successfully!"
    
    BRANCH_NAME=$(jq -r '.branchName // empty' .ralph/prd.json)
    WORKTREE_PATH=".ralph/.worktrees/$BRANCH_NAME"
    
    if [ -d "$WORKTREE_PATH" ]; then
      cd "$WORKTREE_PATH"
      COMMITS_AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
      
      if [ "$COMMITS_AHEAD" -gt 0 ]; then
        # Step 4: Push and create draft PR
        echo "Step 4: Pushing branch and creating draft PR..."
        git push -u origin "$BRANCH_NAME" 2>&1 || {
          echo "⚠️ Failed to push branch"
          cd "$REPO_PATH"
          continue
        }
        
        cd "$REPO_PATH"
        
        PR_URL=$(gh pr create \
          --head "$BRANCH_NAME" \
          --base main \
          --title "feat: $ISSUE_TITLE" \
          --draft \
          --body "Closes #$ISSUE_NUMBER

Implemented by Ralph 🤖" 2>&1 | grep -o 'https://github.com[^ ]*' | head -1)
        
        if [ -n "$PR_URL" ]; then
          echo "Draft PR created: $PR_URL"
          move_to_status "$ITEM_ID" "$IN_REVIEW_OPTION_ID"
          gh issue comment "$ISSUE_NUMBER" --body "🤖 Ralph has completed this issue! Draft PR: $PR_URL"
          echo "NOTIFY_SUCCESS|#$ISSUE_NUMBER: $ISSUE_TITLE|$PR_URL"
        else
          echo "⚠️ Branch pushed but PR creation failed"
          move_to_status "$ITEM_ID" "$IN_REVIEW_OPTION_ID"
          echo "NOTIFY_SUCCESS|#$ISSUE_NUMBER: $ISSUE_TITLE|Branch pushed but PR creation failed"
        fi
      else
        echo "⚠️ No new commits — task may already be complete"
        cd "$REPO_PATH"
        move_to_status "$ITEM_ID" "$IN_REVIEW_OPTION_ID"
      fi
    else
      echo "⚠️ Worktree not found at $WORKTREE_PATH"
      cd "$REPO_PATH"
    fi
  else
    echo "❌ Ralph failed or didn't complete"
    move_to_status "$ITEM_ID" "$READY_OPTION_ID"
    echo "NOTIFY_FAILURE|#$ISSUE_NUMBER: $ISSUE_TITLE|Ralph failed after $MAX_ITERATIONS iterations"
  fi
  
  echo ""
done
