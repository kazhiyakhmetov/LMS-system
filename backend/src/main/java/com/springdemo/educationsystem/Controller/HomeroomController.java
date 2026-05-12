package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.LessonDTO;
import com.springdemo.educationsystem.Entity.*;
import com.springdemo.educationsystem.Repository.*;
import com.springdemo.educationsystem.Service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Личный кабинет классного руководителя.
 * Доступен учителю только если он назначен homeroomTeacher для какого-либо класса.
 */
@RestController
@RequestMapping("/api/teacher/homeroom")
@CrossOrigin("*")
public class HomeroomController {

    private static final Logger logger = LoggerFactory.getLogger(HomeroomController.class);

    private final AuthService authService;
    private final TeacherRepository teacherRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final LessonRepository lessonRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final JournalFinalGradeRepository journalFinalGradeRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeacherClassSubjectRepository teacherClassSubjectRepository;
    private final SubjectRepository subjectRepository;

    public HomeroomController(AuthService authService,
                              TeacherRepository teacherRepository,
                              SchoolClassRepository schoolClassRepository,
                              StudentRepository studentRepository,
                              LessonRepository lessonRepository,
                              JournalEntryRepository journalEntryRepository,
                              JournalFinalGradeRepository journalFinalGradeRepository,
                              AssignmentRepository assignmentRepository,
                              TeacherClassSubjectRepository teacherClassSubjectRepository,
                              SubjectRepository subjectRepository) {
        this.authService = authService;
        this.teacherRepository = teacherRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.studentRepository = studentRepository;
        this.lessonRepository = lessonRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.journalFinalGradeRepository = journalFinalGradeRepository;
        this.assignmentRepository = assignmentRepository;
        this.teacherClassSubjectRepository = teacherClassSubjectRepository;
        this.subjectRepository = subjectRepository;
    }

    // ============================================================
    // Endpoints
    // ============================================================

    @GetMapping("/info")
    public ResponseEntity<?> info(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);
            SchoolClass cls = ctx.schoolClass;

            List<Student> students = studentRepository.findBySchoolClassIdWithUser(cls.getId());
            double avgClass = computeClassAverage(students);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("classId", cls.getId());
            body.put("className", cls.getName());
            body.put("academicYear", cls.getAcademicYear());
            body.put("language", cls.getLanguage());
            body.put("active", cls.isActive());
            body.put("studentsCount", students.size());
            body.put("averageGrade", avgClass);
            return ResponseEntity.ok(body);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.info error: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/students")
    public ResponseEntity<?> students(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);
            List<Student> students = studentRepository.findBySchoolClassIdWithUser(ctx.schoolClass.getId());

            List<Map<String, Object>> body = new ArrayList<>();
            for (Student s : students) {
                User u = s.getUser();
                if (u == null) continue;

                Double avg = computeStudentAverage(s.getId(), ctx.schoolClass.getId());

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("studentId", s.getId());
                item.put("userId", u.getId());
                item.put("firstName", u.getFirstName());
                item.put("lastName", u.getLastName());
                item.put("patronymic", u.getPatronymic());
                item.put("fullName", buildFullName(u));
                item.put("email", u.getEmail());
                item.put("avatarPath", u.getProfilePhotoPath());
                item.put("averageGrade", avg);
                body.add(item);
            }

            body.sort(Comparator.comparing(m -> ((String) m.getOrDefault("fullName", ""))));
            return ResponseEntity.ok(body);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.students error: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/students/{studentId}/grades")
    public ResponseEntity<?> studentGrades(@PathVariable Long studentId,
                                           @RequestParam(required = false) Integer quarter,
                                           @RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);

            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found"));
            if (student.getSchoolClass() == null
                    || !Objects.equals(student.getSchoolClass().getId(), ctx.schoolClass.getId())) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Ученик не из вашего класса"));
            }

            int q = (quarter == null || quarter < 1 || quarter > 4) ? currentQuarter() : quarter;

            // Какие предметы homeroom-учитель преподаёт этому классу
            Set<Long> teachingSubjectIds = teacherClassSubjectRepository
                    .findActiveByTeacherIdWithRelations(ctx.teacher.getId())
                    .stream()
                    .filter(tcs -> tcs.getSchoolClass() != null
                            && Objects.equals(tcs.getSchoolClass().getId(), ctx.schoolClass.getId()))
                    .filter(tcs -> tcs.getSubject() != null)
                    .map(tcs -> tcs.getSubject().getId())
                    .collect(Collectors.toSet());

            List<JournalEntry> allEntries = journalEntryRepository.findAll().stream()
                    .filter(e -> e.getStudent() != null && Objects.equals(e.getStudent().getId(), student.getId()))
                    .filter(e -> e.getSchoolClass() != null
                            && Objects.equals(e.getSchoolClass().getId(), ctx.schoolClass.getId()))
                    .filter(e -> Objects.equals(e.getQuarter(), q))
                    .toList();

            List<JournalFinalGrade> allFinals = journalFinalGradeRepository.findAll().stream()
                    .filter(f -> f.getStudent() != null && Objects.equals(f.getStudent().getId(), student.getId()))
                    .filter(f -> f.getSchoolClass() != null
                            && Objects.equals(f.getSchoolClass().getId(), ctx.schoolClass.getId()))
                    .filter(f -> Objects.equals(f.getQuarter(), q))
                    .toList();

            Map<Long, List<JournalEntry>> bySubject = allEntries.stream()
                    .filter(e -> e.getSubject() != null)
                    .collect(Collectors.groupingBy(e -> e.getSubject().getId(),
                            LinkedHashMap::new, Collectors.toList()));

            Map<Long, JournalFinalGrade> finalsBySubject = allFinals.stream()
                    .filter(f -> f.getSubject() != null)
                    .collect(Collectors.toMap(
                            f -> f.getSubject().getId(),
                            f -> f,
                            (a, b) -> a,
                            LinkedHashMap::new));

            Set<Long> subjectIds = new LinkedHashSet<>();
            subjectIds.addAll(bySubject.keySet());
            subjectIds.addAll(finalsBySubject.keySet());

            List<Map<String, Object>> subjects = new ArrayList<>();

            for (Long subjectId : subjectIds) {
                Subject subject = subjectRepository.findById(subjectId).orElse(null);
                if (subject == null) continue;

                List<JournalEntry> entries = bySubject.getOrDefault(subjectId, new ArrayList<>());
                entries = entries.stream()
                        .sorted(Comparator.comparing(JournalEntry::getLessonDate))
                        .toList();

                List<Map<String, Object>> entriesDto = new ArrayList<>();
                for (JournalEntry e : entries) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", e.getId());
                    item.put("lessonDate", e.getLessonDate() != null ? e.getLessonDate().toString() : null);
                    item.put("entryType", e.getEntryType() != null ? e.getEntryType().name() : null);
                    item.put("label", labelForEntryType(e.getEntryType()));
                    item.put("displayValue", e.getDisplayValue());
                    item.put("numericValue", e.getNumericValue());
                    item.put("maxValue", e.getMaxValue());
                    item.put("comment", e.getComment());
                    entriesDto.add(item);
                }

                JournalFinalGrade fg = finalsBySubject.get(subjectId);

                List<Double> nums = entries.stream()
                        .map(JournalEntry::getNumericValue)
                        .filter(Objects::nonNull)
                        .toList();
                Double subjectAvg = nums.isEmpty()
                        ? null
                        : Math.round(nums.stream().mapToDouble(Double::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

                Map<String, Object> subjectDto = new LinkedHashMap<>();
                subjectDto.put("subjectId", subject.getId());
                subjectDto.put("subjectName", subject.getName());
                subjectDto.put("readOnly", !teachingSubjectIds.contains(subject.getId()));
                subjectDto.put("entries", entriesDto);
                subjectDto.put("subjectAverage", subjectAvg);

                Map<String, Object> finalDto = new LinkedHashMap<>();
                if (fg != null) {
                    finalDto.put("quarterGrade", fg.getQuarterGrade());
                    finalDto.put("calculatedQuarterGrade", fg.getCalculatedQuarterGrade());
                    finalDto.put("yearGrade", fg.getYearGrade());
                    finalDto.put("calculatedYearGrade", fg.getCalculatedYearGrade());
                }
                subjectDto.put("finalGrade", finalDto);

                subjects.add(subjectDto);
            }

            subjects.sort(Comparator.comparing(m -> ((String) m.getOrDefault("subjectName", ""))));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("studentId", student.getId());
            body.put("studentName", buildFullName(student.getUser()));
            body.put("avatarPath", student.getUser() != null ? student.getUser().getProfilePhotoPath() : null);
            body.put("classId", ctx.schoolClass.getId());
            body.put("className", ctx.schoolClass.getName());
            body.put("quarter", q);
            body.put("subjects", subjects);
            return ResponseEntity.ok(body);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.studentGrades error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/schedule/day")
    public ResponseEntity<?> scheduleDay(@RequestParam(required = false) LocalDate date,
                                         @RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);
            LocalDate d = (date == null) ? LocalDate.now() : date;

            List<Lesson> lessons = lessonRepository.findBySchoolClassAndDate(ctx.schoolClass, d);
            List<LessonDTO> dtos = lessons.stream().map(this::toLessonDTO).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.scheduleDay error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/schedule/week")
    public ResponseEntity<?> scheduleWeek(@RequestParam(required = false) LocalDate startDate,
                                          @RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);
            LocalDate start = (startDate == null)
                    ? LocalDate.now().with(java.time.DayOfWeek.MONDAY)
                    : startDate;

            List<LessonDTO> all = new ArrayList<>();
            for (int i = 0; i < 7; i++) {
                LocalDate d = start.plusDays(i);
                List<Lesson> lessons = lessonRepository.findBySchoolClassAndDate(ctx.schoolClass, d);
                for (Lesson l : lessons) {
                    all.add(toLessonDTO(l));
                }
            }
            return ResponseEntity.ok(all);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.scheduleWeek error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/assignments-upcoming")
    public ResponseEntity<?> upcoming(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            HomeroomContext ctx = resolveContext(authorizationHeader);

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime horizon = now.plusDays(14);

            List<Assignment> all = assignmentRepository.findBySchoolClassId(ctx.schoolClass.getId());

            List<Map<String, Object>> body = all.stream()
                    .filter(a -> a.getDeadline() != null)
                    .filter(a -> !a.getDeadline().isBefore(now) && a.getDeadline().isBefore(horizon))
                    .sorted(Comparator.comparing(Assignment::getDeadline))
                    .map(a -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", a.getId());
                        m.put("title", a.getTitle());
                        m.put("type", a.getType());
                        m.put("maxGrade", a.getMaxGrade());
                        m.put("deadline", a.getDeadline().toString());
                        m.put("subjectId", a.getSubject() != null ? a.getSubject().getId() : null);
                        m.put("subjectName", a.getSubject() != null ? a.getSubject().getName() : null);
                        m.put("teacherId", a.getTeacher() != null ? a.getTeacher().getId() : null);
                        if (a.getTeacher() != null && a.getTeacher().getUser() != null) {
                            User tu = a.getTeacher().getUser();
                            m.put("teacherName", buildFullName(tu));
                        } else {
                            m.put("teacherName", null);
                        }
                        return m;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(body);
        } catch (HomeroomAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage(), "code", "NOT_HOMEROOM"));
        } catch (RuntimeException e) {
            logger.error("homeroom.upcoming error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static class HomeroomContext {
        final Teacher teacher;
        final SchoolClass schoolClass;

        HomeroomContext(Teacher teacher, SchoolClass schoolClass) {
            this.teacher = teacher;
            this.schoolClass = schoolClass;
        }
    }

    private static class HomeroomAccessException extends RuntimeException {
        HomeroomAccessException(String message) { super(message); }
    }

    private HomeroomContext resolveContext(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (!authService.isValidToken(token)) {
            throw new RuntimeException("Authentication required");
        }
        String role = authService.getUserRole(token);
        if (!"teacher".equals(role)) {
            throw new RuntimeException("Only teachers can access homeroom");
        }
        Long userId = authService.getUserId(token);
        Teacher teacher = teacherRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));

        SchoolClass schoolClass = schoolClassRepository.findByHomeroomTeacherId(teacher.getId())
                .orElseThrow(() -> new HomeroomAccessException("Вы не классный руководитель"));

        return new HomeroomContext(teacher, schoolClass);
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.length() < 7) {
            throw new RuntimeException("Authentication required");
        }
        return authorizationHeader.substring(7);
    }

    private String buildFullName(User u) {
        if (u == null) return "";
        String ln = u.getLastName() == null ? "" : u.getLastName();
        String fn = u.getFirstName() == null ? "" : u.getFirstName();
        return (ln + " " + fn).trim();
    }

    private double computeClassAverage(List<Student> students) {
        List<Double> averages = new ArrayList<>();
        for (Student s : students) {
            Double avg = computeStudentAverage(s.getId(), s.getSchoolClass() != null ? s.getSchoolClass().getId() : null);
            if (avg != null) averages.add(avg);
        }
        if (averages.isEmpty()) return 0.0;
        double sum = 0.0;
        for (Double v : averages) sum += v;
        double raw = sum / averages.size();
        return Math.round(raw * 10.0) / 10.0;
    }

    private Double computeStudentAverage(Long studentId, Long classId) {
        if (studentId == null || classId == null) return null;
        List<JournalEntry> all = journalEntryRepository.findAll().stream()
                .filter(e -> e.getStudent() != null && Objects.equals(e.getStudent().getId(), studentId))
                .filter(e -> e.getSchoolClass() != null && Objects.equals(e.getSchoolClass().getId(), classId))
                .filter(e -> e.getNumericValue() != null)
                .toList();
        if (all.isEmpty()) return null;
        double sum = all.stream().mapToDouble(JournalEntry::getNumericValue).sum();
        double raw = sum / all.size();
        return Math.round(raw * 10.0) / 10.0;
    }

    private int currentQuarter() {
        int month = LocalDate.now().getMonthValue();
        if (month >= 9 && month <= 10) return 1;
        if (month == 11 || month == 12) return 2;
        if (month >= 1 && month <= 3) return 3;
        return 4;
    }

    private String labelForEntryType(JournalEntryType type) {
        if (type == null) return "";
        return switch (type) {
            case LESSON_GRADE -> "Урок";
            case ASSIGNMENT_GRADE -> "Задание";
            case QUIZ_GRADE -> "Квиз";
            case SOR_GRADE -> "СОР";
            case SOCH_GRADE -> "СОЧ";
        };
    }

    private LessonDTO toLessonDTO(Lesson lesson) {
        LessonDTO dto = new LessonDTO();
        dto.setId(lesson.getId());
        if (lesson.getDay() != null) {
            dto.setDayId(lesson.getDay().getId());
            dto.setDayOfWeek(lesson.getDay().getDayOfWeek() != null ? lesson.getDay().getDayOfWeek().name() : null);
            dto.setDate(lesson.getDay().getDate());
        }
        dto.setLessonNumber(lesson.getLessonNumber());
        dto.setStartTime(lesson.getStartTime());
        dto.setEndTime(lesson.getEndTime());
        if (lesson.getSubject() != null) {
            dto.setSubjectId(lesson.getSubject().getId());
            dto.setSubjectName(lesson.getSubject().getName());
        }
        dto.setClassroom(lesson.getClassroom());

        if (lesson.getTeacher() != null) {
            dto.setTeacherId(lesson.getTeacher().getId());
            if (lesson.getTeacher().getUser() != null) {
                User u = lesson.getTeacher().getUser();
                dto.setTeacherName(buildFullName(u));
            }
        }

        if (lesson.getDay() != null && lesson.getDay().getTemplate() != null) {
            var sc = lesson.getDay().getTemplate().getSchoolClass();
            if (sc != null) dto.setClassName(sc.getName());
        }
        return dto;
    }
}
