"""Simplified end-to-end tests for the 3D graph UI using Playwright"""
import pytest
import asyncio
import httpx
from unittest.mock import patch, AsyncMock
from playwright.sync_api import sync_playwright, Page, BrowserContext
from pathlib import Path
import os


@pytest.fixture
def browser_context():
    """Create browser context for tests"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720}
        )
        yield context
        context.close()
        browser.close()


@pytest.fixture
def page(browser_context):
    """Create a new page for each test"""
    page = browser_context.new_page()
    yield page
    page.close()


@pytest.fixture
def test_server():
    """Start a test server on a free port"""
    import uvicorn
    from multiprocessing import Process
    import socket
    import time
    
    # Find a free port
    def find_free_port():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port
    
    port = find_free_port()
    
    def run_server():
        from app.main import app
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
    
    # Start server in a separate process
    server_process = Process(target=run_server)
    server_process.start()
    
    # Wait for server to start
    time.sleep(2)
    
    yield f"http://127.0.0.1:{port}"
    
    # Cleanup
    server_process.terminate()
    server_process.join()


class TestGraphUI:
    """Simplified test suite for 3D graph UI functionality"""
    
    def test_page_loads_with_mock_data(self, page, screenshot_dir, test_server, mock_teraslice_jobs_simple):
        """Test that the page loads without error and take a screenshot"""
        
        # Mock the external HTTP call to Teraslice API
        with patch('httpx.get') as mock_get:
            # Create a mock response
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_teraslice_jobs_simple
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Load the actual page
            page.goto(test_server)
            
            # Wait for the graph container to be present
            page.wait_for_selector("#3d-graph", timeout=10000)
            
            # Check that the 3D graph container exists
            graph_container = page.locator("#3d-graph")
            assert graph_container.is_visible()
            
            # Check for JavaScript errors
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            # Wait a bit for the graph to load
            page.wait_for_timeout(3000)
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "page_loaded.png"
            page.screenshot(path=str(screenshot_path))
            
            # Assert no JavaScript errors occurred
            assert len(console_errors) == 0, f"JavaScript errors found: {console_errors}"
            
            print(f"✓ Page loaded successfully, screenshot saved to {screenshot_path}")
    
    def test_empty_data_loads(self, page, screenshot_dir, test_server):
        """Test that the page loads with empty data"""
        
        # Mock the external HTTP call to return empty data
        with patch('httpx.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = []  # Empty job list
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Load the page
            page.goto(test_server)
            
            # Wait for the graph container
            page.wait_for_selector("#3d-graph", timeout=10000)
            
            # Check that the container exists
            graph_container = page.locator("#3d-graph")
            assert graph_container.is_visible()
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "empty_data.png"
            page.screenshot(path=str(screenshot_path))
            
            print(f"✓ Empty data test passed, screenshot saved to {screenshot_path}")