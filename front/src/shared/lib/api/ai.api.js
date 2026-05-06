import { http } from "./httpClient";

export const aiApi = {
  // Risk
  riskTeacherClass: (classId, level) =>
    http.get(`/risk/teacher/class/${classId}`, level ? { query: { level } } : {}),
  riskTeacherStudent: (studentId) => http.get(`/risk/teacher/student/${studentId}`),
  riskParentChild: (studentId) => http.get(`/risk/parent/child/${studentId}`),
  riskAdminSchoolSummary: (schoolId) => http.get(`/risk/admin/school/${schoolId}/summary`),

  // Recommendations
  myRecommendations: (limit = 5) => http.get("/recommend/student/me", { query: { limit } }),
  refreshRecommendations: () => http.post("/recommend/refresh"),
};
