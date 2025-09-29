# =============================================
# DOCKERFILE CHO FRONTEND REACT
# Hệ thống Quản lý Thư viện
# =============================================

# Multi-stage build
FROM node:18-alpine AS build

# Thiết lập thông tin maintainer
LABEL maintainer="Library System Team"
LABEL description="Library Management System - React Frontend"

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Loại bỏ devDependencies sau khi build để giữ cho stage nhẹ hơn
RUN npm prune --production && npm cache clean --force

# Production stage
FROM nginx:alpine

# Cài đặt các package cần thiết
RUN apk add --no-cache dumb-init

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app từ build stage
COPY --from=build /app/build /usr/share/nginx/html

# Tạo thư mục logs
RUN mkdir -p /var/log/nginx

# Tạo user không phải root (nginx user đã tồn tại)
RUN adduser -S nginx -u 1001 2>/dev/null || true

# Set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Tạo file để nginx có thể write
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Chuyển sang user nginx
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Sử dụng dumb-init để handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
