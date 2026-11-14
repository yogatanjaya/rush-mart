#!/usr/bin/env bash
# Build game + publish ke branch gh-pages (GitHub Pages).
# Pakai: bash scripts/deploy-pages.sh "pesan commit"
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# git (native Windows) butuh path gaya C:/..., bukan /c/...
ROOT_WIN="$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")"
MSG="${1:-deploy: build statis Rush Mart}"
DEPLOY_DIR="$ROOT_WIN/.gh-pages-build"
BRANCH="gh-pages"

cd "$ROOT/web"
npm run build >/dev/null
echo "build selesai"

cd "$ROOT"
git worktree prune
rm -rf "$DEPLOY_DIR"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$DEPLOY_DIR" "$BRANCH" >/dev/null
else
  git worktree add --detach "$DEPLOY_DIR" >/dev/null
fi

cd "$DEPLOY_DIR"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$ROOT_WIN/web/dist/." .
touch .nojekyll
git add -A
git -c user.name="Hermes" -c user.email="hermes@local" commit -q -m "$MSG" || echo "tidak ada perubahan untuk di-commit"
git push origin "HEAD:refs/heads/$BRANCH" --force >/dev/null
echo "gh-pages ter-push"

cd "$ROOT"
git worktree remove "$DEPLOY_DIR" --force 2>/dev/null || echo "catatan: folder .gh-pages-build belum terhapus (terkunci Windows), aman diabaikan"
echo "selesai"
