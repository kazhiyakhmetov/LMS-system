package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.NotificationBanner;
import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Repository.NotificationBannerRepository;
import com.springdemo.educationsystem.Repository.UserRepository;
import com.springdemo.educationsystem.Service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/banners")
@CrossOrigin("*")
public class NotificationBannerController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationBannerController.class);

    private final NotificationBannerRepository bannerRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public NotificationBannerController(NotificationBannerRepository bannerRepository,
                                        UserRepository userRepository,
                                        AuthService authService) {
        this.bannerRepository = bannerRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    // ---------- helpers ----------

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) return null;
        return authorizationHeader.substring(7);
    }

    private boolean isAuthorized(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        return token != null && authService.isValidToken(token);
    }

    private boolean isAdmin(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (token == null) return false;
        String role = authService.getUserRole(token);
        return "admin".equals(role);
    }

    private Map<String, Object> toDto(NotificationBanner b) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", b.getId());
        dto.put("title", b.getTitle());
        dto.put("message", b.getMessage());
        dto.put("linkUrl", b.getLinkUrl());
        dto.put("linkLabel", b.getLinkLabel());
        dto.put("forStudents", b.isForStudents());
        dto.put("forTeachers", b.isForTeachers());
        dto.put("forParents", b.isForParents());
        dto.put("startDate", b.getStartDate());
        dto.put("endDate", b.getEndDate());
        dto.put("severity", b.getSeverity() != null ? b.getSeverity().name() : "INFO");
        dto.put("createdAt", b.getCreatedAt());
        if (b.getCreatedBy() != null) {
            Map<String, Object> author = new HashMap<>();
            author.put("id", b.getCreatedBy().getId());
            author.put("firstName", b.getCreatedBy().getFirstName());
            author.put("lastName", b.getCreatedBy().getLastName());
            dto.put("createdBy", author);
        }
        return dto;
    }

    // ---------- endpoints ----------

    /** Активные баннеры для текущего пользователя (учёт роли + окна дат). */
    @GetMapping
    public ResponseEntity<?> active(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthorized(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = extractToken(authorizationHeader);
            String role = authService.getUserRole(token);
            if (role == null) {
                return ResponseEntity.ok(List.of());
            }
            // Для админа баннеры не показываем в ленте — у него своя страница управления.
            if ("admin".equals(role)) {
                return ResponseEntity.ok(List.of());
            }
            LocalDate today = LocalDate.now();
            List<NotificationBanner> banners = bannerRepository.findActiveForRole(today, role);
            return ResponseEntity.ok(banners.stream().map(this::toDto).toList());
        } catch (Exception e) {
            logger.error("Ошибка получения активных баннеров: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Полный список баннеров (только админ). */
    @GetMapping("/admin")
    public ResponseEntity<?> adminList(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        try {
            List<NotificationBanner> banners = bannerRepository.findAllByOrderByCreatedAtDesc();
            return ResponseEntity.ok(banners.stream().map(this::toDto).toList());
        } catch (Exception e) {
            logger.error("Ошибка получения списка баннеров: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Создание баннера (только админ). */
    @PostMapping("/admin")
    public ResponseEntity<?> adminCreate(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        try {
            String title = body.get("title") != null ? String.valueOf(body.get("title")).trim() : "";
            String message = body.get("message") != null ? String.valueOf(body.get("message")).trim() : "";
            if (title.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Заголовок обязателен"));
            }
            if (message.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Текст уведомления обязателен"));
            }

            String linkUrl = body.get("linkUrl") != null ? String.valueOf(body.get("linkUrl")).trim() : null;
            if (linkUrl != null && linkUrl.isEmpty()) linkUrl = null;
            String linkLabel = body.get("linkLabel") != null ? String.valueOf(body.get("linkLabel")).trim() : null;
            if (linkLabel != null && linkLabel.isEmpty()) linkLabel = null;

            boolean forStudents = parseBool(body.get("forStudents"));
            boolean forTeachers = parseBool(body.get("forTeachers"));
            boolean forParents = parseBool(body.get("forParents"));
            if (!forStudents && !forTeachers && !forParents) {
                return ResponseEntity.badRequest().body(Map.of("error", "Выберите хотя бы одну аудиторию"));
            }

            String startDateStr = body.get("startDate") != null ? String.valueOf(body.get("startDate")) : null;
            String endDateStr = body.get("endDate") != null ? String.valueOf(body.get("endDate")) : null;
            if (startDateStr == null || endDateStr == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Укажите даты начала и окончания"));
            }
            LocalDate startDate;
            LocalDate endDate;
            try {
                startDate = LocalDate.parse(startDateStr);
                endDate = LocalDate.parse(endDateStr);
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Неверный формат дат (ожидается YYYY-MM-DD)"));
            }
            if (endDate.isBefore(startDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Дата окончания раньше даты начала"));
            }

            NotificationBanner.Severity severity = NotificationBanner.Severity.INFO;
            if (body.get("severity") != null) {
                try {
                    severity = NotificationBanner.Severity.valueOf(String.valueOf(body.get("severity")).toUpperCase());
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Неверный severity (INFO/WARNING/SUCCESS)"));
                }
            }

            String token = extractToken(authorizationHeader);
            Long adminId = authService.getUserId(token);
            User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;

            NotificationBanner banner = new NotificationBanner();
            banner.setTitle(title);
            banner.setMessage(message);
            banner.setLinkUrl(linkUrl);
            banner.setLinkLabel(linkLabel);
            banner.setForStudents(forStudents);
            banner.setForTeachers(forTeachers);
            banner.setForParents(forParents);
            banner.setStartDate(startDate);
            banner.setEndDate(endDate);
            banner.setSeverity(severity);
            banner.setCreatedBy(admin);

            NotificationBanner saved = bannerRepository.save(banner);
            return ResponseEntity.ok(toDto(saved));
        } catch (Exception e) {
            logger.error("Ошибка создания баннера: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Удаление баннера (только админ). */
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> adminDelete(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        try {
            NotificationBanner banner = bannerRepository.findById(id).orElse(null);
            if (banner == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Баннер не найден"));
            }
            bannerRepository.delete(banner);
            return ResponseEntity.ok(Map.of("message", "Баннер удалён"));
        } catch (Exception e) {
            logger.error("Ошибка удаления баннера: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean parseBool(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean b) return b;
        String s = String.valueOf(value).trim().toLowerCase();
        return "true".equals(s) || "1".equals(s) || "yes".equals(s);
    }
}
