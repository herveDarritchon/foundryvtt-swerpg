#!/usr/bin/env zsh
#
# Idempotent helper to expose the repository's OpenCode organization to Claude Code
# by creating a dedicated `.claude/` workspace that symlinks to the canonical
# locations used by OpenCode (`opencode.jsonc`, `.agents/`, `scripts/`, ...).
#
# Usage:
#   ./scripts/claude-setup.sh        # create symlinks (default)
#   ./scripts/claude-setup.sh --dry-run
#   ./scripts/claude-setup.sh --revert
#
# Behavior:
#   - Creates `.claude/` directory at the repo root if missing
#   - Creates symlinks inside `.claude/` pointing to the canonical locations
#   - Is idempotent and safe to run multiple times
#   - `--revert` removes the symlinks created by this script (does not delete original files)
#   - `--dry-run` prints actions without performing them
#
# This script is intentionally conservative: it only creates links when the
# target exists and will not overwrite files that are not symlinks unless
# `--force` is provided.

set -eu

REPO_ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"
CLAUDE_DIR="$REPO_ROOT/.claude"

declare -a LINKS
LINKS=(
  ".claude/opencode.jsonc|$REPO_ROOT/opencode.jsonc"
  ".claude/agents|$REPO_ROOT/.agents"
  ".claude/scripts|$REPO_ROOT/scripts"
)

DRY_RUN=false
REVERT=false
FORCE=false

function help() {
  cat <<EOF
Usage: $0 [--dry-run] [--revert] [--force]

--dry-run  : print actions, do not modify filesystem
--revert   : remove symlinks created by this script
--force    : when creating a symlink, overwrite existing non-symlink targets
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --revert) REVERT=true; shift ;;
    --force) FORCE=true; shift ;;
    -h|--help) help; exit 0 ;;
    *) echo "Unknown arg: $1"; help; exit 1 ;;
  esac
done

function run() {
  if $DRY_RUN; then
    echo "DRY-RUN: $*"
  else
    echo "+ $*"
    eval "$@"
  fi
}

if $REVERT; then
  echo "Reverting symlinks in $CLAUDE_DIR"
  for entry in "${LINKS[@]}"; do
    IFS='|' read -r link target <<< "$entry"
    fullpath="$REPO_ROOT/$link"
    if [[ -L "$fullpath" ]]; then
      run rm -f -- "$fullpath"
    else
      echo "Skipping (not a symlink): $fullpath"
    fi
  done
  # Remove directory if empty
  if [[ -d "$CLAUDE_DIR" && -z "$(ls -A "$CLAUDE_DIR")" ]]; then
    run rmdir -- "$CLAUDE_DIR"
  else
    echo ".claude directory left in place (not empty or not present)"
  fi
  exit 0
fi

echo "Preparing Claude Code workspace integration (repo root: $REPO_ROOT)"

# Create .claude directory if missing
if [[ ! -d "$CLAUDE_DIR" ]]; then
  run mkdir -p -- "$CLAUDE_DIR"
fi

for entry in "${LINKS[@]}"; do
  IFS='|' read -r link target <<< "$entry"
  linkPath="$REPO_ROOT/$link"
  targetPath="$target"

  if [[ ! -e "$targetPath" ]]; then
    echo "Warning: target does not exist, skipping: $targetPath"
    continue
  fi

  if [[ -e "$linkPath" && ! -L "$linkPath" ]]; then
    if $FORCE; then
      echo "Removing existing non-symlink at $linkPath (force)"
      run rm -rf -- "$linkPath"
    else
      echo "Skipping existing path (not symlink). Use --force to replace: $linkPath"
      continue
    fi
  fi

  # Ensure parent dir exists
  run mkdir -p -- "$(dirname "$linkPath")"

  # Create symlink (use relative target when possible)
  pushd "$(dirname "$linkPath")" >/dev/null
  relTarget=$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], start=os.getcwd()))" "$targetPath")
  popd >/dev/null

  if [[ -L "$linkPath" ]]; then
    currentTarget=$(readlink "$linkPath")
    if [[ "$currentTarget" == "$relTarget" || "$currentTarget" == "$targetPath" ]]; then
      echo "Already linked: $linkPath -> $currentTarget"
      continue
    else
      echo "Updating symlink: $linkPath (was -> $currentTarget)"
      run rm -f -- "$linkPath"
    fi
  fi

  run ln -sfn -- "$relTarget" "$linkPath"
  echo "Linked: $linkPath -> $relTarget"
done

echo "Claude Code workspace prepared in $CLAUDE_DIR"
echo "Run with --revert to remove the links created by this script."

