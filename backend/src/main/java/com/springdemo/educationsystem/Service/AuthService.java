package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication facade поверх {@link JwtService}.
 *
 * Stateless: токен — это JWT, подписанный HMAC-SHA256. Сервер НЕ хранит
 * соответствие token↔userId в памяти — все данные содержатся в payload и
 * проверяются по подписи + сроку действия при каждом запросе.
 *
 * Logout: т.к. JWT stateless, для "отзыва" токена держим in-memory blacklist
 * (revokedTokens) — токен в нём перестаёт быть валидным досрочно, даже если
 * подпись/exp корректны. При рестарте контейнера blacklist чистится — это OK,
 * потому что одновременно сбрасывается весь uptime, а пользователь всё равно
 * получит свежий JWT при следующем login. Для prod-multi-replica blacklist
 * стоит вынести в Redis.
 */
@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final GamificationService gamificationService;
    private final JwtService jwtService;
    private final PasswordHashService passwordHashService;

    /** Отозванные (logout) токены — стают невалидными до своей natural-expiry. */
    private final Set<String> revokedTokens = ConcurrentHashMap.newKeySet();

    public AuthService(UserRepository userRepository,
                       GamificationService gamificationService,
                       JwtService jwtService,
                       PasswordHashService passwordHashService) {
        this.userRepository = userRepository;
        this.gamificationService = gamificationService;
        this.jwtService = jwtService;
        this.passwordHashService = passwordHashService;
    }

    public Map<String, Object> login(String email, String password) {
        logger.info("Login attempt for email: {}", email);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordHashService.matches(password, user.getPasswordHash())) {
            logger.warn("Login failed for email: {}", email);
            throw new RuntimeException("Invalid credentials");
        }
        upgradeLegacyPasswordHash(user, password);

        String role = determineUserRole(user);
        String token = jwtService.generate(user.getId(), user.getEmail(), role);

        // АВТОИНИЦИАЛИЗАЦИЯ СТАТИСТИКИ ДЛЯ СТУДЕНТОВ
        if ("student".equals(role)) {
            try {
                gamificationService.initializeStudentStats(user.getId());
                logger.info("Auto-initialized gamification stats for student: {}", user.getId());
            } catch (Exception e) {
                logger.warn("Could not initialize gamification stats for student {}: {}", user.getId(), e.getMessage());
            }
        }

        logger.info("User login successful, email: {}, role: {}", email, role);
        return createLoginResponse(token, user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(), role);
    }

    private String determineUserRole(User user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return "unknown";
        }
        return user.getRoles().get(0).getName();
    }

    private Map<String, Object> createLoginResponse(String token, Long userId, String email,
                                                    String firstName, String lastName, String role) {
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("userId", userId);
        response.put("email", email);
        response.put("firstName", firstName);
        response.put("lastName", lastName);
        response.put("role", role);
        response.put("expiresInMs", jwtService.getExpirationMs());
        response.put("message", "Login successful");
        return response;
    }

    private void upgradeLegacyPasswordHash(User user, String rawPassword) {
        if (!passwordHashService.needsRehash(user.getPasswordHash())) {
            return;
        }
        user.setPasswordHash(passwordHashService.encode(rawPassword));
        userRepository.save(user);
        logger.info("Migrated legacy password hash for user id: {}", user.getId());
    }

    public boolean isValidToken(String token) {
        if (token == null) return false;
        if (revokedTokens.contains(token)) return false;
        return jwtService.isValid(token);
    }

    public boolean isAdmin(String token) {
        if (!isValidToken(token)) return false;
        return "admin".equalsIgnoreCase(jwtService.getRole(token));
    }

    public Long getUserId(String token) {
        if (!isValidToken(token)) return null;
        return jwtService.getUserId(token);
    }

    public String getUserRole(String token) {
        if (!isValidToken(token)) return null;
        return jwtService.getRole(token);
    }

    public void logout(String token) {
        if (token == null) return;
        revokedTokens.add(token);
        logger.info("Token revoked (logout)");
    }
}
