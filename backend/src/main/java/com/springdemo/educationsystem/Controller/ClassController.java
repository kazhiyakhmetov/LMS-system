package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.Student;
import com.springdemo.educationsystem.Repository.StudentRepository;
import com.springdemo.educationsystem.Service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/classes")
public class ClassController {

    private final StudentRepository studentRepository;
    private final AuthService authService;

    public ClassController(StudentRepository studentRepository, AuthService authService) {
        this.studentRepository = studentRepository;
        this.authService = authService;
    }

    private boolean isAuthenticated(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        return authService.isValidToken(authorizationHeader.substring(7));
    }

    @GetMapping("/{classId}/students")
    public ResponseEntity<?> getStudentsByClass(
            @PathVariable Long classId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthenticated(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(studentRepository.findBySchoolClassId(classId));
    }
}
