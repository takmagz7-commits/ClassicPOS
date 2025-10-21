# Multi-stage Dockerfile for ClassicPOS

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build:frontend

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend code
COPY backend ./backend

# Copy frontend build from previous stage
COPY --from=frontend-build /app/dist ./dist

# Copy necessary configuration files
COPY vite.config.ts ./
COPY tsconfig*.json ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "run", "start:prod"]
