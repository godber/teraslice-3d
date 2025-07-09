# Visualize Teraslice Pipelines and Jobs in 3D

## Description

This web app allows you to visualize the relationships between your Teraslice
Jobs.  I think of these in terms of pipelines, where one job may write into a
Kafka topic that is in turn read by another downstream job and so on, until one
or more terminal jobs write the final data into an OpenSearch (or ElasticSearch)
cluster.

### Teraslice Configuration Assumptions

Currently the code here assumes that you name your Kafka connectors beginning
with `kafka` and that there are special connectors or topics that include the
string `incoming`.  These will be treated specially.  These are based on
internal naming conventions that not everyone may follow.

## Development

```bash
TERASLICE_URL="http://teraslice.example.com" uv run fastapi dev
TERASLICE_URL="http://teraslice.example.com" CACERT_FILE="$HOME/ca-bundle.pem" uv run fastapi dev
LOG_LEVEL="DEBUG" TERASLICE_URL="http://teraslice.example.com" uv run fastapi dev
```

### Docker

```bash
# Build image
docker build -t teraslice-3d .

# or Pull Image
docker pull ghcr.io/godber/teraslice-3d:latest

docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 teraslice-3d

# Run image published on ghcr.io
docker run -e TERASLICE_URL="http://teraslice.example.com" -e CACERT_FILE="$HOME/ca-bundle.pem" -p 8000:80 ghcr.io/godber/teraslice-3d:latest
```

### Testing

Run the unit tests to validate job parsing logic:

```bash
# Install test dependencies
uv add --group test pytest pytest-asyncio

# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run only unit tests
uv run pytest tests/unit/ -v
```
