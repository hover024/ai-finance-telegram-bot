FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python packages
RUN pip install --no-cache-dir \
    faster-whisper==1.0.3 \
    flask==3.0.0 \
    requests==2.31.0

# Pre-download Whisper model to include it in the image
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"

# Copy server script
COPY server.py .

EXPOSE 8080

CMD ["python", "server.py"]
