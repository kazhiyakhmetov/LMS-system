package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.UserDTO;
import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin("*")
public class UserController {
    private final UserService userService;
    private final AuthService authService;
    public UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    private boolean isAdminAuthorized(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        String token = authorizationHeader.substring(7);
        return "admin".equals(authService.getUserRole(token));
    }

    private boolean isAuthenticated(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        return authService.isValidToken(authorizationHeader.substring(7));
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthenticated(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAuthenticated(authorizationHeader)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        UserDTO user = userService.getUserById(id);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }

    @PostMapping("/students")
    public ResponseEntity<?> registerStudent(
            @RequestBody User user,
            @RequestParam Long classId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminAuthorized(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        return ResponseEntity.ok(userService.registerStudent(user, classId));
    }

    @PostMapping("/teachers")
    public ResponseEntity<?> registerTeacher(
            @RequestBody User user,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (!isAdminAuthorized(authorizationHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin rights required."));
        }
        return ResponseEntity.ok(userService.registerTeacher(user));
    }

}
