# Stage 1: Frontend build stage using Node.js base image
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime stage
FROM python:3.12-slim AS runtime

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy Python application files
COPY backend/pyproject.toml backend/uv.lock ./backend/
COPY backend/app/ ./backend/app/

# Install Python dependencies
WORKDIR /backend
RUN uv sync --frozen --no-cache --no-dev

# Copy built frontend assets from build stage
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

# Run the application
# ./.venv/bin/fastapi run app/main.py --port 80 --host 0.0.0.0
CMD ["./.venv/bin/fastapi", "run", "app/main.py", "--port", "80", "--host", "0.0.0.0"]
