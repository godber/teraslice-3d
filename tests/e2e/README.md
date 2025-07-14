# End-to-End Tests for Teraslice 3D

This directory contains **simplified** end-to-end tests for the Teraslice 3D visualization application using Playwright.

## Overview

These tests verify that the 3D graph visualization **loads without error** and captures screenshots for visual verification.

## Test Structure

### Test Files

- `test_graph_ui.py`: Simplified tests for the 3D graph user interface
- `conftest.py`: Shared test fixtures and configuration
- `playwright.config.py`: Playwright browser configuration  
- `pytest.ini`: Pytest configuration for e2e tests

### What the Tests Do

1. **Start the actual FastAPI server** on a free port
2. **Mock only the external HTTP call** to the Teraslice API
3. **Load the real page** from the FastAPI server
4. **Verify the page loads** without JavaScript errors
5. **Take screenshots** for visual verification
6. **Test both with data and empty data** scenarios

## Running the Tests

### Quick Start

```bash
# From the project root directory
./scripts/run-e2e-tests.sh
```

### Manual Setup

```bash
# Install dependencies
uv sync --group e2e

# Install Playwright browsers
uv run playwright install chromium

# Create screenshots directory
mkdir -p tests/e2e/screenshots

# Run the tests
uv run pytest tests/e2e/ -v
```

## Test Environment

### Dependencies

- Python 3.13+
- Playwright
- pytest-playwright
- Mock data fixtures

### Mock Data

Tests use mock Teraslice job data defined in `tests/fixtures/teraslice_jobs.py`:
- `kafka_reader_to_elasticsearch_job()`: Basic Kafka to Elasticsearch job
- `kafka_reader_to_kafka_sender_job()`: Kafka transformation job

## Screenshots

Screenshots are saved to `tests/e2e/screenshots/`:
- `page_loaded.png`: Main page with mock data
- `empty_data.png`: Page with no jobs

## Key Improvements

This simplified approach:
- **Tests the actual FastAPI application** instead of mock HTML
- **Removes 380+ lines** of complex test code
- **Only mocks external dependencies** (Teraslice API calls)
- **Provides real screenshots** of the actual application
- **Detects JavaScript errors** during page load
- **Is much faster and more reliable**

## Troubleshooting

### Common Issues

1. **Browser Installation**: 
   ```bash
   uv run playwright install chromium
   ```

2. **Port Conflicts**: The test uses dynamic port allocation to avoid conflicts

3. **Screenshot Permissions**: Ensure `tests/e2e/screenshots/` directory is writable

### Debug Mode

```bash
# Run with visible browser
uv run pytest tests/e2e/ --headed

# Run with verbose output
uv run pytest tests/e2e/ -v -s
```