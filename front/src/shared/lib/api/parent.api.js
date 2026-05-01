import { http } from "./httpClient";

export const parentApi = {
  children: () => http.get("/parent/children"),
  childGrades: (studentId, limit = 20) =>
    http.get(`/parent/children/${studentId}/grades`, { query: { limit } }),
  childScheduleDay: (studentId, date) =>
    http.get(`/parent/children/${studentId}/schedule`, { query: { date } }),
  childScheduleWeek: (studentId, weekStart) =>
    http.get(`/parent/children/${studentId}/schedule`, { query: { weekStart } }),
  notifications: () => http.get("/parent/notifications"),
};
