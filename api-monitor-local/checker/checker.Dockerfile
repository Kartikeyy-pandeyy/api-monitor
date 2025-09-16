FROM node:18-alpine

WORKDIR /app
COPY checker/package.json checker/package-lock.json* ./checker/
RUN cd checker && npm ci --omit=dev

COPY checker/ ./checker
ENV ENDPOINTS_FILE=/app/checker/apis.json
ENV OUTPUT_FILE=/data/status.json

CMD ["npm", "--prefix", "checker", "run", "start"]
