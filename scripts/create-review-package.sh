#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="task-manager"
PACKAGE_ROOT="${PROJECT_NAME}-review"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") [OUTPUT_DIRECTORY]
  $(basename "$0") --help

Creates a review ZIP containing the repository's source code, tests,
documentation, database files, configuration examples, CI metadata,
review scripts, and Capacitor iOS project.

Default output:
  ${ROOT_DIR}/review-packages/

Optional positional argument:
  OUTPUT_DIRECTORY
      Directory in which the ZIP should be created.

Environment variables:
  REVIEW_PACKAGE_OUTPUT_DIR
      Overrides the default output directory.

  REVIEW_PACKAGE_NAME
      Overrides the generated archive filename.

  REVIEW_PACKAGE_TIMESTAMP
      Overrides the UTC timestamp used in the generated filename.

Examples:
  ./scripts/create-review-package.sh

  ./scripts/create-review-package.sh "\$HOME/Desktop"

  REVIEW_PACKAGE_NAME="task-manager-review.zip" \\
    ./scripts/create-review-package.sh

  REVIEW_PACKAGE_OUTPUT_DIR="\$HOME/Desktop" \\
    ./scripts/create-review-package.sh
EOF
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
esac

if (( $# > 1 )); then
  echo "Error: expected at most one output-directory argument." >&2
  echo >&2
  usage >&2
  exit 2
fi

for command in git zip find sed sort du mktemp; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command" >&2
    exit 1
  fi
done

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Project directory is not inside a Git repository: $ROOT_DIR" >&2
  exit 1
fi

TIMESTAMP="${REVIEW_PACKAGE_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
DEFAULT_OUTPUT_DIR="${ROOT_DIR}/review-packages"
OUTPUT_DIR="${1:-${REVIEW_PACKAGE_OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}}"
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
    .git/*|*/.git/*|\
    .idea/*|*/.idea/*|\
    .vscode/*|*/.vscode/*|\
    .aider*|*/.aider*|\
    review-packages/*|*/review-packages/*|\
    .DS_Store|*/.DS_Store|\
    node_modules/*|*/node_modules/*|\
    target/*|*/target/*|\
    build/*|*/build/*|\
    coverage/*|*/coverage/*|\
    dist/*|*/dist/*|\
    .cache/*|*/.cache/*|\
    taskmanager-frontend/ios/App/App/public/*|\
    */ios/App/App/public/*|\
    *.zip|*.tar|*.tar.gz|*.tgz|\
    .env|*/.env|\
    .env.local|*/.env.local|\
    .env.*.local|*/.env.*.local)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

echo "Collecting repository files..."

while IFS= read -r -d '' file; do
  if [[ ! -e "$file" ]]; then
    continue
  fi

  if should_exclude "$file"; then
    continue
  fi

  destination="${STAGING_DIR}/${file}"
  mkdir -p "$(dirname "$destination")"
  cp -p "$file" "$destination"
done < <(
  git ls-files \
    --cached \
    --others \
    --exclude-standard \
    -z
)

required_paths=(
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
  .nvmrc
  pom.xml
  mvnw

  .github/workflows/ci.yml
  .github/pull_request_template.md

  config/backend.env.example

  database/mysql/README.md
  database/mysql/schema.sql

  src/main
  src/test
  src/main/resources/application.properties

  taskmanager-frontend/package.json
  taskmanager-frontend/package-lock.json
  taskmanager-frontend/.env.example
  taskmanager-frontend/capacitor.config.ts
  taskmanager-frontend/src
  taskmanager-frontend/ios

  docs

  scripts/create-review-package.sh
  scripts/verify-all.sh
)

for required_path in "${required_paths[@]}"; do
  if [[ ! -e "${STAGING_DIR}/${required_path}" ]]; then
    echo "Review package is missing required path: ${required_path}" >&2
    exit 1
  fi
done

BRANCH="$(git branch --show-current)"
COMMIT="$(git rev-parse HEAD)"
WORKING_TREE_STATUS="$(git status --short --untracked-files=all)"

if [[ -z "$BRANCH" ]]; then
  BRANCH="detached HEAD"
fi

MANIFEST_PATH="${STAGING_DIR}/REVIEW_MANIFEST.txt"

{
  echo "Task Manager Review Package"
  echo "==========================="
  echo
  echo "Created (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Project: Task Manager"
  echo "Branch: ${BRANCH}"
  echo "Commit: ${COMMIT}"
  echo "Archive: ${ARCHIVE_NAME}"
  echo

  echo "Working Tree Status"
  echo "-------------------"
  if [[ -n "$WORKING_TREE_STATUS" ]]; then
    printf '%s\n' "$WORKING_TREE_STATUS"
  else
    echo "Clean"
  fi
  echo

  echo "Recent Commits"
  echo "--------------"
  git log --oneline -10
  echo

  echo "Archive Scope"
  echo "-------------"
  echo "Included:"
  echo "- Application source code"
  echo "- Automated tests"
  echo "- Documentation and ADRs"
  echo "- MySQL schema and historical database updates"
  echo "- Reviewed configuration examples"
  echo "- CI and repository-support metadata"
  echo "- Review and validation scripts"
  echo "- Capacitor iOS project files"
  echo
  echo "Excluded:"
  echo "- Git metadata"
  echo "- Dependencies"
  echo "- Build output"
  echo "- Test coverage output"
  echo "- Caches"
  echo "- IDE state"
  echo "- Local environment and secret files"
  echo "- Generated archives"
  echo "- Operating-system metadata"
  echo "- Synced Capacitor iOS web assets"
  echo

  echo "Included Files"
  echo "--------------"
  find "$STAGING_DIR" \
    -type f \
    ! -name REVIEW_MANIFEST.txt \
    | sed "s#^${STAGING_DIR}/##" \
    | LC_ALL=C sort
} > "$MANIFEST_PATH"

rm -f "$ARCHIVE_PATH"

echo "Creating review archive..."

(
  cd "$TEMP_DIR"
  zip -qr "$ARCHIVE_PATH" "$PACKAGE_ROOT"
)

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Archive creation failed: $ARCHIVE_PATH" >&2
  exit 1
fi

echo
echo "Review package created:"
echo "  $ARCHIVE_PATH"
echo
echo "Archive size:"
du -h "$ARCHIVE_PATH" | awk '{print "  " $1}'