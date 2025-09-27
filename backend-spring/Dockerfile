# =============================================
# DOCKERFILE CHO BACKEND SPRING BOOT
# Hệ thống Quản lý Thư viện
# =============================================

# Multi-stage build
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build

# Thiết lập thông tin maintainer
LABEL maintainer="Library System Team"
LABEL description="Library Management System - Spring Boot Backend API"

# Tạo thư mục làm việc
WORKDIR /app

# Copy pom.xml trước để tận dụng Docker cache
COPY pom.xml .

# Download dependencies (tách riêng để cache hiệu quả)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build ứng dụng
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Cài đặt các package cần thiết
RUN apk add --no-cache \
    dumb-init \
    curl

# Tạo user không phải root
RUN addgroup -S spring && adduser -S spring -G spring

# Tạo thư mục làm việc
WORKDIR /app

# Copy JAR file từ build stage
COPY --from=build /app/target/library-api-spring-*.jar app.jar

# Tạo thư mục logs
RUN mkdir -p logs && chown -R spring:spring /app

# Chuyển sang user spring
USER spring

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/api/actuator/health || exit 1

# Sử dụng dumb-init để handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["java", "-jar", "app.jar"]
