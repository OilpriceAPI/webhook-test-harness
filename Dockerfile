FROM node:20-alpine

WORKDIR /app

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy source
COPY server/ ./server/
COPY cli/ ./cli/
COPY dashboard/ ./dashboard/

# Expose port
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/health || exit 1

CMD ["npm", "start"]
