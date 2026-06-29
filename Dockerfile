FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV ENV_FILE=/data/.env
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY web ./web
COPY docs ./docs
COPY templates ./templates
COPY blueprints/examples ./blueprints/examples
COPY blueprints/generated/.gitkeep ./blueprints/generated/.gitkeep
COPY blueprints/templates/.gitkeep ./blueprints/templates/.gitkeep
COPY README.md LICENSE CONTRIBUTING.md .env.example ./
COPY docker-entrypoint.sh /usr/local/bin/promptguild-entrypoint

RUN mkdir -p /data /app/blueprints/generated /app/blueprints/templates \
  && chmod +x /usr/local/bin/promptguild-entrypoint \
  && chown -R node:node /app /data

USER node
EXPOSE 5194
VOLUME ["/data", "/app/blueprints/generated", "/app/blueprints/templates"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.WEB_PORT || '5194') + '/api/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["promptguild-entrypoint"]
CMD ["node", "dist/web/server.js"]
