# =========================================================================
# Multi-stage Dockerfile for Vocario Spring Boot 3 Core Backend (Java 17)
# =========================================================================

# Stage 1: Build Application with Maven & Eclipse Temurin 17
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /build

# Cache Maven dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build executable jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Production JRE Runtime (Lightweight Alpine ~180MB)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user for security best practice
RUN addgroup -S vocario && adduser -S vocario -G vocario

# Copy built artifact from builder stage
COPY --from=builder /build/target/*.jar app.jar

# Setup directories for file uploads and persistent logs
RUN mkdir -p /app/uploads /app/logs && chown -R vocario:vocario /app

USER vocario

EXPOSE 8088

# JVM Memory and Container Optimization Flags
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
