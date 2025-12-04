# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
# Ensure OpenSSL is available for Prisma during `npm install` (postinstall)
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
# Ensure OpenSSL is available when running `npx prisma generate`
RUN apk add --no-cache openssl
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma schema exists now, so generate works
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Needed for Prisma on alpine (openssl)
RUN apk add --no-cache openssl

# Next standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy Prisma schema and migrations for runtime access
COPY prisma ./prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
RUN chmod +x /app/node_modules/.bin/prisma || true
COPY --from=deps /app/node_modules/.bin ./node_modules/.bin
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
RUN chmod -R +x /app/node_modules/.bin || true

# Entrypoint script to run migrations before starting app (with logging)
RUN cat > /app/entrypoint.sh <<'SH'
#!/bin/sh
set -e

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$1] $(timestamp) - $2"; }

mask_db_url() {
    if [ -z "${DATABASE_URL}" ]; then
        echo "<not-set>"
        return
    fi
    # Mask password if present: postgres://user:pass@host:port/db -> postgres://user:****@host:port/db
    echo "${DATABASE_URL}" | sed -E 's#(://[^:/]+:)[^@]+@#\1****@#; s#(://)[^@]+@#\1****@#'
}

log ENTRYPOINT "Starting entrypoint"
log ENTRYPOINT "NODE_ENV=${NODE_ENV:-<not-set>}"
log ENTRYPOINT "DATABASE_URL present=${DATABASE_URL:+yes}"
log ENTRYPOINT "DATABASE_URL (masked)=$(mask_db_url)"

log PRISMA "Running migrations (prisma migrate deploy)"
if npx prisma migrate deploy 2>&1 | sed -e 's/^/[PRISMA] /'; then
    log PRISMA "Migrations completed successfully"
else
    log PRISMA "Migrations failed — aborting startup"
    exit 1
fi

log SERVER "Starting Node server"
exec node server.js
SH

RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]