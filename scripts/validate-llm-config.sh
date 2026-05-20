#!/usr/bin/env zsh
# Validate basic Claude/OpenCode config quickly

set -eu

REPO_ROOT=$(cd -- "$(dirname -- "$0")/.." && pwd)
FAIL=0

echo "Validating LLM config in $REPO_ROOT"

function check_file() {
  local path="$1"
  if [[ -e "$REPO_ROOT/$path" ]]; then
    echo "OK: $path"
  else
    echo "MISSING: $path" >&2
    FAIL=1
  fi
}

check_file "AGENTS.md"
check_file "CLAUDE.md"
check_file ".claude/settings.json"

# Validate JSON files
for jf in ".claude/settings.json" ".mcp.json"; do
  if [[ -e "$REPO_ROOT/$jf" ]]; then
    if ! python3 -c "import json,sys; json.load(open('$REPO_ROOT/$jf'))" >/dev/null 2>&1; then
      echo "INVALID JSON: $jf" >&2
      FAIL=1
    else
      echo "JSON OK: $jf"
    fi
  fi
done

# Check for broken symlinks inside .claude
if [[ -d "$REPO_ROOT/.claude" ]]; then
  echo "Checking symlinks in .claude/"
  local broken=0
  while IFS= read -r -d $'\0' f; do
    if [[ -L "$f" && ! -e "$f" ]]; then
      echo "BROKEN SYMLINK: $f" >&2
      broken=1
      FAIL=1
    fi
  done < <(find "$REPO_ROOT/.claude" -type l -print0)
  if [[ $broken -eq 0 ]]; then
    echo "No broken symlinks found in .claude/"
  fi
fi

if [[ $FAIL -ne 0 ]]; then
  echo "Validation FAILED" >&2
  exit 2
fi

echo "Validation OK"
exit 0

