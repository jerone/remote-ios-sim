/**
 * capture.js - Finds and captures the iOS Simulator window.
 * Uses native macOS commands (screencapture, osascript) - no native dependencies required.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

let ffmpegProcess = null;
let ffmpegBuffer = Buffer.alloc(0);
let latestLiveFrame = null;
let activeStreamKey = null;
let ffmpegUnavailable = false;

/**
 * Find the frontmost iOS Simulator window using screencapture and osascript.
 * Returns { windowId, bounds } or { windowId: null, bounds: null } if not found.
 */
export function findSimulatorWindow() {
  try {
    // Use system_profiler or process inspection to find Simulator window
    // For macOS 12+, we can use the screencapture command with -l flag
    const output = execSync('lsof -c Simulator -a -d cwd 2>/dev/null || true', {
      encoding: 'utf-8',
    });

    if (!output || output.length === 0) {
      return { windowId: null, bounds: null };
    }

    // Try to get window bounds via system info
    // This is a simplified approach - in production, you'd want more robust window detection
    const windowInfo = execSync(
      'osascript -e "tell application \\"Simulator\\" to get bounds of window 1" 2>/dev/null || echo "not found"',
      { encoding: 'utf-8' }
    ).trim();

    if (windowInfo === 'not found' || windowInfo.length === 0) {
      return { windowId: null, bounds: null };
    }

    // Parse osascript output: "{x, y, width, height}"
    const match = windowInfo.match(/(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (!match) {
      return { windowId: null, bounds: null };
    }

    const [, x, y, width, height] = match;
    const bounds = {
      X: parseFloat(x),
      Y: parseFloat(y),
      Width: parseFloat(width),
      Height: parseFloat(height),
    };

    // Return a dummy window ID (1 for Simulator)
    return { windowId: 1, bounds };
  } catch (err) {
    return { windowId: null, bounds: null };
  }
}

function buildStreamKey(bounds, fps, quality) {
  return [
    Math.round(bounds.X),
    Math.round(bounds.Y),
    Math.round(bounds.Width),
    Math.round(bounds.Height),
    fps,
    quality,
  ].join(':');
}

function qualityToMjpegQ(quality) {
  const clamped = Math.max(0.05, Math.min(1, quality));
  return Math.max(2, Math.min(31, Math.round(31 - clamped * 29)));
}

function extractJpegFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset < buffer.length - 1) {
    const start = buffer.indexOf(Buffer.from([0xff, 0xd8]), offset);
    if (start === -1) break;

    const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
    if (end === -1) break;

    frames.push(buffer.slice(start, end + 2));
    offset = end + 2;
  }

  return { frames, remainder: buffer.slice(offset) };
}

/**
 * Start ffmpeg-based live capture for the simulator region.
 * Returns true when capture process starts, false when unavailable.
 */
export function startLiveCapture(bounds, fps = 15, quality = 0.75) {
  if (!bounds || ffmpegUnavailable) {
    return false;
  }

  const streamKey = buildStreamKey(bounds, fps, quality);
  if (ffmpegProcess && activeStreamKey === streamKey) {
    return true;
  }

  stopLiveCapture();

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const ffmpegInput = process.env.FFMPEG_INPUT || '1:none';
  const q = qualityToMjpegQ(quality);

  const cropW = Math.max(10, Math.round(bounds.Width));
  const cropH = Math.max(10, Math.round(bounds.Height));
  const cropX = Math.max(0, Math.round(bounds.X));
  const cropY = Math.max(0, Math.round(bounds.Y));

  const args = [
    '-loglevel',
    'error',
    '-f',
    'avfoundation',
    '-framerate',
    String(Math.max(15, fps)),
    '-i',
    ffmpegInput,
    '-vf',
    `crop=${cropW}:${cropH}:${cropX}:${cropY},fps=${fps}`,
    '-an',
    '-c:v',
    'mjpeg',
    '-q:v',
    String(q),
    '-f',
    'image2pipe',
    'pipe:1',
  ];

  try {
    ffmpegProcess = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      ffmpegUnavailable = true;
    }
    ffmpegProcess = null;
    return false;
  }

  ffmpegBuffer = Buffer.alloc(0);
  latestLiveFrame = null;
  activeStreamKey = streamKey;

  ffmpegProcess.stdout.on('data', (chunk) => {
    ffmpegBuffer = Buffer.concat([ffmpegBuffer, chunk]);
    const { frames, remainder } = extractJpegFrames(ffmpegBuffer);
    ffmpegBuffer = remainder;
    if (frames.length > 0) {
      latestLiveFrame = frames[frames.length - 1];
    }
  });

  ffmpegProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      ffmpegUnavailable = true;
    }
    stopLiveCapture();
  });

  ffmpegProcess.on('close', () => {
    ffmpegProcess = null;
    ffmpegBuffer = Buffer.alloc(0);
    activeStreamKey = null;
  });

  return true;
}

export function getLatestLiveFrame() {
  return latestLiveFrame;
}

export function stopLiveCapture() {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
  }
  ffmpegProcess = null;
  ffmpegBuffer = Buffer.alloc(0);
  activeStreamKey = null;
  latestLiveFrame = null;
}

/**
 * Capture a JPEG frame of the iOS Simulator window.
 * Returns raw JPEG bytes, or null on failure.
 */
export async function captureFrame(windowId, quality = 0.7) {
  try {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `sim-frame-${Date.now()}-${process.pid}.png`);

    // Use screencapture to capture the Simulator window
    try {
      execSync(`screencapture -l ${windowId} -x -t png "${tempFile}" 2>/dev/null || true`, {
        timeout: 5000,
      });
    } catch (err) {
      // Fallback: capture entire screen
      execSync(`screencapture -t png "${tempFile}"`, { timeout: 5000 });
    }

    // Check if file was created
    if (!fs.existsSync(tempFile)) return null;

    // Convert PNG to JPEG with specified quality
    const jpegBuffer = await sharp(tempFile)
      .jpeg({ quality: Math.round(quality * 100), progressive: true })
      .toBuffer();

    // Clean up temp file
    fs.unlink(tempFile, () => {});

    return jpegBuffer;
  } catch (err) {
    console.error('captureFrame error:', err.message);
    return null;
  }
}
