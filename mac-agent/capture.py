"""
capture.py - Finds and captures the iOS Simulator window using macOS Quartz APIs.
"""
import Quartz
import AppKit


def find_simulator_window():
    """
    Find the frontmost iOS Simulator window.
    Returns (window_id, bounds_dict) or (None, None) if not found.
    bounds_dict has keys: X, Y, Width, Height (in screen coordinates)
    """
    window_list = Quartz.CGWindowListCopyWindowInfo(
        Quartz.kCGWindowListOptionOnScreenOnly
        | Quartz.kCGWindowListExcludeDesktopElements,
        Quartz.kCGNullWindowID,
    )

    for window in window_list:
        owner = window.get("kCGWindowOwnerName", "")
        layer = window.get("kCGWindowLayer", 99)
        # The simulator main window sits on layer 0
        if "Simulator" in owner and layer == 0:
            window_id = window.get("kCGWindowNumber")
            bounds = window.get("kCGWindowBounds")
            if bounds and bounds.get("Width", 0) > 100:
                return window_id, dict(bounds)

    return None, None


def capture_frame(window_id, quality=0.7):
    """
    Capture a single JPEG frame of the given window.
    Returns raw JPEG bytes, or None on failure.
    """
    cg_image = Quartz.CGWindowListCreateImage(
        Quartz.CGRectNull,
        Quartz.kCGWindowListOptionIncludingWindow,
        window_id,
        Quartz.kCGWindowImageBoundsIgnoreFraming
        | Quartz.kCGWindowImageShouldBeOpaque,
    )

    if cg_image is None:
        return None

    ns_image = AppKit.NSImage.alloc().initWithCGImage_size_(
        cg_image, AppKit.NSZeroSize
    )
    tiff_data = ns_image.TIFFRepresentation()
    bitmap = AppKit.NSBitmapImageRep.imageRepWithData_(tiff_data)
    props = {AppKit.NSImageCompressionFactor: quality}
    jpeg_data = bitmap.representationUsingType_properties_(
        AppKit.NSJPEGFileType, props
    )

    return bytes(jpeg_data)
