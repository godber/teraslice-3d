# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Instructions for Claude Code

* Always do your work on git a branch and submit a PR.
* When you are done editing files and before you commit changes you should:
  * Always run backend Python tests
    * `cd backend && uv add --group test pytest pytest-asyncio && uv run pytest && cd -`
  * Always do a test build of the frontend
    * `cd frontend && npm install && npm run build && cd -`
  * Fix any errors or failures you encounter.

## Project Overview

This is a FastAPI-based web application that visualizes Teraslice job pipelines
in 3D. The app creates interactive network graphs showing data flow between
jobs, from Kafka topics through processing jobs to final destinations like
Elasticsearch.

## Development Commands

### Running the Development Server

```bash
# Basic development server
cd backend && TERASLICE_URL="http://localhost:5678" uv run fastapi dev

# With debug logging
cd backend && LOG_LEVEL="DEBUG" TERASLICE_URL="http://teraslice.example.com" uv run fastapi dev

# With custom CA certificate
cd backend && TERASLICE_URL="https://teraslice.example.com" CACERT_FILE="/path/to/ca.pem" uv run fastapi dev
```

### Frontend Development

The frontend has been restructured into a modern Vite-based project:

```bash
# Install frontend dependencies
cd frontend && npm install

# Development server with HMR (runs on http://localhost:5173)
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview
```

During development, the frontend proxies to the backend so the backend must also
be running.

### Docker Development

```bash
# Build image
docker build -t teraslice-3d .

# Run container
docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 teraslice-3d
```

### Package Management

Uses `uv` for Python package management. Dependencies are defined in `backend/pyproject.toml`.

## Architecture

### Core Components

* **FastAPI Application** (`backend/app/main.py`): Main web server with REST endpoints
* **JobInfo Class** (`backend/app/lib/ts.py`): Parses Teraslice job configurations to
  extract data flow information
* **StorageNode Class** (`backend/app/lib/ts.py`): Represents data storage endpoints
  (Kafka topics, Elasticsearch indices)

### Frontend Architecture

* **HTML Template** (`templates/graph.html`): Single-page interface that renders
  the 3D visualization
* **3D Force Graph Library** (`static/3d-force-graph.js`): Third-party JavaScript
  library (v1.77.0) for creating interactive 3D network graphs
* **Static File Serving**: FastAPI serves static assets from `/static` directory
  and templates from `/templates`

The frontend fetches graph data from `/api/pipeline_graph` endpoint and uses the
ForceGraph3D library to render:

* **Node colors**: Yellow for "incoming" Kafka topics, blue for other Kafka
  topics, green for Elasticsearch
* **Link properties**: Width scaled by worker count (1-200 workers → 1-20px),
  color by job status
* **Interactivity**: Click links to open Teraslice job pages in new tabs

### Key Endpoints

* `/` - Serves the 3D visualization interface
* `/api/jobs` - Proxies Teraslice job data with filtering
* `/api/pipeline_graph` - Transforms job data into graph format (nodes/links) for
  visualization

### Data Flow Processing

The application analyzes Teraslice job operations to identify:

* **Source nodes**: First operation (typically `kafka_reader`)
* **Destination nodes**: Last operation (`kafka_sender`, `elasticsearch_bulk`, or `routed_sender`)
* **Node types**: KAFKA or ES (Elasticsearch)

Special handling for `routed_sender` operations that can write to multiple
destinations based on routing configuration.

### Configuration

Environment variables:

* `TERASLICE_URL`: Base URL for Teraslice API (required)
* `LOG_LEVEL`: Logging level (default: INFO)
* `CACERT_FILE`: Path to custom CA certificate file for SSL verification (optional)

### Known Limitations

* Assumes Kafka connectors are named beginning with "kafka"
* Special handling for connectors/topics containing "incoming"
* Hard-coded job size limit of 500 for Teraslice API calls
