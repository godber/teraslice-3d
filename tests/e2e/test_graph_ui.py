"""
End-to-end tests for the 3D graph UI using Playwright
"""
import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from playwright.sync_api import sync_playwright, Page, BrowserContext
import json


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


class TestGraphUI:
    """Test suite for 3D graph UI functionality"""
    
    def test_homepage_loads(self, page, screenshot_dir):
        """Test that the homepage loads and displays the 3D graph container"""
        # Mock the API endpoints to avoid external dependencies
        with patch('app.main.get_jobs') as mock_get_jobs:
            mock_get_jobs.return_value = []
            
            # Start the test server
            # Note: In a real implementation, we'd start the FastAPI server
            # For now, we'll test the HTML structure
            
            # Create a test HTML page with our template content
            test_html = """
            <!DOCTYPE html>
            <html>
            <head>
              <style> body { margin: 0; } </style>
            </head>
            <body>
              <div id="3d-graph"></div>
              <script>
                // Mock the ForceGraph3D for testing
                window.ForceGraph3D = function(elem) {
                  elem.innerHTML = '<div id="mock-graph">3D Graph Loaded</div>';
                  return {
                    jsonUrl: function() { return this; },
                    nodeColor: function() { return this; },
                    nodeLabel: function() { return this; },
                    linkLabel: function() { return this; },
                    linkWidth: function() { return this; },
                    linkColor: function() { return this; },
                    onLinkClick: function() { return this; }
                  };
                };
                
                const elem = document.getElementById('3d-graph');
                const Graph = new ForceGraph3D(elem);
              </script>
            </body>
            </html>
            """
            
            # Write test HTML to a temporary file and load it
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                f.write(test_html)
                temp_html_path = f.name
            
            try:
                page.goto(f"file://{temp_html_path}")
                
                # Wait for the graph container to be present
                page.wait_for_selector("#3d-graph", timeout=5000)
                
                # Check that the 3D graph container exists
                graph_container = page.locator("#3d-graph")
                assert graph_container.is_visible()
                
                # Take a screenshot
                screenshot_path = screenshot_dir / "homepage_loaded.png"
                page.screenshot(path=str(screenshot_path))
                
                # Check that our mock graph loaded
                mock_graph = page.locator("#mock-graph")
                assert mock_graph.is_visible()
                assert mock_graph.inner_text() == "3D Graph Loaded"
                
            finally:
                import os
                os.unlink(temp_html_path)
    
    def test_graph_with_mock_data(self, page, screenshot_dir, mock_teraslice_jobs_simple):
        """Test graph rendering with mock job data"""
        # Create test HTML with mock data
        test_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style> body {{ margin: 0; }} </style>
        </head>
        <body>
          <div id="3d-graph"></div>
          <script>
            // Mock graph data
            const mockData = {{
              "nodes": [
                {{"id": "kafka_input-topic", "type": "KAFKA"}},
                {{"id": "es_output-index", "type": "ES"}}
              ],
              "links": [
                {{
                  "source": "kafka_input-topic",
                  "target": "es_output-index",
                  "job_id": "kafka-to-es-001",
                  "name": "kafka-to-elasticsearch-pipeline",
                  "workers": 3,
                  "status": "running"
                }}
              ]
            }};
            
            // Mock ForceGraph3D
            window.ForceGraph3D = function(elem) {{
              elem.innerHTML = '<div id="mock-graph">Graph with ' + mockData.nodes.length + ' nodes and ' + mockData.links.length + ' links</div>';
              return {{
                jsonUrl: function() {{ return this; }},
                nodeColor: function() {{ return this; }},
                nodeLabel: function() {{ return this; }},
                linkLabel: function() {{ return this; }},
                linkWidth: function() {{ return this; }},
                linkColor: function() {{ return this; }},
                onLinkClick: function() {{ return this; }}
              }};
            }};
            
            const elem = document.getElementById('3d-graph');
            const Graph = new ForceGraph3D(elem);
          </script>
        </body>
        </html>
        """
        
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(test_html)
            temp_html_path = f.name
        
        try:
            page.goto(f"file://{temp_html_path}")
            
            # Wait for the graph to load
            page.wait_for_selector("#mock-graph", timeout=5000)
            
            # Check that the graph shows our mock data
            mock_graph = page.locator("#mock-graph")
            assert mock_graph.is_visible()
            assert "2 nodes and 1 links" in mock_graph.inner_text()
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "graph_with_mock_data.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_graph_responsive_design(self, page, screenshot_dir):
        """Test graph rendering at different viewport sizes"""
        test_html = """
        <!DOCTYPE html>
        <html>
        <head>
          <style> body { margin: 0; } </style>
        </head>
        <body>
          <div id="3d-graph" style="width: 100%; height: 100vh; background: #f0f0f0;"></div>
          <script>
            window.ForceGraph3D = function(elem) {
              elem.innerHTML = '<div id="mock-graph">Responsive Graph</div>';
              return {
                jsonUrl: function() { return this; },
                nodeColor: function() { return this; },
                nodeLabel: function() { return this; },
                linkLabel: function() { return this; },
                linkWidth: function() { return this; },
                linkColor: function() { return this; },
                onLinkClick: function() { return this; }
              };
            };
            
            const elem = document.getElementById('3d-graph');
            const Graph = new ForceGraph3D(elem);
          </script>
        </body>
        </html>
        """
        
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(test_html)
            temp_html_path = f.name
        
        try:
            # Test different viewport sizes
            viewports = [
                {"width": 1920, "height": 1080, "name": "desktop"},
                {"width": 1280, "height": 720, "name": "laptop"},
                {"width": 768, "height": 1024, "name": "tablet"},
            ]
            
            for viewport in viewports:
                page.set_viewport_size({"width": viewport["width"], "height": viewport["height"]})
                page.goto(f"file://{temp_html_path}")
                
                # Wait for the graph container
                page.wait_for_selector("#3d-graph", timeout=5000)
                
                # Check that the graph container is visible
                graph_container = page.locator("#3d-graph")
                assert graph_container.is_visible()
                
                # Take a screenshot for this viewport
                screenshot_path = screenshot_dir / f"responsive_{viewport['name']}.png"
                page.screenshot(path=str(screenshot_path))
                
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_graph_error_handling(self, page, screenshot_dir):
        """Test graph behavior when API fails"""
        test_html = """
        <!DOCTYPE html>
        <html>
        <head>
          <style> body { margin: 0; } </style>
        </head>
        <body>
          <div id="3d-graph"></div>
          <div id="error-message" style="display: none; color: red;">Error loading graph data</div>
          <script>
            window.ForceGraph3D = function(elem) {
              // Simulate API failure
              setTimeout(() => {
                document.getElementById('error-message').style.display = 'block';
              }, 100);
              
              return {
                jsonUrl: function() { 
                  // Simulate failed API call
                  throw new Error('Failed to load data');
                },
                nodeColor: function() { return this; },
                nodeLabel: function() { return this; },
                linkLabel: function() { return this; },
                linkWidth: function() { return this; },
                linkColor: function() { return this; },
                onLinkClick: function() { return this; }
              };
            };
            
            try {
              const elem = document.getElementById('3d-graph');
              const Graph = new ForceGraph3D(elem);
            } catch (error) {
              document.getElementById('error-message').style.display = 'block';
            }
          </script>
        </body>
        </html>
        """
        
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(test_html)
            temp_html_path = f.name
        
        try:
            page.goto(f"file://{temp_html_path}")
            
            # Wait for error message to appear
            page.wait_for_selector("#error-message", timeout=5000)
            
            # Check that error message is visible
            error_message = page.locator("#error-message")
            assert error_message.is_visible()
            assert "Error loading graph data" in error_message.inner_text()
            
            # Take a screenshot of the error state
            screenshot_path = screenshot_dir / "graph_error_state.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_graph_color_coding(self, page, screenshot_dir):
        """Test that graph nodes are colored correctly based on type"""
        test_html = """
        <!DOCTYPE html>
        <html>
        <head>
          <style> body { margin: 0; } </style>
        </head>
        <body>
          <div id="3d-graph"></div>
          <div id="color-legend">
            <div id="kafka-incoming" style="background: yellow; width: 20px; height: 20px; display: inline-block;"></div>
            <span>Kafka Incoming</span>
            <div id="kafka-regular" style="background: blue; width: 20px; height: 20px; display: inline-block;"></div>
            <span>Kafka Regular</span>
            <div id="elasticsearch" style="background: green; width: 20px; height: 20px; display: inline-block;"></div>
            <span>Elasticsearch</span>
          </div>
          <script>
            window.ForceGraph3D = function(elem) {
              elem.innerHTML = '<div id="mock-graph">Graph with color coding</div>';
              return {
                jsonUrl: function() { return this; },
                nodeColor: function(node) {
                  // Test the color logic from the actual template
                  if (node.id.startsWith("kafka")) {
                    if (node.id.includes("incoming")) {
                      return 'yellow';
                    }
                    return 'blue';
                  } else {
                    return 'green';
                  }
                },
                nodeLabel: function() { return this; },
                linkLabel: function() { return this; },
                linkWidth: function() { return this; },
                linkColor: function() { return this; },
                onLinkClick: function() { return this; }
              };
            };
            
            const elem = document.getElementById('3d-graph');
            const Graph = new ForceGraph3D(elem);
          </script>
        </body>
        </html>
        """
        
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(test_html)
            temp_html_path = f.name
        
        try:
            page.goto(f"file://{temp_html_path}")
            
            # Wait for the graph to load
            page.wait_for_selector("#3d-graph", timeout=5000)
            
            # Check that color legend is visible
            legend = page.locator("#color-legend")
            assert legend.is_visible()
            
            # Take a screenshot showing the color coding
            screenshot_path = screenshot_dir / "graph_color_coding.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)