#!/usr/bin/env bash
set -euo pipefail

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
cd ..
git diff --check

echo "=== Full verification passed ==="mvn test