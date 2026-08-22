#!/usr/bin/env bash
# Deterministic GitHub Pages deploy: build, then force-push dist/ as a single orphan
# commit to gh-pages. No gh-pages npm tool, no cache to go stale.
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SITE"
npm run build
node scripts/check-aklisia.mjs
TMP="$(mktemp -d)"
cp -R dist/. "$TMP"/          # includes .nojekyll
cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "deploy ΒΛΑΞ — $(date '+%Y-%m-%d %H:%M')"
git -c http.postBuffer=524288000 push --force https://github.com/StergiosCha/vlaks.git gh-pages:gh-pages
cd / && rm -rf "$TMP"
echo "=== Published → https://stergioscha.github.io/vlaks/ (δώσε ~1 λεπτό στο Pages) ==="
