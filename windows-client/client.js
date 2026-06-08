/**
 * client.js - WebSocket client for iOS Simulator Remote (Expo edition)
 *
 * Connects to the Mac agent, renders incoming JPEG frames on a <canvas>,
 * and sends mouse/touch/action events back.
 *
 * Keyboard shortcuts (when canvas is focused or anywhere on page):
 *   D        → Shake  (opens Expo dev menu)
 *   R        → Reload JS bundle
 *   H        → Home button
 *   L        → Lock screen
 */

const canvas      = document.getElementById("sim-canvas");
const ctx         = canvas.getContext("2d");
const statusEl    = document.getElementById("status");
const fpsEl       = document.getElementById("fps");
const connectBtn  = document.getElementById("connect-btn");
const hostInput   = document.getElementById("host-input");
const placeholder = document.getElementById("placeholder");

let ws         = null;
let frameCount = 0;
let lastFpsTime = performance.now();
let revealed   = false;

// ─── Connection ────────────────────────────────────────────────────────────────

function connect() {
  const host = hostInput.value.trim();
  if (!host) return;

  showCanvasPreview("Connecting to simulator...");
  setStatus("Connecting…", "orange");
  ws = new WebSocket(`ws://${host}:9001`);

  ws.onopen = () => {
    setStatus("Connected ✓", "limegreen");
    connectBtn.textContent = "Disconnect";
    showCanvasPreview("Connected. Waiting for first frame...");
  };

  ws.onclose = () => {
    setStatus("Disconnected", "tomato");
    connectBtn.textContent = "Connect";
    resetSimulatorView();
    ws = null;
  };

  ws.onerror = () => setStatus("Connection error", "tomato");

  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === "frame")  renderFrame(msg);
    if (msg.type === "status") setStatus(msg.msg, "orange");
  };
}

function disconnect() { if (ws) ws.close(); }

connectBtn.addEventListener("click", () => ws ? disconnect() : connect());

// Allow pressing Enter in the IP field to connect
hostInput.addEventListener("keydown", (e) => { if (e.key === "Enter") connect(); });

// ─── Rendering ─────────────────────────────────────────────────────────────────

function renderFrame(msg) {
  // Resize canvas to match simulator aspect ratio, filling available space
  const aspect = msg.w / msg.h;
  const maxH   = window.innerHeight - 110; // leave room for header + toolbar
  const maxW   = window.innerWidth  - 32;

  if (maxW / maxH > aspect) {
    canvas.height = maxH;
    canvas.width  = Math.round(maxH * aspect);
  } else {
    canvas.width  = maxW;
    canvas.height = Math.round(maxW / aspect);
  }

  const img  = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Reveal canvas on first frame
    if (!revealed) {
      placeholder.style.display = "none";
      canvas.style.display      = "block";
      revealed = true;
    }
  };
  img.src = "data:image/jpeg;base64," + msg.data;

  // FPS counter
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    fpsEl.textContent = `${frameCount} fps`;
    frameCount  = 0;
    lastFpsTime = now;
  }
}

function showCanvasPreview(text) {
  if (!revealed) {
    placeholder.style.display = "none";
    canvas.style.display = "block";
    revealed = true;
  }

  // Draw a lightweight placeholder frame so users see the simulator area immediately.
  if (canvas.width < 10 || canvas.height < 10) {
    const maxH = window.innerHeight - 110;
    const maxW = window.innerWidth - 32;
    const fallbackW = Math.min(maxW, Math.round(maxH * (9 / 19.5)));
    const fallbackH = Math.round(fallbackW * (19.5 / 9));
    canvas.width = Math.max(200, fallbackW);
    canvas.height = Math.max(320, fallbackH);
  }

  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6f6f6f";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function resetSimulatorView() {
  placeholder.style.display = "block";
  canvas.style.display = "none";
  revealed = false;
  fpsEl.textContent = "";
}

// ─── Send helpers ──────────────────────────────────────────────────────────────

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

/** Send a named simulator/Expo action and briefly animate the canvas. */
function sendAction(name) {
  send({ type: "action", name });
  if (name === "shake") triggerShakeAnimation();
}

/** Open an Expo LAN URL (exp://...) in the simulator. */
function openInSimulator() {
  const url = document.getElementById("expo-url-input").value.trim();
  if (!url) return;
  send({ type: "open_url", url });

  const btn = document.getElementById("open-btn");
  btn.textContent = "Opening…";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = "Open in Simulator"; btn.disabled = false; }, 2000);
}

function triggerShakeAnimation() {
  canvas.classList.remove("shaking");
  void canvas.offsetWidth; // reflow to restart animation
  canvas.classList.add("shaking");
  canvas.addEventListener("animationend", () => canvas.classList.remove("shaking"), { once: true });
}

// ─── Normalized coordinate helpers ────────────────────────────────────────────

function normCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top)  / rect.height,
  };
}

// ─── Mouse input ───────────────────────────────────────────────────────────────

canvas.addEventListener("click", (e) => {
  const { x, y } = normCoords(e);
  send({ type: "click", x, y });
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const { x, y } = normCoords(e);
  send({ type: "scroll", x, y, dy: -e.deltaY });
}, { passive: false });

// Drag / swipe
let dragStart = null;

canvas.addEventListener("mousedown", (e) => { dragStart = normCoords(e); });

canvas.addEventListener("mouseup", (e) => {
  if (!dragStart) return;
  const end = normCoords(e);
  const moved = Math.abs(end.x - dragStart.x) > 0.01 || Math.abs(end.y - dragStart.y) > 0.01;
  if (moved) send({ type: "drag", x1: dragStart.x, y1: dragStart.y, x2: end.x, y2: end.y });
  dragStart = null;
});

// ─── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  // Ignore when typing in the IP input
  if (document.activeElement === hostInput) return;

  const map = { d: "shake", r: "reload", h: "home", l: "lock" };
  const action = map[e.key.toLowerCase()];
  if (action) {
    e.preventDefault();
    sendAction(action);
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(text, color) {
  statusEl.textContent = text;
  statusEl.style.color = color;
}

