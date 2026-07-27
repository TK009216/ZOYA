#!/usr/bin/env bash
set -e

echo "============================================"
echo "  ZOYA Setup for Linux"
echo "============================================"
echo

ZOYA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "[setup] ZOYA directory: $ZOYA_DIR"

# Install bun if not available
if ! command -v bun &>/dev/null; then
    echo "[setup] bun not found. Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
else
    echo "[setup] bun found: $(which bun)"
fi

# Add to PATH via shell profile
PROFILE_FILES=("$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile")
for profile in "${PROFILE_FILES[@]}"; do
    if [ -f "$profile" ]; then
        if grep -q "ZOYA" "$profile" 2>/dev/null; then
            echo "[setup] ZOYA already configured in $profile"
        else
            echo "" >> "$profile"
            echo "# ZOYA Launcher" >> "$profile"
            echo "export PATH=\"\$PATH:$ZOYA_DIR\"" >> "$profile"
            echo "[setup] Added ZOYA to $profile"
        fi
    fi
done

# Make zoya executable
chmod +x "$ZOYA_DIR/zoya"
echo "[setup] Made zoya executable"

# Install dependencies
echo "[setup] Installing UI dependencies..."
cd "$ZOYA_DIR/ui"
bun install

echo "[setup] Installing backend dependencies..."
cd "$ZOYA_DIR/backend"
bun install

# Make backend launcher executable too
chmod +x "$ZOYA_DIR/backend/zoya"

echo
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo
echo "  Restart your terminal or run:"
echo "    source ~/.bashrc"
echo
echo "  Then type:"
echo "    zoya"
echo
echo "  This will launch ZOYA in your browser."
echo
