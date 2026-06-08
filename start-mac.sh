#!/usr/bin/env bash
# start-mac.sh — Start the iOS Simulator + streaming agent on the Mac.
#
# The Expo dev server runs on Windows. This script only manages the Mac side.
#
# Usage (on the Mac, from the ios-sim-remote folder):
#   bash start-mac.sh
#
# Optional: specify a simulator device name:
#   bash start-mac.sh "iPhone 16"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$SCRIPT_DIR/mac-agent"
DEVICE="${1:-iPhone 15}"

# ── Check dependencies ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  node not found. Install it with: brew install node"
  exit 1
fi

if [ ! -d "$AGENT_DIR/node_modules" ]; then
  echo "📦  Installing mac-agent dependencies…"
  cd "$AGENT_DIR"
  npm install
  cd "$SCRIPT_DIR"
fi

# ── Boot simulator ────────────────────────────────────────────────────────────
echo "🚀  Booting simulator: $DEVICE"
xcrun simctl boot "$DEVICE" 2>/dev/null || true
open -a Simulator

# ── Show connection info ──────────────────────────────────────────────────────
MAC_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│              iOS Simulator Remote — Mac Agent               │"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│  This Mac's IP :  $MAC_IP"
echo "│                                                             │"
echo "│  On Windows:                                               │"
echo "│    1. npx expo start                                       │"
echo "│    2. Open windows-client/index.html in a browser          │"
echo "│    3. Connect to this Mac's IP                             │"
echo "│    4. Paste the exp:// URL and click 'Open in Simulator'   │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# ── Start streaming agent ─────────────────────────────────────────────────────
trap 'echo ""; echo "Stopping agent…"; exit 0' INT TERM

cd "$AGENT_DIR"
npm start
