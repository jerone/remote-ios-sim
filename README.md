# iOS Simulator Remote (Expo Edition)

Stream your iOS Simulator from macOS to a browser on Windows.  
**Expo runs entirely on Windows** — the Mac is only used to run the simulator and stream it back.

## How It Works

```
Windows PC                               macOS
──────────────────────                   ──────────────────────
npx expo start                           start-mac.sh
  → Expo dev server                        → boots iOS Simulator
  → open index.html                        → npm start (Node.js)
  → connect to Mac IP      ◄─ stream ─     → streams simulator window
  → paste exp:// URL       ── open ──►     → xcrun simctl openurl
  → interact via browser   ◄─ JPEG/WS ─   → robotjs (input events)
```

## Setup

### 1 — Mac (one time)

Copy `ios-sim-remote/` to your Mac, then run:

```bash
bash start-mac.sh
# optional: specify a device
bash start-mac.sh "iPhone 16"
```

This will:
- Install Node.js dependencies (first run only)
- Boot the iOS Simulator
- Start the streaming agent on port 9001

### 2 — Windows (your dev machine)

Start your Expo project as normal:

```bash
npx expo start
```

Note the **LAN URL** printed in the terminal — it looks like:
```
› Metro waiting on exp://192.168.1.50:8081
```

### 3 — Browser (Windows)

Open `windows-client/index.html` in any browser:

1. Enter the **Mac's IP** and click **Connect** — you'll see the simulator stream
2. Paste the `exp://` URL from step 2 and click **Open in Simulator**
3. Expo Go loads your app in the simulator — live reload works automatically

---

## Expo Actions (toolbar + keyboard shortcuts)

| Button | Key | Action |
|--------|-----|--------|
| 📳 Dev Menu | `D` | Shake — opens the Expo / React Native dev menu |
| 🔄 Reload   | `R` | Reload the JS bundle (Cmd+R) |
| 🏠 Home     | `H` | Press the Home button |
| 🔒 Lock     | `L` | Lock the screen |
| ↺ Rotate Left  | — | Rotate simulator left |
| ↻ Rotate Right | — | Rotate simulator right |

---

## Mouse Interactions

| Gesture | How |
|---------|-----|
| Tap | Click |
| Swipe | Click and drag |
| Scroll | Mouse wheel |

---

## Configuration

Edit the constants in `mac-agent/agent.js`:

| Setting | Default | Description |
|---------|---------|-------------|
| `FPS` | 15 | Target frames per second |
| `JPEG_QUALITY` | 0.75 | Frame quality (0.0–1.0) |
| `PORT` | 9001 | WebSocket port |
| `HOST` | 0.0.0.0 | Listening host |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Waiting for iOS Simulator…" | Make sure Simulator is open and not minimized |
| robotjs installation fails | Run `xcode-select --install`, then `npm cache clean --force`, then `npm install` |
| screencapture: window not found | Ensure Simulator window is visible and not minimized |
| Can't connect from Windows | Check Mac firewall allows port 9001; verify IP address |
| Expo app doesn't load | Make sure Windows firewall allows port 8081; use the `exp://` LAN URL not localhost |
| Shake doesn't open dev menu | Expo Go must be the running app (not a bare RN build) |

