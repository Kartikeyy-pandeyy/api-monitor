FROM node:18-alpine
WORKDIR /app

# only express; Node 18 already has global fetch
RUN npm init -y && npm install express

COPY frontend/server.js ./server.js
COPY frontend/index.html ./public/index.html

ENV PORT=80
EXPOSE 80
CMD ["node", "server.js"]
