import { http, httpRequest } from "./httpClient";

export const filesApi = {
  uploadSubmission: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/files/upload/submission", fd, { skipAuth: true });
  },
  uploadProfile: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/files/upload/profile", fd, { skipAuth: true });
  },
  downloadUrl: (filePath) =>
    `${import.meta.env.VITE_API_BASE_URL}/files/download/${encodeURIComponent(filePath)}`,
  downloadSubmissionUrl: (submissionId) =>
    `${import.meta.env.VITE_API_BASE_URL}/files/download/submission/${submissionId}`,
  fetchFile: (filePath) =>
    httpRequest(`/files/download/${encodeURIComponent(filePath)}`, { raw: true, skipAuth: true }),
};
