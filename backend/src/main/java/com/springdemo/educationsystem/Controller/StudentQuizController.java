package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.CreateQuestionDTO;
import com.springdemo.educationsystem.DTO.CreateQuizAssignmentDTO;
import com.springdemo.educationsystem.DTO.CreateQuizDTO;
import com.springdemo.educationsystem.DTO.FinishQuizDTO;
import com.springdemo.educationsystem.DTO.SaveAnswerDTO;
import com.springdemo.educationsystem.DTO.StartQuizDTO;
import com.springdemo.educationsystem.Entity.Quiz;
import com.springdemo.educationsystem.Entity.QuizAnswer;
import com.springdemo.educationsystem.Entity.QuizAssignment;
import com.springdemo.educationsystem.Entity.QuizAttempt;
import com.springdemo.educationsystem.Entity.QuizQuestion;
import com.springdemo.educationsystem.Repository.QuizAttemptRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.QuizAssignmentService;
import com.springdemo.educationsystem.Service.QuizAttemptService;
import com.springdemo.educationsystem.Service.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student/quiz")
@CrossOrigin("*")
public class StudentQuizController {

    private final QuizAttemptService quizAttemptService;
    private final QuizAssignmentService quizAssignmentService;
    private final QuizService quizService;
    private final AuthService authService;
    private final QuizAttemptRepository attemptRepository;

    public StudentQuizController(
            QuizAttemptService quizAttemptService,
            QuizAssignmentService quizAssignmentService,
            QuizService quizService,
            AuthService authService,
            QuizAttemptRepository attemptRepository
    ) {
        this.quizAttemptService = quizAttemptService;
        this.quizAssignmentService = quizAssignmentService;
        this.quizService = quizService;
        this.authService = authService;
        this.attemptRepository = attemptRepository;
    }

    // ========== STUDENT PEER-QUIZ CREATION ==========

    @PostMapping("/create")
    public ResponseEntity<?> createMyQuiz(
            @RequestBody CreateQuizDTO dto,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();
        if (!"student".equals(authService.getUserRole(token)))
            return ResponseEntity.status(403).body(Map.of("error", "Only students can create peer quizzes here"));

        Long studentUserId = authService.getUserId(token);
        try {
            Quiz quiz = quizService.createStudentQuiz(dto, studentUserId);
            return ResponseEntity.ok(quiz);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{quizId}/question")
    public ResponseEntity<?> addQuestionToMyQuiz(
            @PathVariable Long quizId,
            @RequestBody CreateQuestionDTO dto,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();
        if (!"student".equals(authService.getUserRole(token)))
            return ResponseEntity.status(403).body(Map.of("error", "Only students"));

        Long studentUserId = authService.getUserId(token);
        try {
            QuizQuestion q = quizService.addQuestionAsStudent(quizId, dto, studentUserId);
            return ResponseEntity.ok(q);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my-created")
    public ResponseEntity<?> getMyCreatedQuizzes(
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();

        Long studentUserId = authService.getUserId(token);
        return ResponseEntity.ok(quizService.getStudentCreatedQuizzes(studentUserId));
    }

    @PostMapping("/share")
    public ResponseEntity<?> shareWithClass(
            @RequestBody CreateQuizAssignmentDTO dto,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();
        if (!"student".equals(authService.getUserRole(token)))
            return ResponseEntity.status(403).body(Map.of("error", "Only students"));

        Long studentUserId = authService.getUserId(token);
        try {
            QuizAssignment a = quizAssignmentService.createStudentAssignment(studentUserId, dto);
            return ResponseEntity.ok(a);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my-shared")
    public ResponseEntity<?> getMyShared(
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();

        Long studentUserId = authService.getUserId(token);
        return ResponseEntity.ok(quizAssignmentService.getStudentCreatedAssignments(studentUserId));
    }

    // ========== EXISTING ENDPOINTS BELOW ==========

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableQuizzes(
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);

        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).build();
        }

        Long studentId = authService.getUserId(token);

        return ResponseEntity.ok(
                quizAssignmentService.getAvailableAssignmentsForStudent(studentId)
        );
    }

    @GetMapping("/result/{attemptId}")
    public Map<String, Object> getStudentResult(@PathVariable Long attemptId){

        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        Map<String, Object> map = new HashMap<>();

        map.put("score", attempt.getScore());
        map.put("status", attempt.getStatus().name());
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());

        return map;
    }

    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<?> getQuizAssignment(
            @PathVariable Long assignmentId,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);

        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).build();
        }

        Long studentId = authService.getUserId(token);

        QuizAssignment assignment = quizAssignmentService.getAssignmentForStudent(assignmentId, studentId);
        return ResponseEntity.ok(assignment);
    }

    @PostMapping("/start")
    public ResponseEntity<?> startQuiz(
            @RequestBody StartQuizDTO dto,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth.substring(7);

        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).build();
        }

        Long studentId = authService.getUserId(token);

        QuizAttempt attempt = quizAttemptService.startAttempt(dto.getAssignmentId(), studentId);

        return ResponseEntity.ok(attempt);
    }

    @PostMapping("/answer")
    public ResponseEntity<?> saveAnswer(
            @RequestBody SaveAnswerDTO dto
    ) {
        QuizAnswer answer = quizAttemptService.saveAnswer(dto);
        return ResponseEntity.ok(answer);
    }

    @PostMapping("/finish")
    public ResponseEntity<?> finishQuiz(
            @RequestBody FinishQuizDTO dto
    ) {
        QuizAttempt attempt = quizAttemptService.finishAttempt(dto.getAttemptId());
        return ResponseEntity.ok(attempt);
    }

    @GetMapping("/attempt/{attemptId}")
    public ResponseEntity<?> getAttempt(
            @PathVariable Long attemptId
    ) {
        return ResponseEntity.ok(
                quizAttemptService.getAttempt(attemptId)
        );
    }
}