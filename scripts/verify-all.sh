#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Backend tests ==="
./mvnw test

echo "=== Frontend tests ==="
cd taskmanager-frontend
npm test -- --watchAll=false --silent

echo "=== Frontend build ==="
npm run build

echo "=== iOS sync ==="
npm run ios:sync

echo "=== Diff check ==="
cd "$ROOT_DIR"
git diff --check

echo "=== Full verification passed ==="
