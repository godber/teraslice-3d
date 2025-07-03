# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions for Claude Code

* Always work on a branch and submit a PR.

## Project Overview

This is a FastAPI-based web application that visualizes Teraslice job pipelines in 3D. The app creates interactive network graphs showing data flow between jobs, from Kafka topics through processing jobs to final destinations like Elasticsearch.

## Development Commands

### Running the Development Server

```bash
# Basic development server
TERASLICE_URL="http://localhost:5678" uv run fastapi dev

# With debug logging
LOG_LEVEL="DEBUG" TERASLICE_URL="http://teraslice.example.com" uv run fastapi dev
```

### Docker Development

```bash
# Build image
docker build -t teraslice-3d .

# Run container
docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 teraslice-3d
```

### Package Management

Uses `uv` for Python package management. Dependencies are defined in `pyproject.toml`.

## Architecture

### Core Components

- **FastAPI Application** (`app/main.py`): Main web server with REST endpoints
- **JobInfo Class** (`app/lib/ts.py`): Parses Teraslice job configurations to extract data flow information
- **StorageNode Class** (`app/lib/ts.py`): Represents data storage endpoints (Kafka topics, Elasticsearch indices)

### Frontend Architecture

- **HTML Template** (`templates/graph.html`): Single-page interface that renders the 3D visualization
- **3D Force Graph Library** (`static/3d-force-graph.js`): Third-party JavaScript library (v1.77.0) for creating interactive 3D network graphs
- **Static File Serving**: FastAPI serves static assets from `/static` directory and templates from `/templates`

The frontend fetches graph data from `/pipeline_graph` endpoint and uses the ForceGraph3D library to render:

- **Node colors**: Yellow for "incoming" Kafka topics, blue for other Kafka topics, green for Elasticsearch
- **Link properties**: Width scaled by worker count (1-200 workers → 1-20px), color by job status
- **Interactivity**: Click links to open Teraslice job pages in new tabs

### Key Endpoints

- `/` - Serves the 3D visualization interface
- `/jobs` - Proxies Teraslice job data with filtering
- `/pipeline_graph` - Transforms job data into graph format (nodes/links) for visualization

### Data Flow Processing

The application analyzes Teraslice job operations to identify:

- **Source nodes**: First operation (typically `kafka_reader`)
- **Destination nodes**: Last operation (`kafka_sender`, `elasticsearch_bulk`, or `routed_sender`)
- **Node types**: KAFKA or ES (Elasticsearch)

Special handling for `routed_sender` operations that can write to multiple destinations based on routing configuration.

### Configuration

Environment variables:

- `TERASLICE_URL`: Base URL for Teraslice API (required)
- `LOG_LEVEL`: Logging level (default: INFO)

### Known Limitations

- Assumes Kafka connectors are named beginning with "kafka"
- Special handling for connectors/topics containing "incoming"
- Hard-coded job size limit of 500 for API calls
- SSL verification disabled for Teraslice API calls
