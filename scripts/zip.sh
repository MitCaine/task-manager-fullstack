#!/usr/bin/env bash

set -euo pipefail

PROJECT_NAME="task-manager-review"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ZIP_NAME="${PROJECT_NAME}-${TIMESTAMP}.zip"
MANIFEST="REVIEW_MANIFEST.txt"

cleanup() {
    rm -f "$MANIFEST"
}

trap cleanup EXIT

echo "Creating review manifest..."

{
    echo "=========================================="
    echo "Task Manager Review Package"
    echo "=========================================="
    echo
    echo "Created: $(date)"
    echo

    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "Branch: $(git branch --show-current)"
        echo "Commit: $(git rev-parse HEAD)"
        echo

        echo "Git Status"
        echo "----------"
        git status --short --untracked-files=all |
            grep -v '^?? REVIEW_MANIFEST\.txt$' || true
        echo

        echo "Recent Commits"
        echo "--------------"
        git log --oneline -10
        echo
    fi

    echo "Included Directories"
    echo "--------------------"
    cat <<EOF
README.md
pom.xml
mvnw
mvnw.cmd
.gitignore
docs/
scripts/
SQL Files/
src/
taskmanager-frontend/src/
taskmanager-frontend/public/
taskmanager-frontend/package.json
taskmanager-frontend/package-lock.json
taskmanager-frontend/tsconfig.json
taskmanager-frontend/vite.config.ts
taskmanager-frontend/vitest.config.ts
taskmanager-frontend/index.html
taskmanager-frontend/README.md
EOF

} > "$MANIFEST"

echo "Creating ${ZIP_NAME}..."

zip -rq "$ZIP_NAME" \
    README.md \
    pom.xml \
    mvnw \
    mvnw.cmd \
    .gitignore \
    docs \
    scripts \
    "SQL Files" \
    src \
    taskmanager-frontend/src \
    taskmanager-frontend/public \
    taskmanager-frontend/package.json \
    taskmanager-frontend/package-lock.json \
    taskmanager-frontend/tsconfig.json \
    taskmanager-frontend/vite.config.ts \
    taskmanager-frontend/vitest.config.ts \
    taskmanager-frontend/index.html \
    taskmanager-frontend/README.md \
    "$MANIFEST" \
\
-x \
    "*.zip" \
    "*.log" \
    "*.DS_Store" \
    ".idea/*" \
    ".vscode/*" \
    ".github/copilot-instructions.md" \
    ".aider*" \
    "target/*" \
    "**/target/*" \
    "**/node_modules/*" \
    "**/build/*" \
    "**/dist/*" \
    "**/coverage/*" \
    "**/.next/*" \
    "**/.expo/*" \
    "**/.gradle/*" \
    "**/.cache/*" \
    "**/.DS_Store"

echo
echo "=========================================="
echo "Review package created successfully"
echo "=========================================="
echo "Archive: $ZIP_NAME"
echo
du -h "$ZIP_NAME"