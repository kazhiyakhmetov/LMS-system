import { http } from "./httpClient";

export const studentsApi = {
  me: () => http.get("/students/me"),
  myClassAssignments: () => http.get("/students/assignments/my-class"),
  myGrades: () => http.get("/students/grades"),
  byClass: (classId) => http.get(`/students/classes/${classId}/students`),
};
