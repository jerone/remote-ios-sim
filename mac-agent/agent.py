"""
agent.py - Main WebSocket server. Streams iOS Simulator frames to Windows
and receives input events back.

Usage:
    python agent.py

Then connect from your browser at: ws://<mac-ip>:9001
"""
import asyncio
import base64
import json
import logging

import websockets

from actions import lock_screen, open_url, press_home, reload_app, rotate_left, rotate_right, shake
from capture import capture_frame, find_simulator_window
from input_injector import click_at, drag, scroll_at

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

HOST = "0.0.0.0"
PORT = 9001
FPS = 15
FRAME_INTERVAL = 1.0 / FPS
JPEG_QUALITY = 0.75


async def frame_streamer(websocket, state):
    """Background task: captures frames and pushes them to the client."""
    while True:
        window_id, bounds = find_simulator_window()

        if window_id is None:
            await websocket.send(json.dumps({"type": "status", "msg": "Waiting for iOS Simulator..."}))
            await asyncio.sleep(2)
            continue

        state["bounds"] = bounds

        frame_bytes = capture_frame(window_id, quality=JPEG_QUALITY)
        if frame_bytes:
            payload = json.dumps({
                "type": "frame",
                "data": base64.b64encode(frame_bytes).decode(),
                "w": int(bounds["Width"]),
                "h": int(bounds["Height"]),
            })
            try:
                await websocket.send(payload)
            except websockets.exceptions.ConnectionClosed:
                break

        await asyncio.sleep(FRAME_INTERVAL)


async def handle_input(msg_raw, state):
    """Dispatch an input message from the Windows client."""
    bounds = state.get("bounds")
    if bounds is None:
        return

    try:
        msg = json.loads(msg_raw)
    except json.JSONDecodeError:
        return

    kind = msg.get("type")

    if kind == "click":
        click_at(msg["x"], msg["y"], bounds)

    elif kind == "drag":
        drag(msg["x1"], msg["y1"], msg["x2"], msg["y2"], bounds)

    elif kind == "scroll":
        scroll_at(msg["x"], msg["y"], msg.get("dy", 0), bounds)

    # ── Expo / simulator actions ──────────────────────────────────────────
    elif kind == "action":
        name = msg.get("name")
        if name == "shake":       shake()
        elif name == "home":      press_home()
        elif name == "reload":    reload_app()
        elif name == "lock":      lock_screen()
        elif name == "rotateL":   rotate_left()
        elif name == "rotateR":   rotate_right()
        else:
            logger.warning("Unknown action: %s", name)

    # ── Open URL in simulator (Expo LAN URL from Windows dev server) ──────
    elif kind == "open_url":
        url = msg.get("url", "")
        if url:
            logger.info("Opening URL in simulator: %s", url)
            open_url(url)
        else:
            logger.warning("open_url received with no url field")

    else:
        logger.warning("Unknown input type: %s", kind)


async def handler(websocket, path="/"):
    """Handle an incoming WebSocket connection."""
    addr = websocket.remote_address
    logger.info("Client connected: %s", addr)

    state = {"bounds": None}
    stream_task = asyncio.create_task(frame_streamer(websocket, state))

    try:
        async for message in websocket:
            await handle_input(message, state)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        stream_task.cancel()
        logger.info("Client disconnected: %s", addr)


async def main():
    logger.info("iOS Simulator Remote Agent starting on ws://%s:%d", HOST, PORT)
    logger.info("Connect from Windows: http://<this-mac-ip>:%d", PORT)

    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
