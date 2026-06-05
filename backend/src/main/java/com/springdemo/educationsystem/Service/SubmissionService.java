package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.SubmissionDTO;
import com.springdemo.educationsystem.DTO.GradeDTO;
import com.springdemo.educationsystem.Entity.*;
import com.springdemo.educationsystem.Repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final GradeRepository gradeRepository;
    private final AssignmentRepository assignmentRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final NotificationRepository notificationRepository;
    private final GamificationService gamificationService;
    private static final Logger logger = LoggerFactory.getLogger(SubmissionService.class);

    public SubmissionService(SubmissionRepository submissionRepository,
                             GradeRepository gradeRepository,
                             AssignmentRepository assignmentRepository,
                             StudentRepository studentRepository,
                             TeacherRepository teacherRepository,
                             NotificationRepository notificationRepository,
                             GamificationService gamificationService) {
        this.submissionRepository = submissionRepository;
        this.gradeRepository = gradeRepository;
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.notificationRepository = notificationRepository;
        this.gamificationService = gamificationService;
    }

    public SubmissionDTO convertToDTO(Submission submission) {
        SubmissionDTO dto = new SubmissionDTO();
        dto.setId(submission.getId());
        dto.setAssignmentId(submission.getAssignment().getId());
        dto.setAssignmentTitle(submission.getAssignment().getTitle());
        dto.setStudentId(submission.getStudent().getId());
        dto.setStudentName(submission.getStudent().getUser().getFirstName() + " " + submission.getStudent().getUser().getLastName());
        dto.setFileName(submission.getFileName());
        dto.setFileSize(submission.getFileSize());
        dto.setSubmittedAt(submission.getSubmittedAt());
        dto.setStatus(submission.getStatus());
        dto.setComment(submission.getComment());

        Assignment a = submission.getAssignment();
        if (a != null) {
            dto.setDeadline(a.getDeadline());
            dto.setMaxGrade(a.getMaxGrade());
            if (a.getSubject() != null) dto.setSubjectName(a.getSubject().getName());
            if (a.getTeacher() != null && a.getTeacher().getUser() != null) {
                dto.setTeacherName(a.getTeacher().getUser().getFirstName() + " "
                        + a.getTeacher().getUser().getLastName());
            }
        }

        Grade grade = gradeRepository.findBySubmissionId(submission.getId()).orElse(null);
        if (grade != null) {
            dto.setGrade(grade.getGradeValue());
            dto.setTeacherComment(grade.getComment());
        }

        return dto;
    }

    /**
     * Создание/обновление сдачи.
     */
    public Submission createSubmission(Long assignmentId, Long studentId, String filePath,
                                       String fileName, Long fileSize, String comment) {

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Ученик может сдавать только задания своего класса
        if (assignment.getSchoolClass() == null
                || student.getSchoolClass() == null
                || !student.getSchoolClass().getId().equals(assignment.getSchoolClass().getId())) {
            throw new RuntimeException("You can only submit assignments for your own class");
        }

        // Ищем существующую сдачу
        Submission submission = submissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElse(null);

        if (submission == null) {
            submission = new Submission();
            submission.setAssignment(assignment);
            submission.setStudent(student);
        }

        submission.setFilePath(filePath);
        submission.setFileName(fileName);
        submission.setFileSize(fileSize);
        submission.setComment(comment);
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus("submitted");

        Submission savedSubmission = submissionRepository.save(submission);

        // ================== НОВЫЙ КОД ==================
        // 1. Создаем уведомление для учителя
        try {
            Teacher teacher = assignment.getTeacher();
            if (teacher != null) {
                User teacherUser = teacher.getUser();
                String studentName = student.getUser().getFirstName() + " " + student.getUser().getLastName();
                String message = String.format("Студент %s сдал работу \"%s\" на проверку", studentName, assignment.getTitle());

                Notification notification = new Notification(teacherUser, message, "submission_graded", savedSubmission.getId());
                notificationRepository.save(notification);
                logger.info("Created submission notification for teacher: {}", teacherUser.getEmail());
            }
        } catch (Exception e) {
            logger.error("Error creating submission notification for teacher: {}", e.getMessage());
        }
        // ================== КОНЕЦ НОВОГО КОДА ==================

        return savedSubmission;
    }

    public Grade gradeSubmission(GradeDTO gradeDTO, Long teacherId) {
        Submission submission = submissionRepository.findById(gradeDTO.getSubmissionId())
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));

        // Учитель может оценивать только сдачи по своим заданиям
        Teacher assignmentTeacher = submission.getAssignment().getTeacher();
        if (assignmentTeacher == null || !assignmentTeacher.getId().equals(teacherId)) {
            throw new RuntimeException("You can only grade submissions for your own assignments");
        }

        Grade existingGrade = gradeRepository.findBySubmissionId(gradeDTO.getSubmissionId()).orElse(null);
        Grade grade;

        if (existingGrade != null) {
            grade = existingGrade;
        } else {
            grade = new Grade();
            grade.setSubmission(submission);
            grade.setTeacher(teacher);
        }

        grade.setGradeValue(gradeDTO.getGradeValue());
        grade.setComment(gradeDTO.getComment());

        submission.setStatus("graded");
        submissionRepository.save(submission);

        Grade savedGrade = gradeRepository.save(grade);

        createGradeNotification(submission, gradeDTO.getGradeValue());

        // Обновление геймификации
        gamificationService.updateStudentProgress(
                submission.getStudent().getId(),
                submission.getAssignment().getId(),
                gradeDTO.getGradeValue()
        );

        return savedGrade;
    }

    private void createGradeNotification(Submission submission, Integer gradeValue) {
        try {
            User student = submission.getStudent().getUser();
            String message = "Ваша работа \"" + submission.getAssignment().getTitle() + "\" оценена: " + gradeValue + "/100";
            Notification notification = new Notification(student, message, "grade", submission.getId());
            notificationRepository.save(notification);
            logger.info("Created grade notification for student: {}", student.getEmail());
        } catch (Exception e) {
            logger.error("Error creating grade notification: {}", e.getMessage());
        }
    }

    public List<SubmissionDTO> getSubmissionsByStudent(Long studentId) {
        return submissionRepository.findByStudentId(studentId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<SubmissionDTO> getSubmissionsByAssignment(Long assignmentId) {
        return submissionRepository.findByAssignmentId(assignmentId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Просмотр всех сдач по заданию.
     * Доступ только админу или учителю-владельцу задания (защита от IDOR).
     */
    public List<SubmissionDTO> getSubmissionsByAssignment(Long assignmentId, String userRole, Long userId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        boolean isAdmin = "admin".equals(userRole);
        boolean isOwnerTeacher = "teacher".equals(userRole)
                && assignment.getTeacher() != null
                && assignment.getTeacher().getId().equals(userId);

        if (!isAdmin && !isOwnerTeacher) {
            throw new SecurityException("You are not allowed to view submissions for this assignment");
        }

        return getSubmissionsByAssignment(assignmentId);
    }

    public List<SubmissionDTO> getSubmissionsForTeacher(Long teacherId) {
        List<Assignment> teacherAssignments = assignmentRepository.findByTeacherId(teacherId);
        return teacherAssignments.stream()
                .flatMap(assignment -> submissionRepository.findByAssignmentId(assignment.getId()).stream())
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
}
