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
COPY node_modules/@prisma ./node_modules/@prisma

# Entrypoint script to run migrations before starting app
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'npx prisma migrate deploy' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]