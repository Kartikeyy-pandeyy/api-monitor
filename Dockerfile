# Use Node base
FROM node:18-alpine

# App dir
WORKDIR /app

# Copy your checker sources (adjust if your repo layout differs)
COPY checker/ ./checker

# If you already have a package.json in repo, use npm ci; otherwise create minimal deps
# This path handles both cases gracefully
RUN if [ -f checker/package.json ]; then \
      cd checker && npm ci; \
    else \
      cd checker && npm init -y && npm install axios; \
    fi

# Default output directory inside the container
ENV OUTPUT_DIR=/app/frontend

# Run the checker; the Jenkins pipeline will mount /app/frontend from the workspace
CMD ["node", "checker/checker.js"]
