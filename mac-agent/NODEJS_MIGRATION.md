# Node.js Implementation Guide

The macOS iOS Simulator agent is now implemented in Node.js (Python version has been removed).

## Migration Status

✅ **Complete** — Node.js is now the canonical implementation

**Python files have been fully removed.** All functionality has been converted to Node.js.

### Files Converted

| Python | Node.js | Purpose |
|--------|---------|---------|
| `agent.py` | `agent.js` | WebSocket server, frame streaming & input handling |
| `actions.py` | `actions.js` | Simulator control via osascript & xcrun |
| `capture.py` | `capture.js` | Screenshot capture via screencapture |
| `input_injector.py` | `input_injector.js` | Mouse/touch event injection via robotjs |
| `requirements.txt` | `package.json` | Dependencies |

### Dependencies

**Python (old):**
- `websockets>=12.0` - WebSocket server
- `pyobjc-framework-Quartz>=10.0` - macOS Quartz framework
- `pyobjc-framework-Cocoa>=10.0` - macOS Cocoa framework

**Node.js (new):**
- `ws` - WebSocket server
- `sharp` - Image processing (PNG to JPEG conversion)
- `robotjs` - Cross-platform mouse/keyboard control

## Installation & Setup

### Prerequisites
- **macOS** (required for simulator and system APIs)
- **Node.js** >= 16 LTS
- **Xcode Command Line Tools** (`xcode-select --install`)
- **iOS Simulator** (part of Xcode)

### Installation

```bash
cd mac-agent
npm install
```

### Running the Server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

The server will start on `ws://0.0.0.0:9001`

### Connection

From the Windows client, connect to:
```
ws://<mac-ip>:9001
```

## Key Differences from Python

### 1. **Async Handling**
- Python used `async`/`await` - Node.js uses the same pattern
- Frame streaming runs concurrently via async tasks

### 2. **Screenshot Capture**
- **Python**: Used Quartz framework via `pyobjc`
- **Node.js**: Uses `screencapture` command + `sharp` for JPEG conversion
- More robust fallback if Simulator window detection fails

### 3. **Mouse/Touch Events**
- **Python**: Direct Quartz API calls via `pyobjc`
- **Node.js**: Uses `robotjs` for cross-platform mouse control

### 4. **Process Execution**
- **Python**: `subprocess.run()`
- **Node.js**: `execSync()` from `child_process`

### 5. **Logging**
- **Python**: `logging` module with formatters
- **Node.js**: Simple console-based logging

## Configuration

Edit the constants in `agent.js` to customize:

```javascript
const HOST = '0.0.0.0';      // Listening host
const PORT = 9001;            // WebSocket port
const FPS = 15;               // Frames per second
const JPEG_QUALITY = 0.75;    // JPEG compression (0-1)
```

## Troubleshooting

### Issue: "screencapture: error: window not found"
- Ensure the iOS Simulator is open
- Check that Simulator window is visible
- Try running `lsof -c Simulator` to verify process is running

### Issue: "robotjs" installation fails
- Install build tools: `xcode-select --install`
- Clear npm cache: `npm cache clean --force`
- Reinstall: `npm install`

### Issue: WebSocket connection refused
- Check firewall: `sudo lsof -i :9001`
- Verify host is accessible: `ping <mac-ip>`
- Check that `agent.js` started without errors

## API Reference

### WebSocket Message Format

#### Client → Server

**Click:**
```json
{"type":"click","x":0.5,"y":0.5}
```

**Drag:**
```json
{"type":"drag","x1":0.2,"x2":0.8,"y1":0.3,"y2":0.7}
```

**Scroll:**
```json
{"type":"scroll","x":0.5,"y":0.5,"dy":50}
```

**Action:**
```json
{"type":"action","name":"shake|home|reload|lock|rotateL|rotateR"}
```

**Open URL:**
```json
{"type":"open_url","url":"exp://192.168.1.100:8081"}
```

#### Server → Client

**Status:**
```json
{"type":"status","msg":"Waiting for iOS Simulator..."}
```

**Frame:**
```json
{"type":"frame","data":"<base64-jpeg>","w":390,"h":844}
```

## Performance Notes

- Frame rate capped at 15 FPS (configurable)
- JPEG quality at 75% (configurable)
- Each frame is streamed independently
- Input events are processed asynchronously

## License

MIT
