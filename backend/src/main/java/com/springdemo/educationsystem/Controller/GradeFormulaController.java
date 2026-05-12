package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.GradeFormulaConfig;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.GradeFormulaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Конфигурация формул расчёта оценок. Чтение — для всех авторизованных,
 * запись — только админ.
 */
@RestController
@RequestMapping("/api/grade-formula")
@CrossOrigin("*")
public class GradeFormulaController {

    private final GradeFormulaService gradeFormulaService;
    private final AuthService authService;

    public GradeFormulaController(GradeFormulaService gradeFormulaService, AuthService authService) {
        this.gradeFormulaService = gradeFormulaService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<?> getConfig(@RequestHeader("Authorization") String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(gradeFormulaService.getOrCreate());
    }

    @PutMapping("/admin")
    public ResponseEntity<?> updateConfig(@RequestHeader("Authorization") String authorizationHeader,
                                          @RequestBody Map<String, Object> body) {
        String token = extractToken(authorizationHeader);
        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        if (!"admin".equalsIgnoreCase(authService.getUserRole(token))) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin rights required"));
        }
        try {
            Double fo = toDouble(body.get("foWeight"));
            Double sor = toDouble(body.get("sorWeight"));
            Double soch = toDouble(body.get("sochWeight"));
            Double year = toDouble(body.get("yearWeight"));
            Double exam = toDouble(body.get("examWeight"));
            Integer maxScale = body.get("maxScale") != null
                    ? Integer.valueOf(String.valueOf(body.get("maxScale")))
                    : null;
            GradeFormulaConfig updated = gradeFormulaService.update(fo, sor, soch, year, exam, maxScale);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Double toDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).doubleValue();
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        return Double.parseDouble(s);
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null) return "";
        return authorizationHeader.startsWith("Bearer ") ? authorizationHeader.substring(7) : authorizationHeader;
    }
}
