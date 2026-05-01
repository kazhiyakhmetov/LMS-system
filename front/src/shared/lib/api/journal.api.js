import { http } from "./httpClient";

export const journalApi = {
  studentMy: (quarter) => http.get("/journal/student/my", { query: { quarter } }),

  teacherPairs: () => http.get("/journal/teacher/my-classes-subjects"),
  teacherJournal: ({ classId, subjectId, quarter }) =>
    http.get("/journal/teacher", { query: { classId, subjectId, quarter } }),

  upsertAttendance: (body) => http.put("/journal/teacher/attendance", body),
  upsertLessonGrade: (body) => http.put("/journal/teacher/lesson-grade", body),
  upsertQuarterFinal: (body) => http.put("/journal/teacher/quarter-final", body),
  upsertYearFinal: (body) => http.put("/journal/teacher/year-final", body),

  calcQuarterFinal: ({ classId, subjectId, studentId, quarter }) =>
    http.post("/journal/teacher/calculate-quarter-final", null, {
      query: { classId, subjectId, studentId, quarter },
    }),
  calcYearFinal: ({ classId, subjectId, studentId }) =>
    http.post("/journal/teacher/calculate-year-final", null, {
      query: { classId, subjectId, studentId },
    }),

  syncAssignments: ({ classId, subjectId, quarter }) =>
    http.post("/journal/teacher/sync-assignments", null, {
      query: { classId, subjectId, quarter },
    }),
  syncQuizzes: ({ classId, subjectId, quarter }) =>
    http.post("/journal/teacher/sync-quizzes", null, {
      query: { classId, subjectId, quarter },
    }),
};
