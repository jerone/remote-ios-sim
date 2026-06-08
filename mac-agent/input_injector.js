/**
 * input_injector.js - Injects mouse/touch events into the iOS Simulator window
 * using macOS CoreGraphics APIs or robotjs library.
 *
 * The iOS Simulator maps mouse events directly to touch events, so simulating
 * a mouse click at the simulator window coordinates is all that's needed.
 */

import robot from 'robotjs';

// Simple delay helper
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Convert normalized (0–1) coordinates to absolute screen coordinates.
 */
function toScreenPoint(normX, normY, bounds) {
  const x = bounds.X + normX * bounds.Width;
  const y = bounds.Y + normY * bounds.Height;
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Simulate a tap/click at normalized coordinates within the simulator window.
 */
export function clickAt(normX, normY, bounds) {
  try {
    const point = toScreenPoint(normX, normY, bounds);
    
    // Move mouse to position
    robot.moveMouse(point.x, point.y);
    
    // Simulate click
    robot.mouseClick();
  } catch (err) {
    console.error('clickAt error:', err.message);
  }
}

/**
 * Simulate a drag/swipe gesture between two normalized positions.
 */
export async function drag(normX1, normY1, normX2, normY2, bounds, steps = 20) {
  try {
    const p1 = toScreenPoint(normX1, normY1, bounds);
    const p2 = toScreenPoint(normX2, normY2, bounds);

    // Move to start position
    robot.moveMouse(p1.x, p1.y);
    
    // Press down
    robot.mouseToggle('down');
    await delay(50);

    // Drag across intermediate points
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mid = {
        x: Math.round(p1.x + (p2.x - p1.x) * t),
        y: Math.round(p1.y + (p2.y - p1.y) * t),
      };
      robot.moveMouse(mid.x, mid.y);
      await delay(5);
    }

    // Release
    robot.mouseToggle('up');
  } catch (err) {
    console.error('drag error:', err.message);
  }
}

/**
 * Simulate a scroll wheel event at normalized coordinates.
 */
export async function scrollAt(normX, normY, dy, bounds) {
  try {
    const point = toScreenPoint(normX, normY, bounds);

    // Move cursor to position
    robot.moveMouse(point.x, point.y);
    await delay(10);

    // Scroll (robotjs uses pixels; positive = up, negative = down)
    // dy is in pixels, we'll scroll in chunks
    const scrollSteps = Math.max(1, Math.abs(dy) / 20);
    const scrollDirection = dy > 0 ? 1 : -1;

    for (let i = 0; i < scrollSteps; i++) {
      robot.scroll(0, scrollDirection * 3);
      await delay(20);
    }
  } catch (err) {
    console.error('scrollAt error:', err.message);
  }
}
