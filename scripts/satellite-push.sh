#!/usr/bin/env bash
# satellite-push.sh
# Push a monorepo module subtree to its satellite remote.
#
# Usage: ./scripts/satellite-push.sh <module> <remote-url> [monorepo-branch] [satellite-branch]
#
# Example:
#   ./scripts/satellite-push.sh dashboard https://gitlab.com/j2yemi/erp-dashboard.git mod dashboard_fe
#
# Uses git commit-tree instead of git subtree split — avoids the cached-hash
# lookup problem that occurs when the monorepo has squash commits whose
# git-subtree-split annotations reference objects not present locally.

set -euo pipefail

MODULE="${1:?Usage: $0 <module> <remote-url> [monorepo-branch] [satellite-branch]}"
REMOTE_URL="${2:?Usage: $0 <module> <remote-url> [monorepo-branch] [satellite-branch]}"
MONO_BRANCH="${3:-mod}"
SAT_BRANCH="${4:-dashboard_fe}"
PREFIX="projects/${MODULE}"
REMOTE_NAME="_sat_${MODULE}"

echo "▶ Pushing ${PREFIX}/ → ${REMOTE_URL} (${SAT_BRANCH})"

if [ ! -d "${PREFIX}" ]; then
  echo "✖ Directory '${PREFIX}' not found in repo root." >&2
  exit 1
fi

# Add temporary remote
git remote add "${REMOTE_NAME}" "${REMOTE_URL}" 2>/dev/null || \
  git remote set-url "${REMOTE_NAME}" "${REMOTE_URL}"

cleanup() {
  git remote remove "${REMOTE_NAME}" 2>/dev/null || true
}
trap cleanup EXIT

# Get the tree SHA for the subtree at the current monorepo branch tip
TREE_SHA=$(git rev-parse "${MONO_BRANCH}:${PREFIX}")
MONO_SHA=$(git rev-parse --short "${MONO_BRANCH}")

# Fetch the satellite's current branch tip to use as parent commit.
# Use FETCH_HEAD directly — avoids relying on remote-tracking ref creation.
echo "  Fetching satellite…"
if git fetch "${REMOTE_NAME}" "${SAT_BRANCH}" 2>/dev/null; then
  PARENT=$(git rev-parse FETCH_HEAD 2>/dev/null || echo "")
else
  echo "  (satellite branch not found — will create as orphan)"
  PARENT=""
fi

# Create a commit containing only the subtree content
echo "  Creating sync commit…"
COMMIT_MSG="sync: ${MODULE} from ${MONO_BRANCH}@${MONO_SHA}"

if [ -n "${PARENT}" ]; then
  NEW_SHA=$(git commit-tree "${TREE_SHA}" -p "${PARENT}" -m "${COMMIT_MSG}")
else
  NEW_SHA=$(git commit-tree "${TREE_SHA}" -m "${COMMIT_MSG}")
fi

# Push to the satellite branch
echo "  Pushing ${NEW_SHA} to ${SAT_BRANCH}…"
git push --force "${REMOTE_NAME}" "${NEW_SHA}:refs/heads/${SAT_BRANCH}"

echo "✔ Done."
