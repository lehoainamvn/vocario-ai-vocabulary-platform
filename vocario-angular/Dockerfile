# =========================================================================
# Multi-stage Dockerfile for Vocario Angular 19 Frontend with Nginx
# =========================================================================

# Stage 1: Build Angular Static Application
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with High-Performance Nginx Alpine
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Clean default Nginx website
RUN rm -rf ./*

# Copy built browser bundle from builder stage
COPY --from=builder /app/dist/vocario-angular/browser .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
