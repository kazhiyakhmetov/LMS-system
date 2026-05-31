package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.StudentRiskDTO;
import com.springdemo.educationsystem.Entity.Parent;
import com.springdemo.educationsystem.Entity.Student;
import com.springdemo.educationsystem.Repository.ParentRepository;
import com.springdemo.educationsystem.Repository.ParentStudentRepository;
import com.springdemo.educationsystem.Repository.StudentRepository;
import com.springdemo.educationsystem.Service.AiService;
import com.springdemo.educationsystem.Service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/risk")
@CrossOrigin("*")
public class RiskController {

    private final AiService aiService;
    private final AuthService authService;
    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final ParentStudentRepository parentStudentRepository;

    public RiskController(
            AiService aiService,
            AuthService authService,
            StudentRepository studentRepository,
            ParentRepository parentRepository,
            ParentStudentRepository parentStudentRepository
    ) {
        this.aiService = aiService;
        this.authService = authService;
        this.studentRepository = studentRepository;
        this.parentRepository = parentRepository;
        this.parentStudentRepository = parentStudentRepository;
    }

    private String token(String header) {
        return header != null && header.startsWith("Bearer ") ? header.substring(7) : "";
    }

    private boolean ensureAuth(String header) {
        return authService.isValidToken(token(header));
    }

    private String fioOf(Student s) {
        if (s == null || s.getUser() == null) return "—";
        var u = s.getUser();
        return String.format("%s %s%s",
                u.getLastName() != null ? u.getLastName() : "",
                u.getFirstName() != null ? u.getFirstName() : "",
                u.getPatronymic() != null ? " " + u.getPatronymic() : "")
                .trim();
    }

    private void enrich(StudentRiskDTO dto) {
        if (dto == null) return;
        studentRepository.findById(dto.getStudentId()).ifPresent(s -> {
            dto.setStudentName(fioOf(s));
            if (s.getSchoolClass() != null) {
                dto.setClassName(s.getSchoolClass().getName());
            }
        });
    }

    // -------------------------------------------------------------------
    // Teacher: risk for a class
    // -------------------------------------------------------------------
    @GetMapping("/teacher/class/{classId}")
    public ResponseEntity<?> teacherClassRisk(
            @PathVariable Long classId,
            @RequestParam(required = false) String level,
            @RequestHeader("Authorization") String authorization
    ) {
        if (!ensureAuth(authorization)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        List<StudentRiskDTO> rows = aiService.riskForClass(classId, level);
        rows.forEach(this::enrich);
        return ResponseEntity.ok(rows);
    }

    // -------------------------------------------------------------------
    // Parent: risk for own child
    // -------------------------------------------------------------------
    @GetMapping("/parent/child/{studentId}")
    public ResponseEntity<?> parentChildRisk(
            @PathVariable Long studentId,
            @RequestHeader("Authorization") String authorization
    ) {
        String t = token(authorization);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        Long parentUserId = authService.getUserId(t);
        Parent parent = parentRepository.findById(parentUserId).orElse(null);
        if (parent == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a parent account"));
        }
        if (!parentStudentRepository.existsByParentIdAndStudentId(parent.getId(), studentId)) {
            return ResponseEntity.status(403).body(Map.of("error", "This child is not linked to this parent"));
        }
        StudentRiskDTO dto = aiService.riskForStudent(studentId);
        if (dto == null) {
            return ResponseEntity.ok(Map.of("studentId", studentId, "score", 0, "level", "low",
                    "topFactors", List.of(), "modelVersion", "unknown",
                    "available", false));
        }
        enrich(dto);
        return ResponseEntity.ok(dto);
    }

    // -------------------------------------------------------------------
    // Admin: school-wide summary
    // -------------------------------------------------------------------
    @GetMapping("/admin/school/{schoolId}/summary")
    public ResponseEntity<?> adminSchoolSummary(
            @PathVariable Long schoolId,
            @RequestHeader("Authorization") String authorization
    ) {
        String t = token(authorization);
        if (!authService.isValidToken(t)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        if (!"admin".equals(authService.getUserRole(t))) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin only"));
        }
        Map<String, Object> summary = aiService.riskSchoolSummary(schoolId);

        // enrich top-risk entries
        Object topRisk = summary.get("topRisk");
        if (topRisk instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> mm = (Map<String, Object>) m;
                    Object sid = mm.get("studentId");
                    if (sid instanceof Number n) {
                        studentRepository.findById(n.longValue()).ifPresent(s -> {
                            mm.put("studentName", fioOf(s));
                            if (s.getSchoolClass() != null) {
                                mm.put("className", s.getSchoolClass().getName());
                            }
                        });
                    }
                }
            }
        }
        return ResponseEntity.ok(summary);
    }

    // -------------------------------------------------------------------
    // Single-student lookup (used by the teacher's row drilldown)
    // -------------------------------------------------------------------
    @GetMapping("/teacher/student/{studentId}")
    public ResponseEntity<?> teacherStudentRisk(
            @PathVariable Long studentId,
            @RequestHeader("Authorization") String authorization
    ) {
        if (!ensureAuth(authorization)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        StudentRiskDTO dto = aiService.riskForStudent(studentId);
        if (dto == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Risk unavailable"));
        }
        enrich(dto);
        return ResponseEntity.ok(dto);
    }
}
