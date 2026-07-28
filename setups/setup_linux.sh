#!/usr/bin/env bash
# DEPRECATED: Use setup.sh in the root directory instead.
echo "[WARNING] This setup script is deprecated."
echo "[INFO] Please use the root setup.sh instead:"
echo " ../setup.sh"
cd "$(dirname "$0")/.."
exec ./setup.sh
