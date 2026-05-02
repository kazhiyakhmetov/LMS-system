import { http } from "./httpClient";

export const quizzesApi = {
  // === Student ===
  studentAvailable: () => http.get("/student/quiz/available"),
  studentAssignment: (assignmentId) => http.get(`/student/quiz/assignment/${assignmentId}`),
  studentStart: ({ assignmentId }) => http.post("/student/quiz/start", { assignmentId }),
  studentAnswer: (body) => http.post("/student/quiz/answer", body),
  studentFinish: ({ attemptId }) => http.post("/student/quiz/finish", { attemptId }),
  studentAttempt: (attemptId) => http.get(`/student/quiz/attempt/${attemptId}`),
  studentResult: (attemptId) => http.get(`/student/quiz/result/${attemptId}`),

  // === Teacher ===
  teacherMy: () => http.get("/teacher/quiz/my"),
  teacherCreate: (body) => http.post("/teacher/quiz/create", body),
  teacherAddQuestion: (quizId, body) => http.post(`/teacher/quiz/${quizId}/question`, body),
  teacherAssign: (body) => http.post("/teacher/quiz/assign", body),
  teacherAssignments: () => http.get("/teacher/quiz/assignments"),
  teacherResults: (assignmentId) => http.get(`/teacher/quiz/results/${assignmentId}`),
  teacherAttemptDetails: (attemptId) => http.get(`/teacher/quiz/attempt/${attemptId}`),
  teacherGradeText: (body) => http.post("/teacher/quiz/attempt/grade-text", body),
};
