# Use official Python 3.12 slim image
FROM python:3.12-slim

# Set the working directory to the root of the project inside the container
WORKDIR /app

# Install system dependencies (required for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the entire backend, ai-engine, and shared modules
# (We copy them individually to keep the container clean)
COPY backend/ ./backend/
COPY ai-engine/ ./ai-engine/
COPY shared/ ./shared/

# Expose the port the FastAPI server runs on
EXPOSE 8000

# Command to run the application (running from /app root so imports work!)
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
