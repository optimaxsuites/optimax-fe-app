#!/usr/bin/env bash
# satellite-push.sh
# Push a monorepo module subtree to its satellite remote.
#
# Usage: ./scripts/satellite-push.sh <module> <remote-url> [monorepo-branch]
#
# Example:
#   ./scripts/satellite-push.sh dashboard git@gitlab.com:queensheba/erp-dashboard.git mod
#
# The script:
#   1. Adds the satellite remote temporarily (or reuses it).
#   2. Splits the subtree prefix into an isolated branch.
#   3. Force-pushes that branch to the satellite's master.
#   4. Removes the temporary remote.

set -euo pipefail

MODULE="${1:?Usage: $0 <module> <remote-url> [monorepo-branch]}"
REMOTE_URL="${2:?Usage: $0 <module> <remote-url> [monorepo-branch]}"
MONO_BRANCH="${3:-mod}"
PREFIX="projects/${MODULE}"
SPLIT_BRANCH="_split_${MODULE}_$$"
REMOTE_NAME="_sat_${MODULE}"

echo "▶ Pushing ${PREFIX}/ → ${REMOTE_URL} (master)"

# Verify prefix exists
if [ ! -d "${PREFIX}" ]; then
  echo "✖ Directory '${PREFIX}' not found in repo root." >&2
  exit 1
fi

# Add temporary remote (ignore error if already exists)
git remote add "${REMOTE_NAME}" "${REMOTE_URL}" 2>/dev/null || \
  git remote set-url "${REMOTE_NAME}" "${REMOTE_URL}"

cleanup() {
  git remote remove "${REMOTE_NAME}" 2>/dev/null || true
  git branch -D "${SPLIT_BRANCH}" 2>/dev/null || true
}
trap cleanup EXIT

# Split subtree into a throwaway branch
echo "  Splitting subtree…"
git subtree split --prefix="${PREFIX}" "${MONO_BRANCH}" -b "${SPLIT_BRANCH}"

# Force-push to satellite master
echo "  Pushing to satellite master…"
git push --force "${REMOTE_NAME}" "${SPLIT_BRANCH}:master"

echo "✔ Done."
