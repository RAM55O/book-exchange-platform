# ------------------------------------------------------------------------------
# Stage 1: Build & compile dependencies
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install native compilation dependencies required by sqlite3 / node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (including devDependencies if needed for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Prune devDependencies to keep the bundle minimal
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Production runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime libraries needed by native bindings (like sqlite3)
RUN apk add --no-cache libstdc++

# Copy built application and pre-compiled node_modules from builder
COPY --from=builder /usr/src/app ./

# Create data directory for SQLite fallback if used and grant permissions
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app

# Run as non-root user for container security
USER node

EXPOSE 3000

CMD ["node", "server.js"]