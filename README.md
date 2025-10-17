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

## Getting Started

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

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/godber/teraslice-3d.git
cd teraslice-3d

# Install backend dependencies
cd backend && uv sync && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Development

### Backend Development

```bash
cd backend
TERASLICE_URL="http://teraslice.example.com" uv run python -m fastapi dev
TERASLICE_URL="http://teraslice.example.com" CACERT_FILE="$HOME/ca-bundle.pem" uv run python -m fastapi dev
LOG_LEVEL="DEBUG" TERASLICE_URL="http://teraslice.example.com" uv run python -m fastapi dev
```

### Frontend Development

The frontend has been restructured into a modern Vite-based project with modular JavaScript components:

```bash
# Install frontend dependencies
cd frontend && npm install

# Development server with Hot Module Replacement (runs on http://localhost:5173)
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview
```

**Note:** During development, the frontend development server proxies API requests to the backend, so you need to run both the backend (`uv run fastapi dev`) and frontend (`npm run dev`) servers simultaneously.

### Architecture

- **Frontend**: ThreeJS with Vite-based build system with ES modules
- **Backend**: FastAPI serving API endpoints under `/api/` prefix
- **Static Assets**: Frontend build artifacts served from `/frontend/dist/`

#### Key API Endpoints

- `/` - Serves the 3D visualization interface
- `/api/jobs` - Proxies Teraslice job data with filtering
- `/api/pipeline_graph` - Transforms job data into graph format for visualization

### Docker

Docker images are published here:

https://github.com/godber/teraslice-3d/pkgs/container/teraslice-3d

You can get the latest via this:

```bash
# use latest
docker pull ghcr.io/godber/teraslice-3d:latest
# or a release tag
docker pull ghcr.io/godber/teraslice-3d:v0.0.2
```

Building or using more options

```bash
# Build image
docker build -t teraslice-3d .

# or Pull Image
docker pull ghcr.io/godber/teraslice-3d:latest

docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 teraslice-3d

# Run image published on ghcr.io
docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 ghcr.io/godber/teraslice-3d:latest
docker run \
    -e TERASLICE_URL="https://teraslice.example.com" \
    -e CACERT_FILE="/tmp/ca-bundle.pem" \
    -p 8000:80 \
    -v $HOME/ca-bundle.pem:/tmp/ca-bundle.pem \
    ghcr.io/godber/teraslice-3d:latest
```

### Testing

#### Backend Tests

Run the unit tests to validate job parsing logic:

```bash
# Install test dependencies and run tests
cd backend && uv add --group test pytest pytest-asyncio && uv run pytest && cd -

# Run with verbose output
cd backend && uv run pytest -v

# Run only unit tests
cd backend && uv run pytest tests/unit/ -v
```

#### Frontend Tests

Validate the frontend build process:

```bash
# Install dependencies and build
cd frontend && npm install && npm run build
```

The frontend build generates optimized production assets in `frontend/dist/` that are served by the FastAPI application.

## Release Process

This project uses GitHub Releases to trigger automated Docker image builds and publishes to GitHub Container Registry.

### Creating a Release

1. **Merge your changes** to the `main` branch via pull request

2. **Create a GitHub Release**:
   - Navigate to the repository on GitHub
   - Go to **Releases** → **Draft a new release**
   - Click **Choose a tag** and create a new tag (e.g., `v0.0.9`)
   - Set the release title (typically matches the tag, e.g., "v0.0.9")
   - Add release notes describing the changes
   - Click **Publish release**

3. **Automated workflow**:
   - The `publish-tag.yaml` workflow automatically triggers on release publication
   - Builds Docker images for both `linux/amd64` and `linux/arm64` platforms
   - Pushes images to `ghcr.io/godber/teraslice-3d` with:
     - Release tag (e.g., `v0.0.9`)
     - `latest` tag
   - Generates build provenance attestation

### Published Images

All releases are published to GitHub Container Registry:

- **Repository**: https://github.com/godber/teraslice-3d/pkgs/container/teraslice-3d
- **Pull by version**: `docker pull ghcr.io/godber/teraslice-3d:v0.0.9`
- **Pull latest**: `docker pull ghcr.io/godber/teraslice-3d:latest`

### Version Numbering

This project follows semantic versioning with the format `v0.0.x` during early development. Version numbers are managed through Git tags only - no manual version bumping in code is required.
