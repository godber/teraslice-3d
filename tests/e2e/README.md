# End-to-End Tests with Playwright

This directory contains end-to-end tests for the Teraslice 3D visualization application using Playwright.

## Setup

1. **Install Dependencies**
   ```bash
   uv sync --group e2e
   ```

2. **Install Playwright Browsers**
   ```bash
   uv run playwright install chromium
   ```

3. **Make Test Script Executable**
   ```bash
   chmod +x scripts/run-e2e-tests.sh
   ```

## Running Tests

### Quick Start
```bash
./scripts/run-e2e-tests.sh
```

### Manual Test Execution
```bash
# Run all e2e tests
uv run pytest tests/e2e/ -v

# Run specific test file
uv run pytest tests/e2e/test_graph_ui.py -v

# Run specific test
uv run pytest tests/e2e/test_graph_ui.py::TestGraphUI::test_homepage_loads -v
```

## Test Structure

```
tests/e2e/
├── conftest.py              # Pytest fixtures and configuration
├── playwright.config.py     # Playwright configuration
├── test_graph_ui.py         # UI component tests
├── test_api_endpoints.py    # API endpoint tests
├── screenshots/             # Test screenshots (auto-generated)
└── README.md               # This file
```

## Test Coverage

### UI Tests (`test_graph_ui.py`)
- **Homepage Loading**: Verifies main page loads and displays 3D graph container
- **Graph Rendering**: Tests graph rendering with mock job data
- **Responsive Design**: Tests UI at different viewport sizes (desktop, laptop, tablet)
- **Error Handling**: Tests behavior when API calls fail
- **Color Coding**: Verifies node color coding (yellow for incoming Kafka, blue for Kafka, green for ES)

### API Tests (`test_api_endpoints.py`)
- **Jobs Endpoint**: Tests `/jobs` endpoint with mock data
- **Pipeline Graph Endpoint**: Tests `/pipeline_graph` endpoint transformation
- **Error Handling**: Tests API error scenarios
- **Large Dataset**: Tests performance with large datasets (20+ jobs)

## Screenshots

All tests automatically capture screenshots saved to `tests/e2e/screenshots/`:

- `homepage_loaded.png` - Main page after loading
- `graph_with_mock_data.png` - Graph rendering with test data
- `responsive_desktop.png` - Desktop viewport (1920x1080)
- `responsive_laptop.png` - Laptop viewport (1280x720)
- `responsive_tablet.png` - Tablet viewport (768x1024)
- `graph_error_state.png` - Error handling display
- `graph_color_coding.png` - Node color coding verification
- `jobs_api_response.png` - Jobs API response display
- `pipeline_graph_api_response.png` - Pipeline graph API response
- `api_error_response.png` - API error handling
- `large_dataset_performance.png` - Large dataset performance test

## Mock Data

Tests use the existing fixture data from `tests/fixtures/teraslice_jobs.py`:

- Simple jobs (kafka → elasticsearch, kafka → kafka)
- Complex routing jobs (routed_sender with multiple destinations)
- Edge cases (empty operations, unknown sources/destinations)
- Large datasets (20+ jobs for performance testing)

## Configuration

### Playwright Settings
- **Browser**: Chromium (headless)
- **Viewport**: 1280x720 (configurable)
- **Timeout**: 30 seconds
- **Screenshots**: On failure + manual captures

### Test Environment
- **Mock Mode**: Tests use mock data to avoid external dependencies
- **Isolated**: Each test runs in a fresh browser context
- **Fast**: No real server startup required

## Extending Tests

### Adding New Tests
1. Create test methods in existing test classes
2. Use the provided fixtures for mock data
3. Add screenshot captures for visual verification
4. Update this README with new test descriptions

### Custom Mock Data
```python
@pytest.fixture
def custom_mock_jobs():
    return [
        {
            "job_id": "custom-001",
            "name": "custom-pipeline",
            "workers": 5,
            "ex": {"_status": "running"},
            "operations": [
                {"_op": "kafka_reader", "topic": "input"},
                {"_op": "elasticsearch_bulk", "index": "output"}
            ]
        }
    ]
```

### Cross-Browser Testing
To enable Firefox and WebKit testing, modify `playwright.config.py`:
```python
BROWSERS = ["chromium", "firefox", "webkit"]
```

## CI/CD Integration

Tests are designed to run in CI environments:

```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: |
    uv sync --group e2e
    uv run playwright install chromium
    uv run pytest tests/e2e/ -v
    
- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-screenshots
    path: tests/e2e/screenshots/
```

## Troubleshooting

### Common Issues

1. **Browser Not Found**
   ```bash
   # Solution: Install browsers
   uv run playwright install
   ```

2. **Screenshot Directory Missing**
   ```bash
   # Solution: Create directory
   mkdir -p tests/e2e/screenshots
   ```

3. **Test Timeouts**
   - Increase timeout in `playwright.config.py`
   - Check for JavaScript errors in browser console

4. **Mock Data Issues**
   - Verify fixture data in `tests/fixtures/teraslice_jobs.py`
   - Check JSON serialization in test files

### Debug Mode
```bash
# Run with debug output
uv run pytest tests/e2e/ -v -s --tb=long

# Run single test with detailed output
uv run pytest tests/e2e/test_graph_ui.py::TestGraphUI::test_homepage_loads -v -s
```