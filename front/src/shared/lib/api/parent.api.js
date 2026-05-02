import { http } from "./httpClient";

export const parentApi = {
  me: () => http.get("/parent/me"),
  children: () => http.get("/parent/children"),
  childInfo: (studentId) => http.get(`/parent/children/${studentId}/info`),
  childGrades: (studentId, limit = 20) =>
    http.get(`/parent/children/${studentId}/grades`, { query: { limit } }),
  childStats: (studentId) =>
    http.get(`/parent/children/${studentId}/stats`),
  childAssignments: (studentId, status) =>
    http.get(`/parent/children/${studentId}/assignments`, { query: status ? { status } : {} }),
  childJournal: (studentId, quarter = 1) =>
    http.get(`/parent/children/${studentId}/journal`, { query: { quarter } }),
  childTeachers: (studentId) =>
    http.get(`/parent/children/${studentId}/teachers`),
  childScheduleDay: (studentId, date) =>
    http.get(`/parent/children/${studentId}/schedule`, { query: { date } }),
  childScheduleWeek: (studentId, weekStart) =>
    http.get(`/parent/children/${studentId}/schedule`, { query: { weekStart } }),
  notifications: () => http.get("/parent/notifications"),
};
