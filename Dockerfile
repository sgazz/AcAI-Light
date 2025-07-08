# AcAIA - AI Assistant Application
# Multi-stage build za optimizaciju veličine

# ===========================================
# STAGE 1: Backend Build
# ===========================================
FROM python:3.11-slim as backend-builder

# Postavljanje radnog direktorijuma
WORKDIR /app

# Instalacija sistema dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-srp \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Kopiranje Python requirements
COPY backend/requirements.txt .

# Instalacija Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Kopiranje backend koda
COPY backend/ ./backend/

# ===========================================
# STAGE 2: Frontend Build
# ===========================================
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Kopiranje package files
COPY frontend/package*.json ./

# Instalacija dependencies
RUN npm ci --only=production

# Kopiranje frontend koda
COPY frontend/ ./

# Build aplikacije
RUN npm run build

# ===========================================
# STAGE 3: Production Image
# ===========================================
FROM python:3.11-slim

# Metadata
LABEL maintainer="AcAIA Team"
LABEL description="AcAIA - AI Assistant Application"
LABEL version="1.0.0"

# Postavljanje radnog direktorijuma
WORKDIR /app

# Instalacija sistema dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-srp \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Kopiranje Python dependencies iz builder stage
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Kopiranje backend koda
COPY backend/ ./backend/

# Kopiranje frontend build-a
COPY --from=frontend-builder /app/.next ./frontend/.next
COPY --from=frontend-builder /app/public ./frontend/public
COPY --from=frontend-builder /app/package.json ./frontend/package.json
COPY --from=frontend-builder /app/node_modules ./frontend/node_modules

# Kopiranje dodatnih fajlova
COPY uploads/ ./uploads/
COPY data/ ./data/

# Kreiranje potrebnih direktorijuma
RUN mkdir -p /app/logs /app/cache /app/temp

# Postavljanje environment varijabli
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Expose portove
EXPOSE 8001 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Default komanda
CMD ["/app/start.sh"] 