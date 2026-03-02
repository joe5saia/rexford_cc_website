#!/usr/bin/env bash
set -euo pipefail

echo "[ci] Running Hugo production build check"
hugo --minify --panicOnWarning

echo "[ci] OK"
