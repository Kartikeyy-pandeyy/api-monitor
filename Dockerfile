# Base image
FROM node:18-alpine3.19


# Create working directory
WORKDIR /app

# Copy checker files
COPY checker/ ./checker

# Install dependencies (Axios only)
WORKDIR /app/checker
RUN npm init -y && npm install axios

# Set default command
CMD ["node", "checker.js"]
