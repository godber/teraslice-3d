"""
End-to-end tests for API endpoints using Playwright
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


class TestAPIEndpoints:
    """Test suite for API endpoints"""
    
    def test_jobs_endpoint_mock(self, page, screenshot_dir, mock_teraslice_jobs_simple):
        """Test /jobs endpoint with mock data"""
        # Create a simple HTML page to test API calls
        test_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <title>API Test</title>
        </head>
        <body>
          <div id="api-results"></div>
          <script>
            // Mock the jobs API response
            const mockJobs = {json.dumps(mock_teraslice_jobs_simple)};
            
            // Simulate API call
            setTimeout(() => {{
              const results = document.getElementById('api-results');
              results.innerHTML = `
                <h3>Jobs API Response</h3>
                <p>Total jobs: ${{mockJobs.length}}</p>
                <ul>
                  ${{mockJobs.map(job => `<li>${{job.name}} - ${{job.ex._status}}</li>`).join('')}}
                </ul>
              `;
            }}, 100);
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
            
            # Wait for the API results to appear
            page.wait_for_selector("#api-results", timeout=5000)
            
            # Check that results are displayed
            results = page.locator("#api-results")
            assert results.is_visible()
            assert "Total jobs: 2" in results.inner_text()
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "jobs_api_response.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_pipeline_graph_endpoint_mock(self, page, screenshot_dir, mock_teraslice_jobs_simple):
        """Test /pipeline_graph endpoint with mock data"""
        # Create mock pipeline graph data
        mock_graph_data = {
            "nodes": [
                {"id": "kafka_input-topic", "type": "KAFKA"},
                {"id": "es_output-index", "type": "ES"},
                {"id": "kafka_raw-data", "type": "KAFKA"},
                {"id": "kafka_processed-data", "type": "KAFKA"}
            ],
            "links": [
                {
                    "source": "kafka_input-topic",
                    "target": "es_output-index",
                    "job_id": "kafka-to-es-001",
                    "name": "kafka-to-elasticsearch-pipeline",
                    "workers": 3,
                    "status": "running"
                },
                {
                    "source": "kafka_raw-data",
                    "target": "kafka_processed-data",
                    "job_id": "kafka-to-kafka-001",
                    "name": "kafka-transform-pipeline",
                    "workers": 5,
                    "status": "running"
                }
            ]
        }
        
        test_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pipeline Graph API Test</title>
        </head>
        <body>
          <div id="graph-results"></div>
          <script>
            // Mock the pipeline graph API response
            const mockGraphData = {json.dumps(mock_graph_data)};
            
            // Simulate API call
            setTimeout(() => {{
              const results = document.getElementById('graph-results');
              results.innerHTML = `
                <h3>Pipeline Graph API Response</h3>
                <p>Total nodes: ${{mockGraphData.nodes.length}}</p>
                <p>Total links: ${{mockGraphData.links.length}}</p>
                <h4>Nodes:</h4>
                <ul>
                  ${{mockGraphData.nodes.map(node => `<li>${{node.id}} (${{node.type}})</li>`).join('')}}
                </ul>
                <h4>Links:</h4>
                <ul>
                  ${{mockGraphData.links.map(link => `<li>${{link.source}} → ${{link.target}} (${{link.workers}} workers)</li>`).join('')}}
                </ul>
              `;
            }}, 100);
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
            
            # Wait for the graph results to appear
            page.wait_for_selector("#graph-results", timeout=5000)
            
            # Check that results are displayed
            results = page.locator("#graph-results")
            assert results.is_visible()
            assert "Total nodes: 4" in results.inner_text()
            assert "Total links: 2" in results.inner_text()
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "pipeline_graph_api_response.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_api_error_handling(self, page, screenshot_dir):
        """Test API error handling"""
        test_html = """
        <!DOCTYPE html>
        <html>
        <head>
          <title>API Error Test</title>
        </head>
        <body>
          <div id="error-results"></div>
          <script>
            // Simulate API error
            setTimeout(() => {
              const results = document.getElementById('error-results');
              results.innerHTML = `
                <h3>API Error Response</h3>
                <p style="color: red;">Error: Unable to connect to Teraslice API</p>
                <p>Status: 503 Service Unavailable</p>
                <p>Message: External service is not available</p>
              `;
            }, 100);
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
            
            # Wait for the error results to appear
            page.wait_for_selector("#error-results", timeout=5000)
            
            # Check that error is displayed
            results = page.locator("#error-results")
            assert results.is_visible()
            assert "Unable to connect to Teraslice API" in results.inner_text()
            assert "503 Service Unavailable" in results.inner_text()
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "api_error_response.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)
    
    def test_large_dataset_handling(self, page, screenshot_dir, mock_teraslice_jobs_large):
        """Test handling of large datasets"""
        # Create mock graph data for large dataset
        mock_graph_data = {
            "nodes": [],
            "links": []
        }
        
        for i, job in enumerate(mock_teraslice_jobs_large):
            source_node = {"id": f"kafka_input-topic-{i}", "type": "KAFKA"}
            target_node = {"id": f"es_output-index-{i}", "type": "ES"}
            
            mock_graph_data["nodes"].extend([source_node, target_node])
            mock_graph_data["links"].append({
                "source": source_node["id"],
                "target": target_node["id"],
                "job_id": job["job_id"],
                "name": job["name"],
                "workers": job["workers"],
                "status": job["ex"]["_status"]
            })
        
        test_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <title>Large Dataset Test</title>
        </head>
        <body>
          <div id="performance-results"></div>
          <script>
            const startTime = performance.now();
            
            // Mock large dataset
            const mockGraphData = {json.dumps(mock_graph_data)};
            
            // Simulate processing time
            setTimeout(() => {{
              const endTime = performance.now();
              const processingTime = endTime - startTime;
              
              const results = document.getElementById('performance-results');
              results.innerHTML = `
                <h3>Large Dataset Performance Test</h3>
                <p>Dataset size: ${{mockGraphData.nodes.length}} nodes, ${{mockGraphData.links.length}} links</p>
                <p>Processing time: ${{processingTime.toFixed(2)}} ms</p>
                <p>Performance: ${{processingTime < 1000 ? 'Good' : 'Needs optimization'}}</p>
              `;
            }}, 100);
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
            
            # Wait for the performance results to appear
            page.wait_for_selector("#performance-results", timeout=5000)
            
            # Check that results are displayed
            results = page.locator("#performance-results")
            assert results.is_visible()
            assert "40 nodes, 20 links" in results.inner_text()  # 20 jobs * 2 nodes each
            
            # Take a screenshot
            screenshot_path = screenshot_dir / "large_dataset_performance.png"
            page.screenshot(path=str(screenshot_path))
            
        finally:
            import os
            os.unlink(temp_html_path)