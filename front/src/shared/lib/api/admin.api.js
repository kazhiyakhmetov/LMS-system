import { http } from "./httpClient";

export const adminApi = {
  registerStudent: ({ classId, user }) =>
    http.post("/admin/register/student", user, { query: { classId } }),
  registerTeacher: ({ schoolId, user }) =>
    http.post("/admin/register/teacher", user, { query: { schoolId } }),
  registerParent: (body) => http.post("/admin/register/parent", body),
  updateUser: (userId, body) => http.put(`/admin/users/${userId}`, body),

  schoolClasses: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/classes`),
  schoolTeachers: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/teachers`),
  schoolStudents: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/students`),
  schoolStudentsUnassigned: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/students/unassigned`),
  schoolParents: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/parents`),
  schoolParentLinks: (schoolId) => http.get(`/admin/structure/schools/${schoolId}/parent-child-links`),

  classCreate: (body) => http.post("/admin/structure/classes", body),
  classUpdate: (classId, body) => http.put(`/admin/structure/classes/${classId}`, body),
  classArchive: (classId) => http.put(`/admin/structure/classes/${classId}/archive`),
  classDetails: (classId) => http.get(`/admin/structure/classes/${classId}`),
  classStudents: (classId) => http.get(`/admin/structure/classes/${classId}/students`),

  assignStudentToClass: (body) => http.put("/admin/structure/students/assign-class", body),
  transferStudent: (body) => http.put("/admin/structure/students/transfer-class", body),

  linkParentChild: (body) => http.post("/admin/structure/parent-child/link", body),
  unlinkParentChild: ({ parentId, studentId }) =>
    http.delete("/admin/structure/parent-child/link", { query: { parentId, studentId } }),
  parentChildren: (parentId) => http.get(`/admin/structure/parents/${parentId}/children`),
  studentParents: (studentId) => http.get(`/admin/structure/students/${studentId}/parents`),

  teachingAssignments: (schoolId) => http.get(`/admin/teaching-assignments/school/${schoolId}`),
  teachingTeachers: (schoolId) => http.get(`/admin/teaching-assignments/school/${schoolId}/teachers`),
  createTeachingAssignment: (body) => http.post("/admin/teaching-assignments", body),
  deleteTeachingAssignment: (assignmentId) =>
    http.delete(`/admin/teaching-assignments/${assignmentId}`),
};
