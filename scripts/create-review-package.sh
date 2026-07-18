#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="task-manager"
PACKAGE_ROOT="${PROJECT_NAME}-review"
TIMESTAMP="${REVIEW_PACKAGE_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUTPUT_DIR="${1:-${REVIEW_PACKAGE_OUTPUT_DIR:-${TMPDIR:-/tmp}/task-manager-review-packages}}"
ARCHIVE_NAME="${REVIEW_PACKAGE_NAME:-${PROJECT_NAME}-review-${TIMESTAMP}.zip}"

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
ARCHIVE_PATH="${OUTPUT_DIR}/${ARCHIVE_NAME}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/task-manager-review.XXXXXX")"
STAGING_DIR="${TEMP_DIR}/${PACKAGE_ROOT}"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

mkdir -p "$STAGING_DIR"
cd "$ROOT_DIR"

should_exclude() {
  case "$1" in
    .git/*|.idea/*|.vscode/*|.aider*|*/.DS_Store|.DS_Store|\
    */node_modules/*|*/target/*|target/*|*/build/*|*/coverage/*|\
    */dist/*|*/.cache/*|*/ios/App/App/public/*|*.zip|*.tar|*.tar.gz|*.tgz|\
    */.env|.env|*/.env.local|.env.local|*/.env.*.local|.env.*.local)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

while IFS= read -r -d '' file; do
  if [[ ! -e "$file" ]]; then
    continue
  fi

  if should_exclude "$file"; then
    continue
  fi

  mkdir -p "${STAGING_DIR}/$(dirname "$file")"
  cp -p "$file" "${STAGING_DIR}/${file}"
done < <(git ls-files --cached --others --exclude-standard -z)

required_paths=(
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
  pom.xml
  mvnw
  .github/workflows/ci.yml
  database/mysql/schema.sql
  config/backend.env.example
  src/main
  src/test
  taskmanager-frontend/package.json
  taskmanager-frontend/package-lock.json
  taskmanager-frontend/.env.example
  taskmanager-frontend/src
  taskmanager-frontend/ios
  docs
  scripts
)

for required_path in "${required_paths[@]}"; do
  if [[ ! -e "${STAGING_DIR}/${required_path}" ]]; then
    echo "Review package is missing required path: ${required_path}" >&2
    exit 1
  fi
done

MANIFEST_PATH="${STAGING_DIR}/REVIEW_MANIFEST.txt"
{
  echo "Task Manager Review Package"
  echo "==========================="
  echo
  echo "Created (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Project: Task Manager"
  echo "Branch: $(git branch --show-current)"
  echo "Commit: $(git rev-parse HEAD)"
  echo
  echo "Working Tree Status"
  echo "-------------------"
  git status --short --untracked-files=all || true
  echo
  echo "Recent Commits"
  echo "--------------"
  git log --oneline -10
  echo
  echo "Archive Scope"
  echo "-------------"
  echo "Source, tests, documentation, database schema and history, configuration"
  echo "examples, CI/support metadata, review scripts, and the Capacitor iOS project."
  echo "Dependencies, build output, caches, local environments, secrets, generated"
  echo "archives, IDE state, OS metadata, and synced iOS web assets are excluded."
  echo
  echo "Included Files"
  echo "--------------"
  find "$STAGING_DIR" -type f ! -name REVIEW_MANIFEST.txt \
    | sed "s#^${STAGING_DIR}/##" \
    | LC_ALL=C sort
} > "$MANIFEST_PATH"

rm -f "$ARCHIVE_PATH"
(
  cd "$TEMP_DIR"
  zip -qr "$ARCHIVE_PATH" "$PACKAGE_ROOT"
)

echo "Review package created: $ARCHIVE_PATH"
du -h "$ARCHIVE_PATH"
