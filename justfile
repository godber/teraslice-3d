# Lifecycle commands for teraslice-3d. Run `just` to list them.

set shell := ["bash", "-euo", "pipefail", "-c"]

compose := "docker compose"

# List available recipes
default:
    @just --list

# --- Docker Compose dev environment -----------------------------------------

# Create .env from .env.example if it doesn't exist yet
env:
    @if [ -f .env ]; then echo ".env already exists"; else cp .env.example .env && echo "Created .env, edit TERASLICE_URL etc."; fi

# Start backend + frontend in the background (http://localhost:5173)
up: env
    {{ compose }} up -d
    @echo "Frontend: http://localhost:5173  Backend: http://localhost:8000"

# Start in the foreground with logs attached
up-fg: env
    {{ compose }} up

# Stop and remove the containers (keeps volumes)
down:
    {{ compose }} down

# Restart one service, or all if none given (e.g. `just restart backend`)
restart *service:
    {{ compose }} restart {{ service }}

# Show container status
ps:
    {{ compose }} ps

# Follow logs, optionally for one service (e.g. `just logs backend`)
logs *service:
    {{ compose }} logs -f {{ service }}

# Open a shell in a running service (e.g. `just sh backend`)
sh service:
    {{ compose }} exec {{ service }} sh

# Stop everything and delete volumes (venv and node_modules caches)
clean:
    {{ compose }} down -v

# --- Tests and builds (what CLAUDE.md requires before committing) -----------

# Run all tests (backend and frontend)
test: test-backend test-frontend

# Run backend tests
test-backend:
    cd backend && uv run pytest

# Run frontend tests
test-frontend:
    cd frontend && pnpm install && pnpm test

# Typecheck and production-build the frontend
build-frontend:
    cd frontend && pnpm install && pnpm run build

# Run all tests and the frontend build
check: test build-frontend

# --- Builds ------------------------------------------------------------------

# Build everything: the frontend and the production Docker image
build: build-frontend build-image

# Build the production Docker image
build-image tag="teraslice-3d":
    docker build -t {{ tag }} .
