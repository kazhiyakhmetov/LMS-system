package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.Entity.School;
import com.springdemo.educationsystem.Entity.SchoolClass;
import com.springdemo.educationsystem.Repository.SchoolClassRepository;
import com.springdemo.educationsystem.Repository.SchoolRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.SchoolService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schools")
@CrossOrigin("*")
public class SchoolController {
    private final SchoolService schoolService;
    private final SchoolRepository schoolRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final AuthService authService;
    public SchoolController(SchoolService schoolService, SchoolRepository schoolRepository, SchoolClassRepository schoolClassRepository, AuthService authService) {
        this.schoolService = schoolService;
        this.schoolRepository = schoolRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.authService = authService;
    }

    private boolean isAdminAuthorized(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        String token = authorizationHeader.substring(7);
        return "admin".equals(authService.getUserRole(token));
    }

    @GetMapping
    public List<School> getAllSchools() {
        return schoolRepository.findAll();
    }

    @GetMapping("/{schoolId}/classes")
    public List<SchoolClass> getClassesBySchool(@PathVariable Long schoolId) {
        return schoolClassRepository.findBySchoolId(schoolId);
    }


    @GetMapping("/{id}")
    public ResponseEntity<School> getSchoolById(@PathVariable Long id) {
        School school = schoolService.getSchoolById(id);
        return school != null ? ResponseEntity.ok(school) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createSchool(
            @RequestBody School school,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminAuthorized(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        return ResponseEntity.ok(schoolService.createSchool(school));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchool(
            @PathVariable Long id,
            @RequestBody School schoolDetails,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminAuthorized(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        School updatedSchool = schoolService.updateSchool(id, schoolDetails);
        return updatedSchool != null ? ResponseEntity.ok(updatedSchool) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchool(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminAuthorized(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        schoolService.deleteSchool(id);
        return ResponseEntity.ok().build();
    }
}
