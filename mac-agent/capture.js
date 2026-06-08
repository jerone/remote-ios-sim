/**
 * capture.js - Finds and captures the iOS Simulator window using macOS APIs.
 * Uses node-ffi to access Quartz framework functions.
 */

import ffi from 'ffi-napi';
import ref from 'ref-napi';
import Struct from 'ref-struct-di';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

// Types for Quartz
const CGRect = Struct({
  origin: Struct({
    x: ref.types.double,
    y: ref.types.double,
  }),
  size: Struct({
    width: ref.types.double,
    height: ref.types.double,
  }),
});

const CGSize = Struct({
  width: ref.types.double,
  height: ref.types.double,
});

const CGPoint = Struct({
  x: ref.types.double,
  y: ref.types.double,
});

// Quartz Framework
const Quartz = ffi.Library('CoreGraphics', {
  CGWindowListCopyWindowInfo: [
    ref.refType(ref.types.void),
    ['uint32', 'uint32'],
  ],
  CGWindowListCreateImage: [
    ref.refType(ref.types.void),
    [CGRect, 'uint32', 'uint32', 'uint32'],
  ],
  CGRectNull: [CGRect, []],
  CGRectZero: [CGRect, []],
});

// AppKit Framework
const AppKit = ffi.Library('AppKit', {
  NSImage: [ref.refType(ref.types.void), []],
});

// Constants
const kCGWindowListOptionOnScreenOnly = 1;
const kCGWindowListExcludeDesktopElements = 4;
const kCGWindowListOptionIncludingWindow = 1;
const kCGWindowImageBoundsIgnoreFraming = 1;
const kCGWindowImageShouldBeOpaque = 4;
const kCGNullWindowID = 0;

/**
 * Find the frontmost iOS Simulator window using screencapture and image processing.
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

/**
 * Capture a JPEG frame of the iOS Simulator window.
 * Returns raw JPEG bytes, or null on failure.
 */
export async function captureFrame(windowId, quality = 0.7) {
  try {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `sim-frame-${Date.now()}.png`);

    // Use screencapture to capture the Simulator window
    try {
      execSync(`screencapture -l ${1} -x -t png "${tempFile}" 2>/dev/null || true`, {
        timeout: 5000,
      });
    } catch (err) {
      // Fallback: capture entire screen
      execSync(`screencapture -t png "${tempFile}"`, { timeout: 5000 });
    }

    // Check if file was created
    if (!fs.existsSync(tempFile)) {
      // Try alternative method: use system screenshot
      execSync(`screenshot -x > /dev/null 2>&1 || true`);
      return null;
    }

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
