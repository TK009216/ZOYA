#!/usr/bin/env bash
set -e
ZOYA_VER="1.0.0"
echo "================================================"
echo " ZOYA v${ZOYA_VER} - Setup"
echo "================================================"
echo
ZOYA_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ZOYA_DIR"
# Check OS
OS="$(uname -s)"
echo "[INFO] Detected OS: ${OS}"
# Check for Bun
echo "[1/6] Checking Bun installation..."
if ! command -v bun &> /dev/null; then
echo "[INFO] Bun not found. Installing..."
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
fi
BUN_VER=$(bun --version 2>/dev/null || echo "unknown")
echo "[OK] Bun v${BUN_VER} found."
# Check for Node.js
echo "[2/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
echo "[WARNING] Node.js not found. Some native modules may fail."
echo "Install from: https://nodejs.org"
else
NODE_VER=$(node --version)
echo "[OK] Node.js ${NODE_VER} found."
fi
# Check for Git
echo "[3/6] Checking Git..."
if ! command -v git &> /dev/null; then
echo "[WARNING] Git not found. Some dependencies may fail."
else
echo "[OK] Git found."
fi
# Install system dependencies on Linux
if [ "$OS" = "Linux" ]; then
echo "[INFO] Checking system build tools..."
if command -v apt-get &> /dev/null; then
# Debian/Ubuntu
if ! dpkg -l | grep -q "build-essential"; then
echo "[INFO] Installing build tools (may require sudo)..."
sudo apt-get update && sudo apt-get install -y build-essential python3 pkg-config libsqlite3-dev || true
fi
elif command -v yum &> /dev/null; then
# RHEL/CentOS/Fedora
sudo yum groupinstall -y "Development Tools" || true
elif command -v pacman &> /dev/null; then
# Arch
sudo pacman -S --needed base-devel python sqlite || true
fi
fi
# Install root dependencies
echo "[4/6] Installing root dependencies..."
bun install
echo "[OK] Root dependencies installed."
# Install backend dependencies
echo "[5/6] Installing backend dependencies..."
cd "$ZOYA_DIR/backend"
bun install
echo "[OK] Backend dependencies installed."
# Install UI dependencies
echo "[6/6] Installing UI dependencies..."
cd "$ZOYA_DIR/ui"
bun install
echo "[OK] UI dependencies installed."
# Return to root
cd "$ZOYA_DIR"
# Create .env if not exists
if [ ! -f ".env" ]; then
if [ -f ".env.example" ]; then
cp ".env.example" ".env"
echo "[INFO] Created .env from .env.example"
echo "[INFO] Please edit .env and add your API keys."
else
echo "[WARNING] .env.example not found. Create .env manually."
fi
fi
# Create data and logs directories
mkdir -p data logs
# Make launchers executable
chmod +x "$ZOYA_DIR/zoya" 2>/dev/null || true
chmod +x "$ZOYA_DIR/backend/zoya" 2>/dev/null || true
echo
echo "================================================"
echo " ZOYA v${ZOYA_VER} Setup Complete!"
echo "================================================"
echo
echo "Next steps:"
echo "1. Edit .env and add your API keys"
echo "2. Run: ./zoya"
echo
