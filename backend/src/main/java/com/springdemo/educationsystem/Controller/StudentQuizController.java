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
import com.springdemo.educationsystem.Entity.QuizOption;
import com.springdemo.educationsystem.Entity.QuizQuestion;
import com.springdemo.educationsystem.Repository.QuizAnswerRepository;
import com.springdemo.educationsystem.Repository.QuizAttemptRepository;
import com.springdemo.educationsystem.Repository.QuizOptionRepository;
import com.springdemo.educationsystem.Repository.QuizQuestionRepository;
import com.springdemo.educationsystem.Service.AiService;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.QuizAssignmentService;
import com.springdemo.educationsystem.Service.QuizAttemptService;
import com.springdemo.educationsystem.Service.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student/quiz")
@CrossOrigin("*")
public class StudentQuizController {

    private final QuizAttemptService quizAttemptService;
    private final QuizAssignmentService quizAssignmentService;
    private final QuizService quizService;
    private final AuthService authService;
    private final QuizAttemptRepository attemptRepository;
    private final QuizAnswerRepository answerRepository;
    private final QuizQuestionRepository questionRepository;
    private final QuizOptionRepository optionRepository;
    private final AiService aiService;

    public StudentQuizController(
            QuizAttemptService quizAttemptService,
            QuizAssignmentService quizAssignmentService,
            QuizService quizService,
            AuthService authService,
            QuizAttemptRepository attemptRepository,
            QuizAnswerRepository answerRepository,
            QuizQuestionRepository questionRepository,
            QuizOptionRepository optionRepository,
            AiService aiService
    ) {
        this.quizAttemptService = quizAttemptService;
        this.quizAssignmentService = quizAssignmentService;
        this.quizService = quizService;
        this.authService = authService;
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.aiService = aiService;
    }

    /**
     * AI-powered quiz generator for students (peer-quiz creation).
     */
    @PostMapping("/generate-ai")
    public ResponseEntity<?> generateWithAi(
            @RequestBody Map<String, Object> body,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : "";
        if (!authService.isValidToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        if (!"student".equals(authService.getUserRole(token))) {
            return ResponseEntity.status(403).body(Map.of("error", "Student only"));
        }

        String text = body.get("text") != null ? body.get("text").toString() : "";
        int n = 5;
        try { n = Integer.parseInt(String.valueOf(body.getOrDefault("nQuestions", 5))); }
        catch (NumberFormatException ignored) {}
        String difficulty = body.get("difficulty") != null ? body.get("difficulty").toString() : "medium";
        Map<String, Object> result = aiService.generateQuiz(text, n, difficulty, "quiz");
        if (result.containsKey("error")) {
            return ResponseEntity.status(502).body(result);
        }
        return ResponseEntity.ok(result);
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

    /**
     * Detailed result of a finished attempt: score + per-question breakdown
     * (question text, all options, which one student selected, correctness).
     * Used by the student "Пройденные → Посмотреть ответы" view.
     */
    @Transactional(readOnly = true)
    @GetMapping("/result/{attemptId}")
    public ResponseEntity<?> getStudentResult(
            @PathVariable Long attemptId,
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : "";
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();
        Long studentId = authService.getUserId(token);

        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (attempt.getStudent() == null
                || !attempt.getStudent().getId().equals(studentId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not your attempt"));
        }

        QuizAssignment assignment = attempt.getQuizAssignment();
        Quiz quiz = assignment != null ? assignment.getQuiz() : null;

        List<QuizQuestion> questions = quiz != null
                ? questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId())
                : List.of();
        List<QuizAnswer> answers = answerRepository.findByAttemptId(attemptId);
        Map<Long, QuizAnswer> answerByQuestion = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a, b) -> a));

        int correctCount = 0;
        List<Map<String, Object>> qDtos = new ArrayList<>();
        for (QuizQuestion q : questions) {
            List<QuizOption> opts = optionRepository.findByQuestionIdOrderByOrderIndexAsc(q.getId());
            Long correctOptId = opts.stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                    .map(QuizOption::getId)
                    .findFirst().orElse(null);

            QuizAnswer ans = answerByQuestion.get(q.getId());
            List<Long> selectedIds = parseSelectedIds(ans);
            boolean isCorrect = ans != null && Boolean.TRUE.equals(ans.getIsCorrect());
            if (isCorrect) correctCount++;

            List<Map<String, Object>> optDtos = new ArrayList<>();
            for (QuizOption o : opts) {
                Map<String, Object> od = new HashMap<>();
                od.put("id", o.getId());
                od.put("text", o.getOptionText());
                od.put("isCorrect", Boolean.TRUE.equals(o.getIsCorrect()));
                od.put("selected", selectedIds.contains(o.getId()));
                optDtos.add(od);
            }

            Map<String, Object> qd = new HashMap<>();
            qd.put("id", q.getId());
            qd.put("text", q.getQuestionText());
            qd.put("type", q.getQuestionType());
            qd.put("answered", ans != null);
            qd.put("isCorrect", isCorrect);
            qd.put("correctOptionId", correctOptId);
            qd.put("selectedOptionIds", selectedIds);
            qd.put("options", optDtos);
            qd.put("points", q.getPoints() != null ? q.getPoints() : 1);
            qd.put("pointsEarned", ans != null && ans.getPointsAwarded() != null ? ans.getPointsAwarded() : 0);
            qDtos.add(qd);
        }

        Map<String, Object> map = new HashMap<>();
        map.put("attemptId", attempt.getId());
        map.put("score", attempt.getScore());
        map.put("status", attempt.getStatus().name());
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());
        map.put("durationSeconds", attempt.getDurationSeconds());
        map.put("totalQuestions", questions.size());
        map.put("correctCount", correctCount);
        if (quiz != null) {
            Map<String, Object> qm = new HashMap<>();
            qm.put("id", quiz.getId());
            qm.put("title", quiz.getTitle());
            qm.put("description", quiz.getDescription());
            qm.put("subjectName", quiz.getSubject() != null ? quiz.getSubject().getName() : null);
            map.put("quiz", qm);
        }
        map.put("questions", qDtos);
        return ResponseEntity.ok(map);
    }

    private List<Long> parseSelectedIds(QuizAnswer ans) {
        if (ans == null || ans.getSelectedOptionIdsJson() == null) return List.of();
        String s = ans.getSelectedOptionIdsJson().trim();
        if (s.isEmpty()) return List.of();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isBlank()) return List.of();
        return Arrays.stream(s.split(","))
                .map(String::trim)
                .filter(p -> !p.isEmpty())
                .map(p -> {
                    try { return Long.parseLong(p); }
                    catch (NumberFormatException e) { return null; }
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * All SUBMITTED attempts of the calling student — used for the
     * "Пройденные" tab on /student/quizzes.
     */
    @Transactional(readOnly = true)
    @GetMapping("/completed")
    public ResponseEntity<?> getCompletedQuizzes(
            @RequestHeader("Authorization") String auth
    ) {
        String token = auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : "";
        if (!authService.isValidToken(token)) return ResponseEntity.status(401).build();
        Long studentId = authService.getUserId(token);

        List<QuizAttempt> attempts = attemptRepository.findByStudentIdOrderByStartTimeDesc(studentId);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (QuizAttempt a : attempts) {
            String st = a.getStatus() != null ? a.getStatus().name() : "";
            if (!"SUBMITTED".equals(st) && !"TIME_EXPIRED".equals(st)) continue;

            QuizAssignment qa = a.getQuizAssignment();
            Quiz quiz = qa != null ? qa.getQuiz() : null;

            Map<String, Object> row = new HashMap<>();
            row.put("attemptId", a.getId());
            row.put("assignmentId", qa != null ? qa.getId() : null);
            row.put("status", st);
            row.put("score", a.getScore());
            row.put("startTime", a.getStartTime());
            row.put("endTime", a.getEndTime());
            row.put("durationSeconds", a.getDurationSeconds());
            if (quiz != null) {
                row.put("quizId", quiz.getId());
                row.put("title", quiz.getTitle());
                row.put("description", quiz.getDescription());
                row.put("subjectName", quiz.getSubject() != null ? quiz.getSubject().getName() : null);
                List<QuizQuestion> qs = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
                row.put("questionsCount", qs.size());
                int maxScore = qs.stream().mapToInt(q -> q.getPoints() != null ? q.getPoints() : 0).sum();
                row.put("maxScore", maxScore);
                long correct = answerRepository.findByAttemptId(a.getId()).stream()
                        .filter(ans -> Boolean.TRUE.equals(ans.getIsCorrect()))
                        .count();
                row.put("correctCount", (int) correct);
            }
            rows.add(row);
        }
        rows.sort(Comparator.comparing(r -> {
            Object v = r.get("endTime");
            return v != null ? v.toString() : "";
        }, Comparator.reverseOrder()));
        return ResponseEntity.ok(rows);
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