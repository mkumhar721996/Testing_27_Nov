#!/usr/bin/env sh
# Build step: byte-compile the app using the already-installed environment (no network).
set -eu
uv run --no-sync --offline python -m compileall -q app
