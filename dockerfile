# Stage 1: Build dependencies
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || echo "No build script, skipping build"

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "app.js"]
