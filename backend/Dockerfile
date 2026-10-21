# =========================================================================
# Dockerfile for Vocario AI Vision & NLP Microservice (FastAPI + YOLO-World)
# =========================================================================

FROM python:3.11-slim-bookworm

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install system libraries required by OpenCV (cv2) and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code into /app/backend to preserve package imports
COPY . /app/backend

# Create directory for YOLO models and cache
RUN mkdir -p /app/backend/services/cache

EXPOSE 8001

CMD ["uvicorn", "backend.services.ai_vision_server:app", "--host", "0.0.0.0", "--port", "8001"]
