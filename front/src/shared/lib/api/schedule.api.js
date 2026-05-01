import { http } from "./httpClient";

export const scheduleApi = {
  studentDay: (date) => http.get("/schedule/student/my", { query: { date } }),
  studentWeek: (startDate) => http.get("/schedule/student/week", { query: { startDate } }),

  teacherDay: (date) => http.get("/teacher/schedule/my/day", { query: { date } }),
  teacherWeek: (startDate) => http.get("/teacher/schedule/my/week", { query: { startDate } }),

  adminCreateTeacherLesson: (body) => http.post("/admin/schedule/teacher", body),
  adminBulkTeacherLessons: (body) => http.post("/admin/schedule/teacher/bulk", body),
  adminGetTeacherSchedule: (teacherId, date) =>
    http.get(`/admin/schedule/teacher/${teacherId}`, { query: { date } }),
  adminUpdateLesson: (lessonId, body) =>
    http.put(`/admin/schedule/teacher/lesson/${lessonId}`, body),
  adminDeleteLesson: (lessonId) =>
    http.delete(`/admin/schedule/teacher/lesson/${lessonId}`),
  adminDayId: ({ date, classId }) => http.get("/admin/schedule/day-id", { query: { date, classId } }),
  adminEnsureDayId: (body) => http.post("/admin/schedule/day-id", body),

  adminCreateTemplate: (body) => http.post("/schedule/admin/template", body),
  adminCreateClassWithTeachers: (body) =>
    http.post("/schedule/admin/class-with-teachers", body),
};
