import { http } from "./httpClient";

export const statisticsApi = {
  teacherClasses: () => http.get("/statistics/teacher/classes"),
  teacherSummary: () => http.get("/statistics/teacher/summary"),
  classStats: (classId) => http.get(`/statistics/class/${classId}`),
};
