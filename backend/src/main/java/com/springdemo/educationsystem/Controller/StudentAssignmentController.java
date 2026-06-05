package com.springdemo.educationsystem.Controller;

import com.springdemo.educationsystem.DTO.SubmissionDTO;
import com.springdemo.educationsystem.Entity.Assignment;
import com.springdemo.educationsystem.Entity.Student;
import com.springdemo.educationsystem.Repository.AssignmentRepository;
import com.springdemo.educationsystem.Repository.SubmissionRepository;
import com.springdemo.educationsystem.Repository.StudentRepository;
import com.springdemo.educationsystem.Service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student/assignments")
@CrossOrigin("*")
public class StudentAssignmentController {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentRepository studentRepository;
    private final AuthService authService;

    public StudentAssignmentController(
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository,
            StudentRepository studentRepository,
            AuthService authService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.studentRepository = studentRepository;
        this.authService = authService;
    }

    private Student getStudent(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long userId = authService.getUserId(token);
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    private Long getStudentId(String authHeader) {
        return getStudent(authHeader).getId();
    }

    // Класс задания относится к классу ученика
    private boolean sameClass(Assignment a, Student student) {
        return a.getSchoolClass() != null
                && student.getSchoolClass() != null
                && a.getSchoolClass().getId().equals(student.getSchoolClass().getId());
    }

    // -------------------------------
    // 1️⃣ Задания, которые нужно сдать (НЕ сдано, дедлайн не прошёл)
    // -------------------------------
    @GetMapping("/to-submit")
    public List<Assignment> getAssignmentsToSubmit(@RequestHeader("Authorization") String auth) {
        Student student = getStudent(auth);
        Long studentId = student.getId();

        return assignmentRepository.findAll()
                .stream()
                .filter(a -> sameClass(a, student))
                .filter(a -> submissionRepository.findByAssignmentIdAndStudentId(a.getId(), studentId).isEmpty())
                // deadline == null -> задание показываем (бессрочное, ещё можно сдать)
                .filter(a -> a.getDeadline() == null || a.getDeadline().isAfter(LocalDateTime.now()))
                .collect(Collectors.toList());
    }

    // -------------------------------
    // 2️⃣ Активные задания (сдано, но НЕ оценено)
    // -------------------------------
    @GetMapping("/active")
    public List<Assignment> getActiveAssignments(@RequestHeader("Authorization") String auth) {
        Long studentId = getStudentId(auth);

        // Задания, по которым студент сдал работу, но она ещё не оценена.
        // Возвращаем сами задания (с title/deadline/subjectName/teacherName),
        // чтобы фронт отображал их корректно; статус "в процессе" выводится по источнику.
        return submissionRepository.findByStudentId(studentId)
                .stream()
                .filter(s -> "submitted".equals(s.getStatus()))
                .map(s -> s.getAssignment())
                .filter(a -> a != null)
                .distinct()
                .collect(Collectors.toList());
    }

    // -------------------------------
    // 3️⃣ Просроченные (не сдано & дедлайн прошёл)
    // -------------------------------
    @GetMapping("/overdue")
    public List<Assignment> getOverdueAssignments(@RequestHeader("Authorization") String auth) {
        Student student = getStudent(auth);
        Long studentId = student.getId();

        return assignmentRepository.findAll()
                .stream()
                .filter(a -> sameClass(a, student))
                // deadline == null -> не считаем просроченным
                .filter(a -> a.getDeadline() != null && a.getDeadline().isBefore(LocalDateTime.now()))
                .filter(a -> submissionRepository.findByAssignmentIdAndStudentId(a.getId(), studentId).isEmpty())
                .collect(Collectors.toList());
    }
}

