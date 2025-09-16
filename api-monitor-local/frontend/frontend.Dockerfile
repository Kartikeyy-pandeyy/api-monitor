FROM node:18-alpine
WORKDIR /app

# install minimal deps for server (express + node-fetch)
RUN npm init -y && npm install express node-fetch@3

# copy app files
COPY frontend/server.js ./server.js
COPY frontend/index.html ./public/index.html

# /app/public/data will be mounted via volume
ENV PORT=80
EXPOSE 80
CMD ["node", "server.js"]
