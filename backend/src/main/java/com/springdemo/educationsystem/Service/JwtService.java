package com.springdemo.educationsystem.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Stateless JWT issuance and validation using JJWT 0.12.x.
 *
 * Token payload (claims):
 *   sub   — user id (как String)
 *   email — email пользователя
 *   role  — admin / teacher / student / parent
 *   iat   — issued-at (UTC)
 *   exp   — expiry
 *   iss   — "studix"
 *
 * Подписывается HMAC-SHA256 (HS256) общим секретом. В проде секрет читается из env
 * (см. application.properties → jwt.secret). Минимальная длина — 32 байта (256 бит).
 *
 * Stateless verification: сервер не хранит состояния, каждый запрос валидируется
 * через подпись + срок действия. Логаут реализуется клиентом (очистка localStorage).
 */
@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey signingKey;
    private final long expirationMs;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:43200000}") long expirationMs,
            @Value("${jwt.issuer:studix}") String issuer
    ) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "jwt.secret must be at least 32 bytes for HS256 (got " + bytes.length + ")"
            );
        }
        this.signingKey = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
        this.issuer = issuer;
    }

    /** Сгенерировать access-токен для пользователя. */
    public String generate(Long userId, String email, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(signingKey)
                .compact();
    }

    /** Распарсить и провалидировать токен. Бросает JwtException если он некорректен/просрочен. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Тихая валидация: возвращает true, только если подпись/exp/issuer корректны. */
    public boolean isValid(String token) {
        if (token == null || token.isBlank()) return false;
        try {
            parse(token);
            return true;
        } catch (ExpiredJwtException e) {
            logger.debug("JWT expired");
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            logger.debug("JWT invalid: {}", e.getMessage());
            return false;
        }
    }

    public Long getUserId(String token) {
        try {
            return Long.parseLong(parse(token).getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public String getRole(String token) {
        try {
            Object role = parse(token).get("role");
            return role != null ? role.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public String getEmail(String token) {
        try {
            Object email = parse(token).get("email");
            return email != null ? email.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
