package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.LibraryBookDTO;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.LibraryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/library")
@CrossOrigin("*")
public class LibraryController {

    private static final Logger logger = LoggerFactory.getLogger(LibraryController.class);

    private final LibraryService libraryService;
    private final AuthService authService;

    public LibraryController(LibraryService libraryService, AuthService authService) {
        this.libraryService = libraryService;
        this.authService = authService;
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchLibrary(
            @RequestParam(required = false) String query,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {

        if (!isAuthenticated(authorizationHeader)) {
            logger.warn("Unauthorized Library search attempt");
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        try {
            List<LibraryBookDTO> results = libraryService.search(query);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            logger.error("Library search failed for '{}': {}", query, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Search failed: " + e.getMessage()));
        }
    }

    private boolean isAuthenticated(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        String token = authorizationHeader.substring(7);
        return authService.isValidToken(token);
    }
}
