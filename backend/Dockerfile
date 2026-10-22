FROM python:3.11-slim

# Install system dependencies including full FFmpeg and FFprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Configure persistent directory paths
ENV MEDIA_DIR=/app/media
ENV DATABASE_URL=sqlite:////app/data/rankstudio.db

# Prepare persistent folders
RUN mkdir -p /app/media/uploads /app/media/thumbnails /app/media/renders /app/media/temp /app/data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
