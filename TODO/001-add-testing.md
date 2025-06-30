# Testing Strategy for Teraslice 3D Backend

## Test Structure & Framework

- **pytest** as the main testing framework (standard for FastAPI)
- **httpx** for async HTTP client testing (already a dependency)
- **pytest-asyncio** for async test support
- **respx** or similar for HTTP mocking

## Test Categories

### Unit Tests

**JobInfo Class (`app/lib/ts.py`):**
- Test `process_source_node()` with different operation types (`kafka_reader`, unknown ops)
- Test `process_destination_nodes()` for each operation type:
  - `kafka_sender` → single destination
  - `elasticsearch_bulk` → single destination  
  - `routed_sender` → multiple destinations with routing logic
  - `count_by_field` → edge case handling
  - Unknown operations → warning logging
- Test StorageNode hashing and deduplication
- Use mock job data fixtures (no external dependencies)

### Integration Tests  

**FastAPI Endpoints:**
- **GET `/`** → Returns HTML template
- **GET `/jobs`** → Proxies Teraslice API with query parameters
- **GET `/pipeline_graph`** → Transforms job data into graph format

## Mocking Strategy

### HTTP Mocking for External Dependencies

```python
# Mock Teraslice API responses
@pytest.fixture
def mock_teraslice_jobs():
    return [
        {
            "job_id": "test-job-1",
            "name": "kafka-to-es-pipeline",
            "workers": 5,
            "ex": {"_status": "running"},
            "operations": [
                {"_op": "kafka_reader", "connection": "kafka_cluster1", "topic": "input-topic"},
                {"_op": "elasticsearch_bulk", "connection": "es_cluster1", "index": "output-index"}
            ],
            "apis": []
        }
    ]

# Use respx to mock HTTP calls
@respx.mock
async def test_pipeline_graph_endpoint(mock_teraslice_jobs):
    respx.get("http://localhost:5678/jobs").mock(return_value=httpx.Response(200, json=mock_teraslice_jobs))
    # Test endpoint logic
```

### Configuration Mocking

- Override `TERASLICE_URL` for tests using dependency injection or environment variables
- Mock different scenarios (connection failures, API errors, empty responses)

## Test Data Fixtures

**Create realistic Teraslice job fixtures covering:**
- Simple kafka → elasticsearch jobs
- Complex routed_sender jobs with multiple destinations
- Jobs with missing/invalid operations
- Edge cases (empty operations, malformed data)

## Test Organization
```
tests/
├── conftest.py              # Shared fixtures and configuration
├── unit/
│   ├── test_job_info.py     # JobInfo class tests
│   └── test_storage_node.py # StorageNode tests
├── integration/
│   ├── test_endpoints.py    # FastAPI endpoint tests
│   └── test_graph_logic.py  # End-to-end graph generation
└── fixtures/
    └── teraslice_jobs.py    # Mock job data
```

## Key Test Scenarios

### Error Handling
- Teraslice API unavailable/timeout
- Invalid job data structures
- Missing required fields in operations
- Network failures during job fetching

### Data Transformation
- Verify correct node/link generation from job data
- Test node deduplication logic
- Validate graph structure with complex routing scenarios
- Ensure proper URL generation for job links

### Configuration
- Test different `TERASLICE_URL` values
- Verify parameter passing to Teraslice API
- Test logging level configurations

## Implementation Benefits

- **No external dependencies** → Fast, reliable tests
- **Comprehensive coverage** → Catch regressions in job parsing logic
- **Mock realistic scenarios** → Test edge cases without needing live Teraslice
- **CI/CD ready** → Tests can run anywhere without infrastructure requirements

This strategy isolates the complex job parsing and graph generation logic while still testing the FastAPI integration points through mocked external calls.