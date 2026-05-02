import { http } from "./httpClient";

export const tagsApi = {
  all: () => http.get("/tags"),
  studentMy: () => http.get("/tags/student/my"),
  studentAvailable: () => http.get("/tags/student/available"),
  studentUpdate: (tagIds) => http.put("/tags/student/update", { tagIds }),
};
