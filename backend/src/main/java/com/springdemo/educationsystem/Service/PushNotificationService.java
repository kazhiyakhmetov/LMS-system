package com.springdemo.educationsystem.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.springdemo.educationsystem.Entity.PushSubscription;
import com.springdemo.educationsystem.Repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Отправка Web Push уведомлений в браузеры пользователя.
 * Полностью защищённый: любые ошибки гасятся и НЕ ломают основной поток.
 */
@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final PushSubscriptionRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String publicKey;
    private final String privateKey;
    private final String subject;

    private nl.martijndwars.webpush.PushService pushService; // null = пуш отключён (нет ключей)

    public PushNotificationService(
            PushSubscriptionRepository repository,
            @Value("${VAPID_PUBLIC_KEY:}") String publicKey,
            @Value("${VAPID_PRIVATE_KEY:}") String privateKey,
            @Value("${VAPID_SUBJECT:mailto:admin@studix.local}") String subject) {
        this.repository = repository;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.subject = subject;
    }

    @PostConstruct
    void init() {
        if (publicKey == null || publicKey.isBlank() || privateKey == null || privateKey.isBlank()) {
            log.warn("VAPID keys not configured — web push disabled");
            return;
        }
        try {
            Security.addProvider(new BouncyCastleProvider());
            pushService = new nl.martijndwars.webpush.PushService(publicKey, privateKey, subject);
            log.info("Web push initialized");
        } catch (Exception e) {
            log.error("Web push init failed: {}", e.getMessage());
        }
    }

    /** Публичный VAPID-ключ для фронтенда. */
    public String getPublicKey() {
        return publicKey;
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    /**
     * Шлёт пуш на ВСЕ устройства пользователя. Не блокирует вызывающий поток.
     */
    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null || userId == null) return;
        CompletableFuture.runAsync(() -> doSend(userId, title, body, url));
    }

    private void doSend(Long userId, String title, String body, String url) {
        try {
            List<PushSubscription> subs = repository.findByUserId(userId);
            if (subs.isEmpty()) return;

            String payload = objectMapper.writeValueAsString(Map.of(
                    "title", title == null ? "StudIX" : title,
                    "body", body == null ? "" : body,
                    "url", url == null ? "/" : url
            ));

            for (PushSubscription s : subs) {
                try {
                    Subscription sub = new Subscription(
                            s.getEndpoint(),
                            new Subscription.Keys(s.getP256dh(), s.getAuth())
                    );
                    HttpResponse resp = pushService.send(new Notification(sub, payload));
                    int code = resp.getStatusLine().getStatusCode();
                    // 404/410 — подписка мертва (браузер отписался) → удаляем
                    if (code == 404 || code == 410) {
                        repository.delete(s);
                        log.info("Removed dead push subscription {}", s.getId());
                    } else if (code >= 400) {
                        log.warn("Push send returned {} for sub {}", code, s.getId());
                    }
                } catch (Exception e) {
                    log.warn("Push send failed for sub {}: {}", s.getId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Push doSend error for user {}: {}", userId, e.getMessage());
        }
    }
}
