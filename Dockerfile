FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_PUBLIC_API_URL=/api

WORKDIR /app

# npm ci runs the repository postinstall, which builds these workspace packages.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma
COPY apps/web/package.json apps/web/package.json
COPY packages/document-schema packages/document-schema
COPY packages/plugins packages/plugins
COPY packages/shared-types packages/shared-types

RUN npm ci --include=dev

COPY . .

RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
    && npm run build

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor curl fonts-noto-core \
    && npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system vdb \
    && useradd --system --gid vdb --home-dir /home/vdb --create-home --shell /usr/sbin/nologin vdb \
    && mkdir -p /var/lib/vdb/object-storage /run /var/cache/nginx /var/lib/nginx /var/log/supervisor \
    && chown -R vdb:vdb /var/lib/vdb /var/cache/nginx /var/lib/nginx /var/log/nginx /var/log/supervisor /app/apps/api/dist /app/apps/web/.next \
    && chmod -R a+rX /ms-playwright

ENV HOME=/home/vdb

COPY deploy/runflare/nginx.conf /etc/nginx/nginx.conf
COPY deploy/runflare/supervisord.conf /etc/supervisor/supervisord.conf
COPY deploy/runflare/entrypoint.sh /usr/local/bin/vdb-entrypoint
COPY scripts/deploy/runflare-healthcheck.mjs /app/scripts/deploy/runflare-healthcheck.mjs

RUN chmod 0755 /usr/local/bin/vdb-entrypoint

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD ["node", "/app/scripts/deploy/runflare-healthcheck.mjs"]

ENTRYPOINT ["/usr/local/bin/vdb-entrypoint"]
