import { http } from "./httpClient";

export const schoolsApi = {
  all: () => http.get("/schools"),
  byId: (id) => http.get(`/schools/${id}`),
  classes: (schoolId) => http.get(`/schools/${schoolId}/classes`),

  schoolClassesPublic: (schoolId) => http.get(`/school-classes/school/${schoolId}`),
  classStudents: (classId) => http.get(`/classes/${classId}/students`),

  subjects: () => http.get("/subjects"),
};
