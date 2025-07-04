"""
Playwright configuration for e2e tests
"""
from playwright.sync_api import sync_playwright
import os

# Playwright configuration
PLAYWRIGHT_CONFIG = {
    "headless": True,
    "slow_mo": 0,
    "timeout": 30000,
    "viewport": {"width": 1280, "height": 720},
    "screenshot": "only-on-failure",
    "video": "retain-on-failure",
    "trace": "retain-on-failure",
}

# Screenshot directory
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")

# Test server configuration
TEST_SERVER_URL = "http://localhost:8000"
TEST_SERVER_TIMEOUT = 10000  # 10 seconds

# Browser configuration
BROWSERS = ["chromium"]  # Can add "firefox", "webkit" for cross-browser testing

# Viewport sizes for testing
VIEWPORT_SIZES = [
    {"width": 1920, "height": 1080},  # Desktop
    {"width": 1280, "height": 720},   # Laptop
    {"width": 768, "height": 1024},   # Tablet
]