package com.springdemo.educationsystem.Entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Браузерная подписка на Web Push (один ряд = одно устройство/браузер пользователя).
 */
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Push endpoint URL браузера (может быть длинным). */
    @Column(name = "endpoint", nullable = false, unique = true, length = 1000)
    private String endpoint;

    /** Публичный ключ клиента (p256dh). */
    @Column(name = "p256dh", nullable = false, length = 255)
    private String p256dh;

    /** Auth-секрет клиента. */
    @Column(name = "auth", nullable = false, length = 255)
    private String auth;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public PushSubscription() {}

    public PushSubscription(Long userId, String endpoint, String p256dh, String auth) {
        this.userId = userId;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
