"""
Pytest configuration and fixtures for end-to-end tests
"""
import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch
import sys
import os

# Add the app directory to the path so we can import our fixtures
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from tests.fixtures.teraslice_jobs import (
    kafka_reader_to_elasticsearch_job,
    kafka_reader_to_kafka_sender_job,
    routed_sender_kafka_job,
    routed_sender_elasticsearch_job,
    count_by_field_job,
    empty_operations_job,
)


@pytest.fixture(scope="session")
def screenshot_dir():
    """Create and return screenshot directory"""
    screenshot_path = Path(__file__).parent / "screenshots"
    screenshot_path.mkdir(exist_ok=True)
    return screenshot_path


@pytest.fixture
def mock_teraslice_jobs_simple():
    """Mock simple job data for basic tests"""
    return [
        kafka_reader_to_elasticsearch_job(),
        kafka_reader_to_kafka_sender_job(),
    ]


@pytest.fixture
def mock_teraslice_jobs_complex():
    """Mock complex job data for advanced tests"""
    return [
        kafka_reader_to_elasticsearch_job(),
        kafka_reader_to_kafka_sender_job(),
        routed_sender_kafka_job(),
        routed_sender_elasticsearch_job(),
    ]


@pytest.fixture
def mock_teraslice_jobs_empty():
    """Mock empty job data for edge case tests"""
    return [empty_operations_job()]


@pytest.fixture
def mock_teraslice_jobs_large():
    """Mock large dataset for performance tests"""
    jobs = []
    for i in range(20):
        job = kafka_reader_to_elasticsearch_job()
        job['job_id'] = f"job-{i:03d}"
        job['name'] = f"pipeline-{i:03d}"
        jobs.append(job)
    return jobs


@pytest.fixture
async def mock_fastapi_app():
    """Mock FastAPI app with test configuration"""
    from app.main import app
    
    # Mock the settings to avoid external dependencies
    with patch('app.main.settings') as mock_settings:
        mock_settings.teraslice_url = "http://test-teraslice.local"
        mock_settings.cacert_file = None
        yield app


@pytest.fixture
def mock_get_jobs():
    """Mock the get_jobs function to return test data"""
    return AsyncMock()