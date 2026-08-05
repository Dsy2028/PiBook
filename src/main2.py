"""
main2.py — Standalone dev server for testing Flask API + React frontend
without a Raspberry Pi connected.

Run from project root:
    python3 src/main2.py

React dev server (separate terminal):
    cd src/web/client && npm run dev
"""

import sys
import os

# Make sure src/ is on the path so imports resolve correctly
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(line_buffering=True)

# ── Mock hardware modules so imports don't crash on non-Pi ───────────────────
from unittest.mock import MagicMock
sys.modules['RPi']              = MagicMock()
sys.modules['RPi.GPIO']         = MagicMock()
sys.modules['gpiozero']         = MagicMock()
sys.modules['spidev']           = MagicMock()
sys.modules['waveshare_epd']    = MagicMock()
sys.modules['smbus2']           = MagicMock()
sys.modules['PIL']              = MagicMock()
sys.modules['PIL.Image']        = MagicMock()
sys.modules['PIL.ImageDraw']    = MagicMock()
sys.modules['PIL.ImageFont']    = MagicMock()

# ── Mock config object ────────────────────────────────────────────────────────
class MockConfig:
    """Mimics the PiBook config object — returns sensible defaults for everything."""
    _data = {
        'web.port':                    5000,
        'web.always_on':               False,
        'display.full_refresh_interval': 10,
        'power.sleep_timeout':         120,
        'power.undervolt':             0,
        'power.boot_cores':            4,
        'library.items_per_page':      4,
        'logging.file':                '/tmp/pibook_dev.log',
    }

    def get(self, key, default=None):
        return self._data.get(key, default)

    def set(self, key, value):
        self._data[key] = value

    def save(self):
        print(f"[MockConfig] save() called (no-op in dev mode)")


# ── Mock battery monitor ──────────────────────────────────────────────────────
class MockBatteryMonitor:
    def get_status(self):
        return {
            'percentage': 72,
            'charging':   False,
            'voltage':    3.9,
        }


# ── Mock screen / navigation objects ─────────────────────────────────────────
class MockScreen:
    items_per_page  = 4
    sleep_enabled   = True

    def load_books(self, path):
        print(f"[MockScreen] load_books({path}) called")

    def close(self):
        pass


class MockReaderScreen(MockScreen):
    zoom_factor      = 1.0
    show_page_numbers = True
    current_page     = 0
    epub_path        = None
    renderer         = None

    def load_epub(self, path, zoom_factor=1.0, dpi=150):
        print(f"[MockReaderScreen] load_epub({path}) called")


class MockNavigation:
    class CurrentScreen:
        value = 'library'
    current_screen = CurrentScreen()


class MockProgressManager:
    def get_all_progress(self):
        return {}

    def clear_all_progress(self):
        print("[MockProgressManager] clear_all_progress() called")

    def clear_progress(self, path):
        print(f"[MockProgressManager] clear_progress({path}) called")


# ── Mock settings ─────────────────────────────────────────────────────────────
MOCK_SETTINGS = {
    'zoom':                  1.0,
    'dpi':                   150,
    'full_refresh_interval': 10,
    'show_page_numbers':     True,
    'wifi_while_reading':    False,
    'sleep_enabled':         True,
    'sleep_message':         "Shh I'm sleeping",
    'sleep_timeout':         120,
    'shutdown_message':      'OFF',
    'items_per_page':        4,
    'undervolt':             0,
    'boot_cores':            4,
}

class MockSettingsManager:
    settings = MOCK_SETTINGS.copy()

    def load(self):
        return self.settings

    def get_all(self):
        return self.settings


class MockDisplay:
    def set_full_refresh_interval(self, n):
        print(f"[MockDisplay] set_full_refresh_interval({n}) called")

    def _render_current_screen(self):
        print("[MockDisplay] _render_current_screen() called")


# ── Assembled mock app instance ───────────────────────────────────────────────
class MockApp:
    config           = MockConfig()
    battery_monitor  = MockBatteryMonitor()
    library_screen   = MockScreen()
    reader_screen    = MockReaderScreen()
    navigation       = MockNavigation()
    progress_manager = MockProgressManager()
    settings_manager = MockSettingsManager()
    settings         = MOCK_SETTINGS.copy()
    display          = MockDisplay()
    ip_scanner_screen = MagicMock()

    def _handle_next(self):   print("[MockApp] next")
    def _handle_prev(self):   print("[MockApp] prev")
    def _handle_select(self): print("[MockApp] select")
    def _handle_back(self):   print("[MockApp] back")
    def _handle_menu(self):   print("[MockApp] menu")
    def _render_current_screen(self): print("[MockApp] render")


# ── Boot ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Use a local books dir for dev — create it if it doesn't exist
    BOOKS_DIR = os.path.join(os.path.dirname(__file__), '..', 'dev_books')
    os.makedirs(BOOKS_DIR, exist_ok=True)

    # Also make sure the cache dir exists
    CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
    os.makedirs(CACHE_DIR, exist_ok=True)

    print("=" * 55)
    print("  PiBook Dev Server")
    print("  Flask API  →  http://localhost:5000")
    print("  React UI   →  http://localhost:5173  (npm run dev)")
    print("=" * 55)

    from web.webserver import PiBookWebServer, startup

    mock_app = MockApp()

    # Attempt Calibre startup — will fall back to offline gracefully
    print("\n[startup] Checking Calibre connection...")
    startup()

    server = PiBookWebServer(
        books_dir=BOOKS_DIR,
        app_instance=mock_app,
        port=5000,
        version='dev',
    )


    # Run Flask directly (not in a thread) so the terminal shows logs
    from flask_cors import CORS
    CORS(server.flask_app)
    server.flask_app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)