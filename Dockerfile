# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ---
# Compila o back-end (TypeScript -> JavaScript) e o front-end (Vite -> bundle).
FROM node:20-alpine AS build
WORKDIR /app

# As dependências são copiadas antes do código para aproveitar o cache de camadas.
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund

COPY web/package.json ./web/
RUN npm --prefix web install --no-audit --no-fund

COPY src ./src
COPY web ./web

RUN npm run build:server && npm --prefix web run build

# -------------------------------------------------------------- runtime ---
# Imagem final sem dependências de execução: só o Node e os artefatos gerados.
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=2000

COPY --from=build /app/dist/src ./dist/src
COPY --from=build /app/web/dist ./web/dist
COPY package.json ./

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 2000

HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1

CMD ["node", "dist/src/main.js"]
