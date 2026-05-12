import { http, httpRequest } from "./httpClient";

export const examMaterialsApi = {
  catalog: (params = {}) => http.get("/exam-materials", { query: params }),
  my: () => http.get("/exam-materials/my"),
  create: ({ title, type, subjectId, language, quarter, description, isPublic, file }) => {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("type", type);
    fd.append("subjectId", String(subjectId));
    fd.append("language", language);
    fd.append("quarter", String(quarter));
    if (description) fd.append("description", description);
    fd.append("isPublic", String(Boolean(isPublic)));
    if (file) fd.append("file", file);
    return http.post("/exam-materials", fd);
  },
  toggleLike: (id) => http.post(`/exam-materials/${id}/like`),
  share: (id) => http.post(`/exam-materials/${id}/share`),
  remove: (id) => http.delete(`/exam-materials/${id}`),
  downloadUrl: (id) => `${import.meta.env.VITE_API_BASE_URL}/exam-materials/${id}/download`,
  download: (id) => httpRequest(`/exam-materials/${id}/download`, { raw: true }),
};
