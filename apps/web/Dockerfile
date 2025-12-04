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

EXPOSE 3000
CMD ["node", "server.js"]