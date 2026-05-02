# ===== Stage 1: build =====
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ===== Stage 2: runtime =====
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --create-home --shell /bin/false spring \
 && mkdir -p /app/uploads/profiles /app/uploads/assignments /app/uploads/materials \
 && chown -R spring:spring /app

USER spring

COPY --from=build --chown=spring:spring /app/build/libs/*.jar app.jar

ENV JAVA_OPTS=""
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
