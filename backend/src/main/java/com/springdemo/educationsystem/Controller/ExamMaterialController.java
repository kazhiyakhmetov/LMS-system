package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.ExamMaterial;
import com.springdemo.educationsystem.Entity.ExamMaterialLike;
import com.springdemo.educationsystem.Entity.Subject;
import com.springdemo.educationsystem.Entity.Teacher;
import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Repository.ExamMaterialLikeRepository;
import com.springdemo.educationsystem.Repository.ExamMaterialRepository;
import com.springdemo.educationsystem.Repository.SubjectRepository;
import com.springdemo.educationsystem.Repository.TeacherRepository;
import com.springdemo.educationsystem.Repository.UserRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exam-materials")
@CrossOrigin("*")
public class ExamMaterialController {

    private static final Logger logger = LoggerFactory.getLogger(ExamMaterialController.class);

    private final ExamMaterialRepository materialRepository;
    private final ExamMaterialLikeRepository likeRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    public ExamMaterialController(
            ExamMaterialRepository materialRepository,
            ExamMaterialLikeRepository likeRepository,
            SubjectRepository subjectRepository,
            TeacherRepository teacherRepository,
            UserRepository userRepository,
            AuthService authService,
            FileStorageService fileStorageService
    ) {
        this.materialRepository = materialRepository;
        this.likeRepository = likeRepository;
        this.subjectRepository = subjectRepository;
        this.teacherRepository = teacherRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.fileStorageService = fileStorageService;
    }

    // === GET catalog ===
    @GetMapping
    public ResponseEntity<?> getCatalog(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) String type,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        try {
            Long currentUserId = resolveUserId(authorizationHeader);

            ExamMaterial.Language lang = parseLanguage(language);
            ExamMaterial.Type t = parseType(type);

            List<ExamMaterial> list = materialRepository.searchCatalog(subjectId, lang, quarter, t);

            List<Long> ids = list.stream().map(ExamMaterial::getId).collect(Collectors.toList());
            final java.util.Set<Long> likedIds;
            if (currentUserId != null && !ids.isEmpty()) {
                likedIds = likeRepository.findByUserIdAndMaterialIdIn(currentUserId, ids).stream()
                        .map(l -> l.getMaterial().getId())
                        .collect(Collectors.toSet());
            } else {
                likedIds = java.util.Collections.emptySet();
            }

            List<Map<String, Object>> dtos = list.stream()
                    .map(m -> toDto(m, likedIds.contains(m.getId())))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error fetching catalog", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === GET my materials ===
    @GetMapping("/my")
    public ResponseEntity<?> getMyMaterials(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            if (!"teacher".equals(authService.getUserRole(token))) {
                return ResponseEntity.status(403).body(Map.of("error", "Only teachers can view their materials"));
            }

            Long teacherId = authService.getUserId(token);
            List<ExamMaterial> list = materialRepository.findByAuthorIdOrderByCreatedAtDesc(teacherId);

            List<Long> ids = list.stream().map(ExamMaterial::getId).collect(Collectors.toList());
            final java.util.Set<Long> likedIds;
            if (!ids.isEmpty()) {
                likedIds = likeRepository.findByUserIdAndMaterialIdIn(teacherId, ids).stream()
                        .map(l -> l.getMaterial().getId())
                        .collect(Collectors.toSet());
            } else {
                likedIds = java.util.Collections.emptySet();
            }

            List<Map<String, Object>> dtos = list.stream()
                    .map(m -> toDto(m, likedIds.contains(m.getId())))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error fetching my materials", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === POST create ===
    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    public ResponseEntity<?> createMaterial(
            @RequestParam("title") String title,
            @RequestParam("type") String type,
            @RequestParam("subjectId") Long subjectId,
            @RequestParam("language") String language,
            @RequestParam("quarter") Integer quarter,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "isPublic", required = false, defaultValue = "false") Boolean isPublic,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            if (!"teacher".equals(authService.getUserRole(token))) {
                return ResponseEntity.status(403).body(Map.of("error", "Only teachers can create exam materials"));
            }

            Long teacherId = authService.getUserId(token);
            Teacher teacher = teacherRepository.findById(teacherId)
                    .orElseThrow(() -> new RuntimeException("Teacher not found"));

            Subject subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new RuntimeException("Subject not found"));

            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Title is required"));
            }
            if (quarter == null || quarter < 1 || quarter > 4) {
                return ResponseEntity.badRequest().body(Map.of("error", "Quarter must be 1..4"));
            }

            ExamMaterial.Type t = parseType(type);
            if (t == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid type. Use SOR or SOCH"));
            }
            ExamMaterial.Language lang = parseLanguage(language);
            if (lang == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid language. Use RU, KZ or EN"));
            }

            ExamMaterial m = new ExamMaterial();
            m.setTitle(title.trim());
            m.setType(t);
            m.setSubject(subject);
            m.setLanguage(lang);
            m.setQuarter(quarter);
            m.setAuthor(teacher);
            m.setDescription(description);
            m.setIsPublic(Boolean.TRUE.equals(isPublic));

            if (file != null && !file.isEmpty()) {
                if (!fileStorageService.isValidFileSize(file)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Файл слишком большой (макс. 5MB)"));
                }
                String path = fileStorageService.storeFile(file, "exam-materials");
                m.setFilePath(path);
                m.setFileName(file.getOriginalFilename());
            }

            ExamMaterial saved = materialRepository.save(m);
            return ResponseEntity.ok(toDto(saved, false));
        } catch (Exception e) {
            logger.error("Error creating material", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === POST like (toggle) ===
    @PostMapping("/{id}/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            if (!"teacher".equals(authService.getUserRole(token))) {
                return ResponseEntity.status(403).body(Map.of("error", "Only teachers can like materials"));
            }

            Long userId = authService.getUserId(token);
            ExamMaterial material = materialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            Optional<ExamMaterialLike> existing = likeRepository.findByUserIdAndMaterialId(userId, id);
            boolean liked;
            if (existing.isPresent()) {
                likeRepository.delete(existing.get());
                liked = false;
            } else {
                ExamMaterialLike like = new ExamMaterialLike();
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                like.setUser(user);
                like.setMaterial(material);
                likeRepository.save(like);
                liked = true;
            }

            long count = likeRepository.countByMaterialId(id);
            material.setLikeCount((int) count);
            materialRepository.save(material);

            Map<String, Object> resp = new HashMap<>();
            resp.put("liked", liked);
            resp.put("likeCount", (int) count);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Error toggling like", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === POST share (publish to catalog) ===
    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareMaterial(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            if (!"teacher".equals(authService.getUserRole(token))) {
                return ResponseEntity.status(403).body(Map.of("error", "Only teachers can share materials"));
            }

            Long userId = authService.getUserId(token);
            ExamMaterial material = materialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            if (!material.getAuthor().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the author can publish"));
            }

            material.setIsPublic(true);
            ExamMaterial saved = materialRepository.save(material);
            return ResponseEntity.ok(toDto(saved, likeRepository.existsByUserIdAndMaterialId(userId, id)));
        } catch (Exception e) {
            logger.error("Error sharing material", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === GET download ===
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadMaterial(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        try {
            ExamMaterial material = materialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            Long currentUserId = resolveUserId(authorizationHeader);
            if (!Boolean.TRUE.equals(material.getIsPublic())) {
                if (currentUserId == null || !material.getAuthor().getId().equals(currentUserId)) {
                    return ResponseEntity.status(403).body(Map.of("error", "Material is private"));
                }
            }

            if (material.getFilePath() == null || material.getFilePath().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Файл не прикреплён"));
            }

            byte[] content = fileStorageService.loadFile(material.getFilePath());

            material.setDownloadCount((material.getDownloadCount() == null ? 0 : material.getDownloadCount()) + 1);
            materialRepository.save(material);

            String fileName = material.getFileName();
            if (fileName == null || fileName.isEmpty()) {
                String path = material.getFilePath();
                fileName = path.substring(path.lastIndexOf('/') + 1);
                if (fileName.contains("_")) {
                    fileName = fileName.substring(fileName.indexOf('_') + 1);
                }
            }

            String contentType = determineContentType(material.getFilePath());

            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(content);
        } catch (Exception e) {
            logger.error("Error downloading material", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === DELETE ===
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteMaterial(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            if (!"teacher".equals(authService.getUserRole(token))) {
                return ResponseEntity.status(403).body(Map.of("error", "Only teachers can delete materials"));
            }

            Long userId = authService.getUserId(token);
            ExamMaterial material = materialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            if (!material.getAuthor().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the author can delete"));
            }

            // Remove dependent like rows first to avoid FK constraint violation
            likeRepository.deleteByMaterialId(id);

            materialRepository.delete(material);

            // File cleanup is best-effort; it must not roll back the DB deletion
            if (material.getFilePath() != null && !material.getFilePath().isEmpty()) {
                try { fileStorageService.deleteFile(material.getFilePath()); } catch (Exception ignore) { /* ignore */ }
            }
            return ResponseEntity.ok(Map.of("message", "Material deleted"));
        } catch (Exception e) {
            logger.error("Error deleting material", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === helpers ===
    private Map<String, Object> toDto(ExamMaterial m, boolean likedByMe) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", m.getId());
        dto.put("title", m.getTitle());
        dto.put("type", m.getType() != null ? m.getType().name() : null);
        dto.put("language", m.getLanguage() != null ? m.getLanguage().name() : null);
        dto.put("quarter", m.getQuarter());
        dto.put("description", m.getDescription());
        dto.put("isPublic", m.getIsPublic());
        dto.put("createdAt", m.getCreatedAt());
        dto.put("downloadCount", m.getDownloadCount());
        dto.put("likeCount", m.getLikeCount());
        dto.put("likedByMe", likedByMe);
        dto.put("fileName", m.getFileName());
        dto.put("hasFile", m.getFilePath() != null && !m.getFilePath().isEmpty());

        try {
            Subject s = m.getSubject();
            dto.put("subjectId", s != null ? s.getId() : null);
            dto.put("subjectName", s != null ? s.getName() : null);
        } catch (Exception e) {
            dto.put("subjectId", null);
            dto.put("subjectName", null);
        }

        try {
            Teacher author = m.getAuthor();
            if (author != null) {
                dto.put("authorId", author.getId());
                User u = author.getUser();
                if (u != null) {
                    String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " " +
                            (u.getLastName() == null ? "" : u.getLastName())).trim();
                    dto.put("authorName", name.isEmpty() ? u.getEmail() : name);
                } else {
                    dto.put("authorName", null);
                }
            } else {
                dto.put("authorId", null);
                dto.put("authorName", null);
            }
        } catch (Exception e) {
            dto.put("authorId", null);
            dto.put("authorName", null);
        }

        return dto;
    }

    private Long resolveUserId(String authorizationHeader) {
        if (authorizationHeader == null) return null;
        try {
            String token = extractToken(authorizationHeader);
            if (!authService.isValidToken(token)) return null;
            return authService.getUserId(token);
        } catch (Exception e) {
            return null;
        }
    }

    private ExamMaterial.Type parseType(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            return ExamMaterial.Type.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private ExamMaterial.Language parseLanguage(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            return ExamMaterial.Language.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null) return "";
        if (authorizationHeader.startsWith("Bearer ")) return authorizationHeader.substring(7);
        return authorizationHeader;
    }

    private String determineContentType(String filePath) {
        int dot = filePath.lastIndexOf('.');
        if (dot < 0) return "application/octet-stream";
        String ext = filePath.substring(dot + 1).toLowerCase();
        switch (ext) {
            case "pdf": return "application/pdf";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "doc": return "application/msword";
            case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }
}
