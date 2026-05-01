import { http } from "./httpClient";

export const gamificationApi = {
  studentStats: () => http.get("/gamification/student/stats"),
  studentAchievements: () => http.get("/gamification/student/achievements"),
  studentXpHistory: () => http.get("/gamification/student/xp-history"),
  studentAchievementStats: () => http.get("/gamification/student/achievement-stats"),

  leaderboard: (classId) => http.get("/gamification/leaderboard", { query: { classId } }),

  teacherStudentStats: (studentId) =>
    http.get(`/gamification/teacher/student/${studentId}/stats`),

  adminInitAchievements: () => http.post("/gamification/admin/initialize-achievements"),
};
