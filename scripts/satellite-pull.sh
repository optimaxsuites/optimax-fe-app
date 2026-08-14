#!/usr/bin/env bash
# satellite-pull.sh
# Pull changes from a satellite repo back into the monorepo subtree.
#
# Usage: ./scripts/satellite-pull.sh <module> <remote-url> [satellite-branch] [monorepo-branch]
#
# Example:
#   ./scripts/satellite-pull.sh dashboard https://gitlab.com/j2yemi/erp-dashboard.git dashboard_fe mod
#
# Uses git read-tree instead of git subtree pull to avoid the cached split-hash
# lookup problem that occurs when the monorepo has old squash commit annotations.

set -euo pipefail

MODULE="${1:?Usage: $0 <module> <remote-url> [satellite-branch] [monorepo-branch]}"
REMOTE_URL="${2:?Usage: $0 <module> <remote-url> [satellite-branch] [monorepo-branch]}"
SAT_BRANCH="${3:-dashboard_fe}"
MONO_BRANCH="${4:-mod}"
PREFIX="projects/${MODULE}"
REMOTE_NAME="_sat_${MODULE}"

echo "▶ Pulling ${REMOTE_URL} (${SAT_BRANCH}) → ${PREFIX}/"

# Ensure we're on the correct monorepo branch
CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [ "${CURRENT}" != "${MONO_BRANCH}" ]; then
  echo "✖ You are on branch '${CURRENT}', expected '${MONO_BRANCH}'. Aborting." >&2
  exit 1
fi

# Check working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✖ Working tree has uncommitted changes. Commit or stash first." >&2
  exit 1
fi

# Add temporary remote
git remote add "${REMOTE_NAME}" "${REMOTE_URL}" 2>/dev/null || \
  git remote set-url "${REMOTE_NAME}" "${REMOTE_URL}"

cleanup() {
  git remote remove "${REMOTE_NAME}" 2>/dev/null || true
}
trap cleanup EXIT

echo "  Fetching satellite…"
git fetch "${REMOTE_NAME}" "${SAT_BRANCH}"

SAT_SHA=$(git rev-parse FETCH_HEAD)
SAT_SHORT=$(git rev-parse --short FETCH_HEAD)

echo "  Merging ${SAT_SHORT} into ${PREFIX}/…"

# Read the satellite's tree directly into the subtree prefix.
# This stages all changes from the satellite branch into the monorepo subtree.
git read-tree --prefix="${PREFIX}/" -u FETCH_HEAD

# Commit the result
git commit -m "chore(${MODULE}): sync from satellite ${SAT_BRANCH}@${SAT_SHORT}"

echo "✔ Done. Review changes then push to origin ${MONO_BRANCH}."
