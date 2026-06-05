package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Repository.SchoolClassRepository;
import com.springdemo.educationsystem.Service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/school-classes")
@CrossOrigin("*")
public class SchoolClassController {

    private final SchoolClassRepository schoolClassRepository;
    private final AuthService authService;
    public SchoolClassController(SchoolClassRepository schoolClassRepository, AuthService authService) {
        this.schoolClassRepository = schoolClassRepository;
        this.authService = authService;
    }

    private boolean isAuthenticated(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        return authService.isValidToken(authorizationHeader.substring(7));
    }

    @GetMapping
    public ResponseEntity<?> getAllClasses(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthenticated(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(schoolClassRepository.findAll());
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getClassesBySchool(
            @PathVariable Long schoolId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthenticated(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(schoolClassRepository.findBySchoolId(schoolId));
    }

}
