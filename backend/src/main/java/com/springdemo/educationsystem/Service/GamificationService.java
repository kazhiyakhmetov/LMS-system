package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.*;
import com.springdemo.educationsystem.Entity.*;
import com.springdemo.educationsystem.Repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GamificationService {

    private static final Logger logger = LoggerFactory.getLogger(GamificationService.class);

    private final AchievementRepository achievementRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final StudentStatsRepository studentStatsRepository;
    private final StudentRepository studentRepository;
    private final NotificationRepository notificationRepository;
    private final XpEventRepository xpEventRepository;

    // XP за разные действия
    private static final int XP_PER_ASSIGNMENT = 10;
    private static final int XP_PERFECT_ASSIGNMENT = 25;
    private static final int XP_STREAK_BONUS = 5;

    public GamificationService(AchievementRepository achievementRepository,
                               StudentAchievementRepository studentAchievementRepository,
                               StudentStatsRepository studentStatsRepository,
                               StudentRepository studentRepository,
                               NotificationRepository notificationRepository,
                               XpEventRepository xpEventRepository) {

        this.achievementRepository = achievementRepository;
        this.studentAchievementRepository = studentAchievementRepository;
        this.studentStatsRepository = studentStatsRepository;
        this.studentRepository = studentRepository;
        this.notificationRepository = notificationRepository;
        this.xpEventRepository = xpEventRepository;
    }

    // -----------------------------------------
    // INITIALIZATION
    // -----------------------------------------

    @Transactional
    public StudentStats initializeStudentStats(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentStats stats = new StudentStats();
        stats.setStudent(student);
        stats.setTotalXp(0);
        stats.setLevel(1);
        stats.setCompletedAssignments(0);
        stats.setPerfectAssignments(0);
        stats.setCurrentStreak(0);
        stats.setMaxStreak(0);

        return studentStatsRepository.save(stats);
    }

    // -----------------------------------------
    // XP EVENT LOGGER
    // -----------------------------------------

    private void logXpEvent(Student student, int xp, String source, Long sourceId) {
        StudentStats stats = studentStatsRepository.findByStudentId(student.getId())
                .orElseThrow(() -> new RuntimeException("Stats not found"));

        XpEvent event = new XpEvent();
        event.setStudent(student);
        event.setXpChange(xp);
        event.setTotalXpAfter(stats.getTotalXp());
        event.setSource(source);
        event.setSourceId(sourceId);
        xpEventRepository.save(event);
    }

    // -----------------------------------------
    // PROGRESS UPDATE
    // -----------------------------------------

    @Transactional
    public void updateStudentProgress(Long studentId, Long assignmentId, Integer grade) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentStats stats = studentStatsRepository.findByStudentId(studentId)
                .orElseGet(() -> initializeStudentStats(studentId));

        stats.setCompletedAssignments(stats.getCompletedAssignments() + 1);

        int xpEarned = XP_PER_ASSIGNMENT;

        if (grade != null && grade >= 90) {
            stats.setPerfectAssignments(stats.getPerfectAssignments() + 1);
            xpEarned += XP_PERFECT_ASSIGNMENT;
        }

        // streak
        stats.setCurrentStreak(stats.getCurrentStreak() + 1);

        if (stats.getCurrentStreak() > stats.getMaxStreak()) {
            stats.setMaxStreak(stats.getCurrentStreak());
        }

        if (stats.getCurrentStreak() >= 3) {
            xpEarned += (stats.getCurrentStreak() / 3) * XP_STREAK_BONUS;
        }

        stats.setTotalXp(stats.getTotalXp() + xpEarned);

        updateLevel(stats);

        studentStatsRepository.save(stats);

        // log xp event
        logXpEvent(student, xpEarned, "assignment", assignmentId);

        checkAchievements(studentId);
    }

    // -----------------------------------------
    // LEVEL SYSTEM
    // -----------------------------------------

    private void updateLevel(StudentStats stats) {
        int newLevel = calculateLevel(stats.getTotalXp());

        if (newLevel > stats.getLevel()) {
            stats.setLevel(newLevel);
            logger.info("Student {} reached new level {}", stats.getStudent().getId(), newLevel);
        }
    }

    private int calculateLevel(int totalXp) {
        int level = 1;
        int xpNeeded = 0;

        while (true) {
            xpNeeded += level * 100;
            if (totalXp < xpNeeded) return level;
            level++;
        }
    }

    private int calculateNextLevelXp(int level) {
        int xp = 0;
        for (int i = 1; i <= level + 1; i++) {
            xp += i * 100;
        }
        return xp;
    }

    private int calculateCurrentLevelXp(int level) {
        int xp = 0;
        for (int i = 1; i <= level; i++) {
            xp += i * 100;
        }
        return xp;
    }

    // -----------------------------------------
    // ACHIEVEMENTS
    // -----------------------------------------

    @Transactional
    public void checkAchievements(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow();

        StudentStats stats = studentStatsRepository.findByStudentId(studentId)
                .orElseThrow();

        List<Achievement> achievements = achievementRepository.findAllOrderByRequiredValue();

        for (Achievement a : achievements) {

            if (studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, a.getId())) {
                continue;
            }

            int required = a.getRequiredValue() != null ? a.getRequiredValue() : Integer.MAX_VALUE;
            boolean unlocked = progressForType(a.getType(), stats) >= required;

            if (unlocked) unlockAchievement(student, a);
        }
    }

    /**
     * Текущий прогресс студента для данного типа достижения.
     * Поддерживает оба варианта именования типа: snake_case (assignments,
     * perfect_assignments, streak, level) и UPPER_CASE из сидов
     * (ASSIGNMENT_COMPLETED, PERFECT_ASSIGNMENTS, STREAK, QUIZ_COMPLETED, LEVEL).
     */
    private int progressForType(String type, StudentStats stats) {
        if (type == null) return 0;
        switch (type.trim().toLowerCase()) {
            case "assignments":
            case "assignment_completed":
            case "quiz_completed":
                return stats.getCompletedAssignments() != null ? stats.getCompletedAssignments() : 0;
            case "perfect_assignments":
            case "perfect_assignment":
                return stats.getPerfectAssignments() != null ? stats.getPerfectAssignments() : 0;
            case "streak":
                return stats.getMaxStreak() != null ? stats.getMaxStreak() : 0;
            case "level":
                return stats.getLevel() != null ? stats.getLevel() : 0;
            default:
                return 0;
        }
    }

    /**
     * Заполняет progress/progressPercentage в DTO с учётом текущего прогресса
     * и требуемого значения (защита от деления на ноль / null).
     */
    private void fillProgress(AchievementDTO dto, Achievement achievement, StudentStats stats) {
        int progress = stats != null ? progressForType(achievement.getType(), stats) : 0;
        dto.setProgress(progress);
        int required = achievement.getRequiredValue() != null ? achievement.getRequiredValue() : 0;
        int percentage = required > 0 ? (int) ((double) progress / required * 100) : 0;
        dto.setProgressPercentage(Math.min(percentage, 100));
    }
    private void unlockAchievement(Student student, Achievement achievement) {
        StudentAchievement studentAchievement = new StudentAchievement(student, achievement);
        studentAchievementRepository.save(studentAchievement);

        // Добавляем XP за достижение
        StudentStats stats = studentStatsRepository.findByStudentId(student.getId())
                .orElseThrow(() -> new RuntimeException("Student stats not found"));
        stats.setTotalXp(stats.getTotalXp() + achievement.getXpReward());
        studentStatsRepository.save(stats);

        // Логируем XP событие
        logXpEvent(student, achievement.getXpReward(), "achievement", achievement.getId());

        // Создаем уведомление
        String message = String.format("Получено достижение: %s! +%d XP",
                achievement.getName(), achievement.getXpReward());
        Notification notification = new Notification(
                student.getUser(),
                message,
                "achievement",
                achievement.getId()
        );
        notificationRepository.save(notification);

        logger.info("Student {} unlocked achievement: {}", student.getId(), achievement.getName());
    }

    // -----------------------------------------
    // LEADERBOARD
    // -----------------------------------------

    public List<LeaderboardDTO> getLeaderboard(Long classId) {
        List<StudentStats> allStats;

        if (classId != null) {
            // Рейтинг по классу
            List<Student> classStudents = studentRepository.findBySchoolClassId(classId);
            List<Long> studentIds = classStudents.stream()
                    .map(Student::getId)
                    .collect(Collectors.toList());

            allStats = studentStatsRepository.findAll().stream()
                    .filter(ss -> studentIds.contains(ss.getStudent().getId()))
                    .sorted((s1, s2) -> s2.getTotalXp().compareTo(s1.getTotalXp()))
                    .collect(Collectors.toList());
        } else {
            // Общий рейтинг
            allStats = studentStatsRepository.findAllOrderByTotalXpDesc();
        }

        List<LeaderboardDTO> leaderboard = new ArrayList<>();
        int rank = 1;

        for (StudentStats stats : allStats) {
            Student student = stats.getStudent();
            Long achievementsCount = studentAchievementRepository.countByStudentId(student.getId());

            LeaderboardDTO dto = new LeaderboardDTO();
            dto.setStudentId(student.getId());
            dto.setStudentName(student.getUser().getFirstName() + " " + student.getUser().getLastName());
            dto.setClassName(student.getSchoolClass() != null ? student.getSchoolClass().getName() : "Не назначен");
            dto.setTotalXp(stats.getTotalXp());
            dto.setLevel(stats.getLevel());
            dto.setRank(rank++);
            dto.setAchievementsCount(achievementsCount.intValue());
            dto.setProfilePhotoPath(student.getUser().getProfilePhotoPath());

            leaderboard.add(dto);
        }

        return leaderboard;
    }
    // -----------------------------------------
    // ACHIEVEMENTS LIST FOR STUDENT
    // -----------------------------------------
    public List<AchievementDTO> getStudentAchievements(Long studentId) {
        List<Achievement> allAchievements = achievementRepository.findAllOrderByRequiredValue();
        List<StudentAchievement> studentAchievements = studentAchievementRepository.findByStudentId(studentId);

        Set<Long> unlockedAchievementIds = studentAchievements.stream()
                .map(sa -> sa.getAchievement().getId())
                .collect(Collectors.toSet());

        StudentStats stats = studentStatsRepository.findByStudentId(studentId).orElse(null);

        return allAchievements.stream()
                .map(achievement -> {
                    AchievementDTO dto = new AchievementDTO();
                    dto.setId(achievement.getId());
                    dto.setName(achievement.getName());
                    dto.setDescription(achievement.getDescription());
                    dto.setIcon(achievement.getIcon());
                    dto.setType(achievement.getType());
                    dto.setRequiredValue(achievement.getRequiredValue());
                    dto.setXpReward(achievement.getXpReward());
                    dto.setUnlocked(unlockedAchievementIds.contains(achievement.getId()));

                    fillProgress(dto, achievement, stats);

                    // Если достижение получено — проставим дату разблокировки
                    studentAchievements.stream()
                            .filter(sa -> sa.getAchievement().getId().equals(achievement.getId()))
                            .findFirst()
                            .ifPresent(sa -> dto.setUnlockedAt(sa.getUnlockedAt()));

                    return dto;
                })
                .collect(Collectors.toList());
    }
    // -----------------------------------------
    // DEFAULT ACHIEVEMENTS INITIALIZATION
    // -----------------------------------------
    @Transactional
    public void initializeDefaultAchievements() {
        if (achievementRepository.count() == 0) {
            List<Achievement> defaultAchievements = Arrays.asList(
                    createAchievement("Новичок", "Выполните первое задание", "beginner", "assignments", 1, 10),
                    createAchievement("Старательный ученик", "Выполните 10 заданий", "diligent", "assignments", 10, 50),
                    createAchievement("Опытный студент", "Выполните 25 заданий", "experienced", "assignments", 25, 100),
                    createAchievement("Мастер обучения", "Выполните 50 заданий", "master", "assignments", 50, 200),
                    createAchievement("Отличник", "Получите 5 отличных оценок", "excellent", "perfect_assignments", 5, 75),
                    createAchievement("Вундеркинд", "Получите 15 отличных оценок", "prodigy", "perfect_assignments", 15, 150),
                    createAchievement("Серия успехов", "Выполните задания 3 дня подряд", "streak3", "streak", 3, 30),
                    createAchievement("Неудержимый", "Выполните задания 7 дней подряд", "unstoppable", "streak", 7, 70),
                    createAchievement("Легенда", "Выполните задания 30 дней подряд", "legend", "streak", 30, 300),
                    createAchievement("Первый уровень", "Достигните 2 уровня", "level2", "level", 2, 25),
                    createAchievement("Опытный игрок", "Достигните 5 уровня", "level5", "level", 5, 100),
                    createAchievement("Мастер игры", "Достигните 10 уровня", "level10", "level", 10, 250)
            );

            achievementRepository.saveAll(defaultAchievements);
            logger.info("Initialized default achievements");
        }
    }
    private Achievement createAchievement(String name, String description, String icon, String type, int requiredValue, int xpReward) {
        Achievement achievement = new Achievement();
        achievement.setName(name);
        achievement.setDescription(description);
        achievement.setIcon("/assets/achievements/" + icon + ".png");
        achievement.setType(type);
        achievement.setRequiredValue(requiredValue);
        achievement.setXpReward(xpReward);
        return achievement;
    }
    // -----------------------------------------
    // MAIN STUDENT STATS DTO
    // -----------------------------------------
    public StudentGamificationStatsDTO getStudentGamificationStats(Long studentId) {
        try {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found"));

            // АВТО-инициализация
            StudentStats stats = studentStatsRepository.findByStudentId(studentId)
                    .orElseGet(() -> {
                        logger.info("Auto-initializing stats for student: {}", studentId);
                        return initializeStudentStats(studentId);
                    });

            // Позиция в рейтинге
            Integer rank = studentStatsRepository.findRankPositionByStudentId(studentId);
            stats.setRankPosition(rank);
            studentStatsRepository.save(stats);

            // Последние достижения
            List<StudentAchievement> studentAchievements = studentAchievementRepository.findByStudentId(studentId);
            List<AchievementDTO> recentAchievements = studentAchievements.stream()
                    .sorted((a1, a2) -> a2.getUnlockedAt().compareTo(a1.getUnlockedAt()))
                    .limit(3)
                    .map(sa -> {
                        Achievement a = sa.getAchievement();
                        AchievementDTO dto = new AchievementDTO();
                        dto.setId(a.getId());
                        dto.setName(a.getName());
                        dto.setDescription(a.getDescription());
                        dto.setIcon(a.getIcon());
                        dto.setType(a.getType());
                        dto.setRequiredValue(a.getRequiredValue());
                        dto.setXpReward(a.getXpReward());
                        dto.setUnlocked(true);
                        dto.setProgress(a.getRequiredValue());
                        dto.setProgressPercentage(100);
                        dto.setUnlockedAt(sa.getUnlockedAt());
                        return dto;
                    })
                    .collect(Collectors.toList());

            int nextLevelXp = calculateNextLevelXp(stats.getLevel());
            int currentLevelXp = calculateCurrentLevelXp(stats.getLevel());

            StudentGamificationStatsDTO dto = new StudentGamificationStatsDTO();
            dto.setStudentId(studentId);
            dto.setStudentName(student.getUser().getFirstName() + " " + student.getUser().getLastName());
            dto.setTotalXp(stats.getTotalXp());
            dto.setLevel(stats.getLevel());
            dto.setRank(rank);
            dto.setCompletedAssignments(stats.getCompletedAssignments());
            dto.setPerfectAssignments(stats.getPerfectAssignments());
            dto.setCurrentStreak(stats.getCurrentStreak());
            dto.setMaxStreak(stats.getMaxStreak());
            dto.setAchievementsUnlocked(studentAchievements.size());
            dto.setTotalAchievements((int) achievementRepository.count());
            dto.setRecentAchievements(recentAchievements);
            dto.setNextLevelXp(nextLevelXp);
            dto.setCurrentLevelXp(stats.getTotalXp() - currentLevelXp);

            return dto;

        } catch (Exception e) {
            logger.error("Error getting gamification stats for student {}: {}", studentId, e.getMessage());
            throw new RuntimeException("Student stats not found");
        }
    }
    // -----------------------------------------
    // XP HISTORY FOR CHART
    // -----------------------------------------
    public List<XpHistoryDTO> getXpHistory(Long studentId) {
        List<XpEvent> events = xpEventRepository.findByStudentIdOrderByCreatedAtAsc(studentId);

        Map<LocalDate, Integer> gainedPerDay = new LinkedHashMap<>();
        Map<LocalDate, Integer> totalPerDay = new LinkedHashMap<>();

        for (XpEvent e : events) {
            LocalDate day = e.getCreatedAt().toLocalDate();
            gainedPerDay.put(day, gainedPerDay.getOrDefault(day, 0) + e.getXpChange());
            totalPerDay.put(day, e.getTotalXpAfter());
        }

        List<XpHistoryDTO> result = new ArrayList<>();
        for (LocalDate day : gainedPerDay.keySet()) {
            result.add(new XpHistoryDTO(
                    day,
                    gainedPerDay.get(day),
                    totalPerDay.get(day)
            ));
        }

        return result;
    }
    // -----------------------------------------
    // ACHIEVEMENT STATS FOR CHART
    // -----------------------------------------
    public AchievementsStatsDTO getAchievementStats(Long studentId) {
        AchievementsStatsDTO dto = new AchievementsStatsDTO();

        List<Achievement> all = achievementRepository.findAll();
        List<StudentAchievement> unlocked = studentAchievementRepository.findByStudentId(studentId);

        dto.setTotal(all.size());
        dto.setUnlocked(unlocked.size());

        Map<String, Integer> totalByType = new HashMap<>();
        Map<String, Integer> unlockedByType = new HashMap<>();

        for (Achievement a : all) {
            totalByType.put(a.getType(), totalByType.getOrDefault(a.getType(), 0) + 1);
        }

        for (StudentAchievement sa : unlocked) {
            String type = sa.getAchievement().getType();
            unlockedByType.put(type, unlockedByType.getOrDefault(type, 0) + 1);
        }

        dto.setTotalByType(totalByType);
        dto.setUnlockedByType(unlockedByType);

        return dto;
    }

    public TeacherStudentGamificationDetailsDTO getTeacherStudentDetails(Long studentId) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentStats stats = studentStatsRepository.findByStudentId(studentId)
                .orElseGet(() -> initializeStudentStats(studentId));

        // ---------- Полученные достижения ----------
        List<StudentAchievement> unlocked = studentAchievementRepository.findByStudentId(studentId);

        List<AchievementDTO> unlockedDto = unlocked.stream()
                .map(sa -> {
                    Achievement a = sa.getAchievement();
                    AchievementDTO dto = new AchievementDTO();

                    dto.setId(a.getId());
                    dto.setName(a.getName());
                    dto.setDescription(a.getDescription());
                    dto.setType(a.getType());
                    dto.setIcon(a.getIcon());
                    dto.setRequiredValue(a.getRequiredValue());
                    dto.setXpReward(a.getXpReward());
                    dto.setUnlocked(true);
                    dto.setProgress(a.getRequiredValue());
                    dto.setProgressPercentage(100);
                    dto.setUnlockedAt(sa.getUnlockedAt());


                    return dto;
                })
                .toList();
        // ---------- Заблокированные ----------
        Set<Long> unlockedIds = unlocked.stream()
                .map(sa -> sa.getAchievement().getId())
                .collect(Collectors.toSet());

        List<Achievement> all = achievementRepository.findAll();

        List<AchievementDTO> lockedDto = all.stream()
                .filter(a -> !unlockedIds.contains(a.getId()))
                .map(a -> {
                    AchievementDTO dto = new AchievementDTO();

                    dto.setId(a.getId());
                    dto.setName(a.getName());
                    dto.setDescription(a.getDescription());
                    dto.setType(a.getType());
                    dto.setIcon(a.getIcon());
                    dto.setRequiredValue(a.getRequiredValue());
                    dto.setXpReward(a.getXpReward());
                    dto.setUnlocked(false);

                    fillProgress(dto, a, stats);

                    return dto;
                })
                .toList();
        // ---------- XP Activity ----------
        List<XpEvent> events = xpEventRepository.findTop20ByStudentOrderByCreatedAtDesc(student);

        List<ActivityDTO> activity = events.stream()
                .map(e -> new ActivityDTO(
                        buildTitle(e),
                        buildDescription(e),
                        e.getSource(),      // тип: assignment, achievement...
                        e.getCreatedAt()    // дата
                ))
                .collect(Collectors.toList());

        // ---------- DTO ----------
        TeacherStudentGamificationDetailsDTO dto = new TeacherStudentGamificationDetailsDTO();

        dto.setStudentId(student.getId());
        dto.setStudentName(student.getUser().getFirstName() + " " + student.getUser().getLastName());
        dto.setClassName(student.getSchoolClass() != null ? student.getSchoolClass().getName() : "-");

        dto.setTotalXp(stats.getTotalXp());
        dto.setLevel(stats.getLevel());
        dto.setCompletedAssignments(stats.getCompletedAssignments());
        dto.setPerfectAssignments(stats.getPerfectAssignments());
        dto.setCurrentStreak(stats.getCurrentStreak());
        dto.setMaxStreak(stats.getMaxStreak());

        dto.setNextLevelXp(calculateNextLevelXp(stats.getLevel()));
        dto.setCurrentLevelXp(stats.getTotalXp() - calculateCurrentLevelXp(stats.getLevel()));

        dto.setAchievements(unlockedDto);
        dto.setAvailableAchievements(lockedDto);

        dto.setAchievementsUnlocked(unlockedDto.size());
        dto.setTotalAchievements(all.size());

        dto.setRecentActivity(activity);

        return dto;
    }

    private String buildTitle(XpEvent e) {
        return switch (e.getSource()) {
            case "assignment" -> "Выполнено задание";
            case "perfect" -> "Отличная оценка";
            case "achievement" -> "Получено достижение";
            case "streak" -> "Серия успехов";
            case "level" -> "Новый уровень!";
            default -> "Активность";
        };
    }

    private String buildDescription(XpEvent e) {
        return "Изменение XP: " + e.getXpChange() +
                ", всего теперь: " + e.getTotalXpAfter();
    }
}

