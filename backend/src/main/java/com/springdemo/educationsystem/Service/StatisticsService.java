package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.ClassStatsDTO;
import com.springdemo.educationsystem.DTO.StudentStatsDTO;
import com.springdemo.educationsystem.Entity.*;
import com.springdemo.educationsystem.Repository.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StatisticsService {

    private final AssignmentRepository assignmentRepository;
    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final QuizAssignmentRepository quizAssignmentRepository;

    public StatisticsService(AssignmentRepository assignmentRepository,
                             GradeRepository gradeRepository,
                             StudentRepository studentRepository,
                             SchoolClassRepository schoolClassRepository,
                             QuizAssignmentRepository quizAssignmentRepository) {
        this.assignmentRepository = assignmentRepository;
        this.gradeRepository = gradeRepository;
        this.studentRepository = studentRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.quizAssignmentRepository = quizAssignmentRepository;
    }

    public List<SchoolClass> getTeacherClasses(Long teacherId) {
        // Получаем все задания учителя и извлекаем уникальные классы
        List<Assignment> teacherAssignments = assignmentRepository.findByTeacherId(teacherId);

        return teacherAssignments.stream()
                .map(Assignment::getSchoolClass)
                .distinct()
                .collect(Collectors.toList());
    }

    public ClassStatsDTO getClassStatistics(Long teacherId, Long classId) {
        // Проверяем, что класс принадлежит учителю
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));

        // Получаем всех студентов класса
        List<Student> students = studentRepository.findBySchoolClassIdWithUser(classId);

        // Получаем все задания для этого класса от данного учителя
        List<Assignment> classAssignments = assignmentRepository.findBySchoolClassId(classId)
                .stream()
                .filter(assignment -> assignment.getTeacher().getId().equals(teacherId))
                .collect(Collectors.toList());

        // Создаем статистику по студентам
        List<StudentStatsDTO> studentStats = new ArrayList<>();
        double totalClassAverage = 0;
        int studentsWithGrades = 0;

        for (Student student : students) {
            StudentStatsDTO studentStat = getStudentStatistics(student, classAssignments);
            studentStats.add(studentStat);

            if (studentStat.getAverageGrade() != null) {
                totalClassAverage += studentStat.getAverageGrade();
                studentsWithGrades++;
            }
        }

        // Создаем общую статистику класса
        ClassStatsDTO classStats = new ClassStatsDTO();
        classStats.setClassId(classId);
        classStats.setClassName(schoolClass.getName());
        classStats.setTotalStudents(students.size());
        classStats.setTotalAssignments(classAssignments.size());
        classStats.setStudents(studentStats);

        // Считаем квизы, назначенные данным учителем на этот класс
        long quizCount = quizAssignmentRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId)
                .stream()
                .filter(qa -> qa.getSchoolClass() != null && qa.getSchoolClass().getId().equals(classId))
                .count();
        classStats.setTotalQuizzes((int) quizCount);

        // Рассчитываем среднюю оценку по классу
        double avg = 0.0;
        if (studentsWithGrades > 0) {
            avg = Math.round((totalClassAverage / studentsWithGrades) * 100.0) / 100.0;
        }
        classStats.setClassAverageGrade(avg);

        // Успеваемость = avg / 5 * 100, clipped to 100
        double rate = avg > 0 ? Math.min(100.0, Math.round((avg / 5.0) * 100.0 * 10.0) / 10.0) : 0.0;
        classStats.setSuccessRatePercent(rate);

        return classStats;
    }

    private StudentStatsDTO getStudentStatistics(Student student, List<Assignment> classAssignments) {
        List<Integer> grades = new ArrayList<>();
        int completedAssignments = 0;

        // Для каждого задания ищем оценку студента
        for (Assignment assignment : classAssignments) {
            // Ищем submission студента для этого задания
            Integer gradeValue = findStudentGradeForAssignment(student, assignment);
            if (gradeValue != null) {
                grades.add(gradeValue);
                completedAssignments++;
            } else {
                grades.add(0); // 0 означает, что работа не сдана или не оценена
            }
        }

        // Рассчитываем среднюю оценку
        Double averageGrade = null;
        if (!grades.isEmpty()) {
            double sum = grades.stream().mapToInt(Integer::intValue).sum();
            averageGrade = Math.round((sum / grades.size()) * 100.0) / 100.0;
        }

        String firstName = student.getUser().getFirstName();
        String lastName = student.getUser().getLastName();
        String patronymic = student.getUser().getPatronymic();
        StringBuilder nameBuilder = new StringBuilder();
        if (lastName != null && !lastName.isBlank()) nameBuilder.append(lastName);
        if (firstName != null && !firstName.isBlank()) {
            if (nameBuilder.length() > 0) nameBuilder.append(' ');
            nameBuilder.append(firstName.charAt(0)).append('.');
        }
        if (patronymic != null && !patronymic.isBlank()) {
            nameBuilder.append(patronymic.charAt(0)).append('.');
        }
        String studentName = nameBuilder.length() > 0 ? nameBuilder.toString() : "—";

        return new StudentStatsDTO(
                student.getId(),
                studentName,
                student.getSchoolClass().getName(),
                grades,
                averageGrade,
                completedAssignments,
                classAssignments.size()
        );
    }

    private Integer findStudentGradeForAssignment(Student student, Assignment assignment) {
        // Ищем submission студента для задания
        // В реальном приложении нужно добавить соответствующий метод в SubmissionRepository
        // Пока используем упрощенный подход через GradeRepository

        List<Grade> studentGrades = gradeRepository.findByStudentId(student.getId());

        return studentGrades.stream()
                .filter(grade -> grade.getSubmission().getAssignment().getId().equals(assignment.getId()))
                .findFirst()
                .map(Grade::getGradeValue)
                .orElse(null);
    }

    // Метод для получения быстрой статистики по всем классам учителя
    public List<ClassStatsDTO> getTeacherClassesStatistics(Long teacherId) {
        List<SchoolClass> teacherClasses = getTeacherClasses(teacherId);

        return teacherClasses.stream()
                .map(schoolClass -> getClassStatistics(teacherId, schoolClass.getId()))
                .collect(Collectors.toList());
    }
}
