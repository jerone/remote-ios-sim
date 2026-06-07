"""
actions.py - Simulator control actions via osascript and xcrun simctl.
Used for Expo-specific interactions (dev menu, reload, etc.)
"""
import subprocess


def _osascript(script: str):
    subprocess.run(["osascript", "-e", script], check=False)


def boot_simulator(device_name: str = "iPhone 15"):
    """Boot a simulator device and open the Simulator app."""
    subprocess.run(["xcrun", "simctl", "boot", device_name], check=False)
    subprocess.run(["open", "-a", "Simulator"], check=False)


def open_url(url: str):
    """
    Open a URL in the booted simulator.
    Use this to load the Expo dev server running on Windows:
      exp://192.168.1.x:8081
    """
    subprocess.run(["xcrun", "simctl", "openurl", "booted", url], check=False)


def shake():
    """Simulate a shake gesture — opens the Expo / React Native dev menu."""
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                click menu item "Shake" of menu 1 of menu bar item "Hardware" of menu bar 1
            end tell
        end tell
    """)


def press_home():
    """Press the Home button (Cmd+Shift+H in Simulator)."""
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                keystroke "h" using {command down, shift down}
            end tell
        end tell
    """)


def reload_app():
    """
    Reload the React Native / Expo app.
    Cmd+R triggers a JS bundle reload in the simulator.
    """
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                keystroke "r" using {command down}
            end tell
        end tell
    """)


def lock_screen():
    """Lock the simulator screen (Cmd+L)."""
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                keystroke "l" using {command down}
            end tell
        end tell
    """)


def rotate_left():
    """Rotate device left (Cmd+Left Arrow)."""
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                key code 123 using {command down}
            end tell
        end tell
    """)


def rotate_right():
    """Rotate device right (Cmd+Right Arrow)."""
    _osascript("""
        tell application "Simulator" to activate
        tell application "System Events"
            tell process "Simulator"
                key code 124 using {command down}
            end tell
        end tell
    """)
