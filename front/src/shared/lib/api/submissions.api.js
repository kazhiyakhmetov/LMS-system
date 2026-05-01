import { http } from "./httpClient";

export const submissionsApi = {
  submit: ({ assignmentId, filePath, fileName, fileSize, comment }) =>
    http.post("/submissions", { assignmentId, filePath, fileName, fileSize, comment }),
  grade: ({ submissionId, gradeValue, comment }) =>
    http.post("/submissions/grade", { submissionId, gradeValue, comment }),
  my: () => http.get("/submissions/my"),
  byAssignment: (assignmentId) => http.get(`/submissions/assignment/${assignmentId}`),
};
