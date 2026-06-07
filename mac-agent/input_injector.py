"""
input_injector.py - Injects mouse/touch events into the iOS Simulator window
using macOS CoreGraphics (CGEventPost).

The iOS Simulator maps mouse events directly to touch events, so simulating
a mouse click at the simulator window coordinates is all that's needed.
"""
import Quartz


def _to_screen_point(norm_x, norm_y, bounds):
    """Convert normalized (0–1) coordinates to absolute screen coordinates."""
    x = bounds["X"] + norm_x * bounds["Width"]
    y = bounds["Y"] + norm_y * bounds["Height"]
    return Quartz.CGPoint(x, y)


def click_at(norm_x, norm_y, bounds):
    """Simulate a tap/click at normalized coordinates within the simulator window."""
    point = _to_screen_point(norm_x, norm_y, bounds)

    for event_type in (Quartz.kCGEventLeftMouseDown, Quartz.kCGEventLeftMouseUp):
        event = Quartz.CGEventCreateMouseEvent(
            None, event_type, point, Quartz.kCGMouseButtonLeft
        )
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)


def drag(norm_x1, norm_y1, norm_x2, norm_y2, bounds, steps=20):
    """Simulate a drag/swipe gesture between two normalized positions."""
    p1 = _to_screen_point(norm_x1, norm_y1, bounds)
    p2 = _to_screen_point(norm_x2, norm_y2, bounds)

    # Mouse down at start
    down = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventLeftMouseDown, p1, Quartz.kCGMouseButtonLeft
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)

    # Drag across intermediate points
    for i in range(1, steps + 1):
        t = i / steps
        mid = Quartz.CGPoint(
            p1.x + (p2.x - p1.x) * t,
            p1.y + (p2.y - p1.y) * t,
        )
        drag_event = Quartz.CGEventCreateMouseEvent(
            None, Quartz.kCGEventLeftMouseDragged, mid, Quartz.kCGMouseButtonLeft
        )
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, drag_event)

    # Mouse up at end
    up = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventLeftMouseUp, p2, Quartz.kCGMouseButtonLeft
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)


def scroll_at(norm_x, norm_y, dy, bounds):
    """Simulate a scroll wheel event at normalized coordinates."""
    point = _to_screen_point(norm_x, norm_y, bounds)

    # Move cursor to position first
    move = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventMouseMoved, point, Quartz.kCGMouseButtonLeft
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, move)

    # Scroll
    scroll = Quartz.CGEventCreateScrollWheelEvent(
        None, Quartz.kCGScrollEventUnitPixel, 1, int(dy)
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, scroll)
