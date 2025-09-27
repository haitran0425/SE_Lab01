# =============================================
# DOCKERFILE CHO BACKEND NODE.JS
# Hệ thống Quản lý Thư viện
# =============================================

# Sử dụng Node.js 18 LTS Alpine
FROM node:18-alpine

# Thiết lập thông tin maintainer
LABEL maintainer="Library System Team"
LABEL description="Library Management System - Node.js Backend API"

# Tạo thư mục làm việc
WORKDIR /app

# Cài đặt các package cần thiết cho Alpine
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Tạo thư mục uploads và logs
RUN mkdir -p uploads logs

# Tạo user không phải root để chạy ứng dụng
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Thay đổi ownership của thư mục app
RUN chown -R nodejs:nodejs /app

# Chuyển sang user nodejs
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Sử dụng dumb-init để handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
