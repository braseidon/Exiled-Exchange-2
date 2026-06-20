#!/bin/bash
#
# sync-upstream.sh — pull updates from Kvan7/Exiled-Exchange-2 (the `upstream` remote).
#
# Fetches upstream/master, shows what's incoming, and — only if the merge is
# CONFLICT-FREE — performs it. It stops BEFORE committing so you can run the gates
# and verify in-game first, then finalize with `git commit --no-edit`.
# If there are conflicts, it does nothing and tells you to merge by hand.
#
# Safe to re-run: it refuses to touch a dirty tree or a non-master branch.

set -euo pipefail

REMOTE="upstream"
BRANCH="master"
REF="$REMOTE/$BRANCH"

# --- preconditions -----------------------------------------------------------
here="$(git rev-parse --abbrev-ref HEAD)"
if [ "$here" != "master" ]; then
  echo "✗ Not on master (on '$here'). Switch to master first."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is dirty. Commit or stash first, then re-run."
  exit 1
fi

# --- fetch -------------------------------------------------------------------
echo "→ Fetching $REMOTE ..."
git fetch "$REMOTE"

behind="$(git rev-list --count "HEAD..$REF")"
if [ "$behind" -eq 0 ]; then
  echo "✓ Already up to date with $REF."
  exit 0
fi
ahead="$(git rev-list --count "$REF..HEAD")"
echo "↓ $behind behind / ↑ $ahead ahead of $REF"
echo "Incoming:"
git log --oneline "HEAD..$REF"
echo

# --- non-destructive conflict check -----------------------------------------
if git merge-tree --write-tree "HEAD" "$REF" >/dev/null 2>&1; then
  echo "✓ Clean merge — merging (staged, not committed) ..."
else
  echo "⚠ Merge has CONFLICTS — not merging automatically."
  echo "  Resolve by hand:  git merge $REF"
  exit 1
fi

# --- merge + regenerate data indices ----------------------------------------
git merge --no-commit --no-ff "$REF"

# Merging upstream often updates public/data/*.ndjson; the (gitignored) binary
# indices must be rebuilt or the app/tests read stale offsets and break.
echo "→ Rebuilding data indices (make-index-files) ..."
npm --prefix renderer run make-index-files

cat <<'EOF'

✓ Merge staged + indices rebuilt. Next:
  1. Gates: npm --prefix renderer run check-types && npm --prefix renderer run test -- run && npm --prefix main run check-types
  2. Test in-game.
  3. Finalize: git commit --no-edit      (or undo: git merge --abort)
EOF
