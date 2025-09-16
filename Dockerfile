FROM node:18-alpine

WORKDIR /app

# Copy app code
COPY checker/ ./checker
# Copy endpoints list into the image
COPY apis.json ./checker/apis.json

# Install deps (works whether you have a package.json or not)
RUN set -eux; \
    if [ -f checker/package.json ]; then \
      cd checker && npm ci; \
    else \
      cd checker && npm init -y && npm install axios; \
    fi

# Make output dir configurable; Jenkins will bind-mount here
ENV OUTPUT_DIR=/app/frontend
# Let checker know where the endpoints file lives (optional but robust)
ENV ENDPOINTS_FILE=/app/checker/apis.json

# Default command runs the checker
CMD ["node", "checker/checker.js"]
