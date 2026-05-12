package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.NewsPost;
import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Repository.NewsPostRepository;
import com.springdemo.educationsystem.Repository.UserRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
@CrossOrigin("*")
public class NewsController {

    private static final Logger logger = LoggerFactory.getLogger(NewsController.class);

    private final NewsPostRepository newsRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    public NewsController(NewsPostRepository newsRepository,
                          UserRepository userRepository,
                          AuthService authService,
                          FileStorageService fileStorageService) {
        this.newsRepository = newsRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.fileStorageService = fileStorageService;
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

    private Map<String, Object> toDto(NewsPost p) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", p.getId());
        dto.put("title", p.getTitle());
        dto.put("description", p.getDescription());
        dto.put("photoPath", p.getPhotoPath());
        dto.put("type", p.getType() != null ? p.getType().name() : null);
        dto.put("schoolId", p.getSchoolId());
        dto.put("startDate", p.getStartDate());
        dto.put("endDate", p.getEndDate());
        dto.put("createdAt", p.getCreatedAt());
        if (p.getCreatedBy() != null) {
            Map<String, Object> author = new HashMap<>();
            author.put("id", p.getCreatedBy().getId());
            author.put("firstName", p.getCreatedBy().getFirstName());
            author.put("lastName", p.getCreatedBy().getLastName());
            dto.put("createdBy", author);
        }
        return dto;
    }

    // ---------- endpoints ----------

    /** Лента активных новостей — доступна всем авторизованным. */
    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthorized(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            LocalDate today = LocalDate.now();
            List<NewsPost> posts = newsRepository.findByEndDateGreaterThanEqualOrderByStartDateDesc(today);
            return ResponseEntity.ok(posts.stream().map(this::toDto).toList());
        } catch (Exception e) {
            logger.error("Ошибка получения новостей: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Список всех новостей для админа (включая истёкшие — он управляет). */
    @GetMapping("/admin")
    public ResponseEntity<?> adminList(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        try {
            List<NewsPost> posts = newsRepository.findAllByOrderByCreatedAtDesc();
            return ResponseEntity.ok(posts.stream().map(this::toDto).toList());
        } catch (Exception e) {
            logger.error("Ошибка получения списка новостей админом: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Создание новости (только админ). */
    @PostMapping(value = "/admin", consumes = {"multipart/form-data"})
    public ResponseEntity<?> adminCreate(
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "type", required = false, defaultValue = "GENERAL") String type,
            @RequestParam("startDate") String startDate,
            @RequestParam("endDate") String endDate,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }

        try {
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Заголовок обязателен"));
            }

            NewsPost.NewsType newsType;
            try {
                newsType = NewsPost.NewsType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Неверный тип новости (ожидается GENERAL или LOCAL)"));
            }

            LocalDate start;
            LocalDate end;
            try {
                start = LocalDate.parse(startDate);
                end = LocalDate.parse(endDate);
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Неверный формат дат (ожидается YYYY-MM-DD)"));
            }
            if (end.isBefore(start)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Дата окончания раньше даты начала"));
            }

            String photoPath = null;
            if (file != null && !file.isEmpty()) {
                if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Файл должен быть изображением"));
                }
                if (!fileStorageService.isValidFileSize(file)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Изображение слишком большое (максимум 5MB)"));
                }
                photoPath = fileStorageService.storeFile(file, "news");
            }

            // resolve current admin user — может быть отсутствовать в БД (admin@school.kz seeded)
            String token = extractToken(authorizationHeader);
            Long adminId = authService.getUserId(token);
            User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;

            NewsPost post = new NewsPost();
            post.setTitle(title.trim());
            post.setDescription(description != null ? description.trim() : "");
            post.setType(newsType);
            post.setStartDate(start);
            post.setEndDate(end);
            post.setPhotoPath(photoPath);
            post.setCreatedBy(admin);

            // LOCAL — привязка к школе админа (если у него есть школа)
            if (newsType == NewsPost.NewsType.LOCAL && admin != null && admin.getSchool() != null) {
                post.setSchoolId(admin.getSchool().getId());
            }

            NewsPost saved = newsRepository.save(post);
            return ResponseEntity.ok(toDto(saved));

        } catch (Exception e) {
            logger.error("Ошибка создания новости: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Удаление новости (только админ). Удаляет картинку с диска, если она есть. */
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> adminDelete(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (!isAdmin(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        try {
            NewsPost post = newsRepository.findById(id).orElse(null);
            if (post == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Новость не найдена"));
            }
            if (post.getPhotoPath() != null && !post.getPhotoPath().isEmpty()) {
                try {
                    fileStorageService.deleteFile(post.getPhotoPath());
                } catch (Exception ex) {
                    logger.warn("Не удалось удалить файл новости {}: {}", post.getPhotoPath(), ex.getMessage());
                }
            }
            newsRepository.delete(post);
            return ResponseEntity.ok(Map.of("message", "Новость удалена"));
        } catch (Exception e) {
            logger.error("Ошибка удаления новости: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
