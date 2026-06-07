package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.PushSubscription;
import com.springdemo.educationsystem.Repository.PushSubscriptionRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.PushNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@CrossOrigin("*")
public class PushController {

    private final PushSubscriptionRepository repository;
    private final PushNotificationService pushService;
    private final AuthService authService;

    public PushController(PushSubscriptionRepository repository,
                          PushNotificationService pushService,
                          AuthService authService) {
        this.repository = repository;
        this.pushService = pushService;
        this.authService = authService;
    }

    private String token(String auth) {
        return auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : "";
    }

    /** Публичный VAPID-ключ — нужен фронту для подписки. */
    @GetMapping("/public-key")
    public ResponseEntity<?> publicKey() {
        return ResponseEntity.ok(Map.of("publicKey", pushService.getPublicKey() == null ? "" : pushService.getPublicKey()));
    }

    /** Сохранить подписку браузера для текущего пользователя. */
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> body,
                                       @RequestHeader("Authorization") String auth) {
        String t = token(auth);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        Long userId = authService.getUserId(t);

        String endpoint = body.get("endpoint") != null ? body.get("endpoint").toString() : null;
        Object keysObj = body.get("keys");
        if (endpoint == null || endpoint.isBlank() || !(keysObj instanceof Map)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid subscription"));
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> keys = (Map<String, Object>) keysObj;
        String p256dh = keys.get("p256dh") != null ? keys.get("p256dh").toString() : null;
        String authKey = keys.get("auth") != null ? keys.get("auth").toString() : null;
        if (p256dh == null || authKey == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid subscription keys"));
        }

        // upsert по endpoint: если уже есть — переназначим на текущего пользователя
        PushSubscription sub = repository.findByEndpoint(endpoint).orElseGet(PushSubscription::new);
        sub.setUserId(userId);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(authKey);
        if (sub.getCreatedAt() == null) sub.setCreatedAt(java.time.LocalDateTime.now());
        repository.save(sub);

        return ResponseEntity.ok(Map.of("message", "Subscribed"));
    }

    /** Удалить подписку (отписка). */
    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, Object> body,
                                         @RequestHeader("Authorization") String auth) {
        String t = token(auth);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        String endpoint = body.get("endpoint") != null ? body.get("endpoint").toString() : null;
        if (endpoint != null && !endpoint.isBlank()) {
            repository.deleteByEndpoint(endpoint);
        }
        return ResponseEntity.ok(Map.of("message", "Unsubscribed"));
    }

    /** Тестовый пуш самому себе (для проверки). */
    @PostMapping("/test")
    public ResponseEntity<?> test(@RequestHeader("Authorization") String auth) {
        String t = token(auth);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        Long userId = authService.getUserId(t);
        pushService.sendToUser(userId, "StudIX", "Тестовое уведомление работает! 🎉", "/");
        return ResponseEntity.ok(Map.of("message", "Test push sent"));
    }
}
