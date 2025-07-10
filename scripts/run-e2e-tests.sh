#!/bin/bash
# Script to run end-to-end tests with Playwright

set -e

echo "Setting up e2e test environment..."

# Install dependencies
echo "Installing dependencies..."
uv sync --group e2e

# Install Playwright browsers
echo "Installing Playwright browsers..."
uv run playwright install chromium

# Create screenshots directory
mkdir -p tests/e2e/screenshots

# Run the e2e tests
echo "Running e2e tests..."
uv run pytest tests/e2e/ -v --tb=short

echo "E2E tests completed. Check tests/e2e/screenshots/ for test screenshots."