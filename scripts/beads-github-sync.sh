#!/bin/bash
# Beads <-> GitHub Issues Sync Script
# Usage: ./scripts/beads-github-sync.sh [push|pull|status]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
check_deps() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: gh CLI not installed. Install from https://cli.github.com${NC}"
        exit 1
    fi
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq not installed. Install with: brew install jq${NC}"
        exit 1
    fi
    if ! command -v bd &> /dev/null; then
        echo -e "${RED}Error: bd (beads) not installed. Install from https://github.com/steveyegge/beads${NC}"
        exit 1
    fi
}

# Get repo info from git
get_repo() {
    REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || echo "")
    if [ -z "$REPO" ]; then
        echo -e "${RED}Error: Not in a GitHub repository or gh CLI not authenticated${NC}"
        exit 1
    fi
    echo -e "${BLUE}Repository: $REPO${NC}"
}

# Function to push beads issues to GitHub
push_to_github() {
    echo -e "${YELLOW}Pushing Beads issues to GitHub...${NC}"
    echo ""

    # Get all beads issues (including closed for syncing status)
    bd list --all --json | jq -c '.[]' | while read -r issue; do
        id=$(echo "$issue" | jq -r '.id')
        title=$(echo "$issue" | jq -r '.title')
        description=$(echo "$issue" | jq -r '.description // ""')
        status=$(echo "$issue" | jq -r '.status')
        issue_type=$(echo "$issue" | jq -r '.issue_type // "task"')
        priority=$(echo "$issue" | jq -r '.priority // 2')

        # Check if issue already exists on GitHub (search by beads ID in body)
        existing=$(gh issue list --state all --search "\"Beads ID: \`$id\`\" in:body" --json number,state -q '.[0]' 2>/dev/null || echo "")
        existing_number=$(echo "$existing" | jq -r '.number // empty' 2>/dev/null || echo "")
        existing_state=$(echo "$existing" | jq -r '.state // empty' 2>/dev/null || echo "")

        # Handle closed issues - close on GitHub if open there
        if [ "$status" = "closed" ]; then
            if [ -n "$existing_number" ] && [ "$existing_state" = "OPEN" ]; then
                echo -e "  ${YELLOW}Closing${NC} #$existing_number: $title ($id)"
                gh issue close "$existing_number" 2>/dev/null || true
            else
                echo -e "  ${BLUE}Skipping${NC} $id (already closed or not on GitHub)"
            fi
            continue
        fi

        # Re-query for open issues only (for create/update logic)
        if [ -z "$existing_number" ]; then
            existing_number=""
        fi

        # Prepare body with beads metadata
        body="$description

---
**Beads ID:** \`$id\`
**Type:** $issue_type
**Priority:** P$priority
**Synced from:** [Beads](https://github.com/steveyegge/beads)"

        # Determine label based on issue type
        label_arg=""
        case "$issue_type" in
            bug) label_arg="--label bug" ;;
            feature) label_arg="--label enhancement" ;;
            *) label_arg="" ;;
        esac

        if [ -n "$existing_number" ]; then
            echo -e "  ${YELLOW}Updating${NC} #$existing_number: $title ($id)"
            gh issue edit "$existing_number" --title "$title" --body "$body" 2>/dev/null || true
        else
            echo -e "  ${GREEN}Creating${NC}: $title ($id)"
            gh issue create --title "$title" --body "$body" $label_arg 2>/dev/null || true
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Push complete!${NC}"
}

# Function to pull GitHub issues to beads
pull_from_github() {
    echo -e "${YELLOW}Pulling GitHub issues to Beads...${NC}"
    echo ""

    # Get open GitHub issues
    gh issue list --state open --json number,title,body,labels --limit 100 | jq -c '.[]' | while read -r issue; do
        number=$(echo "$issue" | jq -r '.number')
        title=$(echo "$issue" | jq -r '.title')
        body=$(echo "$issue" | jq -r '.body // ""')
        labels=$(echo "$issue" | jq -r '.labels[].name' 2>/dev/null | tr '\n' ',' | sed 's/,$//')

        # Check if already synced (has Beads ID in body)
        beads_id=$(echo "$body" | grep -oE 'Beads ID: `[^`]+`' | sed 's/Beads ID: `//;s/`//' || echo "")

        if [ -n "$beads_id" ]; then
            echo -e "  ${BLUE}Skipping${NC} #$number: Already synced as $beads_id"
        else
            echo -e "  ${GREEN}Creating${NC} from #$number: $title"

            # Determine issue type from labels
            issue_type="task"
            if echo "$labels" | grep -qi "bug"; then
                issue_type="bug"
            elif echo "$labels" | grep -qi "enhancement\|feature"; then
                issue_type="feature"
            fi

            # Create in beads with GitHub reference
            description="$body

---
**GitHub Issue:** #$number
**URL:** https://github.com/$REPO/issues/$number
**Labels:** $labels"

            new_id=$(bd q "$title" --description "$description" --type "$issue_type" 2>/dev/null || bd create "$title" --description "$description" 2>/dev/null | grep -oE '[a-z]+-[a-z0-9]+' | head -1)
            echo -e "    Created: ${GREEN}$new_id${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Pull complete!${NC}"
}

# Function to show sync status
show_status() {
    echo -e "${YELLOW}=== Beads Issues ===${NC}"
    bd list
    echo ""
    echo -e "${YELLOW}=== GitHub Issues ===${NC}"
    gh issue list --state open --limit 20
}

# Main
check_deps
get_repo

case "${1:-status}" in
    push)
        push_to_github
        ;;
    pull)
        pull_from_github
        ;;
    status)
        show_status
        ;;
    -h|--help|help)
        echo "Beads <-> GitHub Issues Sync"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  push    Push Beads issues to GitHub Issues"
        echo "  pull    Pull GitHub Issues to Beads"
        echo "  status  Show issues from both systems (default)"
        echo "  help    Show this help message"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run '$0 help' for usage"
        exit 1
        ;;
esac
