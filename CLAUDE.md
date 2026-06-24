# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Instructions for Claude Code

* Always do your work on a git branch, intended to become a PR.
* Do NOT run `git add`, `git commit`, or `git push` yourself. The user prefers
  to stage, commit, and push manually. When changes are ready, provide a
  suggested commit message and let the user handle all git operations.
* When you are done editing files and before changes are committed you should:
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

## Initial Setup

### Prerequisites

* Python 3.11 or higher
* Node.js 18 or higher
* uv package manager for Python

### Installing uv

If you don't have `uv` installed:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Setting Up the Project

```bash
# Install backend dependencies
cd backend && uv sync && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Development Commands

### Running the Development Server

```bash
# Basic development server
cd backend && TERASLICE_URL="http://localhost:5678" uv run python -m fastapi dev

# With debug logging
cd backend && LOG_LEVEL="DEBUG" TERASLICE_URL="http://teraslice.example.com" uv run python -m fastapi dev

# With custom CA certificate
cd backend && TERASLICE_URL="https://teraslice.example.com" CACERT_FILE="/path/to/ca.pem" uv run python -m fastapi dev
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

* **Vite-based Build System** (`frontend/`): Modern TypeScript project with ES modules
* **3D Force Graph Library**: Third-party JavaScript library for creating
  interactive 3D network graphs using ThreeJS
* **Modular Components**: TypeScript modules organized in `frontend/src/`
* **Static File Serving**: FastAPI serves production build from `/frontend/dist/`

The frontend fetches graph data from `/api/pipeline_graph` endpoint and renders:

* **Node colors**: Yellow for "incoming" Kafka topics, blue for other Kafka
  topics, green for Elasticsearch
* **Link properties**: Width scaled by worker count (1-200 workers → 1-20px),
  color by job status
* **Interactivity**: Click links to open Teraslice job pages in new tabs

During development, the frontend dev server (port 5173) proxies API requests to
the backend (port 8000), so both servers must run simultaneously.

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

This code targets **Teraslice v3** job configurations (see
[teraslice#4254](https://github.com/terascope/teraslice/issues/4254)). In v3,
operations that use an API declare it via `_api_name`, and the API-related
fields live on the matching entry in the job's `apis` array:

* The source/destination `topic` (Kafka) or `index` (Elasticsearch) is read
  from the API definition, not the operation.
* The connection is `_connection` on an API definition (vs `connection` on a
  bare operation that does not declare an API).
* When an operation declares `_api_name`, fields set directly on the operation
  are ignored, matching Teraslice v3 behavior. Operations without `_api_name`
  fall back to reading fields directly off the operation.
* `routed_sender` reads its `index`/`topic` prefix from the referenced API and
  its connection(s) from the operation's `routing` map values.

### Configuration

Environment variables:

* `TERASLICE_URL`: Base URL for Teraslice API (required)
* `LOG_LEVEL`: Logging level (default: INFO)
* `CACERT_FILE`: Path to custom CA certificate file for SSL verification (optional)

### Known Limitations

* Assumes Kafka connectors are named beginning with "kafka"
* Special handling for connectors/topics containing "incoming"
* Hard-coded job size limit of 500 for Teraslice API calls
