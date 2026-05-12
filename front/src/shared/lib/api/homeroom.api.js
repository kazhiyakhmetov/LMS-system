import { http } from "./httpClient";

export const homeroomApi = {
  info: () => http.get("/teacher/homeroom/info"),
  students: () => http.get("/teacher/homeroom/students"),
  studentGrades: (studentId, quarter) =>
    http.get(`/teacher/homeroom/students/${studentId}/grades`, { query: { quarter } }),
  scheduleDay: (date) => http.get("/teacher/homeroom/schedule/day", { query: { date } }),
  scheduleWeek: (startDate) =>
    http.get("/teacher/homeroom/schedule/week", { query: { startDate } }),
  upcoming: () => http.get("/teacher/homeroom/assignments-upcoming"),
};
