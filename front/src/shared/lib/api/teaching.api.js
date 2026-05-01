import { http } from "./httpClient";

export const teachingApi = {
  myPairs: () => http.get("/teacher/teaching-assignments/pairs"),
  myClasses: () => http.get("/teacher/teaching-assignments/classes"),
  mySubjects: () => http.get("/teacher/teaching-assignments/subjects"),
};
