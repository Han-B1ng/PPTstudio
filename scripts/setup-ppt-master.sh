#!/usr/bin/env bash
# Clone the PPT-Master commit this round actually ran, and install the
# packages the round-trip scripts import.
set -euo pipefail

ROOT="${PPT_MASTER_ROOT:-$HOME/ppt-master}"
SHA="3af3e8ef774c4d67ee57e1306d9256d08c9ee1bf"
REPO="https://github.com/hugohe3/ppt-master.git"

if [[ ! -d "$ROOT/.git" ]]; then
  git clone "$REPO" "$ROOT"
fi
git -C "$ROOT" fetch --depth 1 origin "$SHA"
git -C "$ROOT" checkout --detach "$SHA"
python3 -m pip install --user 'python-pptx>=0.6.21' 'Pillow>=9.0.0'
echo "PPT_MASTER_ROOT=$ROOT"
echo "commit=$(git -C "$ROOT" rev-parse HEAD)"
