### Multi-stage Dockerfile optimized for small runtime image

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm prune --production

FROM node:18-alpine AS dev-base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["node", "index.js"]
