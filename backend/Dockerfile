# =========================================================================
# Dockerfile for Vocario AI Vision & NLP Microservice (FastAPI + YOLO-World)
# Optimized for low RAM footprint (< 512MB) on Cloud Platforms (Render)
# =========================================================================

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

WORKDIR /app

# Install system dependencies including git (required by CLIP) and OpenCV libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 1. Install lightweight CPU-only PyTorch (reduces RAM from ~800MB to ~250MB)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Pre-install Ultralytics and CLIP during build time so runtime NEVER triggers AutoUpdate
RUN pip install --no-cache-dir git+https://github.com/ultralytics/CLIP.git && \
    pip install --no-cache-dir ultralytics>=8.1.0

# 3. Install remaining application dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Pre-download YOLO-World base model into build layer (avoids startup download & timeout)
RUN python -c "from ultralytics import YOLOWorld; model = YOLOWorld('yolov8s-worldv2.pt')"

# 5. Copy backend source code into /app/backend
COPY . /app/backend

# Create directory for YOLO models and cache
RUN mkdir -p /app/backend/services/cache

EXPOSE 8001

CMD ["sh", "-c", "uvicorn backend.services.ai_vision_server:app --host 0.0.0.0 --port ${PORT:-8001}"]
