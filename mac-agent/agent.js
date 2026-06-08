/**
 * agent.js - Main WebSocket server. Streams iOS Simulator frames to Windows
 * and receives input events back.
 *
 * Usage:
 *     npm install
 *     npm start
 *
 * Then connect from your browser at: ws://<mac-ip>:9001
 */

import WebSocket, { WebSocketServer } from 'ws';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  lockScreen,
  openUrl,
  pressHome,
  reloadApp,
  rotateLeft,
  rotateRight,
  shake,
} from './actions.js';
import { captureFrame, findSimulatorWindow } from './capture.js';
import { clickAt, drag, scrollAt } from './input_injector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOST = '0.0.0.0';
const PORT = 9001;
const FPS = 15;
const FRAME_INTERVAL = 1.0 / FPS;
const JPEG_QUALITY = 0.75;

// Simple logger
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
};

/**
 * Background task: captures frames and pushes them to the client.
 */
async function frameStreamer(websocket, state) {
  while (true) {
    try {
      const { windowId, bounds } = findSimulatorWindow();

      if (windowId === null) {
        try {
          websocket.send(
            JSON.stringify({
              type: 'status',
              msg: 'Waiting for iOS Simulator...',
            })
          );
        } catch (err) {
          // Connection closed
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      state.bounds = bounds;

      const frameBytes = await captureFrame(windowId, JPEG_QUALITY);
      if (frameBytes) {
        const payload = JSON.stringify({
          type: 'frame',
          data: frameBytes.toString('base64'),
          w: Math.round(bounds.Width),
          h: Math.round(bounds.Height),
        });
        try {
          websocket.send(payload);
        } catch (err) {
          // Connection closed
          break;
        }
      }

      await new Promise((r) => setTimeout(r, FRAME_INTERVAL * 1000));
    } catch (err) {
      logger.error('Frame streamer error:', err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Dispatch an input message from the Windows client.
 */
async function handleInput(msgRaw, state) {
  const bounds = state.bounds;
  if (!bounds) {
    return;
  }

  let msg;
  try {
    msg = JSON.parse(msgRaw);
  } catch (err) {
    return;
  }

  const kind = msg.type;

  try {
    if (kind === 'click') {
      clickAt(msg.x, msg.y, bounds);
    } else if (kind === 'drag') {
      drag(msg.x1, msg.y1, msg.x2, msg.y2, bounds);
    } else if (kind === 'scroll') {
      scrollAt(msg.x, msg.y, msg.dy || 0, bounds);
    }
    // ── Expo / simulator actions ──────────────────────────────────────────
    else if (kind === 'action') {
      const name = msg.name;
      if (name === 'shake') shake();
      else if (name === 'home') pressHome();
      else if (name === 'reload') reloadApp();
      else if (name === 'lock') lockScreen();
      else if (name === 'rotateL') rotateLeft();
      else if (name === 'rotateR') rotateRight();
      else logger.warn('Unknown action:', name);
    }
    // ── Open URL in simulator (Expo LAN URL from Windows dev server) ──────
    else if (kind === 'open_url') {
      const url = msg.url || '';
      if (url) {
        logger.info('Opening URL in simulator:', url);
        openUrl(url);
      }
    }
  } catch (err) {
    logger.error('Error handling input:', err);
  }
}

/**
 * Handle a new WebSocket connection.
 */
async function handleConnection(websocket) {
  logger.info('Client connected');
  const state = { bounds: null };

  // Start frame streamer for this client
  frameStreamer(websocket, state).catch((err) => {
    logger.error('Frame streamer crashed:', err);
  });

  // Handle incoming messages
  websocket.on('message', (data) => {
    handleInput(data.toString(), state).catch((err) => {
      logger.error('Error in handleInput:', err);
    });
  });

  websocket.on('close', () => {
    logger.info('Client disconnected');
  });

  websocket.on('error', (err) => {
    logger.error('WebSocket error:', err);
  });
}

/**
 * Start the WebSocket server.
 */
function startServer() {
  const wss = new WebSocketServer({ host: HOST, port: PORT });

  wss.on('connection', handleConnection);
  wss.on('error', (err) => {
    logger.error('WebSocket server error:', err);
  });

  logger.info(`WebSocket server listening on ws://${HOST}:${PORT}`);
  logger.info(`Connect from browser at: ws://<mac-ip>:${PORT}`);
}

startServer();
