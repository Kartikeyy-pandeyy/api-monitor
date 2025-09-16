FROM nginx:alpine

# Copy static site
COPY frontend/index.html /usr/share/nginx/html/index.html

# status.json will appear under /usr/share/nginx/html/data via a mounted volume
# Nothing else to do; nginx will serve /index.html and /data/status.json
