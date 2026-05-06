package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.RecommendationDTO;
import com.springdemo.educationsystem.Entity.Recommendation;
import com.springdemo.educationsystem.Entity.Student;
import com.springdemo.educationsystem.Repository.RecommendationRepository;
import com.springdemo.educationsystem.Repository.StudentRepository;
import com.springdemo.educationsystem.Service.AiService;
import com.springdemo.educationsystem.Service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommend")
@CrossOrigin("*")
public class RecommendationController {

    private final AiService aiService;
    private final AuthService authService;
    private final StudentRepository studentRepository;
    private final RecommendationRepository recRepo;

    public RecommendationController(AiService aiService,
                                    AuthService authService,
                                    StudentRepository studentRepository,
                                    RecommendationRepository recRepo) {
        this.aiService = aiService;
        this.authService = authService;
        this.studentRepository = studentRepository;
        this.recRepo = recRepo;
    }

    private String token(String h) { return h != null && h.startsWith("Bearer ") ? h.substring(7) : ""; }

    /**
     * Student fetches their own recommendations.
     * Strategy: read cached recommendations table; if empty, fall back to live call to AI.
     */
    @GetMapping("/student/me")
    public ResponseEntity<?> myRecommendations(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(defaultValue = "5") int limit
    ) {
        String t = token(authorization);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        Long userId = authService.getUserId(t);
        Student student = studentRepository.findByUserId(userId).orElse(null);
        if (student == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a student"));
        }
        Long studentId = student.getId();

        List<Recommendation> cached = recRepo.findByStudentIdOrderByScoreDesc(studentId);
        if (!cached.isEmpty()) {
            return ResponseEntity.ok(cached.stream().limit(limit).toList());
        }

        // Fallback: call AI service live
        List<RecommendationDTO> live = aiService.recommendForStudent(studentId, limit);
        return ResponseEntity.ok(live);
    }

    /**
     * Admin/teacher trigger to recompute recommendations for everyone.
     * Also called by scheduler.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader("Authorization") String authorization) {
        String t = token(authorization);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        String role = authService.getUserRole(t);
        if (!"admin".equals(role) && !"teacher".equals(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin/teacher only"));
        }
        int n = aiService.refreshAllRecommendations();
        return ResponseEntity.ok(Map.of("refreshed", n));
    }
}
