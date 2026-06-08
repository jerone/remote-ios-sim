/**
 * actions.js - Simulator control actions via osascript and xcrun simctl.
 * Used for Expo-specific interactions (dev menu, reload, etc.)
 */

import { execSync } from 'child_process';

function osascript(script) {
  try {
    execSync(`osascript -e '${script.replace(/'/g, "\\'")}'`, {
      stdio: 'pipe',
    });
  } catch (err) {
    console.error('osascript error:', err.message);
  }
}

export function bootSimulator(deviceName = 'iPhone 15') {
  /**
   * Boot a simulator device and open the Simulator app.
   */
  try {
    execSync(`xcrun simctl boot "${deviceName}"`, { stdio: 'pipe' });
    execSync('open -a Simulator', { stdio: 'pipe' });
  } catch (err) {
    console.error('bootSimulator error:', err.message);
  }
}

export function openUrl(url) {
  /**
   * Open a URL in the booted simulator.
   * Use this to load the Expo dev server running on Windows:
   *   exp://192.168.1.x:8081
   */
  try {
    execSync(`xcrun simctl openurl booted "${url}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error('openUrl error:', err.message);
  }
}

export function shake() {
  /**
   * Simulate a shake gesture — opens the Expo / React Native dev menu.
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        click menu item "Shake" of menu 1 of menu bar item "Hardware" of menu bar 1
    end tell
end tell
  `.trim();
  osascript(script);
}

export function pressHome() {
  /**
   * Press the Home button (Cmd+Shift+H in Simulator).
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        keystroke "h" using {command down, shift down}
    end tell
end tell
  `.trim();
  osascript(script);
}

export function reloadApp() {
  /**
   * Reload the React Native / Expo app.
   * Cmd+R triggers a JS bundle reload in the simulator.
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        keystroke "r" using {command down}
    end tell
end tell
  `.trim();
  osascript(script);
}

export function lockScreen() {
  /**
   * Lock the simulator screen (Cmd+L).
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        keystroke "l" using {command down}
    end tell
end tell
  `.trim();
  osascript(script);
}

export function rotateLeft() {
  /**
   * Rotate device left (Cmd+Left Arrow).
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        key code 123 using {command down}
    end tell
end tell
  `.trim();
  osascript(script);
}

export function rotateRight() {
  /**
   * Rotate device right (Cmd+Right Arrow).
   */
  const script = `
tell application "Simulator" to activate
tell application "System Events"
    tell process "Simulator"
        key code 124 using {command down}
    end tell
end tell
  `.trim();
  osascript(script);
}
