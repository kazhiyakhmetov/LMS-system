import { http } from "./httpClient";

export const assignmentsApi = {
  all: () => http.get("/assignments"),
  byId: (id) => http.get(`/assignments/${id}`),
  byClass: (classId) => http.get(`/assignments/class/${classId}`),

  studentToSubmit: () => http.get("/student/assignments/to-submit"),
  studentActive: () => http.get("/student/assignments/active"),
  studentOverdue: () => http.get("/student/assignments/overdue"),

  teacherMy: () => http.get("/teacher/assignments/my"),
  teacherCreate: (body) => http.post("/teacher/assignments", body),
  teacherUpdate: (id, body) => http.put(`/teacher/assignments/${id}`, body),
  teacherDelete: (id) => http.delete(`/teacher/assignments/${id}`),
};
