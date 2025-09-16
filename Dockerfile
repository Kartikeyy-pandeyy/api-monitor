# Dockerfile (repo root)
FROM node:18-alpine

WORKDIR /app

# 1) Install deps with cache-friendly layers
#    - If you have checker/package*.json, use them
COPY checker/package*.json ./checker/
RUN set -eux; \
    if [ -f checker/package.json ]; then \
      cd checker && npm ci --only=production; \
    else \
      cd checker && npm init -y && npm install axios; \
    fi

# 2) Copy the checker source (includes apis.json that lives in checker/)
COPY checker/ ./checker

# 3) Runtime env
ENV OUTPUT_DIR=/app/frontend
#    Your endpoints file is checker/apis.json (plural)
ENV ENDPOINTS_FILE=/app/checker/apis.json

# 4) Default command: run the checker
CMD ["node", "checker/checker.js"]
