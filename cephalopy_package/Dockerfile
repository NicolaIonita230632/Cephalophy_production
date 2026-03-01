# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and other packages
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install a recent Poetry (matches what we use in GitHub Actions)
RUN pip install --no-cache-dir "poetry>=1.8.0"

# Copy poetry files
COPY pyproject.toml poetry.lock* README.md ./

# Configure poetry to not create a virtual environment (not needed in container)
RUN poetry config virtualenvs.create false

# --- IMPORTANT PART: handle torch separately ---

# 1) Remove torch/torchvision from Poetry-managed deps inside the image
#    (this only changes files inside the container layer)
RUN poetry remove torch torchvision --no-interaction || true

# 2) Install all other dependencies (including dev ones like uvicorn)
RUN poetry install --with dev --no-root --no-interaction --no-ansi

# 3) Install torch (and torchvision) via pip from the official CPU wheel index
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple

# ------------------------------------------------

# Copy application code (excluding frontend)
COPY src ./src
COPY README.md ./

# Set Python path to include src directory
ENV PYTHONPATH=/app/src

# Cloud Run injects PORT environment variable - use it instead of hardcoded 8000
ENV PORT=8080
EXPOSE 8080

# Run the application using PORT from environment
CMD uvicorn api.main:app --host 0.0.0.0 --port $PORT
