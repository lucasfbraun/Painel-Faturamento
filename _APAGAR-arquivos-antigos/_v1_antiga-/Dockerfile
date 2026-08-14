FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data
EXPOSE 2000

HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:2000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
