#!/usr/bin/env sh
# Install Node dependencies for EXLAB Radio (uses package-lock.json for reproducible installs).
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "install-dependencies: Node.js is not installed or not on PATH." >&2
  echo "Install LTS from https://nodejs.org/ and try again." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "install-dependencies: npm is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -f package-lock.json ]; then
  echo "install-dependencies: package-lock.json missing; running npm install instead of npm ci." >&2
  npm install
else
  npm ci
fi

echo "install-dependencies: done. Next: npm run dev"

npm run dev
