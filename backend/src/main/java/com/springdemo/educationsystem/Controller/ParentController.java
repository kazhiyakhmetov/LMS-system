package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.LessonDTO;
import com.springdemo.educationsystem.Entity.Assignment;
import com.springdemo.educationsystem.Entity.Lesson;
import com.springdemo.educationsystem.Entity.Parent;
import com.springdemo.educationsystem.Entity.ParentStudent;
import com.springdemo.educationsystem.Entity.SchoolClass;
import com.springdemo.educationsystem.Entity.Student;
import com.springdemo.educationsystem.Entity.Submission;
import com.springdemo.educationsystem.Entity.User;
import com.springdemo.educationsystem.Repository.AssignmentRepository;
import com.springdemo.educationsystem.Repository.GradeRepository;
import com.springdemo.educationsystem.Repository.ParentRepository;
import com.springdemo.educationsystem.Repository.ParentStudentRepository;
import com.springdemo.educationsystem.Repository.StudentRepository;
import com.springdemo.educationsystem.Repository.SubmissionRepository;
import com.springdemo.educationsystem.Repository.TeacherClassSubjectRepository;
import com.springdemo.educationsystem.Service.AuthService;
import com.springdemo.educationsystem.Service.LessonService;
import com.springdemo.educationsystem.Service.TeacherJournalService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/parent")
@CrossOrigin("*")
public class ParentController {

    private final AuthService authService;
    private final ParentStudentRepository parentStudentRepository;
    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final GradeRepository gradeRepository;
    private final LessonService lessonService;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final TeacherJournalService teacherJournalService;
    private final TeacherClassSubjectRepository teacherClassSubjectRepository;

    public ParentController(
            AuthService authService,
            ParentStudentRepository parentStudentRepository,
            StudentRepository studentRepository,
            GradeRepository gradeRepository,
            ParentRepository parentRepository,
            LessonService lessonService,
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository,
            TeacherJournalService teacherJournalService,
            TeacherClassSubjectRepository teacherClassSubjectRepository
    ) {
        this.authService = authService;
        this.parentStudentRepository = parentStudentRepository;
        this.studentRepository = studentRepository;
        this.gradeRepository = gradeRepository;
        this.parentRepository = parentRepository;
        this.lessonService = lessonService;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.teacherJournalService = teacherJournalService;
        this.teacherClassSubjectRepository = teacherClassSubjectRepository;
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }
        return "";
    }

    private ResponseEntity<?> authFail() {
        return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
    }

    private Parent getAuthorizedParent(String authorizationHeader) {
        String token = extractToken(authorizationHeader);

        if (!authService.isValidToken(token)) {
            throw new RuntimeException("Authentication required");
        }

        Long parentUserId = authService.getUserId(token);

        return parentRepository.findById(parentUserId)
                .orElseThrow(() -> new RuntimeException("Parent not found"));
    }

    private Student getLinkedStudentOrThrow(Parent parent, Long studentId) {
        boolean linked = parentStudentRepository.existsByParentIdAndStudentId(parent.getId(), studentId);

        if (!linked) {
            throw new RuntimeException("This child is not linked to this parent");
        }

        return studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    private String safe(String x) {
        return x == null ? "" : x;
    }

    private String fioOf(User u) {
        if (u == null) return "";
        return String.format("%s %s%s",
                safe(u.getLastName()),
                safe(u.getFirstName()),
                u.getPatronymic() != null ? " " + u.getPatronymic() : ""
        ).trim();
    }

    // ==================================================================
    //  Parent profile
    // ==================================================================
    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            User user = parent.getUser();

            Map<String, Object> result = new HashMap<>();
            result.put("id", parent.getId());
            result.put("firstName", user != null ? user.getFirstName() : null);
            result.put("lastName", user != null ? user.getLastName() : null);
            result.put("patronymic", user != null ? user.getPatronymic() : null);
            result.put("fio", fioOf(user));
            result.put("email", user != null ? user.getEmail() : null);
            result.put("bio", user != null ? user.getBio() : null);
            result.put("schoolName", user != null && user.getSchool() != null ? user.getSchool().getName() : null);
            result.put("profilePhotoPath", user != null ? user.getProfilePhotoPath() : null);
            result.put("profilePhotoUrl", user != null && user.getProfilePhotoPath() != null && !user.getProfilePhotoPath().isEmpty()
                    ? "/uploads/" + user.getProfilePhotoPath() : null);
            result.put("childrenCount", parentStudentRepository.findByParentId(parent.getId()).size());

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Children
    // ==================================================================
    @GetMapping("/children")
    public ResponseEntity<?> getMyChildren(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);

            List<ParentStudent> links = parentStudentRepository.findByParentId(parent.getId());
            if (links == null || links.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            List<Map<String, Object>> children = links.stream()
                    .map(ParentStudent::getStudent)
                    .filter(Objects::nonNull)
                    .map(this::toChildCardMap)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(children);

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toChildCardMap(Student s) {
        String fio = fioOf(s.getUser());
        String className = null;
        Long classId = null;
        String schoolName = null;
        String avatarUrl = null;

        if (s.getSchoolClass() != null) {
            className = s.getSchoolClass().getName();
            classId = s.getSchoolClass().getId();
            if (s.getSchoolClass().getSchool() != null) {
                schoolName = s.getSchoolClass().getSchool().getName();
            }
        }

        if (s.getUser() != null && s.getUser().getProfilePhotoPath() != null && !s.getUser().getProfilePhotoPath().isEmpty()) {
            avatarUrl = "/uploads/" + s.getUser().getProfilePhotoPath();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("id", s.getId());
        result.put("fio", fio);
        result.put("firstName", s.getUser() != null ? s.getUser().getFirstName() : null);
        result.put("lastName", s.getUser() != null ? s.getUser().getLastName() : null);
        result.put("email", s.getUser() != null ? s.getUser().getEmail() : null);
        result.put("className", className);
        result.put("classId", classId);
        result.put("schoolName", schoolName);
        result.put("profilePhotoUrl", avatarUrl);
        return result;
    }

    @GetMapping("/children/{studentId}/info")
    public ResponseEntity<?> getChildInfo(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            Student student = getLinkedStudentOrThrow(parent, studentId);

            Map<String, Object> info = toChildCardMap(student);
            info.put("bio", student.getUser() != null ? student.getUser().getBio() : null);

            // Тэги
            if (student.getTags() != null) {
                info.put("tags", student.getTags().stream().map(t -> {
                    Map<String, Object> tg = new HashMap<>();
                    tg.put("id", t.getId());
                    tg.put("name", t.getName());
                    return tg;
                }).collect(Collectors.toList()));
            } else {
                info.put("tags", List.of());
            }

            return ResponseEntity.ok(info);
        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Grades
    // ==================================================================
    @GetMapping("/children/{studentId}/grades")
    public ResponseEntity<?> getChildGrades(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            getLinkedStudentOrThrow(parent, studentId);

            var grades = gradeRepository.findByStudentId(studentId);

            grades.sort((a, b) -> {
                if (a.getGradedAt() == null && b.getGradedAt() == null) return 0;
                if (a.getGradedAt() == null) return 1;
                if (b.getGradedAt() == null) return -1;
                return b.getGradedAt().compareTo(a.getGradedAt());
            });

            List<Map<String, Object>> rows = grades.stream()
                    .limit(Math.max(1, limit))
                    .map(g -> {
                        Map<String, Object> row = new HashMap<>();
                        row.put("date", g.getGradedAt());
                        row.put("subject",
                                g.getSubmission() != null
                                        && g.getSubmission().getAssignment() != null
                                        && g.getSubmission().getAssignment().getSubject() != null
                                        ? g.getSubmission().getAssignment().getSubject().getName()
                                        : null
                        );
                        row.put("title",
                                g.getSubmission() != null && g.getSubmission().getAssignment() != null
                                        ? g.getSubmission().getAssignment().getTitle()
                                        : null
                        );
                        row.put("type",
                                g.getSubmission() != null && g.getSubmission().getAssignment() != null
                                        ? g.getSubmission().getAssignment().getType()
                                        : null
                        );
                        row.put("grade", g.getGradeValue());
                        row.put("maxGrade",
                                g.getSubmission() != null && g.getSubmission().getAssignment() != null
                                        ? g.getSubmission().getAssignment().getMaxGrade()
                                        : null
                        );
                        return row;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(rows);

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Stats — aggregate (avg grade, total grades, subjects)
    // ==================================================================
    @GetMapping("/children/{studentId}/stats")
    public ResponseEntity<?> getChildStats(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            Student student = getLinkedStudentOrThrow(parent, studentId);

            var grades = gradeRepository.findByStudentId(studentId);

            // Normalize every grade to a 5-point scale before averaging so that
            // grades coming from different maxGrade scales (5-, 100-point, ...) are
            // comparable: normalized = (gradeValue / maxGrade) * 5.
            // Grades without a positive maxGrade are skipped (avoid division by zero).
            List<Double> values = grades.stream()
                    .map(g -> {
                        if (g.getGradeValue() == null) return null;
                        Integer maxGrade =
                                g.getSubmission() != null
                                        && g.getSubmission().getAssignment() != null
                                        ? g.getSubmission().getAssignment().getMaxGrade()
                                        : null;
                        if (maxGrade == null || maxGrade <= 0) return null;
                        return (g.getGradeValue().doubleValue() / maxGrade) * 5.0;
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            double avg = values.isEmpty() ? 0.0
                    : values.stream().mapToDouble(Double::doubleValue).sum() / values.size();

            Set<String> subjects = grades.stream()
                    .map(g -> g.getSubmission() != null
                            && g.getSubmission().getAssignment() != null
                            && g.getSubmission().getAssignment().getSubject() != null
                            ? g.getSubmission().getAssignment().getSubject().getName()
                            : null)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            // Considered submissions (assignments with submissions)
            List<Submission> subs = submissionRepository.findByStudentId(studentId);
            long submitted = subs.size();
            long graded = subs.stream()
                    .filter(s -> "graded".equalsIgnoreCase(s.getStatus()))
                    .count();

            // Pending = assignments for class without submission and deadline in future
            long pending = 0;
            long overdue = 0;
            if (student.getSchoolClass() != null) {
                List<Assignment> classAssignments = assignmentRepository.findBySchoolClassId(student.getSchoolClass().getId());
                Set<Long> submittedAssignmentIds = subs.stream()
                        .filter(s -> s.getAssignment() != null)
                        .map(s -> s.getAssignment().getId())
                        .collect(Collectors.toSet());

                LocalDateTime now = LocalDateTime.now();
                for (Assignment a : classAssignments) {
                    if (submittedAssignmentIds.contains(a.getId())) continue;
                    if (a.getDeadline() != null && a.getDeadline().isAfter(now)) {
                        pending++;
                    } else if (a.getDeadline() != null) {
                        overdue++;
                    }
                }
            }

            Map<String, Object> result = new HashMap<>();
            // avgGrade is expressed on a 5-point scale (see normalization above), rounded to 2 decimals.
            result.put("avgGrade", values.isEmpty() ? null : Math.round(avg * 100.0) / 100.0);
            result.put("totalGrades", values.size());
            result.put("subjectsCount", subjects.size());
            result.put("submitted", submitted);
            result.put("graded", graded);
            result.put("pending", pending);
            result.put("overdue", overdue);

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Schedule
    // ==================================================================
    private LessonDTO toLessonDTO(Lesson lesson) {
        LessonDTO dto = new LessonDTO();
        dto.setId(lesson.getId());
        dto.setLessonNumber(lesson.getLessonNumber());
        dto.setStartTime(lesson.getStartTime());
        dto.setEndTime(lesson.getEndTime());
        dto.setClassroom(lesson.getClassroom());

        if (lesson.getSubject() != null) {
            dto.setSubjectId(lesson.getSubject().getId());
            dto.setSubjectName(lesson.getSubject().getName());
        }
        if (lesson.getTeacher() != null) {
            dto.setTeacherId(lesson.getTeacher().getId());
            if (lesson.getTeacher().getUser() != null) {
                dto.setTeacherName(fioOf(lesson.getTeacher().getUser()));
            }
        }
        if (lesson.getDay() != null) {
            dto.setDayId(lesson.getDay().getId());
            dto.setDate(lesson.getDay().getDate());
            if (lesson.getDay().getDayOfWeek() != null) {
                dto.setDayOfWeek(lesson.getDay().getDayOfWeek().name());
            }
            if (lesson.getDay().getTemplate() != null && lesson.getDay().getTemplate().getSchoolClass() != null) {
                dto.setClassName(lesson.getDay().getTemplate().getSchoolClass().getName());
            }
        }
        return dto;
    }

    private List<LessonDTO> dayLessons(SchoolClass schoolClass, LocalDate d) {
        // From a single student's perspective there can be only ONE lesson per
        // (lessonNumber, startTime) — group splits, parallel imports and pure
        // duplicates all collapse here. We keep the first occurrence (ordered by
        // lesson_number, start_time, id by lessonService).
        Map<String, LessonDTO> unique = new LinkedHashMap<>();
        for (Lesson lesson : lessonService.getLessonsByClassAndDate(schoolClass, d)) {
            LessonDTO dto = toLessonDTO(lesson);
            String key = (dto.getLessonNumber() != null ? dto.getLessonNumber() : "") + "|" +
                    (dto.getStartTime() != null ? dto.getStartTime().toString() : "");
            unique.putIfAbsent(key, dto);
        }
        return new ArrayList<>(unique.values());
    }

    @Transactional(readOnly = true)
    @GetMapping("/children/{studentId}/schedule")
    public ResponseEntity<?> getChildSchedule(
            @PathVariable Long studentId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String weekStart,
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            Student student = getLinkedStudentOrThrow(parent, studentId);

            if (student.getSchoolClass() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Student class not found"));
            }

            if (date != null && !date.isBlank()) {
                LocalDate d = LocalDate.parse(date);
                return ResponseEntity.ok(dayLessons(student.getSchoolClass(), d));
            }

            if (weekStart != null && !weekStart.isBlank()) {
                LocalDate monday = LocalDate.parse(weekStart);
                Map<String, Object> result = new LinkedHashMap<>();

                for (int i = 0; i < 7; i++) {
                    LocalDate current = monday.plusDays(i);
                    result.put(current.toString(), dayLessons(student.getSchoolClass(), current));
                }

                return ResponseEntity.ok(result);
            }

            LocalDate today = LocalDate.now();
            return ResponseEntity.ok(dayLessons(student.getSchoolClass(), today));

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Assignments
    // ==================================================================
    @GetMapping("/children/{studentId}/assignments")
    public ResponseEntity<?> getChildAssignments(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId,
            @RequestParam(required = false) String status
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            Student student = getLinkedStudentOrThrow(parent, studentId);

            if (student.getSchoolClass() == null) {
                return ResponseEntity.ok(List.of());
            }

            List<Assignment> classAssignments = assignmentRepository.findBySchoolClassId(student.getSchoolClass().getId());
            List<Submission> studentSubmissions = submissionRepository.findByStudentId(studentId);

            Map<Long, Submission> submissionByAssignment = studentSubmissions.stream()
                    .filter(s -> s.getAssignment() != null)
                    .collect(Collectors.toMap(s -> s.getAssignment().getId(), s -> s, (a, b) -> a));

            LocalDateTime now = LocalDateTime.now();

            List<Map<String, Object>> rows = classAssignments.stream()
                    .map(a -> {
                        Submission sub = submissionByAssignment.get(a.getId());
                        String state;
                        if (sub != null) {
                            if ("graded".equalsIgnoreCase(sub.getStatus())) state = "graded";
                            else state = "submitted";
                        } else if (a.getDeadline() != null && a.getDeadline().isBefore(now)) {
                            state = "overdue";
                        } else {
                            state = "pending";
                        }

                        Map<String, Object> row = new HashMap<>();
                        row.put("id", a.getId());
                        row.put("title", a.getTitle());
                        row.put("description", a.getDescription());
                        row.put("type", a.getType());
                        row.put("deadline", a.getDeadline());
                        row.put("maxGrade", a.getMaxGrade());
                        row.put("subjectName", a.getSubject() != null ? a.getSubject().getName() : null);
                        row.put("teacherName", a.getTeacher() != null && a.getTeacher().getUser() != null
                                ? fioOf(a.getTeacher().getUser()) : null);
                        row.put("status", state);
                        row.put("submittedAt", sub != null ? sub.getSubmittedAt() : null);
                        if (sub != null) {
                            row.put("gradeValue",
                                    gradeRepository.findBySubmissionId(sub.getId())
                                            .map(g -> g.getGradeValue())
                                            .orElse(null));
                        } else {
                            row.put("gradeValue", null);
                        }
                        return row;
                    })
                    .filter(row -> status == null || status.isBlank() || status.equalsIgnoreCase((String) row.get("status")))
                    .sorted((a, b) -> {
                        Object da = a.get("deadline");
                        Object db = b.get("deadline");
                        if (da == null && db == null) return 0;
                        if (da == null) return 1;
                        if (db == null) return -1;
                        return ((LocalDateTime) db).compareTo((LocalDateTime) da);
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(rows);

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Journal — attendance and final grades by quarter
    // ==================================================================
    @GetMapping("/children/{studentId}/journal")
    public ResponseEntity<?> getChildJournal(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "1") Integer quarter
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            getLinkedStudentOrThrow(parent, studentId);

            return ResponseEntity.ok(teacherJournalService.getStudentJournal(studentId, quarter));

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Teachers — for the child's class
    // ==================================================================
    @GetMapping("/children/{studentId}/teachers")
    public ResponseEntity<?> getChildTeachers(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long studentId
    ) {
        try {
            Parent parent = getAuthorizedParent(authorizationHeader);
            Student student = getLinkedStudentOrThrow(parent, studentId);

            if (student.getSchoolClass() == null) {
                return ResponseEntity.ok(List.of());
            }

            Long classId = student.getSchoolClass().getId();
            var assignments = teacherClassSubjectRepository.findAll().stream()
                    .filter(tcs -> tcs.getSchoolClass() != null
                            && Objects.equals(tcs.getSchoolClass().getId(), classId))
                    .filter(tcs -> tcs.getTeacher() != null && tcs.getSubject() != null)
                    .collect(Collectors.toList());

            List<Map<String, Object>> result = assignments.stream()
                    .map(tcs -> {
                        Map<String, Object> row = new HashMap<>();
                        row.put("teacherId", tcs.getTeacher().getId());
                        row.put("teacherName", fioOf(tcs.getTeacher().getUser()));
                        row.put("subjectId", tcs.getSubject().getId());
                        row.put("subjectName", tcs.getSubject().getName());
                        row.put("teacherEmail", tcs.getTeacher().getUser() != null
                                ? tcs.getTeacher().getUser().getEmail() : null);
                        return row;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {
            if ("Authentication required".equals(e.getMessage())) {
                return authFail();
            }
            if ("This child is not linked to this parent".equals(e.getMessage())) {
                return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================================================================
    //  Notifications (legacy mock — kept for compatibility)
    // ==================================================================
    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(@RequestHeader("Authorization") String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (!authService.isValidToken(token)) {
            return authFail();
        }

        return ResponseEntity.ok(List.of(
                Map.of(
                        "title", "Тестовое уведомление",
                        "text", "Это тест",
                        "date", LocalDateTime.now()
                )
        ));
    }
}
