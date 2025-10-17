# Stage 1: Frontend build stage using Node.js base image
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python build stage
FROM python:3.13-slim AS python-builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install build dependencies for compiling Python packages with C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Python application files
COPY backend/pyproject.toml backend/uv.lock ./backend/
COPY backend/app/ ./backend/app/

# Install Python dependencies
WORKDIR /backend
RUN uv sync --frozen --no-cache --no-dev

# Stage 3: Python runtime stage (lean final image)
FROM python:3.13-slim AS runtime

# Copy uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the built virtual environment from python-builder
COPY --from=python-builder /backend/.venv /backend/.venv
COPY --from=python-builder /backend/app /backend/app

# Copy built frontend assets from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

WORKDIR /backend

# Run the application
CMD ["./.venv/bin/python", "-m", "fastapi", "run", "app/main.py", "--port", "80", "--host", "0.0.0.0"]
